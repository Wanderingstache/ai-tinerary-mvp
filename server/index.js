// ai-tinerary server: serves the website AND the API from one Railway service.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID, createHash, timingSafeEqual } from 'crypto';
import { initDb, query, purgeFinishedTrips } from './db.js';
import { runPricing, runTiles, runNeeds, runReviewCheck, runGenerate, startStep, startFraming, getTrip, getTripByInviteToken } from './steps.js';
import { STEPS, MAX_GENERATIONS_PER_TRIP, NEEDS } from './settings.js';
import { emailConfigured, sendTripLinkEmail, sendSignInEmail } from './email.js';
import { normalizeEmail, validEmail, looksLikeToken, createSignInToken, redeemSignInToken, createSession, sessionEmail, destroySession, purgeExpiredAuth, allow } from './auth.js';

const app = express();
app.set('trust proxy', 1); // Railway sits in front of the app; this makes req.ip the visitor's address
app.use(express.json({ limit: '1mb' }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ACCESS_CODE = (process.env.ACCESS_CODE || '').trim();
const ADMIN_KEY = (process.env.ADMIN_KEY || '').trim();

// Passcode check. Not case-sensitive (phones love to capitalize the first letter), compared in
// constant time, and wrong guesses are throttled: 10 misses per visitor per 10 minutes.
const digest = (s) => createHash('sha256').update(String(s || '').trim().toLowerCase()).digest();
const codeOk = (c) => !ACCESS_CODE || timingSafeEqual(digest(c), digest(ACCESS_CODE));
const misses = new Map(); // ip -> { n, reset }
const tooManyMisses = (req) => { const r = misses.get(req.ip); return !!r && r.reset > Date.now() && r.n >= 10; };
const recordMiss = (req) => {
  const r = misses.get(req.ip);
  if (!r || r.reset < Date.now()) misses.set(req.ip, { n: 1, reset: Date.now() + 10 * 60 * 1000 });
  else r.n += 1;
};
setInterval(() => { for (const [ip, r] of misses) if (r.reset < Date.now()) misses.delete(ip); }, 10 * 60 * 1000).unref();
const BAD_CODE = "That passcode isn't right. Check the one Wandering Mustache sent you.";
const TOO_MANY = 'Too many tries. Please wait a few minutes and try again.';

const isUuid = (s) => /^[0-9a-f-]{36}$/i.test(s || '');
// Who owns a trip is only ever used to build someone's own "My trips" list — never sent along
// with the trip itself, which anyone holding the trip link can open.
const publicTrip = ({ owner_email, ...rest }) => rest;
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message || 'Something went wrong' });
});

function datesFromBasics(b = {}) {
  const hasDates = b.date_mode !== 'days' && b.start_date && b.end_date;
  return {
    destination: (b.destination || '').trim(),
    start_date: hasDates ? b.start_date : null,
    end_date: hasDates ? b.end_date : null,
    day_count: hasDates ? null : Math.max(1, Math.min(30, Number(b.day_count) || 3)),
  };
}

function kickOffStage1(id) {
  startFraming(id); // one Haiku call fills both research.sights and research.budget
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// The passcode gateway asks this before showing the intake.
app.post('/api/access', (req, res) => {
  if (!ACCESS_CODE) return res.json({ ok: true, open: true });
  if (tooManyMisses(req)) return res.status(429).json({ error: TOO_MANY });
  if (!codeOk((req.body || {}).code)) { recordMiss(req); return res.status(403).json({ error: BAD_CODE }); }
  res.json({ ok: true });
});
app.get('/api/config', (req, res) => res.json({ needsAccessCode: !!ACCESS_CODE, maxVersions: MAX_GENERATIONS_PER_TRIP, needs: NEEDS, emailEnabled: emailConfigured() }));

// Share Trip, Option B: email the organizer their own trip link, so closing the tab isn't the end
// of the road. Does nothing but return a clear error until RESEND_API_KEY exists in Railway.
app.post('/api/trips/:id/email-link', wrap(async (req, res) => {
  const trip = await getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  const email = (req.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "That doesn't look like a valid email address." });
  const url = `https://${req.get('host')}/trip/${trip.id}`;
  await sendTripLinkEmail({ to: email, destination: trip.destination, url });
  res.json({ ok: true });
}));

// Share Trip: the organizer emailing one traveler's own invite link — distinct from the endpoint
// above (which emails the organizer's own full trip link). The organizer reaches this through the
// trip they already have access to; the link it sends only ever opens that one traveler's card,
// same as the Copy Link button right next to it.
app.post('/api/trips/:id/travelers/:travelerId/email-link', wrap(async (req, res) => {
  const trip = await getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  const traveler = (trip.travelers || []).find((t) => t.id === req.params.travelerId);
  if (!traveler) return res.status(404).json({ error: 'Traveler not found on this trip.' });
  if (!traveler.invite_token) return res.status(400).json({ error: "This traveler doesn't have a link yet — save names first." });
  const email = (req.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "That doesn't look like a valid email address." });
  const url = `https://${req.get('host')}/invite/${traveler.invite_token}`;
  await sendTripLinkEmail({ to: email, destination: trip.destination, url });
  res.json({ ok: true });
}));

// ── Sign-in ("My trips") ────────────────────────────────────────────────────────────────────
// Passwordless: ask for a link by email, tap it, confirm. Needs email sending to be on.
const SIGN_IN_NOT_ON = "Sign-in by email isn't turned on for this site yet.";
const LINK_EXPIRED = 'That sign-in link has expired or was already used. Ask for a new one.';

app.post('/api/auth/request', wrap(async (req, res) => {
  const { email: raw, access_code } = req.body || {};
  // Same gate as starting a trip, so this can't be used to send email to strangers.
  if (tooManyMisses(req)) return res.status(429).json({ error: TOO_MANY });
  if (!codeOk(access_code)) { recordMiss(req); return res.status(403).json({ error: BAD_CODE }); }
  if (!emailConfigured()) return res.status(503).json({ error: SIGN_IN_NOT_ON });
  const email = normalizeEmail(raw);
  if (!validEmail(email)) return res.status(400).json({ error: "That doesn't look like a valid email address." });
  if (!allow(`email:${email}`, 5, 3600 * 1000) || !allow(`ip:${req.ip}`, 20, 3600 * 1000)) {
    return res.status(429).json({ error: 'Too many sign-in emails requested. Please wait a while and try again.' });
  }
  const token = await createSignInToken(email);
  await sendSignInEmail({ to: email, url: `${req.protocol}://${req.get('host')}/signin/${token}` });
  res.json({ ok: true });
}));

app.post('/api/auth/verify', wrap(async (req, res) => {
  const token = (req.body || {}).token;
  if (!looksLikeToken(token)) return res.status(400).json({ error: LINK_EXPIRED });
  const email = await redeemSignInToken(token);
  if (!email) return res.status(400).json({ error: LINK_EXPIRED });
  res.json({ session: await createSession(email), email });
}));

app.post('/api/auth/logout', wrap(async (req, res) => { await destroySession(req); res.json({ ok: true }); }));

app.get('/api/me', wrap(async (req, res) => {
  const email = await sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ email });
}));

app.get('/api/my-trips', wrap(async (req, res) => {
  const email = await sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Not signed in.' });
  const r = await query(
    `SELECT id, destination, start_date, end_date, day_count, stage, itinerary_versions,
            -- Traveler cards only exist once the organizer reaches that step; until then, use the
            -- number they chose when they started the trip.
            COALESCE(NULLIF(jsonb_array_length(travelers), 0),
                     CASE WHEN basics->>'traveler_count' ~ '^[0-9]+$' THEN (basics->>'traveler_count')::int END, 1) AS traveler_count,
            created_at, updated_at
     FROM trips WHERE owner_email = $1 ORDER BY updated_at DESC LIMIT 100`, [email]);
  res.json({ email, trips: r.rows });
}));

// Create a trip (Stage 1). Starts the two Stage 1 Haiku calls right away.
app.post('/api/trips', wrap(async (req, res) => {
  const { access_code, basics } = req.body || {};
  if (tooManyMisses(req)) return res.status(429).json({ error: TOO_MANY });
  if (!codeOk(access_code)) { recordMiss(req); return res.status(403).json({ error: BAD_CODE }); }
  const d = datesFromBasics(basics);
  if (!d.destination) return res.status(400).json({ error: 'Enter a destination to continue.' });
  if (d.start_date && d.end_date && d.end_date < d.start_date) return res.status(400).json({ error: 'The end date is before the start date.' });
  const id = randomUUID();
  const owner = await sessionEmail(req); // null when not signed in — trips work fine without it
  await query(
    `INSERT INTO trips (id, destination, start_date, end_date, day_count, basics, stage, owner_email) VALUES ($1,$2,$3,$4,$5,$6,'basics',$7)`,
    [id, d.destination, d.start_date, d.end_date, d.day_count, JSON.stringify(basics || {}), owner]
  );
  kickOffStage1(id);
  res.json({ id });
}));

app.get('/api/trips/:id', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Trip not found' });
  const trip = await getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found. Check the link.' });
  // Opening a trip while signed in adds it to that person's "My trips" — but only if nobody owns
  // it yet, so this can never take a trip away from someone. (Holding the trip link already
  // means full access to it; this just makes it findable later.)
  const me = await sessionEmail(req);
  if (me && !trip.owner_email) await query(`UPDATE trips SET owner_email = $2 WHERE id = $1 AND owner_email IS NULL`, [trip.id, me]);
  res.json(publicTrip(trip));
}));

// Save answers. If destination or dates change, Stage 1 research reruns.
app.put('/api/trips/:id', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Trip not found' });
  const trip = await getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const b = req.body || {};
  const sets = []; const vals = [trip.id];
  const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

  let placeChanged = false;
  if (b.basics) {
    const d = datesFromBasics(b.basics);
    if (!d.destination) return res.status(400).json({ error: 'Enter a destination to continue.' });
    placeChanged = d.destination !== trip.destination || d.start_date !== trip.start_date || d.end_date !== trip.end_date || d.day_count !== trip.day_count;
    add('basics', JSON.stringify(b.basics));
    add('destination', d.destination); add('start_date', d.start_date); add('end_date', d.end_date); add('day_count', d.day_count);
  }
  if (b.group_answers) add('group_answers', JSON.stringify(b.group_answers));
  if (b.travelers) {
    // Share Trip: once the organizer turns on "let each person answer for themselves", every
    // traveler needs their own invite link. A token is assigned here, the moment travelers are
    // saved in that mode, rather than needing a separate "generate links" step.
    const mode = b.group_answers?.intake_mode ?? trip.group_answers?.intake_mode;
    const travelers = mode === 'self'
      ? b.travelers.map((t) => (t.invite_token ? t : { ...t, invite_token: randomUUID() }))
      : b.travelers;
    add('travelers', JSON.stringify(travelers));
  }
  if (b.review) add('review', JSON.stringify(b.review));
  if (b.stage) add('stage', String(b.stage));
  if (placeChanged) sets.push(`research = '{}'::jsonb`);
  if (!sets.length) return res.json(publicTrip(trip));
  await query(`UPDATE trips SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, vals);
  if (placeChanged) kickOffStage1(trip.id);
  res.json(publicTrip(await getTrip(trip.id)));
}));

// Start an AI step. It runs in the background; the site checks back for the result.
// Share Trip: a traveler's own link reaches only their own card — never the budget, the other
// travelers, or anything else about the trip. Scoped deliberately, not just "the trip minus a
// few fields", so a new trip field added later doesn't accidentally leak through here.
const isInviteToken = (s) => /^[0-9a-f-]{36}$/i.test(s || '');

app.get('/api/invite/:token', wrap(async (req, res) => {
  if (!isInviteToken(req.params.token)) return res.status(404).json({ error: 'That link looks incomplete. Check it was copied in full.' });
  const trip = await getTripByInviteToken(req.params.token);
  if (!trip) return res.status(404).json({ error: "We couldn't find a trip for this link. It may have been replaced by a newer one." });
  const traveler = (trip.travelers || []).find((t) => t.invite_token === req.params.token);
  if (!traveler) return res.status(404).json({ error: "We couldn't find a trip for this link. It may have been replaced by a newer one." });
  res.json({
    destination: trip.destination, start_date: trip.start_date, end_date: trip.end_date, day_count: trip.day_count,
    traveler,
    tiles: trip.research?.tiles?.result?.tiles || [],
    promoted_sights: trip.group_answers?.promoted_sights || [],
    missed: trip.group_answers?.been_before === 'before' ? trip.group_answers?.bb_missed : null,
    needs_gate: trip.group_answers?.needs_gate || '',
  });
}));

app.put('/api/invite/:token', wrap(async (req, res) => {
  if (!isInviteToken(req.params.token)) return res.status(404).json({ error: 'That link looks incomplete. Check it was copied in full.' });
  const trip = await getTripByInviteToken(req.params.token);
  if (!trip) return res.status(404).json({ error: "We couldn't find a trip for this link. It may have been replaced by a newer one." });
  const idx = (trip.travelers || []).findIndex((t) => t.invite_token === req.params.token);
  if (idx === -1) return res.status(404).json({ error: "We couldn't find a trip for this link. It may have been replaced by a newer one." });
  const prev = trip.travelers[idx];
  // The traveler can only change their own answers — never their id, their invite_token, or (by
  // only ever touching this one array element) anyone else's card.
  const next = { ...prev, ...(req.body || {}), id: prev.id, invite_token: prev.invite_token, status: 'done' };
  const travelers = trip.travelers.map((t, i) => (i === idx ? next : t));
  await query('UPDATE trips SET travelers = $2, updated_at = now() WHERE id = $1', [trip.id, JSON.stringify(travelers)]);
  res.json({ ok: true, traveler: next });
}));

const RUNNERS = { pricing: runPricing, tiles: runTiles, needs: runNeeds, review_check: runReviewCheck, generate: runGenerate };
app.post('/api/trips/:id/run/:step', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Unknown step' });
  // Sights and budget are one underlying call (see startFraming); either retry button reruns it.
  if (req.params.step === 'sights' || req.params.step === 'budget') {
    await startFraming(req.params.id);
    return res.json({ started: true });
  }
  const fn = RUNNERS[req.params.step];
  if (!fn) return res.status(404).json({ error: 'Unknown step' });
  await startStep(req.params.id, req.params.step, fn);
  res.json({ started: true });
}));

// Owner-only cost view. Send header x-admin-key.
app.get('/api/admin/trips', wrap(async (req, res) => {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) return res.status(403).json({ error: 'Wrong admin key.' });
  const trips = await query(`
    SELECT t.id, t.destination, t.created_at, t.stage, t.itinerary_versions,
           jsonb_array_length(t.travelers) AS traveler_count,
           COALESCE(SUM(c.cost_usd),0)::float AS cost_usd, COUNT(c.id)::int AS calls
    FROM trips t LEFT JOIN ai_calls c ON c.trip_id = t.id
    GROUP BY t.id ORDER BY t.created_at DESC LIMIT 200`);
  const bySteps = await query(`
    SELECT step, model, COUNT(*)::int AS calls, SUM(web_searches)::int AS searches,
           SUM(cost_usd)::float AS cost_usd, AVG(duration_ms)::int AS avg_ms,
           SUM(CASE WHEN ok THEN 0 ELSE 1 END)::int AS failures
    FROM ai_calls GROUP BY step, model ORDER BY cost_usd DESC`);
  const labels = Object.fromEntries(Object.entries(STEPS).map(([k, v]) => [k, v.label]));
  res.json({ trips: trips.rows, steps: bySteps.rows.map((r) => ({ ...r, label: labels[r.step] || r.step })) });
}));

// The website (built by `npm run build` into /dist).
const dist = path.join(__dirname, '..', 'dist');
// Front door: "/" is the Plan a trip page (the passcode gateway, then the intake). "The Truth About
// Travel" lives at /truth and "Travel on Your Terms" at /about.
app.get('/truth', (req, res) => res.sendFile(path.join(dist, 'truth.html')));
app.get('/about', (req, res) => res.sendFile(path.join(dist, 'landing.html')));
// Old addresses keep working.
app.get('/plan', (req, res) => res.redirect(301, '/'));
app.get('/truth.html', (req, res) => res.redirect(301, '/truth'));
app.get('/index.html', (req, res) => res.redirect(301, '/about'));
app.get('/landing.html', (req, res) => res.redirect(301, '/about'));
app.use(express.static(dist, { index: false }));
// Everything else (/, /trip/…, /admin) is the app.
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => purgeFinishedTrips())
  .then(() => purgeExpiredAuth())
  .catch((e) => console.error('Database setup failed:', e.message))
  .finally(() => {
    setInterval(() => { purgeFinishedTrips().catch(() => {}); purgeExpiredAuth().catch(() => {}); }, 6 * 60 * 60 * 1000);
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 ai-tinerary running on port ${PORT}`));
  });

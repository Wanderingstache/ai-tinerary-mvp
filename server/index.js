// ai-tinerary server: serves the website AND the API from one Railway service.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID, createHash, timingSafeEqual } from 'crypto';
import { initDb, query, purgeFinishedTrips } from './db.js';
import { runPricing, runTiles, runNeeds, runReviewCheck, runGenerate, startStep, startFraming, getTrip, getTripByInviteToken } from './steps.js';
import { STEPS, MAX_GENERATIONS_PER_TRIP, NEEDS } from './settings.js';
import { emailConfigured, sendTripLinkEmail, sendSignInEmail } from './email.js';
import { alertsConfigured, sendAlert } from './alerts.js';
import { normalizeEmail, validEmail, looksLikeToken, createSignInToken, redeemSignInToken, createSession, sessionEmail, destroySession, purgeExpiredAuth, allow, hashPassword, checkPassword, PASSWORD_MIN } from './auth.js';

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
// Beta: anyone signed in (they had to use the passcode to get an account or a sign-in link) can
// keep creating trips without typing the passcode again. Set BETA_ACCOUNT_ACCESS=0 in Railway to
// turn this off when beta ends.
const ACCOUNT_ACCESS = process.env.BETA_ACCOUNT_ACCESS !== '0';
const signedInMember = async (req) => (ACCOUNT_ACCESS ? !!(await sessionEmail(req)) : false);
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

// Largest group the intake accepts — keep in step with MAX_TRAVELERS in src/options.js.
const MAX_TRAVELERS = 30;
function cleanBasics(b = {}) {
  const n = Math.round(Number(b.traveler_count)) || 1;
  return { ...b, traveler_count: Math.max(1, Math.min(MAX_TRAVELERS, n)) };
}

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

// Waitlist: "No passcode? Get on the list." Saves an email (plus an optional name and dream
// destination) so passcodes can go out by hand later. The same email twice is a no-op, not an error.
// A hidden "website" field catches simple bots; a visitor can join at most 5 times per 10 minutes.
const joins = new Map(); // ip -> { n, reset }
app.post('/api/waitlist', wrap(async (req, res) => {
  const { email = '', name = '', note = '', website = '' } = req.body || {};
  if (website) return res.json({ ok: true });
  const r = joins.get(req.ip);
  if (r && r.reset > Date.now() && r.n >= 5) return res.status(429).json({ error: TOO_MANY });
  if (!r || r.reset < Date.now()) joins.set(req.ip, { n: 1, reset: Date.now() + 10 * 60 * 1000 }); else r.n += 1;
  const clean = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 200) return res.status(400).json({ error: 'That email address doesn\'t look right.' });
  await query(`INSERT INTO waitlist (email, name, note) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
    [clean, String(name).trim().slice(0, 120) || null, String(note).trim().slice(0, 500) || null]);
  res.json({ ok: true });
}));

// The passcode gateway asks this before showing the intake.
app.post('/api/access', (req, res) => {
  if (!ACCESS_CODE) return res.json({ ok: true, open: true });
  if (tooManyMisses(req)) return res.status(429).json({ error: TOO_MANY });
  if (!codeOk((req.body || {}).code)) { recordMiss(req); return res.status(403).json({ error: BAD_CODE }); }
  res.json({ ok: true });
});
app.get('/api/config', (req, res) => res.json({ needsAccessCode: !!ACCESS_CODE, accountAccess: ACCOUNT_ACCESS, maxVersions: MAX_GENERATIONS_PER_TRIP, needs: NEEDS, emailEnabled: emailConfigured() }));

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
  const a = (await query(`SELECT name, password_hash IS NOT NULL AS has_password FROM accounts WHERE email = $1`, [email])).rows[0];
  res.json({ email, name: a?.name || '', hasPassword: !!a?.has_password });
}));

// ── Accounts (email + password) ─────────────────────────────────────────────────────────────
// For beta clients with the passcode. The account lives only here on ai-tinerary.com and is
// never shared with Wandering Mustache. Signing in by emailed link still works for the same
// address, and is how someone who forgot their password gets back in to set a new one.
const BAD_LOGIN = "That email and password don't match. Please try again.";
const weakPassword = (pw) => (String(pw || '').length < PASSWORD_MIN ? `Please use at least ${PASSWORD_MIN} characters for your password.` : null);

// Trips this browser already opened, handed over at sign-up / sign-in so they show in "My trips".
// Only trips nobody owns yet are claimed, and only by id (someone has to have had the link).
async function claimTrips(email, ids) {
  const list = (Array.isArray(ids) ? ids : []).filter(isUuid).slice(0, 20);
  if (list.length) await query(`UPDATE trips SET owner_email = $1 WHERE id = ANY($2::uuid[]) AND owner_email IS NULL`, [email, list]);
}

app.post('/api/auth/register', wrap(async (req, res) => {
  const { email: raw, password, name, access_code, trip_ids } = req.body || {};
  if (tooManyMisses(req)) return res.status(429).json({ error: TOO_MANY });
  if (!codeOk(access_code)) { recordMiss(req); return res.status(403).json({ error: BAD_CODE }); }
  const email = normalizeEmail(raw);
  if (!validEmail(email)) return res.status(400).json({ error: "That doesn't look like a valid email address." });
  const weak = weakPassword(password); if (weak) return res.status(400).json({ error: weak });
  if (!allow(`register:${req.ip}`, 10, 3600 * 1000)) return res.status(429).json({ error: 'Too many tries. Please wait a while and try again.' });
  const existing = (await query(`SELECT password_hash FROM accounts WHERE email = $1`, [email])).rows[0];
  if (existing?.password_hash) return res.status(409).json({ error: 'There is already an account for that email. Sign in instead.' });
  await query(
    `INSERT INTO accounts (email, password_hash, name) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = COALESCE(EXCLUDED.name, accounts.name), updated_at = now()`,
    [email, await hashPassword(password), String(name || '').trim().slice(0, 60) || null]);
  await claimTrips(email, trip_ids);
  res.json({ session: await createSession(email), email });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email: raw, password, trip_ids } = req.body || {};
  const email = normalizeEmail(raw);
  if (!allow(`login:${req.ip}`, 20, 15 * 60 * 1000) || !allow(`login:${email}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many sign-in tries. Please wait 15 minutes and try again.' });
  }
  const a = (await query(`SELECT password_hash FROM accounts WHERE email = $1`, [email])).rows[0];
  if (!a?.password_hash || !(await checkPassword(password, a.password_hash))) return res.status(401).json({ error: BAD_LOGIN });
  await claimTrips(email, trip_ids);
  res.json({ session: await createSession(email), email });
}));

// Set or change the password while signed in (also the "forgot password" path: sign in by
// emailed link, then set a new one here).
app.post('/api/auth/password', wrap(async (req, res) => {
  const email = await sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Not signed in.' });
  const weak = weakPassword(req.body?.password); if (weak) return res.status(400).json({ error: weak });
  await query(
    `INSERT INTO accounts (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [email, await hashPassword(req.body.password)]);
  res.json({ ok: true });
}));

app.post('/api/my-trips/claim', wrap(async (req, res) => {
  const email = await sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Not signed in.' });
  await claimTrips(email, req.body?.trip_ids);
  res.json({ ok: true });
}));

// ── My travelers (saved people) ─────────────────────────────────────────────────────────────
const PERSON_KEEP = ['name', 'age', 'relation', 'why', 'how_spend', 'how_plan', 'dining', 'interests', 'interests_other',
  'pace_align', 'avoid', 'avoid_other', 'flexibility', 'activity_level', 'rhythm', 'food_adventure', 'food_dislikes',
  'solo_time', 'observance', 'observance_other', 'alcohol', 'needs_types', 'physical', 'physical_other', 'neuro',
  'neuro_other', 'health', 'health_other', 'diet', 'diet_other', 'gluten_level', 'gluten_answered'];
const cleanPerson = (d = {}) => {
  const out = {};
  for (const k of PERSON_KEEP) if (d[k] !== undefined) out[k] = d[k];
  out.name = String(out.name || '').trim().slice(0, 40);
  return out;
};
const personOut = (r) => ({ id: r.id, is_self: r.is_self, ...r.data, updated_at: r.updated_at });
const MAX_PEOPLE = 50;

async function signedIn(req, res) {
  const email = await sessionEmail(req);
  if (!email) res.status(401).json({ error: 'Please sign in first.' });
  return email;
}

app.get('/api/people', wrap(async (req, res) => {
  const email = await signedIn(req, res); if (!email) return;
  const r = await query(`SELECT * FROM saved_people WHERE owner_email = $1 ORDER BY is_self DESC, lower(data->>'name')`, [email]);
  res.json({ people: r.rows.map(personOut) });
}));

app.post('/api/people', wrap(async (req, res) => {
  const email = await signedIn(req, res); if (!email) return;
  const data = cleanPerson(req.body);
  if (!data.name) return res.status(400).json({ error: 'Give this traveler a name.' });
  const n = (await query(`SELECT count(*)::int AS n FROM saved_people WHERE owner_email = $1`, [email])).rows[0].n;
  if (n >= MAX_PEOPLE) return res.status(400).json({ error: `You can save up to ${MAX_PEOPLE} travelers.` });
  const isSelf = !!req.body?.is_self;
  if (isSelf) await query(`UPDATE saved_people SET is_self = false WHERE owner_email = $1`, [email]);
  const r = await query(`INSERT INTO saved_people (id, owner_email, is_self, data) VALUES ($1, $2, $3, $4) RETURNING *`,
    [randomUUID(), email, isSelf, JSON.stringify(data)]);
  res.json(personOut(r.rows[0]));
}));

app.put('/api/people/:id', wrap(async (req, res) => {
  const email = await signedIn(req, res); if (!email) return;
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  const data = cleanPerson(req.body);
  if (!data.name) return res.status(400).json({ error: 'Give this traveler a name.' });
  const isSelf = !!req.body?.is_self;
  if (isSelf) await query(`UPDATE saved_people SET is_self = false WHERE owner_email = $1 AND id <> $2`, [email, req.params.id]);
  const r = await query(`UPDATE saved_people SET data = $3, is_self = $4, updated_at = now() WHERE id = $1 AND owner_email = $2 RETURNING *`,
    [req.params.id, email, JSON.stringify(data), isSelf]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found.' });
  res.json(personOut(r.rows[0]));
}));

app.delete('/api/people/:id', wrap(async (req, res) => {
  const email = await signedIn(req, res); if (!email) return;
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  await query(`DELETE FROM saved_people WHERE id = $1 AND owner_email = $2`, [req.params.id, email]);
  res.json({ ok: true });
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
  const { access_code } = req.body || {};
  const basics = cleanBasics(req.body?.basics);
  if (!(await signedInMember(req))) {
    if (tooManyMisses(req)) return res.status(429).json({ error: TOO_MANY });
    if (!codeOk(access_code)) { recordMiss(req); return res.status(403).json({ error: BAD_CODE }); }
  }
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
    add('basics', JSON.stringify(cleanBasics(b.basics)));
    add('destination', d.destination); add('start_date', d.start_date); add('end_date', d.end_date); add('day_count', d.day_count);
  }
  if (b.group_answers) add('group_answers', JSON.stringify(b.group_answers));
  if (b.travelers) {
    // Share Trip: once the organizer turns on "let each person answer for themselves", every
    // traveler needs their own invite link. A token is assigned here, the moment travelers are
    // saved in that mode, rather than needing a separate "generate links" step.
    const mode = b.group_answers?.intake_mode ?? trip.group_answers?.intake_mode;
    const list = (Array.isArray(b.travelers) ? b.travelers : []).slice(0, MAX_TRAVELERS);
    const travelers = mode === 'self'
      ? list.map((t) => (t.invite_token ? t : { ...t, invite_token: randomUUID() }))
      : list;
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
  const waitlist = await query(`SELECT created_at, email, name, note FROM waitlist ORDER BY created_at DESC LIMIT 500`);
  res.json({ trips: trips.rows, steps: bySteps.rows.map((r) => ({ ...r, label: labels[r.step] || r.step })), waitlist: waitlist.rows });
}));

// ── Beta feedback + the Stache's anonymous review ───────────────────────────────────────────
// Promise to beta testers (shown on the site): the Stache sees every itinerary built and every
// comment, but never names or email addresses. Trip details stay: destination, dates/length,
// age ranges, travel styles, and whether the plan was gluten-free. Everything the admin pages
// show about a trip goes through anonymize() first.
const RATINGS = ['Loved it', 'Pretty good', 'Needs work'];

app.post('/api/trips/:id/feedback', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Trip not found' });
  const trip = await getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (!allow(`feedback:${req.ip}`, 20, 3600 * 1000)) return res.status(429).json({ error: 'Thanks! That’s plenty for now.' });
  const rating = RATINGS.includes(req.body?.rating) ? req.body.rating : null;
  const comment = String(req.body?.comment || '').trim().slice(0, 3000);
  if (!rating && !comment) return res.status(400).json({ error: 'Pick a rating or write a comment.' });
  await query(`INSERT INTO feedback (trip_id, rating, comment) VALUES ($1, $2, $3)`, [trip.id, rating, comment || null]);
  res.json({ ok: true });
}));

const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMAIL_RE = /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/g;
// Replaces every traveler name (and the organizer's name) with "Traveler N", and any email
// address with "[email]", anywhere in a JSON-able value.
function scrubber(trip) {
  const names = new Map();
  (trip.travelers || []).forEach((t, i) => {
    for (const part of [t.name, ...String(t.name || '').split(/\s+/)]) {
      const n = String(part || '').trim();
      if (n.length >= 2 && !/^traveler\s*\d*$/i.test(n) && !names.has(n.toLowerCase())) names.set(n.toLowerCase(), `Traveler ${i + 1}`);
    }
  });
  const org = String(trip.basics?.organizer_name || '').trim();
  if (org.length >= 2 && !names.has(org.toLowerCase())) names.set(org.toLowerCase(), 'the organizer');
  const list = [...names.entries()].sort((a, b) => b[0].length - a[0].length); // full names before first names
  const fix = (str) => {
    let out = String(str).replace(EMAIL_RE, '[email]');
    for (const [n, label] of list) out = out.replace(new RegExp(`\\b${escapeRe(n)}\\b`, 'gi'), label);
    return out;
  };
  const walk = (v) => (typeof v === 'string' ? fix(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  return walk;
}

function tripDaysOf(t) {
  if (t.start_date && t.end_date) return Math.round((new Date(t.end_date) - new Date(t.start_date)) / 86400000) + 1;
  return t.day_count || null;
}
const tally = (arr) => Object.entries(arr.reduce((m, x) => { if (x) m[x] = (m[x] || 0) + 1; return m; }, {}))
  .map(([k, n]) => (n > 1 ? `${k} ×${n}` : k));

// What the Stache sees about one trip: no names, no emails, no owner, no invite links.
function anonymize(trip, feedback = []) {
  const trs = trip.travelers || [];
  const gluten = trs.filter((t) => (t.diet || []).includes('Gluten-free / Celiac'));
  const scrub = scrubber(trip);
  const b = trip.basics || {};
  const g = trip.group_answers || {};
  return {
    id: trip.id,
    created_at: trip.created_at,
    destination: trip.destination,
    when: trip.start_date ? `${trip.start_date} to ${trip.end_date}` : (b.approx_month || 'dates not set'),
    days: tripDaysOf(trip),
    traveler_count: trs.length || Number(b.traveler_count) || 1,
    composition: b.composition || '',
    purpose: b.purpose || [],
    tier: g.tier || '',
    intake_mode: g.intake_mode || 'organizer',
    ages: tally(trs.map((t) => t.age)),
    travel_styles: tally(trs.flatMap((t) => [...(t.why || []), t.how_spend, t.how_plan])),
    gluten_free: gluten.length ? `${gluten.length} traveler${gluten.length === 1 ? '' : 's'}${gluten[0].gluten_level ? ` (${gluten[0].gluten_level})` : ''}` : 'No',
    stage: trip.stage,
    itinerary_versions: trip.itinerary_versions,
    feedback: feedback.map((f) => ({ created_at: f.created_at, rating: f.rating, comment: f.comment ? scrub(f.comment) : '' })),
    itinerary: trip.itinerary ? scrub(trip.itinerary) : null,
  };
}

const adminOk = (req, res) => {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) { res.status(403).json({ error: 'Wrong admin key.' }); return false; }
  return true;
};

// Admin: send a test alert to ALERT_TO, to check the text actually arrives.
app.post('/api/admin/test-alert', wrap(async (req, res) => {
  if (!adminOk(req, res)) return;
  if (!alertsConfigured()) return res.status(400).json({ error: 'Alerts are off. Set ALERT_TO (and email sending) in Railway first.' });
  await sendAlert('test', 'ai-tinerary: test alert. If you got this, credit alerts will reach you here.');
  res.json({ ok: true });
}));

app.get('/api/admin/builds', wrap(async (req, res) => {
  if (!adminOk(req, res)) return;
  const trips = (await query(`
    SELECT t.* FROM trips t
    WHERE t.itinerary_versions > 0 OR EXISTS (SELECT 1 FROM feedback f WHERE f.trip_id = t.id)
    ORDER BY t.created_at DESC LIMIT 200`)).rows;
  const fb = (await query(`SELECT * FROM feedback WHERE trip_id = ANY($1::uuid[]) ORDER BY created_at`, [trips.map((t) => t.id)])).rows;
  res.json({ builds: trips.map((t) => { const { itinerary, ...rest } = anonymize(t, fb.filter((f) => f.trip_id === t.id)); return { ...rest, has_itinerary: !!itinerary }; }) });
}));

app.get('/api/admin/builds/:id', wrap(async (req, res) => {
  if (!adminOk(req, res)) return;
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const trip = await getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Not found' });
  const fb = (await query(`SELECT * FROM feedback WHERE trip_id = $1 ORDER BY created_at`, [trip.id])).rows;
  res.json(anonymize(trip, fb));
}));

// The website (built by `npm run build` into /dist).
const dist = path.join(__dirname, '..', 'dist');
// Front door: "/" is the Plan a trip page (the passcode gateway, then the intake). "The Truth About
// Travel" lives at /truth and "Travel on Your Terms" at /about.
app.get('/truth', (req, res) => res.sendFile(path.join(dist, 'truth.html')));
app.get('/about', (req, res) => res.sendFile(path.join(dist, 'landing.html')));
app.get('/sample', (req, res) => res.sendFile(path.join(dist, 'sample.html')));
// Old addresses keep working.
app.get('/plan', (req, res) => res.redirect(301, '/'));
app.get('/truth.html', (req, res) => res.redirect(301, '/truth'));
app.get('/index.html', (req, res) => res.redirect(301, '/about'));
app.get('/landing.html', (req, res) => res.redirect(301, '/about'));
app.get('/sample.html', (req, res) => res.redirect(301, '/sample'));
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

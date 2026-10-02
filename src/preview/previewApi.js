// A pretend back end for the single-file preview. It answers in the same shape as the real server,
// but every answer is sample data (a couple in Rome) and nothing is saved or sent to Claude.
import seed from './seed.js';

const ID = '00000000-0000-4000-8000-000000000001';
const KEY = 'ait_preview_trip';
const PASSCODE = 'demo';
const BAD_CODE = "That passcode isn't right. Check the one Wandering Mustache sent you.";
const MAX_VERSIONS = 5;

const clone = (x) => JSON.parse(JSON.stringify(x));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg, status) => Object.assign(new Error(msg), { status });
const stamp = () => new Date().toISOString();
const okCode = (c) => String(c || '').trim().toLowerCase() === PASSCODE;

let trip = null;
try { const saved = sessionStorage.getItem(KEY); if (saved) trip = JSON.parse(saved); } catch { /* storage unavailable: the demo just won't survive a reload */ }
const persist = () => {
  try { if (trip) sessionStorage.setItem(KEY, JSON.stringify(trip)); else sessionStorage.removeItem(KEY); } catch { /* fine */ }
};

// How long each pretend AI step "takes", in milliseconds.
const DELAY = { sights: 1100, pricing: 2200, tiles: 800, needs: 1500, review_check: 1800, generate: 4200 };

function finish(key) {
  if (!trip) return;
  if (key === 'generate') {
    const it = clone(seed.itinerary);
    it.generated_at = stamp();
    trip.itinerary = it;
    trip.itinerary_versions = (trip.itinerary_versions || 0) + 1;
    trip.stage = 'itinerary';
    trip.research.generate = { status: 'done', result: { version: trip.itinerary_versions }, at: stamp() };
  } else if (key === 'sights') { // one call fills both, like the real server
    trip.research.sights = { ...clone(seed.research.sights), at: stamp() };
    trip.research.budget = { ...clone(seed.research.budget), at: stamp() };
  } else {
    trip.research[key] = { ...clone(seed.research[key]), at: stamp() };
  }
  persist();
}
function start(key) {
  (key === 'sights' ? ['sights', 'budget'] : [key]).forEach((k) => { trip.research[k] = { status: 'running', at: stamp() }; });
  persist();
  setTimeout(() => finish(key), DELAY[key] || 1000);
}
// A page reload loses the timers, so anything still "running" is completed straight away.
if (trip) Object.entries(trip.research || {}).forEach(([k, v]) => { if (v?.status === 'running') finish(k === 'budget' ? 'sights' : k); });

function datesFrom(b = {}) {
  const has = b.date_mode !== 'days' && b.start_date && b.end_date;
  return {
    destination: (b.destination || '').trim(),
    start_date: has ? b.start_date : null,
    end_date: has ? b.end_date : null,
    day_count: has ? null : Math.max(1, Math.min(30, Number(b.day_count) || 3)),
  };
}

export const previewApi = {
  pollMs: 700,
  // The start page opens with these answers filled in, so the preview shows a finished-looking form.
  previewDefaults: {
    basics: {
      organizer_name: 'Dana', destination: 'Rome, Italy', date_mode: 'dates', start_date: '2026-11-10', end_date: '2026-11-12',
      traveler_count: 2, composition: 'Couple', purpose: ['Celebrating a milestone', 'Pure exploration'],
      occasion: { has: true, what: 'Anniversary dinner', date: '2026-11-11' }, group_dynamic: 'split', split_freq: 'Once a day',
    },
  },
  config: async () => ({ needsAccessCode: true, maxVersions: MAX_VERSIONS, needs: { physical: false, neuro: false, health: false, diet: false, gluten: true } }),
  access: async (code) => { await wait(250); if (!okCode(code)) throw fail(BAD_CODE, 403); return { ok: true }; },
  createTrip: async (basics, code) => {
    await wait(300);
    if (!okCode(code)) throw fail(BAD_CODE, 403);
    const d = datesFrom(basics);
    if (!d.destination) throw fail('Enter a destination to continue.', 400);
    if (d.start_date && d.end_date && d.end_date < d.start_date) throw fail('The end date is before the start date.', 400);
    trip = {
      id: ID, created_at: stamp(), updated_at: stamp(), ...d, stage: 'basics', basics: clone(basics),
      group_answers: clone(seed.group_answers), travelers: clone(seed.travelers), review: clone(seed.review),
      research: {}, itinerary: null, itinerary_versions: 0,
    };
    start('sights');
    return { id: ID };
  },
  getTrip: async (id) => { if (!trip || id !== ID) throw fail('Trip not found. Check the link.', 404); return clone(trip); },
  saveTrip: async (id, patch) => {
    if (!trip || id !== ID) throw fail('Trip not found', 404);
    if (patch.basics) {
      const d = datesFrom(patch.basics);
      if (!d.destination) throw fail('Enter a destination to continue.', 400);
      const changed = d.destination !== trip.destination || d.start_date !== trip.start_date || d.end_date !== trip.end_date || d.day_count !== trip.day_count;
      Object.assign(trip, d, { basics: clone(patch.basics) });
      if (changed) { trip.research = {}; start('sights'); }
    }
    if (patch.group_answers) trip.group_answers = clone(patch.group_answers);
    if (patch.travelers) {
      // Share Trip: mirrors the real server — once self-answer mode is on, any traveler without
      // an invite_token yet gets one, so "Copy link" works the moment names are saved.
      const mode = patch.group_answers?.intake_mode ?? trip.group_answers?.intake_mode;
      trip.travelers = clone(patch.travelers).map((t) => (mode === 'self' && !t.invite_token ? { ...t, invite_token: crypto.randomUUID() } : t));
    }
    ['review', 'stage'].forEach((k) => { if (patch[k]) trip[k] = clone(patch[k]); });
    trip.updated_at = stamp();
    persist();
    return clone(trip);
  },
  // Share Trip: the preview only ever has the one sample trip, so finding "the trip with this
  // token" is just a scan of its travelers — same end result as the real server's lookup.
  getInvite: async (token) => {
    await wait(200);
    const t = trip?.travelers?.find((x) => x.invite_token === token);
    if (!t) throw fail("We couldn't find a trip for this link. It may have been replaced by a newer one.", 404);
    return {
      destination: trip.destination, start_date: trip.start_date, end_date: trip.end_date, day_count: trip.day_count,
      traveler: clone(t),
      tiles: trip.research?.tiles?.result?.tiles || [],
      promoted_sights: trip.group_answers?.promoted_sights || [],
      missed: trip.group_answers?.been_before === 'before' ? trip.group_answers?.bb_missed : null,
      needs_gate: trip.group_answers?.needs_gate || '',
    };
  },
  saveInvite: async (token, body) => {
    await wait(250);
    const idx = trip?.travelers?.findIndex((x) => x.invite_token === token);
    if (idx === -1 || idx === undefined) throw fail("We couldn't find a trip for this link. It may have been replaced by a newer one.", 404);
    const prev = trip.travelers[idx];
    const next = { ...prev, ...clone(body), id: prev.id, invite_token: prev.invite_token, status: 'done' };
    trip.travelers = trip.travelers.map((t, i) => (i === idx ? next : t));
    persist();
    return { ok: true, traveler: clone(next) };
  },
  run: async (id, step) => {
    if (!trip || id !== ID) throw fail('Trip not found', 404);
    if (!['sights', 'budget', 'pricing', 'tiles', 'needs', 'review_check', 'generate'].includes(step)) throw fail('Unknown step', 404);
    if (step === 'generate' && (trip.itinerary_versions || 0) >= MAX_VERSIONS) {
      trip.research.generate = { status: 'error', error: `This trip has reached its limit of ${MAX_VERSIONS} itinerary versions.`, at: stamp() };
      persist();
    } else {
      start(step === 'budget' ? 'sights' : step);
    }
    return { started: true };
  },
  admin: async () => { throw fail('The cost page is not part of the preview.', 403); },
};

export function resetPreview() {
  trip = null;
  persist();
  try { sessionStorage.removeItem('ait_code'); } catch { /* fine */ }
}

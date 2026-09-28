// The call map, step by step. Each step runs in the background; the website
// checks back every couple of seconds until the result is saved.
import { query } from './db.js';
import { runStep } from './claude.js';
import { MAX_GENERATIONS_PER_TRIP, NEEDS } from './settings.js';
import { assignTier } from './tiers.js';

export const TIERS = [
  { key: 'backpacker', label: 'Backpacker' },
  { key: 'tourist', label: 'Tourist Class' },
  { key: 'three_star', label: '3-Star' },
  { key: 'four_star', label: '4-Star' },
  { key: 'five_star', label: '5-Star / Luxury' },
];
const tierLabel = (k) => TIERS.find((t) => t.key === k)?.label || '3-Star';

// ── helpers ─────────────────────────────────────────────────────────────
async function setResearch(tripId, key, value) {
  await query(
    `UPDATE trips SET research = jsonb_set(research, $2::text[], $3::jsonb, true), updated_at = now() WHERE id = $1`,
    [tripId, [key], JSON.stringify({ ...value, at: new Date().toISOString() })]
  );
}

export async function getTrip(id) {
  const r = await query('SELECT * FROM trips WHERE id = $1', [id]);
  return r.rows[0] || null;
}

// Start a step in the background. Won't start it twice at the same time.
export async function startStep(tripId, key, fn) {
  const trip = await getTrip(tripId);
  if (!trip) throw new Error('Trip not found');
  if (trip.research?.[key]?.status === 'running') {
    const age = Date.now() - new Date(trip.research[key].at).getTime();
    if (age < 10 * 60 * 1000) return; // already running
  }
  await setResearch(tripId, key, { status: 'running' });
  fn(trip)
    .then((result) => setResearch(tripId, key, { status: 'done', result }))
    .catch((err) => {
      console.error(`Step ${key} failed:`, err.message);
      return setResearch(tripId, key, { status: 'error', error: friendlyError(err) });
    });
}

export function friendlyError(err) {
  const m = err?.message || String(err);
  if (/credit balance|billing/i.test(m)) return 'The Claude account is out of credits. Add credits in the Claude Console, then try again.';
  if (/api.key|authentication|401/i.test(m)) return 'The Claude API key is missing or expired. Update CLAUDE_API_KEY in Railway.';
  if (/overloaded|529|rate/i.test(m)) return 'Claude is busy right now. Wait a minute and try again.';
  return m.slice(0, 300);
}

function tripDays(trip) {
  if (trip.start_date && trip.end_date) {
    const d = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1;
    if (d > 0) return d;
  }
  return trip.day_count || 3;
}

function when(trip) {
  const b = trip.basics || {};
  if (trip.start_date && trip.end_date) {
    return `${trip.start_date} to ${trip.end_date} (${tripDays(trip)} days)`;
  }
  return `${tripDays(trip)} days${b.approx_month ? `, around ${b.approx_month}` : ', dates not set'}`;
}

function basicsText(trip) {
  const b = trip.basics || {};
  return [
    `Destination: ${trip.destination}`,
    `When: ${when(trip)}`,
    `Travelers: ${b.traveler_count || 1} (${b.composition || 'not stated'}${b.composition_other ? ': ' + b.composition_other : ''})`,
    `Purpose: ${(b.purpose || []).join(', ') || 'Pure exploration'}${b.purpose_other ? ' / ' + b.purpose_other : ''}`,
    b.occasion?.has ? `Special occasion during the trip: ${b.occasion.what || 'yes'}${b.occasion.date ? ' on ' + b.occasion.date : ''}` : null,
    (b.traveler_count || 1) > 1
      ? `Group dynamic: ${b.group_dynamic === 'split' ? `OK to split up (${b.split_freq || 'as needed'}${b.split_other ? ': ' + b.split_other : ''})` : 'Stay together (shared itinerary)'}`
      : null,
  ].filter(Boolean).join('\n');
}

// Sensitive details are only sent to the steps that need them.
function travelersText(trip, { includeNeeds = true } = {}) {
  return (trip.travelers || []).map((t, i) => {
    const lines = [
      `Traveler ${i + 1}: ${t.name || 'Traveler ' + (i + 1)}${t.age ? ` (age ${t.age})` : ''}`,
      `  Travel styles: ${(t.styles || []).join(', ') || 'Reminiscer, Immersed (default)'}`,
      t.dining && `  Dining style: ${t.dining}`,
      (t.interests || []).length && `  Interests: ${t.interests.join(', ')}${t.interests_other ? ', ' + t.interests_other : ''}`,
      (t.must_dos || []).length && `  Must-dos: ${t.must_dos.map((m) => `${m.label} [${m.priority === 'nice' ? 'nice to have' : 'MUST'}]`).join('; ')}`,
      `  Pace vs group: ${t.pace_align || 'matches the group'}`,
      ((t.avoid || []).length || t.avoid_other) && `  Wants to avoid: ${[...(t.avoid || []), t.avoid_other].filter(Boolean).join(', ')}`,
      t.flexibility && `  Flexibility: ${t.flexibility}`,
      `  Physical activity / walking comfort: ${t.activity_level || 'Moderate'}`,
      t.rhythm && `  Daily rhythm: ${t.rhythm}`,
      t.food_adventure && `  Food adventurousness: ${t.food_adventure}`,
      t.food_dislikes && `  Food dislikes (not allergies): ${t.food_dislikes}`,
      t.solo_time && `  Wants some solo time: ${t.solo_time}`,
      ((t.observance || []).length || t.observance_other) && `  Religious/cultural observance: ${[...(t.observance || []), t.observance_other].filter(Boolean).join(', ')}`,
      t.alcohol && `  Alcohol: ${t.alcohol}`,
    ];
    if (includeNeeds) {
      const types = activeNeedTypes(t);
      const diet = activeDiet(t);
      if (types.includes('physical')) lines.push(`  Physical needs: ${[...(t.physical || []), t.physical_other].filter(Boolean).join(', ')}`);
      if (types.includes('neuro')) lines.push(`  Neurodivergent/sensory needs: ${[...(t.neuro || []), t.neuro_other].filter(Boolean).join(', ')}`);
      if (types.includes('health')) lines.push(`  Health considerations: ${[...(t.health || []), t.health_other].filter(Boolean).join(', ')}`);
      if (diet.length || t.diet_other) lines.push(`  Dietary/allergies: ${[...diet, t.diet_other].filter(Boolean).join(', ')}${diet.includes('Gluten-free / Celiac') && t.gluten_level ? ` (gluten: ${t.gluten_level})` : ''}`);
    }
    return lines.filter(Boolean).join('\n');
  }).join('\n\n');
}

function groupText(trip) {
  const g = trip.group_answers || {};
  const cat = g.category_tiers || {};
  return [
    `Budget tier: ${tierLabel(g.tier)} covering ${(g.budget_includes || ['Accommodations', 'Activities', 'Dining', 'Transportation']).join(', ')} (airfare excluded)`,
    Object.entries(cat).filter(([, v]) => v).map(([k, v]) => `  ${k} set to ${tierLabel(v)}`).join('\n') || null,
    `Accommodation comfort: ${g.comfort || 'Comfort matters, but adventure first'}`,
    `Getting around: ${g.transport_pref || 'Mix, no strong preference'}`,
    g.loyalty?.hotel && `Hotel loyalty: ${[...(g.loyalty.hotel_programs || []), g.loyalty.other].filter(Boolean).join(', ') || 'yes'} (actively flag matching properties)`,
    g.loyalty?.car && `Car rental loyalty: ${(g.loyalty.car_programs || []).join(', ') || 'yes'}`,
    `Research guidance: ${g.research_mode === 'only_mine' ? 'Use ONLY these trusted sources' : g.research_mode === 'mine_plus' ? 'Favor these trusted sources, plus your own suggestions' : 'Trusts ai-tinerary'}`,
    g.research_mode && g.research_mode !== 'trust' && Object.entries(g.research_sites || {}).filter(([, v]) => (v || []).length).map(([k, v]) => `  ${k}: ${v.join(', ')}`).join('\n'),
    g.research_sites_other && `  Other trusted sources: ${g.research_sites_other}`,
    (g.concerns || []).length && `Biggest concerns: ${g.concerns.join(', ')}${g.concerns_other ? ', ' + g.concerns_other : ''}`,
    `Pace: ${g.pace || 'Mix of Both'}`,
    (g.rest || []).length && `What counts as rest: ${g.rest.join(', ')}${g.rest_other ? ', ' + g.rest_other : ''}`,
    (g.must_do_cats || []).length && `Group must-do categories: ${g.must_do_cats.join(', ')}`,
    (g.must_avoid_cats || []).length && `Group must-avoid: ${g.must_avoid_cats.join(', ')}`,
    (g.prebooked || []).filter((p) => p.name).length && `Pre-booked (fixed, build around these): ${g.prebooked.filter((p) => p.name).map((p) => `${p.name} ${p.date || ''} ${p.start || ''}-${p.end || ''} ${p.location || ''}`.trim()).join('; ')}`,
    g.been_before === 'before' && `Been before: focus ${g.bb_focus || 'mix'}${g.bb_split ? ` (${g.bb_split})` : ''}${g.bb_missed ? `; missed last time: ${g.bb_missed}` : ''}`,
    g.been_before === 'lived' && `Lived there ${g.lived_when || ''}; ${g.lived_role || ''} ${g.lived_who ? '(' + g.lived_who + ')' : ''}`,
    g.been_before === 'first' || !g.been_before ? 'First time visiting' : null,
    g.certified === 'yes' && 'Needs CERTIFIED dietary accommodations (e.g., kosher, halal, certified gluten-free)',
  ].filter(Boolean).join('\n');
}

const done = (trip, key) => (trip.research?.[key]?.status === 'done' ? trip.research[key].result : null);

// A category can be turned off (server/settings.js NEEDS) without editing anyone's saved
// answers, so every place that reads needs_types/diet filters through these two — never the
// raw traveler fields directly. That keeps a disabled category out of prompts, summaries, and
// research even if it's sitting in older saved data.
const activeNeedTypes = (t) => (t.needs_types || []).filter((nt) => NEEDS[nt]);
// Gluten is gated on its own (NEEDS.gluten), separately from the rest of the list (NEEDS.diet),
// so it works whichever of the two is on: just gluten (today's beta default), just the general
// list, both, or neither.
const activeDiet = (t) => (t.diet || []).filter((d) => (d === 'Gluten-free / Celiac' ? NEEDS.gluten : NEEDS.diet));

// ── STAGE 1 ─────────────────────────────────────────────────────────────
// Sights and the budget snapshot are asked in ONE Haiku call (framingPrompt) instead of
// two, then split into the two research entries the rest of the app expects — this halves
// Stage 1's fixed cost (one system prompt instead of two) with no change to what's asked.
function framingPrompt(trip) {
  return `
Destination: ${trip.destination}. Trip: ${when(trip)}.
Two things, to frame the rest of the intake:
1) The sights and areas a first-time planner should know about.
2) A general budget snapshot for this destination from your knowledge (a live web price check comes later).
Return JSON:
{"sights":[{"name":"","why":"one short sentence","time_needed":"e.g. 2–3 hours","book_ahead":true}],
 "neighborhoods":[{"name":"","character":"one short sentence"}],
 "day_trips":[{"name":"","travel_time":""}],
 "currency":"ISO code travelers will pay in","cost_level":"one sentence on how expensive this place is overall",
 "tiers":{"backpacker":{"lodging_night":"","meal":"","daily_per_person":""},
          "tourist":{...},"three_star":{...},"four_star":{...},"five_star":{...}},
 "notes":["2–4 short, practical notes, e.g. tourist taxes, tipping, cash vs card"]}
Give 10–14 sights, 4–6 neighborhoods, 0–4 day trips. Only well-established, real places.
Budget: use ranges in local currency. Lodging is per room per night; daily_per_person includes lodging share (two sharing), food, activities, local transport.
Transport assumes public transport up to 3-star, a mix of private and public at 4-star, and private only at 5-star.`;
}

export async function startFraming(tripId) {
  const trip = await getTrip(tripId);
  if (!trip) return;
  if (trip.research?.sights?.status === 'running') {
    const age = Date.now() - new Date(trip.research.sights.at).getTime();
    if (age < 10 * 60 * 1000) return; // already running
  }
  const stamp = { status: 'running', at: new Date().toISOString() };
  await setResearch(tripId, 'sights', stamp);
  await setResearch(tripId, 'budget', stamp);
  try {
    const r = await runStep(tripId, 'sights', framingPrompt(trip), { maxTokens: 3500 });
    await setResearch(tripId, 'sights', { status: 'done', result: { sights: r.sights || [], neighborhoods: r.neighborhoods || [], day_trips: r.day_trips || [] } });
    await setResearch(tripId, 'budget', { status: 'done', result: { currency: r.currency || '', cost_level: r.cost_level || '', tiers: r.tiers || {}, notes: r.notes || [] } });
  } catch (err) {
    const msg = friendlyError(err);
    await setResearch(tripId, 'sights', { status: 'error', error: msg });
    await setResearch(tripId, 'budget', { status: 'error', error: msg });
  }
}

// ── STAGE 2 · Q2.0 pricing context (3 web-search calls instead of 5) ─────
// Lodging+transport share a call and food+activities share a call — both pairs are
// commonly on the same booking/review pages anyway — while season/context stays separate
// since it's a different kind of research. Same four price categories are still collected;
// this only cuts how many times the system prompt and destination framing get resent.
const PRICE_TIERS_JSON = `{"backpacker":{"low":0,"high":0},"tourist":{"low":0,"high":0},"three_star":{"low":0,"high":0},"four_star":{"low":0,"high":0},"five_star":{"low":0,"high":0}}`;
const pricingPrompts = {
  price_stay: (t) => `Search the web for CURRENT prices in ${t.destination} for ${when(t)}, covering two categories: lodging and local transport.
Return JSON: {"currency":"",
 "hotels":{"per_night_per_room":${PRICE_TIERS_JSON},"examples":[{"tier":"three_star","name":"","price":"","source_url":""}],"notes":[""]},
 "transit":{"transport_per_person_per_day":${PRICE_TIERS_JSON},"key_prices":[{"item":"","price":"","source_url":""}],"notes":[""]},
 "sources":[""]}
Lodging numbers are per room per night (backpacker = hostels; 5-star = luxury).
Transport numbers are per person per day, and WHICH KIND of transport depends on the tier:
- backpacker, tourist and 3-star: mainly public transport and walking (transit fares or passes, regional trains if relevant, public or shared airport transfer).
- 4-star: a mix of private and public transport (some trips by public transit, others by taxi, rideshare or a private transfer).
- 5-star: private transport ONLY (car with driver, private transfers, taxi or rideshare). No public transport.
Private transport is usually priced per vehicle, so split it between two travelers to keep every number per person. Local currency.`,
  price_eat_do: (t) => `Search the web for CURRENT prices in ${t.destination} for ${when(t)}, covering two categories: restaurants/food and main attractions/activities${done(t, 'sights') ? ` (key sights: ${done(t, 'sights').sights.slice(0, 8).map((s) => s.name).join(', ')})` : ''}.
Return JSON: {"currency":"",
 "food":{"food_per_person_per_day":${PRICE_TIERS_JSON},"typical":{"coffee":"","casual_lunch":"","mid_dinner":"","fine_dinner":""},"notes":[""]},
 "acts":{"activities_per_person_per_day":${PRICE_TIERS_JSON},"key_prices":[{"name":"","price":"","book_ahead":true,"official_site":"","source_url":""}],"free_highlights":[""],"notes":[""]},
 "sources":[""]}
food_per_person_per_day = three meals for one person at that tier. Local currency.`,
  price_context: (t) => `Search the web for travel context for ${t.destination} during ${when(t)}: season (peak/shoulder/low), typical weather, crowd levels, holidays, strikes or closures, major events, and general accessibility of the city (terrain, step-free transit).
Return JSON: {"season":"","weather":"","crowds":"","events":[""],"closures_or_warnings":[""],"accessibility":"","booking_advice":"","sources":[""]}`,
};
const PRICING_FAIL_LABEL = { price_stay: 'lodging & transport', price_eat_do: 'meals & activities', price_context: 'season & context' };

export async function runPricing(trip) {
  const keys = Object.keys(pricingPrompts);
  const results = await Promise.allSettled(keys.map((k) => runStep(trip.id, k, pricingPrompts[k](trip), { maxTokens: 3000 })));
  const out = { verified_on: new Date().toISOString().slice(0, 10), failed: [] };
  results.forEach((r, i) => {
    const k = keys[i];
    if (r.status !== 'fulfilled') { out.failed.push(PRICING_FAIL_LABEL[k]); return; }
    if (k === 'price_stay') { out.hotels = r.value.hotels; out.transit = r.value.transit; out.currency = out.currency || r.value.currency; }
    else if (k === 'price_eat_do') { out.food = r.value.food; out.acts = r.value.acts; out.currency = out.currency || r.value.currency; }
    else if (k === 'price_context') { out.context = r.value; }
  });
  // Estimated daily budget per person by tier = lodging/2 (two sharing) + food + activities + transport
  const est = {};
  for (const tier of ['backpacker', 'tourist', 'three_star', 'four_star', 'five_star']) {
    const parts = [
      out.hotels?.per_night_per_room?.[tier], out.food?.food_per_person_per_day?.[tier],
      out.acts?.activities_per_person_per_day?.[tier], out.transit?.transport_per_person_per_day?.[tier],
    ];
    if (parts.every((p) => p && Number.isFinite(+p.low) && Number.isFinite(+p.high))) {
      est[tier] = {
        low: Math.round(parts[0].low / 2 + parts[1].low + parts[2].low + parts[3].low),
        high: Math.round(parts[0].high / 2 + parts[1].high + parts[2].high + parts[3].high),
      };
    }
  }
  out.daily_estimate = est;
  out.currency = out.currency || done(trip, 'budget')?.currency || '';
  if (out.failed.length === keys.length) throw new Error('All pricing searches failed. Pricing will be checked during itinerary generation instead.');
  return out;
}

// Strips fields the itinerary-writing model doesn't need (source URLs, raw citation
// lists) out of research JSON before it's pasted into a prompt — same facts, fewer tokens.
function stripUrls(v) {
  if (Array.isArray(v)) return v.map(stripUrls);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === 'source_url' || k === 'sources') continue;
      out[k] = stripUrls(val);
    }
    return out;
  }
  return v;
}
// Keeps only what Stage 5 needs from the accessibility/dietary research (drops each
// finding's source URL and the organizer-facing "unverified" list, which isn't needed here).
function needsForPrompt(needs) {
  if (!needs) return needs;
  return {
    access: needs.access ? stripUrls({ verified: needs.access.verified, lodging_guidance: needs.access.lodging_guidance, transit_guidance: needs.access.transit_guidance, general_tips: needs.access.general_tips }) : null,
    diet: needs.diet ? stripUrls({ restaurants: needs.diet.restaurants, tips: needs.diet.tips }) : null,
  };
}

// ── STAGE 3 ─────────────────────────────────────────────────────────────
export function runTiles(trip) {
  const g = trip.group_answers || {};
  const sights = done(trip, 'sights');
  return runStep(trip.id, 'tiles', `
${basicsText(trip)}
Group must-do categories: ${(g.must_do_cats || []).join(', ') || 'none chosen'}
Group must-avoid: ${(g.must_avoid_cats || []).join(', ') || 'none'}
${g.been_before === 'before' && g.bb_missed ? `Missed last time: ${g.bb_missed}` : ''}
${sights ? `Known sights: ${sights.sights.map((s) => s.name).join(', ')}` : ''}
Suggest 10 destination-specific must-do experiences as short tiles (max 6 words each), mixing icons with
authentic local experiences that fit this group. Avoid anything in the must-avoid list.
Labels are plain names: name the place or experience without timing or transport add-ons (write "Colosseum", not "Colosseum at opening";
"Appian Way", not "Appian Way by bike"; "Pantheon", not "Pantheon at night").
Return JSON: {"tiles":[{"label":"","why":"one short sentence"}]}`, { maxTokens: 1500 });
}

export async function runNeeds(trip) {
  const trs = trip.travelers || [];
  const accessPeople = trs.filter((t) => activeNeedTypes(t).length);
  const dietPeople = trs.filter((t) => activeDiet(t).length || t.diet_other);
  const sights = done(trip, 'sights');
  const must = trs.flatMap((t) => (t.must_dos || []).map((m) => m.label));
  const context = `${basicsText(trip)}
Budget tier: ${tierLabel(trip.group_answers?.tier)}
Places likely on the itinerary: ${[...new Set([...must, ...(sights?.sights || []).slice(0, 8).map((s) => s.name)])].join(', ')}`;

  const jobs = {};
  if (accessPeople.length) {
    jobs.access = runStep(trip.id, 'needs_access', `
${context}

Travelers with accommodation needs:
${accessPeople.map((t) => { const types = activeNeedTypes(t); return `- ${t.name}: ${[
      types.includes('physical') && `physical: ${[...(t.physical || []), t.physical_other].filter(Boolean).join(', ')}`,
      types.includes('neuro') && `neurodivergent/sensory: ${[...(t.neuro || []), t.neuro_other].filter(Boolean).join(', ')}`,
      types.includes('health') && `health: ${[...(t.health || []), t.health_other].filter(Boolean).join(', ')}`,
    ].filter(Boolean).join(' | ')}`; }).join('\n')}

Search the web and find SPECIFIC, VERIFIABLE information that lets the itinerary work for these travelers:
step-free access and elevators at the likely places, accessible transit, terrain warnings, quiet hours or
sensory-friendly times, timed entry that avoids lines, quiet spaces, health considerations (altitude, heat,
pharmacies, medical access). Only include a fact in "verified" if you found a source for it this session;
anything else goes in "unverified". Never guess.
Return JSON:
{"verified":[{"place":"","fact":"","helps":["names"],"source_url":""}],
 "lodging_guidance":["what to look for in rooms/hotels, e.g. roll-in shower, elevator, quiet floor"],
 "transit_guidance":[""],
 "unverified":[{"topic":"","why_check":""}],
 "general_tips":[""]}`, { maxTokens: 5000 });
  }
  if (dietPeople.length) {
    jobs.diet = runStep(trip.id, 'needs_diet', `
${context}
Certified accommodations required: ${trip.group_answers?.certified === 'yes' ? 'YES' : 'no'}

Travelers with dietary needs (apply each restriction ONLY to that person, never to the whole group):
${dietPeople.map((t) => { const diet = activeDiet(t); return `- ${t.name}: ${[...diet, t.diet_other].filter(Boolean).join(', ')}${diet.includes('Gluten-free / Celiac') && t.gluten_level ? ` (gluten: ${t.gluten_level})` : ''}`; }).join('\n')}

Search the web for restaurants in ${trip.destination} that can SAFELY serve these needs, spread across the
areas the group is likely to visit and matching the budget tier. For allergies and celiac, prefer places with
explicit evidence (certification, dedicated menu, strong specific reviews). Include only restaurants you found
evidence for this session.
Also write a short allergy/diet card in the local language(s) that travelers can show to staff.
Return JSON:
{"restaurants":[{"name":"","area":"","serves":["which needs"],"for":["names"],"evidence":"","price_level":"€/€€/€€€","source_url":""}],
 "allergy_card":[{"for":"name","local_text":"","english":""}],
 "tips":[""],
 "unverified":[{"topic":"","why_check":""}]}`, { maxTokens: 5000 });
  }
  const out = { access: null, diet: null, skipped: !accessPeople.length && !dietPeople.length };
  const settled = await Promise.allSettled(Object.values(jobs));
  Object.keys(jobs).forEach((k, i) => {
    out[k] = settled[i].status === 'fulfilled' ? settled[i].value : { error: friendlyError(settled[i].reason) };
  });
  return out;
}

// ── STAGE 4 · must-do check + conflict detection (one Sonnet call) ──────
export function runReviewCheck(trip) {
  return runStep(trip.id, 'review_check', `
${basicsText(trip)}

GROUP ANSWERS
${groupText(trip)}

TRAVELERS
${travelersText(trip)}

Two jobs:
1) Must-do feasibility. For every must-do item, search the web where needed and check it can actually happen on
   these dates: open, not seasonal-closed, not under renovation, bookable, no date conflict with pre-booked items.
2) Conflicts. The plan will be JOINT by default, with side-by-side options in the same time slot where people
   differ. Identify only the conflicts that side-by-side options CANNOT reasonably solve and that need the
   organizer's decision (e.g., a must-do that one traveler physically cannot join and that takes most of a day;
   opposite daily rhythms across many days; a must-do that conflicts with another traveler's must-avoid or
   observance). Do not list small differences. ${trip.basics?.group_dynamic === 'split' ? 'The group said splitting up is OK.' : 'The group said it prefers to stay together.'}
   In conflict text, describe needs discreetly (e.g. "needs a step-free route"), never diagnoses.
Return JSON:
{"must_dos":[{"item":"","for":["names"],"status":"ok|book_ahead|closed_or_seasonal|date_conflict|unknown","note":"","source_url":""}],
 "conflicts":[{"id":"c1","summary":"one sentence","involves":["names"],"suggested":"together|split_activity|split_day|drop",
   "options":{"together":"what the compromise would be","split_activity":"who does what","split_day":"how a day apart would look","drop":"what gets dropped"}}]}`,
  { maxTokens: 4000 });
}

// ── STAGE 5 · generate → maps + tiers (code) → link check ───────────────
const mapsUrl = (q, dest) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q && q.toLowerCase().includes(dest.toLowerCase().split(',')[0]) ? q : `${q}, ${dest}`)}`;

export async function runGenerate(trip) {
  if ((trip.itinerary_versions || 0) >= MAX_GENERATIONS_PER_TRIP) {
    throw new Error(`This trip has reached its limit of ${MAX_GENERATIONS_PER_TRIP} itinerary versions. Raise MAX_GENERATIONS_PER_TRIP in Railway if needed.`);
  }
  const days = tripDays(trip);
  const r = trip.research || {};
  const review = trip.review || {};
  const check = done(trip, 'review_check');
  const decisions = (check?.conflicts || []).map((c) => {
    const ch = review.conflict_choices?.[c.id];
    return `- ${c.summary} → ORGANIZER DECIDED: ${ch?.choice || c.suggested}${ch?.note ? ` (${ch.note})` : ''}. ${c.options?.[ch?.choice || c.suggested] || ''}`;
  });
  const dropped = review.removed_mustdos || [];

  const prompt = `
Build a ${days}-day itinerary.

TRIP
${basicsText(trip)}

GROUP ANSWERS
${groupText(trip)}

TRAVELERS
${travelersText(trip)}

RESEARCH ALREADY DONE (use it; search again only to verify or fill gaps)
Common sights: ${JSON.stringify(done(trip, 'sights') || {})}
Live pricing (Stage 2, verified ${r.pricing?.result?.verified_on || 'n/a'}): ${JSON.stringify(stripUrls(r.pricing?.result) || {})}
Accessibility/sensory/health research: ${JSON.stringify(needsForPrompt(done(trip, 'needs'))?.access || 'none needed')}
Dietary research: ${JSON.stringify(needsForPrompt(done(trip, 'needs'))?.diet || 'none needed')}
Must-do check: ${JSON.stringify(check?.must_dos || [])}
${dropped.length ? `Organizer removed these must-dos: ${dropped.join(', ')}` : ''}
${decisions.length ? `ORGANIZER DECISIONS ON CONFLICTS (follow exactly):\n${decisions.join('\n')}` : 'No unresolved conflicts.'}

RULES
- JOINT itinerary by default. Where preferences differ and it's feasible, offer side-by-side options in the
  SAME time slot using "split" (e.g. one person at the museum, the rest at the market). Only create a split the
  organizer approved above, or a small same-slot option that keeps the group's day together. A "split" must list
  EVERY group in that time slot, including "everyone else", each with its own options; leave "options" empty on the block when you use "split". Travelers whose pace
  differs from the group, who want solo time, or with different daily rhythms get breakouts where they fit.
- All MUST items must appear unless the must-do check says impossible; nice-to-haves where they fit. Build around pre-booked items.
- Respect every avoid list, observance (e.g. no plans at prayer or Sabbath times, dress codes), alcohol preference, and daily rhythm.
- Budget: match the tier. Dining picks must fit the dining tier (no Michelin/World's 50 Best below 4-Star).
  Dietary safety applies ONLY to the person with the restriction, never as a blanket group filter. If today's
  price is >20% above the Stage 2 pricing, add "Prices have shifted; confirm before booking" to that option.
- Accessibility and sensory needs: plan step-free routes, seating, quiet times, timed entry, and rest as needed.
- DISCRETION: the whole group may read this. Never name anyone's disability, diagnosis, health condition, or
  allergy. Describe the arrangement instead ("step-free route", "quiet-hours entry", "menu with safe options").
- Booking links: prefer the venue's own official site; Airbnb counts as primary for lodging; OpenTable/aggregators are backup.
  Treat keyword domains like [name]tickets.com or official[name].com as resellers unless proven official. Omit a
  link rather than guess one. Transport: give the mode, why, and a research note (no booking links). Default modes follow the budget tier: public transport and walking at 3-Star and below, a mix of private and public at 4-Star, private only (car with driver, private transfers) at 5-Star. A clear group preference for getting around (anything other than "Mix, no strong preference") overrides that default.
- Flights are out of scope. Include lodging suggestions (2–3 options) as a separate "stay" list.
- Give 2–3 options for meals and flexible afternoon slots, like a good guidebook.
- place_query must be a precise Google Maps search string (venue name + neighborhood/street), not a description.
- Voice: warm, honest, practical, Wandering Mustache. No hype words.

Return JSON only:
{"title":"","summary":"2–3 sentences",
 "stay":[{"name":"","area":"","why":"","price_level":"","place_query":"","booking_url":"","booking_source":"","loyalty_note":""}],
 "days":[{"day":1,"date":"YYYY-MM-DD or null","title":"short theme","areas":["",""],
   "blocks":[{"time":"8:30–12:30","title":"","description":"","tags":["Timed entry required","Walk-in","Book ahead","Step-free","Quiet option","Rest time"],
     "who":"Everyone",
     "transport":{"mode":"","why":"","research_note":""},
     "options":[{"name":"","note":"","price_level":"€/€€/€€€ or Free","price_estimate":"","price_source":"","price_shift_warning":false,
        "place_query":"","booking_url":"","booking_source":"","accessibility_note":"","dietary_note":"","loyalty_note":""}],
     "split":[{"who":["names"],"title":"","description":"","options":[/* same shape as options */]}]
   }]}],
 "safety_notes":[{"title":"","text":""}],
 "useful_phrases":[{"phrase":"","meaning":""}],
 "before_you_go":[""]}
Omit "split" and "transport" when not needed. Use empty strings rather than invented URLs.`;

  const maxTokens = Math.min(32000, 4000 + days * 3500);
  const itin = await runStep(trip.id, 'generate', prompt, { maxTokens });

  // ── Code step: Google Maps links + verification tiers ──
  const everyOption = [];
  (itin.stay || []).forEach((o) => everyOption.push({ o, category: 'lodging' }));
  (itin.days || []).forEach((d) => (d.blocks || []).forEach((b) => {
    (b.options || []).forEach((o) => everyOption.push({ o, category: 'activity' }));
    (b.split || []).forEach((s) => (s.options || []).forEach((o) => everyOption.push({ o, category: 'activity' })));
  }));
  for (const { o } of everyOption) {
    o.maps_url = mapsUrl(o.place_query || o.name, trip.destination);
    Object.assign(o, assignTier(o.name, trip.destination));
  }

  // ── Sonnet: booking link check ──
  const urls = [...new Map(everyOption.filter(({ o }) => /^https?:\/\//.test(o.booking_url || ''))
    .map(({ o, category }) => [o.booking_url, { url: o.booking_url, name: o.name, category }])).values()].slice(0, 40);
  let linkReport = null;
  if (urls.length) {
    try {
      linkReport = await runStep(trip.id, 'link_check', `
Destination: ${trip.destination}.
Check each booking link below. Use web search to confirm whether each URL is the venue's OWN official site
(or Airbnb for lodging), a legitimate backup platform, or a third-party reseller, and whether it plausibly works.
A domain that sounds official is not necessarily official (e.g. vaticantickets.com is a reseller; the Vatican's own
site is on .va). If a link is a reseller or broken and you find the official site, give it as better_url.
Links:
${urls.map((u, i) => `${i + 1}. ${u.name} (${u.category}): ${u.url}`).join('\n')}
Return JSON: {"links":[{"url":"","verdict":"official|primary_platform|backup_platform|reseller|broken|unverified","better_url":"","reason":"short"}]}`,
      { maxTokens: 4000 });
    } catch (e) {
      linkReport = { error: friendlyError(e), links: [] };
    }
  }
  const verdicts = new Map((linkReport?.links || []).map((l) => [l.url, l]));
  for (const { o } of everyOption) {
    if (!o.booking_url) continue;
    const v = verdicts.get(o.booking_url);
    if (!v) { o.link_status = 'unchecked'; continue; }
    if ((v.verdict === 'reseller' || v.verdict === 'broken') && /^https?:\/\//.test(v.better_url || '')) {
      o.booking_url = v.better_url; o.link_status = 'official';
    } else if (v.verdict === 'broken' || v.verdict === 'unverified') {
      o.booking_url = ''; o.link_status = 'removed';
    } else {
      o.link_status = v.verdict;
    }
  }

  // ── Notes that always apply ──
  const trs = trip.travelers || [];
  itin.notes = [];
  if (trs.some((t) => activeNeedTypes(t).includes('physical'))) {
    itin.notes.push({ title: 'Accessible rooms', text: 'Accessible rooms may cost more than standard rooms at this tier. We can\'t verify exact pricing without checking the hotel\'s booking page — we recommend confirming accessibility features and costs directly with the hotel before booking.' });
  }
  if (trs.some((t) => activeDiet(t).length || t.diet_other)) {
    itin.notes.push({ title: 'Allergies', text: 'We searched for restaurants with accommodations, but cannot guarantee food safety. Always inform restaurants of allergies directly.' });
  }
  itin.allergy_card = done(trip, 'needs')?.diet?.allergy_card || [];
  itin.generated_at = new Date().toISOString();
  itin.link_check = { checked: urls.length, error: linkReport?.error || null };

  await query(
    `UPDATE trips SET itinerary = $2, itinerary_versions = itinerary_versions + 1, stage = 'itinerary', updated_at = now() WHERE id = $1`,
    [trip.id, JSON.stringify(itin)]
  );
  return { version: (trip.itinerary_versions || 0) + 1 };
}

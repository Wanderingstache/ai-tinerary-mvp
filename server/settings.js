// ─────────────────────────────────────────────────────────────
//  SETTINGS: the one file to edit when models or prices change.
// ─────────────────────────────────────────────────────────────

export const MODELS = {
  haiku: process.env.MODEL_HAIKU || 'claude-haiku-4-5-20251001',
  sonnet: process.env.MODEL_SONNET || 'claude-sonnet-5',
  opus: process.env.MODEL_OPUS || 'claude-opus-5-5',
};

// US dollars per 1 million tokens. Check https://platform.claude.com/docs/en/about-claude/pricing
// Verified September 2026.
export const PRICES = {
  [MODELS.haiku]: { input: 1, output: 5 },
  [MODELS.sonnet]: { input: 2, output: 10 },
  [MODELS.opus]: { input: 4, output: 20 },
};
export const WEB_SEARCH_PRICE = 10 / 1000; // $10 per 1,000 searches

// The agreed call map. Each step: model, whether it may search the web,
// and the most searches it may run (a cost cap).
export const STEPS = {
  // Stage 1's two calls (sights, budget) are asked together as one Haiku call — see
  // steps.js's startFraming — so they share one entry here and one system-prompt cost.
  sights:        { model: 'haiku',  search: false, label: 'Stage 1 · Sights & budget snapshot' },
  // Stage 2's pricing check is 3 calls, not 5: lodging+transport share a call, food+activities
  // share a call, and season/context stays on its own. Same categories researched, fewer
  // system-prompt repeats.
  price_stay:    { model: 'haiku',  search: true, maxSearches: 5, label: 'Stage 2 · Lodging & transport pricing' },
  price_eat_do:  { model: 'haiku',  search: true, maxSearches: 5, label: 'Stage 2 · Food & activity pricing' },
  price_context: { model: 'haiku',  search: true, maxSearches: 3, label: 'Stage 2 · Season & context' },
  tiles:         { model: 'haiku',  search: false, label: 'Stage 3 · Must-do tiles' },
  needs_access:  { model: 'opus',   search: true, maxSearches: 8, label: 'Stage 3 · Accessibility, sensory & health' },
  needs_diet:    { model: 'opus',   search: true, maxSearches: 8, label: 'Stage 3 · Dietary & allergies' },
  review_check:  { model: 'sonnet', search: true, maxSearches: 6, label: 'Stage 4 · Must-do check & conflicts' },
  generate:      { model: 'opus',   search: true, maxSearches: 10, label: 'Stage 5 · Itinerary' },
  link_check:    { model: 'sonnet', search: true, maxSearches: 8, label: 'Stage 5 · Booking link check' },
};

// Safety limit so one trip can't run up a big bill by regenerating over and over.
export const MAX_GENERATIONS_PER_TRIP = Number(process.env.MAX_GENERATIONS_PER_TRIP || 5);

// Beta scope for accommodation needs (updated 2026-09-27): the beta intake is written for a
// "typical"-minded, "able"-bodied traveler for now. Physical accessibility, neurodivergent/
// sensory needs, other health considerations, and the general dietary list (vegetarian, vegan,
// kosher, halal, nut/shellfish allergy, dairy-free) are all off. The one exception is a gluten
// allergy/celiac question, asked on its own — it's a common, clearly-defined need that's easy
// for the model to act on correctly, unlike the broader list.
//
// Each flag is a Railway variable so turning a category back on later (for real clients) is a
// variable flip, not a rebuild. Turning a category off both hides its question on the intake AND
// skips the Opus research call for it — the saving is real, not just a smaller prompt. `diet` and
// `gluten` are independent: `diet` gates the general multi-select list; `gluten` gates the
// standalone gluten question and works whether or not the general list is on (so this same
// setup still works if `diet` is switched back on later and you want gluten split out from it).
export const NEEDS = {
  physical: process.env.NEEDS_PHYSICAL === '1',   // off by default
  neuro: process.env.NEEDS_NEURO === '1',         // off by default for beta
  health: process.env.NEEDS_HEALTH === '1',       // off by default
  diet: process.env.NEEDS_DIET === '1',           // off by default for beta (the general list)
  gluten: process.env.NEEDS_GLUTEN !== '0',       // ON by default — the one dietary question asked in beta
};

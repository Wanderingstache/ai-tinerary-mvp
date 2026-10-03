# ai-tinerary (v1)

One Railway service runs everything: the website, the AI engine, and the database connection.

## How it's organized
- `src/` — the website (the intake questions and itinerary display). Wording for every answer choice lives in `src/options.js`.
- `server/` — the engine.
  - `server/settings.js` — **the one file for models, prices, and web-search limits.**
  - `server/steps.js` — the AI instructions (prompts) for each of the 13 calls.
  - `server/wander-maps.json` — your Stached / Scouted / Vetted places. Add entries here to upgrade a place from "AI-ed".
- `public/` — logos.

## The AI calls (9–11 per itinerary, depending on whether anyone has accommodation needs)
| Stage | Call | Model | Web search |
|---|---|---|---|
| 1 | Sights + budget snapshot (one call) | Haiku | no |
| 2 | Lodging & transport pricing | Haiku | yes |
| 2 | Food & activity pricing | Haiku | yes |
| 2 | Season & context | Haiku | yes |
| 3 | Must-do tiles | Haiku | no |
| 3 | Accessibility, sensory & health | Opus | yes (only if needed) |
| 3 | Dietary & allergies | Opus | yes (only if needed) |
| 4 | Must-do check + conflicts | Sonnet | yes |
| 5 | Itinerary | Opus | yes |
| 5 | Booking-link check | Sonnet | yes |

Plain code (no AI, no cost): Google Maps links, verification tiers, accessible-room and allergy notes.

### Cost tuning (2026-09-27)
- **Prompt caching** is on for every call (`server/claude.js`). The system prompt and each step's
  own prompt are cache breakpoints, so a retry, a "Rebuild", or a call that pauses mid-search and
  continues reads its earlier context back at 5–10% of normal price instead of paying full price
  again. First-time calls cost a little more (a 25% premium on the part that gets cached) but every
  reuse within about 5 minutes is far cheaper — biggest effect on the Opus/Sonnet calls that run
  several search rounds.
- Stage 1's two calls and Stage 2's five pricing calls were combined into one and three,
  same research, fewer system-prompt repeats.
- The big research JSON pasted into the Stage 5 prompt has source URLs and citation lists
  stripped out first (`stripUrls`/`needsForPrompt` in `server/steps.js`) — same facts, fewer tokens.

None of this changed which model runs which step, or whether it can search the web — those choices
were made for accuracy and are untouched. Real per-trip costs will show in `/admin` once you've run
a few live trips; if a step's web-search cap is consistently unused, lower it in `server/settings.js`.

### Beta scope for accommodation needs (updated 2026-09-27)
The beta intake is written for a "typical"-minded, "able"-bodied traveler for now. Physical
accessibility, neurodivergent/sensory needs, other health considerations, and the general dietary
list are all off. The one exception is a standalone gluten allergy/celiac question — common,
clearly defined, and easy for the model to act on correctly, unlike the broader list.

This isn't just hidden on the form: when a category is off, no traveler can trigger its research
call at all, so `needs_access` never runs unless neuro/physical/health are turned back on, and
`needs_diet` only ever sees a gluten flag during beta.

Controlled by `server/settings.js` → `NEEDS`, one Railway variable per category (see `.env.example`).
`diet` (the general list) and `gluten` are independent, so gluten stays askable on its own even
with the rest of the list off. Flipping any category on for real clients is a variable change,
not a rebuild.

## Pages
- `/` — the homepage: "Plan a trip". The passcode gateway ("Already Invited? Lucky you!"), and once the right passcode is entered, Step 1 of the intake. Not case-sensitive; the browser tab remembers the passcode until it closes
- `/truth` — "The Truth About Travel" (`public/truth.html`), with the how-a-trip-becomes-an-itinerary diagram at the top
- `/about` — "Travel on Your Terms" / how it works (`public/landing.html`), with the optional travel-style quiz link in step 1
- `/trip/<id>` — the trip, Steps 2–5. Anyone with this link can view and edit that trip
- `/admin` — costs per trip and per step (needs ADMIN_KEY)
- Old addresses still work: `/plan` goes to `/`; `/truth.html` goes to `/truth`; `/index.html` and `/landing.html` go to `/about`

The logo (`public/logo.png`, styled by `public/brand.css`) sits at the top of every page. The badge links to the homepage;
"Wandering" and the mustache open wanderingmustache.com in a new tab. The home screen also has a line of links above the logo
(Home, The Truth, How it works).

The travel-style quiz lives at https://wanderingmustache.com/traveler-types. It is linked from `public/landing.html` (step 1)
and from the travel-style question on each traveler card (`src/Stage3.jsx`).

## Preview file
`npm run preview:build` makes `dist-preview/ai-tinerary-preview.html`: the real pages and the real app in ONE file, with a
pretend back end that plays back a sample trip (a couple in Rome). Nothing is saved or sent to Claude. Passcode: `demo`.
It is rebuilt from the same source as the live site, so edits to any page or screen show up in it.

## Railway variables
See `.env.example`.

## Testing for free
Set `MOCK_AI=1` to use fake AI answers (no Claude charges). Never set it in production.

## Pricing assumptions
The pricing card's transport row depends on the budget tier: public transport and walking up to 3-Star, a mix of private and
public at 4-Star, and private only (car with driver, private transfers) at 5-Star. Private rides are priced per vehicle and split
between two travelers, so every figure is per person. The prompts are in `server/steps.js` (`price_stay`, the Stage 1 snapshot and
the itinerary rules). The itinerary follows the same defaults unless the group clearly chose a different way of getting around.

## Share Trip
On the Travelers step, the organizer can choose "Let each person answer for themselves" instead of
filling in every card. Each traveler then gets their own link (`/invite/<token>`) that shows only
their own card — never the budget, the trip dates (beyond context), or anyone else's answers.

- A traveler's `invite_token` is assigned the moment the organizer saves names in that mode
  (`server/index.js`, the `PUT /api/trips/:id` handler) — no separate "generate links" step.
- `GET /api/invite/:token` and `PUT /api/invite/:token` are deliberately narrow: they return/accept
  only that one traveler's fields, found via a Postgres JSONB containment query
  (`getTripByInviteToken` in `server/steps.js`) rather than a second lookup table.
- The organizer can set an optional response deadline. Once it's passed, Review just says it's fine
  to build anyway — nothing builds on its own. A traveler who never answers is treated as easygoing
  and flexible, not as a blocker (see `travelersText()`'s `unansweredSelf` note).
- Going back to Trip details and forward again, or clicking Review, never overwrites a traveler's
  real submission with the organizer's local (possibly stale) copy — self mode never re-sends the
  whole travelers array, only the stage change.
- `src/Stage3.jsx`'s `Card` component is shared between the organizer's view and the invite page
  (`src/InviteFlow.jsx`), so a question added to one appears in both automatically.

## Closing the tab: resuming a trip
There's no sign-in anywhere in ai-tinerary — a trip's own link is still the access, same as always.
Two small things soften "I closed the tab and lost it":

- **Remember this device** (`src/localTrip.js`): the browser quietly notes the most recent trip it
  touched. Reopening the site offers "Still working on your trip to X?" — only works on that same
  device/browser; a different phone has nothing to go on. Nothing to set up, on by default.
- **Email the trip link**: a "Save your spot — email me this link" option, sent through
  [Resend](https://resend.com). Off by default — the server returns a clear error instead of
  pretending to send anything until it's configured:
  1. Create a free Resend account (no credit card) and generate an API key.
  2. In Railway → Variables, add `RESEND_API_KEY`. The sending address defaults to Resend's own
     shared test address; to send from your own address, verify a domain in Resend and set
     `RESEND_FROM_EMAIL` (e.g. `ai-tinerary <trips@wanderingmustache.com>`).
  3. Until a domain is verified, Resend's shared address can only deliver to your own verified
     email — fine for testing, not yet for real clients. Verifying `wanderingmustache.com` (the
     same kind of DNS step as the custom domain setup above) unlocks sending to anyone.
  Once `RESEND_API_KEY` exists, `/api/config` reports `emailEnabled: true` and the option appears
  on every trip automatically — no further code or redeploy needed.

# Notes for Claude Code (ai-tinerary)

Owner: Cris, non-technical founder. Cris doesn't edit code; Claude does all code changes and pushes. Explain steps plainly, one at a time. Confirm before anything
destructive or before changing live Railway variables. Never put tokens in a git remote URL.

Deploy: push to `main` on GitHub (Wanderingstache/ai-tinerary-mvp) → Railway deploys automatically.
See README.md for how the code is organized.

## Decisions (newest first)

### 2026-10-17 — Accounts (email + password) and My travelers
- Beta clients (with the passcode) can create an account: email + password, optional first name.
  Accounts live ONLY in ai-tinerary's database and are never shared with Wandering Mustache — say
  so wherever we ask people to sign up (`PRIVACY_LINE` in `src/Account.jsx`).
- Creating an account needs the passcode; signing in doesn't. Passwords: min 8 chars, salted scrypt
  hash (`server/auth.js`). Login is rate-limited per address and per visitor.
- The emailed sign-in link still works for the same address and is the "forgot password" route:
  sign in by link, then set a new password on /account.
- On sign-up/sign-in, trips this browser already opened (and nobody owns yet) join "My trips".
- /account = "My travelers": you plus your usual travel partners, with travel style and card
  answers (including gluten). Saved in `saved_people`. On a trip's traveler card, "Fill from My
  travelers" copies a saved person in; "Save to My travelers" saves the card. Copies, not links —
  editing a saved person never changes past trips. Must-dos stay with the trip, not the person.
- The Plan-a-trip page shows a dismissible "Make yourself at home" account prompt to signed-out visitors.

### 2026-10-17 — Group size and master intake
- Groups can be 1–30 travelers (`MAX_TRAVELERS` in `src/options.js` and `server/index.js`, keep both in step).
- The "5+" box now starts empty and shows "Planning for N travelers" so the count is never silently 5.
- Step 3 has three answer modes: a card for each person, **one master form for the whole group**
  (`src/MasterIntake.jsx`), or each person answers for themselves (invite links).
- Master form: the organizer ticks which per-person details to add (Names, Ages, Pace, Travel style),
  any mix or none (headcount only). Every per-person field can be left blank. Gluten can be a
  head count or marked per person.
- The master form is stored in `group_answers.master` and expanded into ordinary traveler records on
  Review (`expandMaster`), so the AI steps need no special handling. `travelersText` in
  `server/steps.js` states lines shared by everyone once, to keep big-group prompts short.

### Planned next (needs Cris's OK on the plan before building)
- Scope change from the original beta: saved data is coming. Saved trip setups (everything except
  destination) that can be copied to a new destination, grouped destination "options" to compare
  side by side, and saved personas (one traveler's preferences, copied into a trip, not linked).
  All belong to the signed-in organizer and can be renamed and deleted.

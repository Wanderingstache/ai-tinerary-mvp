// Share Trip, Option A: "remember this device". There's no sign-in anywhere in ai-tinerary — a
// trip's own link is its access, the same as it's always been. This just keeps a note of the
// most recent trip THIS browser touched, so reopening the site offers to resume it, without
// needing an account, a password, or anything typed. It only ever helps on the same device; a
// different phone or a cleared browser has nothing to go on, same as before this existed.
const KEY = 'ai-tinerary:last_trip';

export function rememberTrip(id, destination) {
  try { localStorage.setItem(KEY, JSON.stringify({ id, destination, at: Date.now() })); } catch { /* storage unavailable — resuming just won't be offered */ }
}

export function getRememberedTrip() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && v.id ? v : null;
  } catch { return null; }
}

export function forgetRememberedTrip() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to do */ }
}

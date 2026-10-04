// "Remember this device". There's no account needed to use ai-tinerary — a trip's own link is its
// access. This keeps a short list of the trips THIS browser has opened lately, so reopening the
// site offers them instead of making you hunt for a link. It only helps on the same browser; to
// find trips from any device, sign in (see session.js and the "My trips" page).
const KEY = 'ai-tinerary:recent_trips';
const OLD_KEY = 'ai-tinerary:last_trip'; // the single remembered trip from the first version
const MAX = 8;

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(list)) return list.filter((t) => t && t.id);
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); // carry the old one over once
    return old && old.id ? [old] : [];
  } catch { return []; }
}
const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); localStorage.removeItem(OLD_KEY); } catch { /* storage unavailable — nothing is remembered */ } };

// Most recently opened first; opening a trip again just moves it to the top.
export function rememberTrip(id, destination) {
  const rest = read().filter((t) => t.id !== id);
  write([{ id, destination: destination || 'Untitled trip', at: Date.now() }, ...rest]);
}
export const getRecentTrips = () => read();
export const getRememberedTrip = () => read()[0] || null;
export function forgetTrip(id) { write(read().filter((t) => t.id !== id)); }
export function forgetRememberedTrip() { try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch { /* nothing to forget */ } }

// Page addresses. On the live site these are normal paths (/plan, /trip/…). The single-file
// preview has no server, so it switches on hash addresses (#/plan, #/trip/…) instead.
// Everything in the app goes through these four helpers, so the two modes behave the same.
let hashMode = false;
export const enableHashRouting = () => { hashMode = true; };
export const isHash = () => hashMode;
// A page's own in-page anchors (the itinerary's "Day 1/2/3" jump links) also live in the URL's
// hash, e.g. "#day-1" — the same spot the preview uses for page addresses like "#/trip/...".
// Anything that isn't a page address (doesn't start with "/") is one of those anchors, not a
// page to open, so it's treated as "no page change" rather than "page not found".
export const isRouteHash = (h) => h.startsWith('/');
export const currentPath = () => {
  if (!hashMode) return window.location.pathname;
  const h = window.location.hash.replace(/^#/, '');
  return isRouteHash(h) ? h : '/';
};
export const link = (p) => (hashMode ? `#${p}` : p);
export const go = (p) => { if (hashMode) window.location.hash = p; else window.location.assign(p); };

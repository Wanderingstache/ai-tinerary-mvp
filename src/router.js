// Page addresses. On the live site these are normal paths (/plan, /trip/…). The single-file
// preview has no server, so it switches on hash addresses (#/plan, #/trip/…) instead.
// Everything in the app goes through these four helpers, so the two modes behave the same.
let hashMode = false;
export const enableHashRouting = () => { hashMode = true; };
export const isHash = () => hashMode;
export const currentPath = () => (hashMode ? (window.location.hash.replace(/^#/, '') || '/') : window.location.pathname);
export const link = (p) => (hashMode ? `#${p}` : p);
export const go = (p) => { if (hashMode) window.location.hash = p; else window.location.assign(p); };

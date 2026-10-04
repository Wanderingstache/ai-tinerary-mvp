// Sign-in session, kept on this device. The long random value is sent with each request as
// "Authorization: Bearer …"; the server only ever stores a hash of it. Signing out (or 30 days)
// ends it. Nothing here is needed to use the site — signing in only makes trips easy to find.
const KEY = 'ai-tinerary:session';
const EVENT = 'ai-tinerary:session-changed';

export const getSession = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const announce = () => { try { window.dispatchEvent(new Event(EVENT)); } catch { /* not in a browser */ } };
export const setSession = (s) => { try { localStorage.setItem(KEY, s); } catch { /* private mode: stays signed out */ } announce(); };
export const clearSession = () => { try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ } announce(); };
export const onSessionChange = (fn) => { window.addEventListener(EVENT, fn); return () => window.removeEventListener(EVENT, fn); };

import { getSession } from './session.js';

async function call(method, url, body, headers = {}) {
  const session = getSession();
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) { const err = new Error(data.error || `Request failed (${res.status})`); err.status = res.status; throw err; }
  return data;
}
export const api = {
  config: () => call('GET', '/api/config'),
  access: (code) => call('POST', '/api/access', { code }),
  waitlist: (body) => call('POST', '/api/waitlist', body),
  createTrip: (basics, access_code) => call('POST', '/api/trips', { basics, access_code }),
  getTrip: (id) => call('GET', `/api/trips/${id}`),
  saveTrip: (id, patch) => call('PUT', `/api/trips/${id}`, patch),
  run: (id, step) => call('POST', `/api/trips/${id}/run/${step}`),
  admin: (key) => call('GET', '/api/admin/trips', null, { 'x-admin-key': key }),
  getInvite: (token) => call('GET', `/api/invite/${token}`),
  saveInvite: (token, traveler) => call('PUT', `/api/invite/${token}`, traveler),
  emailLink: (id, email) => call('POST', `/api/trips/${id}/email-link`, { email }),
  authRequest: (email, access_code) => call('POST', '/api/auth/request', { email, access_code }),
  authVerify: (token) => call('POST', '/api/auth/verify', { token }),
  authLogout: () => call('POST', '/api/auth/logout'),
  me: () => call('GET', '/api/me'),
  myTrips: () => call('GET', '/api/my-trips'),
  register: (body) => call('POST', '/api/auth/register', body),
  login: (body) => call('POST', '/api/auth/login', body),
  setPassword: (password) => call('POST', '/api/auth/password', { password }),
  claimTrips: (trip_ids) => call('POST', '/api/my-trips/claim', { trip_ids }),
  people: () => call('GET', '/api/people'),
  addPerson: (p) => call('POST', '/api/people', p),
  updatePerson: (id, p) => call('PUT', `/api/people/${id}`, p),
  deletePerson: (id) => call('DELETE', `/api/people/${id}`),
  emailTravelerLink: (id, travelerId, email) => call('POST', `/api/trips/${id}/travelers/${travelerId}/email-link`, { email }),
};

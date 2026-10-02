async function call(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
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
  createTrip: (basics, access_code) => call('POST', '/api/trips', { basics, access_code }),
  getTrip: (id) => call('GET', `/api/trips/${id}`),
  saveTrip: (id, patch) => call('PUT', `/api/trips/${id}`, patch),
  run: (id, step) => call('POST', `/api/trips/${id}/run/${step}`),
  admin: (key) => call('GET', '/api/admin/trips', null, { 'x-admin-key': key }),
  getInvite: (token) => call('GET', `/api/invite/${token}`),
  saveInvite: (token, traveler) => call('PUT', `/api/invite/${token}`, traveler),
};

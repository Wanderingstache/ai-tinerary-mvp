// Passwordless sign-in for "My trips". There are no passwords: asking to sign in emails a link;
// opening it and confirming starts a session. Trips and traveler links keep working exactly as
// before — signing in only adds a way to FIND your trips from any device.
//
// Safety notes (why it's built this way):
// - Links and sessions are 256 random bits, and only their SHA-256 hash is stored, so a leaked
//   copy of the database can't be used to sign in as anyone.
// - A sign-in link works once, expires in 15 minutes, and is redeemed with a single atomic UPDATE,
//   so two quick clicks can't both succeed.
// - Requesting a link is rate-limited per address and per visitor, so this can't be used to spam
//   someone's inbox. (The caller also has to know the site passcode — see index.js.)
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
const scrypt = promisify(scryptCb);
import { query } from './db.js';

const SIGN_IN_MINUTES = 15;
const SESSION_DAYS = 30;

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

export const normalizeEmail = (e) => String(e || '').trim().toLowerCase();
export const validEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const looksLikeToken = (t) => /^[A-Za-z0-9_-]{43}$/.test(t || '');

export async function createSignInToken(email) {
  const token = newToken();
  await query(
    `INSERT INTO sign_in_tokens (token_hash, email, expires_at) VALUES ($1, $2, now() + interval '${SIGN_IN_MINUTES} minutes')`,
    [sha(token), email]
  );
  return token;
}

// Returns the email the link was sent to, or null if it's unknown, expired, or already used.
export async function redeemSignInToken(token) {
  const r = await query(
    `UPDATE sign_in_tokens SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING email`,
    [sha(token)]
  );
  return r.rows[0]?.email || null;
}

export async function createSession(email) {
  const token = newToken();
  await query(
    `INSERT INTO sessions (token_hash, email, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`,
    [sha(token), email]
  );
  return token;
}

const bearer = (req) => {
  const h = req.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
};

// The signed-in email for this request, or null. Never throws — a bad or missing session just
// means "not signed in", so the trip pages themselves keep working for everyone.
export async function sessionEmail(req) {
  const t = bearer(req);
  if (!looksLikeToken(t)) return null;
  try {
    const r = await query(`SELECT email FROM sessions WHERE token_hash = $1 AND expires_at > now()`, [sha(t)]);
    return r.rows[0]?.email || null;
  } catch { return null; }
}

export async function destroySession(req) {
  const t = bearer(req);
  if (looksLikeToken(t)) await query(`DELETE FROM sessions WHERE token_hash = $1`, [sha(t)]);
}

export async function purgeExpiredAuth() {
  await query(`DELETE FROM sign_in_tokens WHERE expires_at < now() - interval '1 day'`);
  await query(`DELETE FROM sessions WHERE expires_at < now()`);
}

// Simple in-memory limiter: `max` hits per `windowMs` for a key. Fine for a single server; it
// resets on a restart, which only ever makes it more lenient, never locks anyone out for long.
const hits = new Map();
export function allow(key, max, windowMs) {
  const now = Date.now();
  const h = (hits.get(key) || []).filter((t) => t > now - windowMs);
  if (h.length >= max) { hits.set(key, h); return false; }
  h.push(now); hits.set(key, h);
  return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => t > now - 3600 * 1000)) hits.delete(k); }, 30 * 60 * 1000).unref();

// ── Passwords (accounts) ────────────────────────────────────────────────────────────────────
// Stored as "scrypt$<salt>$<hash>": a fresh random salt per password and a slow hash, so a copy
// of the database doesn't reveal anyone's password. Passwords are never logged or sent anywhere.
export const PASSWORD_MIN = 8;
export async function hashPassword(pw) {
  const salt = randomBytes(16).toString('base64url');
  const hash = await scrypt(String(pw), salt, 64);
  return `scrypt$${salt}$${hash.toString('base64url')}`;
}
export async function checkPassword(pw, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64url');
  const got = await scrypt(String(pw), salt, want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}

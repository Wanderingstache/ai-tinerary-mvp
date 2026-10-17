// Owner alerts: a short text/email to Cris when the Claude account needs attention — out of
// credits, or the API key stopped working (it has an expiry date). Without this, the first sign
// of trouble would be a client seeing "something went wrong".
//
// Where alerts go: the Railway variable ALERT_TO — one or more addresses, comma-separated. To get
// it as a TEXT, use your carrier's email-to-text address, e.g. 3035551234@vtext.com (Verizon) or
// 3035551234@tmomail.net (T-Mobile). Sent through the same Resend setup as the site's other email.
// Each kind of alert goes out at most once every 6 hours, so a busy day doesn't flood your phone.
import { sendPlainEmail, emailConfigured } from './email.js';

const ALERT_TO = (process.env.ALERT_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
const QUIET_MS = 6 * 3600 * 1000;
const lastSent = new Map();

export const alertsConfigured = () => ALERT_TO.length > 0 && emailConfigured();

const MESSAGES = {
  credits: 'ai-tinerary: your Claude API is out of credits. Itineraries can\'t be built until you add more at console.anthropic.com (Billing).',
  key: 'ai-tinerary: the Claude API key stopped working (expired or removed). Make a new key at console.anthropic.com and put it in Railway as CLAUDE_API_KEY.',
};

// Looks at an error from a Claude call and alerts if it's one Cris has to fix herself.
export function alertIfOwnerProblem(err) {
  const m = err?.message || String(err || '');
  const kind = /credit balance|billing|insufficient.*credit/i.test(m) ? 'credits'
    : /authentication|invalid x-api-key|api.key|401/i.test(m) ? 'key' : null;
  if (kind) sendAlert(kind).catch((e) => console.error('Alert failed:', e.message));
}

export async function sendAlert(kind, text = MESSAGES[kind]) {
  if (!alertsConfigured()) { console.warn(`⚠️  Owner alert not sent (set ALERT_TO in Railway): ${text}`); return false; }
  const now = Date.now();
  if (kind !== 'test' && now - (lastSent.get(kind) || 0) < QUIET_MS) return false;
  lastSent.set(kind, now);
  await Promise.all(ALERT_TO.map((to) => sendPlainEmail({ to, subject: 'ai-tinerary alert', text })));
  console.log(`📣 Owner alert sent (${kind})`);
  return true;
}

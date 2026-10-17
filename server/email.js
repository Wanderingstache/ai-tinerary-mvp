// Outgoing email, sent through Resend. Fully built but inert until RESEND_API_KEY is set in
// Railway — see README.md's "Closing the tab" section for setup.
import { appendFileSync } from 'fs';

const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const RESEND_FROM = (process.env.RESEND_FROM_EMAIL || 'ai-tinerary <onboarding@resend.dev>').trim();
// TEST ONLY: when this is set, messages are written to that file instead of being sent, so the
// sign-in flow can be tested end to end without real email. Never set this in Railway.
const DRY_RUN_FILE = (process.env.EMAIL_DRY_RUN_FILE || '').trim();

export const emailConfigured = () => !!RESEND_API_KEY || !!DRY_RUN_FILE;

const NOT_ON = "Email sending isn't turned on for this site yet — copy your trip link instead.";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NOT_MONITORED_TEXT = "(This address isn't monitored — replying here won't reach anyone.)";
const NOT_MONITORED_HTML = `<p style="color:#8a8480;font-size:13px;">${NOT_MONITORED_TEXT}</p>`;

async function sendEmail({ to, subject, text, html }) {
  if (DRY_RUN_FILE) { appendFileSync(DRY_RUN_FILE, `${JSON.stringify({ to, subject, text })}\n`); return; }
  if (!RESEND_API_KEY) throw new Error(NOT_ON);
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, text, html }),
  });
  if (!resp.ok) {
    // Surface Resend's own reason (e.g. "domain is not verified") rather than a bare status code —
    // the difference between "try again" and "fix the setup" matters, and guessing wastes time.
    const body = await resp.json().catch(() => null);
    const reason = body?.message || body?.name || '';
    throw new Error(`The email didn't go out (${resp.status}${reason ? `: ${reason}` : ''}). Try again in a moment, or just copy the link instead.`);
  }
}

export function sendTripLinkEmail({ to, destination, url }) {
  return sendEmail({
    to,
    subject: `Your ai-tinerary trip to ${destination}`,
    text: `Here's the link to your trip to ${destination}:\n\n${url}\n\nBookmark it or save this email — it's the only way back in.\n\n${NOT_MONITORED_TEXT}`,
    html: `<p>Here's the link to your trip to <strong>${esc(destination)}</strong>:</p><p><a href="${esc(url)}">${esc(url)}</a></p><p>Bookmark it or save this email — it's the only way back in.</p>${NOT_MONITORED_HTML}`,
  });
}

export function sendSignInEmail({ to, url }) {
  return sendEmail({
    to,
    subject: 'Your ai-tinerary sign-in link',
    text: `Tap this link to sign in to ai-tinerary and see your trips:\n\n${url}\n\nIt works once and expires in 15 minutes. If you didn't ask for this, you can ignore this email — nothing happens unless the link is opened.\n\n${NOT_MONITORED_TEXT}`,
    html: `<p>Tap this link to sign in to ai-tinerary and see your trips:</p><p><a href="${esc(url)}">${esc(url)}</a></p><p>It works once and expires in 15 minutes. If you didn't ask for this, you can ignore this email — nothing happens unless the link is opened.</p>${NOT_MONITORED_HTML}`,
  });
}

// Short plain-text message (owner alerts, which may land on a phone as a text).
export function sendPlainEmail({ to, subject, text }) {
  return sendEmail({ to, subject, text, html: `<p>${esc(text)}</p>` });
}

// Share Trip, Option B: "email me this link". Wrapped behind an env var the same way the Claude
// API key and the access code already are — the feature is fully built, but does nothing until
// RESEND_API_KEY is set in Railway. See README.md's "Email the trip link" section for setup.
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const RESEND_FROM = (process.env.RESEND_FROM_EMAIL || 'ai-tinerary <onboarding@resend.dev>').trim();

export const emailConfigured = () => !!RESEND_API_KEY;

export async function sendTripLinkEmail({ to, destination, url }) {
  if (!RESEND_API_KEY) throw new Error("Email sending isn't turned on for this site yet — copy your trip link instead.");
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject: `Your ai-tinerary trip to ${destination}`,
      text: `Here's the link to your trip to ${destination}:\n\n${url}\n\nBookmark it or save this email — it's the only way back in.\n\n(This address isn't monitored — replying here won't reach anyone.)`,
      html: `<p>Here's the link to your trip to <strong>${destination}</strong>:</p><p><a href="${url}">${url}</a></p><p>Bookmark it or save this email — it's the only way back in.</p><p style="color:#8a8480;font-size:13px;">(This address isn't monitored — replying here won't reach anyone.)</p>`,
    }),
  });
  if (!resp.ok) {
    // Surface Resend's own reason (e.g. "domain is not verified") rather than a bare status code
    // — the difference between "try again" and "fix the setup" matters, and guessing wastes time.
    const body = await resp.json().catch(() => null);
    const reason = body?.message || body?.name || '';
    throw new Error(`The email didn't go out (${resp.status}${reason ? `: ${reason}` : ''}). Try again in a moment, or just copy the link instead.`);
  }
}

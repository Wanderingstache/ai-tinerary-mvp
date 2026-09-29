// Verification tiers: plain code, no AI.
// Stached / Scouted / Vetted come ONLY from wander-maps.json (places you or trusted
// people have verified). Everything else is AI-ed, with a caveat.
import { readFileSync } from 'fs';

let places = [];
try {
  places = JSON.parse(readFileSync(new URL('./wander-maps.json', import.meta.url), 'utf8')).places || [];
} catch (e) {
  console.warn('wander-maps.json could not be read:', e.message);
}

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const VOICE = {
  Stached: "We've been there — and loved it. This is the real thing.",
  Scouted: 'One of our travelers discovered this and loved it. We trust their judgment.',
  Vetted: "We've checked this out directly.",
  'AI-ed': 'Based on our research, this looks like a great fit. Check reviews before booking.',
};

export function assignTier(name, destination) {
  const n = norm(name);
  const d = norm(destination).split(' ')[0];
  const match = n && places.find((p) => norm(p.name) === n && (!p.destination || norm(p.destination).includes(d) || d.includes(norm(p.destination))));
  // Order of preference: Stached → Scouted → Vetted → AI-ed
  // Stached means "we've personally been and vouch for it" — that's true whether or not it's
  // ever been written up. blog_link is optional: add it when there's a specific post to point
  // to, and the itinerary links to it; leave it out and the place still gets the Stached badge.
  if (match?.stached) return { verification_tier: 'Stached', verification_voice: VOICE.Stached, ...(match.blog_link ? { blog_link: match.blog_link } : {}) };
  if (match?.client_feedback) return { verification_tier: 'Scouted', verification_voice: VOICE.Scouted, client_feedback: match.client_feedback };
  if (match?.verification_method && (match.verified_date || Number(match.rating) >= 4.5)) {
    return { verification_tier: 'Vetted', verification_voice: VOICE.Vetted, verification_method: match.verification_method, verified_date: match.verified_date || null };
  }
  return { verification_tier: 'AI-ed', verification_voice: VOICE['AI-ed'], caveat_note: 'Not personally verified by Wandering Mustache — check recent reviews and confirm details before booking.' };
}

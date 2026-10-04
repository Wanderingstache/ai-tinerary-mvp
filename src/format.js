// Small helpers for telling trips apart in a list: when it is, how far along it is, how recently
// it was touched.
export const STAGE_LABEL = {
  basics: 'Just started', group: 'Trip details', travelers: 'Travelers', review: 'Reviewing', itinerary: 'Itinerary',
};
export const stageLabel = (t) => (t.itinerary_versions > 0 ? 'Itinerary built' : STAGE_LABEL[t.stage] || 'In progress');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// 'YYYY-MM-DD' -> 'Nov 10' (plain text, no time-zone shifting)
const md = (d) => { const [, m, day] = String(d).split('-'); return `${MONTHS[Number(m) - 1]} ${Number(day)}`; };
export function tripWhen(t) {
  if (t.start_date && t.end_date) return `${md(t.start_date)} – ${md(t.end_date)}, ${t.end_date.slice(0, 4)}`;
  return t.day_count ? `${t.day_count} day${t.day_count === 1 ? '' : 's'}, dates not set` : 'Dates not set';
}

export function ago(when) {
  const ms = Date.now() - new Date(when).getTime();
  const min = Math.floor(ms / 60000);
  if (!Number.isFinite(min) || min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 14) return `${day} days ago`;
  const d = new Date(when); return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

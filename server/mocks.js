// Fake answers used ONLY when MOCK_AI=1 (for testing without spending money).
const tiers = (a) => ({ backpacker: { low: a, high: a * 2 }, tourist: { low: a * 2, high: a * 3 }, three_star: { low: a * 3, high: a * 5 }, four_star: { low: a * 5, high: a * 8 }, five_star: { low: a * 8, high: a * 15 } });
const opt = (name) => ({ name, note: 'Test note', price_level: '€€', price_estimate: '€20', price_source: 'test', place_query: `${name}`, booking_url: 'https://example.com/tickets', booking_source: 'Official site', accessibility_note: '', dietary_note: '', loyalty_note: '' });

// Multi-city test answers: when the prompt describes a route, the fake answers carry a "city" on
// each sight / stay / day so the multi-city screens can be checked without real AI calls.
function multiMock(step, prompt) {
  const m = /Route in order: (.*?)\./.exec(prompt) || /MULTI-CITY ROUTE[\s\S]*?\n1\. ([^:]+):[\s\S]*?\n2\. ([^:]+):/.exec(prompt);
  if (!m) return null;
  const cities = m[2] ? [m[1], m[2]] : m[1].split(' → ').map((x) => x.replace(/ \(.*\)$/, ''));
  if (step === 'sights') return { sights: cities.flatMap((c, i) => [{ city: c, name: `Sight A${i}`, why: 'Test.', time_needed: '2 hours', book_ahead: false, official_site: '' }]), neighborhoods: cities.map((c, i) => ({ city: c, name: `Quarter ${i}`, character: 'Test.' })), day_trips: [], currency: 'EUR', cost_level: 'Test.', tiers: {}, notes: [] };
  if (step === 'generate') return { title: 'Test multi-city', summary: 'A test.', stay: cities.map((c) => ({ ...opt(`Hotel in ${c}`), city: c })), days: cities.map((c, i) => ({ day: i + 1, date: null, city: c, title: `Day in ${c}`, areas: [], blocks: [{ time: '9:00', title: i ? `Travel to ${c}` : 'Arrive', description: '', transport: i ? { mode: 'High-speed train', why: 'Fastest', research_note: '~2h, €40–60 pp' } : undefined, options: [opt('Cafe')] }] })), safety_notes: [], useful_phrases: [], before_you_go: [] };
  return null;
}

export function mockResponse(step, prompt = '') {
  const multi = multiMock(step, prompt);
  if (multi) return multi;
  switch (step) {
    // 'sights' now stands in for the merged Stage 1 call: sights + budget snapshot together.
    case 'sights': return { sights: [{ name: 'Colosseum', why: 'Ancient arena.', time_needed: '3 hours', book_ahead: true, official_site: 'https://parcocolosseo.it/en/' }, { name: 'Pantheon', why: 'Best-preserved temple.', time_needed: '1 hour', book_ahead: true, official_site: '' }], neighborhoods: [{ name: 'Monti', character: 'Artisan quarter.' }], day_trips: [], currency: 'EUR', cost_level: 'Moderately expensive.', tiers: { three_star: { lodging_night: '€150–220', meal: '€20–35', daily_per_person: '€160–240' } }, notes: ['City tax per night.'] };
    // 'price_stay' stands in for the merged lodging + transport pricing call.
    case 'price_stay': return { currency: 'EUR', ...(/multi-city/i.test(prompt) ? { transfers: [{ from: 'Rome', to: 'Florence', mode: 'High-speed train', duration: '1h35', price_per_person: '€25–55', notes: 'Book ahead' }] } : {}), hotels: { per_night_per_room: tiers(40), examples: [], notes: ['Test'] }, transit: { transport_per_person_per_day: tiers(3), key_prices: [], notes: [] } };
    // 'price_eat_do' stands in for the merged food + activities pricing call.
    case 'price_eat_do': return { currency: 'EUR', food: { food_per_person_per_day: tiers(15), typical: { coffee: '€1.50' }, notes: [] }, acts: { activities_per_person_per_day: tiers(5), key_prices: [{ name: 'Colosseum', price: '€18' }], free_highlights: ['Trevi Fountain'], notes: [] } };
    case 'price_context': return { season: 'Shoulder season', weather: 'Mild', crowds: 'Moderate', events: [], closures_or_warnings: [], accessibility: 'Cobblestones.', booking_advice: 'Book early.', sources: [] };
    case 'tiles': return { tiles: [{ label: 'Colosseum', why: 'Beat the crowds.' }, { label: 'Trastevere dinner', why: 'Local food.' }, { label: 'Vatican Museums', why: 'Art.' }] };
    case 'needs_access': return { verified: [{ place: 'Colosseum', fact: 'Elevator to second level.', helps: ['Ann'], source_url: 'https://example.com' }], lodging_guidance: ['Ask for a roll-in shower.'], transit_guidance: [], unverified: [], general_tips: [] };
    case 'needs_diet': return { restaurants: [{ name: 'Test GF Kitchen', area: 'Monti', serves: ['Gluten-free'], for: ['Ann'], evidence: 'AIC certified', price_level: '€€', source_url: 'https://example.com' }], allergy_card: [{ for: 'Ann', local_text: 'Sono celiaca.', english: 'I have celiac disease.' }], tips: [], unverified: [] };
    case 'review_check': return { must_dos: [{ item: 'Colosseum', for: ['Ann'], status: 'book_ahead', note: 'Timed entry.', source_url: '' }], conflicts: [{ id: 'c1', summary: 'A full-day hike conflicts with one traveler needing a step-free route.', involves: ['Ann', 'Bob'], suggested: 'split_activity', options: { together: 'Swap the hike for a gentle garden walk.', split_activity: 'Bob hikes; Ann visits the gardens.', split_day: 'Spend day 2 apart, meet for dinner.', drop: 'Skip the hike.' } }] };
    case 'generate': return { title: 'Test itinerary', summary: 'A test.', stay: [opt('Hotel Test')], days: [{ day: 1, date: null, title: 'Ancient Rome', areas: ['Colosseum'], blocks: [{ time: '8:30–12:30', title: 'Colosseum', description: 'Go early.', tags: ['Timed entry required'], who: 'Everyone', options: [opt('Colosseum')], split: [{ who: ['Bob'], title: 'Hike', description: 'Test', options: [opt('Hill trail')] }] }] }], safety_notes: [{ title: 'Pickpockets', text: 'Bus 64.' }], useful_phrases: [{ phrase: 'Il conto', meaning: 'The bill' }], before_you_go: ['Book timed entry.'] };
    case 'link_check': return { links: [{ url: 'https://example.com/tickets', verdict: 'official', better_url: '', reason: 'test' }] };
    default: return {};
  }
}

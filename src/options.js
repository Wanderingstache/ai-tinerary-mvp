// Answer choices for every intake question (from intake-spec-v2 + 2026-09-26 additions).
// Edit wording here; the form updates automatically.

export const COMPOSITION = ['Solo traveler', 'Couple', 'Family with young kids', 'Family with teens', 'Multi-generational family', 'Mature travelers', 'Group of friends', 'Mixed group', 'Other'];
export const PURPOSE = ['Celebrating a milestone', 'Recovering from burnout', 'Exploring family history', 'Adventure', 'Bucket list', 'Bonding', 'Pure exploration', 'Other'];
export const SPLIT_FREQ = ['Once a day', 'All day, meet for dinner', 'One day of the trip', 'Other'];

export const TIERS = [
  { key: 'backpacker', label: 'Backpacker', line: 'Hostels, street food, free activities' },
  { key: 'tourist', label: 'Tourist Class', line: 'Bare-bones but safe hotels, cheap eats, deal-focused activities' },
  { key: 'three_star', label: '3-Star', line: 'Mid-tier hotels, mixed dining, fair activity budget' },
  { key: 'four_star', label: '4-Star', line: 'High-end hotels, leisurely dining, generous activity budget' },
  { key: 'five_star', label: '5-Star / Luxury', line: 'Luxury all the way' },
];
export const BUDGET_INCLUDES = ['Accommodations', 'Activities', 'Dining', 'Transportation'];

export const RESEARCH_MODES = [
  { key: 'trust', label: 'I trust ai-tinerary & Claude' },
  { key: 'only_mine', label: 'Only my own trusted sites' },
  { key: 'mine_plus', label: 'My trusted sites, plus your suggestions' },
];
export const RESEARCH_SITES = {
  general: ['Rick Steves', 'Lonely Planet', 'Official tourism board'],
  accommodations: ['Google', 'Booking.com', 'Airbnb', 'Direct hotel/property site'],
  dining: ['Google Maps', 'Eater', 'Michelin Guide', "World's 50 Best", 'OpenTable', 'The Infatuation'],
  activities: ['TripAdvisor', 'Viator', 'GetYourGuide', 'Official tourism board', 'Rick Steves', 'Atlas Obscura'],
  transport: ['Google Maps / Transit', 'Official city transit', 'Seat61 (trains)', 'Rome2Rio'],
};
export const HOTEL_PROGRAMS = ['Marriott Bonvoy', 'Hilton Honors', 'Hyatt', 'IHG', 'Accor', 'Best Western', 'Choice', 'Airbnb Plus'];
export const CAR_PROGRAMS = ['Hertz', 'Avis', 'Budget', 'Enterprise', 'National'];

export const COMFORT = ['Comfort over everything', 'Comfort matters, but adventure first', 'Simple & clean', 'Unique over comfort'];
export const TRANSPORT_PREF = ['Public transit / walking', 'Rental car', 'Rideshare or taxi as needed', 'Private driver or transfers', 'Mix, no strong preference'];
export const CONCERNS = ['Logistics', 'Downtime', 'Physical, dietary & mental accommodations', 'Other'];
export const PACE = [
  { key: 'Depth-First', line: 'One place, slow exploration' },
  { key: 'Breadth-First', line: 'See as much as possible, fast-paced' },
  { key: 'Mix of Both', line: 'Some busy days, some slower ones' },
  { key: 'Go With the Flow', line: 'Explore based on what we discover' },
];
export const REST = ['Sleeping in', 'Light exploration (museums, bookstores, cafés)', 'No plans at all', 'Leisurely lunches & dinners', 'People-watching from a café', 'A park bench break', 'Returning to hotel to recharge', 'Social time with the group', 'Alone time', 'Mix of different things', 'Other'];
export const MUST_DO_CATS = ['Major landmarks', 'Local food scene', 'Museums/history', 'Nature/outdoors', 'Nightlife', 'Shopping', 'Day trips', 'Walkable neighborhoods', 'Public transport', 'Daily downtime'];
export const MUST_AVOID_CATS = ['Long travel days', 'Early mornings', 'Crowded tourist traps', 'Guided tour groups', 'Lots of walking/stairs', 'Late nights', 'Big cities', 'Rural/off-the-grid areas'];

export const AGES = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
export const STYLES = [
  { key: 'The Reminiscer', line: 'Collects stories and memories' },
  { key: 'The Immersed', line: 'Deep immersion; skips tourist spots for authenticity' },
  { key: 'Deep Diver', line: 'Energized by research, logistics, hidden gems' },
  { key: 'Contributor', line: 'Travel tied to volunteering and social impact' },
  { key: 'Foodie', line: 'Food is the main event' },
  { key: 'Reliable Rover', line: 'Predictability over adventure' },
  { key: 'Adventurer', line: 'Chases physical challenges' },
  { key: 'Bucket-Lister', line: 'Iconic sights and checklists' },
  { key: 'Thrifty Drifter', line: 'Value-seeking, deal-focused' },
  { key: 'Wellness Wanderer', line: 'Recharge and mindfulness' },
  { key: 'Luxury Connoisseur', line: 'Premium stays and curated experiences' },
];
export const DINING = ['Fine dining', 'Casual', 'Street food', 'Local haunts'];
export const INTERESTS = ['Museums', 'Hiking', 'Nightlife', 'Food', 'Wellness', 'Art', 'Shopping', 'History', 'Luxury', 'Walking tours', 'Culture'];
export const PACE_ALIGN = ['Matches the group', 'More activities / faster pace', 'More downtime / slower pace'];
export const AVOID = ['Heights', 'Water or boats', 'Enclosed spaces', 'Animals', 'Crowds', 'Early mornings', 'Late nights', 'Long walks', 'Guided tour groups'];
export const FLEXIBILITY = ['Flexible preference', 'Soft veto', 'Hard veto', 'Go with the flow'];
export const ACTIVITY_LEVEL = [
  { key: 'Minimal', line: 'Short walks, lots of sitting' },
  { key: 'Light', line: 'Around 1–3 miles a day' },
  { key: 'Moderate', line: 'Around 3–6 miles a day' },
  { key: 'High', line: 'All-day walking, hills, stairs' },
  { key: 'Varies by day', line: '' },
];
export const RHYTHM = ['Early bird', 'Night owl', 'Somewhere in between'];
export const FOOD_ADVENTURE = ['Sticks to familiar food', 'Open to trying things', 'Eats anything'];
export const SOLO_TIME = ['No', 'A little', 'Yes, regularly'];
export const OBSERVANCE = ['Sabbath observance', 'Daily prayer times', 'Modest dress', 'Religious holidays during the trip', 'Other'];
export const ALCOHOL = ['Enjoys wine/drinks', 'Occasionally', "Doesn't drink"];

export const NEEDS_TYPES = [
  { key: 'physical', label: 'Physical' },
  { key: 'neuro', label: 'Neurodivergent' },
  { key: 'health', label: 'Health' },
];
export const PHYSICAL = ['Wheelchair user', 'Limited walking distance', 'Avoid stairs', 'Needs elevator access', 'Uses cane or walker', 'Service animal', 'Low vision', 'Hard of hearing', 'Needs frequent seating', 'Heat sensitivity'];
export const NEURO = ['Noise sensitivity', 'Crowd sensitivity', 'Light sensitivity', 'Needs a predictable schedule', 'Needs advance notice of changes', 'Quiet breaks built in', 'Avoid long lines', 'Small groups over big tours', 'Transition time between activities'];
export const HEALTH = ['Altitude limits', 'Medication needs refrigeration', 'Uses oxygen', 'Pregnancy', 'Needs regular meal times', 'Limited stamina'];
export const DIET = ['Vegetarian', 'Vegan', 'Pescatarian', 'Kosher', 'Halal', 'Nut allergy', 'Shellfish allergy', 'Gluten-free / Celiac', 'Dairy-free'];
export const GLUTEN_LEVEL = ['Restaurant must have GF certification', 'Reviews mention GF options'];

export const CONFLICT_CHOICES = [
  { key: 'together', label: 'Keep everyone together (compromise)' },
  { key: 'split_activity', label: 'Split for that activity' },
  { key: 'split_day', label: 'Split for that day' },
  { key: 'drop', label: 'Drop it' },
];

export function newTraveler(i) {
  return {
    id: `t${Date.now()}${i}`, name: '', age: '', styles: [], dining: '', interests: [], interests_other: '',
    must_dos: [], pace_align: 'Matches the group', avoid: [], avoid_other: '', flexibility: '',
    activity_level: '', rhythm: '', food_adventure: '', food_dislikes: '', solo_time: '', observance: [],
    observance_other: '', alcohol: '', needs_types: [], physical: [], physical_other: '', neuro: [],
    neuro_other: '', health: [], health_other: '', diet: [], diet_other: '', gluten_level: '',
  };
}

import React from 'react';
import { Q, Tiles, Text, StepStatus } from './ui.jsx';
import {
  TIERS, BUDGET_INCLUDES, RESEARCH_MODES, RESEARCH_SITES, HOTEL_PROGRAMS, CAR_PROGRAMS, COMFORT,
  TRANSPORT_PREF, CONCERNS, PACE, REST, MUST_DO_CATS, MUST_AVOID_CATS,
} from './options.js';

const money = (cur, r) => (r ? `${cur ? cur + ' ' : ''}${Number(r.low).toLocaleString()}–${Number(r.high).toLocaleString()}` : '');
// Built the same way the finished itinerary builds its map links: a plain Google Maps search,
// never a guessed address — no AI call, so it costs nothing and can't be wrong about the URL.
const mapsUrl = (name, destination) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${destination}`)}`;

function Framing({ trip, onRun, promoted, onTogglePromote }) {
  const s = trip.research?.sights;
  const b = trip.research?.budget;
  return (
    <section className="panel">
      <h2 className="panel__title">{trip.destination} at a glance</h2>
      <StepStatus step={s} working="Gathering the sights people plan around…" onRetry={() => onRun('sights')}>
        {s?.result && (
          <div className="glance">
            <div>
              <h3>Sights</h3>
              <p className="fine">Add any of these as a must-do option for travelers to choose from in the next step.</p>
              <ul className="plain">
                {s.result.sights?.map((x) => {
                  const on = promoted.includes(x.name);
                  return (
                    <li key={x.name}>
                      <strong>{x.name}</strong>. {x.why}{x.book_ahead && <span className="chip">Book ahead</span>}
                      <span className="glance__links">
                        <a href={mapsUrl(x.name, trip.destination)} target="_blank" rel="noopener noreferrer">Map</a>
                        {/^https?:\/\//i.test(x.official_site || '') && <a href={x.official_site} target="_blank" rel="noopener noreferrer">Official site</a>}
                        <button type="button" className={`linkbtn ${on ? 'is-added' : ''}`} onClick={() => onTogglePromote(x.name)}>
                          {on ? '✓ Added as an option' : '+ Add as an option'}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3>Neighborhoods</h3>
              <ul className="plain">
                {s.result.neighborhoods?.map((x) => (
                  <li key={x.name}>
                    <strong>{x.name}</strong>. {x.character}{' '}
                    <a href={mapsUrl(x.name, trip.destination)} target="_blank" rel="noopener noreferrer">Map</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </StepStatus>
      <StepStatus step={b} working="Sketching what things cost…" onRetry={() => onRun('budget')}>
        {b?.result && (
          <p className="note">{b.result.cost_level} {b.result.notes?.join(' ')}</p>
        )}
      </StepStatus>
    </section>
  );
}

function PricingCard({ p }) {
  const cur = p.currency;
  const rows = [
    ['Lodging, per room per night', p.hotels?.per_night_per_room],
    ['Food, per person per day', p.food?.food_per_person_per_day],
    ['Activities, per person per day', p.acts?.activities_per_person_per_day],
    ['Local transport, per person per day', p.transit?.transport_per_person_per_day],
  ];
  return (
    <div className="pricing">
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Current prices</th>{TIERS.map((t) => <th scope="col" key={t.key}>{t.label}</th>)}</tr></thead>
          <tbody>
            {rows.map(([label, r]) => (
              <tr key={label}><th scope="row">{label}</th>{TIERS.map((t) => <td key={t.key}>{money(cur, r?.[t.key]) || '—'}</td>)}</tr>
            ))}
            <tr className="total"><th scope="row">Estimated daily budget, per person</th>{TIERS.map((t) => <td key={t.key}>{money(cur, p.daily_estimate?.[t.key]) || '—'}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="fine">Daily estimate assumes two people sharing a room, and one car shared by two when the transport is private. Transport assumes public transport up to 3-Star, a mix of private and public at 4-Star, and private only at 5-Star. Airfare not included.</p>
      {p.context && (
        <ul className="plain context">
          {p.context.season && <li><strong>Season:</strong> {p.context.season}</li>}
          {p.context.weather && <li><strong>Weather:</strong> {p.context.weather}</li>}
          {p.context.crowds && <li><strong>Crowds:</strong> {p.context.crowds}</li>}
          {p.context.events?.filter(Boolean).length > 0 && <li><strong>Events:</strong> {p.context.events.join('; ')}</li>}
          {p.context.closures_or_warnings?.filter(Boolean).length > 0 && <li><strong>Heads up:</strong> {p.context.closures_or_warnings.join('; ')}</li>}
          {p.context.walkability && <li><strong>Getting around:</strong> {p.context.walkability}</li>}
        </ul>
      )}
      {p.failed?.length > 0 && <p className="fine">We couldn't get current prices for: {p.failed.join(', ')}. Those will be checked again when your itinerary is built.</p>}
      <p className="fine">Pricing verified {p.verified_on} using current booking sites and attraction guides. Rates fluctuate with demand. Confirm all prices before booking, and book accommodations 4–6 weeks ahead to lock in rates.</p>
    </div>
  );
}

export default function Stage2({ trip, value: g, onChange, onRun, flags = {} }) {
  const set = (patch) => onChange({ ...g, ...patch });
  const pricing = trip.research?.pricing;
  const est = pricing?.result?.daily_estimate || {};
  const cur = pricing?.result?.currency;
  const showRest = ['Mix of Both', 'Go With the Flow'].includes(g.pace || 'Mix of Both');
  const prebooked = g.prebooked || [];
  const dates = trip.start_date ? `${trip.start_date} to ${trip.end_date}` : `${trip.day_count} days${trip.basics?.approx_month ? ', ' + trip.basics.approx_month : ''}`;

  return (
    <div className="stage">
      <Framing trip={trip} onRun={onRun} promoted={g.promoted_sights || []}
        onTogglePromote={(name) => {
          const cur = g.promoted_sights || [];
          set({ promoted_sights: cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name] });
        }} />

      <Q label="Current pricing" help={`${trip.destination} · ${dates}. See real prices before you pick a budget tier.`}>
        {!pricing && <button type="button" className="btn" onClick={() => onRun('pricing')}>Confirm & show pricing</button>}
        <StepStatus step={pricing} working="Checking current hotel, food, activity and transport prices. This takes about a minute…" onRetry={() => onRun('pricing')}>
          {pricing?.result && <PricingCard p={pricing.result} />}
        </StepStatus>
      </Q>

      <Q label="What does your budget tier cover?">
        <Tiles multi compact options={BUDGET_INCLUDES} value={g.budget_includes ?? BUDGET_INCLUDES} onChange={(v) => set({ budget_includes: v })} />
      </Q>

      <Q label="Your daily budget tier" help="A 3-Star trip to Lisbon and to Zurich feel the same, even though prices differ.">
        <Tiles options={TIERS.map((t) => ({ key: t.key, label: t.label, line: est[t.key] ? `${t.line}. About ${money(cur, est[t.key])} per person per day` : t.line }))}
          value={g.tier || 'three_star'} onChange={(v) => set({ tier: v || 'three_star' })} />
      </Q>

      <Q label="Different tier for any category?" optional>
        {['accommodations', 'dining', 'activities'].map((cat) => (
          <div key={cat} className="subq">
            <label className="check">
              <input type="checkbox" checked={!!g.category_tiers?.[cat]}
                onChange={(e) => set({ category_tiers: { ...(g.category_tiers || {}), [cat]: e.target.checked ? g.tier || 'three_star' : '' } })} />
              Set {cat} to a different tier
            </label>
            {g.category_tiers?.[cat] && (
              <Tiles compact options={TIERS.map((t) => ({ key: t.key, label: t.label }))} value={g.category_tiers[cat]}
                onChange={(v) => set({ category_tiers: { ...g.category_tiers, [cat]: v } })} />
            )}
          </div>
        ))}
      </Q>

      <Q label="How important is comfort where you stay?">
        <Tiles options={COMFORT} value={g.comfort || 'Comfort matters, but adventure first'} onChange={(v) => set({ comfort: v })} />
      </Q>

      <Q label="How do you want to get around?">
        <Tiles compact options={TRANSPORT_PREF} value={g.transport_pref || 'Mix, no strong preference'} onChange={(v) => set({ transport_pref: v })} />
      </Q>

      <Q label="How should we guide the research?">
        <Tiles options={RESEARCH_MODES} value={g.research_mode || 'trust'} onChange={(v) => set({ research_mode: v || 'trust' })} />
        {g.research_mode && g.research_mode !== 'trust' && (
          <div className="subgroup">
            {Object.entries(RESEARCH_SITES).map(([cat, sites]) => (
              <div key={cat} className="subq">
                <p className="q__help cap">{cat}</p>
                <Tiles multi compact options={sites} value={g.research_sites?.[cat]}
                  onChange={(v) => set({ research_sites: { ...(g.research_sites || {}), [cat]: v } })} />
              </div>
            ))}
            <Text value={g.research_sites_other} onChange={(v) => set({ research_sites_other: v })} maxLength={120} placeholder="Other trusted blogs or guides" />
          </div>
        )}
      </Q>

      <Q label="Loyalty programs to use?" optional info="We can't see point values, but we'll flag properties and providers in your programs.">
        <label className="check"><input type="checkbox" checked={!!g.loyalty?.hotel} onChange={(e) => set({ loyalty: { ...(g.loyalty || {}), hotel: e.target.checked } })} /> Hotel</label>
        {g.loyalty?.hotel && <Tiles multi compact options={HOTEL_PROGRAMS} value={g.loyalty.hotel_programs} onChange={(v) => set({ loyalty: { ...g.loyalty, hotel_programs: v } })} />}
        <label className="check"><input type="checkbox" checked={!!g.loyalty?.car} onChange={(e) => set({ loyalty: { ...(g.loyalty || {}), car: e.target.checked } })} /> Car rental</label>
        {g.loyalty?.car && <Tiles multi compact options={CAR_PROGRAMS} value={g.loyalty.car_programs} onChange={(v) => set({ loyalty: { ...g.loyalty, car_programs: v } })} />}
        {(g.loyalty?.hotel || g.loyalty?.car) && <Text value={g.loyalty?.other} onChange={(v) => set({ loyalty: { ...g.loyalty, other: v } })} maxLength={60} placeholder="Other program or status level" />}
      </Q>

      {(() => {
        const parts = [flags.diet && 'dietary', flags.physical && 'accessibility', flags.neuro && 'neurodivergent or sensory', flags.health && 'health'].filter(Boolean);
        const glutenOnly = !flags.diet && flags.gluten && parts.length === 0;
        if (!parts.length && !glutenOnly) return null;
        const label = glutenOnly ? 'Does anyone have a gluten allergy or celiac disease?'
          : `Are there ${[...parts, !flags.diet && flags.gluten && 'gluten'].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' or $1')} needs to consider?`;
        return (
      <Q label={label}
          help="Choosing yes adds those questions to each traveler's card in the next step.">
          <Tiles compact options={['Yes', 'No, none of these']} value={g.needs_gate === 'yes' ? 'Yes' : g.needs_gate === 'no' ? 'No, none of these' : ''}
            onChange={(v) => set({ needs_gate: v === 'Yes' ? 'yes' : v ? 'no' : '' })} />
          {g.needs_gate === 'yes' && flags.diet && (
            <>
              <p className="fine">If allergies are indicated, ai-tinerary will search for restaurants with accommodations, but cannot guarantee food safety. Always inform restaurants of allergies directly.</p>
              <p className="q__help">Do you need certified accommodations (kosher, halal{flags.gluten ? ', certified gluten-free' : ''})?</p>
              <Tiles compact options={['Yes', 'No']} value={g.certified === 'yes' ? 'Yes' : g.certified === 'no' ? 'No' : ''}
                onChange={(v) => set({ certified: v === 'Yes' ? 'yes' : v ? 'no' : '' })} />
            </>
          )}
        </Q>
        );
      })()}

      <Q label="What concerns you most about this trip?" optional>
        <Tiles multi compact options={CONCERNS} value={g.concerns} onChange={(v) => set({ concerns: v })} />
        {(g.concerns || []).includes('Other') && <Text value={g.concerns_other} onChange={(v) => set({ concerns_other: v })} maxLength={60} />}
      </Q>

      <Q label="How does the group like to experience a destination?">
        <Tiles options={PACE} value={g.pace || 'Mix of Both'} onChange={(v) => set({ pace: v || 'Mix of Both' })} />
      </Q>

      {showRest && (
        <Q label="When you need downtime, what feels refreshing?" optional>
          <Tiles multi compact options={REST} value={g.rest} onChange={(v) => set({ rest: v })} />
          {(g.rest || []).includes('Other') && <Text value={g.rest_other} onChange={(v) => set({ rest_other: v })} maxLength={60} />}
        </Q>
      )}

      <Q label="Anything already booked?" optional help="Tours, dinners, tickets. We'll build around them.">
        {prebooked.map((p, i) => (
          <div className="prebook" key={i}>
            <Text value={p.name} onChange={(v) => set({ prebooked: prebooked.map((x, j) => (j === i ? { ...x, name: v } : x)) })} placeholder="What" maxLength={60} />
            <Text type="date" value={p.date} onChange={(v) => set({ prebooked: prebooked.map((x, j) => (j === i ? { ...x, date: v } : x)) })} />
            <Text type="time" value={p.start} onChange={(v) => set({ prebooked: prebooked.map((x, j) => (j === i ? { ...x, start: v } : x)) })} aria-label="Start time" />
            <Text type="time" value={p.end} onChange={(v) => set({ prebooked: prebooked.map((x, j) => (j === i ? { ...x, end: v } : x)) })} aria-label="End time" />
            <button type="button" className="btn btn--ghost btn--small" onClick={() => set({ prebooked: prebooked.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--small" onClick={() => set({ prebooked: [...prebooked, {}] })}>Add a booking</button>
      </Q>

      <Q label="Must-do for the group" optional>
        <Tiles multi compact options={MUST_DO_CATS} value={g.must_do_cats} onChange={(v) => set({ must_do_cats: v })} />
      </Q>
      <Q label="Must-avoid for the group" optional>
        <Tiles multi compact options={MUST_AVOID_CATS} value={g.must_avoid_cats} onChange={(v) => set({ must_avoid_cats: v })} />
      </Q>

      <Q label={`Have you been to ${trip.destination} before?`} info="First-timers get the icons. Return visitors get what they missed or new areas. Former residents get a rediscovery plan or a show-someone-around plan.">
        <Tiles options={[{ key: 'first', label: 'First time' }, { key: 'before', label: 'Been before' }, { key: 'lived', label: 'Lived there' }]}
          value={g.been_before || 'first'} onChange={(v) => set({ been_before: v || 'first' })} />
        {g.been_before === 'before' && (
          <div className="subgroup">
            <Tiles compact options={['Revisit favorites', 'Explore new areas', 'Mix of both']} value={g.bb_focus} onChange={(v) => set({ bb_focus: v })} />
            {g.bb_focus === 'Mix of both' && <Tiles compact options={['Mostly favorites', 'Even split', 'Mostly new']} value={g.bb_split} onChange={(v) => set({ bb_split: v })} />}
            <Text value={g.bb_missed} onChange={(v) => set({ bb_missed: v })} maxLength={100} placeholder="One thing you didn't get to last time (optional)" />
          </div>
        )}
        {g.been_before === 'lived' && (
          <div className="subgroup">
            <Tiles compact options={['Less than a year ago', '1–3 years ago', '3+ years ago']} value={g.lived_when} onChange={(v) => set({ lived_when: v })} />
            <Tiles compact options={['Showing someone around', 'Just rediscovering', 'Both']} value={g.lived_role} onChange={(v) => set({ lived_role: v })} />
            {['Showing someone around', 'Both'].includes(g.lived_role) && (
              <Tiles compact options={['Traveling with me', 'Someone local', 'Both']} value={g.lived_who} onChange={(v) => set({ lived_who: v })} />
            )}
          </div>
        )}
      </Q>
    </div>
  );
}

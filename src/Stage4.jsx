import React from 'react';
import { StepStatus, Tiles, Text } from './ui.jsx';
import { TIERS, CONFLICT_CHOICES } from './options.js';

const STATUS_TEXT = {
  ok: 'Looks good',
  book_ahead: 'Book ahead',
  closed_or_seasonal: 'May be closed',
  date_conflict: 'Date conflict',
  unknown: "Couldn't confirm",
};

export default function Stage4({ trip, review, onChange, onRun, flags = {}, onRefresh }) {
  const set = (patch) => onChange({ ...review, ...patch });
  const check = trip.research?.review_check;
  const needs = trip.research?.needs;
  const g = trip.group_answers || {};
  const trs = trip.travelers || [];
  const removed = review.removed_mustdos || [];
  const conflicts = check?.result?.conflicts || [];
  const choices = review.conflict_choices || {};

  const flagged = trs.map((t) => {
    const parts = [
      ...((t.needs_types || []).includes('physical') ? [...(t.physical || []), t.physical_other] : []),
      ...((t.needs_types || []).includes('neuro') ? [...(t.neuro || []), t.neuro_other] : []),
      ...((t.needs_types || []).includes('health') ? [...(t.health || []), t.health_other] : []),
      ...(t.diet || []).filter((d) => (d === 'Gluten-free / Celiac' ? flags.gluten : flags.diet)), t.diet_other,
    ].filter(Boolean);
    return parts.length ? `${t.name}: ${parts.join(', ')}` : null;
  }).filter(Boolean);

  return (
    <div className="stage">
      <p className="lede">Only you see this page. Look it over, answer any questions below, then build the itinerary.</p>

      {g.intake_mode === 'self' && (
        <section className="panel">
          <h2 className="panel__title">Who's answered</h2>
          <ul className="plain">
            {trs.map((t) => (
              <li key={t.id}><strong>{t.name}</strong>: <span className={`chip ${t.status === 'done' ? 'chip--done' : ''}`}>{t.status === 'done' ? 'Done' : 'Pending'}</span></li>
            ))}
          </ul>
          {g.response_deadline && g.response_deadline < new Date().toISOString().slice(0, 10) && trs.some((t) => t.status !== 'done') && (
            <p className="note">The response deadline has passed. It's fine to build the itinerary now — anyone who hasn't answered gets an easygoing, flexible default.</p>
          )}
          {onRefresh && <button type="button" className="btn btn--ghost btn--small" onClick={onRefresh}>Check for updates</button>}
        </section>
      )}

      <section className="panel">
        <h2 className="panel__title">Your trip</h2>
        <ul className="plain">
          <li><strong>{trip.destination}</strong>, {trip.start_date ? `${trip.start_date} to ${trip.end_date}` : `${trip.day_count} days`}</li>
          <li>Budget: {TIERS.find((t) => t.key === (g.tier || 'three_star'))?.label}, pace: {g.pace || 'Mix of Both'}</li>
          {trs.map((t) => (
            <li key={t.id}><strong>{t.name}</strong>: {[...(t.why || []), t.how_spend, t.how_plan].filter(Boolean).join(', ') || 'balanced'}{t.pace_align && t.pace_align !== 'Matches the group' ? `; wants ${t.pace_align.toLowerCase()}` : ''}</li>
          ))}
        </ul>
        {flagged.length > 0 && (
          <>
            <h3>Needs we're planning around</h3>
            <ul className="plain">{flagged.map((f) => <li key={f}>{f}</li>)}</ul>
          </>
        )}
        {trs.some((t) => (t.needs_types || []).includes('physical')) && (
          <p className="note">Accessible rooms may cost more than standard rooms at this tier. We can't verify exact pricing without checking the hotel's booking page — we recommend confirming accessibility features and costs directly with the hotel before booking.</p>
        )}
      </section>

      {needs && (
        <StepStatus step={needs} working="Researching accessibility, sensory, health and dietary options…" onRetry={() => onRun('needs')}>
          {needs.result && !needs.result.skipped && (
            <p className="status status--done">Accommodation research is done{needs.result.access?.error || needs.result.diet?.error ? ', with one part that failed. The itinerary will still be built; check those details before booking.' : '.'}</p>
          )}
        </StepStatus>
      )}

      <section className="panel">
        <h2 className="panel__title">Must-do check</h2>
        <StepStatus step={check} working="Checking must-dos for closures and conflicts…" onRetry={() => onRun('review_check')}>
          {check?.result && (
            <ul className="checks">
              {(check.result.must_dos || []).map((m) => {
                const off = removed.includes(m.item);
                return (
                  <li key={m.item} className={`checks__item is-${m.status} ${off ? 'is-off' : ''}`}>
                    <div>
                      <strong>{m.item}</strong> <span className="chip">{STATUS_TEXT[m.status] || m.status}</span>
                      {m.note && <p className="fine">{m.note} {m.source_url && <a href={m.source_url} target="_blank" rel="noreferrer">Source</a>}</p>}
                    </div>
                    {m.status !== 'ok' && (
                      <button type="button" className="linkbtn"
                        onClick={() => set({ removed_mustdos: off ? removed.filter((x) => x !== m.item) : [...removed, m.item] })}>
                        {off ? 'Keep it' : 'Remove it'}
                      </button>
                    )}
                  </li>
                );
              })}
              {!(check.result.must_dos || []).length && <li className="fine">No must-dos were listed.</li>}
            </ul>
          )}
        </StepStatus>
      </section>

      {conflicts.length > 0 && (
        <section className="panel panel--ask">
          <h2 className="panel__title">We need your call</h2>
          <p className="q__help">These preferences pull in different directions, and side-by-side options won't cover them. Choose how to handle each one.</p>
          {conflicts.map((c) => (
            <div key={c.id} className="conflict">
              <p><strong>{c.summary}</strong></p>
              <Tiles options={CONFLICT_CHOICES.map((o) => ({ key: o.key, label: o.label, line: c.options?.[o.key] || '' }))}
                value={choices[c.id]?.choice} onChange={(v) => set({ conflict_choices: { ...choices, [c.id]: { ...(choices[c.id] || {}), choice: v } } })} />
              <Text value={choices[c.id]?.note} maxLength={120} placeholder="Anything else we should know? (optional)"
                onChange={(v) => set({ conflict_choices: { ...choices, [c.id]: { ...(choices[c.id] || {}), note: v } } })} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function stage4Ready(trip, review) {
  const check = trip.research?.review_check;
  const needs = trip.research?.needs;
  if (!check || check.status === 'running') return 'Waiting for the must-do check…';
  if (needs?.status === 'running') return 'Waiting for accommodation research…';
  const conflicts = check.result?.conflicts || [];
  const missing = conflicts.filter((c) => !review.conflict_choices?.[c.id]?.choice);
  if (missing.length) return `Choose how to handle ${missing.length === 1 ? 'the conflict' : `${missing.length} conflicts`} above.`;
  return null;
}

import React from 'react';
import { Q, Tiles, Text } from './ui.jsx';
import { COMPOSITION, PURPOSE, SPLIT_FREQ } from './options.js';

// Stage 1 · Trip basics. Used on the start page and when editing later.
export default function Stage1({ value: b, onChange }) {
  const set = (patch) => onChange({ ...b, ...patch });
  const count = Number(b.traveler_count) || 1;

  return (
    <div className="stage">
      <Q label="Your name">
        <Text value={b.organizer_name} onChange={(v) => set({ organizer_name: v })} placeholder="The trip organizer" maxLength={60} />
      </Q>

      <Q label="Where are you going?" help="One destination for now. Multi-city trips are coming in a later version.">
        <Text value={b.destination} onChange={(v) => set({ destination: v })} placeholder="City and country, e.g. Rome, Italy" maxLength={80} />
      </Q>

      <Q label="When are you going?">
        <Tiles compact options={[{ key: 'dates', label: 'I have dates' }, { key: 'days', label: 'Not sure yet' }]}
          value={b.date_mode || 'dates'} onChange={(v) => set({ date_mode: v || 'dates' })} />
        {(b.date_mode || 'dates') === 'dates' ? (
          <div className="row">
            <label className="mini">Arrive<Text type="date" value={b.start_date} onChange={(v) => set({ start_date: v })} /></label>
            <label className="mini">Leave<Text type="date" value={b.end_date} min={b.start_date} onChange={(v) => set({ end_date: v })} /></label>
          </div>
        ) : (
          <div className="row">
            <label className="mini">How many days?<Text type="number" min={1} max={30} value={b.day_count} onChange={(v) => set({ day_count: v })} placeholder="3" /></label>
            <label className="mini">Roughly when?<Text value={b.approx_month} onChange={(v) => set({ approx_month: v })} placeholder="e.g. May, or spring" maxLength={30} /></label>
          </div>
        )}
      </Q>

      <Q label="How many people are traveling?">
        <Tiles compact options={['1', '2', '3', '4', '5+']}
          value={count >= 5 ? '5+' : String(count)}
          onChange={(v) => set({ traveler_count: v === '5+' ? Math.max(5, count) : Number(v || 1) })} />
        {count >= 5 && (
          <label className="mini">Exact number<Text type="number" min={5} max={20} value={count} onChange={(v) => set({ traveler_count: Math.max(5, Math.min(20, Number(v) || 5)) })} /></label>
        )}
      </Q>

      <Q label="What best describes your group?">
        <Tiles options={COMPOSITION} value={b.composition} onChange={(v) => set({ composition: v })} />
        {b.composition === 'Other' && <Text value={b.composition_other} onChange={(v) => set({ composition_other: v })} maxLength={50} placeholder="Describe your group" />}
      </Q>

      <Q label="What's the occasion or purpose?" help="Pick any that fit."
        info="It shapes the whole plan. A trip for recovering from burnout gets lighter pacing; a family-history trip gets time for archives, villages, or cemeteries.">
        <Tiles multi options={PURPOSE} value={b.purpose} onChange={(v) => set({ purpose: v })} />
        {(b.purpose || []).includes('Other') && <Text value={b.purpose_other} onChange={(v) => set({ purpose_other: v })} maxLength={60} placeholder="Tell us the occasion" />}
      </Q>

      <Q label="Is there a special occasion during the trip?" help="A birthday or anniversary, for example. We'll plan a moment around it." optional>
        <Tiles compact options={['No', 'Yes']} value={b.occasion?.has ? 'Yes' : b.occasion ? 'No' : ''}
          onChange={(v) => set({ occasion: { ...(b.occasion || {}), has: v === 'Yes' } })} />
        {b.occasion?.has && (
          <div className="row">
            <label className="mini grow">What is it?<Text value={b.occasion.what} onChange={(v) => set({ occasion: { ...b.occasion, what: v } })} maxLength={60} placeholder="e.g. Mom's 70th birthday" /></label>
            <label className="mini">Date<Text type="date" value={b.occasion.date} onChange={(v) => set({ occasion: { ...b.occasion, date: v } })} /></label>
          </div>
        )}
      </Q>

      {count > 1 && (
        <Q label="How does the group like to experience a place?"
          info="We always plan one shared itinerary. If splitting up is OK, we can offer side-by-side options when people want different things. If there's a real conflict, we'll ask you how to handle it before building anything.">
          <Tiles options={[{ key: 'together', label: 'Stay together', line: 'Shared itinerary' }, { key: 'split', label: 'OK to split up', line: 'Breakout activities allowed' }]}
            value={b.group_dynamic} onChange={(v) => set({ group_dynamic: v })} />
          {b.group_dynamic === 'split' && (
            <>
              <p className="q__help">How often?</p>
              <Tiles compact options={SPLIT_FREQ} value={b.split_freq} onChange={(v) => set({ split_freq: v })} />
              {b.split_freq === 'Other' && <Text value={b.split_other} onChange={(v) => set({ split_other: v })} maxLength={80} />}
            </>
          )}
        </Q>
      )}
    </div>
  );
}

export function stage1Problem(b) {
  if (!(b.destination || '').trim()) return 'Enter a destination.';
  if ((b.date_mode || 'dates') === 'dates') {
    if (!b.start_date || !b.end_date) return 'Add your arrival and departure dates, or choose "Not sure yet".';
    if (b.end_date < b.start_date) return 'The leave date is before the arrive date.';
  }
  return null;
}

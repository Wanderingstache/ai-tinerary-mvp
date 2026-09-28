import React, { useState } from 'react';
import { Q, Tiles, Text, StepStatus } from './ui.jsx';
import {
  AGES, STYLES, DINING, INTERESTS, PACE_ALIGN, AVOID, FLEXIBILITY, ACTIVITY_LEVEL, RHYTHM, FOOD_ADVENTURE,
  SOLO_TIME, OBSERVANCE, ALCOHOL, NEEDS_TYPES, PHYSICAL, NEURO, HEALTH, DIET, GLUTEN_LEVEL,
} from './options.js';

function MustDos({ value = [], onChange, tiles }) {
  const [custom, setCustom] = useState('');
  const has = (label) => value.some((m) => m.label === label);
  const toggle = (label) => onChange(has(label) ? value.filter((m) => m.label !== label) : [...value, { label, priority: 'must' }]);
  const add = () => { const l = custom.trim(); if (l && !has(l)) onChange([...value, { label: l, priority: 'must' }]); setCustom(''); };
  return (
    <>
      <Tiles multi compact options={tiles} value={value.map((m) => m.label)} onChange={(labels) => {
        const next = labels.filter((l) => !has(l));
        const kept = value.filter((m) => labels.includes(m.label) || !tiles.includes(m.label));
        onChange([...kept, ...next.map((l) => ({ label: l, priority: 'must' }))]);
      }} />
      <div className="row">
        <Text value={custom} onChange={setCustom} maxLength={80} placeholder="Add your own"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="btn btn--ghost btn--small" onClick={add}>Add</button>
      </div>
      {value.length > 0 && (
        <ul className="mustlist">
          {value.map((m) => (
            <li key={m.label}>
              <span>{m.label}</span>
              <Tiles compact options={[{ key: 'must', label: 'Must have' }, { key: 'nice', label: 'Nice to have' }]} value={m.priority}
                onChange={(p) => onChange(value.map((x) => (x.label === m.label ? { ...x, priority: p || 'must' } : x)))} />
              <button type="button" className="linkbtn" onClick={() => toggle(m.label)} aria-label={`Remove ${m.label}`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Card({ t, i, set, needsOn, tiles, skipDetails, onCopyPrev, flags }) {
  const needTypeOptions = NEEDS_TYPES.filter((n) => flags[n.key]);
  const dietOptions = DIET.filter((d) => flags.gluten || d !== 'Gluten-free / Celiac');
  const who = t.name || (i === 0 ? 'you' : `traveler ${i + 1}`);
  return (
    <div className="card-body">
      <div className="row">
        <label className="mini grow">Name<Text value={t.name} onChange={(v) => set({ name: v })} maxLength={40} placeholder={i === 0 ? 'Your name' : 'Their name'} /></label>
      </div>
      <Q label="Age range"><Tiles compact options={AGES} value={t.age} onChange={(v) => set({ age: v })} /></Q>
      {i > 0 && !skipDetails && (
        <button type="button" className="btn btn--ghost btn--small" onClick={onCopyPrev}>Same answers as previous traveler</button>
      )}
      {!skipDetails && (
        <>
          <Q label={`How does ${who} like to travel?`} help={<>Pick up to 3. Don't know yet?{' '}<a href="https://wanderingmustache.com/traveler-types" target="_blank" rel="noopener noreferrer">Take the Wandering Mustache travel style quiz<span className="sr"> (opens in a new tab)</span></a> and come back.</>}>
            <Tiles multi max={3} options={STYLES} value={t.styles} onChange={(v) => set({ styles: v })} />
          </Q>
          <Q label="Must-dos on this trip" optional>
            <StepStatus step={tiles.step} working="Finding ideas for this destination…" onRetry={tiles.retry} />
            <MustDos value={t.must_dos} onChange={(v) => set({ must_dos: v })} tiles={tiles.list} />
          </Q>
          <Q label="Pace compared with the group">
            <Tiles compact options={PACE_ALIGN} value={t.pace_align || 'Matches the group'} onChange={(v) => set({ pace_align: v || 'Matches the group' })} />
          </Q>
          <Q label="Daily walking and activity"><Tiles options={ACTIVITY_LEVEL} value={t.activity_level} onChange={(v) => set({ activity_level: v })} /></Q>
          <Q label="Early bird or night owl?" optional><Tiles compact options={RHYTHM} value={t.rhythm} onChange={(v) => set({ rhythm: v })} /></Q>
          <Q label="Anything to avoid?" optional>
            <Tiles multi compact options={AVOID} value={t.avoid} onChange={(v) => set({ avoid: v })} />
            <Text value={t.avoid_other} onChange={(v) => set({ avoid_other: v })} maxLength={80} placeholder="Something else" />
          </Q>
          <Q label="If the group wants something different…" optional>
            <Tiles compact options={FLEXIBILITY} value={t.flexibility} onChange={(v) => set({ flexibility: v })} />
          </Q>
          <Q label="Wants some solo time?" optional><Tiles compact options={SOLO_TIME} value={t.solo_time} onChange={(v) => set({ solo_time: v })} /></Q>
          <Q label="Interests" optional>
            <Tiles multi compact options={INTERESTS} value={t.interests} onChange={(v) => set({ interests: v })} />
          </Q>
          <Q label="Dining style" optional><Tiles compact options={DINING} value={t.dining} onChange={(v) => set({ dining: v })} /></Q>
          <Q label="How adventurous with food?" optional>
            <Tiles compact options={FOOD_ADVENTURE} value={t.food_adventure} onChange={(v) => set({ food_adventure: v })} />
            <Text value={t.food_dislikes} onChange={(v) => set({ food_dislikes: v })} maxLength={80} placeholder="Foods they dislike (not allergies)" />
          </Q>
          <Q label="Alcohol" optional><Tiles compact options={ALCOHOL} value={t.alcohol} onChange={(v) => set({ alcohol: v })} /></Q>
          <Q label="Religious or cultural observance" optional help="Only if it affects scheduling or dress.">
            <Tiles multi compact options={OBSERVANCE} value={t.observance} onChange={(v) => set({ observance: v })} />
            {(t.observance || []).includes('Other') && <Text value={t.observance_other} onChange={(v) => set({ observance_other: v })} maxLength={80} />}
          </Q>
        </>
      )}

      {needsOn && (
        <div className="needs">
          {needTypeOptions.length > 0 && (
            <Q label="Accommodation needs" optional
              help="Kept private to you. The shared itinerary describes arrangements (like a step-free route), never who needs them or why.">
              <Tiles multi compact options={needTypeOptions} value={t.needs_types} onChange={(v) => set({ needs_types: v })} />
              {flags.physical && (t.needs_types || []).includes('physical') && (
                <div className="subgroup"><p className="q__help">Physical</p>
                  <Tiles multi compact options={PHYSICAL} value={t.physical} onChange={(v) => set({ physical: v })} />
                  <Text value={t.physical_other} onChange={(v) => set({ physical_other: v })} maxLength={120} placeholder="Anything else" />
                </div>
              )}
              {flags.neuro && (t.needs_types || []).includes('neuro') && (
                <div className="subgroup"><p className="q__help">Neurodivergent</p>
                  <Tiles multi compact options={NEURO} value={t.neuro} onChange={(v) => set({ neuro: v })} />
                  <Text value={t.neuro_other} onChange={(v) => set({ neuro_other: v })} maxLength={120} placeholder="Anything else" />
                </div>
              )}
              {flags.health && (t.needs_types || []).includes('health') && (
                <div className="subgroup"><p className="q__help">Health</p>
                  <Tiles multi compact options={HEALTH} value={t.health} onChange={(v) => set({ health: v })} />
                  <Text value={t.health_other} onChange={(v) => set({ health_other: v })} maxLength={120} placeholder="Anything else" />
                </div>
              )}
            </Q>
          )}
          {flags.diet ? (
            <Q label="Dietary needs and allergies" optional>
              <Tiles multi compact options={dietOptions} value={t.diet} onChange={(v) => set({ diet: v })} />
              {flags.gluten && (t.diet || []).includes('Gluten-free / Celiac') && (
                <Tiles compact options={GLUTEN_LEVEL} value={t.gluten_level} onChange={(v) => set({ gluten_level: v })} />
              )}
              <Text value={t.diet_other} onChange={(v) => set({ diet_other: v })} maxLength={80} placeholder="Other" />
            </Q>
          ) : flags.gluten && (
            // Beta asks about gluten on its own rather than the full dietary list — a clear,
            // common need the model can act on reliably. Still stored in t.diet so nothing else
            // has to change when the full list comes back later.
            <Q label="Gluten allergy or celiac disease?" optional>
              <Tiles compact options={['Yes', 'No']}
                value={(t.diet || []).includes('Gluten-free / Celiac') ? 'Yes' : t.gluten_answered ? 'No' : ''}
                onChange={(v) => set({
                  gluten_answered: true,
                  diet: v === 'Yes' ? [...(t.diet || []).filter((d) => d !== 'Gluten-free / Celiac'), 'Gluten-free / Celiac'] : (t.diet || []).filter((d) => d !== 'Gluten-free / Celiac'),
                })} />
              {(t.diet || []).includes('Gluten-free / Celiac') && (
                <Tiles compact options={GLUTEN_LEVEL} value={t.gluten_level} onChange={(v) => set({ gluten_level: v })} />
              )}
            </Q>
          )}
        </div>
      )}
    </div>
  );
}

export default function Stage3({ trip, travelers, onChange, onRun, skipDetails, setSkipDetails, flags = {} }) {
  const [open, setOpen] = useState(0);
  const anyNeedsOffered = flags.diet || flags.gluten || flags.physical || flags.neuro || flags.health;
  const needsOn = trip.group_answers?.needs_gate === 'yes' && anyNeedsOffered;
  const tilesStep = trip.research?.tiles;
  const missed = trip.group_answers?.been_before === 'before' && trip.group_answers?.bb_missed;
  const tileList = [...(missed ? [missed] : []), ...(tilesStep?.result?.tiles || []).map((x) => x.label)];
  const tiles = { step: tilesStep, list: tileList, retry: () => onRun('tiles') };

  const setT = (i, patch) => onChange(travelers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const copyPrev = (i) => {
    const { id, name, age, ...rest } = travelers[i - 1];
    setT(i, JSON.parse(JSON.stringify(rest)));
  };

  return (
    <div className="stage">
      <p className="lede">Fill in a card for each person. You're answering for everyone, so check with each traveler before you finish, especially about health and access needs.</p>
      <label className="check">
        <input type="checkbox" checked={skipDetails} onChange={(e) => setSkipDetails(e.target.checked)} />
        Skip the details. ai-tinerary will design a balanced itinerary for everyone.
      </label>

      {travelers.map((t, i) => (
        <section key={t.id} className={`card ${open === i ? 'is-open' : ''}`}>
          <button type="button" className="card-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span className="card-head__num">{i + 1}</span>
            <span className="card-head__name">{t.name || (i === 0 ? 'You' : `Traveler ${i + 1}`)}</span>
            <span className="card-head__meta">{[t.age, ...(t.styles || [])].filter(Boolean).join(', ')}</span>
          </button>
          {open === i && (
            <Card t={t} i={i} set={(p) => setT(i, p)} needsOn={needsOn} tiles={tiles} skipDetails={skipDetails} onCopyPrev={() => copyPrev(i)} flags={flags} />
          )}
        </section>
      ))}
    </div>
  );
}

import React, { useState } from 'react';
import { Q, Tiles, Text, StepStatus } from './ui.jsx';
import { link } from './router.js';
import { api } from './api.js';
import {
  AGES, WHY_TYPES, HOW_BUDGET, HOW_PLAN, DINING, INTERESTS, PACE_ALIGN, AVOID, FLEXIBILITY, ACTIVITY_LEVEL, RHYTHM, FOOD_ADVENTURE,
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

// Shared with the Share Trip invite page (InviteFlow.jsx), which uses it to show one traveler's
// own card without any of the organizer's other controls around it.
export function Card({ t, i, set, needsOn, tiles, skipDetails, onCopyPrev, flags }) {
  const needTypeOptions = NEEDS_TYPES.filter((n) => flags[n.key]);
  const dietOptions = DIET.filter((d) => flags.gluten || d !== 'Gluten-free / Celiac');
  const who = t.name || (i === 0 ? 'you' : `traveler ${i + 1}`);
  const doVerb = who === 'you' ? 'do' : 'does';
  const beVerb = who === 'you' ? 'are' : 'is';
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
          <Q label={`Why ${doVerb} ${who} travel?`} help={<>Pick up to 2 — the one that matters most, and one more if it's close. Don't know yet?{' '}<a href="https://wanderingmustache.com/traveler-types" target="_blank" rel="noopener noreferrer">Take the Wandering Mustache travel style quiz<span className="sr"> (opens in a new tab)</span></a> and come back.</>}>
            <Tiles multi max={2} options={WHY_TYPES} value={t.why} onChange={(v) => set({ why: v })} />
          </Q>
          <Q label={`When it comes to spending on a trip, ${who} ${beVerb}\u2026`}>
            <Tiles options={HOW_BUDGET} value={t.how_spend} onChange={(v) => set({ how_spend: v || '' })} />
          </Q>
          <Q label={`When it comes to planning a trip, ${who} ${beVerb}\u2026`}>
            <Tiles options={HOW_PLAN} value={t.how_plan} onChange={(v) => set({ how_plan: v || '' })} />
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

// A small, collapsed-by-default "email this link" control for one traveler's row. Mirrors the
// organizer's own EmailLink widget in App.jsx, scoped to a single traveler's invite link instead.
function RosterEmailLink({ tripId, travelerId }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'
  const [msg, setMsg] = useState('');
  const send = async () => {
    setStatus('sending'); setMsg('');
    try { await api.emailTravelerLink(tripId, travelerId, email); setStatus('sent'); } catch (e) { setStatus('error'); setMsg(e.message); }
  };
  if (!open) return <button type="button" className="linkbtn" onClick={() => setOpen(true)}>Email</button>;
  if (status === 'sent') return <span className="fine">Sent to {email}</span>;
  return (
    <span className="roster__email">
      <input className="input" type="email" placeholder="their email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="button" className="btn btn--ghost btn--small" onClick={send} disabled={status === 'sending' || !email.trim()}>{status === 'sending' ? 'Sending…' : 'Send'}</button>
      {status === 'error' && <span className="status status--error">{msg}</span>}
    </span>
  );
}

// Share Trip: one row per traveler, a copyable link once they have one, and whether they've
// answered yet. No access to anyone's answers from here — that's the whole point of the mode.
function Roster({ trip, travelers, onNameChange, onGroupPatch, onSaveRoster, onRefresh, busy, emailEnabled }) {
  const deadline = trip.group_answers?.response_deadline || '';
  const today = new Date().toISOString().slice(0, 10);
  const deadlinePassed = deadline && deadline < today;
  const pendingCount = travelers.filter((t) => t.status !== 'done').length;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const [copiedId, setCopiedId] = useState('');
  const copy = async (t) => {
    const url = `${origin}${link(`/invite/${t.invite_token}`)}`;
    try { await navigator.clipboard.writeText(url); setCopiedId(t.id); setTimeout(() => setCopiedId(''), 2000); } catch { /* clipboard unavailable */ }
  };
  return (
    <>
      <p className="lede">Each traveler gets their own link to answer for themselves — text it, email it, however's easiest. You'll see who's answered as they do.</p>
      <Q label="Response deadline" optional
        help="Once this passes, it's fine to build the itinerary even if someone hasn't answered — they'll get an easygoing, flexible default. This never builds anything on its own; you still click Build when you're ready.">
        <Text type="date" value={deadline} onChange={(v) => onGroupPatch({ response_deadline: v })} />
        {deadlinePassed && pendingCount > 0 && <p className="note">The deadline has passed, with {pendingCount} {pendingCount === 1 ? 'person' : 'people'} still to answer. You can go ahead whenever you're ready.</p>}
      </Q>
      <div className="roster">
        {travelers.map((t, i) => (
          <div className="roster__row" key={t.id}>
            <Text value={t.name} onChange={(v) => onNameChange(i, v)} maxLength={40} placeholder={`Traveler ${i + 1}`} />
            <span className={`chip ${t.status === 'done' ? 'chip--done' : ''}`}>{t.status === 'done' ? 'Done' : 'Pending'}</span>
            {t.invite_token ? (
              <>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => copy(t)}>{copiedId === t.id ? 'Copied!' : 'Copy link'}</button>
                {emailEnabled && <RosterEmailLink tripId={trip.id} travelerId={t.id} />}
              </>
            ) : <span className="fine">Save to create a link</span>}
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={onSaveRoster} disabled={busy}>{busy ? 'Saving…' : 'Save names & create links'}</button>
        <button type="button" className="btn btn--ghost" onClick={onRefresh}>Check for updates</button>
      </div>
    </>
  );
}

export default function Stage3({ trip, travelers, onChange, onRun, skipDetails, setSkipDetails, flags = {}, onGroupPatch, onSaveRoster, onRefresh, busy, emailEnabled }) {
  const [open, setOpen] = useState(0);
  const anyNeedsOffered = flags.diet || flags.gluten || flags.physical || flags.neuro || flags.health;
  const needsOn = trip.group_answers?.needs_gate === 'yes' && anyNeedsOffered;
  const tilesStep = trip.research?.tiles;
  const missed = trip.group_answers?.been_before === 'before' && trip.group_answers?.bb_missed;
  // Sights the organizer promoted from the "at a glance" panel on the previous step join the same
  // pool every traveler picks must-dos from, alongside the destination-specific suggestions.
  const promotedSights = trip.group_answers?.promoted_sights || [];
  const tileList = [...new Set([...(missed ? [missed] : []), ...promotedSights, ...(tilesStep?.result?.tiles || []).map((x) => x.label)])];
  const tiles = { step: tilesStep, list: tileList, retry: () => onRun('tiles') };

  const setT = (i, patch) => onChange(travelers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const copyPrev = (i) => {
    const { id, name, age, ...rest } = travelers[i - 1];
    setT(i, JSON.parse(JSON.stringify(rest)));
  };

  const mode = trip.group_answers?.intake_mode || 'organizer';
  const modeToggle = travelers.length > 1 && (
    <Q label="Who answers the questions?">
      <Tiles compact options={[{ key: 'organizer', label: "I'll answer for everyone" }, { key: 'self', label: 'Let each person answer for themselves' }]}
        value={mode} onChange={(v) => onGroupPatch({ intake_mode: v || 'organizer' })} />
    </Q>
  );

  if (mode === 'self' && travelers.length > 1) {
    return (
      <div className="stage">
        {modeToggle}
        <Roster trip={trip} travelers={travelers} onNameChange={(i, v) => setT(i, { name: v })}
          onGroupPatch={onGroupPatch} onSaveRoster={onSaveRoster} onRefresh={onRefresh} busy={busy} emailEnabled={emailEnabled} />
      </div>
    );
  }

  return (
    <div className="stage">
      {modeToggle}
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
            <span className="card-head__meta">{[t.age, ...(t.why || []), t.how_spend, t.how_plan].filter(Boolean).join(', ')}</span>
          </button>
          {open === i && (
            <Card t={t} i={i} set={(p) => setT(i, p)} needsOn={needsOn} tiles={tiles} skipDetails={skipDetails} onCopyPrev={() => copyPrev(i)} flags={flags} />
          )}
        </section>
      ))}
    </div>
  );
}

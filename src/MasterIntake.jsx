import React from 'react';
import { Q, Tiles, Text } from './ui.jsx';
import { AGES, WHY_TYPES, HOW_BUDGET, HOW_PLAN, DINING, INTERESTS, PACE_ALIGN, AVOID, ACTIVITY_LEVEL, RHYTHM, FOOD_ADVENTURE, GLUTEN_LEVEL, newTraveler } from './options.js';

// Master intake: one form for the whole group, for an organizer who doesn't want to fill in a
// separate card for every person. The organizer ticks which per-person details to add, if any:
// name, age, pace, travel style. Ticking nothing means headcount only. Even a ticked detail can be
// left blank for any traveler. Everything below the roster is answered once and applies to everyone. Nothing per-traveler is
// required. On "Review" the master form is turned into ordinary traveler records (expandMaster),
// so the rest of the app and the AI steps work exactly as they do for per-traveler cards.
// The form itself is kept in group_answers.master so it can be edited again later.

export const DETAIL_FIELDS = [
  { key: 'name', label: 'Names' },
  { key: 'age', label: 'Ages' },
  { key: 'pace', label: 'Pace' },
  { key: 'style', label: 'Travel style' },
];

// Older saved forms used one detail level; translate them to the ticked fields.
function fieldsOf(m) {
  if (Array.isArray(m.fields)) return m.fields;
  if (m.detail === 'names') return ['name', 'age'];
  if (m.detail === 'full') return ['name', 'age', 'pace', 'style'];
  return [];
}

const GLUTEN = 'Gluten-free / Celiac';

export function emptyMaster() {
  return { fields: [], rows: [], shared: { must_dos: [] }, gluten_count: '', gluten_level: '' };
}

function rowsFor(master, count) {
  const rows = master.rows || [];
  return Array.from({ length: count }, (_, i) => rows[i] || {});
}

export default function MasterIntake({ master: m0, onChange, count, glutenOn, organizerName }) {
  const m = { ...emptyMaster(), ...(m0 || {}) };
  const set = (patch) => onChange({ ...m, ...patch });
  const sh = m.shared || {};
  const setSh = (patch) => set({ shared: { ...sh, ...patch } });
  const rows = rowsFor(m, count);
  const setRow = (i, patch) => set({ rows: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const fields = fieldsOf(m);
  const has = (f) => fields.includes(f);
  const detailed = fields.length > 0 || (glutenOn && m.gluten_by_person);

  return (
    <>
      <p className="lede">One form for the whole group of {count}. Answer once and it applies to everyone. Nothing about each person is required.</p>

      <Q label="Add any details about each person?" optional help="Pick none, some, or all. You can still leave any of them blank.">
        <Tiles multi compact options={DETAIL_FIELDS} value={fields} onChange={(v) => set({ fields: v, detail: undefined })} />
      </Q>

      {detailed && (
        <div className="q">
          <div className="q__label">The travelers <span className="q__optional">(all optional)</span></div>
          <div className="master-rows">
            {rows.map((r, i) => (
              <div className="master-row" key={i}>
                <span className="card-head__num">{i + 1}</span>
                <div className="master-row__fields">
                  {(has('name') || has('age')) && <div className="row">
                    {has('name') && <label className="mini grow">Name
                      <Text value={r.name} onChange={(v) => setRow(i, { name: v })} maxLength={40}
                        placeholder={i === 0 && organizerName ? organizerName : `Traveler ${i + 1}`} />
                    </label>}
                    {has('age') && <label className="mini">Age
                      <select className="input" value={r.age || ''} onChange={(e) => setRow(i, { age: e.target.value })}>
                        <option value="">—</option>
                        {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </label>}
                  </div>}
                  {(has('pace') || has('style')) && (
                    <div className="row">
                      {has('pace') && <label className="mini grow">Pace
                        <select className="input" value={r.pace_align || ''} onChange={(e) => setRow(i, { pace_align: e.target.value })}>
                          <option value="">Matches the group</option>
                          {PACE_ALIGN.filter((p) => p !== 'Matches the group').map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>}
                      {has('style') && <label className="mini grow">Travel style
                        <select className="input" value={r.why || ''} onChange={(e) => setRow(i, { why: e.target.value })}>
                          <option value="">Same as the group</option>
                          {WHY_TYPES.map((w) => <option key={w.key} value={w.key}>{w.key}</option>)}
                        </select>
                      </label>}
                    </div>
                  )}
                  {glutenOn && m.gluten_by_person && (
                    <label className="check"><input type="checkbox" checked={!!r.gluten} onChange={(e) => setRow(i, { gluten: e.target.checked })} /> Gluten allergy or celiac</label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="panel__title">For the whole group</h2>
      <Q label="Why does this group travel?" optional help="Pick up to 2.">
        <Tiles multi max={2} options={WHY_TYPES} value={sh.why} onChange={(v) => setSh({ why: v })} />
      </Q>
      <Q label="When it comes to spending, the group is…" optional>
        <Tiles options={HOW_BUDGET} value={sh.how_spend} onChange={(v) => setSh({ how_spend: v || '' })} />
      </Q>
      <Q label="When it comes to planning, the group is…" optional>
        <Tiles options={HOW_PLAN} value={sh.how_plan} onChange={(v) => setSh({ how_plan: v || '' })} />
      </Q>
      <Q label="Daily walking and activity" optional>
        <Tiles options={ACTIVITY_LEVEL} value={sh.activity_level} onChange={(v) => setSh({ activity_level: v })} />
      </Q>
      <Q label="Early birds or night owls?" optional>
        <Tiles compact options={RHYTHM} value={sh.rhythm} onChange={(v) => setSh({ rhythm: v })} />
      </Q>
      <Q label="Interests" optional>
        <Tiles multi compact options={INTERESTS} value={sh.interests} onChange={(v) => setSh({ interests: v })} />
      </Q>
      <Q label="Dining style" optional>
        <Tiles compact options={DINING} value={sh.dining} onChange={(v) => setSh({ dining: v })} />
      </Q>
      <Q label="How adventurous with food?" optional>
        <Tiles compact options={FOOD_ADVENTURE} value={sh.food_adventure} onChange={(v) => setSh({ food_adventure: v })} />
      </Q>
      <Q label="Anything to avoid?" optional>
        <Tiles multi compact options={AVOID} value={sh.avoid} onChange={(v) => setSh({ avoid: v })} />
      </Q>

      {glutenOn && (
        <Q label="Gluten allergy or celiac disease in the group?" optional>
          <Tiles compact options={[{ key: 'count', label: 'Just tell you how many' }, { key: 'person', label: 'Mark who' }]}
            value={m.gluten_by_person ? 'person' : 'count'} onChange={(v) => set({ gluten_by_person: v === 'person' })} />
          {!m.gluten_by_person && (
            <label className="mini">How many people?
              <Text type="number" min={0} max={count} value={m.gluten_count} onChange={(v) => set({ gluten_count: v })} placeholder="0" />
            </label>
          )}
          {m.gluten_by_person && <p className="q__help">Tick the box under each person above.</p>}
          {glutenCount(m, count) > 0 && (
            <Tiles compact options={GLUTEN_LEVEL} value={m.gluten_level} onChange={(v) => set({ gluten_level: v })} />
          )}
        </Q>
      )}
    </>
  );
}

function glutenCount(m, count) {
  if (!m.gluten_by_person) return Math.max(0, Math.min(count, Math.round(Number(m.gluten_count)) || 0));
  return rowsFor(m, count).filter((r) => r.gluten).length;
}

// Turns the master form into one ordinary traveler record per person. Keeps each traveler's
// existing id where there is one, so nothing downstream sees them as new people.
export function expandMaster(master, count, prev = [], organizerName = '') {
  const m = { ...emptyMaster(), ...(master || {}) };
  const sh = m.shared || {};
  const rows = rowsFor(m, count);
  const fields = fieldsOf(m);
  const gCount = glutenCount(m, count);
  return Array.from({ length: count }, (_, i) => {
    const row = rows[i] || {};
    const r = {
      name: fields.includes('name') ? row.name : '',
      age: fields.includes('age') ? row.age : '',
      pace_align: fields.includes('pace') ? row.pace_align : '',
      why: fields.includes('style') ? row.why : '',
    };
    const gluten = m.gluten_by_person ? !!row.gluten : i < gCount;
    const name = (r.name || '').trim() || (i === 0 && organizerName ? organizerName : `Traveler ${i + 1}`);
    return {
      ...newTraveler(i),
      id: prev[i]?.id || `t${Date.now()}${i}`,
      name,
      age: r.age || '',
      why: r.why ? [r.why] : (sh.why || []),
      how_spend: sh.how_spend || '',
      how_plan: sh.how_plan || '',
      activity_level: sh.activity_level || '',
      rhythm: sh.rhythm || '',
      interests: sh.interests || [],
      dining: sh.dining || '',
      food_adventure: sh.food_adventure || '',
      avoid: sh.avoid || [],
      must_dos: [],
      pace_align: r.pace_align || 'Matches the group',
      diet: gluten ? [GLUTEN] : [],
      gluten_level: gluten ? (m.gluten_level || '') : '',
      gluten_answered: true,
      from_master: true,
    };
  });
}

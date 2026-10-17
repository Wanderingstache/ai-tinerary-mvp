import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { Text } from './ui.jsx';
import { Card } from './Stage3.jsx';
import { getSession, setSession, clearSession, onSessionChange } from './session.js';
import { getRecentTrips } from './localTrip.js';
import { link } from './router.js';
import { newTraveler } from './options.js';

// Accounts: email + password, kept only on ai-tinerary.com (never shared with Wandering
// Mustache). An account gathers your trips in "My trips" and keeps "My travelers": you and the
// people you usually travel with, with travel styles, so new trips fill in faster.

export const PRIVACY_LINE = 'Your account lives only on ai-tinerary.com. It isn’t shared with Wandering Mustache or anyone else.';
const recentIds = () => getRecentTrips().map((t) => t.id);

// Who's signed in, kept fresh when the session changes. { status: 'loading'|'out'|'in', me }
export function useMe() {
  const [state, setState] = useState({ status: getSession() ? 'loading' : 'out', me: null });
  useEffect(() => {
    const check = () => {
      if (!getSession()) return setState({ status: 'out', me: null });
      api.me().then((me) => setState({ status: 'in', me })).catch((e) => { if (e.status === 401) clearSession(); setState({ status: 'out', me: null }); });
    };
    check();
    return onSessionChange(check);
  }, []);
  return state;
}

// Sign in / Create account, one form with a switch. `code` is the beta passcode (needed to create
// an account, not to sign in). `onEmailLink` shows the emailed-link sign-in instead.
export function AccountForm({ code, start = 'create', onDone, onEmailLink }) {
  const [mode, setMode] = useState(start); // create | signin
  const [f, setF] = useState({ name: '', email: '', password: '', pass: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const needPass = mode === 'create' && !code;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = mode === 'create'
        ? await api.register({ name: f.name, email: f.email, password: f.password, access_code: code || f.pass, trip_ids: recentIds() })
        : await api.login({ email: f.email, password: f.password, trip_ids: recentIds() });
      setSession(r.session);
      onDone?.(r);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="gate__form account-form">
      <div className="tiles tiles--compact" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'create'} className={`tile ${mode === 'create' ? 'is-on' : ''}`} onClick={() => setMode('create')}><span className="tile__label">Create an account</span></button>
        <button type="button" role="tab" aria-selected={mode === 'signin'} className={`tile ${mode === 'signin' ? 'is-on' : ''}`} onClick={() => setMode('signin')}><span className="tile__label">I have an account</span></button>
      </div>
      {mode === 'create' && (
        <label className="mini">Your first name <span className="q__optional">(optional)</span>
          <Text value={f.name} onChange={set('name')} maxLength={60} autoComplete="given-name" />
        </label>
      )}
      <label className="mini">Email
        <input className="input" type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} autoComplete="email" required />
      </label>
      <label className="mini">Password{mode === 'create' && <span className="q__optional"> (at least 8 characters)</span>}
        <input className="input" type="password" value={f.password} onChange={(e) => set('password')(e.target.value)}
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength={mode === 'create' ? 8 : undefined} required />
      </label>
      {needPass && (
        <label className="mini">Passcode from your invitation
          <input className="input" type="text" value={f.pass} onChange={(e) => set('pass')(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} required />
        </label>
      )}
      <p className="fine">{PRIVACY_LINE}</p>
      {error && <p className="status status--error" role="alert">{error}</p>}
      <div className="nav">
        {onEmailLink && mode === 'signin' ? <button type="button" className="linkbtn" onClick={onEmailLink}>Forgot it? Email me a link</button> : <span />}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'One moment…' : mode === 'create' ? 'Create my account' : 'Sign in'}</button>
      </div>
    </form>
  );
}

// The friendly nudge on the Plan-a-trip page for beta clients who aren't signed in yet.
const DISMISS_KEY = 'ait_account_prompt_dismissed';
export function AccountPrompt({ code }) {
  const { status } = useMe();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } });
  if (status !== 'out' || hidden) return null;
  const dismiss = () => { try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* fine */ } setHidden(true); };
  return (
    <aside className="panel account-prompt">
      <h2 className="panel__title">Make yourself at home</h2>
      <p>Create a free ai-tinerary account to keep all your trips in one place and sign in from any device. You can also save your travel style and the people you usually travel with, so the next trip fills itself in.</p>
      {open ? <AccountForm code={code} onDone={() => setOpen(false)} /> : (
        <div className="row">
          <button type="button" className="btn" onClick={() => setOpen(true)}>Create an account</button>
          <a className="btn btn--ghost" href={link('/trips')}>Sign in</a>
          <button type="button" className="linkbtn" onClick={dismiss}>Not now</button>
        </div>
      )}
      {!open && <p className="fine">{PRIVACY_LINE}</p>}
    </aside>
  );
}

// Set or change a password while signed in. Also how someone who signed in by emailed link (or
// forgot their password) gets one.
export function PasswordForm({ hasPassword, onDone }) {
  const [pw, setPw] = useState('');
  const [state, setState] = useState(''); // '' | busy | done
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setState('busy'); setError('');
    try { await api.setPassword(pw); setPw(''); setState('done'); onDone?.(); } catch (err) { setError(err.message); setState(''); }
  };
  if (state === 'done') return <p className="note">Password saved. Next time, sign in with your email and password.</p>;
  return (
    <form onSubmit={submit} className="row account-pw">
      <label className="mini grow">{hasPassword ? 'New password' : 'Choose a password'} <span className="q__optional">(at least 8 characters)</span>
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} required />
      </label>
      <button type="submit" className="btn btn--small" disabled={state === 'busy'}>{state === 'busy' ? 'Saving…' : 'Save password'}</button>
      {error && <p className="status status--error" role="alert">{error}</p>}
    </form>
  );
}

// ── My travelers ────────────────────────────────────────────────────────────────────────────
const toPerson = (t, extra = {}) => {
  const { id, must_dos, status, invite_token, from_master, ...rest } = t; // trip-only bits stay with the trip
  return { ...rest, ...extra };
};
const describe = (p) => [p.relation, p.age, ...(p.why || []), p.how_spend, p.how_plan].filter(Boolean).join(' · ');

function useFlags() {
  const [flags, setFlags] = useState({ gluten: true });
  useEffect(() => { api.config().then((c) => c.needs && setFlags(c.needs)).catch(() => {}); }, []);
  return flags;
}

function PersonEditor({ person, onSave, onCancel, onDelete, flags }) {
  const [t, setT] = useState({ ...newTraveler(0), ...person });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = async () => {
    if (!(t.name || '').trim()) return setError('Give this traveler a name.');
    setBusy(true); setError('');
    try { await onSave(t); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <div className="card is-open">
      <div className="card-body">
        <div className="row">
          <label className="mini grow">Who are they to you? <span className="q__optional">(optional)</span>
            <Text value={t.relation} onChange={(v) => setT({ ...t, relation: v })} maxLength={30} placeholder="e.g. Partner, Daughter, Best friend" />
          </label>
        </div>
        <label className="check"><input type="checkbox" checked={!!t.is_self} onChange={(e) => setT({ ...t, is_self: e.target.checked })} /> This is me</label>
        <Card t={t} i={t.is_self ? 0 : 1} set={(p) => setT({ ...t, ...p })} needsOn tiles={{ step: null, list: [] }} skipDetails={false}
          onCopyPrev={() => {}} flags={flags} hideMustDos hideCopyPrev />
        {error && <p className="status status--error" role="alert">{error}</p>}
        <div className="nav">
          {onDelete ? (confirmDelete
            ? <span className="row"><span className="fine">Delete {t.name || 'this traveler'}?</span><button type="button" className="btn btn--ghost btn--small" onClick={onDelete}>Yes, delete</button><button type="button" className="linkbtn" onClick={() => setConfirmDelete(false)}>Keep</button></span>
            : <button type="button" className="linkbtn" onClick={() => setConfirmDelete(true)}>Delete</button>) : <span />}
          <span className="row">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

export function MyTravelers() {
  const { status, me } = useMe();
  const flags = useFlags();
  const [people, setPeople] = useState(null);
  const [editing, setEditing] = useState(null); // person id, 'new', or null
  const [error, setError] = useState('');
  const load = useCallback(() => api.people().then((r) => setPeople(r.people)).catch((e) => setError(e.message)), []);
  useEffect(() => { if (status === 'in') load(); }, [status, load]);

  if (status === 'loading') return <main className="wrap"><p className="status status--working"><span className="dot" />One moment…</p></main>;
  if (status === 'out') {
    return (
      <main className="wrap">
        <h1 className="title">My travelers</h1>
        <p className="lede">Sign in to save your travel style and the people you usually travel with.</p>
        <AccountForm start="signin" onEmailLink={() => { window.location.href = link('/trips'); }} />
      </main>
    );
  }
  const save = async (t) => {
    const body = toPerson(t);
    if (editing === 'new') await api.addPerson(body); else await api.updatePerson(editing, body);
    setEditing(null); load();
  };
  const remove = async (id) => { await api.deletePerson(id); setEditing(null); load(); };
  const hasSelf = (people || []).some((p) => p.is_self);
  return (
    <main className="wrap">
      <h1 className="title">My travelers</h1>
      <p className="lede">You and the people you usually travel with. On a new trip, pick someone here and their card fills itself in. Changing someone here never changes a trip you’ve already planned.</p>
      {error && <p className="status status--error" role="alert">{error}</p>}
      {people === null ? <p className="status status--working"><span className="dot" />Loading…</p> : (
        <>
          {people.length === 0 && editing !== 'new' && <p className="note">No one saved yet. Start with yourself.</p>}
          <ul className="trip-list">
            {people.map((p) => (editing === p.id
              ? <li key={p.id}><PersonEditor person={p} flags={flags} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(p.id)} /></li>
              : (
                <li key={p.id} className="trip-row">
                  <button type="button" className="trip-row__main linkbtn" onClick={() => setEditing(p.id)}>
                    <strong>{p.name}{p.is_self ? ' (me)' : ''}</strong><span>{describe(p) || 'No details yet'}</span>
                  </button>
                  <span className="trip-row__meta"><button type="button" className="linkbtn" onClick={() => setEditing(p.id)}>Edit</button></span>
                </li>
              )))}
          </ul>
          {editing === 'new'
            ? <PersonEditor person={{ is_self: !hasSelf, name: !hasSelf ? (me?.name || '') : '' }} flags={flags} onSave={save} onCancel={() => setEditing(null)} />
            : <button type="button" className="btn" onClick={() => setEditing('new')}>{hasSelf ? 'Add a travel partner' : 'Add yourself'}</button>}
        </>
      )}
      <section className="panel account-settings">
        <h2 className="panel__title">Your account</h2>
        <p>Signed in as <strong>{me?.email}</strong>. {PRIVACY_LINE}</p>
        <PasswordForm hasPassword={me?.hasPassword} />
      </section>
      <p><a href={link('/trips')}>My trips</a> · <a href={link('/')}>Plan a new trip</a></p>
    </main>
  );
}

// On a trip's traveler card: fill it from a saved traveler, or save it as one.
export function SavedTravelerTools({ t, onFill }) {
  const { status } = useMe();
  const [people, setPeople] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (status === 'in') api.people().then((r) => setPeople(r.people)).catch(() => setPeople([])); }, [status]);
  if (status !== 'in' || people === null) return null;
  const already = people.find((p) => (p.name || '').trim().toLowerCase() === (t.name || '').trim().toLowerCase() && t.name);
  const saveThis = async () => {
    if (!(t.name || '').trim()) return setMsg('Add a name first.');
    setMsg('Saving…');
    try {
      const body = toPerson(t);
      const saved = already ? await api.updatePerson(already.id, { ...body, is_self: already.is_self, relation: already.relation }) : await api.addPerson(body);
      setPeople(already ? people.map((p) => (p.id === saved.id ? saved : p)) : [...people, saved]);
      setMsg(already ? `Updated ${saved.name} in My travelers.` : `Saved ${saved.name} to My travelers.`);
    } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="saved-tools row">
      {people.length > 0 && (
        <label className="mini grow">Fill from My travelers
          <select className="input" value="" onChange={(e) => {
            const p = people.find((x) => x.id === e.target.value);
            if (p) { const { id, is_self, relation, updated_at, ...prefs } = p; onFill(prefs); setMsg(`Filled in from ${p.name}.`); }
          }}>
            <option value="">Choose someone…</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_self ? ' (me)' : ''}</option>)}
          </select>
        </label>
      )}
      <button type="button" className="btn btn--ghost btn--small" onClick={saveThis}>{already ? 'Update in My travelers' : 'Save to My travelers'}</button>
      {msg && <span className="fine" role="status">{msg}</span>}
    </div>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from './api.js';
import { Route, Nav, Text, StepStatus, Brand, BetaNote } from './ui.jsx';
import Stage1, { stage1Problem } from './Stage1.jsx';
import Stage2 from './Stage2.jsx';
import Stage3 from './Stage3.jsx';
import Stage4, { stage4Ready } from './Stage4.jsx';
import Itinerary from './Itinerary.jsx';
import InviteFlow from './InviteFlow.jsx';
import { rememberTrip, getRecentTrips, forgetTrip } from './localTrip.js';
import { getSession, setSession, clearSession, onSessionChange } from './session.js';
import { ago, tripWhen, stageLabel } from './format.js';
import { newTraveler } from './options.js';
import { expandMaster } from './MasterIntake.jsx';
import { AccountPrompt, AccountForm, PasswordForm, MyTravelers, useMe } from './Account.jsx';
import { go, link, currentPath, isHash, isRouteHash } from './router.js';


function Header({ large, topNav }) {
  return (
    <header className="masthead">
      {topNav && (
        <nav className="topnav" aria-label="Main">
          <a href={link('/')} aria-current="page">Home</a>
          <a href={link('/sample')}>Sample trip</a>
          <a href={link('/truth')}>The Truth</a>
          <a href={link('/about')}>How it works</a>
        </nav>
      )}
      <Brand large={large} />
    </header>
  );
}

// The passcode is remembered for this browser tab only, so a reload doesn't ask again.
const CODE_KEY = 'ait_code';
const savedCode = () => { try { return sessionStorage.getItem(CODE_KEY) || ''; } catch { return ''; } };
const rememberCode = (c) => { try { sessionStorage.setItem(CODE_KEY, c); } catch { /* private mode: fine, we keep it in memory */ } };
const forgetCode = () => { try { sessionStorage.removeItem(CODE_KEY); } catch { /* nothing to forget */ } };

// Front door #2: the passcode gateway.
function Gate({ onUnlock, notice }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(notice || '');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError('');
    try { await api.access(code); onUnlock(code.trim()); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <main className="wrap gate">
      <h1 className="title">Already Invited? Lucky you!<span className="gate__sub">Enter your passcode:</span></h1>
      <form onSubmit={submit} className="gate__form">
        <label className="sr" htmlFor="passcode">Passcode</label>
        <input id="passcode" className="input" type="text" value={code} onChange={(e) => setCode(e.target.value)}
          maxLength={40} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoFocus />
        {error && <p className="status status--error" role="alert">{error}</p>}
        <div className="nav"><span /><button type="submit" className="btn" disabled={busy || !code.trim()}>{busy ? 'Checking…' : 'Continue'}</button></div>
      </form>
      <aside className="gate__help" aria-labelledby="nopass">
        <h2 id="nopass">No passcode? Get on the list.</h2>
        <p>ai-tinerary is invite-only while we work out the bugs. We're travelers, not a tech company, and right now this site is held together by duct tape and good intentions. Next, a small group of invited travelers gets to use it free. Then it opens to everyone, and your first itinerary is free.</p>
        <p>Leave your email and we'll tell you when it's your turn. No newsletter, no sales call, and your address goes nowhere else.</p>
        <Waitlist />
        <p className="gate__tag">Built by travelers, for travelers.</p>
      </aside>
      <p className="gate__more">Still curious? See <a href={link('/sample')}>a sample trip</a>, read <a href={link('/truth')}>The Truth About Travel</a>, or see <a href={link('/about')}>how it works</a> and <a href="/about#money">who pays us</a>. The brags live at{' '}
        <a href="https://www.wanderingmustache.com/" target="_blank" rel="noopener noreferrer">Wandering Mustache</a>.</p>
    </main>
  );
}

// The waitlist form inside the gate: email required, name and dream destination optional.
// "website" is a hidden honeypot field; people never see it, simple bots fill it in.
function Waitlist() {
  const [f, setF] = useState({ name: '', email: '', note: '', website: '' });
  const [state, setState] = useState('idle'); // idle | busy | done
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.email.trim()) return;
    setState('busy'); setError('');
    try { await api.waitlist(f); setState('done'); }
    catch (err) { setError(err.message); setState('idle'); }
  };
  if (state === 'done') {
    return <p className="status waitlist__done" role="status">You're on the list. We'll email you once, when it's your turn.</p>;
  }
  return (
    <form className="waitlist" onSubmit={submit}>
      <label htmlFor="wl-name">Your name <span className="waitlist__opt">(optional)</span></label>
      <input id="wl-name" className="input" type="text" value={f.name} onChange={set('name')} maxLength={120} autoComplete="name" />
      <label htmlFor="wl-email">Email</label>
      <input id="wl-email" className="input" type="email" value={f.email} onChange={set('email')} maxLength={200} autoComplete="email" required />
      <label htmlFor="wl-note">Where are you dreaming of going? <span className="waitlist__opt">(optional)</span></label>
      <input id="wl-note" className="input" type="text" value={f.note} onChange={set('note')} maxLength={500} />
      <div className="waitlist__hp" aria-hidden="true"><label htmlFor="wl-website">Leave this empty</label><input id="wl-website" type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></div>
      {error && <p className="status status--error" role="alert">{error}</p>}
      <button type="submit" className="btn" disabled={state === 'busy' || !f.email.trim()}>{state === 'busy' ? 'Adding you…' : 'Put me on the list'}</button>
    </form>
  );
}

// Step 1 of the intake, once you're through the gate.
function Start({ code, onRejected }) {
  const [basics, setBasics] = useState(api.previewDefaults?.basics || { date_mode: 'dates', traveler_count: 1 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // The trips this browser opened lately, newest first, so one tab left open can't hide the others.
  // Hiding the list only hides it for this visit; "remove" forgets one trip from this device's list
  // (the trip itself is untouched).
  const [recent, setRecent] = useState(getRecentTrips());
  const [hideRecent, setHideRecent] = useState(false);
  const start = async () => {
    const problem = stage1Problem(basics);
    if (problem) return setError(problem);
    setBusy(true); setError('');
    try {
      const { id } = await api.createTrip(basics, code);
      rememberTrip(id, basics.destination);
      go(`/trip/${id}`);
    } catch (e) {
      if (e.status === 403 || e.status === 429) return onRejected(e.message); // passcode no longer accepted
      setError(e.message); setBusy(false);
    }
  };
  return (
    <main className="wrap">
      <Route stage="basics" />
      <h1 className="title">Plan a trip</h1>
      {recent.length > 0 && !hideRecent && (
        <aside className="resume">
          <p><strong>Pick up where you left off</strong> <span className="fine">· trips opened on this device</span></p>
          <ul className="resume__list">
            {recent.slice(0, 5).map((t) => (
              <li key={t.id}>
                <a href={link(`/trip/${t.id}`)}>{t.destination}</a> <span className="fine">opened {ago(t.at)}</span>
                <button type="button" className="linkbtn" aria-label={`Remove ${t.destination} from this list`} onClick={() => { forgetTrip(t.id); setRecent(getRecentTrips()); }}>remove</button>
              </li>
            ))}
          </ul>
          <button type="button" className="linkbtn" onClick={() => setHideRecent(true)}>Start a new trip instead</button>
        </aside>
      )}
      <AccountPrompt code={code} />
      <p className="lede">Answer a few questions for your whole group. We research real prices, check your must-dos, and build one itinerary that works for everyone.</p>
      <Stage1 value={basics} onChange={setBasics} />
      {error && <p className="status status--error" role="alert">{error}</p>}
      <Nav onNext={start} nextLabel="Start planning" busy={busy} />
      <BetaNote />
    </main>
  );
}

function Plan() {
  const [gate, setGate] = useState('loading'); // loading | locked | open
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.config();
        if (!cfg.needsAccessCode) return setGate('open');
        const saved = savedCode();
        if (saved) {
          try { await api.access(saved); setCode(saved); return setGate('open'); } catch { forgetCode(); }
        }
        setGate('locked');
      } catch { setGate('locked'); }
    })();
  }, []);
  if (gate === 'loading') return <main className="wrap"><p className="status status--working"><span className="dot" />One moment…</p></main>;
  if (gate === 'locked') return <Gate notice={notice} onUnlock={(c) => { rememberCode(c); setCode(c); setNotice(''); setGate('open'); window.scrollTo(0, 0); }} />;
  return <Start code={code} onRejected={(msg) => { forgetCode(); setNotice(msg); setGate('locked'); }} />;
}

// ── Sign-in ("My trips") ────────────────────────────────────────────────────────────────────────
// Optional and passwordless: you ask for a link by email, tap it, and this device is signed in. It
// doesn't change how trips or traveler links work — it only makes your trips findable anywhere.
function AccountBar() {
  const { status, me } = useMe();
  const signOut = () => { api.authLogout().catch(() => {}); clearSession(); };
  if (status === 'in') {
    return (
      <p className="acct">Signed in as <strong>{me.name || me.email}</strong> · <a href={link('/trips')}>My trips</a> · <a href={link('/account')}>My travelers</a> · <button type="button" className="linkbtn" onClick={signOut}>Sign out</button></p>
    );
  }
  if (status === 'loading') return null;
  return <p className="acct"><a href={link('/trips')}>Sign in or create an account</a></p>;
}

function SignInForm() {
  const needPass = !savedCode();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const send = async (e) => {
    e.preventDefault();
    setState('sending'); setError('');
    try {
      const code = needPass ? pass : savedCode();
      await api.authRequest(email, code);
      if (needPass) rememberCode(code);
      setState('sent');
    } catch (err) { setError(err.message); setState('idle'); }
  };
  if (state === 'sent') {
    return (
      <div className="panel">
        <h2 className="panel__title">Check your email</h2>
        <p>We sent a sign-in link to <strong>{email.trim()}</strong>. Tap it on this device to finish. It works once and expires in 15 minutes.</p>
        <p className="note">Can't find it? Look in your spam or junk folder.</p>
        <div className="row">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setState('idle')}>Use a different email</button>
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={send} className="gate__form">
      <label className="q__label" htmlFor="si-email">Your email</label>
      <input id="si-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      {needPass && (
        <>
          <label className="q__label" htmlFor="si-pass">Passcode</label>
          <input id="si-pass" className="input" type="text" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} required />
        </>
      )}
      {error && <p className="status status--error" role="alert">{error}</p>}
      <div className="nav"><span /><button type="submit" className="btn" disabled={state === 'sending' || !email.trim()}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button></div>
    </form>
  );
}

// Email + password by default; the emailed link stays as the "forgot my password" route.
function TripsSignIn() {
  const [emailLink, setEmailLink] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  useEffect(() => { api.config().then((c) => setEmailEnabled(!!c.emailEnabled)).catch(() => {}); }, []);
  if (emailLink) {
    return (
      <>
        <p className="note">We'll email you a one-time sign-in link. Once you're in, you can set a new password on the My travelers page.</p>
        <SignInForm />
        <p><button type="button" className="linkbtn" onClick={() => setEmailLink(false)}>Back to email and password</button></p>
      </>
    );
  }
  return <AccountForm code={savedCode()} start="signin" onEmailLink={emailEnabled ? () => setEmailLink(true) : undefined} />;
}

function MyTrips() {
  const [state, setState] = useState('loading'); // loading | out | ready | error
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!getSession()) return setState('out');
    try { setData(await api.myTrips()); setState('ready'); } catch (e) {
      if (e.status === 401) { clearSession(); return setState('out'); }
      setError(e.message); setState('error');
    }
  }, []);
  useEffect(() => { load(); return onSessionChange(load); }, [load]);
  if (state === 'loading') return <main className="wrap"><p className="status status--working"><span className="dot" />One moment…</p></main>;
  if (state === 'error') return <main className="wrap"><h1 className="title">My trips</h1><p className="status status--error" role="alert">{error}</p><button type="button" className="btn btn--ghost" onClick={load}>Try again</button></main>;
  if (state === 'out') {
    return (
      <main className="wrap">
        <h1 className="title">Find your trips</h1>
        <p className="lede">Sign in to see every trip you've started, from any phone or computer.</p>
        <TripsSignIn />
      </main>
    );
  }
  const trips = data?.trips || [];
  return (
    <main className="wrap">
      <h1 className="title">My trips</h1>
      <NoPasswordNudge />
      {trips.length === 0 ? (
        <>
          <p className="lede">No trips here yet. Trips you start while signed in show up here.</p>
          <p className="note">Started one earlier? Open its link while you're signed in and it will be added to this list.</p>
        </>
      ) : (
        <ul className="trip-list">
          {trips.map((t) => (
            <li key={t.id} className="trip-row">
              <a className="trip-row__main" href={link(`/trip/${t.id}`)}><strong>{t.destination}</strong><span>{tripWhen(t)}</span></a>
              <span className="trip-row__meta">{stageLabel(t)} · {t.traveler_count || 1} traveler{(t.traveler_count || 1) === 1 ? '' : 's'} · edited {ago(t.updated_at)}</span>
            </li>
          ))}
        </ul>
      )}
      <p><a className="btn" href={link('/')}>Plan a new trip</a> <a className="btn btn--ghost" href={link('/account')}>My travelers</a></p>
    </main>
  );
}

// Someone who signed in by emailed link (before passwords existed) gets offered one.
function NoPasswordNudge() {
  const { status, me } = useMe();
  const [done, setDone] = useState(false);
  if (status !== 'in' || me?.hasPassword || done) return null;
  return (
    <aside className="panel">
      <p><strong>Add a password</strong> so you can sign in with your email and password next time, no email link needed.</p>
      <PasswordForm hasPassword={false} onDone={() => setDone(true)} />
    </aside>
  );
}

// The page a sign-in email links to. It asks for one tap instead of signing in on load, because
// some email apps open links in the background to scan them, which would use up the one-time link
// before the person ever sees it.
function SignInFinish({ token }) {
  const [state, setState] = useState('ready'); // ready | working | error
  const [error, setError] = useState('');
  const finish = async () => {
    setState('working'); setError('');
    try { const r = await api.authVerify(token); setSession(r.session); go('/trips'); } catch (e) { setError(e.message); setState('error'); }
  };
  return (
    <main className="wrap">
      <h1 className="title">Finish signing in</h1>
      {state === 'error' ? (
        <>
          <p className="status status--error" role="alert">{error}</p>
          <p><a className="btn" href={link('/trips')}>Ask for a new link</a></p>
        </>
      ) : (
        <>
          <p className="lede">Tap the button to sign in to ai-tinerary on this device.</p>
          <button type="button" className="btn" onClick={finish} disabled={state === 'working'}>{state === 'working' ? 'Signing in…' : 'Sign me in'}</button>
        </>
      )}
    </main>
  );
}

function NotFound() {
  return (
    <main className="wrap">
      <h1 className="title">Page not found</h1>
      <p className="lede">We couldn't find that page.</p>
      <p><a href={link('/')}>Go to the ai-tinerary homepage</a></p>
    </main>
  );
}

// Share Trip, Option B: a small, collapsed-by-default widget offering to email the organizer their
// own trip link. Only ever rendered when the server confirms email sending is actually turned on
// (see TripFlow's emailEnabled), so there's nothing to click that would just fail.
function EmailLink({ tripId }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'
  const [msg, setMsg] = useState('');
  const send = async () => {
    setStatus('sending'); setMsg('');
    try { await api.emailLink(tripId, email); setStatus('sent'); } catch (e) { setStatus('error'); setMsg(e.message); }
  };
  if (!open) return <p className="fine"><button type="button" className="linkbtn" onClick={() => setOpen(true)}>Save your spot — email me this link</button></p>;
  if (status === 'sent') return <p className="note">Sent! Check {email} for the link.</p>;
  return (
    <p className="fine save-spot">
      <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ maxWidth: 220, display: 'inline-block' }} />
      {' '}
      <button type="button" className="btn btn--ghost btn--small" onClick={send} disabled={status === 'sending' || !email.trim()}>{status === 'sending' ? 'Sending…' : 'Email me this link'}</button>
      {status === 'error' && <span className="status status--error" style={{ display: 'block' }}>{msg}</span>}
    </p>
  );
}

function TripFlow({ id }) {
  const [trip, setTrip] = useState(null);
  const [draft, setDraft] = useState(null); // local edits before saving
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [skipDetails, setSkipDetails] = useState(false);
  const pollRef = useRef(null);
  const [maxVersions, setMaxVersions] = useState(5);
  const [flags, setFlags] = useState({ physical: false, neuro: false, health: false, diet: false, gluten: true });
  const [emailEnabled, setEmailEnabled] = useState(false);
  useEffect(() => { api.config().then((c) => { setMaxVersions(c.maxVersions || 5); if (c.needs) setFlags(c.needs); setEmailEnabled(!!c.emailEnabled); }).catch(() => {}); }, []);

  const load = useCallback(async () => {
    const t = await api.getTrip(id);
    setTrip(t);
    rememberTrip(t.id, t.destination); // Share Trip, Option A: keep the "resume" pointer fresh
    return t;
  }, [id]);

  // First load
  useEffect(() => {
    load().then((t) => {
      const count = Number(t.basics?.traveler_count) || 1;
      let travelers = t.travelers?.length ? t.travelers : [];
      if (travelers.length < count) travelers = [...travelers, ...Array.from({ length: count - travelers.length }, (_, i) => newTraveler(travelers.length + i))];
      if (!t.travelers?.length && travelers[0] && t.basics?.organizer_name) travelers[0].name = t.basics.organizer_name;
      setDraft({ basics: t.basics || {}, group_answers: t.group_answers || {}, travelers: travelers.slice(0, Math.max(count, 1)), review: t.review || {} });
      setView(t.stage === 'basics' ? 'group' : t.stage);
    }).catch((e) => setError(e.message));
  }, [load]);

  // Keep checking while any AI step is working
  useEffect(() => {
    const running = trip && Object.values(trip.research || {}).some((s) => s?.status === 'running');
    clearInterval(pollRef.current);
    if (running) pollRef.current = setInterval(() => load().catch(() => {}), api.pollMs || 2500);
    return () => clearInterval(pollRef.current);
  }, [trip, load]);

  const run = async (step) => {
    try { await api.run(id, step); await load(); } catch (e) { setError(e.message); }
  };

  // With no nextView, this just persists in place (used by Share Trip's roster actions below) —
  // the view doesn't change and the page doesn't jump to the top.
  const save = async (patch, nextView) => {
    setBusy(true); setError('');
    try {
      const t = await api.saveTrip(id, nextView ? { ...patch, stage: nextView } : patch);
      setTrip(t);
      if (nextView) { setView(nextView); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return t;
    } catch (e) { setError(e.message); return null; } finally { setBusy(false); }
  };
  // Share Trip: saves a change to the group-level answers (the answer mode, the deadline)
  // immediately, without waiting for the step's own Continue button. Also updates the local
  // draft, so going Back to Trip details and Continue-ing forward again doesn't resend a stale
  // copy of group_answers that's missing this change.
  const groupPatch = (patch) => {
    // Merge into the local draft (not the last-saved copy) so unsaved master-form edits survive.
    const merged = { ...trip.group_answers, ...draft.group_answers, ...patch };
    setDraft({ ...draft, group_answers: merged });
    return save({ group_answers: merged });
  };
  // Share Trip: saves the current traveler names right away, so each one gets an invite_token
  // back from the server and a link becomes copyable.
  const saveRoster = async () => { const t = await save({ travelers: draft.travelers }); if (t) setDraft({ ...draft, travelers: t.travelers }); };

  if (error && !trip) return <main className="wrap"><p className="status status--error">{error}</p><a href={link('/')}>Start a new trip</a></main>;
  if (!trip || !draft) return <main className="wrap"><p className="status status--working"><span className="dot" />Loading your trip…</p></main>;

  const r = trip.research || {};
  const set = (k) => (v) => setDraft({ ...draft, [k]: v });
  const count = Number(draft.basics.traveler_count) || 1;
  const genStep = r.generate;
  const versionsLeft = maxVersions - (trip.itinerary_versions || 0);

  const toTravelers = async () => {
    const t = await save({ group_answers: draft.group_answers }, 'travelers');
    if (t && !t.research?.tiles) run('tiles');
  };
  const toReview = async () => {
    // Master form: one set of answers for the whole group, turned into a traveler record per person.
    // Names are optional here, so there's no "add a name" check.
    if (trip.group_answers?.intake_mode === 'master' && count > 1) {
      const travelers = expandMaster(draft.group_answers.master, count, draft.travelers, draft.basics.organizer_name);
      const t = await save({ travelers, group_answers: draft.group_answers }, 'review');
      if (!t) return;
      setDraft({ ...draft, travelers: t.travelers });
      run('review_check');
      if ((t.travelers || []).some((x) => (x.diet || []).length)) run('needs');
      return;
    }
    const unnamed = draft.travelers.findIndex((t) => !t.name.trim());
    if (unnamed !== -1) return setError(`Add a name for traveler ${unnamed + 1}.`);
    const selfMode = trip.group_answers?.intake_mode === 'self';
    // In self-answer mode, each person's own card was already saved straight to the server the
    // moment they submitted it — the organizer's local copy here is just whatever it looked like
    // on page load, and is likely stale by now. Sending it would silently overwrite anyone who's
    // answered since. So self mode only advances the stage; everything else about the travelers
    // is left exactly as the server already has it.
    const travelers = selfMode ? undefined : skipDetails
      ? draft.travelers.map((t) => ({ ...newTraveler(0), id: t.id, name: t.name, age: t.age, needs_types: t.needs_types, physical: t.physical, neuro: t.neuro, health: t.health, diet: t.diet, diet_other: t.diet_other }))
      : draft.travelers;
    const t = await save(travelers ? { travelers } : {}, 'review');
    if (!t) return;
    run('review_check');
    const needsAny = (t.travelers || []).some((x) => (x.needs_types || []).length || (x.diet || []).length || x.diet_other);
    if (needsAny) run('needs');
  };
  const build = async () => {
    const t = await save({ review: draft.review }, 'itinerary');
    if (t) run('generate');
  };
  const saveBasics = async () => {
    const problem = stage1Problem(draft.basics);
    if (problem) return setError(problem);
    const n = Number(draft.basics.traveler_count) || 1;
    const travelers = draft.travelers.length >= n ? draft.travelers.slice(0, n)
      : [...draft.travelers, ...Array.from({ length: n - draft.travelers.length }, (_, i) => newTraveler(draft.travelers.length + i))];
    setDraft({ ...draft, travelers });
    await save({ basics: draft.basics, travelers }, 'group');
  };

  return (
    <main className="wrap">
      <Route stage={view} />
      {emailEnabled && <EmailLink tripId={id} />}
      {view === 'basics' && (
        <>
          <h1 className="title">Trip basics</h1>
          <Stage1 value={draft.basics} onChange={set('basics')} />
          <p className="fine">Changing the destination or dates reruns the destination research.</p>
          <Nav onBack={() => setView('group')} onNext={saveBasics} nextLabel="Save and continue" busy={busy} />
        </>
      )}
      {view === 'group' && (
        <>
          <h1 className="title">Trip details</h1>
          <p className="fine"><button type="button" className="linkbtn" onClick={() => setView('basics')}>Edit trip basics</button></p>
          <Stage2 trip={trip} value={draft.group_answers} onChange={set('group_answers')} onRun={run} flags={flags} />
          <Nav onNext={toTravelers} nextLabel={`Continue to ${count > 1 ? 'travelers' : 'your card'}`} busy={busy} />
        </>
      )}
      {view === 'travelers' && (
        <>
          <h1 className="title">{count > 1 ? 'Travelers' : 'About you'}</h1>
          <Stage3 trip={trip} travelers={draft.travelers} onChange={set('travelers')} onRun={run} skipDetails={skipDetails} setSkipDetails={setSkipDetails} flags={flags}
            onGroupPatch={groupPatch} onSaveRoster={saveRoster} onRefresh={load} busy={busy} emailEnabled={emailEnabled}
            count={count} master={draft.group_answers.master}
            onMasterChange={(m) => setDraft({ ...draft, group_answers: { ...draft.group_answers, master: m } })} />
          <Nav onBack={() => setView('group')} onNext={toReview} nextLabel="Review" busy={busy} />
        </>
      )}
      {view === 'review' && (
        <>
          <h1 className="title">Review</h1>
          <Stage4 trip={trip} review={draft.review} onChange={set('review')} onRun={run} flags={flags} onRefresh={load} />
          <p className="fine">{stage4Ready(trip, draft.review) || 'Building takes 2–5 minutes. You can leave this page open.'}</p>
          <Nav onBack={() => setView('travelers')} onNext={build} nextLabel="Build my itinerary" disabled={!!stage4Ready(trip, draft.review) || versionsLeft <= 0} busy={busy} />
        </>
      )}
      {view === 'itinerary' && (
        <>
          {genStep?.status === 'running' && !trip.itinerary && (
            <div className="building">
              <h1 className="title">Building your itinerary</h1>
              <p className="status status--working"><span className="dot" />Planning each day, checking prices and verifying booking links. This usually takes 2–5 minutes.</p>
            </div>
          )}
          <StepStatus step={genStep?.status === 'error' ? genStep : null} onRetry={() => run('generate')} />
          {genStep?.status === 'running' && trip.itinerary && <p className="status status--working"><span className="dot" />Rebuilding. The current version stays here until the new one is ready.</p>}
          <Itinerary trip={trip} onRegenerate={() => run('generate')} regenStep={genStep} versionsLeft={versionsLeft} />
          <p className="no-print"><button type="button" className="linkbtn" onClick={() => setView('review')}>Back to review</button></p>
        </>
      )}
      {error && <p className="status status--error" role="alert">{error}</p>}
    </main>
  );
}

const ADMIN_KEY_STORE = 'ait_admin_key';
function Admin() {
  const [key, setKey] = useState(() => { try { return sessionStorage.getItem(ADMIN_KEY_STORE) || ''; } catch { return ''; } });
  const [builds, setBuilds] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try {
      const [d, b] = await Promise.all([api.admin(key), api.adminBuilds(key)]);
      setData(d); setBuilds(b.builds);
      try { sessionStorage.setItem(ADMIN_KEY_STORE, key); } catch { /* fine */ }
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { if (key) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = data?.trips.reduce((s, t) => s + t.cost_usd, 0) || 0;
  const withItin = data?.trips.filter((t) => t.itinerary_versions > 0) || [];
  return (
    <main className="wrap wrap--wide">
      <h1 className="title">Costs</h1>
      <div className="row">
        <Text type="password" value={key} onChange={setKey} placeholder="Admin key" onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button type="button" className="btn" onClick={load}>Show</button>
      </div>
      {error && <p className="status status--error">{error}</p>}
      {data && (
        <>
          <p className="lede">Total: ${total.toFixed(2)} across {data.trips.length} trips.
            {withItin.length > 0 && ` Average per finished trip: $${(withItin.reduce((s, t) => s + t.cost_usd, 0) / withItin.length).toFixed(2)}.`}</p>
          <h2>By step</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Step</th><th>Model</th><th>Calls</th><th>Web searches</th><th>Avg time</th><th>Failures</th><th>Cost</th></tr></thead>
            <tbody>{data.steps.map((s) => <tr key={s.step + s.model}><td>{s.label}</td><td>{s.model}</td><td>{s.calls}</td><td>{s.searches}</td><td>{Math.round((s.avg_ms || 0) / 1000)}s</td><td>{s.failures}</td><td>${s.cost_usd.toFixed(3)}</td></tr>)}</tbody>
          </table></div>
          <h2>By trip</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Created</th><th>Destination</th><th>Travelers</th><th>Stage</th><th>Versions</th><th>Calls</th><th>Cost</th></tr></thead>
            <tbody>{data.trips.map((t) => <tr key={t.id}><td>{new Date(t.created_at).toLocaleDateString()}</td><td>{t.destination}</td><td>{t.traveler_count}</td><td>{t.stage}</td><td>{t.itinerary_versions}</td><td>{t.calls}</td><td>${t.cost_usd.toFixed(3)}</td></tr>)}</tbody>
          </table></div>
          <h2>Beta builds and comments ({builds?.length || 0})</h2>
          <p className="fine">No names or email addresses here, just trip details, as promised to beta testers.</p>
          <ul className="trip-list">
            {(builds || []).map((t) => (
              <li key={t.id} className="trip-row build-row">
                <div className="trip-row__main">
                  <strong>{t.destination}</strong>
                  <span>{new Date(t.created_at).toLocaleDateString()} · {t.days ? `${t.days} days` : t.when} · {t.traveler_count} traveler{t.traveler_count === 1 ? '' : 's'}{t.composition ? ` (${t.composition})` : ''}</span>
                  <span className="fine">Ages: {t.ages.join(', ') || 'not given'} · Styles: {t.travel_styles.join(', ') || 'not given'} · Gluten-free: {t.gluten_free} · Answered by: {t.intake_mode} · Versions: {t.itinerary_versions}</span>
                  {t.feedback.map((f, i) => <span key={i} className="build-fb"><strong>{f.rating || 'Comment'}</strong>{f.comment ? `: “${f.comment}”` : ''}</span>)}
                </div>
                {t.has_itinerary && <a className="btn btn--ghost btn--small" href={link(`/admin/build/${t.id}`)}>View itinerary</a>}
              </li>
            ))}
          </ul>
          <h2>Waitlist ({data.waitlist?.length || 0})</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Joined</th><th>Name</th><th>Email</th><th>Dreaming of</th></tr></thead>
            <tbody>{(data.waitlist || []).map((w) => <tr key={w.email}><td>{new Date(w.created_at).toLocaleDateString()}</td><td>{w.name || ''}</td><td><a href={`mailto:${w.email}`}>{w.email}</a></td><td>{w.note || ''}</td></tr>)}</tbody>
          </table></div>
        </>
      )}
    </main>
  );
}

// One beta build, read-only, with names and email addresses removed by the server.
function AdminBuild({ id }) {
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let key = '';
    try { key = sessionStorage.getItem(ADMIN_KEY_STORE) || ''; } catch { /* none */ }
    if (!key) { setError('Open /admin and enter the admin key first.'); return; }
    api.adminBuild(key, id).then(setTrip).catch((e) => setError(e.message));
  }, [id]);
  if (error) return <main className="wrap"><p className="status status--error">{error}</p><a href={link('/admin')}>Back to admin</a></main>;
  if (!trip) return <main className="wrap"><p className="status status--working"><span className="dot" />Loading…</p></main>;
  return (
    <main className="wrap">
      <p className="fine"><a href={link('/admin')}>← Back to admin</a> · Anonymous view: names show as “Traveler 1”, “Traveler 2”…</p>
      <p className="note">{trip.traveler_count} travelers · Ages: {trip.ages.join(', ') || 'not given'} · Gluten-free: {trip.gluten_free}</p>
      <Itinerary trip={trip} readOnly />
    </main>
  );
}

// `pages` is only passed by the single-file preview, which has no server to hand out the public
// pages. On the live site the server sends them straight from /public, so this stays empty.
export default function App({ pages }) {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    if (!isHash()) return undefined;
    // A plain in-page anchor (e.g. the itinerary's "#day-1") changes the hash too, but it isn't
    // a page change — leave the browser's own jump-to-anchor alone, don't touch React's page state.
    const onChange = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (!isRouteHash(h)) return;
      setPath(currentPath()); window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const Page = pages?.[path];
  if (Page) return <Page />;
  const tripMatch = path.match(/^\/trip\/([0-9a-f-]{36})/i);
  const inviteMatch = path.match(/^\/invite\/([0-9a-f-]{36})/i);
  const signInMatch = path.match(/^\/signin\/([A-Za-z0-9_-]{43})$/);
  const isTrips = path === '/trips';
  const isAccount = path === '/account';
  const adminBuildMatch = path.match(/^\/admin\/build\/([0-9a-f-]{36})$/i);
  const isPlan = path === '/' || path === '/plan';
  return (
    <>
      <Header large={isPlan} topNav={isPlan} />
      {(tripMatch || isPlan || isTrips || isAccount) && <AccountBar />}
      {tripMatch ? <TripFlow key={path} id={tripMatch[1]} />
        : inviteMatch ? <InviteFlow key={path} token={inviteMatch[1]} />
        : signInMatch ? <SignInFinish key={path} token={signInMatch[1]} />
        : isTrips ? <MyTrips key={path} />
        : isAccount ? <MyTravelers key={path} />
        : adminBuildMatch ? <AdminBuild key={path} id={adminBuildMatch[1]} />
        : path.startsWith('/admin') ? <Admin />
        : isPlan ? <Plan key={path} /> : <NotFound />}
      <footer className="foot">
        <p><a href={link('/')}>Plan a trip</a> · <a href={link('/sample')}>Sample trip</a> · <a href={link('/truth')}>The Truth About Travel</a> · <a href={link('/about')}>How it works</a> · <a href="https://www.wanderingmustache.com" target="_blank" rel="noopener noreferrer">Wandering Mustache</a></p>
        <p>Invite-only planning by Wandering Mustache.</p>
      </footer>
    </>
  );
}

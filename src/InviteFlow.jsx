import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { Nav } from './ui.jsx';
import { Card } from './Stage3.jsx';

// Share Trip: opened from one traveler's own link (never the organizer's trip link). Shows only
// their own card — the destination and dates for context, nothing about the budget, anyone
// else's answers, or the trip itself. Submitting saves straight to that one traveler's record.
export default function InviteFlow({ token }) {
  const [data, setData] = useState(null);
  const [t, setT] = useState(null);
  const [flags, setFlags] = useState({ physical: false, neuro: false, health: false, diet: false, gluten: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.config().then((c) => { if (c.needs) setFlags(c.needs); }).catch(() => {});
    api.getInvite(token).then((d) => { setData(d); setT(d.traveler); setDone(d.traveler.status === 'done'); }).catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <main className="wrap">
        <h1 className="title">This link isn't working</h1>
        <p className="status status--error" role="alert">{error}</p>
        <p className="fine">If you were sent this link by a trip organizer, ask them to check it was copied in full, or to send you a fresh one.</p>
      </main>
    );
  }
  if (!data || !t) return <main className="wrap"><p className="status status--working"><span className="dot" />Loading your trip…</p></main>;

  const set = (patch) => setT({ ...t, ...patch });
  const tileList = [...new Set([...(data.missed ? [data.missed] : []), ...(data.promoted_sights || []), ...(data.tiles || []).map((x) => x.label)])];
  const tiles = { step: null, list: tileList, retry: () => {} };
  const needsOn = data.needs_gate === 'yes' && (flags.diet || flags.physical || flags.neuro || flags.health);
  const when = data.start_date ? `${data.start_date} to ${data.end_date}` : `${data.day_count} day${data.day_count === 1 ? '' : 's'}`;

  const submit = async () => {
    if (!t.name.trim()) return setError('Add your name before continuing.');
    setBusy(true); setError('');
    try { await api.saveInvite(token, t); setDone(true); window.scrollTo(0, 0); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <main className="wrap">
        <h1 className="title">Thanks{t.name ? `, ${t.name}` : ''}!</h1>
        <p className="lede">Your answers are saved for the trip to {data.destination} ({when}). You can close this page now — the organizer will see your card when they build the itinerary.</p>
        <button type="button" className="btn btn--ghost" onClick={() => setDone(false)}>Something to change? Edit my answers</button>
      </main>
    );
  }

  return (
    <main className="wrap">
      <h1 className="title">Your trip to {data.destination}</h1>
      <p className="lede">{when}. Answer for yourself — the organizer put this trip together and will see your card when it's time to build the itinerary.</p>
      <Card t={t} i={0} set={set} needsOn={needsOn} tiles={tiles} skipDetails={false} onCopyPrev={() => {}} flags={flags} />
      {error && <p className="status status--error" role="alert">{error}</p>}
      <Nav onNext={submit} nextLabel="I'm done" busy={busy} />
    </main>
  );
}

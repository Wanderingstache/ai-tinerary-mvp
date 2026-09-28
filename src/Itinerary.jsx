import React from 'react';

const LINK_LABEL = {
  official: 'Official site',
  primary_platform: 'Book',
  backup_platform: 'Book (platform)',
  reseller: 'Third-party seller',
  unchecked: 'Book',
};

function Option({ o }) {
  return (
    <li className="opt">
      <div className="opt__head">
        <strong className="opt__name">{o.name}</strong>
        {o.price_level && <span className="opt__price">{o.price_level}</span>}
        <span className={`tier tier--${(o.verification_tier || 'AI-ed').replace(/[^a-z]/gi, '')}`} title={o.verification_voice}>{o.verification_tier || 'AI-ed'}</span>
      </div>
      {o.note && <p className="opt__note">{o.note}</p>}
      {o.price_shift_warning && <p className="warn">Prices have shifted; confirm this rate before booking.</p>}
      {[o.accessibility_note, o.dietary_note, o.loyalty_note].filter(Boolean).map((n) => <p key={n} className="opt__note opt__note--need">{n}</p>)}
      <p className="opt__links">
        {o.maps_url && <a href={o.maps_url} target="_blank" rel="noreferrer">Map</a>}
        {o.booking_url && <a href={o.booking_url} target="_blank" rel="noreferrer">{LINK_LABEL[o.link_status] || 'Book'}</a>}
        {o.blog_link && <a href={o.blog_link} target="_blank" rel="noreferrer">Our write-up</a>}
      </p>
      {o.link_status === 'reseller' && <p className="fine">This link is a reseller. Compare with the official site before buying.</p>}
    </li>
  );
}

function Block({ b }) {
  return (
    <div className="block">
      <div className="block__time">{b.time}</div>
      <div className="block__body">
        <h4 className="block__title">{b.title}{b.who && b.who !== 'Everyone' && <span className="who"> · {b.who}</span>}</h4>
        {b.description && <p>{b.description}</p>}
        {b.tags?.length > 0 && <p className="tags">{b.tags.map((t) => <span key={t} className="tag">{t}</span>)}</p>}
        {b.transport?.mode && (
          <p className="transport"><strong>Getting there:</strong> {b.transport.mode}. {b.transport.why} {b.transport.research_note}</p>
        )}
        {b.options?.length > 0 && <ul className="opts">{b.options.map((o, i) => <Option key={i} o={o} />)}</ul>}
        {b.split?.length > 0 && (
          <div className="split">
            {b.split.map((s, i) => (
              <div key={i} className="split__col">
                <p className="split__who">{(s.who || []).join(', ')}</p>
                <h5>{s.title}</h5>
                {s.description && <p>{s.description}</p>}
                {s.options?.length > 0 && <ul className="opts">{s.options.map((o, j) => <Option key={j} o={o} />)}</ul>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Itinerary({ trip, onRegenerate, regenStep, versionsLeft }) {
  const it = trip.itinerary;
  if (!it) return null;
  const tiers = {};
  const count = (o) => { tiers[o.verification_tier || 'AI-ed'] = (tiers[o.verification_tier || 'AI-ed'] || 0) + 1; };
  (it.stay || []).forEach(count);
  (it.days || []).forEach((d) => d.blocks?.forEach((b) => { b.options?.forEach(count); b.split?.forEach((s) => s.options?.forEach(count)); }));

  const copyLink = () => navigator.clipboard?.writeText(window.location.href);

  return (
    <article className="itin">
      <header className="itin__head">
        <h1>{it.title || `Your ${trip.destination} itinerary`}</h1>
        {it.summary && <p className="lede">{it.summary}</p>}
        <p className="fine">
          Sourcing: {['Stached', 'Scouted', 'Vetted', 'AI-ed'].map((t) => `${t} ${tiers[t] || 0}`).join(', ')}.
          {' '}Built {new Date(it.generated_at).toLocaleDateString()}. Verify tickets, reservations and opening days before you go.
        </p>
        <div className="actions no-print">
          <button type="button" className="btn" onClick={() => window.print()}>Save as PDF</button>
          <button type="button" className="btn btn--ghost" onClick={copyLink}>Copy link to share</button>
          <button type="button" className="btn btn--ghost" onClick={onRegenerate} disabled={regenStep?.status === 'running' || versionsLeft <= 0}>
            {regenStep?.status === 'running' ? 'Rebuilding…' : `Rebuild (${versionsLeft} left)`}
          </button>
        </div>
        <p className="fine no-print">Anyone with this link can view and change this trip. Share it only with your group.</p>
      </header>

      {(it.notes?.length > 0 || it.safety_notes?.length > 0) && (
        <section className="itin__box">
          <h2>Good to know</h2>
          {[...(it.notes || []), ...(it.safety_notes || [])].map((n, i) => <p key={i}><strong>{n.title}.</strong> {n.text}</p>)}
        </section>
      )}

      {it.stay?.length > 0 && (
        <section className="itin__box">
          <h2>Where to stay</h2>
          <ul className="opts">{it.stay.map((o, i) => <Option key={i} o={{ ...o, note: [o.area, o.why].filter(Boolean).join('. ') }} />)}</ul>
        </section>
      )}

      <nav className="daynav no-print" aria-label="Days">
        {(it.days || []).map((d) => <a key={d.day} href={`#day-${d.day}`}>Day {d.day}</a>)}
      </nav>

      {(it.days || []).map((d) => (
        <section key={d.day} id={`day-${d.day}`} className="day">
          <h2 className="day__title">Day {d.day}{d.title ? `: ${d.title}` : ''}</h2>
          {(d.date || d.areas?.length > 0) && <p className="day__meta">{[d.date, (d.areas || []).join(', ')].filter(Boolean).join('. ')}</p>}
          {(d.blocks || []).map((b, i) => <Block key={i} b={b} />)}
        </section>
      ))}

      {(it.useful_phrases?.length > 0 || it.allergy_card?.length > 0) && (
        <section className="itin__box">
          {it.useful_phrases?.length > 0 && (
            <>
              <h2>Useful phrases</h2>
              <ul className="plain">{it.useful_phrases.map((p, i) => <li key={i}><strong>{p.phrase}</strong>: {p.meaning}</li>)}</ul>
            </>
          )}
          {it.allergy_card?.length > 0 && (
            <>
              <details className="diet-card">
                <summary>Restaurant diet card (tap to show)</summary>
                {it.allergy_card.map((c, i) => <p key={i} className="allergy"><strong>{c.local_text}</strong><br /><span className="fine">{c.english}</span></p>)}
              </details>
            </>
          )}
        </section>
      )}

      {it.before_you_go?.length > 0 && (
        <section className="itin__box">
          <h2>Before you go</h2>
          <ul className="plain">{it.before_you_go.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}

      <p className="fine">This itinerary was researched with AI and live web search. Places marked AI-ed have not been personally verified by Wandering Mustache.</p>
    </article>
  );
}

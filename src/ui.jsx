import React, { useId } from 'react';
import { link } from './router.js';

const keyOf = (o) => (typeof o === 'string' ? o : o.key);
const labelOf = (o) => (typeof o === 'string' ? o : o.label || o.key);
const lineOf = (o) => (typeof o === 'string' ? '' : o.line || '');

// Tiles: single choice (value = string) or multi (value = array). `max` limits multi picks.
export function Tiles({ options, value, onChange, multi = false, max, compact = false }) {
  const selected = (k) => (multi ? (value || []).includes(k) : value === k);
  const toggle = (k) => {
    if (!multi) return onChange(value === k ? '' : k);
    const cur = value || [];
    if (cur.includes(k)) return onChange(cur.filter((x) => x !== k));
    if (max && cur.length >= max) return;
    onChange([...cur, k]);
  };
  return (
    <div className={`tiles ${compact ? 'tiles--compact' : ''}`} role={multi ? 'group' : 'radiogroup'}>
      {options.map((o) => {
        const k = keyOf(o);
        const on = selected(k);
        return (
          <button type="button" key={k} className={`tile ${on ? 'is-on' : ''}`}
            role={multi ? 'checkbox' : 'radio'} aria-checked={on} onClick={() => toggle(k)}>
            <span className="tile__label">{labelOf(o)}</span>
            {lineOf(o) && <span className="tile__line">{lineOf(o)}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Q({ label, help, info, children, optional }) {
  return (
    <div className="q">
      <div className="q__label">
        {label}
        {optional && <span className="q__optional"> (optional)</span>}
      </div>
      {help && <p className="q__help">{help}</p>}
      {info && (
        <details className="info"><summary>Why we ask</summary><p>{info}</p></details>
      )}
      {children}
    </div>
  );
}

export function Text({ value, onChange, placeholder, maxLength, type = 'text', ...rest }) {
  const id = useId();
  return (
    <input id={id} className="input" type={type} value={value || ''} placeholder={placeholder}
      maxLength={maxLength} onChange={(e) => onChange(e.target.value)} {...rest} />
  );
}

export function Route({ stage }) {
  const legs = [
    ['basics', 'Trip basics'], ['group', 'Trip details'], ['travelers', 'Travelers'],
    ['review', 'Review'], ['itinerary', 'Itinerary'],
  ];
  const at = legs.findIndex(([k]) => k === stage);
  return (
    <ol className="route" aria-label="Progress">
      {legs.map(([k, label], i) => (
        <li key={k} className={`route__stop ${i < at ? 'is-past' : ''} ${i === at ? 'is-here' : ''}`}
          aria-current={i === at ? 'step' : undefined}>
          <span className="route__stamp">{i + 1}</span>
          <span className="route__name">{label}</span>
        </li>
      ))}
    </ol>
  );
}

// Shows what an AI step is doing: working / done / failed with retry.
export function StepStatus({ step, working, onRetry, children }) {
  if (!step) return null;
  if (step.status === 'running') return <div className="status status--working" role="status"><span className="dot" />{working}</div>;
  if (step.status === 'error') {
    return (
      <div className="status status--error" role="alert">
        <p>{step.error}</p>
        {onRetry && <button type="button" className="btn btn--small" onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  return children || null;
}

export function Nav({ onBack, onNext, nextLabel = 'Continue', disabled, busy }) {
  return (
    <div className="nav">
      {onBack ? <button type="button" className="btn btn--ghost" onClick={onBack}>Back</button> : <span />}
      {onNext && <button type="button" className="btn" onClick={onNext} disabled={disabled || busy}>{busy ? 'Saving…' : nextLabel}</button>}
    </div>
  );
}

// The logo. The whole picture links home; the "Wandering + mustache" part links to wanderingmustache.com
// (opens in a new tab so nobody loses answers mid-intake). Link areas are set in /brand.css.
// The preview has no server to fetch /logo.png from, so it supplies the picture itself.
const logoSrc = () => (typeof window !== 'undefined' && window.__LOGO_SRC__) || '/logo.png';

export function Brand({ large = false }) {
  return (
    <div className={`brand ${large ? 'brand--lg' : ''}`}>
      <img src={logoSrc()} width="556" height="480" alt="ai-tinerary.com, brought to you by the Wandering Mustache" />
      <a className="brand__home" href={link('/')}><span className="sr">ai-tinerary home</span></a>
      <a className="brand__wm" href="https://www.wanderingmustache.com" target="_blank" rel="noopener noreferrer" title="Visit wanderingmustache.com">
        <span className="sr">Visit Wandering Mustache (opens in a new tab)</span>
      </a>
    </div>
  );
}

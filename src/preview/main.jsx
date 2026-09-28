import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import './preview.css';
import App from '../App.jsx';
import { api } from '../api.js';
import { enableHashRouting } from '../router.js';
import { previewApi, resetPreview } from './previewApi.js';
import { makePage } from './StaticPage.jsx';
import truthHtml from '../../public/truth.html?raw';
import landingHtml from '../../public/landing.html?raw';
import brandCss from '../../public/brand.css?raw';
// Every picture in /public is inlined by the build, so the preview stays one file and new pictures show up on their own.
const found = import.meta.glob('../../public/*.png', { eager: true, query: '?url', import: 'default' });
const pictures = Object.fromEntries(Object.entries(found).map(([file, url]) => [`/${file.split('/').pop()}`, url]));

Object.assign(api, previewApi); // swap the real back end for the pretend one
window.__LOGO_SRC__ = pictures['/logo.png'];
enableHashRouting();

const style = document.createElement('style');
style.textContent = brandCss;
document.head.appendChild(style);

const pages = {
  '/truth': makePage({ html: truthHtml, brandCss, pictures }),   // The Truth About Travel
  '/about': makePage({ html: landingHtml, brandCss, pictures }), // Travel on Your Terms: how it works
}; // "/" is the app itself: the passcode gateway, then the intake

function PreviewBar() {
  const restart = () => { resetPreview(); window.location.hash = '#/'; window.location.reload(); };
  return (
    <div className="pvbar no-print">
      <span><strong>Preview.</strong> Sample trip. Nothing is saved or sent to Claude. Passcode: <code>demo</code></span>
      <span className="pvbar__links">
        <a href="#/">Homepage (Plan a trip)</a><a href="#/truth">The Truth</a><a href="#/about">How it works</a>
        <button type="button" onClick={restart}>Restart demo</button>
      </span>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<><PreviewBar /><App pages={pages} /></>);

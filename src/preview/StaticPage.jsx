import React, { useEffect, useRef } from 'react';
import { go } from '../router.js';

// Turns one of the public pages (The Truth, How it works) into a component, exactly as written in
// /public. It is drawn inside a shadow root, so the page's own styles can't leak into the app and the
// app's can't leak into the page. If you edit the page in /public, the preview picks it up on the next build.
function split(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
    .replace(/(^|[},;\s])body(\s*[{,])/g, '$1.page-root$2'); // a shadow root has no <body>, so its rule moves to a wrapper
  const body = html.split(/<body[^>]*>/)[1].split('</body>')[0];
  return { css, body };
}

// `pictures` maps a page address like "/logo.png" to the picture itself (inlined by the build).
export function makePage({ html, brandCss, pictures }) {
  const { css, body } = split(html);
  const markup = body.replace(/src="(\/[^"]+\.png)"/g, (whole, p) => (pictures[p] ? `src="${pictures[p]}"` : whole));
  return function StaticPage() {
    const host = useRef(null);
    useEffect(() => {
      const el = host.current;
      const root = el.shadowRoot || el.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>:host{display:block}.page-root{min-height:100vh}\n${brandCss}\n${css}</style><div class="page-root">${markup}</div>`;
      const onClick = (e) => {
        const a = e.composedPath().find((n) => n.tagName === 'A');
        const href = a?.getAttribute('href') || '';
        if (href.startsWith('/') && !href.startsWith('//')) { e.preventDefault(); go(href); } // page-to-page links stay inside the preview
      };
      root.addEventListener('click', onClick);
      return () => root.removeEventListener('click', onClick);
    }, []);
    return <div ref={host} />;
  };
}

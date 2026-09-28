// Packs the preview build into ONE html file you can double-click or publish:
// the app code and styles are pasted into the page instead of being loaded as separate files.
import fs from 'fs';
import path from 'path';

const dir = 'dist-preview';
const read = (p) => fs.readFileSync(path.join(dir, p.replace(/^\.\//, '')), 'utf8');
let html = read('preview.html');

html = html.replace(/<link rel="stylesheet"[^>]*href="(\.\/[^"]+\.css)"[^>]*>/g, (_, p) => `<style>\n${read(p)}\n</style>`);
html = html.replace(/<script type="module"[^>]*src="(\.\/[^"]+\.js)"[^>]*><\/script>/g,
  (_, p) => `<script type="module">\n${read(p).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')}\n</script>`);

if (/src="\.\//.test(html) || /href="\.\/assets/.test(html)) throw new Error('The preview still points at a separate file.');
const out = path.join(dir, 'ai-tinerary-preview.html');
fs.writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);

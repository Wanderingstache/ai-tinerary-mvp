"""Refresh server/wander-maps.json from the Wandering Mustache brags.

Run from the ai-tinerary folder after publishing a new brag:
    python3 scripts/export-wander-maps-from-wm.py ../wandering-mustache

It reads every stamped item (Stached, Scouted, Vetted) in each brag's Links section and rebuilds
the "places" list. Entries marked "manual": true are kept as they are. Add a new brag's slug and
destination to DEST below, and add permanently closed places to EXCLUDE.
"""
import html, json, re, subprocess, sys
from pathlib import Path

WM = Path(sys.argv[1] if len(sys.argv) > 1 else '../wandering-mustache')
OUT = Path(__file__).resolve().parent.parent / 'server' / 'wander-maps.json'
VAIL = 'Vail Valley, Colorado (Vail, Beaver Creek, Avon, Edwards, Minturn)'
DEST = {
    'athens-36-hours': 'Athens, Greece',
    'barcelona': 'Barcelona, Spain',
    'explora-ii-ports': 'Explora II ports (Greece, Croatia, Montenegro, Italy)',
    'explora-ii-deep-dive': 'Explora II', 'explora-ii': 'Explora II',
    'mexico-city': 'Mexico City, Mexico', 'multi-modal-european-wander': 'Europe',
    'paris-foodie-friends': 'Paris, France', 'park-city': 'Park City, Utah',
    'peru-cuzco': 'Cusco, Peru', 'peru-lima': 'Lima, Peru',
    'peru-machu-picchu': 'Machu Picchu, Aguas Calientes, Peru',
    'peru-valle-sagrado': 'Sacred Valley, Valle Sagrado, Urubamba, Peru',
    'riviera-maya-cancun': 'Riviera Maya, Cancun, Playa del Carmen, Tulum, Mexico',
    'utah-pupstache': 'Utah (Moab, Torrey, Boulder, Escalante, Bryce, Zion)',
    'vail-valley': VAIL, 'vail-valley-vail': VAIL, 'vail-valley-beaver-creek': VAIL,
    'vail-valley-minturn-avon-edwards': VAIL,
    'venice-been-there-done-that': 'Venice, Italy',
}
EXCLUDE = {'Dulce Patria'}  # permanently closed

def clean(x):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', x))).strip()

def added_on(slug):
    out = subprocess.run(['git', '-C', str(WM), 'log', '--diff-filter=A', '--format=%cs', '--', f'{slug}.html'],
                         capture_output=True, text=True).stdout.split()
    return out[-1] if out else ''

data = json.loads(OUT.read_text())
places = [p for p in data.get('places', []) if p.get('manual')]
seen = {(p['name'].lower(), p['destination']) for p in places}
for slug, dest in DEST.items():
    page = (WM / f'{slug}.html').read_text()
    for item in re.findall(r'<li class="s-link-item[^"]*">(.*?)</li>', page, re.S):
        stamp = re.search(r'wm-stamp-(stached|scouted|vetted)\.png', item)
        name = re.search(r'class="s-link-name">(.*?)</span>', item, re.S)
        if not stamp or not name:
            continue
        name, stamp = clean(name.group(1)), stamp.group(1)
        desc = re.search(r'class="s-link-desc">(.*?)</span>', item, re.S)
        desc = clean(desc.group(1)) if desc else ''
        if name in EXCLUDE or (name.lower(), dest) in seen:
            continue
        seen.add((name.lower(), dest))
        places.append({
            'name': name, 'destination': dest, 'stached': stamp == 'stached',
            'blog_link': f'https://www.wanderingmustache.com/{slug}', 'our_take': desc,
            'client_feedback': desc if stamp == 'scouted' else '',
            'verification_method': 'Researched by She-Stache for the Wander Map; not yet visited' if stamp == 'vetted' else '',
            'verified_date': added_on(slug) if stamp == 'vetted' else '', 'rating': None,
        })
data['places'] = places
OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
print(f'{len(places)} places written to {OUT}')

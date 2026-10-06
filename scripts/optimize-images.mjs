// Downloads source photos (Unsplash, free licence) and writes responsive WebP/AVIF
// variants to public/img. Run once: `npm run images`.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('public/img');
const CACHE = path.resolve('.image-cache');

// name: [unsplash id, widths, crop aspect (w/h) or null]
const IMAGES = {
  'hero-ocean':   ['1506929562872-bb421503ef21', [640, 1080, 1600, 2200], null],
  'ocean-wave':   ['1505228395891-9a51e7e86bf6', [640, 1080, 1600], null],
  'maldives':     ['1540202404-a2f29016b523', [480, 960], 4 / 3],
  'canada':       ['1503614472-8c93d56e92ce', [480, 960], 4 / 3],
  'uk':           ['1513635269975-59663e0ac1ad', [480, 960], 4 / 3],
  'usa':          ['1514565131-fce0801e5785', [480, 960], 4 / 3],
  'australia':    ['1506973035872-a4ec16b8e8d9', [480, 960], 4 / 3],
  'germany':      ['1467269204594-9661b134dd2b', [480, 960], 4 / 3],
  'france':       ['1502602898657-3e91760cbb34', [480, 960], 4 / 3],
  'new-zealand':  ['1507699622108-4be3abd695ad', [480, 960], 4 / 3],
  'ireland':      ['1590089415225-401ed6f9db8e', [480, 960], 4 / 3],
  'london-aerial':['1505761671935-60b3a7427bad', [640, 1280], null],
  'plane-wing':   ['1436491865332-7a61a109cc05', [640, 1280], null],
  'airport':      ['1530521954074-e64f6810b32d', [640, 1280], 4 / 5],
  'graduation':   ['1541339907198-e08756dedf3f', [640, 1280], null],
  'students':     ['1522202176988-66273c2fd55f', [640, 1280], 4 / 3],
  'handshake':    ['1521791136064-7986c2920216', [640, 1280], 4 / 3],
  'travel-plan':  ['1488646953014-85cb44e25828', [640, 1280], 4 / 3],
  'backpacker':   ['1503220317375-aaad61436b1b', [640, 1280], 4 / 5],
  'city-walk':    ['1527631746610-bca00a040d60', [640, 1280], 4 / 5],
  'balloons':     ['1530789253388-582c481c54b0', [640, 1280], 4 / 3],
  'office':       ['1573164713988-8665fc963095', [640, 1280], 4 / 3],
  'person-1':     ['1438761681033-6461ffad8d80', [160, 400], 1],
  'person-2':     ['1500648767791-00dcc994a43e', [160, 400], 1],
  'person-3':     ['1507003211169-0a1dd7228f2d', [160, 400], 1],
  'person-4':     ['1494790108377-be9c29b29330', [160, 400], 1],
  'person-5':     ['1544005313-94ddf0286df2', [160, 400], 1],
  'person-6':     ['1519125323398-675f0ddb6308', [160, 400], 1],
};

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(CACHE, { recursive: true });

for (const [name, [id, widths, aspect]] of Object.entries(IMAGES)) {
  const src = path.join(CACHE, `${name}.jpg`);
  try { await fs.access(src); } catch {
    const res = await fetch(`https://images.unsplash.com/photo-${id}?w=2400&q=90&fm=jpg`);
    if (!res.ok) { console.warn('skip', name, res.status); continue; }
    await fs.writeFile(src, Buffer.from(await res.arrayBuffer()));
  }
  for (const w of widths) {
    let img = sharp(src);
    if (aspect) img = img.resize(w, Math.round(w / aspect), { fit: 'cover', position: 'attention' });
    else img = img.resize(w);
    await img.clone().webp({ quality: 72 }).toFile(path.join(OUT, `${name}-${w}.webp`));
    if (name.startsWith('hero')) await img.clone().avif({ quality: 50 }).toFile(path.join(OUT, `${name}-${w}.avif`));
  }
  console.log('✓', name);
}

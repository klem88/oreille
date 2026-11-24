// Génère les icônes PWA (PNG) sans dépendance : node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

const BG = [0x12, 0x12, 0x16];
const FG = [0xf2, 0xf2, 0xf5];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Glyphe : un anneau (l'« oreille » stylisée) et un point central. rScale réduit le glyphe (zone sûre maskable). */
function render(size, rScale) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const c = size / 2;
  const R = size * 0.3 * rScale, w = size * 0.07 * rScale, dot = size * 0.085 * rScale;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      // sur-échantillonnage 3x3 pour des bords lisses
      let cov = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
        const d = Math.hypot(x + (sx + 0.5) / 3 - c, y + (sy + 0.5) / 3 - c);
        // anneau ouvert à droite (arc ~ 300°) + point
        const ang = Math.atan2(y + (sy + 0.5) / 3 - c, x + (sx + 0.5) / 3 - c);
        const inRing = Math.abs(d - R) <= w / 2 && Math.abs(ang) > 0.55;
        if (inRing || d <= dot) cov++;
      }
      const a = cov / 9;
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] + (FG[i] - BG[i]) * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const files = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.72],
  ['apple-touch-icon.png', 180, 0.9],
];
for (const [name, size, s] of files) writeFileSync(join(out, name), render(size, s));
console.log('icônes générées dans', out);

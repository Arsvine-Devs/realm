// One-shot: regenerate the favicon set from a transparent master image.
// Run with `node scripts/regen-favicons.mjs`.
//
// Output layout (mirrors what we ship in public/):
//   public/favicon.ico              ← root (browsers blind-probe /favicon.ico)
//   public/apple-touch-icon.png     ← root (iOS Safari blind-probes /apple-touch-icon.png)
//   public/icons/favicon-16x16.png
//   public/icons/favicon-32x32.png
//   public/icons/android-chrome-192x192.png
//   public/icons/android-chrome-512x512.png
//
// If you change SRC, point it at a PNG/WebP that already has a true alpha channel.
// To rebuild from a white-background JPG, first run scripts/jpg-to-transparent-png.mjs.

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'public/avatar_transparent.webp';
const BG = { r: 0, g: 0, b: 0, alpha: 0 };

mkdirSync('public/icons', { recursive: true });

const png = (size) =>
  sharp(SRC)
    .resize(size, size, { fit: 'contain', background: BG })
    .png({ compressionLevel: 9 })
    .toBuffer();

// [dst path relative to project root, pixel size]
const outs = [
  ['public/icons/favicon-16x16.png', 16],
  ['public/icons/favicon-32x32.png', 32],
  ['public/apple-touch-icon.png', 180],
  ['public/icons/android-chrome-192x192.png', 192],
  ['public/icons/android-chrome-512x512.png', 512],
];

for (const [path, size] of outs) {
  const buf = await png(size);
  writeFileSync(path, buf);
  console.log(`wrote ${path}  (${size}x${size}, ${buf.length} bytes)`);
}

// Build favicon.ico containing 16/32/48 PNG-embedded entries.
// ICO with embedded PNG payload is supported by all browsers since Windows Vista.
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map(png));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(pngs.length, 4);

let offset = 6 + 16 * pngs.length;
const dirs = pngs.map((buf, i) => {
  const d = Buffer.alloc(16);
  d.writeUInt8(icoSizes[i] === 256 ? 0 : icoSizes[i], 0); // width
  d.writeUInt8(icoSizes[i] === 256 ? 0 : icoSizes[i], 1); // height
  d.writeUInt8(0, 2); // palette colors
  d.writeUInt8(0, 3); // reserved
  d.writeUInt16LE(1, 4); // planes
  d.writeUInt16LE(32, 6); // bpp
  d.writeUInt32LE(buf.length, 8); // data size
  d.writeUInt32LE(offset, 12); // data offset
  offset += buf.length;
  return d;
});

const ico = Buffer.concat([header, ...dirs, ...pngs]);
writeFileSync('public/favicon.ico', ico);
console.log(`wrote public/favicon.ico (16+32+48 PNG, ${ico.length} bytes)`);

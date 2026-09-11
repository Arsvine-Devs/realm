// Convert a white-background JPG to a true-transparent PNG via alpha unmix.
// Usage: node scripts/jpg-to-transparent-png.mjs <input.jpg> <output.png>
// Algorithm: treat white as matte. For each pixel:
//   alpha = 1 - min(R,G,B)/255    -- the further from white, the more opaque
//   RGB   = (RGB - 255*(1-alpha)) / alpha   -- undo white pre-mix
// This preserves anti-aliased edges instead of leaving a white halo.

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const [, , src, dst] = process.argv;
if (!src || !dst) {
  console.error('usage: node scripts/jpg-to-transparent-png.mjs <input.jpg> <output.png>');
  process.exit(1);
}

const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
if (channels !== 3 && channels !== 4) {
  throw new Error(`unexpected channels: ${channels}`);
}

const out = Buffer.alloc(width * height * 4);
for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
  const r = data[i],
    g = data[i + 1],
    b = data[i + 2];
  // whiteness = min(r,g,b)/255 → fully white pixel becomes alpha=0
  const minRGB = Math.min(r, g, b);
  const alpha = 255 - minRGB;
  if (alpha === 0) {
    out[j] = 0;
    out[j + 1] = 0;
    out[j + 2] = 0;
    out[j + 3] = 0;
    continue;
  }
  // Unmix: original = (current - white * (1-a)) / a, where a is alpha/255 and white=255
  // Simplifies to: orig_c = ((c - 255) * 255 + 255 * alpha) / alpha
  //              = ((c - 255) * 255) / alpha + 255
  const unmix = (c) => Math.max(0, Math.min(255, ((c - 255) * 255) / alpha + 255));
  out[j] = unmix(r);
  out[j + 1] = unmix(g);
  out[j + 2] = unmix(b);
  out[j + 3] = alpha;
}

const png = await sharp(out, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(dst, png);
console.log(`wrote ${dst} (${width}x${height}, ${png.length} bytes)`);

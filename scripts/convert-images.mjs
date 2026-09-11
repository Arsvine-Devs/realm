// Batch image converter.
//
// Usage:
//   node scripts/convert-images.mjs [format] [options]
//
// Format (positional, optional):
//   webp | jpg | png | avif         (default: webp)
//
// Options:
//   --src <dir>        Source directory (default: scripts/images)
//   --out <dir>        Output directory (default: <src>/out)
//   --quality <n>      Encoder quality 1-100 (default: per-format below)
//   --recursive        Recurse into subdirectories (default: true)
//   --no-recursive     Disable recursion
//   --overwrite        Overwrite existing output files (default: skip)
//   --keep-smaller     Only keep output if it is smaller than source
//   --help
//
// Per-format defaults:
//   webp  q=75, effort=6
//   jpg   q=80, mozjpeg, 4:2:0 chroma subsampling
//   png   compressionLevel=9, palette=true
//   avif  q=60, effort=6
//
// Behavior:
//   - Processes .png .jpg .jpeg .webp .avif .gif .tiff in <src>.
//   - Preserves subdirectory structure under <out>.
//   - Does NOT modify source files.
//   - Prints per-file size delta and a summary table at the end.

import sharp from 'sharp';
import { readdir, stat, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SUPPORTED_INPUT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.tiff',
  '.tif',
]);
const SUPPORTED_OUTPUT = new Set(['webp', 'jpg', 'png', 'avif']);

const FORMAT_DEFAULTS = {
  webp: { quality: 75, effort: 6 },
  jpg: { quality: 80, mozjpeg: true, chromaSubsampling: '4:2:0' },
  png: { compressionLevel: 9, palette: true },
  avif: { quality: 60, effort: 6 },
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = {
    format: 'webp',
    src: path.join(scriptDir, 'images'),
    out: null,
    quality: null,
    recursive: true,
    overwrite: false,
    keepSmaller: false,
    help: false,
  };

  // First positional (if any) must be a supported format — otherwise reject.
  const args = argv.slice(2);
  if (args.length > 0 && !args[0].startsWith('-')) {
    const candidate = args.shift().toLowerCase();
    if (!SUPPORTED_OUTPUT.has(candidate)) {
      console.error(
        `Unknown format: ${candidate}. Use one of: ${[...SUPPORTED_OUTPUT].join(', ')}`,
      );
      process.exit(2);
    }
    opts.format = candidate;
  }

  while (args.length > 0) {
    const a = args.shift();
    switch (a) {
      case '--src':
        opts.src = path.resolve(args.shift());
        break;
      case '--out':
        opts.out = path.resolve(args.shift());
        break;
      case '--quality':
        opts.quality = parseInt(args.shift(), 10);
        break;
      case '--recursive':
        opts.recursive = true;
        break;
      case '--no-recursive':
        opts.recursive = false;
        break;
      case '--overwrite':
        opts.overwrite = true;
        break;
      case '--keep-smaller':
        opts.keepSmaller = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        if (!opts._extra) opts._extra = [];
        opts._extra.push(a);
    }
  }

  if (!opts.out) opts.out = path.join(opts.src, 'out');
  return opts;
}

function printHelp() {
  console.log(`Batch image converter.

Usage:
  node scripts/convert-images.mjs [format] [options]

Format (positional, optional):
  webp | jpg | png | avif         (default: webp)

Options:
  --src <dir>        Source directory (default: scripts/images)
  --out <dir>        Output directory (default: <src>/out)
  --quality <n>      Encoder quality 1-100
  --no-recursive     Do not recurse into subdirectories
  --overwrite        Overwrite existing output files
  --keep-smaller     Only keep output if smaller than source

Examples:
  node scripts/convert-images.mjs                       # webp, q=75
  node scripts/convert-images.mjs jpg --quality 75
  node scripts/convert-images.mjs avif --keep-smaller`);
}

async function walk(dir, { recursive }) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (recursive) out.push(...(await walk(full, { recursive })));
      continue;
    }
    if (ent.isFile() && SUPPORTED_INPUT.has(path.extname(ent.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function buildPipeline(input, format, quality) {
  const opts = { ...FORMAT_DEFAULTS[format] };
  if (quality != null && Number.isFinite(quality)) opts.quality = quality;
  const pipeline = sharp(input);
  switch (format) {
    case 'webp':
      return pipeline.webp(opts);
    case 'jpg':
      return pipeline.jpeg(opts);
    case 'png':
      return pipeline.png(opts);
    case 'avif':
      return pipeline.avif(opts);
  }
}

function fmtBytes(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

function pct(before, after) {
  if (!before) return '—';
  const d = (1 - after / before) * 100;
  return (d >= 0 ? '-' : '+') + Math.abs(d).toFixed(1) + '%';
}

function padEnd(s, n) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function padStart(s, n) {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    return;
  }

  if (!SUPPORTED_OUTPUT.has(opts.format)) {
    console.error(
      `Unsupported format: ${opts.format}. Use one of: ${[...SUPPORTED_OUTPUT].join(', ')}`,
    );
    process.exit(2);
  }
  if (!existsSync(opts.src)) {
    console.error(`Source directory not found: ${opts.src}`);
    console.error(`Place images under it, or pass --src <dir>.`);
    process.exit(2);
  }

  const files = await walk(opts.src, { recursive: opts.recursive });
  // Exclude anything already inside <out>
  const filtered = files.filter((f) => !f.startsWith(opts.out + path.sep) && f !== opts.out);

  if (filtered.length === 0) {
    console.log(`No images found under ${opts.src}`);
    return;
  }

  const targetExt = opts.format === 'jpg' ? '.jpg' : '.' + opts.format;
  const effQuality = opts.quality ?? FORMAT_DEFAULTS[opts.format].quality ?? '—';

  console.log(`Source : ${opts.src}`);
  console.log(`Output : ${opts.out}`);
  console.log(`Format : ${opts.format}  (quality=${effQuality})`);
  console.log(`Files  : ${filtered.length}`);
  console.log();

  const rows = [];
  let totalBefore = 0,
    totalAfter = 0,
    ok = 0,
    skipped = 0,
    failed = 0;

  for (const src of filtered) {
    const rel = path.relative(opts.src, src);
    const srcExt = path.extname(src).toLowerCase();
    let dstRel = rel.slice(0, -srcExt.length) + targetExt;
    // If source already has the same extension as the target, suffix it
    if (srcExt === targetExt) {
      dstRel = rel.slice(0, -srcExt.length) + '.recompressed' + targetExt;
    }
    const dst = path.join(opts.out, dstRel);

    await mkdir(path.dirname(dst), { recursive: true });

    let beforeSize = 0;
    try {
      beforeSize = (await stat(src)).size;
    } catch {}
    totalBefore += beforeSize;

    if (!opts.overwrite) {
      try {
        await access(dst);
        rows.push({
          rel,
          dstRel,
          before: beforeSize,
          after: (await stat(dst)).size,
          note: 'skip (exists)',
        });
        skipped++;
        totalAfter += (await stat(dst)).size;
        continue;
      } catch {
        /* doesn't exist, proceed */
      }
    }

    try {
      await buildPipeline(src, opts.format, opts.quality).toFile(dst);
      const afterSize = (await stat(dst)).size;
      let note = '';
      if (opts.keepSmaller && beforeSize > 0 && afterSize >= beforeSize) {
        await (await import('node:fs/promises')).unlink(dst);
        note = 'discarded (not smaller)';
        totalAfter += beforeSize; // counts as no savings
      } else {
        totalAfter += afterSize;
      }
      rows.push({ rel, dstRel, before: beforeSize, after: afterSize, note });
      ok++;
    } catch (e) {
      rows.push({ rel, dstRel, before: beforeSize, after: 0, note: 'ERROR: ' + e.message });
      totalAfter += beforeSize;
      failed++;
    }
  }

  // Render table
  const w1 = Math.max(8, ...rows.map((r) => r.rel.length));
  const w2 = Math.max(8, ...rows.map((r) => r.dstRel.length));
  const w3 = Math.max(8, ...rows.map((r) => fmtBytes(r.before).length));
  const w4 = Math.max(8, ...rows.map((r) => fmtBytes(r.after).length));
  const w5 = 8;

  const header =
    padEnd('source', w1) +
    '  ' +
    padEnd('output', w2) +
    '  ' +
    padStart('before', w3) +
    '  ' +
    padStart('after', w4) +
    '  ' +
    padStart('delta', w5) +
    '  notes';
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of rows) {
    console.log(
      padEnd(r.rel, w1) +
        '  ' +
        padEnd(r.dstRel, w2) +
        '  ' +
        padStart(fmtBytes(r.before), w3) +
        '  ' +
        padStart(fmtBytes(r.after), w4) +
        '  ' +
        padStart(pct(r.before, r.after), w5) +
        '  ' +
        r.note,
    );
  }
  console.log('-'.repeat(header.length));

  const sumLine =
    padEnd(`TOTAL (${rows.length} files)`, w1 + w2 + 2) +
    '  ' +
    padStart(fmtBytes(totalBefore), w3) +
    '  ' +
    padStart(fmtBytes(totalAfter), w4) +
    '  ' +
    padStart(pct(totalBefore, totalAfter), w5);
  console.log(sumLine);
  console.log();
  console.log(`Converted: ${ok}   Skipped: ${skipped}   Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

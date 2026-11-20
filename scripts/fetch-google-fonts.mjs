// Prepare local webfonts and a stylesheet with paths relative to the font directory.

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { splitFontStylesheets } from './lib/font-stylesheets.mjs';

const STAGING_DIR = 'public/_fonts-staging';
const SITE_CONFIG_PATH = 'src/shared/config/site.ts';
const MODERN_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const DOWNLOAD_CONCURRENCY = 4;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

// We shell out to `curl` instead of Node's built-in fetch:
//   - curl natively honors HTTPS_PROXY / HTTP_PROXY env vars (Clash / v2rayN)
//     while Node's fetch ignores them.
//   - curl is bundled with Windows 10+ and ubiquitous on macOS / Linux.
//   - This script is one-shot — process startup cost is irrelevant.
// If HTTPS_PROXY is set in the environment, curl picks it up automatically.
function curlFetch(url, { binary = false } = {}) {
  return new Promise((resolve, reject) => {
    // -s silent, -L follow redirects, -A user-agent, --compressed accept gzip,
    // --fail return non-zero on HTTP >=400, --max-time 30s.
    const args = ['-sL', '-A', MODERN_CHROME_UA, '--compressed', '--fail', '--max-time', '30', url];
    const proc = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    const errChunks = [];
    proc.stdout.on('data', (c) => chunks.push(c));
    proc.stderr.on('data', (c) => errChunks.push(c));
    proc.on('error', (err) => reject(new Error(`curl spawn failed: ${err.message}`)));
    proc.on('close', (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errChunks).toString('utf-8').trim();
        return reject(new Error(`curl exited ${code} for ${url}${stderr ? `: ${stderr}` : ''}`));
      }
      const body = Buffer.concat(chunks);
      resolve(binary ? body : body.toString('utf-8'));
    });
  });
}

// Read the Google Fonts URL straight from the site config so this script cannot
// drift from the source of truth. The config is TypeScript, so parse the URL
// string rather than introducing a TS loader into this dependency-free CLI.
async function readGoogleFontsUrl() {
  const src = await readFile(SITE_CONFIG_PATH, 'utf-8');
  const match = src.match(/googleStylesheet:\s*\n?\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(`Couldn't find googleStylesheet URL in ${SITE_CONFIG_PATH}`);
  }
  return match[1];
}

// "Noto Sans SC" → "noto-sans-sc"
function familyToSlug(family) {
  return family.replace(/['"]/g, '').trim().toLowerCase().replace(/\s+/g, '-');
}

// Extract enough metadata from a single @font-face block to name the local file.
// Google's CSS always emits exactly: font-family, font-style, font-weight,
// font-display, src, unicode-range — in that order.
function parseFontFaceBlock(block) {
  const family = block.match(/font-family:\s*['"]([^'"]+)['"]/)?.[1];
  const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!family || !urlMatch) return null;
  const url = urlMatch[1];
  const slug = familyToSlug(family);
  return { family, slug, url };
}

// Simple promise-pool to cap concurrent fetches.
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function downloadFontFile(url, slug) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const buf = await curlFetch(url, { binary: true });
      const digest = createHash('sha256').update(buf).digest('hex').slice(0, 12);
      const relativePath = `${slug}/font.${digest}.woff2`;
      const destPath = join(STAGING_DIR, relativePath);
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, buf);
      return { bytes: buf.length, relativePath };
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1s, 2s. Cheap insurance against
        // transient proxy hiccups when sustaining 4 parallel TLS sessions.
        await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastErr;
}

async function main() {
  console.log(`[fonts] Reading Google Fonts URL from ${SITE_CONFIG_PATH}...`);
  const cssUrl = await readGoogleFontsUrl();
  if (!cssUrl.startsWith('https://fonts.googleapis.com/')) {
    throw new Error(`Unexpected Google Fonts stylesheet URL: ${cssUrl}`);
  }
  console.log(`[fonts] Source: ${cssUrl}`);

  if (process.argv.includes('--check-config')) {
    console.log('[fonts] Config check passed.');
    return;
  }

  // Clean staging on each run — keeps the upload set minimal and avoids stale files
  // from previous weight choices being re-uploaded to COS.
  // .gitignore is preserved.
  await rm(STAGING_DIR, { recursive: true, force: true });
  await mkdir(STAGING_DIR, { recursive: true });
  await writeFile(
    join(STAGING_DIR, '.gitignore'),
    '# scripts/fetch-google-fonts.mjs output. Published with Realm media.\n*\n!.gitignore\n',
  );

  console.log('[fonts] Fetching CSS via curl (honors HTTPS_PROXY if set)...');
  const originalCss = await curlFetch(cssUrl);
  const cssHash = createHash('sha256').update(originalCss).digest('hex').slice(0, 8);
  console.log(`[fonts] CSS fetched: ${originalCss.length} bytes, sha8=${cssHash}`);

  // Split into @font-face blocks. The CSS Google returns is well-formed: each block
  // is exactly one { ... } pair with no nested braces.
  const blocks = [...originalCss.matchAll(/@font-face\s*\{[^}]+\}/g)].map((m) => m[0]);
  console.log(`[fonts] Found ${blocks.length} @font-face blocks`);
  if (blocks.length === 0) {
    throw new Error('No @font-face blocks parsed — Google may have changed the CSS format');
  }

  const tasks = [];
  const fontUrls = new Set();
  for (let i = 0; i < blocks.length; i++) {
    const parsed = parseFontFaceBlock(blocks[i]);
    if (!parsed) {
      console.warn(`[fonts] Skipping unparseable block #${i}`);
      continue;
    }
    // Google reuses the same underlying woff2 across different weight blocks
    // (e.g. different weights). Download each source once.
    if (fontUrls.has(parsed.url)) {
      continue;
    }
    fontUrls.add(parsed.url);
    tasks.push(parsed);
  }
  console.log(
    `[fonts] After dedup: ${tasks.length} unique woff2 files (from ${blocks.length} @font-face blocks)`,
  );

  console.log(
    `[fonts] Downloading ${tasks.length} woff2 files (concurrency=${DOWNLOAD_CONCURRENCY})...`,
  );
  let totalBytes = 0;
  let done = 0;
  const downloads = await pool(tasks, DOWNLOAD_CONCURRENCY, async (task) => {
    const { bytes, relativePath } = await downloadFontFile(task.url, task.slug);
    totalBytes += bytes;
    done++;
    if (done % 25 === 0 || done === tasks.length) {
      console.log(`[fonts]   ${done}/${tasks.length} done, ${(totalBytes / 1024).toFixed(0)} KB`);
    }
    return { url: task.url, relativePath };
  });

  // Rewrite the original CSS by simple string replace — keeps comment markers
  // (e.g. /* [42] */) and unicode-range exactly as Google emitted them.
  let rewrittenCss = originalCss;
  for (const { url, relativePath } of downloads) {
    rewrittenCss = rewrittenCss.split(url).join(`./${relativePath}`);
  }
  const cssOutPath = join(STAGING_DIR, 'google-fonts.css');
  await writeFile(cssOutPath, rewrittenCss);
  console.log(`[fonts] Wrote ${cssOutPath} (${rewrittenCss.length} bytes)`);

  const manifest = {
    fetchedAt: new Date().toISOString(),
    sourceUrl: cssUrl,
    sourceCssSha8: cssHash,
    cssBytes: rewrittenCss.length,
    fontFiles: tasks.length,
    totalFontBytes: totalBytes,
    families: [...new Set(tasks.map((t) => t.family))],
    stylesheets: splitFontStylesheets(rewrittenCss).map(({ layer, filename }) => ({
      layer,
      filename,
    })),
  };
  await writeFile(join(STAGING_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`[fonts] Prepared ${tasks.length} files in ${STAGING_DIR}`);
  console.log(
    '[fonts] Copy google-fonts.css and the font directories into the media workspace. assets:build writes the versioned stylesheets.',
  );
}

main().catch((err) => {
  console.error('[fonts] FAILED:', err.message);
  process.exit(1);
});

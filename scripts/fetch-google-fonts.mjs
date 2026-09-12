// One-shot: fetch the current Google Fonts stylesheet (URL lives in src/shared/config/site.ts),
// download every woff2 referenced by the per-unicode-range @font-face blocks,
// and rewrite the CSS so its url() entries point at the self-hosted COS copy.
//
// Run with: `node scripts/fetch-google-fonts.mjs`
//
// Output layout (mirrors what gets uploaded to cos://arsvine-cdn/shared/fonts/):
//   public/_fonts-staging/google-fonts.css        ← entry stylesheet, url() rewritten
//   public/_fonts-staging/manifest.json           ← run record (timestamp, file count, sha8)
//   public/_fonts-staging/<family-slug>/<file>.woff2
//
// public/_fonts-staging/ is gitignored. Re-run is idempotent: same source CSS →
// same filenames → byte-identical output.
//
// Upload through the documented COSCLI asset workflow. Credentials must be
// supplied by the current process and must not be persisted in a CLI config.
//      （woff2 子目录用「文件夹上传」，保持目录结构）
//   3. 为 google-fonts.css 在「文件详情 → 自定义 Header」设置：
//        Content-Type:   text/css; charset=utf-8
//        Cache-Control:  public, max-age=86400, must-revalidate
//   4. 为所有 woff2（可批量选中后「编辑元数据」）设置：
//        Content-Type:   font/woff2
//        Cache-Control:  public, max-age=31536000, immutable
//
//   ⚠ 重要：自定义 Header 的「Key」字段只写 header 名（如 Cache-Control），
//   「Value」字段只写值（如 public, max-age=86400, must-revalidate）。
//   不要把 "Cache-Control: " 这种前缀写进 Value，否则 COS 会拼出
//   "Cache-Control: Cache-Control: ..." 这种非法响应头，导致 Firefox
//   拒绝渲染 woff2 字体（fallback 到系统字体，繁体/低频字会显示为方块）。
//
// Why a modern Chrome User-Agent: Google Fonts CSS API serves different src formats
// based on UA. Without a modern UA you get .ttf instead of .woff2, ballooning the
// per-segment file size by 3-4x.

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

const STAGING_DIR = 'public/_fonts-staging';
const SITE_CONFIG_PATH = 'src/shared/config/site.ts';
const CDN_BASE = 'https://cdn.arsvine.com/shared/fonts';
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
function parseFontFaceBlock(block, index) {
  const family = block.match(/font-family:\s*['"]([^'"]+)['"]/)?.[1];
  const style = block.match(/font-style:\s*(\w+)/)?.[1] || 'normal';
  const weight = block.match(/font-weight:\s*(\d+)/)?.[1] || '400';
  const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!family || !urlMatch) return null;
  const url = urlMatch[1];
  const slug = familyToSlug(family);
  // Pad index to 3 digits so files sort naturally (Noto SC has ~100+ segments).
  const filename = `${slug}-${weight}-${style}-${String(index).padStart(3, '0')}.woff2`;
  return { family, slug, weight, style, url, filename };
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

async function downloadFontFile(url, destPath) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const buf = await curlFetch(url, { binary: true });
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, buf);
      return buf.length;
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
    '# scripts/fetch-google-fonts.mjs output. Uploaded to cdn.arsvine.com, not committed.\n*\n!.gitignore\n',
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
  const rewrites = new Map(); // original gstatic url → cdn url
  for (let i = 0; i < blocks.length; i++) {
    const parsed = parseFontFaceBlock(blocks[i], i);
    if (!parsed) {
      console.warn(`[fonts] Skipping unparseable block #${i}`);
      continue;
    }
    // Google reuses the same underlying woff2 across different weight blocks
    // (e.g. weight 300 and 500 may point to identical glyph data for some
    // unicode-ranges). Dedupe by source URL so we download each file once
    // and the rewrites Map stays consistent. The first block to claim a URL
    // sets its filename; later blocks pointing to the same URL get the same
    // cdn target via the existing rewrites entry.
    if (rewrites.has(parsed.url)) {
      continue;
    }
    const destPath = join(STAGING_DIR, parsed.slug, parsed.filename);
    const cdnUrl = `${CDN_BASE}/${parsed.slug}/${parsed.filename}`;
    rewrites.set(parsed.url, cdnUrl);
    tasks.push({ ...parsed, destPath, cdnUrl });
  }
  console.log(
    `[fonts] After dedup: ${tasks.length} unique woff2 files (from ${blocks.length} @font-face blocks)`,
  );

  console.log(
    `[fonts] Downloading ${tasks.length} woff2 files (concurrency=${DOWNLOAD_CONCURRENCY})...`,
  );
  let totalBytes = 0;
  let done = 0;
  await pool(tasks, DOWNLOAD_CONCURRENCY, async (t) => {
    const bytes = await downloadFontFile(t.url, t.destPath);
    totalBytes += bytes;
    done++;
    if (done % 25 === 0 || done === tasks.length) {
      console.log(`[fonts]   ${done}/${tasks.length} done, ${(totalBytes / 1024).toFixed(0)} KB`);
    }
  });

  // Rewrite the original CSS by simple string replace — keeps comment markers
  // (e.g. /* [42] */) and unicode-range exactly as Google emitted them.
  let rewrittenCss = originalCss;
  for (const [from, to] of rewrites) {
    rewrittenCss = rewrittenCss.split(from).join(to);
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
    cdnBase: CDN_BASE,
    families: [...new Set(tasks.map((t) => t.family))],
  };
  await writeFile(join(STAGING_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('');
  console.log('================================================================');
  console.log(`[fonts] Done. ${tasks.length} files, ${(totalBytes / 1024).toFixed(0)} KB total.`);
  console.log(`[fonts] Families: ${manifest.families.join(', ')}`);
  console.log('================================================================');
  console.log('');
  console.log('按 docs/human/ASSETS.md 使用临时环境凭据和 COSCLI 上传到 COS：');
  console.log('');
  console.log('  1. 控制台 → 桶 arsvine-cdn → shared/fonts/ 目录');
  console.log('  2. 上传 public/_fonts-staging/google-fonts.css 和所有 woff2 子目录');
  console.log('     （woff2 用「文件夹上传」，保持目录结构）');
  console.log('');
  console.log('  3. 为 google-fonts.css 设置自定义 Header（文件详情 → 编辑元数据）：');
  console.log('       Key: Content-Type     Value: text/css; charset=utf-8');
  console.log('       Key: Cache-Control    Value: public, max-age=86400, must-revalidate');
  console.log('');
  console.log('  4. 批量选中所有 woff2 → 编辑元数据：');
  console.log('       Key: Content-Type     Value: font/woff2');
  console.log('       Key: Cache-Control    Value: public, max-age=31536000, immutable');
  console.log('');
  console.log('  ⚠ Value 只写值，不要带 "Cache-Control: " 这种前缀，');
  console.log('    否则响应头会变成 "Cache-Control: Cache-Control: ..."');
  console.log('    Firefox 会拒绝渲染字体，繁体/低频字 fallback 到系统字体。');
  console.log('');
  console.log('Verify with:');
  console.log(
    '  curl -I -H "Referer: https://arsvine.com/" https://cdn.arsvine.com/shared/fonts/google-fonts.css',
  );
  console.log('  → Content-Type / Cache-Control 各只出现一次');
}

main().catch((err) => {
  console.error('[fonts] FAILED:', err.message);
  process.exit(1);
});

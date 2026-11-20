import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CRITICAL_FONT_FAMILY = 'Dosis';

export function splitFontStylesheets(css) {
  const groups = { critical: [], extended: [] };
  for (const match of css.matchAll(/@font-face\s*\{[^}]+\}/g)) {
    const block = match[0];
    const family = block.match(/font-family:\s*['"]([^'"]+)['"]/)?.[1];
    if (!family) throw new Error('A font face has no font-family');
    groups[family === CRITICAL_FONT_FAMILY ? 'critical' : 'extended'].push(block);
  }

  return Object.entries(groups).map(([layer, faces]) => {
    if (faces.length === 0) throw new Error(`Missing ${layer} font faces`);
    const body = `${faces.join('\n')}\n`;
    const digest = createHash('sha256').update(body).digest('hex').slice(0, 12);
    return { layer, filename: `realm-fonts-${layer}.${digest}.css`, body };
  });
}

export async function writeFontStylesheets(css, directory) {
  const layers = splitFontStylesheets(css);
  await mkdir(directory, { recursive: true });
  for (const { filename, body } of layers) {
    await writeFile(join(directory, filename), body);
  }
  return layers.map(({ layer, filename, body }) => ({
    layer,
    filename,
    bytes: Buffer.byteLength(body),
  }));
}

if (import.meta.main) {
  const [source, output] = process.argv.slice(2);
  if (!source || !output) throw new Error('Usage: node font-stylesheets.mjs SOURCE.css DIRECTORY');
  console.log(JSON.stringify(await writeFontStylesheets(await readFile(source, 'utf8'), output)));
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_STATUSES = new Set(['published', 'draft', 'hidden']);

export function replaceSourceFields(value, assetMap, seenIds = new Set()) {
  if (Array.isArray(value))
    return value.map((entry) => replaceSourceFields(entry, assetMap, seenIds));
  if (!value || typeof value !== 'object') return value;

  const next = { ...value };
  if (typeof next.id === 'string') {
    if (seenIds.has(next.id)) throw new Error(`Duplicate asset id detected: ${next.id}`);
    seenIds.add(next.id);
  }
  if (typeof next.status === 'string' && !ALLOWED_STATUSES.has(next.status)) {
    throw new Error(`Unsupported status value: ${next.status}`);
  }
  if (typeof next.source === 'string') {
    const matched = assetMap.get(next.source);
    if (!matched) throw new Error(`Unknown asset source reference: ${next.source}`);
    next.objectKey = matched.objectKey;
    if (matched.width) next.width = matched.width;
    if (matched.height) next.height = matched.height;
    if (matched.size) next.size = matched.size;
    next.sourceLocalPath = next.source;
    delete next.source;
  }
  if (next.status === 'published' && 'objectKey' in next && !next.alt && !next.artist) {
    throw new Error(`Published image record is missing alt text: ${next.id || '<unknown>'}`);
  }
  for (const [key, child] of Object.entries(next)) {
    if (Array.isArray(child) || (child && typeof child === 'object')) {
      next[key] = replaceSourceFields(child, assetMap, seenIds);
    }
  }
  return next;
}

export async function loadMetaSection(metaRoot, sectionName) {
  const raw = await readFile(path.join(metaRoot, `${sectionName}.json`), 'utf-8');
  return JSON.parse(raw);
}

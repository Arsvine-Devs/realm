export type ValidatedCatalogSection =
  unknown[] | { items?: unknown[]; collections?: unknown[]; assets?: Record<string, unknown> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecordList(value: unknown, section: string) {
  if (!Array.isArray(value)) throw new Error(`[catalog] ${section} must be an array`);
  const ids = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) throw new Error(`[catalog] ${section}[${index}] must be an object`);
    if (typeof item.id !== 'string' || !item.id)
      throw new Error(`[catalog] ${section}[${index}] is missing id`);
    if (ids.has(item.id)) throw new Error(`[catalog] ${section} contains duplicate id: ${item.id}`);
    ids.add(item.id);
    if (typeof item.objectKey !== 'string' || !item.objectKey) {
      throw new Error(`[catalog] ${section}.${item.id} is missing objectKey`);
    }
    if (item.tags !== undefined && !Array.isArray(item.tags)) {
      throw new Error(`[catalog] ${section}.${item.id}.tags must be an array`);
    }
  }
}

export function parseCatalogSection(section: string, raw: string): ValidatedCatalogSection {
  const value: unknown = JSON.parse(raw);
  if (section === 'collections') {
    if (!isRecord(value) || !Array.isArray(value.collections)) {
      throw new Error('[catalog] collections must contain a collections array');
    }
    const slugs = new Set<string>();
    for (const [index, collection] of value.collections.entries()) {
      if (!isRecord(collection) || typeof collection.slug !== 'string' || !collection.slug) {
        throw new Error(`[catalog] collections[${index}] is missing slug`);
      }
      if (slugs.has(collection.slug))
        throw new Error(`[catalog] duplicate collection slug: ${collection.slug}`);
      slugs.add(collection.slug);
      assertRecordList(collection.items, `collections.${collection.slug}.items`);
    }
    return value;
  }

  if (section === 'static-assets') {
    if (!isRecord(value) || !isRecord(value.assets))
      throw new Error('[catalog] static-assets must contain an assets object');
    for (const [id, asset] of Object.entries(value.assets)) {
      if (!isRecord(asset) || typeof asset.objectKey !== 'string' || !asset.objectKey) {
        throw new Error(`[catalog] static-assets.${id} is missing objectKey`);
      }
    }
    return value;
  }

  const items = isRecord(value) && Array.isArray(value.items) ? value.items : value;
  assertRecordList(items, section);
  return value as ValidatedCatalogSection;
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readEnv } from '@/shared/config/env-provider';
import { parseCatalogSection } from './catalog-validator';

const CATALOG_DIRECTORY = 'realm/catalog';
const DEFAULT_WORKS_PAGE_SIZE = 12;

type CatalogSectionName = 'home' | 'works' | 'collections' | 'links' | 'audio' | 'static-assets';
type CatalogStatus = 'published' | 'draft' | 'hidden';

interface CatalogImageRecord {
  id: string;
  status?: CatalogStatus;
  title?: string;
  description?: string;
  alt?: string;
  objectKey?: string;
  width?: number;
  height?: number;
  tags?: string[];
  collection?: string;
  order?: number;
  date?: string;
}

interface CatalogAudioRecord {
  id: string;
  status?: CatalogStatus;
  title?: string;
  artist?: string;
  objectKey?: string;
  order?: number;
  date?: string;
  duration?: number;
}

export interface PublicCatalogImageRecord {
  id: string;
  title: string;
  description: string;
  alt: string;
  objectKey: string;
  width?: number;
  height?: number;
  tags: string[];
  collection?: string;
  order?: number;
  date?: string;
}

export interface PublicCatalogAudioRecord {
  id: string;
  title: string;
  artist: string;
  objectKey: string;
  order?: number;
  date?: string;
  duration?: number;
}

export interface PublicCatalogStaticAsset {
  objectKey: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface CatalogCollectionsFile {
  collections?: Array<{
    slug: string;
    title?: string;
    description?: string;
    items?: CatalogImageRecord[];
  }>;
  items?: CatalogImageRecord[];
}

function readCatalogFile(key: string) {
  const root = readEnv('REALM_CATALOG_ROOT');
  if (!root || !path.isAbsolute(root)) {
    throw new Error('REALM_CATALOG_ROOT must name the absolute private media directory');
  }
  return readFile(path.join(/* turbopackIgnore: true */ root, CATALOG_DIRECTORY, key), 'utf-8');
}

async function loadCurrentVersion() {
  const location = readEnv('REALM_CATALOG_POINTER');
  if (!location || !path.isAbsolute(location)) {
    throw new Error('REALM_CATALOG_POINTER must name the absolute current Catalog pointer');
  }
  const pointer = JSON.parse(await readFile(/* turbopackIgnore: true */ location, 'utf-8')) as {
    version?: unknown;
  };
  if (typeof pointer?.version !== 'string' || !/^\d{8}T\d{6}Z$/.test(pointer.version)) {
    throw new Error('Catalog current.json does not contain a valid version pointer');
  }
  return pointer.version;
}

async function loadSection(section: CatalogSectionName, version?: string) {
  const current = version ?? (await loadCurrentVersion());
  return parseCatalogSection(section, await readCatalogFile(`versions/${current}/${section}.json`));
}

export async function checkCatalogReady() {
  const version = await loadCurrentVersion();
  const sections: CatalogSectionName[] = [
    'home',
    'works',
    'collections',
    'links',
    'audio',
    'static-assets',
  ];
  await Promise.all(sections.map((section) => loadSection(section, version)));
}

function isPublished(status?: CatalogStatus) {
  return (status || 'published') === 'published';
}

function sortByOrderDate<T extends { order?: number; date?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const orderDelta = (left.order ?? 0) - (right.order ?? 0);
    if (orderDelta !== 0) {
      return orderDelta;
    }
    return (right.date || '').localeCompare(left.date || '');
  });
}

function toPublicImageRecord(record: CatalogImageRecord): PublicCatalogImageRecord | null {
  if (!isPublished(record.status) || !record.id || !record.objectKey) {
    return null;
  }

  return {
    id: record.id,
    title: record.title || '',
    description: record.description || '',
    alt: record.alt || '',
    objectKey: record.objectKey,
    width: record.width,
    height: record.height,
    tags: Array.isArray(record.tags) ? record.tags : [],
    collection: record.collection,
    order: record.order,
    date: record.date,
  };
}

function toPublishedImageRecords(records: CatalogImageRecord[]): PublicCatalogImageRecord[] {
  return records
    .map(toPublicImageRecord)
    .filter((item): item is PublicCatalogImageRecord => !!item);
}

function toPublicAudioRecord(record: CatalogAudioRecord): PublicCatalogAudioRecord | null {
  if (!isPublished(record.status) || !record.id || !record.objectKey) {
    return null;
  }

  return {
    id: record.id,
    title: record.title || '',
    artist: record.artist || '',
    objectKey: record.objectKey,
    order: record.order,
    date: record.date,
    duration: record.duration,
  };
}

function normalizeImageSection(section: unknown) {
  if (Array.isArray(section)) {
    return section as CatalogImageRecord[];
  }
  if (
    section &&
    typeof section === 'object' &&
    Array.isArray((section as { items?: unknown[] }).items)
  ) {
    return (section as { items: CatalogImageRecord[] }).items;
  }
  return [];
}

function paginate<T>(items: T[], page: number, pageSize = DEFAULT_WORKS_PAGE_SIZE) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const total = items.length;
  return {
    items: items.slice(start, end),
    page: safePage,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getHomeAssets() {
  const section = await loadSection('home');
  return sortByOrderDate(toPublishedImageRecords(normalizeImageSection(section)));
}

export async function getWorksAssets(
  options: { page?: number; collection?: string; tag?: string } = {},
) {
  const section = await loadSection('works');
  let items = toPublishedImageRecords(normalizeImageSection(section));

  if (options.collection) {
    items = items.filter((item) => item.collection === options.collection);
  }
  if (options.tag) {
    items = items.filter((item) => item.tags.includes(options.tag as string));
  }

  return paginate(sortByOrderDate(items), options.page ?? 1);
}

export async function getCollectionAssets(slug: string, page = 1) {
  const section = await loadSection('collections');
  const normalized = section as CatalogCollectionsFile;
  let items: CatalogImageRecord[] = [];

  if (Array.isArray(normalized.collections)) {
    items = normalized.collections.find((collection) => collection.slug === slug)?.items || [];
  } else if (Array.isArray(normalized.items)) {
    items = normalized.items.filter((item) => item.collection === slug);
  }

  return paginate(sortByOrderDate(toPublishedImageRecords(items)), page);
}

export async function getLinkAssets() {
  const section = await loadSection('links');
  return sortByOrderDate(toPublishedImageRecords(normalizeImageSection(section)));
}

export async function getAudioAssets() {
  const section = await loadSection('audio');
  const items = Array.isArray(section)
    ? (section as CatalogAudioRecord[])
    : Array.isArray((section as { items?: CatalogAudioRecord[] })?.items)
      ? (section as { items: CatalogAudioRecord[] }).items
      : [];

  return sortByOrderDate(
    items.map(toPublicAudioRecord).filter((item): item is PublicCatalogAudioRecord => !!item),
  );
}

export async function getStaticCatalogAssets(): Promise<Record<string, PublicCatalogStaticAsset>> {
  if (!readEnv('REALM_CATALOG_ROOT')) {
    return {};
  }

  const section = (await loadSection('static-assets')) as {
    assets?: Record<string, CatalogImageRecord>;
  };
  const assets: Record<string, PublicCatalogStaticAsset> = {};

  for (const [key, record] of Object.entries(section.assets || {})) {
    if (record.objectKey) {
      assets[key] = {
        objectKey: record.objectKey,
        alt: record.alt,
        width: record.width,
        height: record.height,
      };
    }
  }
  return assets;
}

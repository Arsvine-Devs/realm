import type { AssetReference } from '@/shared/types';
import { avatar, cover, gallery, post } from '@/shared/lib/cdn';

import portfolioSource from '@/features/portfolio/contracts/source-manifest.json';
import lifeSource from '@/features/life/contracts/source-manifest.json';
import experienceSource from '@/features/experience/contracts/source-manifest.json';
import friendLinkSource from '@/features/profile/contracts/friendLinks/source-manifest.json';
import audioSource from '@/features/music/source-manifest.json';

interface AssetSourceManifestItem {
  id: string;
  title: string;
  gallery: string[];
  cover?: string;
}

interface ExperienceSourceManifestItem extends AssetSourceManifestItem {
  location: string;
  type: 'education' | 'work' | 'volunteer';
}

function assertUnique(items: Array<{ id: string }>, name: string) {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id))
      throw new Error(`Invalid or duplicate ${name} source id: ${item.id}`);
    ids.add(item.id);
  }
}

assertUnique(portfolioSource, 'portfolio');
assertUnique(lifeSource, 'life');
assertUnique(experienceSource, 'experience');
assertUnique(friendLinkSource, 'friend link');
assertUnique(audioSource, 'audio');

export const sourceManifests = {
  portfolio: portfolioSource,
  life: lifeSource,
  experience: experienceSource as ExperienceSourceManifestItem[],
  friendLinks: friendLinkSource,
  audio: audioSource,
};

export function findSourceItem<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing source manifest item: ${id}`);
  return item;
}

export function legacyAssetReference(source: string): AssetReference {
  const [kind, ...rest] = source.split('/');
  const file = rest.join('/');
  if (!file) throw new Error(`Invalid legacy asset source: ${source}`);
  if (kind === 'covers') return cover(file);
  if (kind === 'gallery') return gallery(file);
  if (kind === 'posts') return post(file);
  if (kind === 'avatar') return avatar(file);
  throw new Error(`Unsupported legacy asset source: ${source}`);
}

export function galleryReferences(sources: string[]) {
  return sources.map((source) => ({ src: legacyAssetReference(source) }));
}

export function portfolioSourceFields(id: string) {
  const item = findSourceItem(sourceManifests.portfolio, id);
  return {
    id: item.runtimeId,
    tech: item.tech,
    imageUrl: legacyAssetReference(item.cover),
    galleryImages: galleryReferences(item.gallery),
  };
}

export function lifeSourceFields(id: string) {
  const item = findSourceItem(sourceManifests.life, id);
  return {
    id: item.id,
    imageUrl: legacyAssetReference(item.cover),
    galleryImages: galleryReferences(item.gallery),
  };
}

export function experienceSourceFields(id: string) {
  const item = findSourceItem(sourceManifests.experience, id);
  return {
    id: item.id,
    type: item.type,
    galleryImages: galleryReferences(item.gallery),
  };
}

export function friendLinkSourceFields(id: string) {
  const item = findSourceItem(sourceManifests.friendLinks, id);
  return {
    id: item.runtimeId,
    url: item.url,
    avatar: legacyAssetReference(item.avatar),
  };
}

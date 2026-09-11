import projectItems from '../../src/features/portfolio/contracts/source-manifest.json' with { type: 'json' };
import lifeItems from '../../src/features/life/contracts/source-manifest.json' with { type: 'json' };
import experienceItems from '../../src/features/experience/contracts/source-manifest.json' with { type: 'json' };
import localLinkItems from '../../src/features/profile/contracts/friendLinks/source-manifest.json' with { type: 'json' };
import audioItems from '../../src/features/music/source-manifest.json' with { type: 'json' };

function assertString(value, field) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`Invalid source manifest field: ${field}`);
}

function assertUniqueIds(items, name) {
  const seen = new Set();
  for (const item of items) {
    assertString(item.id, `${name}.id`);
    if (seen.has(item.id)) throw new Error(`Duplicate ${name} id: ${item.id}`);
    seen.add(item.id);
  }
}

function assertLegacySource(value, field) {
  assertString(value, field);
  if (value.startsWith('/') || value.includes('..') || value.includes('\\')) {
    throw new Error(`Invalid legacy source for ${field}: ${value}`);
  }
}

function validateAssetItems(items, name, { cover = true } = {}) {
  assertUniqueIds(items, name);
  for (const item of items) {
    assertString(item.title, `${name}.${item.id}.title`);
    if (cover) assertLegacySource(item.cover, `${name}.${item.id}.cover`);
    if (!Array.isArray(item.gallery)) throw new Error(`Invalid ${name}.${item.id}.gallery`);
    item.gallery.forEach((source, index) =>
      assertLegacySource(source, `${name}.${item.id}.gallery[${index}]`),
    );
  }
}

export function loadSourceManifests() {
  validateAssetItems(projectItems, 'portfolio');
  validateAssetItems(lifeItems, 'life');
  validateAssetItems(experienceItems, 'experience', { cover: false });
  assertUniqueIds(localLinkItems, 'friendLinks');
  localLinkItems.forEach((item) =>
    assertLegacySource(item.avatar, `friendLinks.${item.id}.avatar`),
  );
  assertUniqueIds(audioItems, 'audio');
  audioItems.forEach((item) => assertLegacySource(`music/${item.file}`, `audio.${item.id}.file`));

  return { projectItems, lifeItems, experienceItems, localLinkItems, audioItems };
}

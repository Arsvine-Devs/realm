import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readStyle = (relativePath: string) => readFile(path.join(process.cwd(), relativePath), 'utf8');

async function readScssTree(directory: string): Promise<Array<{ path: string; source: string }>> {
  const absolute = path.join(process.cwd(), directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readScssTree(relativePath);
    if (!entry.name.endsWith('.scss')) return [];
    return [{ path: relativePath, source: await readStyle(relativePath) }];
  }));
  return nested.flat();
}

describe('responsive style migration', () => {
  it('keeps the Experience timeline mobile overrides with its feature', async () => {
    const source = await readStyle('src/features/experience/styles/sections/_experience.scss');

    expect(source).toMatch(/@include breakpoints\.tablet-down[\s\S]*\.experienceTimeline::before[\s\S]*left: 8px/);
    expect(source).toMatch(/@include breakpoints\.mobile[\s\S]*\.timelineItem[\s\S]*width: 100% !important/);
  });

  it('keeps Contact mobile flow overrides with the profile feature', async () => {
    const source = await readStyle('src/features/profile/styles/sections/_contact.scss');

    expect(source).toMatch(/@include breakpoints\.tablet-down[\s\S]*\.logItem[\s\S]*position: relative/);
    expect(source).toMatch(/@include breakpoints\.mobile[\s\S]*\.radarDisplay[\s\S]*width: 160px/);
  });

  it('keeps About mobile panel and decorative-image overrides with the profile feature', async () => {
    const source = await readStyle('src/features/profile/styles/sections/_about.scss');

    expect(source).toMatch(
      /\.aboutNewImageWrapper[\s\S]*width: clamp\(220px, 16vw, 360px\)/,
    );
    expect(source).toMatch(/@include breakpoints\.tablet-down[\s\S]*\.aboutNewImageWrapper[\s\S]*position: relative/);
    expect(source).toMatch(
      /@include breakpoints\.tablet-down[\s\S]*\.aboutNewImageWrapper[\s\S]*width: min\(260px, 60%\)/,
    );
    expect(source).toMatch(/@include breakpoints\.mobile[\s\S]*\.contentSection\.aboutSection[\s\S]*padding: 20px 16px 80px/);
  });

  it('keeps Friends full-width mobile section overrides with the profile feature', async () => {
    const source = await readStyle('src/features/profile/styles/sections/_friends.scss');

    expect(source).toMatch(/\.friendLinkSection[\s\S]*@include breakpoints\.mobile[\s\S]*width: 100%/);
    expect(source).toMatch(/\.friendLinkSection[\s\S]*@include breakpoints\.mobile[\s\S]*margin-left: 0/);
    expect(source).toMatch(/\.friendLinkSection[\s\S]*@include breakpoints\.mobile[\s\S]*scroll-margin-top: var\(--mobile-section-scroll-offset\)/);
    expect(source).toMatch(/\.friendLinkSection[\s\S]*@include breakpoints\.mobile[\s\S]*padding: 20px 16px 80px/);
  });

  it('keeps 1023/1024 literals in the shared breakpoint definitions only', async () => {
    const files = await readScssTree('src');
    const offenders = files.filter(({ path: filePath, source }) => (
      !filePath.endsWith('_breakpoints.scss')
      && /@media \((?:max-width: 1023px|min-width: 1024px)\)/.test(source)
    ));

    expect(offenders.map(({ path: filePath }) => filePath)).toEqual([]);
  });

  it('defines shared scan and feedback keyframes exactly once', async () => {
    const files = await readScssTree('src');
    const source = files.map((file) => file.source).join('\n');

    expect(source.match(/@keyframes scanMove\b/g)).toHaveLength(1);
    expect(source.match(/@keyframes floatUpFade\b/g)).toHaveLength(1);
    expect(source).not.toContain('@keyframes floatUpFadeOut');
  });

  it('keeps shared detail primitives out of feature detail modules', async () => {
    const featureSources = await Promise.all([
      readStyle('src/features/portfolio/styles/WorkDetailView.module.scss'),
      readStyle('src/features/life/styles/LifeDetailView.module.scss'),
      readStyle('src/features/experience/styles/ExperienceDetailView.module.scss'),
    ]);
    const source = featureSources.join('\n');

    expect(source).not.toMatch(/^\.(?:detailContainer|detailTitle|thumbnailGrid|inlineIconLink|iconRipple|copyableTextButton)\b/m);
  });
});

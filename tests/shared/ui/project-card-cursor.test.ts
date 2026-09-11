import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ProjectCard desktop cursor contract', () => {
  it('keeps the native cursor hidden while CustomCursor owns the desktop card', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/shared/ui/ProjectCard.module.scss'),
      'utf8',
    );
    const cardRule = source.slice(
      source.indexOf('.projectCard'),
      source.indexOf('.cardBorderTopLeft'),
    );
    expect(cardRule).toContain('cursor: none');
    expect(cardRule).toMatch(/@include breakpoints\.tablet-down[\s\S]*cursor: default/);
  });
});

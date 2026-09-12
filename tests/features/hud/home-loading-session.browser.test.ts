import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BOOT_COMPLETE_ATTRIBUTE = 'data-initial-boot-complete';

describe('home loading session', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(BOOT_COMPLETE_ATTRIBUTE);
    vi.resetModules();
  });

  afterEach(() => {
    document.documentElement.removeAttribute(BOOT_COMPLETE_ATTRIBUTE);
  });

  it('runs the opening sequence once for each browser document', async () => {
    const session = await import('@/features/hud/model/homeLoadingSession');

    expect(session.isInitialBootSequencePending()).toBe(true);

    session.completeInitialBootSequence();

    expect(session.isInitialBootSequencePending()).toBe(false);
    expect(document.documentElement.getAttribute(BOOT_COMPLETE_ATTRIBUTE)).toBe('true');
  });

  it('recovers completion from the current document after the module reloads', async () => {
    const session = await import('@/features/hud/model/homeLoadingSession');

    session.completeInitialBootSequence();
    vi.resetModules();

    const reloadedSession = await import('@/features/hud/model/homeLoadingSession');

    expect(reloadedSession.isInitialBootSequencePending()).toBe(false);
  });
});

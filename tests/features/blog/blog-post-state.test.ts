import { createActor, fromPromise } from 'xstate';
import { describe, expect, it, vi } from 'vitest';

import {
  blogPostMachine,
  shouldSuppressFallbackBanner,
  type BlogPostArticleInput,
} from '@/features/blog/model/blogPostState';
import type { BlogVariantPayload } from '@/features/blog/model/blogClient';
import type { BlogContentLocale } from '@/features/blog/server/blog';

const variantPayload = {
  meta: {
    slug: 'init',
    title: 'Init',
    date: '2026-01-01',
    excerpt: 'Excerpt',
    tags: [],
    readingMinutes: 1,
    access: { mode: 'public' as const },
  },
  mdxSource: { compiledSource: 'test', frontmatter: {}, scope: {} },
};

function input(overrides: Partial<BlogPostArticleInput> = {}): BlogPostArticleInput {
  return {
    slug: 'init',
    requestedContentLocale: 'en',
    actualContentLocale: 'en',
    requiresAuth: false,
    hydrationReady: true,
    variants: { en: variantPayload },
    ...overrides,
  };
}

describe('blogPostMachine', () => {
  it('resets article state and enters auth checking for a protected article', () => {
    const actor = createActor(blogPostMachine, { input: input() }).start();
    expect(actor.getSnapshot().matches('ready')).toBe(true);

    actor.send({
      type: 'ARTICLE_CHANGED',
      ...input({
        slug: 'protected',
        requestedContentLocale: 'zh-CN',
        actualContentLocale: 'zh-CN',
        requiresAuth: true,
        accessGroup: 'friends',
        variants: {},
      }),
    });

    expect(actor.getSnapshot().matches('authChecking')).toBe(true);
    expect(actor.getSnapshot().context.displayedContentLocale).toBe('zh-CN');
    actor.stop();
  });

  it('fails closed when a protected article lacks an access group', () => {
    const actor = createActor(blogPostMachine, {
      input: input({ requiresAuth: true, variants: {} }),
    }).start();

    expect(actor.getSnapshot().matches('authRequired')).toBe(true);
    expect(actor.getSnapshot().context.authState).toBe('required');
    actor.stop();
  });

  it('cancels a stale variant actor when another locale is selected', async () => {
    const aborted = vi.fn();
    const machine = blogPostMachine.provide({
      actors: {
        loadVariant: fromPromise(async ({ input: actorInput, signal }) => {
          signal.addEventListener('abort', aborted);
          await new Promise(() => {});
          return { ...variantPayload, meta: { ...variantPayload.meta, slug: actorInput.slug } };
        }),
      },
    });
    const actor = createActor(machine, {
      input: input({ requestedContentLocale: 'ja', variants: { en: variantPayload } }),
    }).start();

    expect(actor.getSnapshot().matches('loadingVariant')).toBe(true);
    actor.send({ type: 'SELECT_LOCALE', locale: 'fr' });
    await Promise.resolve();

    expect(aborted).toHaveBeenCalledTimes(1);
    expect(actor.getSnapshot().context.requestedContentLocale).toBe('fr');
    actor.stop();
  });

  it('returns to authRequired when the variant actor rejects with FORBIDDEN', async () => {
    const machine = blogPostMachine.provide({
      actors: {
        loadVariant: fromPromise<BlogVariantPayload, { slug: string; locale: BlogContentLocale }>(
          async () => {
            throw { code: 'FORBIDDEN', message: 'Access grant required.' };
          },
        ),
      },
    });
    const actor = createActor(machine, {
      input: input({ requestedContentLocale: 'ja', variants: { en: variantPayload } }),
    }).start();

    await vi.waitFor(() => expect(actor.getSnapshot().matches('authRequired')).toBe(true));
    expect(actor.getSnapshot().context.authState).toBe('required');
    actor.stop();
  });

  it('uses a cached locale immediately without starting a loader', () => {
    const loader = vi.fn();
    const machine = blogPostMachine.provide({
      actors: { loadVariant: fromPromise(loader) },
    });
    const actor = createActor(machine, {
      input: input({ variants: { en: variantPayload, 'zh-CN': variantPayload } }),
    }).start();

    actor.send({ type: 'SELECT_LOCALE', locale: 'zh-CN' });

    expect(actor.getSnapshot().matches('ready')).toBe(true);
    expect(actor.getSnapshot().context.displayedContentLocale).toBe('zh-CN');
    expect(loader).not.toHaveBeenCalled();
    actor.stop();
  });

  it('retries a failed locale load and caches the successful response', async () => {
    let attempt = 0;
    const machine = blogPostMachine.provide({
      actors: {
        loadVariant: fromPromise<BlogVariantPayload, { slug: string; locale: BlogContentLocale }>(
          async () => {
            attempt += 1;
            if (attempt === 1) throw { code: 'INTERNAL_ERROR', message: 'Temporary failure' };
            return variantPayload;
          },
        ),
      },
    });
    const actor = createActor(machine, {
      input: input({ requestedContentLocale: 'ja', variants: { en: variantPayload } }),
    }).start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('loadFailed')).toBe(true));

    actor.send({ type: 'RETRY' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('ready')).toBe(true));

    expect(attempt).toBe(2);
    expect(actor.getSnapshot().context.variants.ja).toEqual(variantPayload);
    actor.stop();
  });

  it('continues a protected load after an explicit auth grant', async () => {
    const machine = blogPostMachine.provide({
      actors: {
        checkGrant: fromPromise<{ granted: boolean }, { group: string }>(async () => ({
          granted: false,
        })),
        loadVariant: fromPromise<BlogVariantPayload, { slug: string; locale: BlogContentLocale }>(
          async () => variantPayload,
        ),
      },
    });
    const actor = createActor(machine, {
      input: input({ requiresAuth: true, accessGroup: 'friends', variants: {} }),
    }).start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('authRequired')).toBe(true));

    actor.send({ type: 'AUTH_GRANTED' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('ready')).toBe(true));

    expect(actor.getSnapshot().context.authState).toBe('granted');
    actor.stop();
  });
});

describe('shouldSuppressFallbackBanner', () => {
  it('suppresses fallback banner during alternate content-locale display', () => {
    expect(
      shouldSuppressFallbackBanner({
        requestedContentLocale: 'ja',
        displayedContentLocale: 'en',
        actualContentLocale: 'zh-CN',
      }),
    ).toBe(true);
  });
});

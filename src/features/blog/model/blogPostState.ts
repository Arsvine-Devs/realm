import { assign, fromPromise, setup } from 'xstate';

import type { GrantCheckResponse } from '@/shared/lib/content/access-api';
import type { BlogContentLocale } from '../server/blog';
import { buildPostVariantApiPath, type BlogVariantPayload } from './blogClient';

export type BlogPostViewState =
  'authChecking' | 'authRequired' | 'ready' | 'loadingVariant' | 'loadFailed';

export interface BlogPostArticleInput {
  slug: string;
  requestedContentLocale: BlogContentLocale;
  actualContentLocale: BlogContentLocale;
  requiresAuth: boolean;
  accessGroup?: string;
  hydrationReady: boolean;
  variants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
}

interface BlogPostMachineContext extends BlogPostArticleInput {
  displayedContentLocale: BlogContentLocale;
  authState: 'checking' | 'required' | 'granted';
  errorCode: string | null;
  errorMessage: string;
}

type BlogPostMachineEvent =
  | ({ type: 'ARTICLE_CHANGED' } & BlogPostArticleInput)
  | { type: 'SELECT_LOCALE'; locale: BlogContentLocale }
  | { type: 'AUTH_GRANTED' }
  | { type: 'RETRY' };

interface VariantLoadError {
  code: string;
  message: string;
}

interface PostVariantErrorResponse {
  ok: false;
  error: {
    code:
      | 'METHOD_NOT_ALLOWED'
      | 'VALIDATION_FAILED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'INTERNAL_ERROR'
      | 'UPSTREAM_FAILED';
    message: string;
  };
}

interface PostVariantSuccessResponse extends BlogVariantPayload {
  ok: true;
}

type PostVariantResponse = PostVariantSuccessResponse | PostVariantErrorResponse;

function getVariantLoadErrorMessage(response: PostVariantErrorResponse | null) {
  if (!response) return 'Unable to load article content.';
  if (response.error.code === 'NOT_FOUND') return 'Requested article locale is unavailable.';
  if (response.error.code === 'VALIDATION_FAILED') return 'Requested article locale is invalid.';
  return response.error.message || 'Unable to load article content.';
}

const checkGrant = fromPromise<{ granted: boolean }, { group: string }>(
  async ({ input, signal }) => {
    const response = await fetch(`/api/grant-check?group=${encodeURIComponent(input.group)}`, {
      signal,
    });
    const data = (await response.json()) as GrantCheckResponse;
    return { granted: response.ok && data.ok && data.granted };
  },
);

const loadVariant = fromPromise<BlogVariantPayload, { slug: string; locale: BlogContentLocale }>(
  async ({ input, signal }) => {
    const response = await fetch(buildPostVariantApiPath(input.locale, input.slug), {
      signal,
      cache: 'no-store',
    });
    const data = (await response.json()) as PostVariantResponse;

    if (!response.ok || !data.ok) {
      const errorResponse = data && !data.ok ? data : null;
      throw {
        code: errorResponse?.error.code ?? 'INTERNAL_ERROR',
        message: getVariantLoadErrorMessage(errorResponse),
      } satisfies VariantLoadError;
    }

    return data;
  },
);

function initialAuthState(input: BlogPostArticleInput): BlogPostMachineContext['authState'] {
  if (!input.requiresAuth) return 'granted';
  return input.accessGroup ? 'checking' : 'required';
}

export const blogPostMachine = setup({
  types: {
    context: {} as BlogPostMachineContext,
    input: {} as BlogPostArticleInput,
    events: {} as BlogPostMachineEvent,
  },
  actors: { checkGrant, loadVariant },
  guards: {
    hydrationReady: ({ context }) => context.hydrationReady,
    needsAuthCheck: ({ context }) => context.authState === 'checking',
    needsAuth: ({ context }) => context.authState === 'required',
    requestedVariantCached: ({ context }) =>
      Boolean(context.variants[context.requestedContentLocale]),
    grantResolved: ({ event }) =>
      (event as unknown as { output?: { granted?: boolean } }).output?.granted === true,
    forbiddenVariant: ({ event }) =>
      (event as unknown as { error?: VariantLoadError }).error?.code === 'FORBIDDEN',
  },
  actions: {
    replaceArticle: assign(({ event }) => {
      if (event.type !== 'ARTICLE_CHANGED') return {};
      return {
        slug: event.slug,
        requestedContentLocale: event.requestedContentLocale,
        actualContentLocale: event.actualContentLocale,
        requiresAuth: event.requiresAuth,
        accessGroup: event.accessGroup,
        hydrationReady: event.hydrationReady,
        variants: event.variants,
        displayedContentLocale: event.actualContentLocale,
        authState: initialAuthState(event),
        errorCode: null,
        errorMessage: '',
      };
    }),
    selectLocale: assign(({ event }) =>
      event.type === 'SELECT_LOCALE'
        ? { requestedContentLocale: event.locale, errorCode: null, errorMessage: '' }
        : {},
    ),
    grantAccess: assign({ authState: 'granted', errorCode: null, errorMessage: '' }),
    requireAccess: assign({ authState: 'required', errorCode: null, errorMessage: '' }),
    displayRequestedVariant: assign(({ context }) => ({
      displayedContentLocale: context.requestedContentLocale,
      errorCode: null,
      errorMessage: '',
    })),
    cacheLoadedVariant: assign(({ context, event }) => {
      const output = (event as unknown as { output?: BlogVariantPayload }).output;
      if (!output) return {};
      return {
        displayedContentLocale: context.requestedContentLocale,
        variants: {
          ...context.variants,
          [context.requestedContentLocale]: output,
        },
        errorCode: null,
        errorMessage: '',
      };
    }),
    recordVariantError: assign(({ event }) => {
      const error = (event as unknown as { error?: VariantLoadError }).error;
      return {
        errorCode: error?.code ?? 'INTERNAL_ERROR',
        errorMessage: error?.message ?? 'Unable to load article content.',
      };
    }),
    clearError: assign({ errorCode: null, errorMessage: '' }),
  },
}).createMachine({
  id: 'blogPost',
  initial: 'resolving',
  context: ({ input }) => ({
    ...input,
    displayedContentLocale: input.actualContentLocale,
    authState: initialAuthState(input),
    errorCode: null,
    errorMessage: '',
  }),
  on: {
    ARTICLE_CHANGED: { target: '.resolving', actions: 'replaceArticle', reenter: true },
    SELECT_LOCALE: { target: '.resolving', actions: 'selectLocale', reenter: true },
    AUTH_GRANTED: { target: '.resolving', actions: 'grantAccess', reenter: true },
    RETRY: { target: '.resolving', actions: 'clearError', reenter: true },
  },
  states: {
    resolving: {
      always: [
        {
          guard: ({ context }) => context.hydrationReady && context.authState === 'checking',
          target: 'authChecking',
        },
        {
          guard: ({ context }) => context.hydrationReady && context.authState === 'required',
          target: 'authRequired',
        },
        {
          guard: ({ context }) =>
            context.hydrationReady && Boolean(context.variants[context.requestedContentLocale]),
          target: 'ready',
          actions: 'displayRequestedVariant',
        },
        { guard: 'hydrationReady', target: 'loadingVariant' },
      ],
    },
    authChecking: {
      invoke: {
        id: 'checkGrant',
        src: 'checkGrant',
        input: ({ context }) => ({ group: context.accessGroup ?? '' }),
        onDone: [
          { guard: 'grantResolved', target: 'resolving', actions: 'grantAccess' },
          { target: 'authRequired', actions: 'requireAccess' },
        ],
        onError: { target: 'authRequired', actions: 'requireAccess' },
      },
    },
    authRequired: {},
    loadingVariant: {
      invoke: {
        id: 'loadVariant',
        src: 'loadVariant',
        input: ({ context }) => ({ slug: context.slug, locale: context.requestedContentLocale }),
        onDone: { target: 'ready', actions: 'cacheLoadedVariant' },
        onError: [
          { guard: 'forbiddenVariant', target: 'authRequired', actions: 'requireAccess' },
          { target: 'loadFailed', actions: 'recordVariantError' },
        ],
      },
    },
    ready: {},
    loadFailed: {},
  },
});

export function getBlogPostViewState(
  snapshot: {
    matches: (
      value:
        'resolving' | 'authChecking' | 'authRequired' | 'ready' | 'loadingVariant' | 'loadFailed',
    ) => boolean;
  },
  context: BlogPostMachineContext,
): BlogPostViewState {
  if (snapshot.matches('authChecking')) return 'authChecking';
  if (snapshot.matches('authRequired')) return 'authRequired';
  if (snapshot.matches('loadingVariant')) return 'loadingVariant';
  if (snapshot.matches('loadFailed')) return 'loadFailed';
  if (snapshot.matches('ready')) return 'ready';
  if (context.authState === 'checking') return 'authChecking';
  return context.variants[context.requestedContentLocale] ? 'ready' : 'loadingVariant';
}

export function shouldSuppressFallbackBanner({
  requestedContentLocale,
  displayedContentLocale,
  actualContentLocale,
}: {
  requestedContentLocale: BlogContentLocale;
  displayedContentLocale: BlogContentLocale;
  actualContentLocale: BlogContentLocale;
}) {
  return (
    displayedContentLocale !== actualContentLocale || requestedContentLocale !== actualContentLocale
  );
}

'use client';

import { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react';
import { useHudAnimation } from '../../../features/hud/model/HudProvider';
import { useReducedMotion, useResponsive } from '@/shared/hooks/useMediaQuery';
import {
  createContentHashNavigationRequest,
  type ContentHashNavigationRequest,
  getContentSectionHashFromUrl,
  isHomeUrl,
  resolveNavigationTransitionPlan,
  type NavigationTransitionPlan,
} from './contentHashNavigation';
import { AnimationRunController } from './animationRunController';
import { useLayoutAnchors } from './LayoutAnchorsContext';
import { useNavigationRuntime } from './NavigationRuntime';
import { NAVIGATION_COMMIT_TIMEOUT_MS } from '@/shared/lib/ui-timings';

interface TransitionContextValue {
  navigateTo: (url: string, options?: { scroll?: boolean }) => void;
  switchLocale: (url: string) => Promise<void>;
  setBackOverride: (handler: (() => void) | null) => void;
  handleBack: () => void;
  isDetailOpen: () => boolean;
  registerTransitionSurface: (element: HTMLDivElement | null) => void;
  pendingUrl: string | null;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigateTo: () => {},
  switchLocale: async () => {},
  setBackOverride: () => {},
  handleBack: () => {},
  isDetailOpen: () => false,
  registerTransitionSurface: () => {},
  pendingUrl: null,
});

export const useTransition = () => useContext(TransitionContext);

interface TransitionProviderProps {
  children: React.ReactNode;
}

const SLIDE_IN_KF: Keyframe[] = [
  { opacity: 0, transform: 'translate3d(100%, 0, 0)' },
  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
];
const SLIDE_IN_OPTS: KeyframeAnimationOptions = {
  duration: 1800,
  easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
  fill: 'both',
};

const SLIDE_OUT_KF: Keyframe[] = [
  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
  { opacity: 0, transform: 'translate3d(100%, 0, 0)' },
];
const SLIDE_OUT_OPTS: KeyframeAnimationOptions = {
  duration: 500,
  easing: 'ease-in',
  fill: 'forwards',
};

const DIAG_EXPAND_KF: Keyframe[] = [
  { clipPath: 'inset(4% 100% 100% 4%)' },
  { clipPath: 'inset(0 0 0 0)' },
];
const DIAG_EXPAND_OPTS: KeyframeAnimationOptions = {
  duration: 900,
  easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
  fill: 'both',
};

const DIAG_COLLAPSE_KF: Keyframe[] = [
  { clipPath: 'inset(0 0 0 0)' },
  { clipPath: 'inset(100% 0 0 100%)' },
];
const DIAG_COLLAPSE_OPTS: KeyframeAnimationOptions = {
  duration: 400,
  easing: 'ease-in',
  fill: 'forwards',
};

function resetTransitionSurface(wrapper: HTMLDivElement) {
  wrapper.style.opacity = '';
  wrapper.style.transform = '';
  wrapper.style.clipPath = '';
  wrapper.style.transition = '';
}

interface NavStrategyCtx {
  wrapper: HTMLDivElement;
  url: string;
  options?: { scroll?: boolean };
  contentHashRequest: ContentHashNavigationRequest | null;
  pushThen: (target: string, cb: () => void, pushOpts?: { scroll?: boolean }) => void;
  runAnimation: (animation: Animation, onFinished: () => void) => void;
  wapiSlideIn: () => void;
  wapiDiagExpand: () => void;
  revealAfterContentHashAligned: (
    request: ContentHashNavigationRequest,
    onAligned: () => void,
  ) => void;
  retractColumns: (cb: () => void) => void;
  expandColumns: (cb?: () => void) => void;
  processQueue: () => void;
  waitForTransition: (el: HTMLElement, ms: number, cb: () => void) => void;
}

// 每种 transition plan 的执行策略；选择逻辑在 resolveNavigationTransitionPlan，
// 这里只负责"执行"。新增 plan 时加一条策略即可，不必改 navigateTo 本体。
const NAVIGATION_STRATEGIES: Record<
  Exclude<NavigationTransitionPlan, 'samePageHash'>,
  (ctx: NavStrategyCtx) => void
> = {
  homeForwardMobile: (ctx) => {
    ctx.retractColumns(() => {});
    const anim = ctx.wrapper.animate(DIAG_COLLAPSE_KF, DIAG_COLLAPSE_OPTS);
    ctx.runAnimation(anim, () => {
      anim.cancel();
      ctx.wrapper.style.clipPath = 'inset(100%)';
      ctx.pushThen(
        ctx.url,
        () => {
          if (ctx.contentHashRequest) {
            ctx.revealAfterContentHashAligned(ctx.contentHashRequest, ctx.wapiDiagExpand);
            return;
          }
          ctx.wapiDiagExpand();
        },
        ctx.options,
      );
    });
  },
  homeForwardDesktop: (ctx) => {
    ctx.retractColumns(() => {
      ctx.wrapper.style.opacity = '0';
      ctx.pushThen(
        ctx.url,
        () => {
          if (ctx.contentHashRequest) {
            ctx.revealAfterContentHashAligned(ctx.contentHashRequest, ctx.wapiSlideIn);
            return;
          }
          ctx.wapiSlideIn();
        },
        ctx.options,
      );
    });
  },
  crossPageHash: (ctx) => {
    const outAnim = ctx.wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
    ctx.runAnimation(outAnim, () => {
      outAnim.cancel();
      ctx.wrapper.style.opacity = '0';
      ctx.pushThen(
        ctx.url,
        () => {
          if (ctx.contentHashRequest) {
            ctx.revealAfterContentHashAligned(ctx.contentHashRequest, ctx.wapiSlideIn);
            return;
          }
          ctx.wapiSlideIn();
        },
        ctx.options,
      );
    });
  },
  returnHomeMobile: (ctx) => {
    const anim = ctx.wrapper.animate(DIAG_COLLAPSE_KF, DIAG_COLLAPSE_OPTS);
    ctx.runAnimation(anim, () => {
      anim.cancel();
      ctx.wrapper.style.clipPath = 'inset(100%)';
      ctx.pushThen(ctx.url, () => {
        ctx.expandColumns();
        ctx.wapiDiagExpand();
      });
    });
  },
  returnHomeDesktop: (ctx) => {
    const anim = ctx.wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
    ctx.runAnimation(anim, () => {
      anim.cancel();
      ctx.wrapper.style.opacity = '0';
      ctx.pushThen(ctx.url, () => {
        ctx.wrapper.style.opacity = '';
        ctx.expandColumns(() => {
          ctx.processQueue();
        });
      });
    });
  },
  blogDetailFade: (ctx) => {
    ctx.wrapper.style.transition = 'opacity 0.3s ease-out';
    ctx.wrapper.style.opacity = '0';
    ctx.pushThen(
      ctx.url,
      () => {
        ctx.wrapper.style.transition = 'opacity 0.4s ease-in';
        ctx.wrapper.style.opacity = '1';
        ctx.waitForTransition(ctx.wrapper, 500, () => {
          ctx.wrapper.style.transition = '';
          ctx.wrapper.style.opacity = '';
          ctx.processQueue();
        });
      },
      ctx.options,
    );
  },
  standardSlide: (ctx) => {
    const outAnim = ctx.wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
    ctx.runAnimation(outAnim, () => {
      outAnim.cancel();
      ctx.wrapper.style.opacity = '0';
      ctx.pushThen(ctx.url, ctx.wapiSlideIn, ctx.options);
    });
  },
};

export function TransitionProvider({ children }: TransitionProviderProps) {
  const { pathname, asPath, query, push } = useNavigationRuntime();
  const { retractColumns, expandColumns } = useHudAnimation();
  const { isMobile: hookIsMobile } = useResponsive();
  const reducedMotion = useReducedMotion();
  const { align: alignContentHash, cancel: cancelContentHashAlignment } = useLayoutAnchors();
  const runControllerRef = useRef(new AnimationRunController());
  const transitionSurfaceRef = useRef<HTMLDivElement | null>(null);
  const backOverrideRef = useRef<(() => void) | null>(null);
  const navigateToRef = useRef<((url: string, options?: { scroll?: boolean }) => void) | null>(
    null,
  );
  const pendingCommitRef = useRef<(() => void) | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const registerTransitionSurface = useCallback((element: HTMLDivElement | null) => {
    transitionSurfaceRef.current = element;
  }, []);

  const processQueue = () => {
    const nextNav = runControllerRef.current.complete();
    if (nextNav && navigateToRef.current) {
      // Use setTimeout to avoid synchronous nested calls
      setTimeout(() => {
        navigateToRef.current?.(nextNav.url, nextNav.options);
      }, 0);
    }
  };

  const revealAfterContentHashAligned = useCallback(
    (request: ContentHashNavigationRequest, onAligned: () => void) => {
      void alignContentHash(request)
        .then((result) => {
          if (result !== 'cancelled') onAligned();
        })
        .catch((error) => {
          console.error('[navigation] content hash alignment failed:', error);
          onAligned();
        });
    },
    [alignContentHash],
  );

  const navigateTo = useCallback(
    (url: string, options?: { scroll?: boolean }) => {
      const mobile = hookIsMobile;
      const transitionPlan = resolveNavigationTransitionPlan({
        sourcePathname: pathname,
        targetUrl: url,
        mobile,
      });
      if (transitionPlan === 'samePageHash') {
        void push(url, { scroll: false, ...options }).catch((error) => {
          console.error('[navigation] same-page navigation failed:', error);
        });
        return;
      }

      if (reducedMotion) {
        pendingCommitRef.current?.();
        runControllerRef.current.cancel();
        const wrapper = transitionSurfaceRef.current;
        if (wrapper) resetTransitionSurface(wrapper);
        setPendingUrl(url);
        void push(url, { scroll: false, ...options })
          .catch((error) => {
            console.error('[navigation] reduced-motion navigation failed:', error);
          })
          .finally(() => setPendingUrl(null));
        return;
      }

      if (!runControllerRef.current.startOrQueue({ url, options })) {
        return;
      }

      const wrapper = transitionSurfaceRef.current;
      if (!wrapper) {
        runControllerRef.current.cancel();
        void push(url, { scroll: false, ...options }).catch((error) => {
          console.error('[navigation] navigation without transition surface failed:', error);
        });
        return;
      }

      const targetContentHash = getContentSectionHashFromUrl(url);
      const contentHashRequest = targetContentHash
        ? createContentHashNavigationRequest(targetContentHash)
        : null;

      const pushThen = (target: string, cb: () => void, pushOpts?: { scroll?: boolean }) => {
        let removeCleanup = () => false;
        let timeoutId = 0;
        const cleanup = () => {
          if (timeoutId) window.clearTimeout(timeoutId);
          if (pendingCommitRef.current === onComplete) pendingCommitRef.current = null;
          setPendingUrl(null);
          removeCleanup();
        };
        const onComplete = () => {
          cleanup();
          cb();
        };
        pendingCommitRef.current?.();
        pendingCommitRef.current = onComplete;
        setPendingUrl(target);
        removeCleanup = runControllerRef.current.addCleanup(cleanup);
        timeoutId = window.setTimeout(() => {
          if (pendingCommitRef.current === onComplete) {
            resetTransitionSurface(wrapper);
            cleanup();
            runControllerRef.current.cancel();
            processQueue();
          }
        }, NAVIGATION_COMMIT_TIMEOUT_MS);
        void push(target, { scroll: false, ...pushOpts }).catch((error) => {
          console.error('[navigation] route push failed:', error);
          resetTransitionSurface(wrapper);
          cleanup();
          processQueue();
        });
      };

      const runAnimation = (animation: Animation, onFinished: () => void) => {
        runControllerRef.current.runAnimation(animation, onFinished, (error) => {
          console.error('[navigation] transition animation failed:', error);
          processQueue();
        });
      };

      const wapiSlideIn = () => {
        const anim = wrapper.animate(SLIDE_IN_KF, SLIDE_IN_OPTS);
        runAnimation(anim, () => {
          wrapper.style.opacity = '';
          wrapper.style.transform = '';
          anim.cancel();
          processQueue();
        });
      };

      const wapiDiagExpand = () => {
        wrapper.style.opacity = '';
        const anim = wrapper.animate(DIAG_EXPAND_KF, DIAG_EXPAND_OPTS);
        runAnimation(anim, () => {
          wrapper.style.clipPath = '';
          wrapper.style.transform = '';
          anim.cancel();
          processQueue();
        });
      };

      const ctx: NavStrategyCtx = {
        wrapper,
        url,
        options,
        contentHashRequest,
        pushThen,
        runAnimation,
        wapiSlideIn,
        wapiDiagExpand,
        revealAfterContentHashAligned,
        retractColumns,
        expandColumns,
        processQueue,
        waitForTransition: (el, ms, cb) => runControllerRef.current.waitForTransition(el, ms, cb),
      };

      // transitionPlan 已收窄为非 'samePageHash'（上方早 return）
      NAVIGATION_STRATEGIES[transitionPlan](ctx);
    },
    [
      pathname,
      push,
      retractColumns,
      expandColumns,
      hookIsMobile,
      reducedMotion,
      revealAfterContentHashAligned,
    ],
  );

  // Keep navigateToRef updated
  useEffect(() => {
    navigateToRef.current = navigateTo;
  }, [navigateTo]);

  useEffect(() => {
    const onComplete = pendingCommitRef.current;
    if (!onComplete) {
      if (isHomeUrl(asPath) && !runControllerRef.current.isRunning()) expandColumns();
      return;
    }
    onComplete();
  }, [asPath, expandColumns]);

  // 卸载时清理任何未完成的兜底 timer / transitionend 监听，避免在已 stale 的
  // wrapper / state 上触发副作用（"导航卡死 / 双闪烁"竞态来源之一）。
  useEffect(() => {
    const runController = runControllerRef.current;
    return () => {
      cancelContentHashAlignment();
      pendingCommitRef.current?.();
      runController.cancel();
    };
  }, [cancelContentHashAlignment]);

  const setBackOverride = useCallback((handler: (() => void) | null) => {
    backOverrideRef.current = handler;
  }, []);

  const switchLocale = useCallback(
    async (url: string) => {
      pendingCommitRef.current?.();
      runControllerRef.current.cancel();

      const wrapper = transitionSurfaceRef.current;
      if (wrapper) {
        wrapper.style.opacity = '';
        wrapper.style.transform = '';
        wrapper.style.clipPath = '';
        wrapper.style.transition = '';
      }

      await push(url, { scroll: false });
    },
    [push],
  );

  const handleBack = useCallback(() => {
    if (backOverrideRef.current) {
      backOverrideRef.current();
      return;
    }
    if (!isHomeUrl(pathname)) {
      // 用当前 query.locale 拼出 home 路径
      const queryLocale = query.locale;
      const locale = typeof queryLocale === 'string' ? queryLocale : 'zh-CN';
      navigateTo(`/${locale}`);
    }
  }, [pathname, query.locale, navigateTo]);

  const isDetailOpen = useCallback(() => {
    return backOverrideRef.current !== null;
  }, []);

  return (
    <TransitionContext.Provider
      value={{
        navigateTo,
        switchLocale,
        setBackOverride,
        handleBack,
        isDetailOpen,
        registerTransitionSurface,
        pendingUrl,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}

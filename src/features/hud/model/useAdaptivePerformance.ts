import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '@/shared/hooks/useMediaQuery';
import {
  applyPerformanceAttributes,
  buildPerformanceState,
  PERFORMANCE_TIERS,
  performanceTierIndex,
} from '@/shared/lib/performance-tiers';
import { resolveInitialPerformancePolicy } from '@/shared/lib/performance-policy';
import type { AdaptivePerformanceState } from '@/features/hud/contracts/state';
import type { PerformanceReason, PerformanceTier } from '@/shared/contracts/performance';

const MAX_SAMPLE_FRAMES = 120;
const MAX_SAMPLE_DURATION_MS = 2500;
const MIN_AVERAGE_FPS = 45;
const SLOW_FRAME_MS = 32;
const MAX_SLOW_FRAME_RATIO = 0.25;
const HEALTHY_AVERAGE_FPS = 55;
const HEALTHY_SLOW_FRAME_RATIO = 0.1;
const BAD_WINDOWS_TO_DEGRADE = 2;
const GOOD_WINDOWS_TO_RECOVER = 3;
const DEGRADE_COOLDOWN_MS = 5000;
const RECOVER_COOLDOWN_MS = 10000;

interface NavigatorConnectionLike extends Navigator {
  connection?: { saveData?: boolean };
  mozConnection?: { saveData?: boolean };
  webkitConnection?: { saveData?: boolean };
}

function resolveRecoveryCeiling(
  preferenceTier: PerformanceTier,
  preferenceReason: PerformanceReason,
  runtimeTier: PerformanceTier,
): { tier: PerformanceTier; reason: PerformanceReason } {
  if (performanceTierIndex(runtimeTier) > performanceTierIndex(preferenceTier)) {
    return { tier: runtimeTier, reason: 'runtime-fps' };
  }
  return { tier: preferenceTier, reason: preferenceReason };
}

export default function useAdaptivePerformance(
  animationsComplete: boolean,
): AdaptivePerformanceState {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState(() => buildPerformanceState('full', null));
  const stateRef = useRef(state);
  const [isPageVisible, setIsPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [policyReady, setPolicyReady] = useState(false);
  const preferenceTierRef = useRef<PerformanceTier>('full');
  const preferenceReasonRef = useRef<PerformanceReason>(null);
  const runtimeCeilingRef = useRef<PerformanceTier>('full');
  const lastTierChangeRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const nav = navigator as NavigatorConnectionLike;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const preference = resolveInitialPerformancePolicy({
      reducedMotion,
      saveData: Boolean(connection?.saveData),
    });
    preferenceTierRef.current = preference.tier;
    preferenceReasonRef.current = preference.reason;
    const ceiling = resolveRecoveryCeiling(
      preferenceTierRef.current,
      preferenceReasonRef.current,
      runtimeCeilingRef.current,
    );
    // Client-only user preferences are unavailable during SSR; reconcile after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPolicyReady(true);
    setState((current) =>
      performanceTierIndex(current.performanceTier) < performanceTierIndex(ceiling.tier)
        ? buildPerformanceState(ceiling.tier, ceiling.reason)
        : current,
    );
  }, [reducedMotion]);

  useEffect(() => {
    if (!policyReady) return;
    applyPerformanceAttributes(document.documentElement, state);
  }, [policyReady, state]);

  useEffect(() => {
    if (!policyReady || !animationsComplete || !isPageVisible || reducedMotion) return;

    let rafId = 0;
    let startTime: number | null = null;
    let previousTime = 0;
    let frameCount = 0;
    let slowFrameCount = 0;
    let badWindows = 0;
    let goodWindows = 0;

    const resetWindow = () => {
      startTime = null;
      previousTime = 0;
      frameCount = 0;
      slowFrameCount = 0;
    };

    const evaluateWindow = (elapsedMs: number, timestamp: number) => {
      if (!frameCount || elapsedMs <= 0) return;
      const averageFps = frameCount / (elapsedMs / 1000);
      const slowFrameRatio = slowFrameCount / frameCount;
      const poor = averageFps < MIN_AVERAGE_FPS || slowFrameRatio >= MAX_SLOW_FRAME_RATIO;
      const healthy =
        averageFps >= HEALTHY_AVERAGE_FPS && slowFrameRatio <= HEALTHY_SLOW_FRAME_RATIO;

      if (poor) {
        badWindows += 1;
        goodWindows = 0;
      } else if (healthy) {
        goodWindows += 1;
        badWindows = 0;
      } else {
        badWindows = 0;
        goodWindows = 0;
      }

      const current = stateRef.current;
      const index = performanceTierIndex(current.performanceTier);
      const sinceChange = timestamp - lastTierChangeRef.current;
      let next = current;

      if (poor && current.performanceTier === 'full') {
        badWindows = 0;
        runtimeCeilingRef.current = 'logo-reduced';
        lastTierChangeRef.current = timestamp;
        next = buildPerformanceState('logo-reduced', 'runtime-fps');
      } else if (
        badWindows >= BAD_WINDOWS_TO_DEGRADE &&
        index < PERFORMANCE_TIERS.length - 1 &&
        sinceChange >= DEGRADE_COOLDOWN_MS
      ) {
        badWindows = 0;
        lastTierChangeRef.current = timestamp;
        next = buildPerformanceState(PERFORMANCE_TIERS[index + 1], 'runtime-fps');
      } else {
        const ceiling = resolveRecoveryCeiling(
          preferenceTierRef.current,
          preferenceReasonRef.current,
          runtimeCeilingRef.current,
        );
        const maxIndex = performanceTierIndex(ceiling.tier);
        if (
          goodWindows >= GOOD_WINDOWS_TO_RECOVER &&
          index > maxIndex &&
          sinceChange >= RECOVER_COOLDOWN_MS
        ) {
          goodWindows = 0;
          lastTierChangeRef.current = timestamp;
          next = buildPerformanceState(
            PERFORMANCE_TIERS[index - 1],
            index - 1 === maxIndex ? ceiling.reason : 'runtime-fps',
          );
        }
      }

      if (next !== current) {
        stateRef.current = next;
        setState(next);
      }
    };

    const sample = (timestamp: number) => {
      if (document.hidden) return;
      if (startTime === null) {
        startTime = timestamp;
        previousTime = timestamp;
        rafId = window.requestAnimationFrame(sample);
        return;
      }
      const frameTime = timestamp - previousTime;
      previousTime = timestamp;
      frameCount += 1;
      if (frameTime > SLOW_FRAME_MS) slowFrameCount += 1;
      const elapsedMs = timestamp - startTime;
      if (frameCount >= MAX_SAMPLE_FRAMES || elapsedMs >= MAX_SAMPLE_DURATION_MS) {
        evaluateWindow(elapsedMs, timestamp);
        resetWindow();
      }
      rafId = window.requestAnimationFrame(sample);
    };

    rafId = window.requestAnimationFrame(sample);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [animationsComplete, isPageVisible, policyReady, reducedMotion]);

  return state;
}

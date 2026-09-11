import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import type { AnimationSequenceState, ColumnPhase } from '@/features/hud/contracts/state';
import { useSafeTimeouts } from '../../../shared/hooks/useSafeTimeouts';
import { useResponsive } from '@/shared/hooks/useMediaQuery';
import { completeInitialBootSequence, isInitialBootSequencePending } from './homeLoadingSession';

export default function useAnimationSequence(): AnimationSequenceState {
  const [initialBootPending] = useState(isInitialBootSequencePending);
  const initialSequenceComplete = !initialBootPending;
  const [isLoading, setIsLoading] = useState(initialBootPending);
  const [mainVisible, setMainVisible] = useState(initialSequenceComplete);
  const [linesAnimated, setLinesAnimated] = useState(initialSequenceComplete);
  const [hudVisible, setHudVisible] = useState(initialSequenceComplete);
  const [leftPanelAnimated, setLeftPanelAnimated] = useState(initialSequenceComplete);
  const [textVisible, setTextVisible] = useState(initialSequenceComplete);
  const [animationsComplete, setAnimationsComplete] = useState(initialSequenceComplete);
  const [leversVisible, setLeversVisible] = useState(initialSequenceComplete);
  const [columnPhase, setColumnPhase] = useState<ColumnPhase>('idle');

  // Vertical line pulse animation states
  const [pulsingNormalIndices, setPulsingNormalIndices] = useState<number[] | null>(null);
  const [pulsingReverseIndices, setPulsingReverseIndices] = useState<number[] | null>(null);

  const safeTimers = useSafeTimeouts();
  const { isMobile: hookIsMobile } = useResponsive();

  useLayoutEffect(() => {
    if (initialSequenceComplete) {
      completeInitialBootSequence();
    }
  }, [initialSequenceComplete]);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setMainVisible(true);

    const isMobile = hookIsMobile;

    if (isMobile) {
      safeTimers.setTimeout(() => {
        setLeftPanelAnimated(true);
      }, 100);
      safeTimers.setTimeout(() => {
        setLeversVisible(true);
      }, 300);
      safeTimers.setTimeout(() => {
        setLinesAnimated(true);
      }, 200);
      safeTimers.setTimeout(() => {
        setHudVisible(true);
      }, 400);
      safeTimers.setTimeout(() => {
        setTextVisible(true);
      }, 500);
      safeTimers.setTimeout(() => {
        setAnimationsComplete(true);
      }, 1200);
    } else {
      safeTimers.setTimeout(() => {
        setLeftPanelAnimated(true);
        safeTimers.setTimeout(() => {
          setLeversVisible(true);
        }, 800);
      }, 200);
      safeTimers.setTimeout(() => {
        setLinesAnimated(true);
      }, 1000);
      safeTimers.setTimeout(() => {
        setHudVisible(true);
      }, 2200);
      safeTimers.setTimeout(() => {
        setTextVisible(true);
      }, 2500);
      safeTimers.setTimeout(() => {
        setAnimationsComplete(true);
      }, 4200);
    }
  };

  // Vertical line pulse animation
  useEffect(() => {
    if (!animationsComplete) return;

    const staggerDelay = 200;
    const animationDuration = 2000;
    const pulseIntervalId = safeTimers.setInterval(
      () => {
        setPulsingNormalIndices(null);
        setPulsingReverseIndices(null);

        const indices: number[] = [];
        while (indices.length < 3) {
          const randomIndex = Math.floor(Math.random() * 6);
          if (!indices.includes(randomIndex)) {
            indices.push(randomIndex);
          }
        }

        safeTimers.setTimeout(() => {
          setPulsingNormalIndices([indices[0]]);
          setPulsingReverseIndices(null);
        }, 0);

        safeTimers.setTimeout(() => {
          setPulsingNormalIndices((prev) => (prev ? [...prev, indices[1]] : [indices[1]]));
        }, staggerDelay);

        safeTimers.setTimeout(() => {
          setPulsingReverseIndices([indices[2]]);
        }, staggerDelay * 2);

        safeTimers.setTimeout(
          () => {
            setPulsingNormalIndices(null);
            setPulsingReverseIndices(null);
          },
          staggerDelay * 2 + animationDuration,
        );
      },
      2000 + staggerDelay * 2,
    );
    // safeTimers 引用稳定，不放进依赖；只依赖 animationsComplete

    return () => {
      safeTimers.clearInterval(pulseIntervalId);
    };
  }, [animationsComplete, safeTimers]);

  const retractColumns = useCallback(
    (onComplete: () => void) => {
      setAnimationsComplete(false);
      setPulsingNormalIndices(null);
      setPulsingReverseIndices(null);
      setColumnPhase('retracting');

      safeTimers.setTimeout(() => {
        setLinesAnimated(false);
        setColumnPhase('idle');
        onComplete();
      }, 450);
    },
    [safeTimers],
  );

  const expandColumns = useCallback(
    (onComplete?: () => void) => {
      setColumnPhase('expanding');

      safeTimers.setTimeout(() => setLinesAnimated(true), 30);
      safeTimers.setTimeout(() => setHudVisible(true), 250);
      safeTimers.setTimeout(() => setTextVisible(true), 300);
      safeTimers.setTimeout(() => {
        setAnimationsComplete(true);
        setColumnPhase('idle');
        onComplete?.();
      }, 800);
    },
    [safeTimers],
  );

  return {
    isLoading,
    mainVisible,
    linesAnimated,
    hudVisible,
    leftPanelAnimated,
    textVisible,
    animationsComplete,
    leversVisible,
    pulsingNormalIndices,
    pulsingReverseIndices,
    handleLoadingComplete,
    columnPhase,
    retractColumns,
    expandColumns,
  };
}

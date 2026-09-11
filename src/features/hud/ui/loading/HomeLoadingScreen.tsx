import React, { useCallback, useEffect, useState, useRef } from 'react';
import styles from './HomeLoadingScreen.module.scss';
import gsap from 'gsap';
import { useLoadingSystem } from '@/features/hud/model/useLoadingSystem';
import {
  completeInitialBootSequence,
  isInitialBootSequencePending,
} from '@/features/hud/model/homeLoadingSession';
import { useReducedMotion, useResponsive } from '@/shared/hooks/useMediaQuery';
import { useHudPerformance } from '../../model/HudProvider';
import TerminalConsole, { TerminalConsoleRef } from './parts/TerminalConsole';
import IndustrialHud, { IndustrialHudRef } from './parts/IndustrialHud';
import LogoTitle, { LogoTitleRef } from './parts/LogoTitle';
import SplitTransition, { SplitTransitionRef } from './parts/SplitTransition';

const PROGRESS_BAR_CHARS = '/'.repeat(300);

export function collectGsapTargets<T>(targets: Array<T | null | undefined>): T[] {
  return targets.filter((target): target is T => target !== null && target !== undefined);
}

const HomeLoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(isInitialBootSequencePending);
  const [bootReducedMode, setBootReducedMode] = useState(false);
  const [loadingUiReady, setLoadingUiReady] = useState(false);
  const { progress, logLines, showSplitLines, loading } = useLoadingSystem(
    loadingUiReady && !bootReducedMode,
  );
  const { isMobile } = useResponsive();
  const reducedMotion = useReducedMotion();
  const { allowDecorativeMotion } = useHudPerformance();
  const reducedVisualMode = reducedMotion || !allowDecorativeMotion || bootReducedMode;

  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(false);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const completeBootSequence = useCallback(() => {
    completeInitialBootSequence();
    if (completionNotifiedRef.current) return;
    completionNotifiedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the bootstrap script resolves performance tier before hydration; this effect copies that external DOM snapshot into React after mount
    setBootReducedMode(document.documentElement.getAttribute('data-decorative-motion') === 'off');
  }, []);

  // DOM refs
  const wastelandBgRef = useRef<HTMLDivElement>(null);
  const loadingScreenRef = useRef<HTMLDivElement>(null);
  const progressAreaRef = useRef<HTMLDivElement>(null);

  // Component refs
  const consoleRef = useRef<TerminalConsoleRef>(null);
  const hudRef = useRef<IndustrialHudRef>(null);
  const logoRef = useRef<LogoTitleRef>(null);
  const splitRef = useRef<SplitTransitionRef>(null);

  // ===================== Master entrance + loop animations =====================
  useEffect(() => {
    if (!visible) return;

    if (bootReducedMode) {
      const settleTimer = window.setTimeout(() => {
        completeBootSequence();
        setVisible(false);
      }, 0);
      return () => window.clearTimeout(settleTimer);
    }

    const timelines: gsap.core.Timeline[] = [];

    const logoTransform = isMobile ? { yPercent: -50 } : { xPercent: -50, yPercent: -50 };
    const loadingTargets = collectGsapTargets([wastelandBgRef.current, loadingScreenRef.current]);

    // --- Reduced motion: show everything immediately ---
    if (reducedVisualMode) {
      if (loadingTargets.length > 0) {
        gsap.set(loadingTargets, { opacity: 1 });
      }
      if (hudRef.current?.container) gsap.set(hudRef.current.container, { opacity: 1 });
      if (logoRef.current?.container)
        gsap.set(logoRef.current.container, { opacity: 1, scaleY: 1, ...logoTransform });
      if (consoleRef.current?.container) gsap.set(consoleRef.current.container, { opacity: 1 });
      if (progressAreaRef.current) {
        gsap.set(progressAreaRef.current, { opacity: 1, y: 0 });
      }
      logoRef.current?.animateIn(0);
      const readyTimer = setTimeout(() => setLoadingUiReady(true), 0);
      return () => clearTimeout(readyTimer);
    }

    // --- Entrance timeline ---
    const entranceTl = gsap.timeline();
    timelines.push(entranceTl);

    if (loadingTargets.length > 0) {
      gsap.set(loadingTargets, { opacity: 0 });
    }
    if (hudRef.current?.container) gsap.set(hudRef.current.container, { opacity: 0 });
    if (logoRef.current?.container)
      gsap.set(logoRef.current.container, {
        opacity: 1,
        scaleY: 0,
        transformOrigin: 'center center',
        ...logoTransform,
      });
    if (consoleRef.current?.container) gsap.set(consoleRef.current.container, { opacity: 0 });
    if (progressAreaRef.current) {
      gsap.set(progressAreaRef.current, { opacity: 0, y: 15 });
    }

    entranceTl
      .to(
        [wastelandBgRef.current, loadingScreenRef.current],
        { opacity: 1, duration: 0.5, ease: 'power1.out' },
        0,
      )
      .to(logoRef.current?.container || null, { scaleY: 1, duration: 0.6, ease: 'power2.out' }, 0.2)
      .to(hudRef.current?.container || null, { opacity: 1, duration: 1.0, ease: 'power1.out' }, 0.3)
      .call(
        () => {
          // Call Logo component animation method
          logoRef.current?.animateIn(0.5);
          // Call HUD animations
          hudRef.current?.initAnimations();
        },
        [],
        0.5,
      )
      .to(
        logoRef.current?.container || null,
        { opacity: 0.15, duration: 1.0, ease: 'power2.inOut' },
        3.5,
      )
      .to(consoleRef.current?.container || null, { opacity: 1, duration: 0.7, ease: 'none' }, 3.5)
      .to(progressAreaRef.current, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 3.5)
      .call(() => setLoadingUiReady(true), [], 4.0); // Start real loading after logo dims and console appears

    return () => {
      timelines.forEach((tl) => tl.kill());
    };
  }, [bootReducedMode, completeBootSequence, isMobile, reducedVisualMode, visible]);

  // ===================== Split lines animation =====================
  useEffect(() => {
    if (showSplitLines && splitRef.current) {
      splitRef.current.animateOut();
    }
  }, [showSplitLines]);

  // ===================== Exit animation (reveal wipe) =====================
  useEffect(() => {
    if (loading) return;

    completeBootSequence();

    const wipeDur = reducedVisualMode ? 0.6 : 1.2;
    const subDur = reducedVisualMode ? 0.3 : 0.5;
    const loadingTargets = collectGsapTargets([wastelandBgRef.current, loadingScreenRef.current]);
    if (loadingTargets.length === 0) {
      setVisible(false);
      return;
    }

    const exitTl = gsap.timeline({
      onComplete: () => setVisible(false),
    });

    exitTl.fromTo(
      loadingTargets,
      { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
      {
        clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
        duration: wipeDur,
        ease: 'power2.inOut',
      },
      0,
    );

    exitTl.to(
      loadingTargets,
      {
        opacity: 0,
        duration: wipeDur + 0.3,
        ease: 'power2.inOut',
      },
      0,
    );

    // Make HUD, logo, and console disappear slightly faster (more compact)
    if (hudRef.current?.container)
      exitTl.to(hudRef.current.container, { opacity: 0, duration: subDur * 0.7 }, 0);
    if (logoRef.current?.container)
      exitTl.to(logoRef.current.container, { opacity: 0, duration: subDur * 0.7 }, 0);
    if (consoleRef.current?.container)
      exitTl.to(consoleRef.current.container, { opacity: 0, duration: subDur * 0.7 }, 0);
    if (progressAreaRef.current)
      exitTl.to(progressAreaRef.current, { opacity: 0, duration: subDur * 0.7 }, 0);
    if (hudRef.current?.hudElements)
      exitTl.to(hudRef.current.hudElements, { opacity: 0, duration: subDur * 0.7 }, 0);

    const extraElements = splitRef.current?.getElements() || [];
    if (extraElements.length > 0)
      exitTl.to(extraElements, { opacity: 0, duration: subDur * 0.7 }, 0);

    return () => {
      exitTl.kill();
    };
  }, [completeBootSequence, loading, reducedVisualMode]);

  return visible ? (
    <>
      <div ref={wastelandBgRef} className={styles.wasteland_background} style={{ opacity: 0 }} />

      <div ref={loadingScreenRef} className={styles.loading_screen} style={{ opacity: 0 }}>
        <SplitTransition ref={splitRef} show={showSplitLines} />

        <div className={styles.grid_overlay}></div>

        <IndustrialHud ref={hudRef} />

        <div className={styles.loading_content}>
          <LogoTitle ref={logoRef} />
          <TerminalConsole ref={consoleRef} logLines={logLines} />
        </div>

        <div
          ref={progressAreaRef}
          className={styles.progress_area}
          style={{ opacity: 0, transform: 'translateY(15px)' }}
        >
          <div className={styles.text_progress_container}>
            <div className={styles.text_progress_base}>
              <span className={styles.progress_prefix}>&gt; SYSTEM INITIALIZING... [</span>
              <span className={styles.progress_bar_chars}>{PROGRESS_BAR_CHARS}</span>
              <span className={styles.progress_suffix}>
                ] {Math.floor(progress).toString().padStart(3, ' ')}%
              </span>
            </div>
            <div
              className={styles.text_progress_fill}
              style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
            >
              <span className={styles.progress_prefix}>&gt; SYSTEM INITIALIZING... [</span>
              <span className={styles.progress_bar_chars}>{PROGRESS_BAR_CHARS}</span>
              <span className={styles.progress_suffix}>
                ] {Math.floor(progress).toString().padStart(3, ' ')}%
              </span>
            </div>
          </div>
        </div>

        <div className={styles.reduced_status} aria-hidden="true">
          BOOT SEQUENCE
        </div>
      </div>
    </>
  ) : null;
};

export default HomeLoadingScreen;

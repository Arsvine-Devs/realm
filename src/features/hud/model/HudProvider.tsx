'use client';

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import {
  getHudTypingEnabledSnapshot,
  subscribeHudTypingVisibility,
} from '@/shared/lib/hud-typing-visibility';
import type {
  AdaptivePerformanceState,
  AnimationSequenceState,
  ColumnHoverState,
  EnvParamsTypingState,
  FateTypingState,
  PowerSystemState,
  RealtimeStatsState,
} from '@/features/hud/contracts/state';
import useAdaptivePerformance from './useAdaptivePerformance';
import useAnimationSequence from './useAnimationSequence';
import useColumnHover from './useColumnHover';
import { useEnvParamsTypingEffect } from './useEnvParamsTypingEffect';
import { useFateTypingEffect } from './useFateTypingEffect';
import usePowerSystem from './usePowerSystem';
import useRealtimeStats from './useRealtimeStats';

type HudTypingState = FateTypingState & EnvParamsTypingState;

const AnimationContext = createContext<AnimationSequenceState | null>(null);
const PerformanceContext = createContext<AdaptivePerformanceState | null>(null);
const PowerContext = createContext<PowerSystemState | null>(null);
const StatsContext = createContext<RealtimeStatsState | null>(null);
const TypingContext = createContext<HudTypingState | null>(null);
const ColumnHoverContext = createContext<ColumnHoverState | null>(null);

function useRequiredContext<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be used within HudProvider`);
  return value;
}

export function HudProvider({ children }: { children: ReactNode }) {
  const animation = useAnimationSequence();
  const performance = useAdaptivePerformance(animation.animationsComplete);
  const power = usePowerSystem(animation.mainVisible);
  const stats = useRealtimeStats();
  const hudTypingEnabled = useSyncExternalStore(
    subscribeHudTypingVisibility,
    getHudTypingEnabledSnapshot,
    getHudTypingEnabledSnapshot,
  );
  const fateTyping = useFateTypingEffect(animation.textVisible && hudTypingEnabled);
  const envTyping = useEnvParamsTypingEffect(animation.textVisible, hudTypingEnabled);
  const columnHover = useColumnHover();

  const animationValue = useMemo<AnimationSequenceState>(
    () => ({
      isLoading: animation.isLoading,
      mainVisible: animation.mainVisible,
      linesAnimated: animation.linesAnimated,
      hudVisible: animation.hudVisible,
      leftPanelAnimated: animation.leftPanelAnimated,
      textVisible: animation.textVisible,
      animationsComplete: animation.animationsComplete,
      leversVisible: animation.leversVisible,
      pulsingNormalIndices: animation.pulsingNormalIndices,
      pulsingReverseIndices: animation.pulsingReverseIndices,
      handleLoadingComplete: animation.handleLoadingComplete,
      columnPhase: animation.columnPhase,
      retractColumns: animation.retractColumns,
      expandColumns: animation.expandColumns,
    }),
    [
      animation.animationsComplete,
      animation.columnPhase,
      animation.expandColumns,
      animation.handleLoadingComplete,
      animation.hudVisible,
      animation.isLoading,
      animation.leftPanelAnimated,
      animation.leversVisible,
      animation.linesAnimated,
      animation.mainVisible,
      animation.pulsingNormalIndices,
      animation.pulsingReverseIndices,
      animation.retractColumns,
      animation.textVisible,
    ],
  );
  const performanceValue = useMemo<AdaptivePerformanceState>(
    () => ({
      performanceTier: performance.performanceTier,
      performanceReason: performance.performanceReason,
      allowHeavyCssEffects: performance.allowHeavyCssEffects,
      allowDecorativeMotion: performance.allowDecorativeMotion,
      allowLogoEffects: performance.allowLogoEffects,
      allowAmbientWebGL: performance.allowAmbientWebGL,
      allowInteractiveWebGL: performance.allowInteractiveWebGL,
      allowCustomCursor: performance.allowCustomCursor,
    }),
    [
      performance.allowAmbientWebGL,
      performance.allowCustomCursor,
      performance.allowDecorativeMotion,
      performance.allowHeavyCssEffects,
      performance.allowInteractiveWebGL,
      performance.allowLogoEffects,
      performance.performanceReason,
      performance.performanceTier,
    ],
  );
  const powerValue = useMemo<PowerSystemState>(
    () => ({
      powerLevel: power.powerLevel,
      isInverted: power.isInverted,
      isTesseractActivated: power.isTesseractActivated,
      isDischarging: power.isDischarging,
      chargeBattery: power.chargeBattery,
      deactivateTesseract: power.deactivateTesseract,
      handleActivateTesseract: power.handleActivateTesseract,
      handleDischargeLeverPull: power.handleDischargeLeverPull,
    }),
    [
      power.chargeBattery,
      power.deactivateTesseract,
      power.handleActivateTesseract,
      power.handleDischargeLeverPull,
      power.isDischarging,
      power.isInverted,
      power.isTesseractActivated,
      power.powerLevel,
    ],
  );
  const statsValue = useMemo<RealtimeStatsState>(
    () => ({
      currentTime: stats.currentTime,
      currentVisitDuration: stats.currentVisitDuration,
      runtime: stats.runtime,
    }),
    [stats.currentTime, stats.currentVisitDuration, stats.runtime],
  );
  const typingValue = useMemo<HudTypingState>(
    () => ({
      displayedFateText: fateTyping.displayedFateText,
      isFateTypingActive: fateTyping.isFateTypingActive,
      displayedEnvParams: envTyping.displayedEnvParams,
      isEnvParamsTyping: envTyping.isEnvParamsTyping,
      envData: envTyping.envData,
      envDataVersion: envTyping.envDataVersion,
      envArtifactStage: envTyping.envArtifactStage,
    }),
    [
      envTyping.displayedEnvParams,
      envTyping.envArtifactStage,
      envTyping.envData,
      envTyping.envDataVersion,
      envTyping.isEnvParamsTyping,
      fateTyping.displayedFateText,
      fateTyping.isFateTypingActive,
    ],
  );
  const columnHoverValue = useMemo<ColumnHoverState>(
    () => ({
      branchText1: columnHover.branchText1,
      branchText2: columnHover.branchText2,
      branchText3: columnHover.branchText3,
      branchText4: columnHover.branchText4,
      randomHudTexts: columnHover.randomHudTexts,
      handleColumnMouseEnter: columnHover.handleColumnMouseEnter,
      handleColumnMouseLeave: columnHover.handleColumnMouseLeave,
    }),
    [
      columnHover.branchText1,
      columnHover.branchText2,
      columnHover.branchText3,
      columnHover.branchText4,
      columnHover.handleColumnMouseEnter,
      columnHover.handleColumnMouseLeave,
      columnHover.randomHudTexts,
    ],
  );

  return (
    <AnimationContext.Provider value={animationValue}>
      <PerformanceContext.Provider value={performanceValue}>
        <PowerContext.Provider value={powerValue}>
          <StatsContext.Provider value={statsValue}>
            <TypingContext.Provider value={typingValue}>
              <ColumnHoverContext.Provider value={columnHoverValue}>
                {children}
              </ColumnHoverContext.Provider>
            </TypingContext.Provider>
          </StatsContext.Provider>
        </PowerContext.Provider>
      </PerformanceContext.Provider>
    </AnimationContext.Provider>
  );
}

export const useHudAnimation = () => useRequiredContext(AnimationContext, 'useHudAnimation');
export const useHudPerformance = () => useRequiredContext(PerformanceContext, 'useHudPerformance');
export const useHudPower = () => useRequiredContext(PowerContext, 'useHudPower');
export const useHudStats = () => useRequiredContext(StatsContext, 'useHudStats');
export const useHudTyping = () => useRequiredContext(TypingContext, 'useHudTyping');
export const useHudColumnHover = () => useRequiredContext(ColumnHoverContext, 'useHudColumnHover');

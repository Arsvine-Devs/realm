import { memo } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let powerLevel = 50;
const powerRender = vi.fn();
const performanceRender = vi.fn();

vi.mock('@/shared/lib/hud-typing-visibility', () => ({
  subscribeHudTypingVisibility: () => () => {},
  getHudTypingEnabledSnapshot: () => true,
}));

vi.mock('@/features/hud/model/useAnimationSequence', () => ({
  default: () => ({
    isLoading: false,
    mainVisible: true,
    linesAnimated: true,
    hudVisible: true,
    leftPanelAnimated: true,
    textVisible: true,
    animationsComplete: true,
    leversVisible: true,
    pulsingNormalIndices: [],
    pulsingReverseIndices: [],
    handleLoadingComplete: vi.fn(),
    columnPhase: 'expanded',
    retractColumns: vi.fn(),
    expandColumns: vi.fn(),
  }),
}));
vi.mock('@/features/hud/model/useAdaptivePerformance', () => ({
  default: () => ({
    performanceTier: 'full',
    performanceReason: 'default',
    allowHeavyCssEffects: true,
    allowDecorativeMotion: true,
    allowLogoEffects: true,
    allowAmbientWebGL: true,
    allowInteractiveWebGL: true,
    allowCustomCursor: true,
  }),
}));
vi.mock('@/features/hud/model/usePowerSystem', () => ({
  default: () => ({
    powerLevel,
    isInverted: false,
    isTesseractActivated: false,
    isDischarging: false,
    chargeBattery: vi.fn(),
    deactivateTesseract: vi.fn(),
    handleActivateTesseract: vi.fn(),
    handleDischargeLeverPull: vi.fn(),
  }),
}));
vi.mock('@/features/hud/model/useRealtimeStats', () => ({
  default: () => ({ currentTime: '00:00', currentVisitDuration: '0', runtime: '0' }),
}));
vi.mock('@/features/hud/model/useFateTypingEffect', () => ({
  useFateTypingEffect: () => ({ displayedFateText: '', isFateTypingActive: false }),
}));
vi.mock('@/features/hud/model/useEnvParamsTypingEffect', () => ({
  useEnvParamsTypingEffect: () => ({
    displayedEnvParams: '',
    isEnvParamsTyping: false,
    envData: null,
    envDataVersion: 0,
    envArtifactStage: 0,
  }),
}));
vi.mock('@/features/hud/model/useColumnHover', () => ({
  default: () => ({
    branchText1: '',
    branchText2: '',
    branchText3: '',
    branchText4: '',
    randomHudTexts: [],
    handleColumnMouseEnter: vi.fn(),
    handleColumnMouseLeave: vi.fn(),
  }),
}));

import { HudProvider, useHudPerformance, useHudPower } from '@/features/hud/model/HudProvider';

const PowerConsumer = memo(function PowerConsumer() {
  useHudPower();
  powerRender();
  return null;
});

const PerformanceConsumer = memo(function PerformanceConsumer() {
  useHudPerformance();
  performanceRender();
  return null;
});

function TestTree() {
  return (
    <HudProvider>
      <PowerConsumer />
      <PerformanceConsumer />
    </HudProvider>
  );
}

afterEach(() => {
  cleanup();
  powerLevel = 50;
  vi.clearAllMocks();
});

describe('HudProvider domain isolation', () => {
  it('does not rerender performance consumers when only power changes', () => {
    const view = render(<TestTree />);
    expect(powerRender).toHaveBeenCalledTimes(1);
    expect(performanceRender).toHaveBeenCalledTimes(1);

    powerLevel = 75;
    view.rerender(<TestTree />);

    expect(powerRender).toHaveBeenCalledTimes(2);
    expect(performanceRender).toHaveBeenCalledTimes(1);
  });
});

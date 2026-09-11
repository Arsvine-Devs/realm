import type {
  AdaptivePerformanceState,
  PerformanceReason,
  PerformanceTier,
} from '@/shared/contracts/performance';

type PerformanceCapabilities = Omit<
  AdaptivePerformanceState,
  'performanceTier' | 'performanceReason'
>;

export const PERFORMANCE_TIERS: readonly PerformanceTier[] = [
  'full',
  'logo-reduced',
  'ambient-reduced',
  'css-reduced',
  'motion-reduced',
  'webgl-reduced',
  'minimal',
];

export const PERFORMANCE_CAPABILITIES: Readonly<Record<PerformanceTier, PerformanceCapabilities>> =
  {
    full: {
      allowLogoEffects: true,
      allowAmbientWebGL: true,
      allowHeavyCssEffects: true,
      allowDecorativeMotion: true,
      allowInteractiveWebGL: true,
      allowCustomCursor: true,
    },
    'logo-reduced': {
      allowLogoEffects: false,
      allowAmbientWebGL: true,
      allowHeavyCssEffects: true,
      allowDecorativeMotion: true,
      allowInteractiveWebGL: true,
      allowCustomCursor: true,
    },
    'ambient-reduced': {
      allowLogoEffects: false,
      allowAmbientWebGL: false,
      allowHeavyCssEffects: true,
      allowDecorativeMotion: true,
      allowInteractiveWebGL: true,
      allowCustomCursor: true,
    },
    'css-reduced': {
      allowLogoEffects: false,
      allowAmbientWebGL: false,
      allowHeavyCssEffects: false,
      allowDecorativeMotion: true,
      allowInteractiveWebGL: true,
      allowCustomCursor: true,
    },
    'motion-reduced': {
      allowLogoEffects: false,
      allowAmbientWebGL: false,
      allowHeavyCssEffects: false,
      allowDecorativeMotion: false,
      allowInteractiveWebGL: true,
      allowCustomCursor: true,
    },
    'webgl-reduced': {
      allowLogoEffects: false,
      allowAmbientWebGL: false,
      allowHeavyCssEffects: false,
      allowDecorativeMotion: false,
      allowInteractiveWebGL: false,
      allowCustomCursor: true,
    },
    minimal: {
      allowLogoEffects: false,
      allowAmbientWebGL: false,
      allowHeavyCssEffects: false,
      allowDecorativeMotion: false,
      allowInteractiveWebGL: false,
      allowCustomCursor: false,
    },
  };

export const PERFORMANCE_CAPABILITY_ATTRIBUTES = {
  allowLogoEffects: 'data-logo-effects',
  allowAmbientWebGL: 'data-ambient-webgl',
  allowHeavyCssEffects: 'data-heavy-css-effects',
  allowDecorativeMotion: 'data-decorative-motion',
  allowInteractiveWebGL: 'data-interactive-webgl',
  allowCustomCursor: 'data-custom-cursor',
} as const satisfies Record<keyof PerformanceCapabilities, string>;

export function performanceTierIndex(tier: PerformanceTier): number {
  return PERFORMANCE_TIERS.indexOf(tier);
}

export function buildPerformanceState(
  performanceTier: PerformanceTier,
  performanceReason: PerformanceReason,
): AdaptivePerformanceState {
  return {
    performanceTier,
    performanceReason,
    ...PERFORMANCE_CAPABILITIES[performanceTier],
  };
}

export function applyPerformanceAttributes(
  root: Pick<HTMLElement, 'setAttribute'>,
  state: AdaptivePerformanceState,
): void {
  root.setAttribute('data-performance-tier', state.performanceTier);
  root.setAttribute('data-performance-reason', state.performanceReason ?? 'none');
  for (const [capability, attribute] of Object.entries(PERFORMANCE_CAPABILITY_ATTRIBUTES)) {
    root.setAttribute(attribute, state[capability as keyof PerformanceCapabilities] ? 'on' : 'off');
  }
}

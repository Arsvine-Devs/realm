import { describe, expect, it } from 'vitest';

import {
  applyPerformanceAttributes,
  buildPerformanceState,
  PERFORMANCE_CAPABILITIES,
  PERFORMANCE_CAPABILITY_ATTRIBUTES,
  PERFORMANCE_TIERS,
} from '@/shared/lib/performance-tiers';

const CAPABILITIES = [
  'allowLogoEffects',
  'allowAmbientWebGL',
  'allowHeavyCssEffects',
  'allowDecorativeMotion',
  'allowInteractiveWebGL',
  'allowCustomCursor',
] as const;

describe('performance tier capabilities', () => {
  it('uses the approved seven-stage degradation order', () => {
    expect(PERFORMANCE_TIERS).toEqual([
      'full',
      'logo-reduced',
      'ambient-reduced',
      'css-reduced',
      'motion-reduced',
      'webgl-reduced',
      'minimal',
    ]);
  });

  it('disables exactly one additional capability at each stage', () => {
    for (let index = 1; index < PERFORMANCE_TIERS.length; index += 1) {
      const previous = PERFORMANCE_CAPABILITIES[PERFORMANCE_TIERS[index - 1]];
      const current = PERFORMANCE_CAPABILITIES[PERFORMANCE_TIERS[index]];
      const disabled = CAPABILITIES.filter(
        (capability) => previous[capability] && !current[capability],
      );
      const reenabled = CAPABILITIES.filter(
        (capability) => !previous[capability] && current[capability],
      );

      expect(disabled).toHaveLength(1);
      expect(reenabled).toHaveLength(0);
    }
  });

  it('keeps the custom cursor on until minimal', () => {
    expect(buildPerformanceState('webgl-reduced', 'runtime-fps')).toMatchObject({
      allowInteractiveWebGL: false,
      allowCustomCursor: true,
    });
    expect(buildPerformanceState('minimal', 'runtime-fps').allowCustomCursor).toBe(false);
  });

  it('projects every tier into matching document capability attributes', () => {
    for (const tier of PERFORMANCE_TIERS) {
      const attributes = new Map<string, string>();
      applyPerformanceAttributes(
        {
          setAttribute: (name, value) => {
            attributes.set(name, value);
          },
        },
        buildPerformanceState(tier, null),
      );

      expect(attributes.get('data-performance-tier')).toBe(tier);
      for (const [capability, attribute] of Object.entries(PERFORMANCE_CAPABILITY_ATTRIBUTES)) {
        expect(attributes.get(attribute)).toBe(
          PERFORMANCE_CAPABILITIES[tier][
            capability as keyof typeof PERFORMANCE_CAPABILITY_ATTRIBUTES
          ]
            ? 'on'
            : 'off',
        );
      }
    }
  });
});

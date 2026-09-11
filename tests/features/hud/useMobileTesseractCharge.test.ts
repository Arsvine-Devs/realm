import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useMobileTesseractCharge from '@/features/hud/model/useMobileTesseractCharge';

describe('useMobileTesseractCharge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('keeps auto-charging while the fallback mode is active', () => {
    const chargeBattery = vi.fn();
    const deactivateTesseract = vi.fn();

    renderHook(() =>
      useMobileTesseractCharge({
        shouldUseAutoChargeFallback: true,
        isTesseractActivated: true,
        powerLevel: 40,
        chargeBattery,
        deactivateTesseract,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(chargeBattery).toHaveBeenCalledTimes(3);
    expect(deactivateTesseract).not.toHaveBeenCalled();
  });

  it('deactivates the Tesseract when fallback charging reaches 100 percent', () => {
    const chargeBattery = vi.fn();
    const deactivateTesseract = vi.fn();

    const { rerender } = renderHook(
      (props: {
        shouldUseAutoChargeFallback: boolean;
        isTesseractActivated: boolean;
        powerLevel: number;
        chargeBattery: () => void;
        deactivateTesseract: () => void;
      }) => useMobileTesseractCharge(props),
      {
        initialProps: {
          shouldUseAutoChargeFallback: true,
          isTesseractActivated: true,
          powerLevel: 88,
          chargeBattery,
          deactivateTesseract,
        },
      },
    );

    rerender({
      shouldUseAutoChargeFallback: true,
      isTesseractActivated: true,
      powerLevel: 100,
      chargeBattery,
      deactivateTesseract,
    });

    expect(deactivateTesseract).toHaveBeenCalledTimes(1);
  });
});

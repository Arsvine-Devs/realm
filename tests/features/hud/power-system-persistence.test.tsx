import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import usePowerSystem from '@/features/hud/model/usePowerSystem';
import { POWER_SYSTEM_STORAGE_KEY } from '@/shared/lib/document-bootstrap';

function Harness() {
  const power = usePowerSystem(true);
  return (
    <>
      <output>{power.powerLevel}</output>
      <button onClick={power.handleDischargeLeverPull}>discharge</button>
    </>
  );
}

describe('power system persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const persisted = JSON.stringify({
      powerLevel: 100,
      isTesseractActivated: false,
      isDischarging: false,
    });
    window.localStorage.setItem(POWER_SYSTEM_STORAGE_KEY, persisted);
    window.sessionStorage.removeItem(POWER_SYSTEM_STORAGE_KEY);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('batches rapid discharge persistence while retaining the latest state', async () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<Harness />);
    await act(async () => {});
    expect(screen.getByRole('status').textContent).toBe('100');

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    storageSpy.mockClear();

    await act(async () => {
      screen.getByRole('button', { name: 'discharge' }).click();
      vi.advanceTimersByTime(50);
    });
    await act(async () => {
      vi.advanceTimersByTime(249);
    });
    expect(storageSpy.mock.calls.filter(([key]) => key === POWER_SYSTEM_STORAGE_KEY)).toHaveLength(
      0,
    );

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(storageSpy.mock.calls.filter(([key]) => key === POWER_SYSTEM_STORAGE_KEY)).toHaveLength(
      2,
    );
  });
});

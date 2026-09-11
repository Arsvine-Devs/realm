import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ActivationLever from '@/features/hud/ui/ActivationLever';

describe('ActivationLever', () => {
  it('keeps native button semantics and its cursor label', () => {
    const onActivate = vi.fn();
    render(
      <ActivationLever
        onActivate={onActivate}
        isActive={false}
        iconType="discharge"
        isAnimated
        cursorLabel="START CHARGE"
      />,
    );

    const button = screen.getByRole('button', { name: 'START CHARGE' });
    expect(button.getAttribute('data-cursor-label')).toBe('START CHARGE');
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledOnce();
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnimatedTitleChars } from '@/shared/ui/AnimatedTitleChars';

describe('AnimatedTitleChars', () => {
  const props = {
    wrapperClassName: 'wrapper',
    innerClassName: 'inner',
    wordWrapperClassName: 'word',
  };

  it('uppercases by default for detail heroes', () => {
    const { container } = render(<AnimatedTitleChars text="Signal lost" {...props} />);
    expect(container.textContent).toBe('SIGNAL LOST');
  });

  it('preserves case when explicitly requested by blog titles', () => {
    const { container } = render(
      <AnimatedTitleChars text="Signal lost" uppercase={false} {...props} />,
    );
    expect(container.textContent).toBe('Signal lost');
  });
});

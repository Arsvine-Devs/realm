import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let pathname = '/zh-CN/content';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children, locale }: { children: React.ReactNode; locale: string }) => (
    <div data-testid="intl-provider" data-locale={locale}>
      {children}
    </div>
  ),
}));

vi.mock('@/features/navigation/model/AppNavigationRuntime', () => ({
  AppNavigationRuntime: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/app/providers/AppProviders', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/app/shell/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/features/telemetry/public', () => ({ default: () => null }));

import LocaleClientProviders from '@/app/providers/LocaleClientProviders';

function StatefulChild() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      {count}
    </button>
  );
}

describe('locale hot switch providers', () => {
  afterEach(() => {
    cleanup();
    pathname = '/zh-CN/content';
  });

  it('updates locale messages without remounting stable children', () => {
    const view = render(
      <LocaleClientProviders>
        <StatefulChild />
      </LocaleClientProviders>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('1');
    expect(screen.getByTestId('intl-provider').dataset.locale).toBe('zh-CN');

    pathname = '/en/content';
    view.rerender(
      <LocaleClientProviders>
        <StatefulChild />
      </LocaleClientProviders>,
    );

    expect(screen.getByRole('button').textContent).toBe('1');
    expect(screen.getByTestId('intl-provider').dataset.locale).toBe('en');
    expect(document.documentElement.lang).toBe('en-US');
  });
});

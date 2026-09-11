import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let pathname = '/zh-CN/content';

vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({ pathname }),
}));

import {
  getLocaleIndependentRoute,
  LocalePageStateProvider,
  useLocaleStableState,
} from '@/features/navigation/model/LocalePageState';

function StateHarness() {
  const [tab, setTab] = useLocaleStableState('tab', 'web');
  return (
    <button type="button" onClick={() => setTab('game')}>
      {tab}
    </button>
  );
}

describe('locale page state', () => {
  afterEach(() => {
    cleanup();
    pathname = '/zh-CN/content';
  });

  it('normalizes locale-prefixed paths to the same route identity', () => {
    expect(getLocaleIndependentRoute('/zh-CN/content')).toBe('/content');
    expect(getLocaleIndependentRoute('/en/content')).toBe('/content');
    expect(getLocaleIndependentRoute('/zh-TW')).toBe('/');
  });

  it('restores safe state across locale remounts and clears it for another route', () => {
    const view = render(
      <LocalePageStateProvider>
        <StateHarness key={pathname} />
      </LocalePageStateProvider>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('game');

    pathname = '/en/content';
    view.rerender(
      <LocalePageStateProvider>
        <StateHarness key={pathname} />
      </LocalePageStateProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('game');

    pathname = '/en/tweets';
    view.rerender(
      <LocalePageStateProvider>
        <StateHarness key={pathname} />
      </LocalePageStateProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('web');
  });
});

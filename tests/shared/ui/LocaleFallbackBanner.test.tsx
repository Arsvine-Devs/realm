import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import enMessages from '@/app/locales/en.json';
import zhCNMessages from '@/app/locales/zh-CN.json';
import LocaleFallbackBanner from '@/shared/ui/LocaleFallbackBanner';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderBanner(
  locale: 'en' | 'zh-CN',
  messages: typeof enMessages | typeof zhCNMessages,
  props: React.ComponentProps<typeof LocaleFallbackBanner>,
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleFallbackBanner {...props} />
    </NextIntlClientProvider>,
  );
}

describe('LocaleFallbackBanner', () => {
  it('renders fallback and translated copy from next-intl messages', () => {
    const { rerender } = renderBanner('zh-CN', zhCNMessages, {
      requestedLocale: 'zh-CN',
      actualLocale: 'en',
      status: 'fallback',
    });
    expect(screen.getByRole('status').textContent).toBe(
      '本页暂未提供 简体中文 译本，正在以 English 显示。',
    );

    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <LocaleFallbackBanner
          requestedLocale="en"
          actualLocale="en"
          originLocale="zh-TW"
          status="translated"
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('status').textContent).toBe('This page is translated from 繁體中文.');
  });

  it('dismisses after the translated timeout and exit animation', () => {
    vi.useFakeTimers();
    renderBanner('en', enMessages, {
      requestedLocale: 'en',
      actualLocale: 'en',
      originLocale: 'zh-CN',
      status: 'translated',
    });

    act(() => vi.advanceTimersByTime(5000));
    act(() => vi.advanceTimersByTime(240));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('uses the localized dismiss label', () => {
    renderBanner('en', enMessages, {
      requestedLocale: 'en',
      actualLocale: 'zh-CN',
      status: 'fallback',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByRole('status')).not.toBeNull();
  });
});

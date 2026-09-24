import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import enMessages from '@/app/locales/en.json';
import zhCNMessages from '@/app/locales/zh-CN.json';
import zhTWMessages from '@/app/locales/zh-TW.json';
import MDXComponents from '@/features/blog/ui/mdx/MDXComponents';
import Spoiler, { SpoilerProvider } from '@/features/blog/ui/mdx/Spoiler';
import spoilerStyles from '@/features/blog/styles/Spoiler.module.scss';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const localeMessages = {
  'zh-CN': zhCNMessages,
  'zh-TW': zhTWMessages,
  en: enMessages,
};

function renderSpoilers(count = 1, locale: keyof typeof localeMessages = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={localeMessages[locale]}>
      <SpoilerProvider>
        <div>
          {Array.from({ length: count }, (_, index) => (
            <Spoiler key={index}>secret-{index + 1}</Spoiler>
          ))}
        </div>
      </SpoilerProvider>
    </NextIntlClientProvider>,
  );
}

function getSpoilers() {
  return screen
    .getAllByRole('button')
    .filter((element) => element.hasAttribute('data-spoiler-state'));
}

describe('Spoiler MDX component', () => {
  it('registers with the MDX component map', () => {
    expect(MDXComponents.Spoiler).toBe(Spoiler);
  });

  it('conceals content by default while preserving its inline node', () => {
    renderSpoilers();

    const spoiler = getSpoilers()[0];
    expect(spoiler.getAttribute('data-spoiler-state')).toBe('concealed');
    expect(spoiler.getAttribute('aria-pressed')).toBe('false');
    expect(spoiler.getAttribute('data-cursor-label')).toBe('Click to reveal');
    expect(spoiler.getAttribute('data-cursor-magnetic')).toBe('true');
    expect(screen.getByText('secret-1').getAttribute('aria-hidden')).toBe('true');
  });

  it('remeasures rendered text fragments after fonts load without a container resize', async () => {
    const makeRect = (left: number, top: number, width: number, height: number) =>
      new DOMRect(left, top, width, height);
    let clientRects = [makeRect(12, 10, 20, 10), makeRect(32, 10, 18, 10)];
    const rangeSpy = vi.spyOn(document, 'createRange').mockImplementation(
      () =>
        ({
          selectNodeContents: vi.fn(),
          getClientRects: () => clientRects,
        }) as unknown as Range,
    );
    const fontListeners = new Map<string, EventListener>();
    const fonts = {
      ready: Promise.resolve({} as FontFaceSet),
      addEventListener: (type: string, listener: EventListener) => {
        fontListeners.set(type, listener);
      },
      removeEventListener: vi.fn(),
    } as unknown as FontFaceSet;
    const originalFontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts');
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });

    try {
      render(
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <SpoilerProvider>
            <Spoiler>
              <strong>secret-1</strong>
            </Spoiler>
          </SpoilerProvider>
        </NextIntlClientProvider>,
      );

      const spoiler = getSpoilers()[0];
      await waitFor(() => expect(spoiler.getAttribute('data-spoiler-lines')).toBe('ready'));
      let covers = spoiler.querySelectorAll(`.${spoilerStyles.spoilerCover}`);
      expect(covers).toHaveLength(1);
      expect((covers[0] as HTMLElement).style.width).toBe('42px');

      act(() => fontListeners.get('loading')?.(new Event('loading')));
      expect(spoiler.getAttribute('data-spoiler-lines')).toBe('pending');
      expect(spoiler.getAttribute('data-spoiler-state')).toBe('concealed');
      expect((covers[0] as HTMLElement).style.width).toBe('42px');

      clientRects = [makeRect(12, 10, 35, 10), makeRect(47, 11, 30, 8), makeRect(12, 30, 25, 10)];
      act(() => fontListeners.get('loadingdone')?.(new Event('loadingdone')));

      await waitFor(() => expect(spoiler.getAttribute('data-spoiler-lines')).toBe('ready'));
      covers = spoiler.querySelectorAll(`.${spoilerStyles.spoilerCover}`);
      expect(covers).toHaveLength(2);
      expect((covers[0] as HTMLElement).style.width).toBe('69px');
      expect((covers[1] as HTMLElement).style.width).toBe('29px');
    } finally {
      if (originalFontsDescriptor) {
        Object.defineProperty(document, 'fonts', originalFontsDescriptor);
      } else {
        Reflect.deleteProperty(document, 'fonts');
      }
      rangeSpy.mockRestore();
    }
  });

  it('previews on hover and focus, then restores concealment', () => {
    renderSpoilers();

    const spoiler = getSpoilers()[0];
    fireEvent.mouseEnter(spoiler);
    expect(spoiler.getAttribute('data-spoiler-state')).toBe('preview');
    fireEvent.mouseLeave(spoiler);
    expect(spoiler.getAttribute('data-spoiler-state')).toBe('concealed');

    fireEvent.focus(spoiler);
    expect(spoiler.getAttribute('data-spoiler-state')).toBe('preview');
    fireEvent.blur(spoiler);
    expect(spoiler.getAttribute('data-spoiler-state')).toBe('concealed');
  });

  it('keeps content visible after pointer, Enter, or Space activation', () => {
    renderSpoilers(3);

    const [pointerSpoiler, enterSpoiler, spaceSpoiler] = getSpoilers();
    fireEvent.click(pointerSpoiler);
    fireEvent.keyDown(enterSpoiler, { key: 'Enter' });
    fireEvent.keyDown(spaceSpoiler, { key: ' ' });

    expect(pointerSpoiler.getAttribute('data-spoiler-state')).toBe('revealed');
    expect(enterSpoiler.getAttribute('data-spoiler-state')).toBe('revealed');
    expect(spaceSpoiler.getAttribute('data-spoiler-state')).toBe('revealed');
    expect(pointerSpoiler.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('secret-1').getAttribute('aria-hidden')).toBe('false');

    fireEvent.mouseLeave(pointerSpoiler);
    fireEvent.blur(enterSpoiler);
    expect(pointerSpoiler.getAttribute('data-spoiler-state')).toBe('revealed');
    expect(enterSpoiler.getAttribute('data-spoiler-state')).toBe('revealed');
  });

  it('does not count hover previews or repeated activation of one spoiler', () => {
    renderSpoilers(3);

    const spoilers = getSpoilers();
    spoilers.forEach((spoiler) => {
      fireEvent.mouseEnter(spoiler);
      fireEvent.mouseLeave(spoiler);
    });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(spoilers[0]);
    fireEvent.click(spoilers[0]);
    fireEvent.click(spoilers[1]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a one-time confirmation after the third unique activation', () => {
    renderSpoilers(3);

    const spoilers = getSpoilers();
    spoilers.slice(0, 2).forEach((spoiler) => fireEvent.click(spoiler));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(spoilers[2]);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Several hidden sections are visible' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep visible' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reveal all' })).toBeTruthy();
  });

  it('keeps revealed content when the prompt is dismissed', async () => {
    renderSpoilers(3);
    getSpoilers().forEach((spoiler) => fireEvent.click(spoiler));

    fireEvent.click(screen.getByRole('button', { name: 'Keep visible' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    getSpoilers().forEach((spoiler) => {
      expect(spoiler.getAttribute('data-spoiler-state')).toBe('revealed');
    });
  });

  it('uses Escape and backdrop clicks as safe dismissals', async () => {
    renderSpoilers(3);
    getSpoilers().forEach((spoiler) => fireEvent.click(spoiler));

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    cleanup();
    renderSpoilers(3);
    getSpoilers().forEach((spoiler) => fireEvent.click(spoiler));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.parentElement!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(getSpoilers()[0].getAttribute('data-spoiler-state')).toBe('revealed');
  });

  it('reveals all content and does not prompt again', async () => {
    renderSpoilers(4);
    const spoilers = getSpoilers();
    spoilers.slice(0, 3).forEach((spoiler) => fireEvent.click(spoiler));

    fireEvent.click(screen.getByRole('button', { name: 'Reveal all' }));
    getSpoilers().forEach((spoiler) => {
      expect(spoiler.getAttribute('data-spoiler-state')).toBe('revealed');
    });
    expect(screen.getByText('secret-1')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    getSpoilers().forEach((spoiler) => fireEvent.click(spoiler));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('traps dialog focus and restores focus to the third spoiler', async () => {
    renderSpoilers(3);
    const spoilers = getSpoilers();
    const thirdSpoiler = spoilers[2];
    spoilers.slice(0, 2).forEach((spoiler) => fireEvent.click(spoiler));
    thirdSpoiler.focus();
    fireEvent.click(thirdSpoiler);

    const dialog = screen.getByRole('dialog');
    const keepVisible = screen.getByRole('button', { name: 'Keep visible' });
    const revealAll = screen.getByRole('button', { name: 'Reveal all' });
    await waitFor(() => expect(document.activeElement).toBe(keepVisible));

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(revealAll);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(keepVisible);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(revealAll);

    fireEvent.click(keepVisible);
    expect(dialog.parentElement?.classList.contains(spoilerStyles.dialogClosing)).toBe(true);
    await waitFor(() => expect(document.body.contains(dialog)).toBe(false));
    await waitFor(() => expect(document.activeElement).toBe(thirdSpoiler));
  });

  it('uses localized labels for all supported UI locales', () => {
    const cases = [
      { locale: 'zh-CN' as const, label: '显示被遮挡内容' },
      { locale: 'zh-TW' as const, label: '顯示被遮擋內容' },
      { locale: 'en' as const, label: 'Reveal hidden content' },
    ];

    cases.forEach(({ locale, label }) => {
      cleanup();
      renderSpoilers(1, locale);
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    });
  });
});

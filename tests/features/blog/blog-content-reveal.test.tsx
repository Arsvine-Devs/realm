import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import Image from 'next/image';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { motionPreference } = vi.hoisted(() => ({
  motionPreference: { reduced: false },
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useReducedMotion: () => motionPreference.reduced,
}));

import { BlogContentRevealProvider } from '@/features/blog/ui/mdx/BlogContentReveal';
import MDXComponents from '@/features/blog/ui/mdx/MDXComponents';
import Spoiler, { SpoilerProvider } from '@/features/blog/ui/mdx/Spoiler';
import enMessages from '@/app/locales/en.json';
import { DEFAULT_TYPEWRITER_DURATION_MS } from '@/shared/lib/typewriter';
import styles from '@/features/blog/styles/MDXContent.module.scss';

let observers: IntersectionObserverStub[] = [];

class IntersectionObserverStub {
  readonly targets = new Set<Element>();

  constructor(private readonly callback: IntersectionObserverCallback) {
    observers.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
  }

  enter(target: Element) {
    this.callback(
      [{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function BlogContentFixture({ locale }: { locale: 'zh-CN' | 'zh-TW' }) {
  const bodyRef = createRef<HTMLDivElement>();
  const scrollRootRef = createRef<HTMLDivElement>();
  const prose = locale === 'zh-TW' ? '閱讀這段正文' : '阅读这段正文';

  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <div ref={scrollRootRef}>
        <div key={locale} ref={bodyRef} className={styles.contentBody}>
          <BlogContentRevealProvider
            bodyRef={bodyRef}
            scrollRootRef={scrollRootRef}
            enabled
            locale={locale}
          >
            <SpoilerProvider>
              <MDXComponents.p>
                {prose} <strong>important phrase</strong>{' '}
                <a href="https://example.com/target">linked phrase</a>{' '}
                <Spoiler>SECRET_SENTINEL_748</Spoiler>
              </MDXComponents.p>
              <MDXComponents.pre>CODE_BLOCK_SENTINEL</MDXComponents.pre>
              <MDXComponents.ul>
                <MDXComponents.li>
                  List item <MDXComponents.pre>LIST_CODE_SENTINEL</MDXComponents.pre>
                </MDXComponents.li>
              </MDXComponents.ul>
              <Image alt="MEDIA_SENTINEL" src="/media-sentinel.png" width={1} height={1} />
            </SpoilerProvider>
          </BlogContentRevealProvider>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}

function enterElement(element: Element) {
  const observer = [...observers].reverse().find((candidate) => candidate.targets.has(element));
  if (!observer) throw new Error('No active reveal observer for the element.');
  act(() => observer.enter(element));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  motionPreference.reduced = false;
  observers = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  motionPreference.reduced = false;
  observers = [];
});

describe('blog content scramble reveal', () => {
  it('scrambles prose on intersection, then fades in rich MDX without exposing Spoiler text', () => {
    const { container } = render(<BlogContentFixture locale="zh-CN" />);
    const paragraph = container.querySelector('p')!;
    const codeBlocks = container.querySelectorAll('pre');
    const listItem = container.querySelector('li')!;
    const media = container.querySelector('img')!;

    act(() => vi.advanceTimersByTime(200));
    expect(paragraph.querySelector(`.${styles.scrambleOverlay}`)).toBeNull();

    enterElement(paragraph);

    let overlay = paragraph.querySelector(`.${styles.scrambleOverlay}`);
    const richContent = paragraph.querySelector(`.${styles.scrambleRichContent}`)!;
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
    expect(richContent.classList.contains(styles.scrambleRichHidden)).toBe(true);
    expect(overlay?.textContent).not.toContain('SECRET_SENTINEL_748');
    expect(overlay?.textContent).not.toContain('CODE_BLOCK_SENTINEL');
    expect(overlay?.textContent).not.toContain('MEDIA_SENTINEL');
    expect(codeBlocks[0]?.textContent).toBe('CODE_BLOCK_SENTINEL');
    expect(media.getAttribute('alt')).toBe('MEDIA_SENTINEL');
    expect(
      paragraph.querySelector('[data-spoiler-state]')?.getAttribute('data-spoiler-state'),
    ).toBe('concealed');

    fireEvent.transitionEnd(paragraph);
    expect(paragraph.style.transform).toBe('none');

    act(() => vi.advanceTimersByTime(DEFAULT_TYPEWRITER_DURATION_MS));
    overlay = paragraph.querySelector(`.${styles.scrambleOverlay}`);
    expect(overlay?.classList.contains(styles.scrambleOverlayFading)).toBe(true);
    expect(richContent.classList.contains(styles.scrambleRichHidden)).toBe(true);
    expect(paragraph.querySelector('a')?.getAttribute('href')).toBe('https://example.com/target');

    act(() => vi.advanceTimersByTime(240));
    expect(paragraph.querySelector(`.${styles.scrambleOverlay}`)).toBeNull();
    expect(richContent.classList.contains(styles.scrambleRichHidden)).toBe(false);
    expect(paragraph.textContent).toContain('important phrase');
    const spoiler = paragraph.querySelector('[data-spoiler-state]')!;
    expect(spoiler.getAttribute('data-spoiler-state')).toBe('concealed');
    fireEvent.click(spoiler);
    expect(spoiler.getAttribute('data-spoiler-state')).toBe('revealed');

    enterElement(listItem);
    const listOverlay = listItem.querySelector(`.${styles.scrambleOverlay}`);
    expect(listOverlay?.getAttribute('aria-hidden')).toBe('true');
    expect(listOverlay?.textContent).not.toContain('LIST_CODE_SENTINEL');
  });

  it('finishes immediately on rich-content focus and skips scramble for reduced motion', () => {
    const { container } = render(<BlogContentFixture locale="zh-CN" />);
    act(() => vi.advanceTimersByTime(200));
    let paragraph = container.querySelector('p')!;
    enterElement(paragraph);
    expect(paragraph.querySelector(`.${styles.scrambleOverlay}`)).toBeTruthy();

    fireEvent.focus(paragraph.querySelector('a')!);
    expect(paragraph.querySelector(`.${styles.scrambleOverlay}`)).toBeNull();
    expect(paragraph.querySelector(`.${styles.scrambleRichHidden}`)).toBeNull();

    cleanup();
    motionPreference.reduced = true;
    const reducedMotionView = render(<BlogContentFixture locale="zh-CN" />);
    act(() => vi.advanceTimersByTime(200));
    paragraph = reducedMotionView.container.querySelector('p')!;
    enterElement(paragraph);

    expect(paragraph.querySelector(`.${styles.scrambleOverlay}`)).toBeNull();
    expect(paragraph.querySelector('a')?.textContent).toBe('linked phrase');
  });

  it('replays the reveal when the selected content locale changes', () => {
    const { container, rerender } = render(<BlogContentFixture locale="zh-CN" />);
    act(() => vi.advanceTimersByTime(200));
    let paragraph = container.querySelector('p')!;
    enterElement(paragraph);
    act(() => vi.advanceTimersByTime(DEFAULT_TYPEWRITER_DURATION_MS + 240));
    expect(paragraph.querySelector(`.${styles.scrambleOverlay}`)).toBeNull();

    rerender(<BlogContentFixture locale="zh-TW" />);
    act(() => vi.advanceTimersByTime(200));
    paragraph = container.querySelector('p')!;
    expect(paragraph.textContent).toContain('閱讀這段正文');
    enterElement(paragraph);
    expect(paragraph.querySelector(`.${styles.scrambleOverlay}`)).toBeTruthy();
  });
});

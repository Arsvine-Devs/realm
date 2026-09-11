import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useHudPower } from '../../../../features/hud/model/HudProvider';
import { useTransition } from '../../../navigation/model/TransitionProvider';
import useNavigationIntentPrefetch from '../../../navigation/model/useNavigationIntentPrefetch';
import { buildBlogIndexHref, buildBlogPostHref } from '../../model/blogClient';
import type { BlogContentLocale } from '../../server/blog';
import { type Locale } from '@/shared/contracts/locale';
import type { BlogPostMeta } from '../../../../shared/types';
import styles from '../../styles/BlogDetailView.module.scss';
import hudStyles from '../../../../app/styles/Shell.module.scss';
import { useLocalePageStateStore } from '@/features/navigation/model/LocalePageState';

type BlogDetailSectionId = 'header' | 'content' | 'end';

interface BlogDetailScaffoldProps {
  locale: Locale;
  meta: BlogPostMeta;
  allPosts: BlogPostMeta[];
  defaultContentLocale: BlogContentLocale;
  headerContent: React.ReactNode;
  contentContent: React.ReactNode;
  headerEntered?: boolean;
  scrollRootRef?: React.RefObject<HTMLDivElement | null>;
}

export default function BlogDetailScaffold({
  locale,
  meta,
  allPosts,
  defaultContentLocale,
  headerContent,
  contentContent,
  headerEntered = false,
  scrollRootRef,
}: BlogDetailScaffoldProps) {
  const { isInverted } = useHudPower();
  const { navigateTo } = useTransition();
  const prefetchOnIntent = useNavigationIntentPrefetch();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const pageStateStore = useLocalePageStateStore();

  const currentIndex = allPosts.findIndex((post) => post.slug === meta.slug);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const contentIndexHref = buildBlogIndexHref(locale);
  const prevPostHref = prevPost
    ? buildBlogPostHref(locale, prevPost.slug, defaultContentLocale)
    : contentIndexHref;
  const nextPostHref = nextPost
    ? buildBlogPostHref(locale, nextPost.slug, defaultContentLocale)
    : contentIndexHref;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const restoreScrollFrameRef = useRef<number | null>(null);
  const sectionRefs = useRef<Record<BlogDetailSectionId, HTMLElement | null>>({
    header: null,
    content: null,
    end: null,
  });

  const [activeNav, setActiveNav] = useState<BlogDetailSectionId>('header');
  const [isPastHeader, setIsPastHeader] = useState(false);

  const setWrapperRef = useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      if (scrollRootRef) {
        scrollRootRef.current = node;
      }
      if (!node) return;

      const savedScrollTop = pageStateStore.read<number>('blog.scroll-top') ?? 0;
      restoreScrollFrameRef.current = window.requestAnimationFrame(() => {
        node.scrollTop = Math.min(
          savedScrollTop,
          Math.max(0, node.scrollHeight - node.clientHeight),
        );
        restoreScrollFrameRef.current = null;
      });
    },
    [pageStateStore, scrollRootRef],
  );

  const handleScroll = useCallback(() => {
    pageStateStore.write('blog.scroll-top', wrapperRef.current?.scrollTop ?? 0);
  }, [pageStateStore]);

  useEffect(
    () => () => {
      if (restoreScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreScrollFrameRef.current);
      }
    },
    [],
  );

  const setSectionRef = useCallback(
    (id: BlogDetailSectionId) => (node: HTMLElement | null) => {
      sectionRefs.current[id] = node;
    },
    [],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const observedSections = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[];
    if (observedSections.length === 0) {
      return;
    }

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const id = entry.target.getAttribute('data-nav-id');
          if (id === 'header' || id === 'content' || id === 'end') {
            setActiveNav(id);
          }
        });
      },
      { threshold: 0.3, root: wrapper },
    );

    const headerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.getAttribute('data-nav-id') === 'header') {
            setIsPastHeader(!entry.isIntersecting);
          }
        });
      },
      { threshold: 0.55, root: wrapper },
    );

    observedSections.forEach((section) => {
      navObserver.observe(section);
      if (section.getAttribute('data-nav-id') === 'header') {
        headerObserver.observe(section);
      }
    });

    return () => {
      navObserver.disconnect();
      headerObserver.disconnect();
    };
  }, [meta.slug]);

  const handleBack = useCallback(
    (event?: React.MouseEvent) => {
      event?.preventDefault();
      navigateTo(contentIndexHref);
    },
    [contentIndexHref, navigateTo],
  );

  const scrollToSection = useCallback((id: BlogDetailSectionId) => {
    const target = sectionRefs.current[id];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div
      ref={setWrapperRef}
      className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}
      onScroll={handleScroll}
    >
      <div className={styles.mainContent}>
        <header
          className={`${styles.headerSection} ${headerEntered ? styles.entered : ''}`}
          ref={setSectionRef('header')}
          data-nav-id="header"
        >
          {headerContent}
        </header>

        <section
          className={styles.contentSection}
          ref={setSectionRef('content')}
          data-nav-id="content"
        >
          {contentContent}
        </section>

        <footer className={styles.footer} ref={setSectionRef('end')} data-nav-id="end">
          <div className={styles.endMarker}>
            <span className={styles.endSignal}>{tCommon('endTransmission')}</span>
          </div>
          <div className={styles.footerNav}>
            {prevPost ? (
              <Link
                href={prevPostHref}
                prefetch={false}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onPointerDown={(event) => {
                  if (event.button === 0 && prevPost.access.mode === 'public') {
                    prefetchOnIntent(prevPostHref);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && prevPost.access.mode === 'public') {
                    prefetchOnIntent(prevPostHref);
                  }
                }}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo(prevPostHref);
                }}
                data-cursor-label="PREVIOUS"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{prevPost.title}</span>
              </Link>
            ) : (
              <Link
                href={contentIndexHref}
                prefetch={false}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onPointerDown={(event) => {
                  if (event.button === 0) prefetchOnIntent(contentIndexHref);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') prefetchOnIntent(contentIndexHref);
                }}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{tCommon('returnToIndex')}</span>
              </Link>
            )}

            {nextPost ? (
              <Link
                href={nextPostHref}
                prefetch={false}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onPointerDown={(event) => {
                  if (event.button === 0 && nextPost.access.mode === 'public') {
                    prefetchOnIntent(nextPostHref);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && nextPost.access.mode === 'public') {
                    prefetchOnIntent(nextPostHref);
                  }
                }}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo(nextPostHref);
                }}
                data-cursor-label="NEXT"
              >
                <span className={styles.footerNavTitle}>{nextPost.title}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            ) : (
              <Link
                href={contentIndexHref}
                prefetch={false}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onPointerDown={(event) => {
                  if (event.button === 0) prefetchOnIntent(contentIndexHref);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') prefetchOnIntent(contentIndexHref);
                }}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavTitle}>{tCommon('returnToIndex')}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            )}
          </div>
        </footer>
      </div>

      <nav className={`${styles.rightNav} ${isPastHeader ? styles.visible : ''}`}>
        <button
          className={styles.rightNavBack}
          onClick={() => handleBack()}
          data-cursor-label="BACK"
          aria-label="BACK"
        />
        <div className={styles.rightNavDivider} />
        <button
          className={`${styles.rightNavLink} ${activeNav === 'header' ? styles.active : ''}`}
          onClick={() => scrollToSection('header')}
        >
          {tNav('top')}
        </button>
        <button
          className={`${styles.rightNavLink} ${activeNav === 'content' ? styles.active : ''}`}
          onClick={() => scrollToSection('content')}
        >
          {tNav('content')}
        </button>
        <button
          className={`${styles.rightNavLink} ${activeNav === 'end' ? styles.active : ''}`}
          onClick={() => scrollToSection('end')}
        >
          {tNav('end')}
        </button>
      </nav>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from '../../../app/styles/Shell.module.scss';
import contentStyles from '../styles/ContentPage.module.scss';
import { useLayoutAnchors } from '../model/LayoutAnchorsContext';
import { useTransition } from '../model/TransitionProvider';

import WorksSection from '../../portfolio/ui/WorksSection';
import ExperienceSection from '../../experience/ui/ExperienceSection';
import BlogSection from '../../blog/ui/blog/BlogSection';
import LifeSection from '../../life/ui/LifeSection';
import ContactSection from '../../profile/ui/ContactSection';
import AboutSection from '../../profile/ui/AboutSection';

import WorkDetailView from '../../portfolio/ui/WorkDetailView';
import ExperienceDetailView from '../../experience/ui/ExperienceDetailView';
import LifeDetailView from '../../life/ui/LifeDetailView';

import { buildBlogPostHref } from '../../blog/model/blogClient';
import { resolveImageUrl } from '@/shared/lib/cdn';
import { setHudTypingOverlaySuppressed } from '@/shared/lib/hud-typing-visibility';
import { markCursorTargetsDirty } from '@/shared/lib/cursor-targets';
import { siteConfig } from '@/shared/config/site';
import type { Locale } from '@/shared/contracts/locale';
import type {
  BlogPostMeta,
  Project,
  LifeItem,
  ExperienceItem,
  SkillCategory,
} from '../../../shared/types';
import useNavigationIntentPrefetch from '../model/useNavigationIntentPrefetch';
import { CONTENT_DETAIL_EXIT_DELAY_MS } from '@/shared/lib/ui-timings';
import { useLocalePageStateStore, useLocaleStableState } from '../model/LocalePageState';

type DetailSelection =
  | { type: 'none' }
  | { type: 'work'; id: number }
  | { type: 'experience'; id: string }
  | { type: 'life'; id: string };

type ResolvedDetail =
  | { type: 'none' }
  | { type: 'work'; item: Project }
  | { type: 'experience'; item: ExperienceItem }
  | { type: 'life'; item: LifeItem };

export interface ContentPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  blogPosts: BlogPostMeta[];
  webProjects: Project[];
  gameProjects: Project[];
  earlyProjects: Project[];
  experienceData: ExperienceItem[];
  gameData: LifeItem[];
  travelData: LifeItem[];
  otherData: LifeItem[];
  alsoPlayGames: string[];
  artPlaceholderText: string;
  skillCategories: SkillCategory[];
  pageDescription: string;
}

export default function ContentPage({
  locale,
  blogPosts,
  webProjects,
  gameProjects,
  earlyProjects,
  experienceData,
  gameData,
  travelData,
  otherData,
  alsoPlayGames,
  artPlaceholderText,
  skillCategories,
  pageDescription,
}: ContentPageProps) {
  const prefetchOnIntent = useNavigationIntentPrefetch();
  const { navigateTo, setBackOverride } = useTransition();
  const { registerScrollContainer } = useLayoutAnchors();
  const pageStateStore = useLocalePageStateStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const restoreScrollFrameRef = useRef<number | null>(null);

  const blogSectionRef = useRef<HTMLDivElement>(null);
  const worksSectionRef = useRef<HTMLDivElement>(null);
  const workContentAreaRef = useRef<HTMLDivElement>(null);
  const webTabRef = useRef<HTMLDivElement>(null);
  const gameTabRef = useRef<HTMLDivElement>(null);
  const [activeWorkTab, setActiveWorkTab] = useLocaleStableState('content.active-work-tab', 'web');

  const experienceSectionRef = useRef<HTMLDivElement>(null);

  const lifeSectionRef = useRef<HTMLDivElement>(null);
  const lifeContentAreaRef = useRef<HTMLDivElement>(null);
  const lifeGameTabRef = useRef<HTMLDivElement>(null);
  const lifeTravelTabRef = useRef<HTMLDivElement>(null);
  const lifeArtTabRef = useRef<HTMLDivElement>(null);
  const lifeOtherTabRef = useRef<HTMLDivElement>(null);
  const [activeLifeTab, setActiveLifeTab] = useLocaleStableState('content.active-life-tab', 'game');

  const contactSectionRef = useRef<HTMLDivElement>(null);
  const [isEmailCopied, setIsEmailCopied] = useState(false);

  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const aboutContentRef = useRef<HTMLDivElement>(null);

  const [detailSelection, setDetailSelection] = useLocaleStableState<DetailSelection>(
    'content.detail',
    { type: 'none' },
  );
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const detailCloseTimeoutRef = useRef<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  const detail = useMemo<ResolvedDetail>(() => {
    if (detailSelection.type === 'work') {
      const item = [...gameProjects, ...earlyProjects].find(({ id }) => id === detailSelection.id);
      return item ? { type: 'work', item } : { type: 'none' };
    }
    if (detailSelection.type === 'experience') {
      const item = experienceData.find(({ id }) => id === detailSelection.id);
      return item ? { type: 'experience', item } : { type: 'none' };
    }
    if (detailSelection.type === 'life') {
      const item = [...gameData, ...travelData, ...otherData].find(
        ({ id }) => id === detailSelection.id,
      );
      return item ? { type: 'life', item } : { type: 'none' };
    }
    return { type: 'none' };
  }, [
    detailSelection,
    earlyProjects,
    experienceData,
    gameData,
    gameProjects,
    otherData,
    travelData,
  ]);
  const isDetailMounted = detail.type !== 'none';

  const setContentScrollContainer = useCallback(
    (element: HTMLDivElement | null) => {
      scrollContainerRef.current = element;
      registerScrollContainer(element);
      if (!element) return;

      const savedScrollTop = pageStateStore.read<number>('content.scroll-top') ?? 0;
      restoreScrollFrameRef.current = window.requestAnimationFrame(() => {
        element.scrollTop = Math.min(
          savedScrollTop,
          Math.max(0, element.scrollHeight - element.clientHeight),
        );
        restoreScrollFrameRef.current = null;
      });
    },
    [pageStateStore, registerScrollContainer],
  );

  const handleContentScroll = useCallback(() => {
    pageStateStore.write('content.scroll-top', scrollContainerRef.current?.scrollTop ?? 0);
  }, [pageStateStore]);

  useEffect(() => {
    return () => {
      setBackOverride(null);
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
      }
      if (restoreScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreScrollFrameRef.current);
      }
    };
  }, [setBackOverride]);

  useEffect(() => {
    if (isClosing && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [isClosing]);

  useEffect(() => {
    markCursorTargetsDirty();
  }, [detail.type, isClosing]);

  useEffect(() => {
    setHudTypingOverlaySuppressed(isDetailMounted && !isClosing);

    return () => {
      setHudTypingOverlaySuppressed(false);
    };
  }, [isClosing, isDetailMounted]);

  const openDetail = useCallback(
    (selection: DetailSelection) => {
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
        detailCloseTimeoutRef.current = null;
      }
      isClosingRef.current = false;
      setIsClosing(false);
      if (scrollContainerRef.current) {
        scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      }
      setDetailSelection(selection);
    },
    [setDetailSelection],
  );

  const handleWorkTabClick = useCallback(
    (tabName: string) => {
      setActiveWorkTab(tabName);
    },
    [setActiveWorkTab],
  );

  const handleWorkItemClick = useCallback(
    (item: Project) => {
      const coverImg = resolveImageUrl(item.imageUrl, 'large');
      if (coverImg) {
        const img = new Image();
        img.src = coverImg;
      }
      const isWeb = webProjects.some((p) => p.id === item.id);
      if (isWeb) {
        navigateTo(`/${locale}/web/${item.id}`);
      } else {
        openDetail({ type: 'work', id: item.id });
      }
    },
    [openDetail, navigateTo, webProjects, locale],
  );

  const handleWorkItemIntent = useCallback(
    (item: Project) => {
      if (webProjects.some((project) => project.id === item.id)) {
        prefetchOnIntent(`/${locale}/web/${item.id}`);
      }
    },
    [locale, prefetchOnIntent, webProjects],
  );

  const handleExperienceItemClick = useCallback(
    (item: ExperienceItem) => {
      openDetail({ type: 'experience', id: item.id });
    },
    [openDetail],
  );

  const handleLifeTabClick = useCallback(
    (tabName: string) => {
      setActiveLifeTab(tabName);
    },
    [setActiveLifeTab],
  );

  const handleLifeItemClick = useCallback(
    (item: LifeItem) => {
      const coverImg = resolveImageUrl(item.imageUrl, 'large');
      if (coverImg) {
        const img = new Image();
        img.src = coverImg;
      }
      navigateTo(`/${locale}/life/${item.id}`);
    },
    [navigateTo, locale],
  );

  const handleLifeItemIntent = useCallback(
    (item: LifeItem) => {
      prefetchOnIntent(`/${locale}/life/${item.id}`);
    },
    [locale, prefetchOnIntent],
  );

  const handleCopyEmail = useCallback(() => {
    navigator.clipboard
      .writeText(siteConfig.email)
      .then(() => {
        setIsEmailCopied(true);
        setTimeout(() => setIsEmailCopied(false), 1500);
      })
      .catch((err) => console.error('Failed to copy email:', err));
  }, []);

  const handleShowFriendLinks = useCallback(() => {
    navigateTo(`/${locale}/friends`);
  }, [navigateTo, locale]);

  const handleBlogItemClick = useCallback(
    (post: BlogPostMeta) => {
      navigateTo(buildBlogPostHref(locale, post.slug, locale));
    },
    [navigateTo, locale],
  );

  const handleBlogItemIntent = useCallback(
    (post: BlogPostMeta) => {
      if (post.access.mode === 'public') {
        prefetchOnIntent(buildBlogPostHref(locale, post.slug, locale));
      }
    },
    [locale, prefetchOnIntent],
  );

  const handleBackFromDetail = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setBackOverride(null);
    detailCloseTimeoutRef.current = window.setTimeout(() => {
      setDetailSelection({ type: 'none' });
      setIsClosing(false);
      isClosingRef.current = false;
      detailCloseTimeoutRef.current = null;
    }, CONTENT_DETAIL_EXIT_DELAY_MS);
  }, [setBackOverride, setDetailSelection]);

  useEffect(() => {
    if (isDetailMounted && !isClosing) {
      setBackOverride(handleBackFromDetail);
    }
    return () => setBackOverride(null);
  }, [isDetailMounted, isClosing, setBackOverride, handleBackFromDetail]);

  const handleDetailAnimEnd = useCallback(
    (e: React.AnimationEvent) => {
      if (e.target !== detailRef.current) return;
      if (isClosingRef.current) {
        if (detailCloseTimeoutRef.current !== null) {
          window.clearTimeout(detailCloseTimeoutRef.current);
          detailCloseTimeoutRef.current = null;
        }
        setDetailSelection({ type: 'none' });
        setIsClosing(false);
        isClosingRef.current = false;
      }
    },
    [setDetailSelection],
  );

  return (
    <>
      <div
        ref={setContentScrollContainer}
        onScroll={handleContentScroll}
        className={`${styles.contentWrapper}${
          isDetailMounted && !isClosing ? ` ${styles.detailOpen}` : ''
        }${isClosing ? ` ${styles.detailClosing}` : ''}`}
      >
        <div id="section-works" className={contentStyles.sectionAnchor}>
          <WorksSection
            worksSectionRef={worksSectionRef}
            activeWorkTab={activeWorkTab}
            handleWorkTabClick={handleWorkTabClick}
            workContentAreaRef={workContentAreaRef}
            webTabRef={webTabRef}
            gameTabRef={gameTabRef}
            webProjects={webProjects}
            gameProjects={gameProjects}
            earlyProjects={earlyProjects}
            handleWorkItemClick={handleWorkItemClick}
            handleWorkItemIntent={handleWorkItemIntent}
            skillCategories={skillCategories}
          />
        </div>

        <div id="section-experience" className={contentStyles.sectionAnchor}>
          <ExperienceSection
            experienceSectionRef={experienceSectionRef}
            experienceData={experienceData}
            handleExperienceItemClick={handleExperienceItemClick}
          />
        </div>

        <div id="section-blog" className={contentStyles.sectionAnchor}>
          <BlogSection
            blogSectionRef={blogSectionRef}
            locale={locale}
            posts={blogPosts}
            handleBlogItemClick={handleBlogItemClick}
            handleBlogItemIntent={handleBlogItemIntent}
          />
        </div>

        <div id="section-life" className={contentStyles.sectionAnchor}>
          <LifeSection
            lifeSectionRef={lifeSectionRef}
            activeSection="content"
            activeLifeTab={activeLifeTab}
            handleLifeTabClick={handleLifeTabClick}
            lifeContentAreaRef={lifeContentAreaRef}
            lifeGameTabRef={lifeGameTabRef}
            lifeTravelTabRef={lifeTravelTabRef}
            lifeArtTabRef={lifeArtTabRef}
            lifeOtherTabRef={lifeOtherTabRef}
            gameData={gameData}
            travelData={travelData}
            otherData={otherData}
            alsoPlayGames={alsoPlayGames}
            artPlaceholderText={artPlaceholderText}
            handleLifeItemClick={handleLifeItemClick}
            handleLifeItemIntent={handleLifeItemIntent}
          />
        </div>

        <div id="section-contact" className={contentStyles.sectionAnchor}>
          <ContactSection
            contactSectionRef={contactSectionRef}
            handleCopyEmail={handleCopyEmail}
            isEmailCopied={isEmailCopied}
            handleShowFriendLinks={handleShowFriendLinks}
          />
        </div>

        <div id="section-about" className={contentStyles.sectionAnchor}>
          <AboutSection aboutSectionRef={aboutSectionRef} aboutContentRef={aboutContentRef} />
        </div>
      </div>

      {isDetailMounted && (
        <div
          ref={detailRef}
          className={`${styles.detailViewWrapper}${
            !isClosing ? ` ${styles.entering}` : ` ${styles.exiting}`
          }`}
          onAnimationEnd={handleDetailAnimEnd}
        >
          <button
            type="button"
            className={styles.globalBackButton}
            onClick={handleBackFromDetail}
            aria-label="BACK"
            style={{ position: 'fixed', zIndex: 10 }}
          ></button>
          {detail.type === 'work' && <WorkDetailView item={detail.item} />}
          {detail.type === 'experience' && <ExperienceDetailView item={detail.item} />}
          {detail.type === 'life' && <LifeDetailView item={detail.item} />}
        </div>
      )}
    </>
  );
}

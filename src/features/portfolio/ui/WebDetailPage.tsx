'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../../../shared/ui/detail/StandaloneDetailView.module.scss';
import { useLocaleStableScroll } from '@/features/navigation/model/LocalePageState';
import hudStyles from '../../../app/styles/Shell.module.scss';
import { useHudPower } from '../../../features/hud/model/HudProvider';
import { useTransition } from '../../../features/navigation/model/TransitionProvider';
import useNavigationIntentPrefetch from '../../../features/navigation/model/useNavigationIntentPrefetch';
import LazyImage from '../../../shared/ui/LazyImage';
import Lightbox from '../../../shared/ui/Lightbox';
import LocaleFallbackBanner from '../../../shared/ui/LocaleFallbackBanner';
import DetailFooterNav from '../../../shared/ui/detail/DetailFooterNav';
import DetailGallerySection from '../../../shared/ui/detail/DetailGallerySection';
import DetailHero from '../../../shared/ui/detail/DetailHero';
import DetailRailNav from '../../../shared/ui/detail/DetailRailNav';
import RevealParagraphSection from '../../../shared/ui/detail/RevealParagraphSection';
import { WebDetailParagraph } from './detail/webDetailParagraphs';
import WebProjectMetaSection from './detail/WebProjectMetaSection';
import WebSignalLinksSection from './detail/WebSignalLinksSection';
import { useDetailHeroParallax } from '@/shared/hooks/useDetailHeroParallax';
import { useDetailScrollReveal } from '@/shared/hooks/useDetailScrollReveal';
import { useDetailSectionNav, type DetailSectionNavItem } from '@/shared/hooks/useDetailSectionNav';
import { useDetailTitleReveal } from '@/shared/hooks/useDetailTitleReveal';
import { useTypingSubtitle } from '@/shared/hooks/useTypingSubtitle';
import useGalleryLightbox from '@/shared/hooks/useGalleryLightbox';
import { resolveImageUrl } from '@/shared/lib/cdn';
import type { Locale } from '@/shared/contracts/locale';
import type { CopyableToken, Project, TranslationStatus } from '../../../shared/types';

interface SignalLink {
  href: string;
  sub: string;
  text: string;
  type: 'external' | 'github' | 'video';
}

export interface WebDetailPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  project: Project;
  webProjects: Project[];
  copyableTokens: CopyableToken[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  originLocale: Locale;
}

function buildSignalLinks(project: Project, tCommon: (key: string) => string) {
  const links: SignalLink[] = [];
  if (project.liveUrl) {
    links.push({
      href: project.liveUrl,
      text: tCommon('visit'),
      sub: new URL(project.liveUrl).hostname,
      type: 'external',
    });
  }

  if (project.githubUrl) {
    links.push({
      href: project.githubUrl,
      text: tCommon('sourceCode'),
      sub: 'GITHUB',
      type: 'github',
    });
  }

  if (project.videoUrl) {
    const urls = Array.isArray(project.videoUrl) ? project.videoUrl : [project.videoUrl];
    urls.forEach((url, index) => {
      const bvMatch = url.match(/BV[\w]+/);
      links.push({
        href: url,
        text: urls.length > 1 ? `${tCommon('watch')} ${index + 1}` : tCommon('watch'),
        sub: bvMatch ? bvMatch[0] : 'VIDEO',
        type: 'video',
      });
    });
  }

  return links;
}

export default function WebDetailPage({
  locale,
  project,
  webProjects,
  copyableTokens,
  translationStatus,
  actualLocale,
  originLocale,
}: WebDetailPageProps) {
  return (
    <WebDetailContent
      key={project.id}
      locale={locale}
      project={project}
      webProjects={webProjects}
      copyableTokens={copyableTokens}
      translationStatus={translationStatus}
      actualLocale={actualLocale}
      originLocale={originLocale}
    />
  );
}

function WebDetailContent({
  locale,
  project,
  webProjects,
  copyableTokens,
  translationStatus,
  actualLocale,
  originLocale,
}: Omit<WebDetailPageProps, 'messages'>) {
  const { isInverted } = useHudPower();
  const { navigateTo } = useTransition();
  const prefetchOnIntent = useNavigationIntentPrefetch();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tDetail = useTranslations('detail');

  const currentIndex = webProjects.findIndex((entry) => entry.id === project.id);
  const prevProject = currentIndex > 0 ? webProjects[currentIndex - 1] : null;
  const nextProject = currentIndex < webProjects.length - 1 ? webProjects[currentIndex + 1] : null;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const handleWrapperScroll = useLocaleStableScroll('detail.scroll-top', wrapperRef);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitle = useTypingSubtitle(project.description, 55, 900);
  const detailDepsKey = [
    project.articleContent?.length ?? 0,
    project.galleryImages?.length ?? 0,
    project.highlights?.length ?? 0,
    project.liveUrl ?? '',
    project.githubUrl ?? '',
    Array.isArray(project.videoUrl) ? project.videoUrl.join('|') : (project.videoUrl ?? ''),
  ].join('|');
  const { visible, setRef } = useDetailScrollReveal(wrapperRef, detailDepsKey);
  const { activeNav, bindSectionRef, isPastHero, scrollToSection } = useDetailSectionNav({
    rootRef: wrapperRef,
    depsKey: detailDepsKey,
  });

  useDetailHeroParallax(wrapperRef, heroBgRef);
  useDetailTitleReveal({
    titleRef,
    wrapperClassName: styles.charWrapper,
    innerClassName: styles.charInner,
  });

  const paragraphs = project.articleContent
    ? project.articleContent
        .split(/\n\s*\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [];
  const galleryImages = project.galleryImages || [];
  const highlights = project.highlights || [];

  const signalLinks = useMemo(() => buildSignalLinks(project, tCommon), [project, tCommon]);

  const navItems = useMemo<DetailSectionNavItem[]>(() => {
    const items: DetailSectionNavItem[] = [{ id: 'hero', label: tNav('top') }];
    if (project.role || project.tech.length > 0 || highlights.length > 0) {
      items.push({ id: 'meta', label: tNav('meta') });
    }
    if (paragraphs.length > 0) {
      items.push({ id: 'brief', label: tNav('brief') });
    }
    if (galleryImages.length > 0) {
      items.push({ id: 'archive', label: tNav('archive') });
    }
    if (signalLinks.length > 0) {
      items.push({ id: 'signal', label: tNav('signal') });
    }
    return items;
  }, [
    galleryImages.length,
    highlights.length,
    paragraphs.length,
    project.role,
    project.tech.length,
    signalLinks.length,
    tNav,
  ]);

  const {
    bindThumbnailRef,
    clickedThumbnailRect,
    closeLightbox,
    currentLightboxImageIndex,
    getClosingRect,
    isLightboxOpen,
    openLightbox,
    showNextImage,
    showPrevImage,
  } = useGalleryLightbox(galleryImages.length);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const handleBack = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      navigateTo(`/${locale}/content#works`);
    },
    [locale, navigateTo],
  );

  const showHero = !project.noHero && !project.isConfidential && !!project.imageUrl;
  const baseCover = resolveImageUrl(project.imageUrl, 'large');
  const invertedCover = project.invertedImageUrl
    ? resolveImageUrl(project.invertedImageUrl, 'large')
    : '';
  const coverImage = isInverted && invertedCover ? invertedCover : baseCover;

  type WebGalleryGroup =
    | {
        kind: 'single';
        image: (typeof galleryImages)[number];
        index: number;
        revealIndex: number;
      }
    | {
        kind: 'pair';
        left: (typeof galleryImages)[number];
        right: (typeof galleryImages)[number];
        leftIndex: number;
        rightIndex: number;
        leftRevealIndex: number;
        rightRevealIndex: number;
      };

  let revealCursor = 0;
  const highlightRevealIndices = highlights.map(() => revealCursor++);
  const paragraphRevealIndices = paragraphs.map(() => revealCursor++);
  const webGalleryGroups: WebGalleryGroup[] = [];
  if (galleryImages.length > 0) {
    let galleryIndex = 0;
    while (galleryIndex < galleryImages.length) {
      const image = galleryImages[galleryIndex];
      const revealIndex = revealCursor++;

      if (
        image.isMobile &&
        galleryIndex + 1 < galleryImages.length &&
        galleryImages[galleryIndex + 1].isMobile
      ) {
        const nextIndex = galleryIndex + 1;
        const nextImage = galleryImages[nextIndex];
        const nextRevealIndex = revealCursor++;

        webGalleryGroups.push({
          kind: 'pair',
          left: image,
          right: nextImage,
          leftIndex: galleryIndex,
          rightIndex: nextIndex,
          leftRevealIndex: revealIndex,
          rightRevealIndex: nextRevealIndex,
        });
        galleryIndex += 2;
        continue;
      }

      webGalleryGroups.push({
        kind: 'single',
        image,
        index: galleryIndex,
        revealIndex,
      });
      galleryIndex += 1;
    }
  }

  const webGalleryItems = webGalleryGroups.map((group) => {
    if (group.kind === 'pair') {
      const leftImageSrc =
        isInverted && group.left.invertedSrc ? group.left.invertedSrc : group.left.src;
      const rightImageSrc =
        isInverted && group.right.invertedSrc ? group.right.invertedSrc : group.right.src;

      return (
        <div
          key={`mobile-pair-${group.leftIndex}`}
          className={styles.mobilePairRow}
          style={{
            opacity: visible.has(group.leftRevealIndex) ? 1 : 0,
            transform: visible.has(group.leftRevealIndex) ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
          }}
        >
          <div
            className={styles.mobileGalleryItem}
            onClick={(event) => openLightbox(group.leftIndex, event, 'gallery')}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              openLightbox(group.leftIndex, event, 'gallery');
            }}
            /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the gallery thumbnail is a custom lightbox control. */
            role="button"
            tabIndex={0}
            aria-label={group.left.caption || `${project.title} mobile ${group.leftIndex + 1}`}
            ref={(element) => {
              bindThumbnailRef(`gallery_${group.leftIndex}`)(element);
              setRef(group.leftRevealIndex)(element);
            }}
            data-reveal-idx={group.leftRevealIndex}
          >
            <LazyImage
              src={leftImageSrc}
              alt={group.left.caption || `${project.title} mobile ${group.leftIndex + 1}`}
              quality="high"
              preset="card"
            />
          </div>
          <div
            className={styles.mobileGalleryItem}
            onClick={(event) => openLightbox(group.rightIndex, event, 'gallery')}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              openLightbox(group.rightIndex, event, 'gallery');
            }}
            /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the gallery thumbnail is a custom lightbox control. */
            role="button"
            tabIndex={0}
            aria-label={group.right.caption || `${project.title} mobile ${group.rightIndex + 1}`}
            ref={(element) => {
              bindThumbnailRef(`gallery_${group.rightIndex}`)(element);
              setRef(group.rightRevealIndex)(element);
            }}
            data-reveal-idx={group.rightRevealIndex}
          >
            <LazyImage
              src={rightImageSrc}
              alt={group.right.caption || `${project.title} mobile ${group.rightIndex + 1}`}
              quality="high"
              preset="card"
            />
          </div>
        </div>
      );
    }

    const imageSrc =
      isInverted && group.image.invertedSrc ? group.image.invertedSrc : group.image.src;
    return (
      <div
        key={`gallery-${group.index}`}
        className={`${styles.webGalleryItem} ${visible.has(group.revealIndex) ? styles.visible : ''}`}
        onClick={(event) => openLightbox(group.index, event, 'gallery')}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          openLightbox(group.index, event, 'gallery');
        }}
        /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the gallery thumbnail is a custom lightbox control. */
        role="button"
        tabIndex={0}
        aria-label={group.image.caption || `${project.title} gallery ${group.index + 1}`}
        ref={(element) => {
          bindThumbnailRef(`gallery_${group.index}`)(element);
          setRef(group.revealIndex)(element);
        }}
        data-reveal-idx={group.revealIndex}
        style={{
          opacity: visible.has(group.revealIndex) ? 1 : 0,
          transform: visible.has(group.revealIndex) ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        <LazyImage
          src={imageSrc}
          alt={group.image.caption || `${project.title} gallery ${group.index + 1}`}
          quality="high"
          preset="card"
        />
      </div>
    );
  });

  return (
    <div
      ref={wrapperRef}
      className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}
      onScroll={handleWrapperScroll}
    >
      <div className={styles.mainContent}>
        {translationStatus !== 'source' && (
          <LocaleFallbackBanner
            requestedLocale={locale}
            actualLocale={actualLocale}
            originLocale={originLocale}
            status={translationStatus}
          />
        )}

        <DetailHero
          styles={styles}
          title={project.title}
          subtitle={subtitle.displayed}
          subtitleDone={subtitle.done}
          titleRef={titleRef}
          heroBgRef={heroBgRef}
          sectionRef={bindSectionRef('hero')}
          backgroundImage={coverImage}
          compact={!showHero}
        />

        {(project.role || project.tech.length > 0 || highlights.length > 0) && (
          <WebProjectMetaSection
            highlights={highlights}
            sectionRef={bindSectionRef('meta')}
            project={project}
            styles={styles}
            tDetail={tDetail}
            visible={visible}
            setRef={setRef}
            highlightRevealIndices={highlightRevealIndices}
          />
        )}

        {paragraphs.length > 0 && (
          <RevealParagraphSection
            styles={styles}
            sectionRef={bindSectionRef('brief')}
            sectionId="brief"
            className={styles.timelineSection}
            itemClassName={styles.timelineTextOnly}
            textClassName={styles.timelineText}
            paragraphs={paragraphs}
            title={tDetail('projectBrief')}
            visible={visible}
            setRef={setRef}
            revealIndices={paragraphRevealIndices}
            renderParagraph={(paragraph, index) => (
              <WebDetailParagraph
                paragraph={paragraph}
                paragraphIndex={index}
                copyableTokens={copyableTokens}
                copiedId={copiedId}
                copiedLabel={tCommon('copied')}
                onCopy={handleCopy}
                styles={styles}
              />
            )}
          />
        )}

        {galleryImages.length > 0 && (
          <DetailGallerySection
            styles={styles}
            sectionRef={bindSectionRef('archive')}
            className={styles.webGallerySection}
            contentClassName={styles.webGalleryStack}
          >
            {webGalleryItems}
          </DetailGallerySection>
        )}

        {signalLinks.length > 0 && (
          <WebSignalLinksSection
            links={signalLinks}
            sectionRef={bindSectionRef('signal')}
            styles={styles}
            title={tDetail('signalOutput')}
          />
        )}

        <DetailFooterNav
          styles={styles}
          previous={
            prevProject
              ? {
                  href: `/${locale}/web/${prevProject.id}`,
                  title: prevProject.title,
                  cursorLabel: 'PREVIOUS',
                  onNavigateIntent: () => prefetchOnIntent(`/${locale}/web/${prevProject.id}`),
                  onClick: (event) => {
                    event.preventDefault();
                    navigateTo(`/${locale}/web/${prevProject.id}`);
                  },
                }
              : null
          }
          next={
            nextProject
              ? {
                  href: `/${locale}/web/${nextProject.id}`,
                  title: nextProject.title,
                  cursorLabel: 'NEXT',
                  onNavigateIntent: () => prefetchOnIntent(`/${locale}/web/${nextProject.id}`),
                  onClick: (event) => {
                    event.preventDefault();
                    navigateTo(`/${locale}/web/${nextProject.id}`);
                  },
                }
              : null
          }
          fallback={{
            href: `/${locale}/content#works`,
            title: tCommon('returnToMain'),
            cursorLabel: 'BACK',
            onNavigateIntent: () => prefetchOnIntent(`/${locale}/content#works`),
            onClick: handleBack as React.MouseEventHandler<HTMLAnchorElement>,
          }}
        />
      </div>

      <DetailRailNav
        styles={styles}
        isPastHero={isPastHero}
        activeNav={activeNav}
        navItems={navItems}
        onBack={handleBack as React.MouseEventHandler<HTMLButtonElement>}
        onNavigateSection={scrollToSection}
      />

      {isLightboxOpen &&
        galleryImages.length > 0 &&
        (() => {
          const lightboxImage = galleryImages[currentLightboxImageIndex];
          const effectiveImage =
            isInverted && lightboxImage.invertedSrc
              ? { ...lightboxImage, src: lightboxImage.invertedSrc }
              : lightboxImage;
          return (
            <Lightbox
              image={effectiveImage}
              onClose={closeLightbox}
              onPrev={galleryImages.length > 1 ? showPrevImage : null}
              onNext={galleryImages.length > 1 ? showNextImage : null}
              thumbnailRect={clickedThumbnailRect}
              currentIndex={currentLightboxImageIndex}
              totalImages={galleryImages.length}
              getClosingRectForIndex={getClosingRect}
            />
          );
        })()}
    </div>
  );
}

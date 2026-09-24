import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../../styles/BlogSection.module.scss';
import cardStyles from '../../styles/BlogPostCard.module.scss';
import { formatReadingTime } from '../../model/formatReadingTime';
import { useReducedMotion } from '@/shared/hooks/useMediaQuery';
import type { Locale } from '@/shared/contracts/locale';
import type { BlogPostMeta } from '../../../../shared/types';
import {
  createTypewriterSequence,
  getTypewriterStepAtProgress,
  TYPEWRITER_FRAME_INTERVAL_MS,
  type TypewriterFramePart,
} from '@/shared/lib/typewriter';
import TypewriterFrame from '@/shared/ui/TypewriterFrame';

interface BlogSectionProps {
  blogSectionRef: RefObject<HTMLDivElement | null>;
  locale: Locale;
  posts: BlogPostMeta[];
  handleBlogItemClick: (post: BlogPostMeta) => void;
  handleBlogItemIntent?: (post: BlogPostMeta) => void;
}

interface BlogExcerptProps {
  text: string;
  reducedMotion: boolean;
  locale: Locale;
}

function literalFrameParts(text: string): readonly TypewriterFramePart[] {
  return [{ kind: 'literal', text }];
}

function BlogExcerpt({ text, reducedMotion, locale }: BlogExcerptProps) {
  const excerptRef = useRef<HTMLParagraphElement>(null);
  const [animation, setAnimation] = useState({
    target: text,
    displayed: text,
    parts: literalFrameParts(text),
    running: false,
  });
  const displayedText = reducedMotion || animation.target !== text ? text : animation.displayed;
  const isAnimating = !reducedMotion && animation.target === text && animation.running;

  useEffect(() => {
    const excerpt = excerptRef.current;
    if (reducedMotion || !excerpt || typeof IntersectionObserver === 'undefined') return;

    const sequence = createTypewriterSequence(text, 'scramble', { locale });
    if (sequence.stepCount === 0) return;
    const durationMs = sequence.durationMs;

    let started = false;
    let timerId: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((entry) => entry.isIntersecting)) return;
        started = true;
        observer.disconnect();
        setAnimation({
          target: text,
          displayed: sequence.frameAt(0),
          parts: sequence.framePartsAt(0),
          running: true,
        });

        const startedAt = Date.now();
        const animate = () => {
          const elapsed = Math.min(durationMs, Date.now() - startedAt);
          const displayed =
            elapsed >= durationMs
              ? text
              : sequence.frameAt(getTypewriterStepAtProgress(sequence, elapsed / durationMs));
          setAnimation({
            target: text,
            displayed,
            parts: sequence.framePartsAt(
              getTypewriterStepAtProgress(sequence, elapsed / durationMs),
            ),
            running: elapsed < durationMs,
          });

          if (elapsed >= durationMs) {
            timerId = null;
            return;
          }
          timerId = window.setTimeout(
            animate,
            Math.min(TYPEWRITER_FRAME_INTERVAL_MS, durationMs - elapsed),
          );
        };

        timerId = window.setTimeout(animate, TYPEWRITER_FRAME_INTERVAL_MS);
      },
      { threshold: 0.1 },
    );
    observer.observe(excerpt);

    return () => {
      observer.disconnect();
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [locale, reducedMotion, text]);

  return (
    <>
      <p ref={excerptRef} className={cardStyles.cardExcerpt} aria-hidden={isAnimating}>
        {isAnimating ? <TypewriterFrame parts={animation.parts} /> : displayedText}
      </p>
      {isAnimating ? <span className="visually-hidden">{text}</span> : null}
    </>
  );
}

export default function BlogSection({
  blogSectionRef,
  locale,
  posts,
  handleBlogItemClick,
  handleBlogItemIntent,
}: BlogSectionProps) {
  const t = useTranslations('sections.blog');
  const reducedMotion = useReducedMotion();

  return (
    <div ref={blogSectionRef} className={styles.contentSection}>
      <h2>{t('heading')}</h2>
      <div className={styles.postList}>
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className={`${cardStyles.card}${post.pinned ? ` ${cardStyles.pinned}` : ''}`}
            /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- this SPA card keeps block layout while exposing link semantics and keyboard activation. */
            role="link"
            tabIndex={0}
            aria-label={post.title}
            data-cursor-no-magnetic
            onClick={() => handleBlogItemClick(post)}
            onPointerDown={(event) => {
              if (event.button === 0) handleBlogItemIntent?.(post);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleBlogItemIntent?.(post);
                handleBlogItemClick(post);
              }
            }}
          >
            <div className={cardStyles.cardInner}>
              <span className={cardStyles.cardIndex}>{String(i + 1).padStart(2, '0')}</span>
              <div className={cardStyles.cardContent}>
                <div className={cardStyles.cardHeader}>
                  <h4 className={cardStyles.cardTitle}>
                    {post.title}
                    {post.pinned && (
                      <span className={cardStyles.cardPinnedBadge} aria-label={t('pinned')}>
                        {t('pinned')}
                      </span>
                    )}
                    {post.access.mode === 'totp' && (
                      <span className={cardStyles.cardPinnedBadge} aria-label={t('protected')}>
                        {t('protected')}
                      </span>
                    )}
                  </h4>
                  {post.date && <span className={cardStyles.cardDate}>{post.date}</span>}
                </div>
                {post.excerpt ? (
                  <BlogExcerpt text={post.excerpt} reducedMotion={reducedMotion} locale={locale} />
                ) : null}
                {post.tags.length > 0 || post.readingMinutes > 0 ? (
                  <div className={cardStyles.cardFooter}>
                    {post.tags.length > 0 ? (
                      <div className={cardStyles.cardTags}>
                        {post.tags.map((tag) => (
                          <span key={tag} className={cardStyles.cardTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span />
                    )}
                    {post.readingMinutes > 0 ? (
                      <span className={cardStyles.cardReadingTime}>
                        {formatReadingTime(post.readingMinutes, locale)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <span className={cardStyles.cardArrow}>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

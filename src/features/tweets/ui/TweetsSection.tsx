import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useHudPower } from '../../hud/model/HudProvider';
import { useReducedMotion } from '@/shared/hooks/useMediaQuery';
import { useLocaleStableState } from '@/features/navigation/model/LocalePageState';
import {
  createTypewriterSequence,
  getTypewriterStepAtProgress,
  splitTypewriterText,
  TYPEWRITER_FRAME_INTERVAL_MS,
  type TypewriterFramePart,
} from '@/shared/lib/typewriter';
import TypewriterFrame from '@/shared/ui/TypewriterFrame';
import { isLocale, type Locale } from '@/shared/contracts/locale';
import {
  getTweetPlainText,
  hasExplain,
  parseTweetSegments,
  renderTweetSegments,
} from './parseExplain';
import { resolveTweetContent } from '../model/resolve';
import type { TweetItem, TweetMonthGroup } from '../model/types';
import styles from '../styles/TweetsSection.module.scss';
import cardStyles from '../../blog/styles/BlogPostCard.module.scss';

interface TweetsSectionProps {
  locale: Locale;
  monthGroups: TweetMonthGroup[];
  totalMonths: number;
  monthBatchSize: number;
  generatedAt?: string;
  sourceUnavailable?: boolean;
  sourceError?: string | null;
}

const TWEET_DELETE_MAX_DURATION_MS = 360;
const TWEET_DELETE_PER_GRAPHEME_MS = 6;

function literalFrameParts(text: string): readonly TypewriterFramePart[] {
  return [{ kind: 'literal', text }];
}

function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  // 不直接用 .format()——ICU 在不同 locale / 不同运行时（Node 与 V8）
  // 会插入 LRM / NNBSP 等不可见字符，server 与 client 输出"看起来一样
  // 实际字节不同"，触发 hydration mismatch。这里用 formatToParts 拿到
  // 结构化字段后自己拼分隔符，彻底脱离 ICU 的双向标记。
  // hourCycle h23 钉死 00–23，避开 hour12: false 在午夜输出 24:xx。
  // locale 形参保留以便将来扩展——目前所有 locale 统一 yyyy/mm/dd hh:mm。
  void locale;
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const year = lookup('year');
  const month = lookup('month');
  const day = lookup('day');
  const hour = lookup('hour');
  const minute = lookup('minute');

  return `${year}/${month}/${day} ${hour}:${minute}`;
}

function formatMonthLabel(value: string, locale: Locale): string {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

/**
 * 推文文本切换打字机。
 *
 * 首次挂载后从完整文本开始播放；之后目标变化时先快速清除当前文本，再在固定总时长内打出并校正新文本。
 */
export function useTweetTypewriter(
  target: string,
  reducedMotion: boolean,
  locale: Locale = 'zh-CN',
) {
  const [displayState, setDisplayState] = useState({
    text: target,
    target,
    running: false,
    parts: literalFrameParts(target),
  });
  const timerRef = useRef<number | null>(null);
  const animationPendingRef = useRef(false);
  const displayTextRef = useRef(target);
  const effectTargetRef = useRef<string | null>(null);
  const displayText = displayState.text;
  const isAnimating = !reducedMotion && (displayState.target !== target || displayState.running);

  useEffect(() => {
    const updateDisplayText = (text: string) => {
      displayTextRef.current = text;
      setDisplayState((current) =>
        current.text === text && current.parts.length === 1 && current.parts[0]?.kind === 'literal'
          ? current
          : { ...current, text, parts: literalFrameParts(text) },
      );
    };
    const updateDisplayFrame = (
      sequence: ReturnType<typeof createTypewriterSequence>,
      step: number,
    ) => {
      const text = sequence.frameAt(step);
      displayTextRef.current = text;
      setDisplayState((current) => ({
        ...current,
        text,
        parts: sequence.framePartsAt(step),
      }));
    };
    const completeTarget = () => {
      displayTextRef.current = target;
      setDisplayState((current) =>
        current.text === target && current.target === target && !current.running
          ? current
          : { text: target, target, running: false, parts: literalFrameParts(target) },
      );
    };

    const isInitialTarget = effectTargetRef.current === null;
    const targetChanged = effectTargetRef.current !== null && effectTargetRef.current !== target;
    effectTargetRef.current = target;
    if (!isInitialTarget && !targetChanged && !animationPendingRef.current) {
      if (reducedMotion) {
        completeTarget();
      }
      return undefined;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const sequence = createTypewriterSequence(target, 'scramble', { locale });
    if (reducedMotion || sequence.stepCount === 0) {
      animationPendingRef.current = false;
      completeTarget();
      return undefined;
    }

    const remaining = splitTypewriterText(displayTextRef.current);
    if (!remaining || (targetChanged && remaining.join('') === target)) {
      animationPendingRef.current = false;
      completeTarget();
      return undefined;
    }

    const animationDurationMs = sequence.durationMs;
    const deleteDuration = Math.min(
      TWEET_DELETE_MAX_DURATION_MS,
      Math.floor(animationDurationMs / 2),
      remaining.length * TWEET_DELETE_PER_GRAPHEME_MS,
    );
    const typeDuration = animationDurationMs - deleteDuration;
    const animationStartedAt = Date.now();
    animationPendingRef.current = true;

    const tick = () => {
      const elapsed = Math.min(animationDurationMs, Date.now() - animationStartedAt);
      if (elapsed < deleteDuration) {
        const removed = Math.floor((elapsed / deleteDuration) * remaining.length);
        updateDisplayText(remaining.slice(0, remaining.length - removed).join(''));
      } else {
        const typeProgress = typeDuration > 0 ? (elapsed - deleteDuration) / typeDuration : 1;
        const typeStep = getTypewriterStepAtProgress(sequence, typeProgress);
        updateDisplayFrame(sequence, typeStep);
      }

      if (elapsed >= animationDurationMs) {
        animationPendingRef.current = false;
        completeTarget();
        timerRef.current = null;
        return;
      }
      setDisplayState((current) =>
        current.target === target && current.running
          ? current
          : { ...current, target, running: true },
      );
      timerRef.current = window.setTimeout(
        tick,
        Math.min(TYPEWRITER_FRAME_INTERVAL_MS, animationDurationMs - elapsed),
      );
    };

    timerRef.current = window.setTimeout(tick, TYPEWRITER_FRAME_INTERVAL_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [locale, reducedMotion, target]);

  return {
    displayText: reducedMotion ? target : displayText,
    displayParts: reducedMotion ? literalFrameParts(target) : displayState.parts,
    isAnimating,
  };
}

interface TweetCardProps {
  tweet: TweetItem;
  locale: Locale;
  contentStyle?: React.CSSProperties;
  reducedMotion: boolean;
}

function TweetCard({ tweet, locale, contentStyle, reducedMotion }: TweetCardProps) {
  const t = useTranslations('pages.tweets');
  const resolved = resolveTweetContent(tweet, locale);
  const [showingOriginal, setShowingOriginal] = useLocaleStableState(
    `tweets.${tweet.id}.showing-original`,
    false,
  );

  const canSwitch = resolved.isAutoTranslated;
  const targetText = canSwitch && showingOriginal ? tweet.content : resolved.displayContent;
  const typewriterLocale =
    showingOriginal || !canSwitch
      ? isLocale(resolved.displaySourceLang)
        ? resolved.displaySourceLang
        : locale
      : locale;

  // 解析 Explain 子集；打字机用 plain text 串避免逐字打出 `<` 标签源码，
  // 动画结束后再挂载含注解的节点树（reveal 下划线动画自动触发）。
  const segments = useMemo(
    () =>
      tweet.origin?.provider === 'x'
        ? [{ type: 'text' as const, value: targetText }]
        : parseTweetSegments(targetText),
    [targetText, tweet.origin?.provider],
  );
  const plainText = useMemo(() => getTweetPlainText(segments), [segments]);
  const segmentsHasExplain = useMemo(() => hasExplain(segments), [segments]);
  const { displayText, displayParts, isAnimating } = useTweetTypewriter(
    plainText,
    reducedMotion,
    typewriterLocale,
  );

  const sourceLangLabel = t(`sourceLanguages.${resolved.displaySourceLang}`);
  const noticeText = canSwitch
    ? showingOriginal
      ? t('originalLabel', { source: sourceLangLabel })
      : t('autoTranslatedFrom', { source: sourceLangLabel })
    : '';
  const toggleLabel = showingOriginal ? t('viewTranslation') : t('viewOriginal');

  // 打字机结束且含 Explain 时切到节点树；否则保持纯文本（避免动画期间
  // 渲染半句注解或动画外多余的节点开销）。
  const showAnnotated = !isAnimating && segmentsHasExplain && displayText === plainText;

  return (
    <article className={`${cardStyles.card}${tweet.pinned ? ` ${cardStyles.pinned}` : ''}`}>
      <div className={cardStyles.cardInner}>
        <div className={cardStyles.cardContent}>
          <div className={styles.tweetMetaRow}>
            <div className={styles.tweetMetaLeft}>
              <time className={cardStyles.cardDate} dateTime={tweet.createdAt}>
                {formatDate(tweet.createdAt, locale)}
              </time>
              {tweet.pinned ? (
                <span className={cardStyles.cardPinnedBadge} aria-label={t('pinned')}>
                  {t('pinned')}
                </span>
              ) : null}
              {tweet.origin?.provider === 'x' ? (
                <a
                  className={styles.tweetSourceLink}
                  href={tweet.origin.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('viewOnX')}
                </a>
              ) : null}
            </div>
            <span className={styles.tweetId}>{tweet.id}</span>
          </div>

          <p
            className={`${styles.tweetContent}${isAnimating ? ` ${styles.tweetContentTyping}` : ''}`}
            style={contentStyle}
            aria-live="off"
            aria-hidden={isAnimating}
          >
            {showAnnotated ? (
              renderTweetSegments(segments)
            ) : (
              <TypewriterFrame parts={displayParts} />
            )}
          </p>
          {isAnimating ? (
            <span className="visually-hidden" aria-live="polite">
              {plainText}
            </span>
          ) : null}

          {canSwitch ? (
            <div className={styles.translationRow}>
              <span className={styles.translationNotice}>{noticeText}</span>
              <button
                type="button"
                className={styles.originalToggle}
                aria-pressed={showingOriginal}
                onClick={() => setShowingOriginal((current) => !current)}
              >
                {toggleLabel}
              </button>
            </div>
          ) : null}

          <div className={cardStyles.cardFooter}>
            {tweet.tags?.length ? (
              <div className={cardStyles.cardTags}>
                {tweet.tags.map((tag) => (
                  <span key={tag} className={cardStyles.cardTag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <span />
            )}

            {tweet.lang ? (
              <span className={cardStyles.cardReadingTime}>{tweet.lang}</span>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TweetsSection({
  locale,
  monthGroups,
  totalMonths,
  monthBatchSize,
  generatedAt,
  sourceUnavailable = false,
  sourceError,
}: TweetsSectionProps) {
  const t = useTranslations('pages.tweets');
  const tCommon = useTranslations('common');
  const { isInverted } = useHudPower();
  const reducedMotion = useReducedMotion();
  const [loadedGroups, setLoadedGroups] = useLocaleStableState('tweets.loaded-groups', monthGroups);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');

  const formattedGeneratedAt = useMemo(() => {
    if (!generatedAt) return '';
    return formatDate(generatedAt, locale);
  }, [generatedAt, locale]);

  const hasMoreMonths = loadedGroups.length < totalMonths;

  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreMonths) return;

    setLoadingMore(true);
    setLoadMoreError('');

    try {
      const response = await fetch(
        `/api/tweet-months?offset=${loadedGroups.length}&limit=${monthBatchSize}`,
        { cache: 'no-store' },
      );
      const json = (await response.json()) as {
        error?: string;
        monthGroups?: TweetMonthGroup[];
      };

      if (!response.ok) {
        throw new Error(json.error ?? 'Failed to load more tweets.');
      }

      startTransition(() => {
        setLoadedGroups((current) => [...current, ...(json.monthGroups ?? [])]);
      });
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : 'Failed to load more tweets.');
    } finally {
      setLoadingMore(false);
    }
  };

  const tweetContentStyle = isInverted ? { color: '#161616' } : undefined;

  return (
    <section className={styles.tweetsSection}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{t('heading')}</h2>
        <p className={styles.description}>{t('description')}</p>
      </div>

      {loadedGroups.length === 0 ? (
        sourceUnavailable ? (
          <>
            <p className={styles.emptyState}>{t('unavailable')}</p>
            {process.env.NODE_ENV !== 'production' && sourceError ? (
              <p className={styles.loadMoreError}>
                {t('unavailableHint', { reason: sourceError })}
              </p>
            ) : null}
          </>
        ) : (
          <p className={styles.emptyState}>{t('empty')}</p>
        )
      ) : (
        <>
          <div className={styles.monthGroupList}>
            {loadedGroups.map((group) => (
              <section key={group.month} className={styles.monthGroup}>
                <div className={styles.monthHeader}>
                  <h3 className={styles.monthHeading}>{formatMonthLabel(group.month, locale)}</h3>
                  <span className={styles.monthMeta}>{group.tweets.length}</span>
                </div>

                <div className={styles.tweetList}>
                  {group.tweets.map((tweet) => (
                    <TweetCard
                      key={tweet.id}
                      tweet={tweet}
                      locale={locale}
                      contentStyle={tweetContentStyle}
                      reducedMotion={reducedMotion}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {hasMoreMonths ? (
            <>
              <button
                type="button"
                className={styles.loadMoreButton}
                onClick={() => {
                  handleLoadMore().catch(() => {});
                }}
                disabled={loadingMore}
              >
                {loadingMore ? tCommon('loading') : t('loadMore')}
              </button>
              {loadMoreError ? <p className={styles.loadMoreError}>{loadMoreError}</p> : null}
            </>
          ) : null}
        </>
      )}

      {formattedGeneratedAt ? (
        <p className={styles.generatedAt}>{t('generatedAt', { value: formattedGeneratedAt })}</p>
      ) : null}
    </section>
  );
}

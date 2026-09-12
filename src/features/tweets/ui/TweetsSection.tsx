import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useHudPower } from '../../hud/model/HudProvider';
import { useLocaleStableState } from '@/features/navigation/model/LocalePageState';
import type { Locale } from '@/shared/contracts/locale';
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

const ALPHABETIC_CHAR_RE = /[A-Za-zЀ-ӿ]/;
const CJK_CHAR_RE = /[㐀-鿿豈-﫿]/;

// 推文打字机节奏。比 Fate 文案更紧凑——内容更短，节奏拖得太慢会让用户等。
const ALPHABETIC_TYPE_DELAY = 22;
const ALPHABETIC_DELETE_DELAY = 12;
const CJK_TYPE_DELAY = 70;
const CJK_DELETE_DELAY = 32;

function getTypingDelays(text: string): { typeDelay: number; deleteDelay: number } {
  const hasAlphabetic = ALPHABETIC_CHAR_RE.test(text);
  const hasCjk = CJK_CHAR_RE.test(text);

  if (hasAlphabetic && !hasCjk) {
    return { typeDelay: ALPHABETIC_TYPE_DELAY, deleteDelay: ALPHABETIC_DELETE_DELAY };
  }
  return { typeDelay: CJK_TYPE_DELAY, deleteDelay: CJK_DELETE_DELAY };
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
 * 首次挂载时直接显示目标文本（避免 SSG 首屏所有卡片同时打字），
 * 之后每次目标文本变化时：先删空当前文本 → 再按 CJK / Latin 节奏打出新文本。
 */
function useTweetTypewriter(target: string) {
  const [displayText, setDisplayText] = useState(target);
  const [isAnimating, setIsAnimating] = useState(false);
  const firstRunRef = useRef(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      setDisplayText(target);
      return undefined;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsAnimating(true);
    let phase: 'delete' | 'type' = 'delete';
    let typeIndex = 0;

    const tick = () => {
      if (phase === 'delete') {
        setDisplayText((prev) => {
          if (prev.length === 0) {
            phase = 'type';
            typeIndex = 0;
            const { typeDelay } = getTypingDelays(target);
            timerRef.current = window.setTimeout(tick, typeDelay);
            return prev;
          }
          const { deleteDelay } = getTypingDelays(prev);
          timerRef.current = window.setTimeout(tick, deleteDelay);
          return prev.slice(0, -1);
        });
        return;
      }

      if (typeIndex >= target.length) {
        setIsAnimating(false);
        return;
      }
      typeIndex += 1;
      setDisplayText(target.slice(0, typeIndex));
      const { typeDelay } = getTypingDelays(target);
      timerRef.current = window.setTimeout(tick, typeDelay);
    };

    tick();

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [target]);

  return { displayText, isAnimating };
}

interface TweetCardProps {
  tweet: TweetItem;
  locale: Locale;
  contentStyle?: React.CSSProperties;
}

function TweetCard({ tweet, locale, contentStyle }: TweetCardProps) {
  const t = useTranslations('pages.tweets');
  const resolved = resolveTweetContent(tweet, locale);
  const [showingOriginal, setShowingOriginal] = useLocaleStableState(
    `tweets.${tweet.id}.showing-original`,
    false,
  );

  const canSwitch = resolved.isAutoTranslated;
  const targetText = canSwitch && showingOriginal ? tweet.content : resolved.displayContent;

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
  const { displayText, isAnimating } = useTweetTypewriter(plainText);

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
            aria-live="polite"
          >
            {showAnnotated ? renderTweetSegments(segments) : displayText}
          </p>

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

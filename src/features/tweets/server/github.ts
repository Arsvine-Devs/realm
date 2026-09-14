import type {
  TweetIndexItem,
  TweetItem,
  TweetMonthGroup,
  TweetMonthGroupsPage,
} from '../model/types';
import {
  fetchPublishedTweetIndex,
  fetchPublishedTweetMonth,
} from '@/shared/lib/content/content-api';

const STRESS_TEST_ENABLED = process.env.TWEETS_STRESS_TEST === '1';
const STRESS_TEST_YEARS = parsePositiveInt(process.env.TWEETS_STRESS_YEARS, 6);
const STRESS_TEST_MONTHS_PER_YEAR = parsePositiveInt(process.env.TWEETS_STRESS_MONTHS_PER_YEAR, 12);
const STRESS_TEST_TWEETS_PER_MONTH = parsePositiveInt(
  process.env.TWEETS_STRESS_TWEETS_PER_MONTH,
  24,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTweetOrigin(value: unknown): value is NonNullable<TweetItem['origin']> {
  if (!isRecord(value)) return false;
  if (value.provider !== 'x') return false;
  if (typeof value.externalId !== 'string' || !/^\d{1,19}$/.test(value.externalId)) return false;
  if (typeof value.authorId !== 'string' || !/^\d{1,19}$/.test(value.authorId)) return false;
  if (
    typeof value.authorUsername !== 'string' ||
    !/^[A-Za-z0-9_]{1,15}$/.test(value.authorUsername)
  )
    return false;
  if (typeof value.canonicalUrl !== 'string') return false;
  try {
    const url = new URL(value.canonicalUrl);
    if (url.protocol !== 'https:' || !['x.com', 'twitter.com'].includes(url.hostname)) return false;
  } catch {
    return false;
  }
  return (
    typeof value.importedAt === 'string' &&
    (value.syncedAt === undefined || typeof value.syncedAt === 'string')
  );
}

function isTweetList(value: unknown): value is TweetItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.content === 'string' &&
        (item.updatedAt === undefined || typeof item.updatedAt === 'string') &&
        (item.tags === undefined ||
          (Array.isArray(item.tags) && item.tags.every((tag) => typeof tag === 'string'))) &&
        (item.visibility === undefined ||
          item.visibility === 'public' ||
          item.visibility === 'hidden' ||
          item.visibility === 'private') &&
        (item.origin === undefined || isTweetOrigin(item.origin)),
    )
  );
}

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function sortTweets(tweets: TweetItem[]): TweetItem[] {
  return tweets.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function buildStressTweet(month: string, index: number): TweetItem {
  const year = month.slice(0, 4);
  const monthNumber = month.slice(5, 7);
  const day = String((index % 28) + 1).padStart(2, '0');
  const hour = String((index * 3) % 24).padStart(2, '0');
  const minute = String((index * 7) % 60).padStart(2, '0');
  const createdAt = `${year}-${monthNumber}-${day}T${hour}:${minute}:00+08:00`;
  const langs: Array<TweetItem['lang']> = ['zh-CN', 'zh-TW', 'en', 'ja', 'other'];
  const lang = langs[index % langs.length] ?? 'zh-CN';
  // 每 5 条注入一段 <Explain>，覆盖打字机 reveal、hover/focus tooltip、
  // 切换原文/译文（译文里被 strip 掉，保持纯文本）等行为。
  const withExplain = index % 5 === 0;
  const baseContent =
    `压力测试推文 ${month} / ${String(index + 1).padStart(2, '0')}。\n` +
    '这一条用于测试长列表、长文本、按月预加载、Load More，以及多语言回退在高数量下的表现。';
  const content = withExplain
    ? `${baseContent}\n` +
      `备注：<Explain note="句级注解 tooltip 的压测样本，hover/focus 触发；移动端切换为底部 fixed 面板。">这里是被注解的短语</Explain>，` +
      `译文里不会保留该标签。`
    : baseContent;

  const translations: NonNullable<TweetItem['translations']> = {};
  if (lang !== 'zh-CN') {
    translations['zh-CN'] = {
      content: `这是一条 ${lang} 原文的压测翻译版本 ${month}-${String(index + 1).padStart(2, '0')}。`,
      sourceLang: lang,
      translatedAt: createdAt,
      model: 'stress-preview',
      promptKey: 'translate-to-zh-CN',
      stale: index % 9 === 0,
    };
  }
  if (lang !== 'zh-TW') {
    translations['zh-TW'] = {
      content: `這是一條 ${lang} 原文的壓測翻譯版本 ${month}-${String(index + 1).padStart(2, '0')}。`,
      sourceLang: lang,
      translatedAt: createdAt,
      model: 'stress-preview',
      promptKey: 'translate-to-zh-TW',
      stale: index % 7 === 0,
    };
  }
  if (lang !== 'en') {
    translations.en = {
      content: `Stress-preview translation ${month}-${String(index + 1).padStart(2, '0')} from ${lang}.`,
      sourceLang: lang,
      translatedAt: createdAt,
      model: 'stress-preview',
      promptKey: 'translate-to-en',
      stale: index % 11 === 0,
    };
  }

  return {
    id: `${year}${monthNumber}${day}-${String(index + 1).padStart(3, '0')}`,
    createdAt,
    updatedAt: createdAt,
    content,
    lang,
    tags: [`year-${year}`, `month-${monthNumber}`, index % 2 === 0 ? 'preview' : 'stress'],
    visibility: 'public',
    pinned: index % 10 === 0,
    translations,
  };
}

function buildStressMonthGroups(): TweetMonthGroup[] {
  const now = new Date();
  const groups: TweetMonthGroup[] = [];

  for (let yearOffset = 0; yearOffset < STRESS_TEST_YEARS; yearOffset += 1) {
    const year = now.getFullYear() - yearOffset;
    for (let monthIndex = STRESS_TEST_MONTHS_PER_YEAR; monthIndex >= 1; monthIndex -= 1) {
      const month = `${year}-${String(monthIndex).padStart(2, '0')}`;
      const tweets = Array.from({ length: STRESS_TEST_TWEETS_PER_MONTH }, (_, index) =>
        buildStressTweet(month, index),
      );

      groups.push({
        month,
        count: tweets.length,
        updatedAt: tweets[0]?.updatedAt,
        tweets: sortTweets(tweets),
      });
    }
  }

  return groups;
}

async function getTweetIndex(): Promise<TweetIndexItem[]> {
  const data = await fetchPublishedTweetIndex();
  if (!Array.isArray(data.months)) throw new Error('Invalid published tweet index shape');
  return data.months;
}

export async function getTweetMonthGroups(): Promise<TweetMonthGroup[]> {
  if (STRESS_TEST_ENABLED) {
    return buildStressMonthGroups();
  }

  let index: TweetIndexItem[];
  try {
    index = await getTweetIndex();
  } catch (error) {
    console.warn('[tweets/content] published release unavailable, returning empty month groups:', error);
    return [];
  }

  const monthlyTweets = await Promise.all(
    index.map(async (item): Promise<TweetMonthGroup | null> => {
      try {
        const data = (await fetchPublishedTweetMonth(item.month)).tweets;
        if (!isTweetList(data)) throw new Error(`Invalid tweet document: ${item.path}`);
        const tweets = data;
        const visibleTweets = sortTweets(
          tweets.filter((tweet) => (tweet.visibility ?? 'public') === 'public'),
        );

        return {
          month: item.month,
          count: item.count,
          updatedAt: item.updatedAt,
          tweets: visibleTweets,
        } satisfies TweetMonthGroup;
      } catch (error) {
        // The index is a directory of independent monthly documents. A single
        // transient 5xx must not prevent ISR/static generation from rendering
        // every other available month.
        console.warn(`[tweets/content] skipping unavailable month ${item.month}:`, error);
        return null;
      }
    }),
  );

  return monthlyTweets
    .filter((group): group is TweetMonthGroup => group !== null)
    .filter((group) => group.tweets.length > 0);
}

export async function getTweetMonthGroupsPage(
  offset: number,
  limit: number,
): Promise<TweetMonthGroupsPage> {
  const allGroups = await getTweetMonthGroups();
  return {
    monthGroups: allGroups.slice(offset, offset + limit),
    totalMonths: allGroups.length,
  };
}

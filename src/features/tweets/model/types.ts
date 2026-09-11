import type { Locale } from '@/shared/contracts/locale';

export type TweetLang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'other';
export type TweetTranslationPromptKey =
  'translate-to-zh-CN' | 'translate-to-zh-TW' | 'translate-to-en';

export type TweetTranslation = {
  content: string;
  sourceLang: TweetLang;
  translatedAt: string;
  model: string;
  promptKey: TweetTranslationPromptKey;
  stale?: boolean;
};

export type TweetItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  content: string;
  lang?: TweetLang;
  tags?: string[];
  visibility?: 'public' | 'hidden' | 'private';
  pinned?: boolean;
  translations?: Partial<Record<Locale, TweetTranslation>>;
};

export type TweetIndexItem = {
  month: string;
  path: string;
  count?: number;
  updatedAt?: string;
};

export type TweetMonthGroup = {
  month: string;
  count?: number;
  updatedAt?: string;
  tweets: TweetItem[];
};

export type TweetMonthGroupsPage = {
  monthGroups: TweetMonthGroup[];
  totalMonths: number;
};

export type ResolvedTweetContent = {
  displayContent: string;
  displaySourceLang: TweetLang;
  isAutoTranslated: boolean;
};

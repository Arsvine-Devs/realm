import type { Locale } from '@/shared/contracts/locale';
import type { ResolvedTweetContent, TweetItem } from './types';

export function resolveTweetContent(tweet: TweetItem, locale: Locale): ResolvedTweetContent {
  const translation = tweet.translations?.[locale];
  if (translation?.content && translation.stale !== true) {
    return {
      displayContent: translation.content,
      displaySourceLang: translation.sourceLang ?? tweet.lang ?? 'other',
      isAutoTranslated: true,
    };
  }

  return {
    displayContent: tweet.content,
    displaySourceLang: tweet.lang ?? translation?.sourceLang ?? 'other',
    isAutoTranslated: false,
  };
}

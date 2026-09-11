/** Locale contracts shared by app composition, features, and shared UI. */
export const locales = ['zh-CN', 'zh-TW', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

export const htmlLangMap: Record<Locale, string> = {
  'zh-CN': 'zh-Hans-CN',
  'zh-TW': 'zh-Hant-TW',
  en: 'en-US',
};

export const ogLocaleMap: Record<Locale, string> = {
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  en: 'en_US',
};

export const rssLanguageMap: Record<Locale, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  en: 'en-US',
};

export const localeShortLabel: Record<Locale, string> = {
  'zh-CN': '简中',
  'zh-TW': '繁中',
  en: 'ENG',
};

export const localeNativeName: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function getLocaleFromPath(path: string | null | undefined): Locale | undefined {
  if (typeof path !== 'string') return undefined;

  const pathWithoutQuery = path.split('?')[0]?.split('#')[0] ?? path;
  const firstSegment = pathWithoutQuery.split('/').filter(Boolean)[0];

  return isLocale(firstSegment) ? firstSegment : undefined;
}

export function resolveLocale(rawLocale: unknown, path?: string | null): Locale {
  return isLocale(rawLocale) ? rawLocale : (getLocaleFromPath(path) ?? defaultLocale);
}

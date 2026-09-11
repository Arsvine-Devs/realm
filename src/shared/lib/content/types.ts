type ContentAccessMode = 'public' | 'totp';

export interface ContentPostAccess {
  mode: ContentAccessMode;
  group?: string;
}

interface ContentBlogIndexVariant {
  title: string;
  excerpt: string;
  tags?: string[];
  originLocale?: string;
  readingMinutes?: number;
}

export interface ContentBlogIndexItem {
  slug: string;
  date: string;
  updatedAt: string;
  tags: string[];
  pinned: boolean;
  access: ContentPostAccess;
  availableLocales: string[];
  variants: Record<string, ContentBlogIndexVariant>;
}

export interface ContentBlogIndex {
  version: number;
  updatedAt: string;
  posts: ContentBlogIndexItem[];
}

interface TotpSecretSet {
  current: string;
  previous?: string[];
}

export interface TotpGroupConfig extends TotpSecretSet {
  period?: number;
  digits?: number;
  window?: number;
}

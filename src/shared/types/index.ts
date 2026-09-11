// ============================================================
// Data Types
// ============================================================

import type { Locale } from '@/shared/contracts/locale';
import type { ContentPostAccess } from '@/shared/lib/content/types';

/**
 * 单条内容相对当前请求 locale 的翻译状态：
 *   - 'source':     当前 locale === 内容原文 locale（无需提示）
 *   - 'translated': 当前 locale 有该内容的翻译版本（不再提示）
 *   - 'fallback':   当前 locale 缺译，已退回原文/默认 locale（顶部 banner 提示）
 */
export type TranslationStatus = 'source' | 'translated' | 'fallback';

export interface ManagedAssetReference {
  objectKey: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ExternalAssetReference {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface CatalogAssetReference {
  catalogKey: string;
  alt?: string;
}

export type AssetReference =
  string | ManagedAssetReference | ExternalAssetReference | CatalogAssetReference;

export interface GalleryImage {
  src: AssetReference;
  caption?: string;
  isMobile?: boolean;
  invertedSrc?: AssetReference;
}

export interface CopyableToken {
  /** 要匹配的字符串（按完整字面量匹配，特殊字符会自动正则转义） */
  pattern: string;
  /** 鼠标悬浮提示，可选 */
  label?: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  tech: string[];
  link: string;
  imageUrl: AssetReference;
  galleryImages: GalleryImage[];
  articleContent?: string;
  role?: string;
  year?: string;
  highlights?: string[];
  liveUrl?: string;
  githubUrl?: string;
  videoUrl?: string | string[];
  status?: 'shipped' | 'wip' | 'archived';
  isConfidential?: boolean;
  noHero?: boolean;
  invertedImageUrl?: AssetReference;
  /** 内容原文所用 locale；缺省视为 defaultLocale（zh-CN）。
   *  用于在详情页区分「已翻译」与「源语言原文」。 */
  originLocale?: Locale;
}

export interface LifeItemLink {
  href: string;
  text: string;
  /** 链接的次级说明文本，例如副标题或补充信息，区别于主显示文案 text。 */
  sub: string;
}

export interface LifeItem {
  id: string;
  title: string;
  description: string;
  tech: string[];
  link?: string;
  imageUrl: AssetReference;
  galleryImages: GalleryImage[];
  articleContent?: string;
  links?: LifeItemLink[];
  /** 内容原文所用 locale；缺省视为 defaultLocale（zh-CN）。 */
  originLocale?: Locale;
}

export interface ExperienceItem {
  id: string;
  type: 'education' | 'work' | 'volunteer';
  duration: string;
  title: string;
  location: string;
  details: string[];
  alignment: 'left' | 'right';
  galleryImages: GalleryImage[];
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  /** 最后修改时间（ISO 字符串，可选）。来自 frontmatter 的 `updated` 字段；
   *  RSS / sitemap 使用 `updated ?? date` 以保证修订后阅读器与搜索引擎能感知更新。 */
  updated?: string;
  excerpt: string;
  tags: string[];
  /** 结构化阅读时长（分钟），供 UI 按当前界面语言自行格式化 */
  readingMinutes: number;
  /** 置顶到博客列表最前；feed/sitemap 仍按日期排序 */
  pinned?: boolean;
  /** 内容原文所用 locale；缺省视为 defaultLocale（zh-CN）。
   *  从 MDX frontmatter 的 `originLocale` 字段读取（如未声明就用默认）。 */
  originLocale?: Locale;
  /** 文章访问模式。public 直接可读；totp 需访问验证。 */
  access: ContentPostAccess;
}

export interface FriendLink {
  id: string;
  name: string;
  description: string;
  url: string;
  avatar: AssetReference;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  relatedProjects: number[];
  description: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: Skill[];
}

// ============================================================
// Site Configuration
// ============================================================

export interface SiteAssets {
  /** 浏览器 favicon */
  icon: string;
  /** og:image */
  ogImage: string;
  /** twitter:image */
  twitterImage: string;
}

interface SiteFontPreconnect {
  href: string;
  crossOrigin?: 'anonymous';
}

export interface SiteFonts {
  /** preconnect 列表。当前统一指向自有 CDN（cdn.arsvine.com） */
  cdnPreconnect: SiteFontPreconnect[];
  /** 真理之源：完整的 Google Fonts CSS URL。仅供 scripts/fetch-google-fonts.mjs
   *  读取并抓取，浏览器不直接加载它。修改后需重跑脚本 + 重新上传 COS。 */
  googleStylesheet: string;
  /** 浏览器实际加载的 stylesheet href。由 scripts/fetch-google-fonts.mjs 抓取
   *  googleStylesheet 后改写 url 生成，托管在 cdn.arsvine.com/shared/fonts/。 */
  cdnStylesheet: string;
}

export interface SiteLocale {
  /** <html lang> */
  htmlLang: string;
  /** og:locale */
  ogLocale: string;
  /** RSS <language> */
  rssLanguage: string;
}

/** /friends 页底部「致谢服务」区一条目：使用了对方提供的接口/服务，不属于朋友 */
export interface ServiceCredit {
  /** 服务方展示名 */
  name: string;
  /** 一行说明文案 */
  description: string;
  /** 服务方主页 / 项目主页 */
  url: string;
  /** Logo / 头像图 URL */
  avatar: AssetReference;
}

export interface SitePages {
  /** /content 页 SEO description（无详情视图打开时） */
  content: { description: string };
  /**
   * /friends 页：
   *  - heading：两列友链区标题
   *  - services：底部"致谢服务"区，可选；缺省 / items 为空则整段不渲染
   */
  friends: {
    title: string;
    description: string;
    heading: string;
    services?: { heading: string; items: ServiceCredit[] };
  };
  /** /copyright 页 title / description */
  copyright: { title: string; description: string };
}

// ============================================================
// Component Props
// ============================================================

import type { SiteAssets, SiteFonts, SiteLocale, SitePages } from '@/shared/types';
import { authOrigin, contentOrigin, realmOrigin } from './site-endpoints';

/**
 * 站点集中配置 — 所有"我的"信息的单一信息源。
 *
 * 改这一个文件即可同步：
 *  - HUD / Loading 的站名
 *  - Contact 邮箱与点击复制
 *  - About 页脚版权
 *  - App Router metadata 中的 title / description / Open Graph
 *  - sitemap.xml / rss.xml / robots.txt 的 base URL 与标题
 *  - 首页打字机签名（中英两句）
 *  - 站点 favicon / og:image / twitter:image
 *  - 字体外链（Google Fonts 等）与 preconnect 目标
 *  - <html lang> / og:locale / RSS <language> 等地区设置
 *  - /content 与 /friends 页的 SEO 与 heading 文案
 *
 * package.json 的 author/name/description 字段不在 import 范围内，
 * 模板使用者克隆后请手动同步。
 */

export interface SiteConfig {
  /** 站点名称。会用于 HUD 角标、加载页标题、og:site_name */
  name: string;
  /** 作者名。用于版权署名 */
  author: string;
  /** 联系邮箱。用于联系页文本与点击复制 */
  email: string;
  /** 站点 URL，无尾斜杠。用于 sitemap/rss/og:url。 */
  url: string;
  /** 跨服务固定 origin，由 config/site-config.mjs 统一拥有 */
  serviceOrigins: {
    auth: string;
    content: string;
  };
  /** 版权起始年份 */
  copyrightYearStart: number;
  /** 用于 <title>、og:title 的简短标题 */
  metaTitle: string;
  /** 用于 <meta description>、og:description 的简短描述 */
  metaDescription: string;
  /** RSS 频道描述 */
  rssDescription: string;
  /** 首页打字机签名循环显示的中英两句 */
  tagline: {
    en: string;
    zh: string;
  };
  /** 联系页社交链接。留空字符串则在 UI 上隐藏对应图标 */
  social: {
    github: string;
    x: string;
    steam: string;
    bilibili: string;
  };
  /** 全站共用的视觉资源（favicon、社交分享图） */
  assets: SiteAssets;
  /** 字体外链与 preconnect 配置 */
  fonts: SiteFonts;
  /** 语言与 locale 设置 */
  locale: SiteLocale;
  /** 各页面级别的 SEO / heading 文案 */
  pages: SitePages;
}

export const siteConfig: SiteConfig = {
  name: 'ARSVINE REALM',
  author: 'Arsvine Zhu',
  email: 'arsvinezhu@gmail.com',
  url: realmOrigin,
  serviceOrigins: {
    auth: authOrigin,
    content: contentOrigin,
  },
  copyrightYearStart: 2026,
  metaTitle: 'ARSVINE REALM',
  metaDescription:
    'Personal portfolio and blog - Exploring the realms of technology, creativity, and life.',
  rssDescription: 'Personal blog - Exploring the realms of technology, creativity, and life.',
  tagline: {
    en: 'Я бы хотела жить с Вами в маленьком городе, Где вечные сумерки и вечные колокола.',
    zh: '我想和你一起生活，在小城，那里有永恒的黄昏和永恒的钟声。',
  },
  social: {
    github: 'https://github.com/ArsvineZhu',
    x: 'https://x.com/arsvine',
    steam: 'https://steamcommunity.com/id/arsvine/',
    bilibili: 'https://space.bilibili.com/3461563151288978',
  },
  assets: {
    icon: '/favicon.ico',
    ogImage: '/avatar_transparent.webp',
    twitterImage: '/avatar_transparent.webp',
  },
  fonts: {
    googleStylesheet:
      'https://fonts.googleapis.com/css2?family=Dosis:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;700&display=swap',
    criticalStylesheetKey: 'shared/fonts/realm-fonts-critical.570a4ecb7a9d.css',
    extendedStylesheetKey: 'shared/fonts/realm-fonts-extended.0461ba9d448a.css',
    firstPaintFontKey: 'shared/fonts/dosis/dosis-300-normal-002.woff2',
  },
  locale: {
    htmlLang: 'zh',
    ogLocale: 'zh_CN',
    rssLanguage: 'zh-CN',
  },
  pages: {
    content: { description: 'Portfolio — Explore' },
    friends: {
      title: 'FRIENDS',
      description: 'Friends — Signal from fellow travelers',
      heading: 'Friend Links',
      // 致谢区：使用了对方服务（不是朋友），单独成段、不和友链混在两列里。
      // 增删条目改这里即可，pages/friends.tsx 会自动渲染。
      services: {
        heading: 'Acknowledgements',
        items: [
          {
            name: 'Hitokoto',
            description: '一言 · 一句温暖的话（首页打字机签名轮播）',
            url: 'https://hitokoto.cn/',
            avatar: 'https://developer.hitokoto.cn/logo.png',
          },
        ],
      },
    },
    copyright: {
      title: 'COPYRIGHT',
      description: 'Copyright & License — Source code and content licensing terms',
    },
  },
};

export const getSiteUrl = (): string => siteConfig.url;

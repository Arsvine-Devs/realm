/**
 * i18n 数据加载器。
 *
 * App Router 的 Server Component/Route Handler 数据读取发生在 Node 侧，这里统一使用显式静态 registry：
 *   - 消除动态 require 带来的 Critical dependency 告警
 *   - 保留现有 data/<topic>/<locale>.ts 组织方式
 *   - 新增 locale 时只需在本文件补一条映射
 */
import type {
  Project,
  LifeItem,
  ExperienceItem,
  FriendLink,
  SkillCategory,
  ServiceCredit,
  TranslationStatus,
} from '@/shared/types';
import { defaultLocale, type Locale } from '@/app/i18n/config';

import * as projectsZH from '@/features/portfolio/contracts/data';
import * as projectsEN from '@/features/portfolio/contracts/data/en';
import * as projectsZHTW from '@/features/portfolio/contracts/data/zh-TW';
import * as lifeZH from '@/features/life/contracts/data';
import * as lifeEN from '@/features/life/contracts/data/en';
import * as lifeZHTW from '@/features/life/contracts/data/zh-TW';
import * as experienceZH from '@/features/experience/contracts/data';
import * as experienceEN from '@/features/experience/contracts/data/en';
import * as experienceZHTW from '@/features/experience/contracts/data/zh-TW';
import * as friendsZH from '@/features/profile/contracts/friendLinks';
import * as friendsEN from '@/features/profile/contracts/friendLinks/en';
import * as friendsZHTW from '@/features/profile/contracts/friendLinks/zh-TW';
import * as skillsZH from '@/features/profile/contracts/skills';
import * as skillsEN from '@/features/profile/contracts/skills/en';
import * as skillsZHTW from '@/features/profile/contracts/skills/zh-TW';
import * as siteZH from '@/shared/config/site';
import { getMessages, type MessageSchema } from './client-messages';

interface ProjectsModule {
  webProjects: Project[];
  gameProjects: Project[];
  earlyProjects: Project[];
  copyableTokens: typeof projectsZH.copyableTokens;
}

interface LifeModule {
  gameData: LifeItem[];
  travelData: LifeItem[];
  otherData: LifeItem[];
  alsoPlayGames: string[];
  artPlaceholderText: string;
}

interface ExperienceModule {
  experienceData: ExperienceItem[];
}

interface FriendsModule {
  friendLinksData: FriendLink[];
}

interface SkillsModule {
  skillCategories: SkillCategory[];
  skillsData: typeof skillsZH.skillsData;
}

type LocalizedModuleMap<T> = Record<Locale, T>;

const projectModules: LocalizedModuleMap<ProjectsModule> = {
  'zh-CN': projectsZH as ProjectsModule,
  'zh-TW': projectsZHTW as ProjectsModule,
  en: projectsEN as ProjectsModule,
};

const lifeModules: LocalizedModuleMap<LifeModule> = {
  'zh-CN': lifeZH as LifeModule,
  'zh-TW': lifeZHTW as LifeModule,
  en: lifeEN as LifeModule,
};

const experienceModules: LocalizedModuleMap<ExperienceModule> = {
  'zh-CN': experienceZH as ExperienceModule,
  'zh-TW': experienceZHTW as ExperienceModule,
  en: experienceEN as ExperienceModule,
};

const friendLinkModules: LocalizedModuleMap<FriendsModule> = {
  'zh-CN': friendsZH as FriendsModule,
  'zh-TW': friendsZHTW as FriendsModule,
  en: friendsEN as FriendsModule,
};

const skillModules: LocalizedModuleMap<SkillsModule> = {
  'zh-CN': skillsZH as SkillsModule,
  'zh-TW': skillsZHTW as SkillsModule,
  en: skillsEN as SkillsModule,
};

function loadLocalizedModule<T>(registry: LocalizedModuleMap<T>, locale: Locale): T {
  return registry[locale] ?? registry[defaultLocale];
}

/** 加载 locale 对应的 projects 模块，缺失时回退默认 locale */
export function loadProjects(locale: Locale): ProjectsModule {
  return loadLocalizedModule(projectModules, locale);
}

/**
 * 在指定 locale 下解析单个 web project：
 *   - locale 命中该 id                  → source / translated
 *   - locale 缺译且 origin locale 可读   → fallback 到原文
 *   - 否则回退 defaultLocale            → fallback
 */
export function resolveWebProject(
  id: number,
  locale: Locale,
): {
  project: Project;
  status: TranslationStatus;
  actualLocale: Locale;
  originLocale: Locale;
} | null {
  const current = loadProjects(locale).webProjects.find((project) => project.id === id);
  if (current) {
    const origin = current.originLocale ?? defaultLocale;
    return {
      project: current,
      status: locale === origin ? 'source' : 'translated',
      actualLocale: locale,
      originLocale: origin,
    };
  }

  const defaults = loadProjects(defaultLocale).webProjects.find((project) => project.id === id);
  if (!defaults) return null;

  const origin = defaults.originLocale ?? defaultLocale;
  if (origin !== defaultLocale) {
    const fromOrigin = loadProjects(origin).webProjects.find((project) => project.id === id);
    if (fromOrigin) {
      return {
        project: fromOrigin,
        status: 'fallback',
        actualLocale: origin,
        originLocale: origin,
      };
    }
  }

  return {
    project: defaults,
    status: 'fallback',
    actualLocale: defaultLocale,
    originLocale: origin,
  };
}

export function loadLife(locale: Locale): LifeModule {
  return loadLocalizedModule(lifeModules, locale);
}

/**
 * 在指定 locale 下解析单个 life item，逻辑与 resolveWebProject 对应。
 */
export function resolveLifeItem(
  slug: string,
  locale: Locale,
): {
  item: LifeItem;
  status: TranslationStatus;
  actualLocale: Locale;
  originLocale: Locale;
} | null {
  const flatten = (mod: LifeModule) => [...mod.gameData, ...mod.travelData, ...mod.otherData];

  const current = flatten(loadLife(locale)).find((item) => item.id === slug);
  if (current) {
    const origin = current.originLocale ?? defaultLocale;
    return {
      item: current,
      status: locale === origin ? 'source' : 'translated',
      actualLocale: locale,
      originLocale: origin,
    };
  }

  const defaults = flatten(loadLife(defaultLocale)).find((item) => item.id === slug);
  if (!defaults) return null;

  const origin = defaults.originLocale ?? defaultLocale;
  if (origin !== defaultLocale) {
    const fromOrigin = flatten(loadLife(origin)).find((item) => item.id === slug);
    if (fromOrigin) {
      return {
        item: fromOrigin,
        status: 'fallback',
        actualLocale: origin,
        originLocale: origin,
      };
    }
  }

  return {
    item: defaults,
    status: 'fallback',
    actualLocale: defaultLocale,
    originLocale: origin,
  };
}

export function loadExperience(locale: Locale): ExperienceModule {
  return loadLocalizedModule(experienceModules, locale);
}

export function loadFriendLinks(locale: Locale): FriendsModule {
  return loadLocalizedModule(friendLinkModules, locale);
}

export function loadSkills(locale: Locale): SkillsModule {
  return loadLocalizedModule(skillModules, locale);
}

/**
 * 友链页底部"致谢服务"配置。
 *
 * 当前 site.ts 的 `pages.friends.services` 是单语数据；本 helper 不按 locale
 * 切（避免引入未真正本地化的多语言字段误导调用方）。如未来要为不同 locale
 * 提供本地化致谢文案，应先扩展 site.ts 增加多语言映射，再恢复 locale 形参。
 */
export function loadServices(): { heading: string; items: ServiceCredit[] } | undefined {
  return siteZH.siteConfig.pages.friends.services;
}

/** 加载 locale 对应的 messages（locales/<locale>.json） */
export async function loadMessages(locale: Locale): Promise<MessageSchema> {
  return getMessages(locale);
}

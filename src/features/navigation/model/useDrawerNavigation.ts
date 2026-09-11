import { useCallback, useMemo, useState } from 'react';
import type { Locale } from '@/shared/contracts/locale';

interface NavLink {
  label: string;
  href: string;
  group: 'content' | 'standalone';
  hash?: string;
}

const commonLabelFallbacks: Record<Locale, Record<'openMenu' | 'closeMenu', string>> = {
  'zh-CN': {
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
  },
  'zh-TW': {
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
  },
  en: {
    openMenu: 'Open Menu',
    closeMenu: 'Close Menu',
  },
};

interface UseDrawerNavigationOptions {
  locale: Locale;
  tNav: (key: string) => string;
  tCommon: (key: string) => string;
}

export default function useDrawerNavigation({ locale, tNav, tCommon }: UseDrawerNavigationOptions) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((previous) => !previous);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const navLinks = useMemo<NavLink[]>(
    () => [
      { label: tNav('works'), href: `/${locale}/content#works`, hash: 'works', group: 'content' },
      {
        label: tNav('experience'),
        href: `/${locale}/content#experience`,
        hash: 'experience',
        group: 'content',
      },
      { label: tNav('blog'), href: `/${locale}/content#blog`, hash: 'blog', group: 'content' },
      { label: tNav('life'), href: `/${locale}/content#life`, hash: 'life', group: 'content' },
      {
        label: tNav('contact'),
        href: `/${locale}/content#contact`,
        hash: 'contact',
        group: 'content',
      },
      { label: tNav('about'), href: `/${locale}/content#about`, hash: 'about', group: 'content' },
      { label: tNav('tweets'), href: `/${locale}/tweets`, group: 'standalone' },
      { label: tNav('friends'), href: `/${locale}/friends`, group: 'standalone' },
    ],
    [locale, tNav],
  );

  const resolveCommonLabel = useCallback(
    (key: 'openMenu' | 'closeMenu') => {
      const translated = tCommon(key);
      return translated === key ? commonLabelFallbacks[locale][key] : translated;
    },
    [locale, tCommon],
  );

  return {
    drawerOpen,
    navLinks,
    drawerToggleLabel: drawerOpen
      ? resolveCommonLabel('closeMenu')
      : resolveCommonLabel('openMenu'),
    toggleDrawer,
    closeDrawer,
  };
}

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

import { NavigationRuntimeProvider } from './NavigationRuntime';

export function AppNavigationRuntime({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const rawParams = useParams<Record<string, string | string[]>>();
  const params = useMemo(() => rawParams ?? {}, [rawParams]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const updateSearch = () => setSearch(window.location.search.slice(1));
    updateSearch();
    window.addEventListener('popstate', updateSearch);
    return () => window.removeEventListener('popstate', updateSearch);
  }, [pathname]);
  const asPath = `${pathname}${search ? `?${search}` : ''}`;
  const value = useMemo(
    () => ({
      pathname,
      asPath,
      query: {
        ...Object.fromEntries(new URLSearchParams(search).entries()),
        ...Object.fromEntries(
          Object.entries(params).map(([key, value]) => [
            key,
            Array.isArray(value) ? value[0] : value,
          ]),
        ),
      },
      push: async (href: string, options?: { scroll?: boolean }) => {
        router.push(href, { scroll: options?.scroll });
      },
      prefetch: async (href: string) => {
        router.prefetch(href);
      },
    }),
    [asPath, params, pathname, router, search],
  );

  return <NavigationRuntimeProvider value={value}>{children}</NavigationRuntimeProvider>;
}

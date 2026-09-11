'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface NavigationRuntimeValue {
  pathname: string;
  asPath: string;
  query: Record<string, string | undefined>;
  push: (href: string, options?: { scroll?: boolean }) => Promise<void>;
  prefetch: (href: string) => Promise<void>;
}

const NavigationRuntimeContext = createContext<NavigationRuntimeValue | null>(null);

export function NavigationRuntimeProvider({
  value,
  children,
}: {
  value: NavigationRuntimeValue;
  children: ReactNode;
}) {
  return (
    <NavigationRuntimeContext.Provider value={value}>{children}</NavigationRuntimeContext.Provider>
  );
}

export function useNavigationRuntime(): NavigationRuntimeValue {
  const value = useContext(NavigationRuntimeContext);
  if (!value) throw new Error('useNavigationRuntime must be used within NavigationRuntimeProvider');
  return value;
}

export function getRouteTemplate(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) return '/[locale]';
  if (segments.length === 2) return `/[locale]/${segments[1]}`;
  if (segments.length === 3 && ['web', 'life', 'blog', 'access'].includes(segments[1] ?? '')) {
    return `/[locale]/${segments[1]}/[${segments[1] === 'web' ? 'id' : segments[1] === 'access' ? 'group' : 'slug'}]`;
  }
  return pathname;
}

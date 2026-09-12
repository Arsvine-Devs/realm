'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface NavigationRuntimeValue {
  pathname: string;
  currentUrl: string;
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

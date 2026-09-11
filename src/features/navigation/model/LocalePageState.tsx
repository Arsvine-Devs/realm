'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';

import { getLocaleFromPath } from '@/shared/contracts/locale';
import { useNavigationRuntime } from './NavigationRuntime';

interface LocalePageStateContextValue {
  routeIdentity: string;
  read: <T>(key: string) => T | undefined;
  write: <T>(key: string, value: T) => void;
}

const LocalePageStateContext = createContext<LocalePageStateContextValue | null>(null);
const fallbackPageStateStore: LocalePageStateContextValue = {
  routeIdentity: '',
  read: () => undefined,
  write: () => {},
};

export function getLocaleIndependentRoute(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (!locale) return pathname || '/';
  const route = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '');
  return route || '/';
}

export function LocalePageStateProvider({ children }: { children: ReactNode }) {
  const { pathname } = useNavigationRuntime();
  const routeIdentity = getLocaleIndependentRoute(pathname);
  const routeStoresRef = useRef(new Map<string, Map<string, unknown>>());
  const previousRouteRef = useRef(routeIdentity);

  useLayoutEffect(() => {
    const previousRoute = previousRouteRef.current;
    if (previousRoute !== routeIdentity) {
      routeStoresRef.current.delete(previousRoute);
      previousRouteRef.current = routeIdentity;
    }
  }, [routeIdentity]);

  const read = useCallback(
    <T,>(key: string) => routeStoresRef.current.get(routeIdentity)?.get(key) as T | undefined,
    [routeIdentity],
  );
  const write = useCallback(
    <T,>(key: string, value: T) => {
      let routeStore = routeStoresRef.current.get(routeIdentity);
      if (!routeStore) {
        routeStore = new Map<string, unknown>();
        routeStoresRef.current.set(routeIdentity, routeStore);
      }
      routeStore.set(key, value);
    },
    [routeIdentity],
  );
  const value = useMemo<LocalePageStateContextValue>(
    () => ({
      routeIdentity,
      read,
      write,
    }),
    [read, routeIdentity, write],
  );

  return (
    <LocalePageStateContext.Provider value={value}>{children}</LocalePageStateContext.Provider>
  );
}

export function useLocaleStableState<T>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const context = useContext(LocalePageStateContext);
  const pageStateStore = context ?? fallbackPageStateStore;

  const [value, setValue] = useState<T>(() => {
    const stored = pageStateStore.read<T>(key);
    if (stored !== undefined) return stored;
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  useLayoutEffect(() => {
    pageStateStore.write(key, value);
  }, [key, pageStateStore, value]);

  return [value, setValue];
}

export function useLocalePageStateStore() {
  return useContext(LocalePageStateContext) ?? fallbackPageStateStore;
}

export function useLocaleStableScroll(key: string, scrollRef: RefObject<HTMLElement | null>) {
  const context = useLocalePageStateStore();
  const restoreFrameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const savedScrollTop = context.read<number>(key) ?? 0;
    restoreFrameRef.current = window.requestAnimationFrame(() => {
      element.scrollTop = Math.min(
        savedScrollTop,
        Math.max(0, element.scrollHeight - element.clientHeight),
      );
      restoreFrameRef.current = null;
    });

    return () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
      }
    };
  }, [context, key, scrollRef]);

  return useCallback(() => {
    context.write(key, scrollRef.current?.scrollTop ?? 0);
  }, [context, key, scrollRef]);
}

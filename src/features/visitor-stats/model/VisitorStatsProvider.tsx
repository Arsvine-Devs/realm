'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getSiteUrl } from '@/shared/config/site';
import {
  DISABLED_VISITOR_STATS,
  type VisitorStatsResponse,
  type VisitorStatsState,
} from '@/features/visitor-stats/contracts';

const INITIAL_STATE: VisitorStatsState = {
  status: 'loading',
  totalVisitors: null,
  todayVisitors: null,
};

const DISABLED_STATE: VisitorStatsState = {
  status: 'disabled',
  totalVisitors: null,
  todayVisitors: null,
};

const VisitorStatsContext = createContext<VisitorStatsState | null>(null);

function isCanonicalClientHost(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.location.hostname === new URL(getSiteUrl()).hostname;
  } catch {
    return false;
  }
}

function parseVisitorStatsResponse(value: unknown): VisitorStatsResponse | null {
  if (!value || typeof value !== 'object') return null;

  const response = value as Partial<VisitorStatsResponse>;
  if (response.enabled !== true || response.tracked !== true) return DISABLED_VISITOR_STATS;
  if (
    !Number.isSafeInteger(response.totalVisitors) ||
    (response.totalVisitors as number) < 0 ||
    !Number.isSafeInteger(response.todayVisitors) ||
    (response.todayVisitors as number) < 0
  ) {
    return null;
  }

  return {
    enabled: true,
    tracked: true,
    totalVisitors: response.totalVisitors as number,
    todayVisitors: response.todayVisitors as number,
  };
}

export function VisitorStatsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisitorStatsState>(() =>
    isCanonicalClientHost() ? INITIAL_STATE : DISABLED_STATE,
  );

  useEffect(() => {
    if (!isCanonicalClientHost()) return;

    const controller = new AbortController();

    fetch('/api/visitor-stats', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`visitor stats request failed: ${response.status}`);
        return parseVisitorStatsResponse(await response.json());
      })
      .then((response) => {
        if (!response) throw new Error('visitor stats response is malformed');
        setState({
          status: response.enabled ? 'ready' : 'disabled',
          totalVisitors: response.totalVisitors,
          todayVisitors: response.todayVisitors,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'error', totalVisitors: null, todayVisitors: null });
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[visitor-stats] client request failed', error);
        }
      });

    return () => controller.abort();
  }, []);

  return <VisitorStatsContext.Provider value={state}>{children}</VisitorStatsContext.Provider>;
}

export function useVisitorStats(): VisitorStatsState {
  const value = useContext(VisitorStatsContext);
  if (!value) throw new Error('useVisitorStats must be used within VisitorStatsProvider');
  return value;
}

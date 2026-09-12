import { useState, useEffect } from 'react';
import type { RealtimeStatsState } from '@/features/hud/contracts/state';

const SYSTEM_LAUNCH_AT = new Date('2026-06-10T02:00:00+08:00').getTime();

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatRuntime(uptimeMs: number): string {
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
  return (
    `${String(days).padStart(3, '0')}:` +
    `${String(hours).padStart(2, '0')}:` +
    `${String(minutes).padStart(2, '0')}:` +
    `${String(seconds).padStart(2, '0')}`
  );
}

export default function useRealtimeStats(): RealtimeStatsState {
  const [currentTime, setCurrentTime] = useState('00:00:00');
  // 初值固定为 0，避免 SSR / 首屏 hydration 时差异；mount 后立刻在 effect 里更新到真实值
  const [runtime, setRuntime] = useState('000:00:00:00');

  // Website runtime tick (purely client-side)
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setRuntime(formatRuntime(Math.max(0, now - SYSTEM_LAUNCH_AT)));
    };

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (intervalId) return;
      tick();
      intervalId = setInterval(tick, 1000);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    if (!document.hidden) start();

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, []);

  // Wall-clock tick
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startClock = () => {
      if (intervalId) return;
      setCurrentTime(formatTime(new Date()));
      intervalId = setInterval(() => {
        setCurrentTime(formatTime(new Date()));
      }, 1000);
    };

    const stopClock = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) stopClock();
      else startClock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    startClock();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopClock();
    };
  }, []);

  return { currentTime, runtime };
}

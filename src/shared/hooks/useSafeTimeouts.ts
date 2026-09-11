import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * 集中管理组件生命周期内的 setTimeout / setInterval：
 *   - mount 时返回 { setTimeout, setInterval, clearTimeout, clearInterval }，内部
 *     ref 跟踪所有 id；
 *   - 组件 unmount 时一次性 clearTimeout/clearInterval 全部待发任务；
 *   - 同时设 cancelled 标志，在 setTimeout 即将触发时（clearTimeout 已来不及）也
 *     会拦截 fn() 调用，避免卸载后还 setState。
 *
 * 为什么不用 useRef<number[]> + cleanup 中 forEach clearTimeout：
 *   setTimeout 真正触发是在事件循环中，clearTimeout 必须在它"入队但未取出"
 *   之前调用。如果 React 在事件循环同 tick 触发 unmount，clearTimeout 仍可能
 *   来不及 —— 真正的兜底要在 callback 内部判断 cancelled。这是这个 hook 的
 *   全部价值，比各组件自己写"let timeouts = []; forEach clearTimeout"更稳。
 */
export function useSafeTimeouts() {
  const timeoutsRef = useRef<Set<number>>(new Set());
  const intervalsRef = useRef<Set<number>>(new Set());
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const timeouts = timeoutsRef.current;
    const intervals = intervalsRef.current;
    return () => {
      cancelledRef.current = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      intervals.forEach((id) => window.clearInterval(id));
      timeouts.clear();
      intervals.clear();
    };
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, delay?: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      if (cancelledRef.current) return;
      fn();
    }, delay);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const scheduleInterval = useCallback((fn: () => void, delay?: number) => {
    const id = window.setInterval(() => {
      if (cancelledRef.current) {
        window.clearInterval(id);
        intervalsRef.current.delete(id);
        return;
      }
      fn();
    }, delay);
    intervalsRef.current.add(id);
    return id;
  }, []);

  const clearScheduledTimeout = useCallback((id: number | undefined) => {
    if (id === undefined) return;
    timeoutsRef.current.delete(id);
    window.clearTimeout(id);
  }, []);

  const clearScheduledInterval = useCallback((id: number | undefined) => {
    if (id === undefined) return;
    intervalsRef.current.delete(id);
    window.clearInterval(id);
  }, []);

  return useMemo(
    () => ({
      setTimeout: scheduleTimeout,
      setInterval: scheduleInterval,
      clearTimeout: clearScheduledTimeout,
      clearInterval: clearScheduledInterval,
    }),
    [scheduleTimeout, scheduleInterval, clearScheduledTimeout, clearScheduledInterval],
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { useReducedMotion } from '@/shared/hooks/useMediaQuery';

type LoadingTaskStatus = 'ready' | 'fallback';

interface LoadingTask {
  id: string;
  label: string;
  weight: number;
  run: () => Promise<LoadingTaskStatus>;
}

const MIN_DISPLAY_TIME = 1800;
const TASK_TIMEOUT = 6000;
const CRITICAL_IMAGE_URLS = ['/images/texture-noise.jpg', '/avatar_transparent.webp'];

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> => {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve('timeout'), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve('timeout'))
      .finally(() => clearTimeout(timeoutId));
  });
};

const waitForWindowLoad = async (): Promise<LoadingTaskStatus> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'ready';
  if (document.readyState === 'complete') return 'ready';

  const result = await withTimeout(
    new Promise<LoadingTaskStatus>((resolve) => {
      const handleLoad = () => {
        window.removeEventListener('load', handleLoad);
        resolve('ready');
      };
      window.addEventListener('load', handleLoad, { once: true });
    }),
    TASK_TIMEOUT,
  );

  return result === 'timeout' ? 'fallback' : result;
};

const waitForFonts = async (): Promise<LoadingTaskStatus> => {
  if (typeof document === 'undefined') return 'ready';

  const fontSet = document.fonts;
  if (!fontSet?.ready) return 'ready';

  const result = await withTimeout(
    fontSet.ready.then(() => 'ready' as const),
    TASK_TIMEOUT,
  );
  return result === 'timeout' ? 'fallback' : result;
};

const loadImage = (url: string): Promise<LoadingTaskStatus> => {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (status: LoadingTaskStatus) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      resolve(status);
    };

    image.onload = async () => {
      if ('decode' in image) {
        try {
          await image.decode();
        } catch {
          finish('fallback');
          return;
        }
      }
      finish('ready');
    };
    image.onerror = () => finish('fallback');
    image.src = url;

    if (image.complete) {
      if ('decode' in image) {
        image
          .decode()
          .then(() => finish('ready'))
          .catch(() => finish('fallback'));
      } else {
        finish('ready');
      }
    }
  });
};

const waitForCriticalImages = async (): Promise<LoadingTaskStatus> => {
  if (typeof window === 'undefined') return 'ready';

  const imageLoads = CRITICAL_IMAGE_URLS.map((url) => withTimeout(loadImage(url), TASK_TIMEOUT));
  const results = await Promise.all(imageLoads);
  return results.every((result) => result === 'ready') ? 'ready' : 'fallback';
};

export const useLoadingSystem = (startLogging: boolean = true) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<Array<{ id: number; text: string }>>([]);
  const [showSplitLines, setShowSplitLines] = useState(false);
  const reducedMotion = useReducedMotion();

  const startTimeRef = useRef<number | null>(null);
  const completedWeightRef = useRef(0);
  const startedTasksRef = useRef(false);
  const logIdRef = useRef(0);
  const logQueueRef = useRef<Array<{ id: number; text: string }>>([]);
  const consumerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drainPollIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDisplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueLog = useCallback((text: string) => {
    logIdRef.current += 1;
    logQueueRef.current.push({ id: logIdRef.current, text });
    if (consumerIntervalRef.current !== null) return;

    consumerIntervalRef.current = setInterval(() => {
      if (logQueueRef.current.length === 0) {
        clearInterval(consumerIntervalRef.current!);
        consumerIntervalRef.current = null;
        return;
      }

      const line = logQueueRef.current.shift()!;
      setLogLines((prev) => [...prev, line]);
    }, 70);
  }, []);

  const waitForQueueDrain = useCallback(() => {
    const pollQueueDrain = () => {
      if (logQueueRef.current.length === 0 && consumerIntervalRef.current === null) {
        setShowSplitLines(true);
        return;
      }

      drainPollIdRef.current = setTimeout(pollQueueDrain, 80);
    };

    if (logQueueRef.current.length === 0 && consumerIntervalRef.current === null) {
      setShowSplitLines(true);
      return;
    }

    drainPollIdRef.current = setTimeout(pollQueueDrain, 80);
  }, []);

  const finishLoading = useCallback(() => {
    const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
    const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);

    minDisplayTimeoutRef.current = setTimeout(waitForQueueDrain, remaining);
  }, [waitForQueueDrain]);

  const tasks = useCallback(
    (): LoadingTask[] => [
      {
        id: 'document',
        label: 'DOCUMENT CHANNEL',
        weight: 25,
        run: waitForWindowLoad,
      },
      {
        id: 'fonts',
        label: 'FONT SYSTEM',
        weight: 25,
        run: waitForFonts,
      },
      {
        id: 'images',
        label: 'VISUAL ASSETS',
        weight: 35,
        run: waitForCriticalImages,
      },
      {
        id: 'interface',
        label: 'HUD INTERFACE',
        weight: 15,
        run: async () => 'ready',
      },
    ],
    [],
  );

  useEffect(() => {
    return () => {
      if (consumerIntervalRef.current !== null) clearInterval(consumerIntervalRef.current);
      if (drainPollIdRef.current !== null) clearTimeout(drainPollIdRef.current);
      if (minDisplayTimeoutRef.current !== null) clearTimeout(minDisplayTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!startLogging || startedTasksRef.current) return;

    startedTasksRef.current = true;
    startTimeRef.current = Date.now();
    completedWeightRef.current = 0;
    setProgress(0);
    queueLog('INITIALIZING SYSTEM...');

    let cancelled = false;
    const taskList = tasks();
    const totalWeight = taskList.reduce((total, task) => total + task.weight, 0);

    const completeTask = (task: LoadingTask, status: LoadingTaskStatus) => {
      if (cancelled) return;

      completedWeightRef.current += task.weight;
      const nextProgress = Math.min(
        100,
        Math.round((completedWeightRef.current / totalWeight) * 100),
      );
      setProgress(nextProgress);
      queueLog(`${task.label} ${status === 'ready' ? 'READY' : 'FALLBACK READY'} 100%`);

      if (completedWeightRef.current >= totalWeight) {
        setProgress(100);
        queueLog('SYSTEM READY.');
        queueLog('WELCOME BACK.');
        finishLoading();
      }
    };

    taskList.forEach((task) => {
      queueLog(`INITIALIZING ${task.label}...`);
      task
        .run()
        .then((status) => completeTask(task, status))
        .catch(() => completeTask(task, 'fallback'));
    });

    return () => {
      cancelled = true;
    };
  }, [finishLoading, queueLog, startLogging, tasks]);

  useEffect(() => {
    if (!showSplitLines) return;
    const delay = reducedMotion ? 100 : 600;
    const id = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(id);
  }, [showSplitLines, reducedMotion]);

  return {
    progress,
    logLines,
    showSplitLines,
    loading,
  };
};

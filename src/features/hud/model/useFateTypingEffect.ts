import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FateTypingState } from '@/features/hud/contracts/state';
import { formatFateTextForWrap, getTypingDelays } from '@/features/hud/model/typing-effect';

/**
 * Fate text typing effect — 节奏：
 *   1 轮预设 (en + zh) → 1 句 hitokoto → 1 轮预设 → 1 句 hitokoto → ...
 *
 * hitokoto 句子从 /api/hitokoto 拉取（服务端代理 https://v1.hitokoto.cn）。
 * 拉取失败时本轮回退为一轮预设，下一轮继续尝试 hitokoto，避免上游故障时卡死。
 *
 * 一句一言之后立刻回到预设，是为了避开 /api/hitokoto 的 60s 进程内缓存——
 * 连续多次拉到同一句会让用户觉得"中文反复出现"。一言句子停留时间也比预设
 * 中文更长（HITOKOTO_PAUSE_AFTER_TYPE），让短句的呼吸感更明显。
 *
 * 页面可见性：标签页切到后台时整个循环暂停（清超时 + abort 进行中的 hitokoto
 * 请求 + 清空 buffer），避免后台标签页被浏览器节流的 setTimeout 拉成"每分钟
 * 一次"的持续轮询。回到前台后从预设轮重新开始。与 useRealtimeStats /
 * useEnvParamsTypingEffect 的可见性处理保持一致。
 */
const HITOKOTO_PER_CYCLE = 1;
const HITOKOTO_PAUSE_AFTER_TYPE = 4000; // ms，比预设的 1500 长，给短句更长停留

export function useFateTypingEffect(textVisible: boolean): FateTypingState {
  const tSite = useTranslations('pages.site');
  const [displayedFateText, setDisplayedFateText] = useState('');
  const isFateTypingActive = textVisible;

  // 标签页隐藏时暂停整个打字循环（含 hitokoto 轮询）。visibilitychange 在客户端
  // 才有意义；effect 仅在客户端运行，访问 document 安全。mount 时 sync() 一次
  // 覆盖"页面在后台标签页打开"的初始场景。
  const [docHidden, setDocHidden] = useState(false);
  useEffect(() => {
    const sync = () => setDocHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const active = textVisible && !docHidden;

  useEffect(() => {
    if (!active) return;

    const englishText = formatFateTextForWrap(tSite('taglinePrimary'));
    const chineseText = formatFateTextForWrap(tSite('taglineSecondary'));
    const pauseAfterDelete = 500;

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const abortControllers: AbortController[] = [];

    const schedule = (fn: () => void, delay: number) => {
      const id = setTimeout(() => {
        if (cancelled) return;
        fn();
      }, delay);
      timeouts.push(id);
    };

    const typeString = (str: string, index: number, delay: number, callback?: () => void) => {
      if (cancelled) return;
      if (index < str.length) {
        setDisplayedFateText((prev) => prev + str[index]);
        schedule(() => typeString(str, index + 1, delay, callback), delay);
      } else if (callback) {
        schedule(callback, 0);
      }
    };

    const deleteString = (currentStr: string, delay: number, callback?: () => void) => {
      if (cancelled) return;
      if (currentStr.length > 0) {
        setDisplayedFateText((prev) => prev.slice(0, -1));
        schedule(() => deleteString(currentStr.slice(0, -1), delay, callback), delay);
      } else if (callback) {
        schedule(callback, 0);
      }
    };

    // 一轮预设：en (英文节奏) → zh (中文节奏)
    const presetCycle = (onDone: () => void) => {
      const primaryProfile = getTypingDelays(englishText);
      const secondaryProfile = getTypingDelays(chineseText);

      typeString(englishText, 0, primaryProfile.typeDelay, () => {
        schedule(() => {
          deleteString(englishText, primaryProfile.deleteDelay, () => {
            schedule(() => {
              typeString(chineseText, 0, secondaryProfile.typeDelay, () => {
                schedule(() => {
                  deleteString(chineseText, secondaryProfile.deleteDelay, () => {
                    schedule(onDone, pauseAfterDelete);
                  });
                }, secondaryProfile.pauseAfterType);
              });
            }, pauseAfterDelete);
          });
        }, primaryProfile.pauseAfterType);
      });
    };

    // 一句 hitokoto：fetch → 按节奏打/删；失败则回退一轮预设
    const hitokotoCycle = (onDone: () => void, onFail: () => void) => {
      const controller = new AbortController();
      abortControllers.push(controller);
      fetch('/api/hitokoto', { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          const data = await res.json();
          const text = typeof data?.text === 'string' ? data.text.trim() : '';
          if (!text) throw new Error('empty text');
          return text;
        })
        .then((text) => {
          if (cancelled) return;
          const wrappedText = formatFateTextForWrap(text);
          const textProfile = getTypingDelays(wrappedText);
          typeString(wrappedText, 0, textProfile.typeDelay, () => {
            schedule(() => {
              deleteString(wrappedText, textProfile.deleteDelay, () => {
                schedule(onDone, pauseAfterDelete);
              });
            }, HITOKOTO_PAUSE_AFTER_TYPE);
          });
        })
        .catch((err) => {
          if (cancelled) return;
          // AbortError 是组件卸载时的正常清理，不算失败
          if ((err as Error)?.name === 'AbortError') return;
          console.warn(
            '[useFateTypingEffect] hitokoto fetch failed, fallback to preset:',
            (err as Error).message,
          );
          onFail();
        });
    };

    // 主调度器
    let hitokotoCount = 0;
    const runHitokoto = () => {
      if (cancelled) return;
      if (hitokotoCount >= HITOKOTO_PER_CYCLE) {
        loop();
        return;
      }
      hitokotoCycle(
        () => {
          hitokotoCount++;
          runHitokoto();
        },
        // 失败：回退一轮预设，下一轮重新开始尝试 hitokoto
        () => {
          presetCycle(() => {
            hitokotoCount = 0;
            runHitokoto();
          });
        },
      );
    };

    const loop = () => {
      presetCycle(() => {
        hitokotoCount = 0;
        runHitokoto();
      });
    };

    loop();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      abortControllers.forEach((c) => c.abort());
      timeouts = [];
      setDisplayedFateText('');
    };
  }, [active, tSite]);

  return { displayedFateText, isFateTypingActive };
}

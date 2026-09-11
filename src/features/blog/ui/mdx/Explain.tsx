import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import styles from '../../styles/Explain.module.scss';
import { useResponsive } from '@/shared/hooks/useMediaQuery';

/**
 * 句级注解 / 语句解释。
 *
 * 正文中被解释的文本带虚线下划线：
 *   - 桌面端：mouseenter / focus 展开，mouseleave / blur 收起。
 *   - 触屏：click 切换；外部 pointerdown 或 Escape 关闭。
 *
 * 触发器使用 `<span tabIndex={0}>` 而非 `<button>` —— `<button>` 是 form
 * control，浏览器把它当作 atomic inline-block 处理，跨多词文本无法在
 * 词间自然换行，并强制 text-align: center；用 `<span>` 才能让被解释
 * 文本与正文按正常 inline 流参与行盒断行。
 *
 * 通过 `tabIndex={0}` 与 keydown 处理保留键盘可访问性（Enter / Space 触发，
 * Escape 关闭），用 `aria-describedby` 关联 tooltip 满足读屏。
 *
 * 移动端定位：absolute + left:0 会让 tooltip 锚在触发器左缘往右展开，
 * 触发器靠右时直接顶出视口右侧。改用 position: fixed 横向锁视口左右 12px，
 * 纵向用 getBoundingClientRect 量取触发器底部注入 inline top；视觉上仍
 * "跟在原文下方"，但横向不再受触发器位置影响。fixed 与正文滚动会脱位，
 * 所以移动端 open 期间任何祖先 scroll / resize 都关闭 tooltip。
 */
interface ExplainProps {
  children: React.ReactNode;
  note: string;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function Explain({ children, note }: ExplainProps) {
  const [open, setOpen] = useState(false);
  const [mobileTop, setMobileTop] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const { isMobile } = useResponsive();

  // 仅在 open 时挂监听，避免无谓订阅；关闭时自动解绑。
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // 移动端：测量触发器底部，注入 inline top；并在 scroll/resize 时关闭。
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    if (!isMobile) {
      queueMicrotask(() => setMobileTop(null));
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMobileTop(Math.round(rect.bottom + 8));
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    if (!isMobile) return;
    const close = () => setOpen(false);
    // capture: true 捕获祖先滚动容器（pageWrapper 等）的 scroll
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, isMobile]);

  return (
    <span className={styles.explainWrapper} ref={ref}>
      <span
        ref={triggerRef}
        /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an inline button element changes line wrapping for explained prose. */
        role="button"
        tabIndex={0}
        className={styles.explainTrigger}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        {children}
      </span>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={styles.explainTooltip}
          style={mobileTop != null ? { top: mobileTop } : undefined}
        >
          {note}
        </span>
      )}
    </span>
  );
}

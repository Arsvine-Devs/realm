/**
 * LocaleFallbackBanner — 翻译状态提示横幅。
 *
 *  - status='fallback'    本页缺译，已用 actualLocale 兜底显示 → 警示风格，30s 自动消失
 *  - status='translated'  本页是从 originLocale 翻译而来 → 信息风格，5s 自动消失
 *  - status='source'      原文 locale，不渲染
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './LocaleFallbackBanner.module.scss';
import { localeNativeName, type Locale } from '@/shared/contracts/locale';
import type { TranslationStatus } from '@/shared/types';

interface Props {
  requestedLocale: Locale;
  actualLocale: Locale;
  /** 内容原文 locale，仅在 status='translated' 时用于文案。可选；不传退回 actualLocale。 */
  originLocale?: Locale;
  /** 翻译状态。未传时按旧逻辑（requested != actual 即视为 fallback）兼容。 */
  status?: TranslationStatus;
}

const FALLBACK_AUTO_DISMISS_MS = 30000;
const TRANSLATED_AUTO_DISMISS_MS = 5000;
const EXIT_ANIMATION_MS = 240;

export default function LocaleFallbackBanner({
  requestedLocale,
  actualLocale,
  originLocale,
  status,
}: Props) {
  // 显式 status 优先；缺省时按旧逻辑兼容（防止旧调用方一次性全断）。
  // 兼容路径里不区分 translated，只表达 fallback。
  const effectiveStatus: TranslationStatus =
    status ?? (requestedLocale !== actualLocale ? 'fallback' : 'source');

  if (effectiveStatus === 'source') return null;

  return (
    <LocaleFallbackBannerContent
      key={`${effectiveStatus}:${requestedLocale}:${actualLocale}:${originLocale ?? ''}`}
      requestedLocale={requestedLocale}
      actualLocale={actualLocale}
      originLocale={originLocale ?? actualLocale}
      status={effectiveStatus}
    />
  );
}

interface ContentProps {
  requestedLocale: Locale;
  actualLocale: Locale;
  originLocale: Locale;
  status: Exclude<TranslationStatus, 'source'>;
}

function LocaleFallbackBannerContent({
  requestedLocale,
  actualLocale,
  originLocale,
  status,
}: ContentProps) {
  const t = useTranslations('fallbackBanner');
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const dismiss = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setIsVisible(false);
    }, EXIT_ANIMATION_MS);
  }, [isClosing]);

  useEffect(() => {
    if (!isVisible) return;
    const delay = status === 'fallback' ? FALLBACK_AUTO_DISMISS_MS : TRANSLATED_AUTO_DISMISS_MS;
    const timer = window.setTimeout(() => {
      dismiss();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [dismiss, isVisible, status]);

  if (!isVisible) return null;

  const text =
    status === 'fallback'
      ? t('fallback', {
          requested: localeNativeName[requestedLocale],
          actual: localeNativeName[actualLocale],
        })
      : t('translated', { origin: localeNativeName[originLocale] });

  const variantClass = status === 'fallback' ? styles.fallback : styles.translated;
  const icon = status === 'fallback' ? '⚠' : 'ℹ';

  return (
    <div className={`${styles.banner} ${variantClass} ${isClosing ? styles.closing : ''}`}>
      <span className={styles.bannerIcon}>{icon}</span>
      {/* A live status region is intentionally a span because it is inline banner content. */}
      <span
        className={styles.bannerText}
        /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- output would misrepresent this translated status message. */
        role="status"
        aria-live="polite"
      >
        {text}
      </span>
      <button
        type="button"
        className={styles.closeButton}
        onClick={dismiss}
        aria-label={t('dismiss')}
      >
        ×
      </button>
    </div>
  );
}

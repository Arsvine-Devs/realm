import { memo, useEffect, useRef } from 'react';
import styles from '../../../../app/styles/Shell.module.scss';
import { useResponsive } from '@/shared/hooks/useMediaQuery';
import { siteConfig } from '@/shared/config/site';
import LanguageSwitcher from '../../../navigation/ui/LanguageSwitcher';
import type { Locale } from '@/shared/contracts/locale';

interface GlobalHudProps {
  currentTime: string;
  hudVisible: boolean;
  isGamePage?: boolean;
  locale: Locale;
}

function GlobalHud({ currentTime, hudVisible, isGamePage = false, locale }: GlobalHudProps) {
  const { isMobile } = useResponsive();
  const cursorXRef = useRef<HTMLSpanElement>(null);
  const cursorYRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isMobile) return;
    const onMouseMove = (e: MouseEvent) => {
      if (cursorXRef.current)
        cursorXRef.current.textContent = String(Math.round(e.clientX)).padStart(4, '0');
      if (cursorYRef.current)
        cursorYRef.current.textContent = String(Math.round(e.clientY)).padStart(4, '0');
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isMobile]);

  if (isMobile) {
    return (
      <>
        <div
          className={`${styles.hudElement} ${styles.topLeft} ${hudVisible ? styles.visible : ''}`}
        >
          <div className={styles.hudTopLeftContent}>
            <div className={styles.hudStatusBlock}>
              <div>TIME: {currentTime}</div>
              <div>SYSTEM_ONLINE</div>
            </div>
            <LanguageSwitcher currentLocale={locale} />
          </div>
        </div>
        <div
          className={`${styles.hudElement} ${styles.topRight} ${hudVisible ? styles.visible : ''}`}
        >
          <div>NEURAL_NETWORK_ACTIVE</div>
          <div>SIGNAL: STABLE</div>
        </div>
        <div
          className={`${styles.hudElement} ${styles.bottomLeft} ${hudVisible ? styles.visible : ''}`}
        >
          <div>{siteConfig.name}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`${styles.hudElement} ${styles.topLeft} ${hudVisible ? styles.visible : ''}`}>
        <div className={styles.hudTopLeftContent}>
          <div className={styles.hudStatusBlock}>
            <div>TIME: {currentTime}</div>
            <div>SYSTEM_ONLINE</div>
          </div>
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>
      <div
        className={`${styles.hudElement} ${styles.topRight} ${hudVisible ? styles.visible : ''}`}
      >
        <div>
          CURSOR_X: <span ref={cursorXRef}>0000</span>
        </div>
        <div>
          CURSOR_Y: <span ref={cursorYRef}>0000</span>
        </div>
      </div>
      <div
        className={`${styles.hudElement} ${styles.bottomLeft} ${hudVisible ? styles.visible : ''}`}
      >
        <div>{siteConfig.name}</div>
        <div>NAV_SYSTEM_v2.4</div>
      </div>
      {!isGamePage && (
        <div
          className={`${styles.hudElement} ${styles.bottomRight} ${hudVisible ? styles.visible : ''}`}
        >
          <div>TACTICAL_MODE</div>
          <div>SECURE_CONNECTION</div>
        </div>
      )}
    </>
  );
}

export default memo(GlobalHud);

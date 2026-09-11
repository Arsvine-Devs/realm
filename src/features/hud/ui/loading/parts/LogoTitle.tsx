import React, { useEffect, useRef, useImperativeHandle } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../HomeLoadingScreen.module.scss';
import gsap from 'gsap';
import { siteConfig } from '@/shared/config/site';
import { animateTitleCharacters } from '@/shared/lib/title-reveal';

export interface LogoTitleRef {
  container: HTMLDivElement | null;
  mainTitle: HTMLHeadingElement | null;
  animateIn: (delay?: number) => void;
}

function LogoTitle({ ref }: { ref?: React.Ref<LogoTitleRef> }) {
  const tSite = useTranslations('pages.site');
  const logoAreaRef = useRef<HTMLDivElement>(null);
  const mainTitleRef = useRef<HTMLHeadingElement>(null);
  const animationCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => animationCleanupRef.current?.(), []);

  useImperativeHandle(ref, () => ({
    container: logoAreaRef.current,
    mainTitle: mainTitleRef.current,
    animateIn: (delay = 0.8) => {
      if (!mainTitleRef.current) return;
      animationCleanupRef.current?.();
      const cleanupTitle = animateTitleCharacters({
        root: mainTitleRef.current,
        wrapperSelector: `.${styles.char_wrapper}`,
        innerSelector: `.${styles.char_inner}`,
        startDelayMs: 0,
        revealDelay: delay,
        stagger: 0.12,
        opacity: 0.8,
      });

      // Animate subtitle
      const subTitle = logoAreaRef.current?.querySelector(
        `.${styles.logo_subtitle}`,
      ) as HTMLElement;
      if (subTitle) {
        gsap.set(subTitle, { opacity: 0 }); // Ensure it starts invisible immediately
        gsap.to(subTitle, {
          opacity: 1,
          duration: 1.5,
          delay: delay + 0.3,
          ease: 'power2.inOut',
          onStart: () => {
            gsap.set(subTitle, { visibility: 'visible' });
          },
        });
      }
      animationCleanupRef.current = () => {
        cleanupTitle();
        if (subTitle) gsap.killTweensOf(subTitle);
      };
    },
  }));

  return (
    <div ref={logoAreaRef} className={styles.logo_area}>
      <div className={styles.title_container}>
        <h1 ref={mainTitleRef} className={styles.main_title}>
          {siteConfig.name.split('').map((char, index) => (
            <span key={`site-${char}-${index}`} className={styles.char_wrapper}>
              <span className={styles.char_inner}>{char === ' ' ? ' ' : char}</span>
            </span>
          ))}
        </h1>
        <div
          className={styles.logo_subtitle}
          style={{ opacity: 0, visibility: 'hidden' }}
          suppressHydrationWarning
        >
          {tSite('loadingSubtitle')}
        </div>
      </div>
    </div>
  );
}

LogoTitle.displayName = 'LogoTitle';

export default LogoTitle;

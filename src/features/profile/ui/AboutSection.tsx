/* eslint-disable @next/next/no-img-element -- decorative local assets rely on plain img sizing and do not benefit from next/image here */
import { useTranslations } from 'next-intl';
import styles from '../styles/ProfileSections.module.scss';
import Noise from '../../hud/ui/effects/Noise';
import AboutParticleImage from './AboutParticleImage';
import { siteConfig } from '@/shared/config/site';
import { defaultLocale, isLocale } from '@/shared/contracts/locale';
import { useTransition } from '../../navigation/model/TransitionProvider';
import {
  useHudPerformance,
  useHudPower,
  useHudStats,
} from '../../hud/model/HudProvider';
import { useSiteAssets } from '../../assets/model/SiteAssetsProvider';
import useVisitorLanguageCode from '@/shared/hooks/useVisitorLanguageCode';
import type { RefObject } from 'react';
import { useNavigationRuntime } from '@/features/navigation/model/NavigationRuntime';

interface AboutSectionProps {
  aboutSectionRef: RefObject<HTMLDivElement | null>;
  aboutContentRef: RefObject<HTMLDivElement | null>;
}

export default function AboutSection({
  aboutSectionRef,
  aboutContentRef,
}: AboutSectionProps) {
  const t = useTranslations('sections.about');
  const { query } = useNavigationRuntime();
  const { navigateTo } = useTransition();
  const { runtime, currentVisitDuration } = useHudStats();
  const { allowDecorativeMotion, performanceTier } = useHudPerformance();
  const { isInverted } = useHudPower();
  const { getSiteAssetUrl } = useSiteAssets();
  const visitorLanguageCode = useVisitorLanguageCode();
  const queryLocale = query.locale;
  const locale = isLocale(queryLocale) ? queryLocale : defaultLocale;
  const currentYear = new Date().getFullYear();
  const yearRange =
    currentYear > siteConfig.copyrightYearStart
      ? `${siteConfig.copyrightYearStart}-${currentYear}`
      : `${siteConfig.copyrightYearStart}`;
  return (
    <div id="about-section" ref={aboutSectionRef} className={`${styles.contentSection} ${styles.aboutSection}`}>
      {allowDecorativeMotion ? <Noise /> : null}
      <div ref={aboutContentRef} className={styles.aboutContentInner}>
        <h2>ABOUT</h2>
        <div className={styles.siteStatsContainer}>
          <p>{t('systemUptime')}: <span className={styles.statValue}>{runtime}</span></p>
          <p>{t('currentVisitDuration')}: <span className={styles.statValue}>{currentVisitDuration}</span></p>
          <p>{t('visitorLanguage')}: <span className={styles.statValue}>{visitorLanguageCode ?? '--'}</span></p>
        </div>
        <div className={styles.footerInfo}>
          <p>{t('codeLicense')}</p>
          <p>{t('contentLicense')}</p>
          <p>
            <a
              href={`/${locale}/copyright`}
              onClick={(e) => {
                e.preventDefault();
                navigateTo(`/${locale}/copyright`);
              }}
            >
              {t('details')}
            </a>
          </p>
          <p>© {yearRange} {siteConfig.author}.</p>
        </div>
        <div className={styles.aboutImageContainer}>
          <img
            src={getSiteAssetUrl('site/about-qr', '/about-qr.svg')}
            alt="Website QR Code"
            className={styles.aboutImage}
            draggable={false}
          />
        </div>
      </div>
      <AboutParticleImage
        enabled={performanceTier === 'full'}
        inverted={isInverted}
      />
    </div>
  );
}

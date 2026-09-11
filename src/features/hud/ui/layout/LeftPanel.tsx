/* eslint-disable @next/next/no-img-element -- decorative SVG badge is local, non-critical, and sized by existing HUD CSS */
import { Fragment, useRef, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../../../../app/styles/Shell.module.scss';
import { useHudPerformance } from '../../model/HudProvider';
import { useSiteAssets } from '../../../assets/model/SiteAssetsProvider';
import ActivationLever from '../ActivationLever';
import type { Locale } from '@/shared/contracts/locale';
import type { EnvData } from '@/shared/contracts/environment';
import useLogoEffects from './useLogoEffects';

interface DrawerNavLink {
  label: string;
  href: string;
  group: 'content' | 'standalone';
  hash?: string;
}

interface LeftPanelProps {
  locale: Locale;
  leftPanelAnimated: boolean;
  mainVisible: boolean;
  leversVisible: boolean;
  handleActivateTesseract: () => void;
  isTesseractActivated: boolean;
  handleDischargeLeverPull: () => void;
  isDischarging: boolean;
  activeSection: string;
  handleGlobalBackClick: () => void;
  navLinks: readonly DrawerNavLink[];
  handleLeftNavLinkClick: (link: DrawerNavLink) => void;
  powerLevel: number;
  isFateTypingActive: boolean;
  displayedFateText: string;
  isEnvParamsTyping: boolean;
  displayedEnvParams: string;
  envArtifactStage?: 0 | 1 | 2 | 3 | 4;
  isInverted: boolean;
  drawerOpen?: boolean;
  isStandalone?: boolean;
  isTesseractDragging?: boolean;
  powerDisplayRef: Ref<HTMLDivElement>;
  batteryIconRef: Ref<HTMLDivElement>;
  envData?: EnvData | null;
}

// --- 渐变装饰条颜色映射 ---
// 6 段色块：1 段绿色 highlight + 5 段灰阶；flex 比例由模拟环境数据驱动。
// 数据维度对照：[overall→绿, temp→灰1, rad→灰2, o2→灰3, pollution→灰4, acidRain→灰5]
const POLL_SCORES: Record<string, number> = {
  SEVERE: 0.5,
  CRITICAL: 0.7,
  UNSTABLE: 0.6,
  HAZARDOUS: 0.9,
};
const RAIN_SCORES: Record<string, number> = {
  UNLIKELY: 0.1,
  LIKELY: 0.5,
  IMMINENT: 0.8,
  CERTAIN: 1.0,
};
const GRAY_BASE = [36, 24, 19, 12, 5];
const GRAY_COLORS = ['#333333', '#444444', '#666666', '#888888', '#aaaaaa'];
const TRAVELLING_LANG_MAP: Record<Locale, string> = {
  en: 'en',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
};

function computeBlocks(envData: EnvData | null) {
  if (!envData) {
    return [
      { flex: 4, color: 'var(--ark-highlight-green)' },
      ...GRAY_BASE.map((f, i) => ({ flex: f, color: GRAY_COLORS[i] })),
    ];
  }

  const cl = (v: number) => Math.min(1, Math.max(0, v));
  const scores = [
    cl((envData.temp - 44) / 22),
    cl((envData.rad - 200) / 300),
    cl(1 - (envData.o2 - 8) / 2),
    POLL_SCORES[envData.pollution] ?? 0.5,
    RAIN_SCORES[envData.acidRain] ?? 0.3,
  ];

  const overall = scores.reduce((a, b) => a + b, 0) / scores.length;

  const grays = GRAY_BASE.map((base, i) => ({
    flex: Math.max(2, base + (scores[i] - 0.5) * 16),
    color: GRAY_COLORS[i],
  }));

  return [
    { flex: Math.max(1.5, 4 + (overall - 0.5) * 3), color: 'var(--ark-highlight-green)' },
    ...grays,
  ];
}

export default function LeftPanel({
  locale,
  leftPanelAnimated,
  mainVisible,
  leversVisible,
  handleActivateTesseract,
  isTesseractActivated,
  handleDischargeLeverPull,
  isDischarging,
  activeSection,
  handleGlobalBackClick,
  navLinks,
  handleLeftNavLinkClick,
  powerLevel,
  isFateTypingActive,
  displayedFateText,
  isEnvParamsTyping,
  displayedEnvParams,
  envArtifactStage = 0,
  isInverted,
  drawerOpen = false,
  isStandalone = false,
  isTesseractDragging = false,
  powerDisplayRef,
  batteryIconRef,
  envData = null as EnvData | null,
}: LeftPanelProps) {
  const tNav = useTranslations('mainNav');
  const tSite = useTranslations('pages.site');
  const travellingUrl = `https://www.travellings.cn/arsvine?lang=${TRAVELLING_LANG_MAP[locale]}`;
  const travellingLabel = tSite('travellingLabel');
  const newsUrl = 'https://lab.arsvine.com';
  const newsLabel = tSite('newsLabel');
  const newsMessage = tSite('newsMessage');
  const newsCursorLabel = tSite('newsCursor');
  const { getSiteAssetUrl } = useSiteAssets();
  const chargeLeverLabel = isTesseractActivated ? 'CHARGING' : 'START CHARGE';
  const dischargeLeverLabel = isDischarging
    ? 'DISCHARGING'
    : powerLevel === 100
      ? 'DISCHARGE'
      : 'FULL CHARGE REQUIRED';

  const showBackAndNav =
    leftPanelAnimated &&
    (activeSection === 'content' ||
      activeSection === 'lifeDetail' ||
      activeSection === 'workDetail' ||
      activeSection === 'experienceDetail' ||
      activeSection === 'blog' ||
      activeSection === 'blogDetail' ||
      activeSection === 'friendLinkDetail');

  const { allowLogoEffects } = useHudPerformance();
  const logoRef = useRef<HTMLDivElement | null>(null);
  useLogoEffects(logoRef, allowLogoEffects && leftPanelAnimated && !isStandalone);

  return (
    <div
      className={`${styles.leftPanel} ${leftPanelAnimated ? styles.animated : ''} ${drawerOpen ? styles.drawerOpen : ''} ${isStandalone ? styles.standaloneHide : ''}`}
    >
      <div className={styles.topRightDecoration}></div>
      <div className={styles.leverGroup}>
        {mainVisible && (
          <ActivationLever
            onActivate={handleActivateTesseract}
            isActive={isTesseractActivated}
            iconType="discharge"
            isAnimated={leversVisible}
            cursorLabel={chargeLeverLabel}
          />
        )}
        {mainVisible && (
          <ActivationLever
            onActivate={handleDischargeLeverPull}
            isActive={isDischarging}
            iconType="drain"
            isAnimated={leversVisible}
            cursorLabel={dischargeLeverLabel}
          />
        )}
      </div>
      <button
        className={`${styles.globalBackButton} ${showBackAndNav ? styles.visible : ''}`}
        onClick={handleGlobalBackClick}
        data-cursor-label="BACK"
        aria-label="BACK"
      ></button>
      <div
        className={`${styles.globalBackButtonDivider} ${showBackAndNav ? styles.visible : ''}`}
      ></div>
      <div className={`${styles.leftNavLinks} ${showBackAndNav ? styles.visible : ''}`}>
        {navLinks.map((link: DrawerNavLink, i: number) => (
          <Fragment key={link.href}>
            {i === 0 && (
              <div
                /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- hr cannot contain the visible localized group label. */
                role="separator"
                aria-label={tNav('groupContent')}
                className={styles.leftNavGroupLabel}
              >
                <span>{tNav('groupContent')}</span>
              </div>
            )}
            {i === 6 && (
              <div
                /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- hr cannot contain the visible localized group label. */
                role="separator"
                aria-label={tNav('groupStandalone')}
                className={styles.leftNavGroupLabel}
              >
                <span>{tNav('groupStandalone')}</span>
              </div>
            )}
            <button className={styles.leftNavLink} onClick={() => handleLeftNavLinkClick(link)}>
              {link.label}
            </button>
          </Fragment>
        ))}
      </div>
      <div
        ref={powerDisplayRef as Ref<HTMLDivElement>}
        className={`${styles.powerDisplay} ${isTesseractDragging ? styles.attracting : ''}`}
      >
        <div ref={batteryIconRef as Ref<HTMLDivElement>} className={styles.batteryIcon}>
          {[...Array(5)].map((_, i) => {
            const shouldBeFilled = powerLevel >= (i + 1) * 20;
            const isFilled = (i === 4 && powerLevel === 100) || shouldBeFilled;
            return (
              <span
                key={i}
                className={`${styles.batteryLevelSegment} ${isFilled ? styles.filled : ''}`}
              ></span>
            );
          })}
        </div>
        <span className={styles.powerText}>{powerLevel}%</span>
      </div>
      <div className={styles.logoContainer} aria-hidden="true">
        <div className={styles.logoReveal}>
          <div ref={logoRef} className={styles.logoMotion}>
            <span className={styles.logoBase}></span>
          </div>
        </div>
      </div>
      <div
        className={`${styles.fateTextContainer} ${isFateTypingActive ? styles.typingActive : ''}`}
      >
        <span className={styles.fateText}>{displayedFateText}</span>
        <div className={styles.fateLine}></div>
      </div>
      <div
        className={`${styles.envParamsContainer} ${isEnvParamsTyping ? styles.typingActive : ''} ${leftPanelAnimated ? styles.animated : ''}`}
        data-env-stage={envArtifactStage}
      >
        <pre className={styles.envParamsText}>{displayedEnvParams}</pre>
      </div>
      <div className={styles.brailleText} aria-hidden="true">
        ⠠⠕⠗⠁⠉⠇⠑⠀⠠⠏⠗⠊⠑⠎⠞⠑⠎⠎⠀⠠⠁⠗⠅
      </div>
      <div
        className={`${styles.gradientLine} ${isInverted ? styles.gradientLineInverted : ''}`}
        aria-hidden="true"
      >
        {!isInverted &&
          computeBlocks(envData).map((block, index) => (
            <div
              key={index}
              className={styles.gradientSegment}
              style={{ flex: block.flex, backgroundColor: block.color }}
            />
          ))}
      </div>
      <div className={styles.travelStatusRow}>
        <a
          href={travellingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.travellingLink}
          aria-label={travellingLabel}
          data-cursor-label={travellingLabel}
        >
          <img
            className={styles.travellingDesktopBadge}
            src={getSiteAssetUrl('site/travelling', '/travel.svg')}
            alt=""
            draggable={false}
          />
          <span className={styles.travellingMobileBadge} aria-hidden="true">
            <svg
              className={styles.travellingMobileIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              focusable="false"
              aria-hidden="true"
            >
              <path d="M7 3.5h10a2 2 0 0 1 2 2v9.25a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" />
              <path d="M8 7h8M8 11h8M8 20.5l2-3.75m6 3.75-2-3.75M8.5 14h.01m6.99 0h.01" />
            </svg>
            <span>{travellingLabel}</span>
          </span>
        </a>
        <a
          href={newsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.newsLink}
          aria-label={`${newsLabel} ${newsMessage}`}
          data-cursor-label={newsCursorLabel}
        >
          <span className={styles.newsStatusDot} aria-hidden="true"></span>
          <span className={styles.newsTickerViewport}>
            <span className={styles.newsTickerTrack}>
              {[0, 1].map((itemIndex) => (
                <span
                  key={itemIndex}
                  className={styles.newsTickerItem}
                  aria-hidden={itemIndex === 1 ? 'true' : undefined}
                >
                  <span className={styles.newsBreaking}>{newsLabel}</span>
                  <span className={styles.newsMessage}>{newsMessage}</span>
                </span>
              ))}
            </span>
          </span>
          <svg
            className={styles.newsExternalIcon}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13.5 6H20.25V12.75M20.25 6L10.5 15.75M17.25 13.5V18.375C17.25 18.9963 16.7463 19.5 16.125 19.5H5.625C5.00368 19.5 4.5 18.9963 4.5 18.375V7.875C4.5 7.25368 5.00368 6.75 5.625 6.75H10.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}

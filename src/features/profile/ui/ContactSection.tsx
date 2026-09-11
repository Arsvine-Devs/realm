import { useTranslations } from 'next-intl';
import styles from '../styles/ProfileSections.module.scss';
import { siteConfig } from '@/shared/config/site';
import { defaultLocale, isLocale } from '@/shared/contracts/locale';
import type { RefObject } from 'react';
import { useNavigationRuntime } from '@/features/navigation/model/NavigationRuntime';

interface ContactSectionProps {
  contactSectionRef: RefObject<HTMLDivElement | null>;
  handleCopyEmail: () => void;
  isEmailCopied: boolean;
  handleShowFriendLinks: () => void;
}

export default function ContactSection({
  contactSectionRef,
  handleCopyEmail,
  isEmailCopied,
  handleShowFriendLinks,
}: ContactSectionProps) {
  const t = useTranslations('sections.contact');
  const { query } = useNavigationRuntime();
  const locale = isLocale(query.locale) ? query.locale : defaultLocale;
  // X (Twitter) 的可见性由 _document 注入的 <html data-x-blocked> + globals.scss
  // 里的 [data-hide-when-x-blocked] 规则统一处理，CSS 命中后直接 display:none，
  // 不依赖 useEffect 解析 cookie —— SSR/hydration 前就生效，无首屏闪烁。
  // 切换 VPN → 刷新即可立刻看到 X（不必等 cookie 过期）。

  return (
    <div
      id="contact-section"
      ref={contactSectionRef}
      className={`${styles.contentSection} ${styles.contactSection}`}
    >
      <h2>CONTACT</h2>
      {/* Radar animation — part of the HUD design, not a replaceable image */}
      <div className={styles.radarDisplay}>
        <div className={styles.scanner}></div>
        <div className={`${styles.radarRipple} ${styles.ripple1}`}></div>
        <div
          className={`${styles.radarRipple} ${styles.radarRippleSmall} ${styles.smallRipple1}`}
        ></div>
        <div
          className={`${styles.radarRipple} ${styles.radarRippleSmall} ${styles.smallRipple2}`}
        ></div>
        <div
          className={`${styles.radarRipple} ${styles.radarRippleSmall} ${styles.smallRipple3}`}
        ></div>
      </div>

      {/* Email — Replace with your own */}
      <button
        type="button"
        className={`${styles.logItem} ${styles.radarContact1}`}
        onClick={handleCopyEmail}
        data-cursor-magnetic
        data-cursor-padding="18"
        data-cursor-label={siteConfig.email}
      >
        <div className={styles.logIconContainer}>
          <svg className={styles.logIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.00977 5.83789C3 5.28561 3.44772 4.83789 4 4.83789H20C20.5523 4.83789 21 5.28561 21 5.83789V17.1621C21 17.7144 20.5523 18.1621 20 18.1621H4C3.44772 18.1621 3 17.7144 3 17.1621V5.83789H3.00977ZM5.01817 6.83789L11.0535 11.4847C11.6463 11.9223 12.4249 11.9223 13.0177 11.4847L19.053 6.83789H5.01817Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className={styles.contactIconRipple}></div>
        <span className={styles.emailText}>{siteConfig.email}</span>
        {isEmailCopied && <span className={styles.copyFeedback}>{t('copied')}</span>}
      </button>

      {/* GitHub */}
      <div
        className={`${styles.logItem} ${styles.radarContact2}`}
        data-cursor-magnetic
        data-cursor-padding="18"
        data-cursor-label="GitHub"
      >
        <a
          href={siteConfig.social.github}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.logLink}
          aria-label="GitHub"
        >
          <div className={styles.logIconContainer}>
            <svg className={styles.logIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <div className={styles.contactIconRipple}></div>
        </a>
      </div>

      {/* X (Twitter) — 被屏蔽地区（CN/IR/KP/TM）由 CSS 隐藏，见 globals.scss */}
      {siteConfig.social.x && (
        <div
          className={`${styles.logItem} ${styles.radarContact3}`}
          data-hide-when-x-blocked
          data-cursor-magnetic
          data-cursor-padding="18"
          data-cursor-label="X"
        >
          <a
            href={siteConfig.social.x}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.logLink}
            aria-label="X"
          >
            <div className={styles.logIconContainer}>
              <svg
                className={styles.logIcon}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
                />
              </svg>
            </div>
            <div className={styles.contactIconRipple}></div>
          </a>
        </div>
      )}

      {/* Steam */}
      {siteConfig.social.steam && (
        <div
          className={`${styles.logItem} ${styles.radarContact4}`}
          data-cursor-magnetic
          data-cursor-padding="18"
          data-cursor-label="Steam"
        >
          <a
            href={siteConfig.social.steam}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.logLink}
            aria-label="Steam"
          >
            <div className={styles.logIconContainer}>
              <svg
                className={styles.logIcon}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"
                />
              </svg>
            </div>
            <div className={styles.contactIconRipple}></div>
          </a>
        </div>
      )}

      {/* Bilibili — 海外访客（非 CN/HK/MO/TW）由 CSS 隐藏，见 globals.scss */}
      {siteConfig.social.bilibili && (
        <div
          className={`${styles.logItem} ${styles.radarContact7}`}
          data-hide-when-bilibili-blocked
          data-cursor-magnetic
          data-cursor-padding="18"
          data-cursor-label="Bilibili"
        >
          <a
            href={siteConfig.social.bilibili}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.logLink}
            aria-label="Bilibili"
          >
            <div className={styles.logIconContainer}>
              <svg
                className={styles.logIcon}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z"
                />
              </svg>
            </div>
            <div className={styles.contactIconRipple}></div>
          </a>
        </div>
      )}

      {/* RSS */}
      <div
        className={`${styles.logItem} ${styles.radarContact5}`}
        data-cursor-magnetic
        data-cursor-padding="18"
        data-cursor-label={t('rss')}
      >
        <a
          href={`/${locale}/rss.xml`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.logLink}
          aria-label={t('rss')}
        >
          <div className={styles.logIconContainer}>
            <svg
              className={styles.logIcon}
              viewBox="0 0 1088 1024"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              style={{ transform: 'scale(0.8)', strokeWidth: '0' }}
            >
              <path
                d="M64 192c470.72 0 832 357.952 832 829.952h192C1088 460.672 623.808 0 64 0v192z"
                fill="currentColor"
              />
              <path
                d="M67.328 575.36c256.512 0 445.248 185.6 445.248 442.816h188.8c0-342.144-292.992-630.208-634.048-630.208V575.36zM67.968 1017.6h250.24c0-159.424-91.52-243.008-250.24-244.48-0.896 0 0 244.48 0 244.48z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className={styles.contactIconRipple}></div>
        </a>
      </div>

      {/* Friend Links */}
      <button
        type="button"
        className={`${styles.logItem} ${styles.radarContact6}`}
        onClick={handleShowFriendLinks}
        data-cursor-magnetic
        data-cursor-padding="18"
        data-cursor-label={t('links')}
      >
        <div className={styles.logIconContainer}>
          <svg
            className={styles.logIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div className={styles.contactIconRipple}></div>
        <span className={styles.emailText}>{t('links')}</span>
      </button>
    </div>
  );
}

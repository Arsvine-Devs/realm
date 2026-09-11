'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../../app/shell/SectionPageLayout';
import styles from '../styles/ProfileSections.module.scss';
import { siteConfig } from '@/shared/config/site';
import type { Locale } from '@/shared/contracts/locale';

const MIT_URL = 'https://opensource.org/license/mit/';
const CC_URL = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';

export interface CopyrightPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
}

export default function CopyrightPage({ locale }: CopyrightPageProps) {
  const t = useTranslations('pages.copyright');
  const [entered, setEntered] = useState(false);
  const shareItems = t.raw('shareItems') as string[];
  const currentYear = new Date().getFullYear();
  const yearRange =
    currentYear > siteConfig.copyrightYearStart
      ? `${siteConfig.copyrightYearStart}–${currentYear}`
      : `${siteConfig.copyrightYearStart}`;

  // intro / contentLicense 的文案里有 {mitLink} / {ccLink} 占位符。
  // 我们要自己渲染成 <a>，所以用 t.raw() 拿原始模板字符串绕开 next-intl
  // 的 ICU 解析（直接 t() 会因为没传变量而 fallback 到 key 名）。
  const renderWithLinks = (
    template: string,
    links: Record<string, { url: string; text: string }>,
  ) => {
    const parts: (string | React.ReactNode)[] = [];
    let remaining = template;
    let key = 0;
    Object.entries(links).forEach(([placeholder, { url, text }]) => {
      const token = `{${placeholder}}`;
      const idx = remaining.indexOf(token);
      if (idx >= 0) {
        parts.push(remaining.slice(0, idx));
        parts.push(
          <a key={`l-${key++}`} href={url} target="_blank" rel="noopener noreferrer">
            {text}
          </a>,
        );
        remaining = remaining.slice(idx + token.length);
      }
    });
    parts.push(remaining);
    return parts;
  };

  const introLinks = {
    mitLink: { url: MIT_URL, text: 'MIT License' },
  };
  const contentLicenseLinks = {
    ccLink: {
      url: CC_URL,
      text:
        locale === 'en'
          ? 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0)'
          : locale === 'zh-TW'
            ? 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License（CC BY-NC-ND 4.0，姓名標示—非商業性—禁止改作）'
            : 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License（CC BY-NC-ND 4.0，署名—非商业性使用—禁止演绎）',
    },
  };

  const langAttr = locale === 'zh-CN' ? 'zh-CN' : locale === 'zh-TW' ? 'zh-TW' : 'en';

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SectionPageLayout>
      <div
        className={`${styles.friendLinkSection} ${styles.copyrightSection} ${entered ? styles.copyrightEntered : ''}`}
      >
        <h2>{t('heading')}</h2>

        <article className={styles.copyrightArticle} lang={langAttr}>
          {locale !== 'zh-CN' && (
            <>
              <p className={styles.copyrightBindingNotice}>
                <strong>{t.raw('bindingNotice') as string}</strong>
              </p>
              <hr className={styles.copyrightBindingDivider} />
            </>
          )}
          <p>{renderWithLinks(t.raw('intro') as string, introLinks)}</p>
          <p>{renderWithLinks(t.raw('contentLicense') as string, contentLicenseLinks)}</p>
          <p>{t('shareIntro')}</p>
          <ol>
            {shareItems.map((item, idx) => (
              <li key={idx}>{item.replace('{author}', siteConfig.author)}</li>
            ))}
          </ol>
          <p>{t('prohibited')}</p>
          <p>{t('quotation')}</p>
          <p>{t('thirdParty')}</p>
          <p>
            {t('contactPrefix')} <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
          </p>
        </article>

        <p className={styles.copyrightStamp}>
          © {yearRange} {siteConfig.author}
        </p>
      </div>
    </SectionPageLayout>
  );
}

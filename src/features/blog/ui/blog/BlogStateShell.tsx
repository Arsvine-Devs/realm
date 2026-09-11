import React, { startTransition, useEffect, useState } from 'react';
import type { BlogContentLocale } from '../../server/blog';
import { type Locale } from '@/shared/contracts/locale';
import type { BlogPostMeta } from '../../../../shared/types';
import BlogDetailScaffold from './BlogDetailScaffold';
import styles from '../../styles/BlogDetailView.module.scss';
import accessStyles from '../../styles/PostAccessPage.module.scss';

export interface BlogStateShellProps {
  locale: Locale;
  meta: BlogPostMeta;
  allPosts: BlogPostMeta[];
  defaultContentLocale: BlogContentLocale;
  signalLabel: string;
  statusText: string;
  description?: string;
  error?: string;
  action?: React.ReactNode;
  isProtected?: boolean;
}

/**
 * 博客详情的三种状态外壳：
 *   - viewState === 'authChecking'：decoding transmission（轮询 token 中）
 *   - viewState === 'loadFailed'：解码失败，提供 retry 按钮
 *   - selectedVariant 不存在但已过 auth：仍渲染 decoding 占位
 *
 * 全部场景不渲染 MDX 正文与 GSAP 动画；仅头部 + loading indicator。
 */
export default function BlogStateShell({
  locale,
  meta,
  allPosts,
  defaultContentLocale,
  signalLabel,
  statusText,
  description,
  error,
  action,
  isProtected = false,
}: BlogStateShellProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setEntered(true);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <BlogDetailScaffold
        locale={locale}
        meta={meta}
        allPosts={allPosts}
        defaultContentLocale={defaultContentLocale}
        headerEntered={entered}
        headerContent={
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{signalLabel}</span>
            <h1 className={styles.headerTitle}>{meta.title}</h1>
            <div className={styles.headerMeta}>
              {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
              {meta.readingMinutes > 0 ? (
                <span className={styles.headerReadingTime}>{meta.readingMinutes}m</span>
              ) : null}
            </div>
            {description ? <p className={styles.headerExcerpt}>{description}</p> : null}
            {error ? (
              <div className={styles.articleLocaleErrorRow}>
                <p className={accessStyles.error}>{error}</p>
                {action}
              </div>
            ) : null}
          </div>
        }
        contentContent={
          <div className={styles.loadingIndicator}>
            <span className={styles.loadingText}>{statusText}</span>
          </div>
        }
      />
    </>
  );
}

import React from 'react';
import styles from '../../styles/MDXContent.module.scss';
import { getSafeMdxHref } from '@/features/blog/model/mdxHref';
import Term from './Term';
import Explain from './Explain';

type MDXComponentsType = Record<string, React.ComponentType<any>>;

const MDXComponents: MDXComponentsType = {
  h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
  p: ({ children }) => <p className={styles.p}>{children}</p>,
  blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
  a: ({ href, children }) => {
    const safeHref = getSafeMdxHref(href);
    if (!safeHref) {
      // 危险协议或协议相对 URL 降级为纯文本，防止内容链接绕过协议限制。
      return <span className={styles.a}>{children}</span>;
    }
    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer" className={styles.a}>
        {children}
      </a>
    );
  },
  ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
  li: ({ children }) => <li className={styles.li}>{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => {
    const text = typeof children === 'string' ? children : '';
    const isShort = text.length > 0 && text.length <= 5;
    return isShort ? (
      <strong className={`${styles.strong} ${styles.strongShort}`} data-cursor-magnetic>
        {children}
      </strong>
    ) : (
      <strong className={styles.strong}>{children}</strong>
    );
  },
  em: ({ children }) => <em className={styles.em}>{children}</em>,
  hr: () => <hr className={styles.hr} />,
  code: ({ children }) => <code className={styles.inlineCode}>{children}</code>,
  pre: ({ children }) => <pre className={styles.codeBlock}>{children}</pre>,
  Lead: ({ children }: { children?: React.ReactNode }) => <p className={styles.lead}>{children}</p>,
  Aside: ({ children }: { children?: React.ReactNode }) => (
    <aside className={styles.aside}>{children}</aside>
  ),
  Mark: ({ children }: { children?: React.ReactNode }) => (
    <span className={styles.sectionMark}>{children}</span>
  ),
  Ref: ({ children }: { children?: React.ReactNode }) => (
    <section className={styles.references}>{children}</section>
  ),
  Term,
  Explain,
};

export default MDXComponents;

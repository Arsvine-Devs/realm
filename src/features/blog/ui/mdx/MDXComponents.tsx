import React from 'react';
import styles from '../../styles/MDXContent.module.scss';
import { getSafeMdxHref } from '@/features/blog/model/mdxHref';
import { BlogScrambleBlock } from './BlogContentReveal';
import Term from './Term';
import Explain from './Explain';
import Spoiler from './Spoiler';

type MDXComponentsType = Record<string, React.ComponentType<any>>;

function CodeBlock({ children }: { children?: React.ReactNode }) {
  return <pre className={styles.codeBlock}>{children}</pre>;
}

Object.assign(CodeBlock, { blogContentScrambleExcluded: true });

const MDXComponents: MDXComponentsType = {
  h1: ({ children }) => (
    <BlogScrambleBlock as="h1" className={styles.h1}>
      {children}
    </BlogScrambleBlock>
  ),
  h2: ({ children }) => (
    <BlogScrambleBlock as="h2" className={styles.h2}>
      {children}
    </BlogScrambleBlock>
  ),
  h3: ({ children }) => (
    <BlogScrambleBlock as="h3" className={styles.h3}>
      {children}
    </BlogScrambleBlock>
  ),
  h4: ({ children }) => <BlogScrambleBlock as="h4">{children}</BlogScrambleBlock>,
  h5: ({ children }) => <BlogScrambleBlock as="h5">{children}</BlogScrambleBlock>,
  h6: ({ children }) => <BlogScrambleBlock as="h6">{children}</BlogScrambleBlock>,
  p: ({ children }) => (
    <BlogScrambleBlock as="p" className={styles.p}>
      {children}
    </BlogScrambleBlock>
  ),
  blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
  a: ({ href, children, node: _node, ...attributes }) => {
    const safeHref = getSafeMdxHref(href);
    if (!safeHref) {
      // 危险协议或协议相对 URL 降级为纯文本，防止内容链接绕过协议限制。
      return <span className={styles.a}>{children}</span>;
    }
    const external = /^https?:/i.test(safeHref);
    return (
      <a
        {...attributes}
        href={safeHref}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={styles.a}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt, title }) =>
    typeof src === 'string' && src ? (
      // The browser fetches protected media directly with its current grant cookie.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ''}
        title={title}
        loading="lazy"
        decoding="async"
        className={styles.image}
      />
    ) : (
      alt
    ),
  ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
  li: ({ id, children }) =>
    id ? (
      <li id={id} className={styles.li}>
        {children}
      </li>
    ) : (
      <BlogScrambleBlock as="li" className={styles.li}>
        {children}
      </BlogScrambleBlock>
    ),
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
  pre: CodeBlock,
  Lead: ({ children }: { children?: React.ReactNode }) => (
    <BlogScrambleBlock as="p" className={styles.lead}>
      {children}
    </BlogScrambleBlock>
  ),
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
  Spoiler,
};

export default MDXComponents;

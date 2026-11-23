import { useId, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import Markdown, { type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import components from '../mdx/MDXComponents';
import type { PublishedAsset } from '@/shared/lib/content/content-api';
import { getSafeMdxHref } from '@/features/blog/model/mdxHref';
import styles from '../../styles/MDXContent.module.scss';

export type MarkdownDocument = {
  markdown: string;
  assets: Record<string, PublishedAsset>;
};

export default function MarkdownPost({
  document,
  slug,
}: {
  document: MarkdownDocument;
  slug: string;
}) {
  const t = useTranslations('spoiler');
  const id = useId();
  const renderPre = Object.assign(
    ({ node, children }: ComponentProps<'pre'> & ExtraProps) => {
      const code = node?.children[0];
      if (
        code?.type === 'element' &&
        code.tagName === 'code' &&
        Array.isArray(code.properties.className) &&
        code.properties.className.includes('language-spoiler')
      ) {
        const markdown = code.children
          .flatMap((child) => (child.type === 'text' ? [child.value] : []))
          .join('');
        return (
          <details className={styles.spoilerBlock}>
            <summary>{t('revealLabel')}</summary>
            <MarkdownPost document={{ markdown, assets: document.assets }} slug={slug} />
          </details>
        );
      }
      return <components.pre>{children}</components.pre>;
    },
    { blogContentScrambleExcluded: true },
  );
  return (
    <Markdown
      components={{ ...components, pre: renderPre }}
      remarkPlugins={[remarkGfm]}
      remarkRehypeOptions={{
        clobberPrefix: `${id}-`,
        footnoteLabel: t('annotations'),
        footnoteBackLabel: t('backToAnnotation'),
      }}
      skipHtml
      urlTransform={(value) => {
        if (!/^asset:/i.test(value)) return getSafeMdxHref(value) ?? '';
        const id = value.slice('asset:'.length).toLowerCase();
        if (!Object.hasOwn(document.assets, id)) return '';
        const asset = document.assets[id];
        if (!asset) return '';
        return 'url' in asset
          ? (getSafeMdxHref(asset.url) ?? '')
          : `/api/post-asset/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
      }}
    >
      {document.markdown}
    </Markdown>
  );
}

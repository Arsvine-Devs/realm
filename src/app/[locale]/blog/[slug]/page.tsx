/* eslint-disable react-hooks/error-boundaries -- try/catch only guards external content loading; rendering errors remain handled by route error boundaries. */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import BlogPostPage from '@/features/blog/ui/blog/BlogPostPage';
import MDXComponents from '@/features/blog/ui/mdx/MDXComponents';
import {
  getAllPostsForLocale,
  getAvailablePostContentLocales,
  getBlogPostEntry,
  getPostBySlugAndLocale,
  getPostMetaBySlugAndLocale,
  getProtectedPostPublicMeta,
  normalizeAccess,
} from '@/features/blog/server/blog';
import { loadMessages } from '@/app/i18n/data';
import type { Locale } from '@/app/i18n/config';
import { localizedMetadata } from '@/app/metadata';

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const [entry, metaResult] = await Promise.all([
      getBlogPostEntry(slug),
      getPostMetaBySlugAndLocale(slug, locale),
    ]);
    if (!entry) return {};
    const meta = getProtectedPostPublicMeta(metaResult.meta);
    return localizedMetadata(
      locale,
      `/blog/${slug}`,
      { title: `${meta.title} // Blog`, description: meta.excerpt },
      {
        type: 'article',
        robots: entry.access.mode === 'public' ? undefined : { index: false, follow: false },
      },
    );
  } catch {
    return {};
  }
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!slug) notFound();
  try {
    const entry = await getBlogPostEntry(slug);
    if (!entry || (entry.access.mode === 'totp' && !entry.access.group)) notFound();
    const [metaResult, allPosts, messages, availableContentLocales] = await Promise.all([
      getPostMetaBySlugAndLocale(slug, locale),
      getAllPostsForLocale(locale),
      loadMessages(locale),
      getAvailablePostContentLocales(slug),
    ]);
    const access = normalizeAccess(entry.access);
    if (access.mode !== 'public') {
      return (
        <BlogPostPage
          locale={locale}
          messages={messages}
          meta={getProtectedPostPublicMeta(metaResult.meta)}
          mdxSource={null}
          allPosts={allPosts}
          translationStatus={metaResult.translationStatus}
          actualLocale={metaResult.actualLocale}
          actualContentLocale={metaResult.actualContentLocale}
          availableContentLocales={availableContentLocales}
          contentVariants={{}}
          access={access}
          isProtected
        />
      );
    }
    const post = await getPostBySlugAndLocale(slug, locale);
    const { content: initialBody } = await compileMDX({
      source: post.content,
      components: MDXComponents,
      options: { blockJS: true },
    });
    return (
      <BlogPostPage
        locale={locale}
        messages={messages}
        meta={post.meta}
        mdxSource={null}
        initialBody={initialBody}
        allPosts={allPosts}
        translationStatus={post.translationStatus}
        actualLocale={post.actualLocale}
        actualContentLocale={post.actualContentLocale}
        availableContentLocales={availableContentLocales}
        contentVariants={{}}
        access={access}
        isProtected={false}
      />
    );
  } catch {
    notFound();
  }
}

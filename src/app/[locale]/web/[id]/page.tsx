import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WebDetailPage from '@/features/portfolio/ui/WebDetailPage';
import { getStaticCatalogAssets } from '@/features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '@/features/assets/server/catalog/hydrate-catalog-assets';
import { loadMessages, loadProjects, resolveWebProject } from '@/app/i18n/data';
import { defaultLocale, locales, type Locale } from '@/app/i18n/config';
import { localizedMetadata } from '@/app/metadata';

export const revalidate = 300;
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    loadProjects(defaultLocale).webProjects.map((project) => ({ locale, id: String(project.id) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const resolved = resolveWebProject(Number(id), locale);
  return resolved
    ? localizedMetadata(
        locale,
        `/web/${id}`,
        {
          title: `${resolved.project.title.toUpperCase()} // WORKS`,
          description: resolved.project.title,
        },
        { type: 'article' },
      )
    : {};
}

export default async function WebDetail({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const resolved = resolveWebProject(Number(id), locale);
  if (!resolved) notFound();
  const [messages, catalogAssets] = await Promise.all([
    loadMessages(locale),
    getStaticCatalogAssets(),
  ]);
  const projects = loadProjects(locale);
  return (
    <WebDetailPage
      locale={locale}
      messages={messages}
      project={hydrateCatalogAssets(resolved.project, catalogAssets)}
      webProjects={hydrateCatalogAssets(projects.webProjects, catalogAssets)}
      copyableTokens={projects.copyableTokens}
      translationStatus={resolved.status}
      actualLocale={resolved.actualLocale}
      originLocale={resolved.originLocale}
    />
  );
}

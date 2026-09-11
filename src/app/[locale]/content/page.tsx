import ContentPage from '@/features/navigation/ui/ContentPage';
import { getAllPostsForLocale } from '@/features/blog/server/blog';
import { getStaticCatalogAssets } from '@/features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '@/features/assets/server/catalog/hydrate-catalog-assets';
import { loadExperience, loadLife, loadMessages, loadProjects, loadSkills } from '@/app/i18n/data';
import type { Locale } from '@/app/i18n/config';
import { localizedMetadata } from '@/app/metadata';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  return localizedMetadata(
    locale,
    '/content',
    (messages.pages as Record<string, { title?: string; description?: string }>).content ?? {},
  );
}

export default async function Content({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [messages, blogPosts, catalogAssets] = await Promise.all([
    loadMessages(locale),
    getAllPostsForLocale(locale),
    getStaticCatalogAssets(),
  ]);
  const projects = loadProjects(locale);
  const life = loadLife(locale);
  const experience = loadExperience(locale);
  const skills = loadSkills(locale);
  return (
    <ContentPage
      locale={locale}
      messages={messages}
      blogPosts={blogPosts}
      webProjects={hydrateCatalogAssets(projects.webProjects, catalogAssets)}
      gameProjects={hydrateCatalogAssets(projects.gameProjects, catalogAssets)}
      earlyProjects={hydrateCatalogAssets(projects.earlyProjects, catalogAssets)}
      experienceData={hydrateCatalogAssets(experience.experienceData, catalogAssets)}
      gameData={hydrateCatalogAssets(life.gameData, catalogAssets)}
      travelData={hydrateCatalogAssets(life.travelData, catalogAssets)}
      otherData={hydrateCatalogAssets(life.otherData, catalogAssets)}
      alsoPlayGames={life.alsoPlayGames}
      artPlaceholderText={life.artPlaceholderText}
      skillCategories={skills.skillCategories}
      pageDescription={
        (messages.pages as Record<string, { description?: string }>).content?.description ?? ''
      }
    />
  );
}
import type { Metadata } from 'next';

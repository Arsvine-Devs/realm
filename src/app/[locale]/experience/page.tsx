import { redirect } from 'next/navigation';

export default async function ExperienceRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/content#experience`);
}

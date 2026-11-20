'use client';

import { NextIntlClientProvider } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';

import { getMessages } from '@/app/i18n/client-messages';
import { defaultLocale, getLocaleFromPath, htmlLangMap } from '@/app/i18n/config';
import { AppNavigationRuntime } from '@/features/navigation/model/AppNavigationRuntime';
import AppProviders from './AppProviders';
import AppShell from '../shell/AppShell';

interface LocaleClientProvidersProps {
  children: ReactNode;
  assets: Record<string, string>;
  mediaBase: string;
}

export default function LocaleClientProviders({
  children,
  assets,
  mediaBase,
}: LocaleClientProvidersProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) ?? defaultLocale;
  const messages = getMessages(locale);

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLangMap[locale];
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="Asia/Shanghai"
      messages={messages}
      onError={() => {}}
      getMessageFallback={({ key }) => key}
    >
      <AppNavigationRuntime>
        <AppProviders assets={assets} mediaBase={mediaBase}>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </AppNavigationRuntime>
    </NextIntlClientProvider>
  );
}

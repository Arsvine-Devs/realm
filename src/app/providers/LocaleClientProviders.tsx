'use client';

import { NextIntlClientProvider } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';

import { getMessages } from '@/app/i18n/client-messages';
import { defaultLocale, getLocaleFromPath, htmlLangMap } from '@/app/i18n/config';
import TelemetryRoot from '@/features/telemetry/ui/telemetry/TelemetryRoot';
import { AppNavigationRuntime } from '@/features/navigation/model/AppNavigationRuntime';
import AppProviders from './AppProviders';
import AppShell from '../shell/AppShell';

interface LocaleClientProvidersProps {
  children: ReactNode;
}

export default function LocaleClientProviders({ children }: LocaleClientProvidersProps) {
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
        <AppProviders>
          <AppShell>{children}</AppShell>
          <TelemetryRoot />
        </AppProviders>
      </AppNavigationRuntime>
    </NextIntlClientProvider>
  );
}

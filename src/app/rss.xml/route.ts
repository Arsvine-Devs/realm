import { NextResponse } from 'next/server';
import { defaultLocale } from '@/app/i18n/config';
import { getSiteUrl } from '@/shared/config/site';

export function GET(_request: Request) {
  return NextResponse.redirect(new URL(`/${defaultLocale}/rss.xml`, getSiteUrl()), 308);
}

import { getTweetMonthGroupsPage } from './content';
import { jsonResponse } from '@/shared/server/http';

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export default async function handler(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const offset = parsePositiveInt(searchParams.get('offset'), 0);
    const limit = parsePositiveInt(searchParams.get('limit'), 1);
    const result = await getTweetMonthGroupsPage(offset, limit);
    return jsonResponse(
      {
        ...result,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, no-store, must-revalidate' } },
    );
  } catch (error) {
    console.error('[api/tweets/months] source unavailable:', error);
    return jsonResponse(
      {
        error: 'tweets_source_unavailable',
      },
      { status: 500 },
    );
  }
}

import { healthHeaders, readyJsonResponse } from '@arsvine/service-health';
import { checkCatalogReady } from '@/features/assets/server/catalog/catalog-provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await checkCatalogReady();
    return readyJsonResponse('realm');
  } catch {
    return Response.json(
      { status: 'not_ready', service: 'realm' },
      { status: 503, headers: healthHeaders },
    );
  }
}

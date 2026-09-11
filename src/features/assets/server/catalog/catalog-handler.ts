import { jsonResponse } from '@/shared/server/http';

export async function withAssetCatalogHandler(label: string, operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    console.error(`[api/assets/${label}] failed:`, error);
    return jsonResponse({ error: 'asset_catalog_unavailable' }, { status: 502 });
  }
}

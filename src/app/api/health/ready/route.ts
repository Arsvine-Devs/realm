import { readyJsonResponse } from '@arsvine/service-health';

export function GET() {
  return readyJsonResponse('realm');
}

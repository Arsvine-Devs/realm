import { liveJsonResponse } from '@arsvine/service-health';

export function GET() {
  return liveJsonResponse('realm');
}

export function GET() {
  return Response.json(
    { status: 'live', service: 'realm' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

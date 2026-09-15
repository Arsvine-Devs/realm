export function GET() {
  return Response.json(
    { status: 'ready', service: 'realm' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

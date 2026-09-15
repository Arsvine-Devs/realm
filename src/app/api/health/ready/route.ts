export function GET() {
  const missing = ['CONTENT_BASE_URL'].filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    return Response.json(
      {
        status: 'not_ready',
        service: 'realm',
        reason: `missing_configuration:${missing.join(',')}`,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return Response.json(
    { status: 'ready', service: 'realm' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

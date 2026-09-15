const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const { createServer } = require('http');

async function main() {
  const { loadProjectEnv, readEnv } = await import('./scripts/lib/env-provider.mjs');
  loadProjectEnv({ mode: environment });

  const next = require('next');
  const app = next({ dev: environment !== 'production' });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer(async (req, res) => {
    handle(req, res);
  });

  function gracefulShutdown(signal) {
    console.log(`Received ${signal}, shutting down...`);
    const forceExitTimer = setTimeout(() => process.exit(0), 3000);
    httpServer.close(() => {
      clearTimeout(forceExitTimer);
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

  const port = readEnv('PORT') || 3000;
  httpServer
    .listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    })
    .on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
}

main().catch((error) => {
  console.error(error.stack);
  process.exit(1);
});

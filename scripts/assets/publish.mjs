import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const forceFull = args.has('--force-full');
const rollbackIndex = process.argv.indexOf('--rollback');
const rollbackVersion = rollbackIndex >= 0 ? process.argv[rollbackIndex + 1] : '';
const root = process.cwd();
const coscli =
  process.env.COSCLI_PATH || path.join(root, 'cos-workspace', 'coscli-windows-amd64.exe');

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function redactCliSecrets(message) {
  return message
    .replace(/(-i\s+)\S+/g, '$1[REDACTED]')
    .replace(/(-k\s+)\S+/g, '$1[REDACTED]')
    .replace(/(--token\s+)\S+/g, '$1[REDACTED]');
}

function clientArgs(region) {
  const values = [
    '--init-skip',
    '--disable-log',
    '-e',
    `cos.${region}.myqcloud.com`,
    '-i',
    required('COS_SECRET_ID'),
    '-k',
    required('COS_SECRET_KEY'),
  ];
  if (process.env.COS_SESSION_TOKEN) values.push('--token', process.env.COS_SESSION_TOKEN);
  return values;
}

function compactOutput(value) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 240);
}

function createProgressReporter(label) {
  const buffers = { stderr: '', stdout: '' };
  const captured = { stderr: '', stdout: '' };
  let uploadResults = 0;
  let lastActivity = Date.now();

  const appendCapture = (channel, text) => {
    captured[channel] = `${captured[channel]}${text}`.slice(-1_000_000);
  };

  const reportLine = (channel, rawLine) => {
    const line = redactCliSecrets(rawLine).trim();
    if (!line) return;
    lastActivity = Date.now();
    appendCapture(channel, `${line}\n`);

    const uploadMatch = line.match(/\bUpload\b.*?\s(successed(?:\(skip\))?|failed\b[^,]*)/i);
    if (uploadMatch) {
      uploadResults += 1;
      const wasSkipped = /skip/i.test(uploadMatch[1]);
      if (!wasSkipped || uploadResults === 1 || uploadResults % 50 === 0) {
        console.log(
          `[assets:publish] ${label}: ${uploadResults} upload result(s); ${compactOutput(line)}`,
        );
      }
      return;
    }

    if (channel === 'stderr' || label.includes('verification')) {
      console.log(`[assets:publish] ${label}: ${compactOutput(line)}`);
    }
  };

  const consume = (channel, chunk) => {
    buffers[channel] += chunk.toString();
    const lines = buffers[channel].split(/\r?\n/);
    buffers[channel] = lines.pop() ?? '';
    for (const line of lines) reportLine(channel, line);
  };

  const heartbeat = setInterval(() => {
    const idleSeconds = Math.floor((Date.now() - lastActivity) / 1000);
    console.log(
      `[assets:publish] ${label}: still running; ${uploadResults} upload result(s), ${idleSeconds}s since last output`,
    );
  }, 15_000);

  return {
    consume,
    finish() {
      for (const channel of ['stdout', 'stderr']) {
        if (buffers[channel]) reportLine(channel, buffers[channel]);
      }
      clearInterval(heartbeat);
    },
    output() {
      return captured;
    },
  };
}

function runCoscli(commandArgs, label) {
  return new Promise((resolve, reject) => {
    const reporter = createProgressReporter(label);
    const child = spawn(coscli, commandArgs, {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => reporter.consume('stdout', chunk));
    child.stderr.on('data', (chunk) => reporter.consume('stderr', chunk));
    child.once('error', (error) => {
      reporter.finish();
      reject(error);
    });
    child.once('close', (code, signal) => {
      reporter.finish();
      const output = reporter.output();
      if (code === 0) {
        resolve(output);
        return;
      }
      const details = compactOutput(
        output.stderr || output.stdout || `signal ${signal ?? 'unknown'}`,
      );
      reject(new Error(`${label} exited with code ${code ?? 'unknown'}: ${details}`));
    });
  });
}

async function cos(region, commandArgs, label = commandArgs[0]) {
  const printable = redactCliSecrets([path.basename(coscli), ...commandArgs].join(' '));
  if (dryRun) {
    console.log(`[assets:publish] dry-run ${label}: ${printable}`);
    return;
  }
  console.log(`[assets:publish] ${label}: started`);
  const result = await runCoscli([...clientArgs(region), ...commandArgs], label);
  console.log(`[assets:publish] ${label}: completed`);
  return result;
}

export function assertRemoteObjectListed(result, bucket, objectKey) {
  const stdout = typeof result?.stdout === 'string' ? result.stdout : String(result?.stdout ?? '');
  if (stdout.includes(objectKey) || stdout.includes(path.posix.basename(objectKey))) return;
  throw new Error(`[assets:publish] verification failed: missing cos://${bucket}/${objectKey}`);
}

async function revalidate(releaseId) {
  if (dryRun) {
    console.log('[assets:publish] dry-run POST /api/internal/revalidate');
    return;
  }
  const timestamp = String(Date.now());
  const body = JSON.stringify({
    event: 'assets.published',
    releaseId,
    resources: ['assets'],
    timestamp: new Date(Number(timestamp)).toISOString(),
  });
  const secret = required('REVALIDATE_WEBHOOK_SECRET');
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const response = await fetch(
    `${required('NEXT_PUBLIC_SITE_URL').replace(/\/$/, '')}/api/internal/revalidate`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-arsvine-timestamp': timestamp,
        'x-arsvine-signature': signature,
      },
      body,
    },
  );
  let responseBody = {};
  try {
    responseBody = await response.json();
  } catch {
    /* responseBody stays empty */
  }
  if (
    response.ok &&
    responseBody.revalidated === true &&
    (!responseBody.failed || responseBody.failed.length === 0)
  )
    return;
  if (response.ok && responseBody.failed && responseBody.failed.length > 0) {
    console.warn(
      `[assets:publish] revalidation partial: ${responseBody.failed.length} path(s) failed`,
      responseBody.failed,
    );
    return;
  }
  const retryAfter = response.headers.get('retry-after');
  const message = typeof responseBody.message === 'string' ? `: ${responseBody.message}` : '';
  const retryHint = retryAfter ? `; retry after ${retryAfter}s` : '';
  throw new Error(
    `Asset revalidation failed with HTTP ${response.status}${message}${retryHint}${responseBody.failed ? ` (failed: ${responseBody.failed.join(', ')})` : ''}`,
  );
}

async function writePointer(version) {
  if (!/^\d{8}T\d{6}Z$/.test(version)) throw new Error(`Invalid catalog version: ${version}`);
  const temp = await mkdtemp(path.join(os.tmpdir(), 'arsvine-pointer-'));
  try {
    const pointer = path.join(temp, 'current.json');
    await writeFile(pointer, `${JSON.stringify({ version }, null, 2)}\n`);
    const publicBucket = required('COS_PUBLIC_BUCKET');
    const privateBucket = required('COS_PRIVATE_BUCKET');
    await cos(
      required('COS_PUBLIC_REGION'),
      [
        'cp',
        pointer,
        `cos://${publicBucket}/realm/site-catalog/current.json`,
        '--meta',
        'Cache-Control:no-cache,max-age=0,must-revalidate',
      ],
      'public pointer',
    );
    await cos(
      required('COS_PRIVATE_REGION'),
      [
        'cp',
        pointer,
        `cos://${privateBucket}/realm/catalog/current.json`,
        '--meta',
        'Cache-Control:no-store',
      ],
      'private pointer',
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

async function main() {
  if (rollbackVersion) {
    await writePointer(rollbackVersion);
    await revalidate(rollbackVersion);
    console.log(`[assets:publish] rolled back to ${rollbackVersion}`);
    return;
  }

  const manifest = JSON.parse(
    await readFile(path.join(root, 'dist', 'local-manifest', 'manifest.generated.json'), 'utf-8'),
  );
  const version = manifest.version;
  if (!/^\d{8}T\d{6}Z$/.test(version)) throw new Error('Generated manifest has an invalid version');
  const publicBucket = required('COS_PUBLIC_BUCKET');
  const privateBucket = required('COS_PRIVATE_BUCKET');
  const publicRegion = required('COS_PUBLIC_REGION');
  const privateRegion = required('COS_PRIVATE_REGION');

  const uploadCmd = forceFull ? 'cp' : 'sync';
  const uploadFlags = forceFull
    ? ['-r']
    : ['-r', '--exclude', 'current.json', '--exclude', 'current.next.json'];
  await cos(
    publicRegion,
    [
      uploadCmd,
      path.join(root, 'dist', 'cos-upload', 'public-root') + path.sep,
      `cos://${publicBucket}/`,
      ...uploadFlags,
    ],
    'public sync',
  );
  await cos(
    privateRegion,
    [
      uploadCmd,
      path.join(root, 'dist', 'cos-upload', 'private-root') + path.sep,
      `cos://${privateBucket}/`,
      ...uploadFlags,
    ],
    'private sync',
  );
  const publicAssetKey = `realm/site-catalog/versions/${version}/assets.json`;
  const privateAssetKey = `realm/catalog/versions/${version}/static-assets.json`;
  const publicListing = await cos(
    publicRegion,
    ['ls', `cos://${publicBucket}/${publicAssetKey}`],
    'public catalog verification',
  );
  const privateListing = await cos(
    privateRegion,
    ['ls', `cos://${privateBucket}/${privateAssetKey}`],
    'private catalog verification',
  );
  if (!dryRun) {
    assertRemoteObjectListed(publicListing, publicBucket, publicAssetKey);
    assertRemoteObjectListed(privateListing, privateBucket, privateAssetKey);
  }
  await writePointer(version);
  await revalidate(version);
  console.log(`[assets:publish] ${dryRun ? 'dry-run complete for' : 'published'} ${version}`);
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(
      '[assets:publish] FAILED:',
      redactCliSecrets(error instanceof Error ? error.message : String(error)),
    );
    process.exit(1);
  });
}

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_LOCAL_PATH = path.join(process.cwd(), '.env.local');
const DEFAULT_EXAMPLE_PATH = path.join(process.cwd(), '.env.example');

const SECTIONS = [
  {
    id: 'core',
    title: 'Core',
    entries: [
      {
        key: 'PORT',
        localDefault: '3000',
        exampleValue: '3000',
        comments: ['Server port (default: 3000).'],
      },
      {
        key: 'NEXT_PUBLIC_SITE_URL',
        localDefault: 'https://arsvine.com',
        exampleValue: 'https://arsvine.com',
        comments: [
          'Canonical site URL used by sitemap, RSS, robots, Open Graph, and canonical tags.',
        ],
      },
    ],
  },
  {
    id: 'public',
    title: 'Public',
    entries: [
      {
        key: 'NEXT_PUBLIC_TELEMETRY_PROVIDER',
        localDefault: '""',
        exampleValue: 'vercel',
        commentOutInExample: true,
        comments: [
          'Optional telemetry provider. Supported value: vercel. Unset disables telemetry.',
        ],
      },
      {
        key: 'NEXT_PUBLIC_CDN_BASE',
        localDefault: 'https://cdn.arsvine.com',
        exampleValue: 'https://cdn.arsvine.com',
        comments: ['Public CDN base for `realm/...` and `shared/...` assets.'],
      },
    ],
  },
  {
    id: 'content',
    title: 'Content',
    entries: [
      {
        key: 'GITHUB_OWNER',
        localDefault: '',
        exampleValue: 'ArsvineZhu',
        commentOutInExample: true,
        comments: ['Private content repository owner.'],
      },
      {
        key: 'GITHUB_REPO',
        localDefault: '',
        exampleValue: 'arsvine-content',
        commentOutInExample: true,
        comments: ['Private content repository name.'],
      },
      {
        key: 'GITHUB_BRANCH',
        localDefault: 'main',
        exampleValue: 'main',
        commentOutInExample: true,
        comments: ['Content repository branch.'],
      },
      {
        key: 'GITHUB_READ_TOKEN',
        localDefault: '',
        exampleValue: 'github_pat_xxx',
        commentOutInExample: true,
        comments: ['Server-side GitHub token for private content reads.'],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    entries: [
      {
        key: 'ACCESS_GRANT_SECRET',
        localDefault: '',
        exampleValue: 'replace-with-a-random-long-string',
        commentOutInExample: true,
        comments: ['Server-side signing secret for protected post access grants.'],
      },
      {
        key: 'TOTP_GROUPS_JSON',
        localDefault: '',
        exampleValue:
          '{"friends-a":{"current":"JBSWY3DPEHPK3PXP","period":30,"digits":6,"window":1}}',
        commentOutInExample: true,
        comments: ['Server-side TOTP groups JSON map.'],
      },
      {
        key: 'REVALIDATE_SECRET',
        localDefault: '',
        exampleValue: 'replace-with-a-random-long-string',
        commentOutInExample: true,
        comments: ['Secret for ISR revalidation endpoints.'],
      },
      {
        key: 'TRUST_PROXY',
        localDefault: '""',
        exampleValue: '1',
        commentOutInExample: true,
        comments: [
          'Trust forwarded client IP headers for rate-limited APIs behind a trusted self-hosted proxy. Vercel is detected automatically.',
        ],
      },
    ],
  },
  {
    id: 'infra',
    title: 'Infra',
    entries: [
      {
        key: 'UPSTASH_REDIS_REST_URL',
        localDefault: '""',
        exampleValue: 'https://xxx.upstash.io',
        commentOutInExample: true,
        comments: ['Optional Upstash Redis REST URL for distributed rate limiting.'],
      },
      {
        key: 'UPSTASH_REDIS_REST_TOKEN',
        localDefault: '""',
        exampleValue: 'your-token',
        commentOutInExample: true,
        comments: ['Optional Upstash Redis REST token for distributed rate limiting.'],
      },
      {
        key: 'COS_PRIVATE_BUCKET',
        localDefault: '',
        exampleValue: 'your-private-bucket',
        commentOutInExample: true,
        comments: ['Private COS bucket for versioned asset catalogs.'],
      },
      {
        key: 'COS_PRIVATE_REGION',
        localDefault: '',
        exampleValue: 'ap-hongkong',
        commentOutInExample: true,
        comments: ['Private COS bucket region.'],
      },
      {
        key: 'COS_PUBLIC_BUCKET',
        localDefault: '',
        exampleValue: 'your-public-bucket',
        commentOutInExample: true,
        comments: ['Public COS bucket for site assets and the public catalog pointer.'],
      },
      {
        key: 'COS_PUBLIC_REGION',
        localDefault: '',
        exampleValue: 'ap-hongkong',
        commentOutInExample: true,
        comments: ['Public COS bucket region.'],
      },
      {
        key: 'COS_SECRET_ID',
        localDefault: '',
        exampleValue: 'AKIDxxx',
        commentOutInExample: true,
        comments: ['Server-side COS SecretId.'],
      },
      {
        key: 'COS_SECRET_KEY',
        localDefault: '',
        exampleValue: 'xxxx',
        commentOutInExample: true,
        comments: ['Server-side COS SecretKey.'],
      },
      {
        key: 'COS_PRIVATE_CATALOG_PREFIX',
        localDefault: '',
        exampleValue: '',
        commentOutInExample: true,
        comments: ['Optional prefix inside the private COS bucket before `realm/catalog/...`.'],
      },
    ],
  },
  {
    id: 'tweets-dev',
    title: 'Tweets Dev',
    entries: [
      {
        key: 'TWEETS_STRESS_TEST',
        localDefault: '""',
        exampleValue: '1',
        commentOutInExample: true,
        comments: ['Enable synthetic tweet archive data in development.'],
      },
      {
        key: 'TWEETS_STRESS_YEARS',
        localDefault: '""',
        exampleValue: '6',
        commentOutInExample: true,
        comments: ['Synthetic tweet archive: number of years.'],
      },
      {
        key: 'TWEETS_STRESS_MONTHS_PER_YEAR',
        localDefault: '""',
        exampleValue: '12',
        commentOutInExample: true,
        comments: ['Synthetic tweet archive: months per year.'],
      },
      {
        key: 'TWEETS_STRESS_TWEETS_PER_MONTH',
        localDefault: '""',
        exampleValue: '24',
        commentOutInExample: true,
        comments: ['Synthetic tweet archive: tweets per month.'],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    entries: [
      {
        key: 'ANALYZE',
        localDefault: '',
        exampleValue: 'true',
        commentOutInExample: true,
        comments: ['Enable `@next/bundle-analyzer` when set to `true`.'],
      },
      {
        key: 'NEXT_BUILD_DIR',
        localDefault: '',
        exampleValue: '.next',
        commentOutInExample: true,
        comments: ['Optional custom Next.js build output directory.'],
      },
    ],
  },
];

const ALLOWED_KEYS = new Set(
  SECTIONS.flatMap((section) => section.entries.map((entry) => entry.key)),
);

function parseArgs(argv) {
  const options = {
    localPath: DEFAULT_LOCAL_PATH,
    examplePath: DEFAULT_EXAMPLE_PATH,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--local') {
      options.localPath = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--example') {
      options.examplePath = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

async function safeRead(filePath) {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function parseEnv(content) {
  const values = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    values.set(key, value);
  }
  return values;
}

function renderSectionHeader(title) {
  return [`# ${title}`];
}

function renderComments(comments) {
  return comments.map((comment) => `# ${comment}`);
}

function renderExampleFile() {
  const lines = [];
  for (const section of SECTIONS) {
    if (lines.length > 0) {
      lines.push('');
    }

    lines.push(...renderSectionHeader(section.title));
    for (const entry of section.entries) {
      lines.push(...renderComments(entry.comments));
      const value = entry.exampleValue ?? entry.localDefault ?? '';
      const line = `${entry.key}=${value}`;
      lines.push(entry.commentOutInExample ? `# ${line}` : line);
    }
  }

  return `${lines.join('\n')}\n`;
}

function renderLocalFile(currentValues) {
  const managedKeys = new Set();
  const lines = [];
  for (const section of SECTIONS) {
    if (lines.length > 0) {
      lines.push('');
    }

    lines.push(...renderSectionHeader(section.title));
    for (const entry of section.entries) {
      managedKeys.add(entry.key);
      const value = currentValues.has(entry.key)
        ? currentValues.get(entry.key)
        : entry.localDefault;
      lines.push(`${entry.key}=${value ?? ''}`);
    }
  }

  // 保留 .env.local 中不在注册表的未知键（开发者临时调试 env），避免静默清除
  const unmanagedKeys = [...currentValues.keys()].filter((key) => !managedKeys.has(key)).sort();
  if (unmanagedKeys.length > 0) {
    lines.push('');
    lines.push('# (unmanaged) keys below are not in the env registry; kept as-is');
    for (const key of unmanagedKeys) {
      lines.push(`${key}=${currentValues.get(key)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function collectSummary(currentValues) {
  const currentKeys = new Set(currentValues.keys());
  const kept = [];
  const added = [];

  for (const section of SECTIONS) {
    for (const entry of section.entries) {
      if (currentKeys.has(entry.key)) {
        kept.push(entry.key);
      } else {
        added.push(entry.key);
      }
    }
  }

  const removed = [...currentKeys].filter((key) => !ALLOWED_KEYS.has(key)).sort();
  return { kept, added, removed };
}

function printSummary(summary) {
  const render = (label, keys) => `${label}: ${keys.length ? keys.join(', ') : '(none)'}`;
  console.log(render('unmanaged keys (kept)', summary.removed));
  console.log(render('added keys', summary.added));
  console.log(render('kept keys', summary.kept));
}

async function main() {
  const options = parseArgs(process.argv);
  const localContent = await safeRead(options.localPath);
  const currentValues = parseEnv(localContent);
  const summary = collectSummary(currentValues);

  await writeFile(options.examplePath, renderExampleFile(), 'utf-8');
  await writeFile(options.localPath, renderLocalFile(currentValues), 'utf-8');

  printSummary(summary);
}

main().catch((error) => {
  console.error('[env:sync] FAILED:', error);
  process.exit(1);
});

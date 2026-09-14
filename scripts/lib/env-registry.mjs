export const SECTIONS = [
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
        key: 'CONTENT_BASE_URL',
        localDefault: 'https://content.arsvine.com',
        exampleValue: 'https://content.arsvine.com',
        comments: ['Published Content service base URL.'],
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
      {
        key: 'VISITOR_STATS_SECRET',
        localDefault: '',
        exampleValue: 'replace-with-a-random-long-string',
        commentOutInExample: true,
        comments: ['Server-side signing and HMAC secret for visitor statistics.'],
      },
    ],
  },
  {
    id: 'infra',
    title: 'Infra',
    entries: [
      {
        key: 'DATABASE_URL',
        localDefault: '',
        exampleValue: 'postgresql://user:password@host/database?sslmode=require',
        commentOutInExample: true,
        comments: ['Neon Postgres connection string for durable visitor statistics.'],
      },
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

export const ALLOWED_KEYS = new Set(
  SECTIONS.flatMap((section) => section.entries.map((entry) => entry.key)),
);

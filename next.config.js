const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/app/i18n/request.ts');

// 远程图床白名单集中在 config/image-hosts.js 维护，新增/删除域名只改那一处
const remotePatterns = require('./config/image-hosts');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: true,
  output: 'standalone',
  experimental: { isrFlushToDisk: false },
  cacheMaxMemorySize: 16 * 1024 * 1024,
  images: {
    remotePatterns,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));

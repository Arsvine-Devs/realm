import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.test.ts'],
          exclude: [
            '**/*.browser.test.ts',
            '**/node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/cos-workspace/**',
            '**/.agents/**',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['**/*.test.tsx', '**/*.browser.test.ts'],
          exclude: [
            '**/node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/cos-workspace/**',
            '**/.agents/**',
          ],
        },
      },
    ],
  },
});

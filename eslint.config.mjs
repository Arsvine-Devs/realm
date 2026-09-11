import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import oxlint from 'eslint-plugin-oxlint';

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    settings: {
      react: {
        version: '19.2',
      },
    },
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/app/**',
                '@/features/**',
                '@/pages/**',
                '**/app/**',
                '**/features/**',
                '**/pages/**',
              ],
              message: 'shared is a leaf layer and must not depend on app, pages, or a feature.',
            },
          ],
        },
      ],
    },
  },
];

// Keep ESLint as the compatibility layer for rules not enabled in Oxlint.
const compatibilityConfig = [
  ...eslintConfig,
  ...oxlint.buildFromOxlintConfigFile('./config/oxlint.json'),
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
];
export default compatibilityConfig;

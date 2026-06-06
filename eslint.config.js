import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'node_modules',
      'supabase/functions/**', // Deno runtime — linted separately if needed
      'coverage',
      'playwright-report',
      'test-results',
      'scripts/**', // node build tooling (.mjs)
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', mode: 'folder' },
        { type: 'kernel', pattern: 'src/kernel', mode: 'folder' },
        {
          type: 'feature',
          pattern: 'src/features/*',
          mode: 'folder',
          capture: ['feature'],
        },
        { type: 'root', pattern: 'src/*', mode: 'file' },
      ],
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // ---- Architectural isolation (the load-bearing rules) ----
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message:
            '${file.type} is not allowed to import ${dependency.type} — keep features isolated (see docs/architecture.md).',
          rules: [
            { from: 'kernel', allow: ['kernel'] },
            {
              from: 'feature',
              allow: ['kernel', ['feature', { feature: '${from.feature}' }]],
            },
            { from: 'app', allow: ['kernel', 'feature', 'app'] },
            { from: 'root', allow: ['kernel', 'feature', 'app', 'root'] },
          ],
        },
      ],
    },
  },
  // Tests may be looser.
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'vitest.setup.ts'],
    rules: {
      'boundaries/element-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier
);

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores(['dist']),
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node builtin
            ['^node:'],

            // React
            ['^react'],

            // Vite
            ['^vite'],

            // External packages
            ['^@?\\w'],

            // Internal alias
            ['^@/assets'],
            ['^@/components'],
            ['^@/configs'],
            ['^@/context'],
            ['^@/hooks'],
            ['^@/integrations'],
            ['^@/layouts'],
            ['^@/lib'],
            ['^@/features'],
            ['^@/navigation'],
            ['^@/utils'],
            ['^@/queries'],
            ['^@/types'],

            // Parent
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

            // Same folder
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],

            // Style
            ['^.+\\.?(css|scss)$'],
          ],
        },
      ],

      'simple-import-sort/exports': 'error',

      // Import
      // 'import/no-extraneous-dependencies': [
      //   'error',
      //   {
      //     devDependencies: ['vite.config.*', '**/*.config.*', '**/scripts/**', '**/*.test.*', '.storybook/*.*'],
      //   },
      // ],

      // Function component style
      // 'react/function-component-definition': [
      //   'error',
      //   {
      //     namedComponents: 'arrow-function',
      //     unnamedComponents: 'arrow-function',
      //   },
      // ],

      'react-hooks/incompatible-library': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  prettier,
]);

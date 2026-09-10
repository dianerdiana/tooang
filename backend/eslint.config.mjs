// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'src/prisma'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node builtin
            ['^node:'],

            // NestJS
            ['^@nestjs'],

            // External packages
            ['^@?\\w'],

            // Internal alias
            ['^@/generated'],
            ['^@/common'],
            ['^@/config'],
            ['^@/modules'],

            ['^./generated'],
            ['^./common'],
            ['^./configs'],
            ['^./modules'],

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

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'max-len': [
        'error',
        {
          code: 100,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
    },
  },
);

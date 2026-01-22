import js from '@eslint/js';
import ts from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '*.config.*'],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    extends: [
      js.configs.recommended,
      ...ts.configs.strictTypeChecked,
      ...ts.configs.stylisticTypeChecked,
      stylistic.configs['disable-legacy'],
      stylistic.configs.customize({
        arrowParens: true,
        braceStyle: '1tbs',
        flat: true,
        jsx: false,
        quotes: 'single',
        quoteProps: 'as-needed',
        semi: true,
      }),
    ],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        sourceType: 'module',
        projectService: true,
      },
      globals: globals.browser,
    },
    rules: {
      '@stylistic/max-len': ['warn', {
        code: 100,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreComments: true,
      }],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'semi',
          requireLast: true,
        },

        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
      }],
      '@stylistic/semi': ['error', 'always', {
        omitLastInOneLineBlock: true,
      }],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      '@typescript-eslint/no-floating-promises': 'warn',
      "@typescript-eslint/no-unnecessary-condition": "off",
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
      }],
      "default-case": "warn",
      'no-plusplus': 'off',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
]);

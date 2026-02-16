import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'eslint/config'

import baseConfig from '@skills-mastra-workflow/eslint-config/base.js'

export default defineConfig([
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        parser: await import('@typescript-eslint/parser'),
        project: './tsconfig.json'
      }
    }
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**']
  }
])

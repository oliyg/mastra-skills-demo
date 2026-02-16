import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'

import baseConfig from '@skills-mastra-workflow/eslint-config/base.js'

export default defineConfig([
  ...baseConfig,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    languageOptions: {
      parserOptions: {
        parser: await import('@typescript-eslint/parser'),
        extraFileExtensions: ['.vue'],
        sourceType: 'module'
      }
    }
  },
  {
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**']
  }
])

import { defineConfig } from 'oxfmt'

export default defineConfig({
  singleQuote: true,
  semi: false,
  printWidth: 120,
  ignorePatterns: [
    'bun.lock',
    '**/dist/**',
    '**/.alchemy/**',
    '**/.wrangler/**',
    '**/migrations/**',
    'docs/**',
    'template/src/lib/comments.js',
    'references/**',
    'template/pages/**',
  ],
})

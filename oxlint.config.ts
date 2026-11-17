import { defineConfig } from 'oxlint'

/**
 * The bar the template is written to, so a copy lands green in a strict host: type-aware rules, no floating promises
 * (`void` included), no console outside scripts, and bounded files, functions and complexity.
 */
export default defineConfig({
  ignorePatterns: [
    '**/dist/**',
    '**/.alchemy/**',
    '**/.wrangler/**',
    '**/migrations/**',
    'references/**',
    // Built from template/client by `bun run build:client`, and the small hand-written page script beside it.
    'template/src/lib/*.js',
    // Drafts an agent publishes; only `_template` is tracked.
    'template/pages/**',
  ],
  options: { typeAware: true, reportUnusedDisableDirectives: 'error' },
  categories: { correctness: 'error', suspicious: 'error' },
  plugins: ['typescript', 'unicorn', 'oxc', 'import', 'promise', 'vitest'],
  jsPlugins: ['oxlint-plugin-complexity'],
  env: { es2024: true },
  rules: {
    'import/no-cycle': 'error',
    'typescript/no-explicit-any': 'error',
    'typescript/no-non-null-assertion': 'error',
    'typescript/no-floating-promises': ['error', { ignoreVoid: false }],
    'typescript/no-misused-promises': 'error',
    'typescript/switch-exhaustiveness-check': 'error',
    'typescript/only-throw-error': 'error',
    'typescript/no-unsafe-type-assertion': 'off',
    'typescript/consistent-return': 'off',
    'typescript/no-unsafe-argument': 'error',
    'typescript/no-unsafe-assignment': 'error',
    'typescript/no-unsafe-call': 'error',
    'typescript/no-unsafe-member-access': 'error',
    'typescript/no-unsafe-return': 'error',
    'no-console': 'error',
    'no-empty': 'error',
    'no-unused-vars': [
      'error',
      { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    'max-depth': ['error', 4],
    'complexity/complexity': ['error', { cyclomatic: 20, cognitive: 15 }],
  },
  overrides: [
    { files: ['template/scripts/**', 'tools/**', 'examples/*/deploy.ts'], rules: { 'no-console': 'off' } },
    { files: ['**/*.test.ts'], rules: { 'max-lines-per-function': 'off' } },
  ],
})

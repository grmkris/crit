import type { KnipConfig } from 'knip'

export default {
  workspaces: {
    '.': {
      entry: ['*.config.ts', 'tools/*.ts'],
      // effect-tsrs embeds the plugin tsconfig names, and tsrs ships the lint backend: tools/ runs both by path.
      ignoreDependencies: ['@effect/language-service', '@yielded/effect-tsrs', 'tsrs'],
    },
    'examples/demo': { entry: ['alchemy.run.ts'] },
    // The recipe a project copies: the stack file, the Worker, the page script, the scripts and the tests are entries.
    template: {
      entry: ['alchemy.run.ts', 'src/Worker.ts', 'client/comments.ts', 'scripts/*.ts', 'test/**/*.test.ts'],
      project: ['*.ts', 'src/**/*.ts', 'client/**/*.ts', 'scripts/**/*.ts', 'test/**/*.ts'],
      ignoreDependencies: ['@effect/language-service'],
    },
  },
} satisfies KnipConfig

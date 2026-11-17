/**
 * Where the demo's secrets are: the mode-600 file `CRIT_DEMO_ENV` names (an absolute path, or `~/…`), or
 * `.local/demo.env` in this folder, which Git ignores.
 */
import { fileURLToPath } from 'node:url'

export const demoEnv: string =
  process.env['CRIT_DEMO_ENV'] ?? fileURLToPath(new URL('.local/demo.env', import.meta.url))

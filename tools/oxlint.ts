/**
 * Runs oxlint with its type-aware rules backed by `tsrs-lint`, the binary the pinned `tsrs` package ships. A missing
 * binary fails the run: nothing falls back to another backend.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = path.join(import.meta.dir, '..')
const tsrsLint = path.join(root, 'node_modules', '.bin', 'tsrs-lint')
if (!existsSync(tsrsLint)) throw new Error(`tsrs-lint: ${tsrsLint} is missing; run bun install`)
const { TSRS_FAST: _fast, ...env } = process.env
const child = Bun.spawn([path.join(root, 'node_modules', '.bin', 'oxlint'), ...Bun.argv.slice(2)], {
  cwd: root,
  env: { ...env, OXLINT_TSGOLINT_PATH: tsrsLint },
  stdio: ['inherit', 'inherit', 'inherit'],
})
process.exit(await child.exited)

/**
 * Plans, then deploys the demo (alchemy.run.ts). The account, the publish token and, when it is there, the Cloudflare
 * API token come from the demo's mode-600 secrets file (env.ts); without one in the file, the shell's API token is
 * used.
 *
 *   bun run deploy          plan, then deploy
 *   bun run deploy --plan   plan only
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { readSecrets } from '../../template/scripts/secrets.ts'
import { demoEnv } from './env.ts'

const secrets = readSecrets(demoEnv)
const account = secrets.get('CLOUDFLARE_ACCOUNT_ID') ?? ''
const publishToken = secrets.get('CRIT_PUBLISH_TOKEN') ?? ''
if (account === '' || publishToken === '') {
  throw new Error(`Set CLOUDFLARE_ACCOUNT_ID and CRIT_PUBLISH_TOKEN in ${demoEnv}`)
}
const apiToken = secrets.get('CLOUDFLARE_API_TOKEN')

const env = {
  ...process.env,
  ...(apiToken === undefined ? {} : { CLOUDFLARE_API_TOKEN: apiToken }),
  CLOUDFLARE_ACCOUNT_ID: account,
  CRIT_PUBLISH_TOKEN: publishToken,
  ALCHEMY_PLAIN: '1',
}
const alchemy = join(dirname(Bun.resolveSync('alchemy/package.json', import.meta.dir)), 'bin', 'alchemy.js')

const run = (action: 'plan' | 'deploy') => {
  const args = [alchemy, action, 'alchemy.run.ts', '--stage', 'prod', '--no-input']
  const result = spawnSync('bun', action === 'deploy' ? [...args, '--yes'] : args, {
    cwd: import.meta.dir,
    stdio: 'inherit',
    env,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('plan')
if (!process.argv.includes('--plan')) run('deploy')

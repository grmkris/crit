/**
 * crit's own demo: the template deployed as it is, on workers.dev, with a state store of its own. No team side
 * (`access.kind` is `none`): public pages, share links, guests' comments, the agents' API and `/mcp`.
 *
 * To run it: put `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `CRIT_PUBLISH_TOKEN` (32 characters or more) in
 * a mode-600 file, `.local/demo.env` in this folder or the file `CRIT_DEMO_ENV` names (env.ts), then `bun run deploy`
 * here. It prints the Worker's address. The API token may come from the shell instead; its rights are in the
 * repository's README.
 */
import * as Cloudflare from '@alchemy.run/cloudflare'
import * as Alchemy from 'alchemy'
import type { SiteConfig } from '../../template/crit.config.ts'
import { resources } from '../../template/stack.ts'
import { demoEnv } from './env.ts'

const site: SiteConfig = {
  name: 'crit-demo',
  title: 'crit demo',
  lead: 'Pages published from the crit repository, to try the recipe.',
  account: process.env['CLOUDFLARE_ACCOUNT_ID'] ?? '',
  domain: undefined,
  access: { kind: 'none' },
  publicPages: true,
  // A visitor may comment, after typing a name.
  outsiders: 'comment',
  expiryDays: 0,
  linkDays: 0,
  names: {},
  // One file holds both: deploy.ts reads the account pair from it, the template's scripts the publish token.
  credentials: demoEnv,
  publishEnv: demoEnv,
}

export default Alchemy.Stack(
  site.name,
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state({ workerName: `${site.name}-state`, accountId: site.account }),
  },
  resources(site),
)

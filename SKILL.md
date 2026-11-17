---
name: crit
description: Add crit to a project - one address on the project's own Cloudflare account where agents publish pages (research, spikes, plans, mockups, with images and video) in about a second, the team opens them signed in by an emailed code, a page can be made public or shared by a link, people comment on any element, and agents read the comments and answer. Use when asked to add crit, a team site, a review site, a scratch site, or a way to share and review agent work in a project.
---

# Add crit to a project

crit is a folder a project copies and then owns. It deploys one small Worker on one address, with one D1 database and
one R2 bucket:

- **the team's side**, at `/` and `/<page>/`: the index and every page, private by default. The team signs in with a
  code Cloudflare mails them; nobody needs a Cloudflare account.
- **public pages**, at `/p/<page>/`: a page someone opened to everyone. Off unless the config allows it.
- **share links**, at `/s/<token>/<page>/`: one page, for whoever has the link.
- **the agents' API and `/mcp`**, behind the project's publish token.

Pages are published by upload, never by deploy. There is no package to install or upgrade: copy `template/`, fill in
one config file, deploy once.

## Before you start

The project needs:

- a Cloudflare account you can deploy to, and Bun;
- Alchemy v2 and Effect 4 (the template pins `alchemy` 2.0.0-beta.85 and `effect` 4.1.2; use the project's own
  pins if it has them).

Ask the owner four things:

1. **Which mode** (below), and for a domain the host name.
2. **Who is on the team**, by email.
3. **Whether pages may be made public** (`publicPages`). The default is no.
4. **What a visitor may do** on a public page or by a share link (`outsiders`): read public pages only, also read
   the comments, or also comment.

## Choose the mode

| Mode                   | Config                                                                      | What you get                                                         | Needs                                             |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| Domain and Access      | `domain` set, `access.kind: 'cloudflare'`                                   | `team.<domain>`: private pages behind an emailed code, plus the rest | A zone in the account; Zero Trust; token rights   |
| workers.dev and Access | `domain: undefined`, `access.kind: 'cloudflare'` with `workersDevSubdomain` | The same on the Worker's workers.dev name                            | Zero Trust; token rights                          |
| No team side           | `access.kind: 'none'`                                                       | Public pages, share links, the API and `/mcp`; no index, no sign-in  | Nothing more. Works on workers.dev with no domain |

The host sits one level below the zone (`team.example.com`), so Cloudflare's free certificate covers it.

**What has run on Cloudflare:** "domain and Access" (a real deployment on a custom domain) and "no team side" (on
workers.dev). "workers.dev and Access" is built and tested locally, with the test standing in for Cloudflare Access,
and has not yet run on Cloudflare: read back step 7 carefully if you choose it.

## Steps

1. **Copy `template/` into the project**, as `apps/crit/` in a workspace repository, or `crit/` otherwise. Copy the
   tracked files only, so no build output or draft page comes along:

   ```sh
   mkdir -p apps/crit && git -C <path to crit> archive HEAD:template | tar -x -C apps/crit
   ```

   In a Bun workspace, change `package.json`'s name to the project's scope and its versions to `catalog:` where the
   project pins the same packages (keep exact pins for the rest, such as `pele`).

2. **For a mode with Access, prepare the account first:**
   - The account has a Zero Trust organization, with the **One-time PIN** login method turned on. Note its team
     name: the config's `access.team` is `https://<team name>.cloudflareaccess.com`. Zero Trust is free for up to 50
     people. Where the account has none yet, the owner turns it on in the dashboard, or over the API:
     `POST /accounts/<account id>/access/organizations` with `{ "name": "<team name>", "auth_domain": "<team name>.cloudflareaccess.com" }`,
     then `POST /accounts/<account id>/access/identity_providers` with
     `{ "name": "Email code", "type": "onetimepin", "config": {} }`. Both change the account's sign-in set-up, so
     ask the owner first.
   - The deploy token has, on the account, **Access: Apps and Policies Write** and **Access: Organizations, Identity
     Providers, and Groups Read**, as well as Workers Scripts Write, D1 Write, Workers R2 Storage Write and **Secrets
     Store Write** (crit's own state store keeps its key there), and for a domain, on the zone, Workers Routes Write,
     DNS Write and Zone Read. Give crit a token of its own: the product's deploy token should not hold the Access
     rights. Without Access, the four Workers, D1, R2 and Secrets Store rights are the whole list. R2 must be turned
     on for the account.

   The stack declares two Access applications on the host: `Team` (the listed emails, by emailed code) and `Open`
   (a bypass for `/p/*`, `/s/*`, `/api/*`, `/mcp` and `/lib/*`). They are made before the Worker. The stack looks
   the One-time PIN method up; it never creates or deletes it.

   The Worker also checks Access's token itself on every private path. So if an application is missing, or a
   deploy of it fails, private pages answer 403: nothing private is ever served without a valid token.

3. **Fill in `crit.config.ts`.** Every value is explained there. `name` names the Worker, the database, the bucket
   and the state store, and never changes after a deploy.
4. **Put the secrets in two mode-600 files outside Git**, at the paths the config names. A relative path is taken
   from crit's own folder, whose `.gitignore` keeps `.local/` out; `~/…` keeps them outside the repository:
   - `credentials`: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Only `deploy` reads it.
   - `publishEnv`: `CRIT_PUBLISH_TOKEN`, 32 random characters or more (`openssl rand -base64 32`). Without a domain,
     add `CRIT_URL` (the Worker's address) after the first deploy prints it.
   - Optional, in `publishEnv`: `CRIT_TEAM=email=Name,email=Name`, the people who sign in. Use it when the project
     keeps addresses out of its repository, and leave `access.emails` and `names` empty in the config; the two lists
     are joined when both are set. A deploy with Access and nobody listed is refused.
5. **Wire the folder into the project's checks.** The template is written to a strict bar (type-aware lint with no
   floating promises, Effect diagnostics as errors, no type assertions, bounded files and functions, no duplicated
   code), so the code itself should pass. What a strict repository still has to adjust:
   - **Formatter and linter:** ignore `src/lib/*.js` (the built page script and its small helper) and `pages/`.
   - **Console in scripts:** allow `console` under `scripts/`, as for the project's own tooling.
   - **TypeScript:** the folder's `tsconfig.json` should extend the project's, so the project's diagnostics apply.
     `scripts/` and `alchemy.run.ts` are tooling that reads the environment and uses Node's modules.
   - **Unused-code check:** a workspace entry with `alchemy.run.ts`, `src/Worker.ts`, `client/comments.ts`,
     `scripts/*.ts` and `test/**/*.test.ts` as entries. Every dependency is a `devDependency`, so a production-only
     run reports nothing.
   - **Dependency-graph check:** the folder imports nothing from the project and nothing imports it. The Worker
     imports four files as text (`?raw`), which a strict graph check may need to be told about.
   - **Checks that walk the disk:** tell them to skip `.alchemy/` (the local test's build output) and `pages/`
     (drafts, not in Git).
   - **Translation-key scanner:** ignore the folder; its texts are not the product's.
   - **Agent-instruction checks:** the folder ships `CLAUDE.md` as a link to its `AGENTS.md`.
   - **Tests:** the `*.test.ts` units run under vitest from anywhere, and need Bun on the PATH for two of them. The
     workerd journey is `test/Journey.native.test.ts`; keep it out of the product's own native suite and run it by
     hand with `bun run test:native`.

   Keep `pages/*` out of Git (the template's `.gitignore` does) and keep the folder **out of the product's release
   gate and deploy**: a broken page or a crit change must never block or ride along with a release.

6. **Deploy:** `bun run deploy` (it plans first). It makes the Access applications, the Worker, the database, the
   bucket and a state store of its own, `<name>-state`.
7. **Read back:**
   - signed out, `/` and `/_template/` show the email sign-in; a teammate with no Cloudflare account gets the code
     and sees the index;
   - `/api/pages` answers 401 without the publish token and works with it, with no sign-in;
   - `bun run publish _template`, then `bun run share _template` prints a link that opens in a private window;
   - with public pages on: `bun run visibility _template public`, then `/p/_template/` opens in a private window,
     while `/_template/` still asks for the sign-in there;
   - a signed-in member's comment appears under their name, and `bun run comments _template` prints it;
   - the Worker's workers.dev address (when it has one beside a domain) answers 403 at `/`.
8. **Tell the project's agents:** add one line to the root `AGENTS.md` that points at the folder's `AGENTS.md`,
   and say there whether pages may hold what only the team may see.

Optional: add `https://<host>/mcp` to an MCP client with the publish token as a bearer token, for agents without a
shell. The README has a client config.

## Rules crit relies on

- **Its own stack, one stage.** It shares nothing with the product's stack, and its state is in its own store.
- **The database and the bucket are kept on teardown, under fixed names,** so a deploy that lost its state adopts
  the live pages and comments.
- **A page is the team's until someone opens it.** An agent opens one with `publish --public` or `visibility`; a
  member opens or closes one with a button on the index. `publicPages: false` refuses both.
- **A public page and a share link are public.** No private or personal data, no customer data, nothing only the
  team may see goes in one. `outsiders: 'none'` turns share links off.
- **Pages are trusted code.** Publish only HTML the team's own agents made: every page on the address can reach
  every other (see below).
- **Never copy pages elsewhere** to get around the sign-in.
- **Agents answer; people resolve.** No command, API route or MCP tool lets an agent resolve a thread.
- **No status boards.** Publish findings, not progress. The project's own status document is the only one.
- **Delete a page when its question is settled,** or set `expiryDays` so pages take themselves down.
- **A page generated from a file in the repository is never edited by hand.** Change the source and publish again.
- **Agents hold the publish token, never the account token.** Rotate the publish token by changing the file and
  deploying.

## What it does not do

- **Every page on the address shares one origin.** A script in any page, public and shared ones included, runs with
  whatever the reader may do: opened by a signed-in teammate, it can read the private pages and comment as them.
  That is acceptable only while every page comes from the team's own agents.
- **`/p` and `/s` with nothing after them are behind the team's sign-in.** The open paths begin one segment further
  in, and the Worker answers 404 there.
- **Public addresses and share links stay in browser history and in chat previews.** A chat app that unfurls a link
  fetches the page. Closing a page, and ending or revoking a link, are the only remedies.
- **Anyone with the publish token can publish, open and remove any page,** and read every comment.
- **A comment is attached by its block's name** (`data-review-id`) **or by a hash of its text.** When an unnamed
  block's text changes, its comments move to "Comments on changed text": kept, but no longer pinned.
- **No drawing on pages,** no comments pinned to a version, and no way back to an older version except publishing
  it again.
- **Large files are not read for secrets:** only text files of up to 5 MiB are.
- **Built and tested locally, not yet seen on Cloudflare:** a team sign-in on a workers.dev name,
  `outsiders: 'none'`, the "sign in again" message when a session ends mid-comment, the hourly clean-up firing by
  itself, and files near the 25 MiB limit through the Worker. The comments script has not been tried in Safari or on
  a phone.

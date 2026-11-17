# crit: the stack

How crit is built. crit is a recipe: a project copies `template/` (as `apps/crit`) and owns the code from then on.

## One Worker, one address

`template/stack.ts` deploys `template/src/Worker.ts` once. Everything is on one address and routed by path. The
deploy's own state lives in a second, tiny Worker on the account, `<name>-state` (`template/alchemy.run.ts`).

| Path | Who | Guard |
| --- | --- | --- |
| `/`, `/<slug>/…` | The team: the index and every page | Cloudflare Access, and the Worker's own check of its token |
| `/<slug>/_crit/comments` | Members' comments | The same |
| `/_crit/pages/<slug>/…` | The index's buttons: open or close a page, new link, revoke links (`src/Team.ts`) | The same, and the request must come from this origin |
| `/p/<slug>/…` | Anyone: public pages, and their comments at `…/_crit/comments` | The page is `public`, and the site allows public pages |
| `/s/<token>/<slug>/…` | Anyone with the link, and the page's comments under it | The link's token |
| `/api/*`, `/mcp` | Agents | The publish token |
| `/lib/*` | Everyone | None |

### Cloudflare Access

When the config's `access.kind` is `cloudflare`, the stack declares two Access applications on the Worker's host
(`Cloudflare.Access.Application`, not the Worker's `access` prop, which would guard every path):

- **`Team`** covers the host. One Allow policy lists the team's emails; the only login method is the account's
  One-time PIN (looked up, never created or deleted by the stack), so a teammate signs in with a code Cloudflare
  mails them and needs no Cloudflare account. The session cookie is `SameSite=Lax` and `HttpOnly`.
- **`Open`** covers `/p/*`, `/s/*`, `/api/*`, `/mcp` and `/lib/*` with a Bypass policy. A more specific path wins
  over the host's application. `/p` and `/s` with nothing after them are not covered; the Worker answers 404 there.

Neither application depends on the Worker, and the Worker's `ACCESS_AUD` binding comes from `Team`, so Alchemy makes
the applications before the Worker.

**The Worker does not rely on Access being in front.** On every private path it checks the token Access adds
(`Cf-Access-Jwt-Assertion`) itself (`src/Access.ts`): an RS256 signature against the organization's public keys,
this application's audience, the organization as issuer, and an unexpired time. A request without a valid token gets
a 403. So a workers.dev or preview address, a bypass set too wide, or a deleted application opens nothing private.
The member's identity is the email in that token.

**Why a public page has its own address.** Serving a public page at `/<slug>/` would need Access to bypass the whole
host, which would leave Access guarding nothing and the Worker to drive the sign-in. With `/p/<slug>/`, a private
page keeps its two guards whatever is public.

### Modes

- **Domain and Access:** `domain` and `access.kind: 'cloudflare'`. The Worker has only its domain.
- **workers.dev and Access:** no `domain`; the config names the account's workers.dev subdomain, so the stack knows
  the host before the Worker exists. Not yet run on Cloudflare.
- **No team side:** `access.kind: 'none'`. No Access applications and no `ACCESS_*` bindings; every private path is
  "not here". Pages open as public pages or by share links.

### Visibility

- `pages.visibility` is `team` (the default) or `public`, with who changed it and when (`0004_visibility.sql`).
- `publicPages` in the config (off by default) becomes the `PUBLIC_PAGES` binding. Off, a request to open a page is
  refused (422 `public_pages_off`) and nothing is served under `/p/`, whatever a row says.
- **Who opens a page:** an agent (`publish --public`, `visibility <slug> public`, `POST /api/pages/<slug>/visibility`,
  the MCP tools), or a signed-in member with a button on the index.
- A publish that names no visibility keeps the page as it is. A page taken down goes back to `team`, so a page
  published under the name later is never public by inheritance.
- **`outsiders`** says what a visitor does on a public page or by a share link: `none` (read public pages; no share
  links; sees and writes no comments), `view` (also reads threads), `comment` (also comments as a named guest).
  `view` and `comment` are covered by the journey and have run on Cloudflare; `none` has neither yet.

### One origin

Every page on the address shares one origin. A script in any page, public and shared ones included, can do what its
reader can: opened by a signed-in teammate it can read private pages and comment as them. No header separates paths
within one origin. crit therefore treats pages as trusted code: only HTML the team's own agents made is published.
What crit does do: the Access cookie is `Lax` and `HttpOnly`; comment writes must be JSON from this origin; the
index's buttons must be pressed from this origin; private answers carry `Cross-Origin-Resource-Policy: same-origin`;
the publish token is never ambient, so no page script reaches the agents' API.

## Storage

- **R2** holds `blobs/<sha256>`: a file is stored once, whatever page or version uses it.
- **D1** (`template/migrations/`, plain prepared statements in `src/Store.ts`):
  - `pages`: the name, the head version, the title, description and date shown on the index, who may open it
    (`team` or `public`), whether the page is kept, and when it expires;
  - `versions`: one manifest (path, sha256, size, content type per file) per publish, and whether the publish was
    told to go ahead although a file was flagged; the last five per page are kept;
  - `blobs`: what R2 holds, so "which files are missing" is one statement; what each text file looked like it held
    when it was uploaded; and when a publish last named it;
  - `links`: share links, stored only as the token's hash, each with a public id (to revoke that one link) and
    an optional end;
  - `comments` (`0002_comments.sql`, `src/CommentStore.ts`): one row per comment, flat, each reply naming the comment
    it answers.

## Publishing

Three calls, behind one bearer token (the `PUBLISH_TOKEN` secret):

1. `POST /api/publish/plan` answers which hashes are missing.
2. `PUT /api/blobs/<sha256>` sends each missing file to R2. R2 checks the body against the hash and refuses a
   mismatch.
3. `POST /api/publish/commit` writes one version and moves the page's head, under an `Idempotency-Key`. It may
   name the page's visibility.

A page's name cannot be one of crit's own first segments (`p`, `s`, `api`, `mcp`, `lib`, `_crit`, `cdn-cgi`): 422
`reserved_name`.

A page is never half-published. Two agents publishing one page race for a version number; the loser retries.
Agents hold only the publish token, never the Cloudflare account token. Only `deploy` needs the account token.

## Guards

The rules are in `src/Guards.ts`, and they are applied twice.

- **By the script, before anything leaves the machine** (`scripts/guards.ts`): files that are never published
  (`.env*`, `*.env`, `.git/`, `.wrangler/`, `.alchemy/`, `.dev.vars`, private keys, `.pem`, `.key`, `.p12`, `.pfx`,
  databases), text that looks like a secret (cloud and API keys, tokens, private keys, crit share links) in any file
  whose bytes are text, and the sizes: 25 MiB a file, 500 MiB and 2,000 files a page. `node_modules` is skipped.
- **By the Worker, whatever the caller did** (`src/Publish.ts`): a file of up to 5 MiB is read for secrets once, at
  upload, and what it looks like it holds is kept with the file. A commit refuses a denied path (422 `denied_path`)
  and a flagged file (422 `secrets_found`, naming the file and the kind). Larger files are streamed and not read.
- **The override** is `publish --allow-secrets` (`allowSecrets` in the commit). It lets flagged files through, never
  denied paths, and the version records that it was used.

## Expiry and clean-up

- **Pages.** `expiryDays` in the config (0, the default, is never) counts from a page's last publish.
  `keep <slug>` exempts a page; `keep <slug> --off` starts its clock again.
- **Links.** A share link ends after `linkDays` (30 by default; 0 is until revoked), or after `share --days N`.
- **Gone at once.** A page or a link past its time is "not here" for every reader from that moment:
  the statements compare with the database's clock. Nothing waits for the clean-up.
- **The clean-up** (`src/Sweep.ts`) runs hourly on the Worker's cron, and on `POST /api/sweep`:
  1. expired pages are taken down, with their links and versions;
  2. versions beyond a page's last five go;
  3. files no version names are deleted from R2 once they have been unused for 24 hours. A plan marks the files it
     found as seen, so a publish between its plan and its commit never loses one.
  Each run does a bounded amount (at most 2,000 files), so it fits a Worker's limits.
- Comments are never deleted by the clean-up.

## Markdown

`publish <slug> --from ../../docs/plan.md` publishes a Markdown file as a page (the path is relative to crit's
folder, or absolute), and each `.md` in a page folder gets a
rendered `.html` beside it (`README.md` also becomes the index when the folder has none). Rendering happens in the
publish script (`scripts/markdown.ts`, `scripts/pagefiles.ts`), so the Worker never renders anything.

- **Parser:** Bun's built-in `Bun.markdown.render` (GFM tables, task lists, heading ids). No Markdown dependency.
- **Diagrams:** a `mermaid` fence is drawn by pele at publish time as inline SVG; one pele cannot draw stays a code
  block.
- **Blocks are marked:** headings, paragraphs, quotes, list items, table rows, code blocks and diagrams get a
  `data-review-id` from their text. The comments script anchors to that name (`r/<id>`) when an element has one,
  and to the text's hash otherwise. Any HTML page may set its own `data-review-id` to keep a block's comments
  through edits to its text.
- **Links:** to a file of the page, relative (`.md` becomes `.html`); to anything else in the repository, a GitHub
  link at the commit when it is pushed, else at the branch.
- **Pictures** are published with the page wherever they sit on disk. One outside the page's folder is copied to
  `_files/<hash>-<name>`.
- **The footer** names the repository, the file and the commit, and says when the tree had uncommitted changes.
- **Testing:** the parser exists only under Bun and the unit tests run in vitest under Node, so the parser is a
  parameter. Vitest covers everything around it with a stand-in; `test/Built.test.ts` spawns Bun to run
  `scripts/markdown-check.ts`, which renders a real document; the journey publishes one.

## Share links

- The token is in the address (`/s/<token>/<slug>/`), not in a cookie. Relative assets resolve by themselves, and no
  ambient credential exists for another page's script to use.
- Tokens are 128-bit, stored hashed, and revocable. A token opens exactly one page.
- Each link has a public id (16 hex characters), shown when it is made and by `share --list`. `share --revoke <id>`
  ends that one link; `share --revoke` ends every link of the page.
- Every response carries `nosniff`, `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`.
- Invocation logs are off on the Worker, so tokens are not logged.
- `outsiders: 'none'` in the config turns share links off.

## Serving files

`src/Files.ts` decides from the manifest alone: which file a path means, and what the conditional and range headers
ask for. So 206, 304, 412 and 416 are answered before R2 is read, and the entity tag is the file's sha256. Text gets a
weak tag, because Cloudflare's edge compresses text and drops a strong one.

## Diagrams

crit uses [pele](https://github.com/obsidianmd/pele) (MIT, pinned at 1.13.0) for Mermaid diagrams. mermaid.js is not
used anywhere.

- The Worker serves pele's browser build at `/lib/pele.js`, bundled into it as text (`pele/global?raw`).
- `/lib/diagrams.js` draws every `<pre class="mermaid">` and `<div class="diagram" data-mermaid>` with
  `pele.mount(element, text)` as soon as it runs (it is loaded with `defer`), and keeps the diagram's source in
  `data-crit-source` for the comments script.
- Pages reference `/lib/…` absolutely. `/lib/*` is open to everyone, so the same HTML works signed in, in public and
  by a share link.
- pele's `data-id` attributes on nodes and edges are left alone: comments anchor to diagram parts through them.

## Comments

A page opts in with `<script src="/lib/comments.js" defer></script>`. The script is written in TypeScript under
`template/client/`, built to one file (`src/lib/comments.js`, committed, 23 kB) by `bun run build:client`, and served
by the Worker as text like pele. `test:unit` fails when the committed file is stale.

**What takes a comment:** an element (headings, cards, list items, table rows, diagrams; another set with
`data-crit-selector` on the script tag), selected text inside one, and a part of a pele diagram (through pele's
`data-id`). An anchor is `<section>/<kind>/<hash of the text>`. When the text changes, the comment is kept and listed
under "Comments on changed text".

**Where a comment lives:** on a page id, the page's name plus the path inside it (`spike`, `spike/notes`,
`spike/sub/page.html`). The script derives it from the address; the server checks it names a file the page has.
The comments endpoint is under the page's own address, `…/_crit/comments`, however the page was opened, and answers
only for that page.

**Who may do what** is decided in the Worker, by where the request arrives:

| | Member (`/<slug>/_crit/comments`) | Guest (`/p/<slug>/_crit/comments`, `/s/<token>/<slug>/_crit/comments`) | Agent (`/api/comments…`, bearer token) |
| --- | --- | --- | --- |
| Who they are | The email in the Access token the Worker checked, shown through the config's `names` | A name they type once, marked as a guest; a random per-browser key (`x-crit-key`, stored hashed) | `agent`, or the name it gives |
| Read | The page they are on | With `outsiders: 'view'` or `'comment'`: the page they are on. With `none`: no threads | Every page, as JSON or Markdown |
| Write | Comment and reply | With `outsiders: 'comment'`: comment and reply, 20 per share link, or per public page, in 10 minutes | Reply to a thread |
| Resolve and reopen | Yes | No | No: agents answer, people decide |
| Delete | Their own comment, unless someone answered it | The same, from the same browser | No |

- A shared page's comments sit under the link's own path, so the link's token is the only credential; revoking the
  link closes them. A public page's close when the page is closed.
- The members' Access session is ambient, so a write must be JSON and, when the browser says where it came from, from
  the same origin.
- When a member's session has ended, Access answers a write with a redirect to its sign-in; the script is written to
  say "Your sign-in has ended. Reload the page to sign in again" and keep what was typed. This has not been seen
  against a real expired session.
- Bodies are at most 4,096 characters and are drawn as text (quotes, `code`, **bold**, links), never as HTML.
- Statuses are `open` and `resolved`.
- Removing a page keeps its comments; the agents' Markdown says the page was taken down.
- The agents' Markdown links each page to the team's address for it, when the site has a team side.

## Scripts (`bun run --cwd apps/crit …`)

| Command | What it does |
| --- | --- |
| `publish <slug>…` | Publishes `pages/<slug>/`, after the guards; Markdown files are rendered on the way |
| `publish <slug> --from <path>` | Publishes a folder or a Markdown file from anywhere in the repository |
| `publish <slug> --allow-secrets` | Publishes although a file looks like it holds a secret; the version records it |
| `publish --remove <slug>…` | Takes pages down; their links stop working |
| `publish <slug> --public` (or `--team`) | Publishes and opens the page to anyone, or closes it to the team |
| `visibility <slug> public\|team` | Opens a page at `/p/<slug>/`, or closes it |
| `share <slug> [--days N]` | Prints a new share link and its id |
| `share <slug> --list` | The ids of the links that work now |
| `share <slug> --revoke [<id>]` | Ends that one link, or every link of the page |
| `keep <slug> [--off]` | Exempts a page from expiry, or lets it expire again |
| `pages` | Lists live pages, with who may open them, their share links and expiry |
| `comments [slug] [--all] [--json]` | Open threads as Markdown: every page's, or one page's; `--all` adds resolved ones |
| `comments reply <thread> "…" [--as <name>]` | Answers a thread as an agent |
| `build:client` | Rebuilds `src/lib/comments.js` from `client/` (`--check` fails when it is stale) |
| `deploy [--plan]` | Plans and deploys the stack, with the account pair from a mode-600 file |

## Pins and gates

- Alchemy 2.0.0-beta.85, Effect 4.1.2, pele 1.13.0, Bun 1.4.4, TypeScript 7.0.2.
- **The bar,** set so a copy passes a strict host's checks unchanged. `bun run check` at the root runs:
  - oxfmt;
  - oxlint with its type-aware rules on `tsrs-lint` (`tools/oxlint.ts`): no floating promises, `void` included; no
    unsafe `any`; no console outside `scripts/`; files of at most 500 lines, functions of at most 80, cyclomatic
    complexity of at most 20;
  - effect-tsrs (`tools/typecheck.ts`): TypeScript's diagnostics and Effect's, with the Effect ones that name a
    global (`crypto.randomUUID`, `process.env`, `fetch`, `Date`, timers, `console`) as errors inside Effect code;
  - knip, and jscpd at threshold 0;
  - the vitest units.
- The template has no type assertions, uses `Data.TaggedError` for failures, and keeps `console` to `scripts/`. Every
  dependency is a `devDependency`: nothing is installed at run time, the Worker is bundled.
- **Secret files:** a relative path in `crit.config.ts` is taken from crit's own folder, whose `.gitignore` keeps
  `.local/` out of Git. In a worktree the main checkout's copy is used.
- Unit tests run in vitest (`template/test/*.test.ts`), from any folder. Two of them need Bun on the PATH
  (`test/Built.test.ts`: the committed page script is a fresh build, and a real Markdown render). The journey (`template/test/Journey.native.test.ts`) runs the
  Worker in workerd through Alchemy's local dev. Local dev has no Cloudflare Access, so the test stands in for it:
  it hands the Worker its own public keys (`ACCESS_JWKS`) and signs the tokens a member's requests carry. Those keys
  count only on this machine's own address, the stack refuses them outside `ALCHEMY_TEST_DEV=1`, and `deploy`
  refuses a shell set up for the tests.

## MCP

`/mcp` is crit as an MCP server, for agents with no files or shell (a chat client, a phone). It
takes the publish token as a bearer token.

- **Transport:** Streamable HTTP, stateless. Every POST is one JSON-RPC message answered as JSON; there are no
  sessions and no stream. `initialize`, `ping`, `tools/list` and `tools/call` are answered; a notification gets 202.
- **Hand-written** (`src/Mcp.ts`, `src/McpTools.ts`, about 390 lines), not the MCP SDK: seven tools over one
  request-and-answer need no more, and the recipe's dependencies stay Alchemy, Effect and pele.
- **Tools:**

  | Tool | Reads only | What it does |
  | --- | --- | --- |
  | `pages_list` | Yes | Every live page |
  | `page_publish` | No | One HTML document (up to 1 MiB) and up to 50 small text files as a page; same commit and guards as the API; may open or close the page |
  | `page_visibility` | No | Opens a page to anyone at `/p/<slug>/`, or closes it to the team |
  | `page_share` | No | A new share link, and its id |
  | `link_revoke` | No | Ends one share link by its id, or every share link of a page |
  | `comments_read` | Yes | Threads as Markdown, by page, status and time |
  | `comment_reply` | No | An agent's answer on a thread |

- Inputs are closed: a property a tool does not know is refused. A refusal is the tool's own result (`isError`), so
  the model reads why. There is no tool to resolve a thread.
- **Clients:** any MCP client that sends a bearer header. Claude Code has been run against it (the README has the
  config). A client that accepts only OAuth connectors cannot add it.

## Not built

Drawing on pages, comments pinned to a version, and anchors that find a block again after its text changed (a named
block, `data-review-id`, is the way to keep one).

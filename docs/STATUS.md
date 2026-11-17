# crit: status

What is built, what has been seen working where, and what has not. `docs/STACK.md` describes how it is built.

## Built

Publishing by upload, the team's side behind Cloudflare Access, public pages, share links, comments by members,
guests and agents, expiry and clean-up, the guards against secrets on both sides, Markdown publishing with diagrams,
and `/mcp`.

## Seen working on Cloudflare

**On a custom domain, with a team sign-in** (the template deployed by its own `scripts/deploy.ts`):

- signed out, the host and every private path redirect to the organization's sign-in, including a look-alike path
  such as `/pfoo/` and the bare `/p`;
- a team member signs in by emailed code and comments under their own name;
- a public page opens at `/p/<slug>/` with no sign-in, and a team page there answers 404;
- a share link opens its page, a range request on its video answers 206, and a revoked link answers 404;
- `/api/*` and `/mcp` answer 401 without the publish token and work with it, with no cookie;
- `/lib/*` is open;
- a guest comments on a public page and cannot resolve; an agent reads the thread and replies;
- the two Access applications exist before the Worker's script is uploaded;
- with a domain, the Worker has no workers.dev address;
- the token rights listed in `SKILL.md` are enough.

**On workers.dev, with no team side:** publishing, public pages, share links, guests' comments, the agents' API,
`/mcp` and a clean-up run through `POST /api/sweep`.

**With Claude Code as the MCP client** (the publish token as a bearer header): listing pages, publishing a page as
public, closing it again, making a share link, revoking that one link by its id, and reading a thread.

## Tested locally

- **`bun run check`:** the format check, type-aware lint, typecheck with Effect's diagnostics, unused code,
  duplicates and the unit tests. The units cover the Access token check (a good token; none; another application,
  another issuer, an expired time; another key under the same key id; a tampered body), public addresses, reserved
  names, paths, ranges and conditionals, page meta, the guards, tokens, command lines, page ids, anchors, threads,
  the agents' filters and Markdown, the guest limit, Markdown rendering, what a publish sends, links into the
  repository, the team list, and the MCP tools' schemas. `test/Built.test.ts` fails when the committed page script
  is stale, and renders a real Markdown document with Bun's parser.
- **The journey** (`bun run test:native`) runs the Worker in workerd through Alchemy's local dev, with local D1 and
  R2. Local dev has no Cloudflare Access, so the test stands in for it: it signs the tokens the Worker checks.
  1. **A site with a team side.** Publish, a republish with zero uploads, an idempotent replay, a hash mismatch,
     missing files and reserved names refused; a share link opening its page and no other, with 206, 304, 412 and
     416; the index and pages for a member; every private address answering 403 to nobody, to a token for another
     application, to an expired token and to one signed by another key; comments by a member, a guest and an agent,
     with what each may not do; a page opened to the public and closed again while the team's address stays private;
     the index's buttons; one link revoked by its id; the MCP tools; revoke and remove.
  2. **A site without Access, public pages off, visitors who only read.** No private address exists; opening a page
     is refused; a view-only link takes no comments.
  3. **A site whose pages expire in seconds.** Kept pages, link expiry, version pruning, the clean-up, the server's
     guards, a Markdown page.

## Not yet seen working

Built, and covered by the tests above where they can cover it, but not observed on Cloudflare or by a person:

- a team sign-in on a workers.dev name;
- `outsiders: 'none'` (not in the journey either; `view` and `comment` are);
- the "sign in again" message against a real expired session;
- the hourly cron firing by itself;
- files near 25 MiB through the Worker, and the free Workers plan's CPU limit on large uploads;
- the index's buttons pressed by a signed-in member, and the emailed code reaching a teammate who has no Cloudflare
  account;
- the comments script in Safari or on a phone, including video there;
- a clean-up over many thousands of files: each run takes at most 2,000.

## Choices worth knowing

- **Expired means gone at once.** The statements compare `expires_at` with the database's clock, so nothing depends
  on when the cron runs.
- **Denied paths cannot be overridden;** flagged text can, with `--allow-secrets`, and the version records it.
- **Large files are not read for secrets:** only files of up to 5 MiB whose bytes are text.
- **Deleting never takes other people's words:** a comment with answers cannot be deleted (409).
- **A page's comments live under the page's own address** (`…/<slug>/_crit/comments`, whichever way the page was
  opened), so `_crit/` is reserved inside every page, and an endpoint answers for its own page only.
- **A public page has its own address** (`/p/<slug>/`), so Access keeps guarding the team's address for it.
- **A page taken down goes back to the team:** a page published under the name later is not public by inheritance.
- **The stack looks the One-time PIN login method up** and never creates or deletes it, so tearing a crit down
  cannot remove the account's sign-in method.
- **Writes to comments must be JSON and same-origin,** because a member's Access session is ambient.
- **The built page script is committed** (`src/lib/comments.js`), because the Worker bundles `/lib/*` as text.
- **HTML is never answered with 304:** Cloudflare's edge drops the entity tag of compressed text it rewrites. Other
  text gets a weak tag; images and video a strong one.
- **MCP is hand-written,** not the SDK: seven tools over plain request-and-answer need no more.
- **`publish --from` takes a path relative to crit's folder,** where `bun run --cwd` puts the command, or an
  absolute one.

## Not built

Drawing on pages, comments pinned to a version, finding a block again after its text changed (a named block,
`data-review-id`, is the way to keep one), notifications when someone comments, and an OAuth sign-in for `/mcp`.

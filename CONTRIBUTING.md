# Contributing

crit is a recipe. A project copies `template/` and owns its copy, so forks and local changes are expected, and you
do not need to send yours back. Fixes and improvements that help every copy are welcome here.

## Set up

You need Bun 1.4.4 or later, on macOS or Linux (the lint and typecheck tools ship no Windows build).

```sh
bun install
bunx lefthook install   # optional: the pre-commit format and lint check
```

## Checks

```sh
bun run check         # format, lint, typecheck, unused code, duplicates, unit tests
bun run test:native   # the journey: the Worker in workerd, with a local database and bucket
```

Neither needs a Cloudflare account or a secret. Run the journey after any change under `template/src`,
`template/scripts` or `template/stack.ts`. It takes a few minutes.

## The bar

The template is written so a project with strict checks can copy it unchanged:

- no type assertions (decode with Schema), and `Data.TaggedError` for failures;
- no dropped promises, no file over 500 lines, no function over 80 lines;
- `console` only under `scripts/`;
- no duplicated code;
- unit tests in vitest, the journey in `*.native.test.ts`;
- the dependencies stay Alchemy, Effect and pele;
- nothing in `template/` names a project: every such value is in `crit.config.ts`.

A change in behaviour comes with a test, and with a line in `CHANGELOG.md`. Say in the docs only what a test or a
real deployment has shown; `docs/STATUS.md` keeps the two apart.

## Why `private: true`

The `package.json` files are marked private so nothing is published to npm by accident. crit is copied, not
installed.

## Rules the product keeps

- Agents answer comments; only people resolve. No script, route or tool lets an agent resolve a thread.
- A page is the team's until someone opens it.
- Nothing private is served without an Access token the Worker checked itself.
- No status boards: crit is for findings, not progress.

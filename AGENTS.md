# crit: agent instructions

crit is a recipe: `SKILL.md` says how to add it to a project, and `template/` is what the project copies and then
owns. Read `SKILL.md`, `docs/STACK.md` and `docs/STATUS.md` before substantial work.

**Branch and commits.** Work on `main`. Make one commit per coherent change, using explicit paths. Never stash, reset
or bypass hooks.

**Checks.** `bun run check` (format, lint, typecheck, unused code, units) before every commit. The journey,
`bun run test:native`, runs the Worker in workerd; run it after any change under `template/src`, `template/scripts`
or `template/stack.ts`.

**The template's bar,** so a strict project can copy it unchanged:

- no type assertions (decode with Schema), `Data.TaggedError` for failures;
- no file over 500 lines and no function over 80;
- `console` only under `scripts/`;
- unit tests in vitest, the journey in `*.native.test.ts`;
- dependencies stay Alchemy, Effect and pele;
- nothing in `template/` names a project: every such value is in `crit.config.ts`.

**Product rules:**

- Agents never get a hand-kept status page.
- Agents answer; only people resolve. No script, route or tool lets an agent resolve a thread.
- A page is the team's until someone opens it. A public page and a share link are public.
- Nothing private is served without an Access token the Worker checked itself.
- No secrets, account ids or personal data in Git or tool output.

`template/AGENTS.md` is for the agents of a project that uses crit, not for work on this repository.

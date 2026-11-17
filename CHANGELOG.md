# Changelog

crit is copied into a project, not installed. To pick up a change, compare the `template/` folder between two
versions of this repository (`git diff v0.1.0 v0.2.0 -- template/`) and apply what you want to your copy. Database
migrations in `template/migrations/` are only ever added, so new ones apply on your next deploy.

## 0.1.0

The first public version.

- One Worker on one address, with a D1 database and an R2 bucket, deployed with Alchemy.
- Pages published by upload: only changed files are sent, and the last five versions are kept.
- A team side behind Cloudflare Access with an emailed code; public pages at `/p/<page>/`; share links that expire
  and can be revoked.
- Comments on elements, selected text and diagram nodes, by team members, named guests and agents.
- Scripts for agents (`publish`, `share`, `visibility`, `comments`, `pages`, `keep`), an HTTP API and `/mcp`.
- Markdown publishing, with Mermaid diagrams drawn by pele.
- Guards against publishing secrets, in the script and in the Worker.
- Page and link expiry, and an hourly clean-up.

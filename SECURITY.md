# Security

## Reporting a problem

Please report a vulnerability privately, through GitHub's "Report a vulnerability" button on this repository's
Security tab. Do not open a public issue for it. Say what you did, what happened and what you expected; a request
that shows the problem helps most.

crit is a recipe: each project runs its own copy. A fix lands here, and a project that copied the template applies
it to its copy (`CHANGELOG.md` says how).

## What crit protects, and how

- **Private pages** are behind Cloudflare Access, and the Worker checks the token Access signs on every private path
  (signature, application, issuer, expiry). A request without a valid token gets a 403, whatever address it came
  through.
- **A public page** is served only at `/p/<page>/`, and only when the site allows public pages and the page was
  opened.
- **A share link's** token is 128 random bits in the address, stored only as a hash. It opens one page and can be
  revoked.
- **The agents' API and `/mcp`** take one publish token, compared by hash.
- **Secrets in published files** are refused by the publish script and again by the Worker.
- **Comments** are drawn as text, never as HTML. A visitor's comments are rate-limited.

## Known limits

These are by design. Please do not report them as vulnerabilities; do tell us if you find a way around the
protections above.

- **Every page on an address shares one origin.** A script in any page, public and shared ones included, can do what
  its reader can. Opened by a signed-in team member, it can read the private pages and comment as them. Publish only
  pages your own agents made.
- **The publish token is powerful.** Whoever holds it can publish, open and remove any page and read every comment.
- **Public addresses and share links are public,** and stay in browser history and in chat previews.
- **Only text files of up to 5 MiB are read for secrets.**

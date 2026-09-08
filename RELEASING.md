# Releasing and getting verified

Not published to npm (`files` is `dist` only). This is the runbook for the
first release and every one after it.

## State, as of 2026-09-08

- The Fallax API is **live in production**: `https://api.fallax.io/v1`, with the
  generated document at `/v1/openapi.json` and the reference at `/v1/reference`.
  Both already carry today's `order` parameter and the trimmed response fields.
- This package is **committed but unpushed**, at `0.1.0`, with one pending
  changeset that bumps it to `1.0.0`.
- The GitHub repository **does not exist yet**.
- Nothing is on npm yet.

## One-time setup

### 1. The repository

Create `FallaxIO/n8n-nodes-fallax`, **public** (provenance means nothing on a
private repo), and push `main`.

### 2. Bootstrap the npm package

npm will not let you configure a trusted publisher for a package that does not
exist, so the first publish has to be manual. Publish the current `0.1.0` as
the bootstrap version:

```sh
npm login
pnpm build && npm publish --access public
```

That version has no provenance, which is fine: it is not the one submitted for
verification.

### 3. Turn on trusted publishing

On npmjs.com, package settings, add a trusted publisher:

| Field | Value |
| --- | --- |
| Organization | `FallaxIO` |
| Repository | `n8n-nodes-fallax` |
| Workflow | `release.yml` |
| Environment | leave blank |

The workflow filename is load-bearing. Renaming `release.yml` breaks publishing
until npm is told the new name.

## Releasing

1. Merge to `main`. Changesets opens a **release: version packages** PR that
   applies the pending changesets, bumps the version and writes CHANGELOG.md.
2. Merge that PR. The same workflow publishes to npm, with provenance, using a
   short-lived OIDC credential. There is no NPM_TOKEN and there should never be
   one.
3. For later changes: `pnpm changeset` before merging, and describe the change
   the way somebody upgrading would want it described.

Never `npm version`, never publish from a laptop again. The version in
`package.json` is Changesets' to move.

## Submitting for verification

Once `1.0.0` is on npm with provenance:

1. Check it landed: `npm view n8n-nodes-fallax dist.attestations` should print a
   provenance predicate.
2. Install it in a real n8n (self-hosted, Settings, Community nodes) and run one
   workflow end to end against a live Fallax key.
3. Submit the package name at the
   [n8n Creator Portal](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

What they check, and what already satisfies it:

| Requirement | Where it is met |
| --- | --- |
| MIT license | `LICENSE`, and `license` in `package.json` |
| No runtime dependencies | `package.json` has none; `n8n-workflow` is a peer |
| TypeScript, lint clean | `pnpm check` runs their own `eslint-plugin-n8n-nodes-base` |
| Published from Actions with provenance | `.github/workflows/release.yml` |
| One service, trigger allowed alongside | `Fallax` and `Fallax Trigger` |
| English throughout | interface, errors and README |
| README with install, credentials, operations | `README.md` |

Verification is what puts the node on `n8n.io/integrations` and in n8n Cloud's
node panel. There is no fee, no user minimum and no beta period.

## Still open

- **Copyright holder.** `LICENSE` says "Fallax", a product name rather than a
  legal entity. Same in the mailgrade repositories. Worth settling once.
- **Dev parity.** The `0052_api_key` migration is applied in production but not
  on the dev D1: `pnpm db:migrate` in the Fallax repository.

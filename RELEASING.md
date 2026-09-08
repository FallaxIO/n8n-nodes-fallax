# Releasing and getting verified

The runbook for every release after the first, and the record of what the first
one taught us.

## State, as of 2026-09-08

- The Fallax API is **live in production**: `https://api.fallax.io/v1`, with the
  generated document at `/v1/openapi.json` and the reference at `/v1/reference`.
  Both already carry today's `order` parameter and the trimmed response fields.
- `1.0.0` is **on npm with provenance**, published by `release.yml` through
  trusted publishing. `0.1.0` is the bootstrap version below it and has none.
- The GitHub repository is `FallaxIO/n8n-nodes-fallax`, public.
- `1.0.0` was **submitted to the Creator Portal and rejected**, with "Error
  getting author email from npm". See below; `1.0.1` is the fix.

## One-time setup, already done

Kept because it explains why things are shaped the way they are.

The repository is public, because provenance means nothing on a private one.
`0.1.0` was published by hand from a laptop, because npm will not accept a
trusted publisher for a package that does not exist yet, and that publish
needed `--provenance=false` to override the `provenance=true` in `.npmrc` —
that setting is right for CI and impossible anywhere else. Then the trusted
publisher was registered on npmjs.com: organization `FallaxIO`, repository
`n8n-nodes-fallax`, workflow `release.yml`, no environment.

Two of those are load-bearing. Renaming `release.yml` breaks publishing until
npmjs.com is told the new name. Adding an `environment:` to the release job
breaks it until the same field is filled in on npm, and leaving that field
blank on npm while the job has one fails just as hard.

## The npm version in the release job is load-bearing too

`changeset publish` does not talk to the registry itself. Because this package
declares `packageManager: pnpm`, changesets picks its pnpm publish tool, which
runs `pnpm info` and `pnpm publish` — and pnpm shells out to **npm** for both,
packing a tarball and handing it to `npm publish`. It resolves npm from the
Node install directory, which is what `npm install -g npm@...` replaces.

So the npm in `release.yml` is the thing that actually publishes, and it is
pinned to `11.x` from both directions:

| npm | Trusted publishing | `npm info --json` |
| --- | --- | --- |
| 10.x, which Node 22 bundles | no, added in 11.5.1 | object |
| **11.5.1 and up** | yes | object |
| 12.x, which `@latest` now means | yes | **array** |

Changesets' npm code path handles both shapes. Its pnpm code path — ours — does
not, and dies on `versions` being undefined. `11.x` is the only window where
both hold, so `npm@latest` is not a safe simplification.

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

`1.0.0` is on npm with provenance, so:

1. Done: `dist.attestations` on `1.0.0` carries an
   `https://slsa.dev/provenance/v1` predicate, and the published tarball's three
   n8n entrypoints and icon were installed from the registry and loaded.
2. Install it in a real n8n (self-hosted, Settings, Community nodes) and run one
   workflow end to end against a live Fallax key.
3. Submit the package name at the
   [n8n Creator Portal](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

What they check, and what already satisfies it:

| Requirement | Where it is met |
| --- | --- |
| MIT license | `LICENSE`, and `license` in `package.json` |
| No runtime dependencies | `package.json` has none; `n8n-workflow` is a peer |
| TypeScript, lint clean | `pnpm check` runs the same two plugins the scanner does |
| Published from Actions with provenance | `.github/workflows/release.yml` |
| One service, trigger allowed alongside | `Fallax` and `Fallax Trigger` |
| English throughout | interface, errors and README |
| README with install, credentials, operations | `README.md` |

Verification is what puts the node on `n8n.io/integrations` and in n8n Cloud's
node panel. There is no fee, no user minimum and no beta period.

## Run the scanner before submitting, not after

The table above is the published checklist. The gate is a program, and it is
public:

```
npx @n8n/scan-community-package n8n-nodes-fallax
```

It checks provenance, then lints twice — once over the published tarball and
once over the source at the commit provenance attests to — and fails on any
error. Warnings do not fail it.

`1.0.0` was submitted without running it, on the strength of `pnpm check` being
green, and came back rejected. The scan found seven errors. Only one of them,
the missing `author.email`, was the one the portal reported; the rest would have
surfaced one at a time on later attempts.

`pnpm check` was green because it was running half the rules. The scanner layers
**two** ESLint plugins:

| Plugin | What it is |
| --- | --- |
| `eslint-plugin-n8n-nodes-base` | the long-standing one, and all this repo had |
| `@n8n/eslint-plugin-community-nodes` | the newer one, and where every rule we failed lives |

`eslint.config.mjs` is now a deliberate copy of the scanner's own config
(`scanner/scanner.mjs`, `buildScanConfig`) — both plugins, the same four rule
overrides, the same scope of `package.json` and `{nodes,credentials}/**`. If
`pnpm lint` passes, the scan passes. Keep it that way: when the scanner's config
moves, move this one with it rather than letting the two drift apart again.

Note that the scanner reads the **published** package and the **pushed** commit,
so it can only be run against a version that already exists. To check work in
progress, call `analyzePackage` from `@n8n/scan-community-package` directly
against the working tree.

## Still open

- **Copyright holder.** `LICENSE` says "Fallax", a product name rather than a
  legal entity. Same in the mailgrade repositories. Worth settling once.
- **Dev parity.** The `0052_api_key` migration is applied in production but not
  on the dev D1: `pnpm db:migrate` in the Fallax repository.

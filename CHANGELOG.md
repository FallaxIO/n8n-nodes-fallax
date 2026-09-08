# n8n-nodes-fallax

## 1.0.1

### Patch Changes

- [#5](https://github.com/FallaxIO/n8n-nodes-fallax/pull/5) [`529b35d`](https://github.com/FallaxIO/n8n-nodes-fallax/commit/529b35dd2117136a71b05210446a25d8932c71d6) Thanks [@IgnaceMaes](https://github.com/IgnaceMaes)! - Pass the n8n Creator Portal's package scan, which `1.0.0` did not.
  
  The submission was rejected with "Error getting author email from npm": npm's
  copy of `1.0.0` had an `author` with a name and a URL but no email, and the
  portal reads that field. `author.email` is now `hello@fallax.io`.
  
  Running the portal's own scanner rather than guessing turned up six more errors
  behind that one, all of them now fixed:
  
  - The credential had no `icon`, so it showed as a grey placeholder wherever n8n
    lists credentials. It now uses the same mark as the nodes.
  - `inputs` and `outputs` were the string `'main'` rather than
    `NodeConnectionTypes.Main`.
  - An error that was not an API error escaped `execute` raw. Those are now
    `NodeOperationError` carrying the index of the item that failed, so the editor
    can point at the input row; API errors still arrive as the `NodeApiError` that
    `GenericFunctions` built, with Fallax's own message intact.
  
  `package.json` also now declares `n8n.strict`, which is how a package states it
  holds to the stricter ruleset that n8n Cloud verification requires.

## 1.0.0

### Major Changes

- [`24efe9c`](https://github.com/FallaxIO/n8n-nodes-fallax/commit/24efe9ca67f8794f32e2a8255feeb9796d3be320) Thanks [@IgnaceMaes](https://github.com/IgnaceMaes)! - The first release: a trigger node, an action node and a credential.
  
  **Fallax Trigger** polls for reported mail, clicks, credential submits and
  every other simulation event, so a workflow starts the moment somebody reports
  a lure rather than the next time an admin opens a dashboard. It watches its own
  watermark, so nothing is replayed and nothing is missed across a restart.
  
  **Fallax** reads reports, events, campaigns, the programme summary and the
  directory, and writes the one thing an automation should be trusted with: a
  person. Adding, correcting and archiving people is what keeps a directory in
  step with an HR system. Nothing in either node can create or send a simulation.
  
  **Fallax API** credentials are workspace API keys, read-only unless a workflow
  needs to change the directory. Saving one checks it against the workspace it
  opens.

### Patch Changes

- [`38791b7`](https://github.com/FallaxIO/n8n-nodes-fallax/commit/38791b7e7a1e3afeb0277354c815fdba12782d68) Thanks [@IgnaceMaes](https://github.com/IgnaceMaes)! - Build with tsdown (oxc/rolldown) instead of `tsc`. The published files are the
  same CommonJS at the same paths, minus the `.d.ts` declarations, which nothing
  consumed: n8n runs this package, it does not import it.

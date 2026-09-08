# n8n-nodes-fallax

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

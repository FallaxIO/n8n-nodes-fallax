---
'n8n-nodes-fallax': patch
---

Build with tsdown (oxc/rolldown) instead of `tsc`. The published files are the
same CommonJS at the same paths, minus the `.d.ts` declarations, which nothing
consumed: n8n runs this package, it does not import it.

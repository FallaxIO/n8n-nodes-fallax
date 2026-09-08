---
'n8n-nodes-fallax': patch
---

Pass the n8n Creator Portal's package scan, which `1.0.0` did not.

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

---
"n8n-nodes-fallax": major
---

The first release: a trigger node, an action node and a credential.

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

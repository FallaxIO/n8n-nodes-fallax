# n8n-nodes-fallax

Community node for [Fallax](https://fallax.io), the phishing-simulation and security-awareness platform.

Start a workflow the moment somebody reports a suspicious message or clicks a lure, read your programme's results, and keep the directory in step with whatever system your joiners and leavers live in.

[n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Nodes](#nodes)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow n8n's [community nodes guide](https://docs.n8n.io/integrations/community-nodes/installation/), or:

1. In n8n, go to **Settings → Community nodes → Install**.
2. Enter `n8n-nodes-fallax`.
3. Agree to the risks of using community nodes and select **Install**.

On n8n Cloud, search the nodes panel for **Fallax** instead: verified community nodes are already available there.

## Credentials

You need a Fallax workspace API key.

1. In Fallax, open **Settings → Integrations → n8n**.
2. Create a key. Leave it read-only unless a workflow has to change your directory.
3. Copy it into the **Fallax API** credential in n8n. Selecting **Save** checks the key and shows which workspace it opens.

A key belongs to the workspace rather than to the person who created it, so it keeps working after they leave. It is shown once and stored as a hash, so it can be replaced but never recovered. No key of either scope can create or send a simulation.

| Scope | What it can do |
| --- | --- |
| Read | Reported mail, the event log, campaigns, the programme summary, the directory |
| Write | The same, plus adding, correcting and archiving people |

## Nodes

### Fallax Trigger

Polls for new activity and starts the workflow with it. Events:

| Event | Fires when |
| --- | --- |
| Message Reported | Somebody forwards a suspicious message to the report mailbox, files it with the Fallax button in Gmail, or Google's Alert Center records their report. Filterable by verdict: matched a simulation, or matched nothing Fallax sent and may therefore be real. |
| Simulation Clicked | Somebody clicks the link in a simulation |
| Credentials Submitted | Somebody types credentials into a simulated login page |
| Simulation Opened | Somebody opens a simulation |
| Any Simulation Event | Every interaction, including sends and gateway scans |

The trigger keeps a watermark of the newest row it has handled and asks for everything after it, exclusively. An event is emitted once, in the order it happened, even when a poll is retried or two events share a millisecond. Activating a workflow starts from that moment rather than replaying history.

### Fallax

Reads and writes inside a workflow.

| Resource | Operations |
| --- | --- |
| Report | Get Many |
| Event | Get Many |
| Campaign | Get, Get Many |
| Person | Get, Get Many, Create or Update, Update, Archive |
| Summary | Get |

**Create or Update** matches on email address, so an onboarding workflow that retries or re-runs will not create duplicates. **Archive** takes somebody out of the programme while keeping their evidence trail, which is what an offboarding workflow wants: fields owned by a Google or Microsoft directory sync stay owned by it, and a write that would collide with one is refused rather than quietly undone at the next sync.

## Example workflows

**Route real phishing to the security team.** Fallax Trigger on *Message Reported*, verdict *Unknown Only* → create a ticket. These are messages staff thought were suspicious that Fallax did not send, so they are the ones worth a human.

**Follow up a credential submit within the hour.** Fallax Trigger on *Credentials Submitted* → send the person a message, and notify their manager from your HR system.

**Keep the directory current.** Your HR system's trigger → Fallax, *Person: Create or Update* for a joiner, *Person: Archive* for a leaver. No CSV, no drift, and leavers stop counting as seats.

**Report on the quarter.** Schedule → Fallax, *Summary: Get* with range *Last 90 Days* → post the rates and their movement to a channel or a spreadsheet.

## Compatibility

Tested against n8n 1.x on Node.js 20 and later, on n8n Cloud and self-hosted. The node polls over HTTPS, so a self-hosted n8n needs no public URL and nothing has to be opened up on your side.

## Resources

- [Fallax n8n integration](https://fallax.io/integrations/n8n)
- [Fallax REST API documentation](https://fallax.io/docs/api)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE)

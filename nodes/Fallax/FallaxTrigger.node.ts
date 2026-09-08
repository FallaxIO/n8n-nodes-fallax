import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { fallaxApiRequestAllItems } from './GenericFunctions';

/**
 * The workflow starts when something happens in Fallax.
 *
 * Polling rather than a webhook, deliberately. A webhook would need Fallax to
 * reach the n8n instance, and most self-hosted n8n is behind something that
 * makes that a project of its own; polling works identically on n8n Cloud and
 * on a laptop. The cost of polling is normally duplicates and gaps, and neither
 * applies here: the API's `since` window is exclusive and paging is by cursor,
 * so "everything after the newest row I have seen" is exact even when two rows
 * share a millisecond.
 *
 * The watermark is the newest `reportedAt`/`occurredAt` actually returned, not
 * the time the poll ran. Using the clock would drop anything that arrived while
 * the request was in flight, which for an hourly poll is a silently lost hour
 * every time the two happen to overlap.
 */

type EventName = 'report' | 'click' | 'submit' | 'open' | 'anyEvent';

const EVENT_TYPES: Record<Exclude<EventName, 'report' | 'anyEvent'>, string> = {
	click: 'clicked',
	submit: 'submitted',
	open: 'opened',
};

/**
 * The most rows one poll will emit.
 *
 * A send of ten thousand messages produces ten thousand `sent` events within a
 * minute or two, and handing all of them to a workflow in one execution is how
 * an n8n instance runs out of memory. Because the poll reads oldest first, this
 * is a pace rather than a ceiling: the remainder is the front of the next poll,
 * in order, with nothing skipped.
 */
const MAX_PER_POLL = 500;

export class FallaxTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fallax Trigger',
		name: 'fallaxTrigger',
		icon: 'file:fallax.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when something happens in a Fallax workspace',
		defaults: {
			name: 'Fallax Trigger',
		},
		polling: true,
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'fallaxApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Any Simulation Event',
						value: 'anyEvent',
						description: 'Every interaction: sent, opened, clicked, scanned, submitted, reported',
					},
					{
						name: 'Credentials Submitted',
						value: 'submit',
						description: 'Somebody typed credentials into a simulated login page',
					},
					{
						name: 'Message Reported',
						value: 'report',
						description: 'Somebody forwarded or filed a suspicious message',
					},
					{
						name: 'Simulation Clicked',
						value: 'click',
						description: 'Somebody clicked the link in a simulation',
					},
					{
						name: 'Simulation Opened',
						value: 'open',
						description: 'Somebody opened a simulation',
					},
				],
				default: 'report',
			},
			{
				displayName: 'Verdict',
				name: 'verdict',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
					},
					{
						name: 'Simulation Only',
						value: 'simulation',
						description: 'Matched something Fallax sent, so the person spotted a test',
					},
					{
						name: 'Unknown Only',
						value: 'unknown',
						description:
							'Matched nothing Fallax sent, so it is real mail somebody thought was suspicious',
					},
				],
				default: 'any',
				displayOptions: { show: { event: ['report'] } },
				description: 'Which reported messages should start the workflow',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as EventName;
		const staticData = this.getWorkflowStaticData('node');
		const lastSeen = staticData.lastSeen as string | undefined;
		const manual = this.getMode() === 'manual';

		const isReport = event === 'report';
		const endpoint = isReport ? '/reports' : '/events';
		const timeField = isReport ? 'reportedAt' : 'occurredAt';

		const qs: IDataObject = {};
		if (isReport) {
			const verdict = this.getNodeParameter('verdict') as string;
			if (verdict !== 'any') qs.verdict = verdict;
		} else if (event !== 'anyEvent') {
			qs.type = EVENT_TYPES[event];
		}

		// A manual run is somebody pressing "fetch test event" to see the shape of
		// the data. It must not consume the watermark, and one row is enough.
		if (manual) {
			const preview = await fallaxApiRequestAllItems.call(this, endpoint, qs, 1);
			if (preview.length === 0) return null;
			return [this.helpers.returnJsonArray(preview)];
		}

		// First real poll: take the watermark from now and emit nothing. Emitting
		// the backlog instead would open a ticket for every click of the last two
		// years the first time somebody activates the workflow.
		if (!lastSeen) {
			staticData.lastSeen = new Date().toISOString();
			return null;
		}

		// Oldest first, which is the whole reason the API takes a direction. The
		// cap below has to fall somewhere, and with newest-first a send that
		// produced more rows than the cap would hand back the newest of them and
		// strand the rest behind the advancing watermark, permanently. Ascending
		// makes the cap a pause instead of a loss: what does not fit is simply the
		// front of the next poll.
		qs.since = lastSeen;
		qs.order = 'asc';
		const rows = await fallaxApiRequestAllItems.call(this, endpoint, qs, MAX_PER_POLL);
		if (rows.length === 0) return null;

		// The last row is the newest, so the watermark moves to exactly what was
		// emitted and no further. Read off the row rather than from the clock: a
		// row written while this poll was in flight must not be skipped by a
		// watermark that ran ahead of it.
		const newest = String(rows.at(-1)?.[timeField] ?? '');
		if (newest) staticData.lastSeen = newest;

		return [this.helpers.returnJsonArray(rows)];
	}
}

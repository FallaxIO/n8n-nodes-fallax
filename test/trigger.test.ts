import type { IPollFunctions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { FallaxTrigger } from '../nodes/Fallax/FallaxTrigger.node.ts';

/**
 * The trigger's watermark, and only the watermark. Every other part of this
 * package is a description object that n8n renders or a request the API's own
 * suite covers; the watermark is the one piece of logic whose failure is
 * silent. Get it wrong in one direction and a workflow re-opens a ticket for a
 * click it handled an hour ago, in the other and the click is never seen at all.
 *
 * This runs against the TypeScript source. That the built package is the shape
 * n8n actually loads is a separate question, and `package.test.ts` answers it.
 */

type Page = { data: unknown[]; nextCursor: string | null; hasMore: boolean };

type FakeOptions = {
	mode?: string;
	event?: string;
	verdict?: string;
	pages?: Page[];
	staticData?: { lastSeen?: string };
};

/** A stand-in for n8n's IPollFunctions, recording what the node asked for. */
function fakeContext({
	mode = 'trigger',
	event = 'report',
	verdict = 'any',
	pages = [],
	staticData = {},
}: FakeOptions) {
	const calls: any[] = [];
	return {
		calls,
		staticData,
		getMode: () => mode,
		getNode: () => ({ name: 'Fallax Trigger' }),
		getWorkflowStaticData: () => staticData,
		getNodeParameter: (name: string) => (name === 'event' ? event : verdict),
		getCredentials: async () => ({ apiKey: 'flx_test', baseUrl: 'https://api.fallax.io' }),
		helpers: {
			returnJsonArray: (rows: object[]) => rows.map((json) => ({ json })),
			httpRequestWithAuthentication: async (_credential: string, options: unknown) => {
				calls.push(options);
				return pages.shift() ?? { data: [], nextCursor: null, hasMore: false };
			},
		},
	};
}

/** Runs the node's poll against a fake context, as n8n would. */
const poll = (ctx: ReturnType<typeof fakeContext>) =>
	FallaxTrigger.prototype.poll.call(ctx as unknown as IPollFunctions);

/** Polls and unwraps the single output branch, failing if nothing was emitted. */
async function pollItems(ctx: ReturnType<typeof fakeContext>) {
	const result = await poll(ctx);
	expect(result, 'expected this poll to emit something').not.toBeNull();
	return result![0]!;
}

const page = (rows: object[], nextCursor: string | null = null): Page => ({
	data: rows,
	nextCursor,
	hasMore: nextCursor !== null,
});

describe('FallaxTrigger', () => {
	it('emits nothing on the first poll, and remembers where it started', async () => {
		const ctx = fakeContext({
			pages: [page([{ id: 'old', reportedAt: '2026-09-01T10:00:00.000Z' }])],
		});

		const result = await poll(ctx);

		expect(result, 'a fresh workflow must not replay the backlog').toBeNull();
		expect(ctx.calls, 'and must not even ask for it').toHaveLength(0);
		expect(ctx.staticData.lastSeen, 'the watermark starts at activation time').toBeTruthy();
	});

	it('asks for oldest first, and emits in that order', async () => {
		const ctx = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [
				page([
					{ id: 'older', reportedAt: '2026-09-01T11:00:00.000Z' },
					{ id: 'newer', reportedAt: '2026-09-01T12:00:00.000Z' },
				]),
			],
		});

		const items = await pollItems(ctx);

		expect(
			ctx.calls[0].qs.order,
			'the direction is what makes the per-poll cap safe: with newest first, a backlog bigger than the cap would be stranded behind the watermark',
		).toBe('asc');
		expect(
			items.map((item) => item.json.id),
			'a workflow should see events in the order they happened',
		).toEqual(['older', 'newer']);
	});

	it('leaves a backlog bigger than one poll for the next poll, in order', async () => {
		// Two pages of the same poll, then a watermark that lands on the newest
		// row actually emitted rather than past it.
		const ctx = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [
				page(
					[
						{ id: 'a', reportedAt: '2026-09-01T11:00:00.000Z' },
						{ id: 'b', reportedAt: '2026-09-01T11:30:00.000Z' },
					],
					'cursor-1',
				),
				page([{ id: 'c', reportedAt: '2026-09-01T12:00:00.000Z' }]),
			],
		});

		const items = await pollItems(ctx);

		expect(items.map((item) => item.json.id)).toEqual(['a', 'b', 'c']);
		expect(ctx.staticData.lastSeen).toBe('2026-09-01T12:00:00.000Z');
		expect(ctx.calls[1].qs.cursor).toBe('cursor-1');
	});

	it('advances the watermark to the newest row seen, not to the clock', async () => {
		const ctx = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([{ id: 'a', reportedAt: '2026-09-01T12:00:00.000Z' }])],
		});

		await poll(ctx);

		expect(ctx.staticData.lastSeen).toBe('2026-09-01T12:00:00.000Z');
		expect(ctx.calls[0].qs.since).toBe('2026-09-01T10:00:00.000Z');
	});

	it('leaves the watermark alone when a poll finds nothing', async () => {
		const ctx = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([])],
		});

		const result = await poll(ctx);

		expect(result).toBeNull();
		expect(ctx.staticData.lastSeen).toBe('2026-09-01T10:00:00.000Z');
	});

	it('does not consume the watermark on a manual test run', async () => {
		const ctx = fakeContext({
			mode: 'manual',
			pages: [page([{ id: 'a', reportedAt: '2026-09-01T12:00:00.000Z' }])],
		});

		const items = await pollItems(ctx);

		expect(items).toHaveLength(1);
		expect(ctx.staticData.lastSeen, 'a preview must not skip live rows').toBeUndefined();
	});

	it('asks the events endpoint for the one type the chosen event means', async () => {
		const ctx = fakeContext({
			event: 'click',
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([{ id: 'e1', occurredAt: '2026-09-01T12:00:00.000Z' }])],
		});

		await poll(ctx);

		expect(ctx.calls[0].url).toMatch(/^https:\/\/api\.fallax\.io\/v1\/events$/);
		expect(ctx.calls[0].qs.type).toBe('clicked');
		expect(ctx.staticData.lastSeen).toBe('2026-09-01T12:00:00.000Z');
	});

	it('passes a report verdict through, and omits it when set to any', async () => {
		const filtered = fakeContext({
			verdict: 'unknown',
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([])],
		});
		await poll(filtered);
		expect(filtered.calls[0].qs.verdict).toBe('unknown');

		const unfiltered = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([])],
		});
		await poll(unfiltered);
		expect(unfiltered.calls[0].qs.verdict).toBeUndefined();
	});
});

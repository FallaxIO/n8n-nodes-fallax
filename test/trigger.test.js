const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { FallaxTrigger } = require('../dist/nodes/Fallax/FallaxTrigger.node.js');

/**
 * The trigger, against the built JavaScript rather than the source, because the
 * built JavaScript is what n8n loads.
 *
 * What is worth testing here is the watermark, and only the watermark. Every
 * other part of this package is a description object that n8n renders or a
 * request the API's own suite covers; the watermark is the one piece of logic
 * whose failure is silent. Get it wrong in one direction and a workflow
 * re-opens a ticket for a click it handled an hour ago, in the other and the
 * click is never seen at all.
 */

/** A stand-in for n8n's IPollFunctions, recording what the node asked for. */
function fakeContext({ mode = 'trigger', event = 'report', verdict = 'any', pages = [], staticData = {} }) {
	const calls = [];
	return {
		calls,
		staticData,
		getMode: () => mode,
		getNode: () => ({ name: 'Fallax Trigger' }),
		getWorkflowStaticData: () => staticData,
		getNodeParameter: (name) => (name === 'event' ? event : verdict),
		getCredentials: async () => ({ apiKey: 'flx_test', baseUrl: 'https://app.fallax.io' }),
		helpers: {
			returnJsonArray: (rows) => rows.map((json) => ({ json })),
			httpRequestWithAuthentication: async (_credential, options) => {
				calls.push(options);
				return pages.shift() ?? { data: [], nextCursor: null, hasMore: false };
			},
		},
	};
}

const page = (rows) => ({ data: rows, nextCursor: null, hasMore: false });

describe('FallaxTrigger', () => {
	it('emits nothing on the first poll, and remembers where it started', async () => {
		const ctx = fakeContext({
			pages: [page([{ id: 'old', reportedAt: '2026-09-01T10:00:00.000Z' }])],
		});

		const result = await FallaxTrigger.prototype.poll.call(ctx);

		assert.equal(result, null, 'a fresh workflow must not replay the backlog');
		assert.equal(ctx.calls.length, 0, 'and must not even ask for it');
		assert.ok(ctx.staticData.lastSeen, 'the watermark starts at activation time');
	});

	it('emits new rows oldest first', async () => {
		const ctx = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [
				page([
					{ id: 'newer', reportedAt: '2026-09-01T12:00:00.000Z' },
					{ id: 'older', reportedAt: '2026-09-01T11:00:00.000Z' },
				]),
			],
		});

		const [items] = await FallaxTrigger.prototype.poll.call(ctx);

		assert.deepEqual(
			items.map((item) => item.json.id),
			['older', 'newer'],
			'a workflow should see events in the order they happened',
		);
	});

	it('advances the watermark to the newest row seen, not to the clock', async () => {
		const ctx = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([{ id: 'a', reportedAt: '2026-09-01T12:00:00.000Z' }])],
		});

		await FallaxTrigger.prototype.poll.call(ctx);

		assert.equal(ctx.staticData.lastSeen, '2026-09-01T12:00:00.000Z');
		assert.equal(ctx.calls[0].qs.since, '2026-09-01T10:00:00.000Z');
	});

	it('leaves the watermark alone when a poll finds nothing', async () => {
		const ctx = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([])],
		});

		const result = await FallaxTrigger.prototype.poll.call(ctx);

		assert.equal(result, null);
		assert.equal(ctx.staticData.lastSeen, '2026-09-01T10:00:00.000Z');
	});

	it('does not consume the watermark on a manual test run', async () => {
		const ctx = fakeContext({
			mode: 'manual',
			pages: [page([{ id: 'a', reportedAt: '2026-09-01T12:00:00.000Z' }])],
		});

		const [items] = await FallaxTrigger.prototype.poll.call(ctx);

		assert.equal(items.length, 1);
		assert.equal(ctx.staticData.lastSeen, undefined, 'a preview must not skip live rows');
	});

	it('asks the events endpoint for the one type the chosen event means', async () => {
		const ctx = fakeContext({
			event: 'click',
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([{ id: 'e1', occurredAt: '2026-09-01T12:00:00.000Z' }])],
		});

		await FallaxTrigger.prototype.poll.call(ctx);

		assert.match(ctx.calls[0].url, /\/api\/v1\/events$/);
		assert.equal(ctx.calls[0].qs.type, 'clicked');
		assert.equal(ctx.staticData.lastSeen, '2026-09-01T12:00:00.000Z');
	});

	it('passes a report verdict through, and omits it when set to any', async () => {
		const filtered = fakeContext({
			verdict: 'unknown',
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([])],
		});
		await FallaxTrigger.prototype.poll.call(filtered);
		assert.equal(filtered.calls[0].qs.verdict, 'unknown');

		const unfiltered = fakeContext({
			staticData: { lastSeen: '2026-09-01T10:00:00.000Z' },
			pages: [page([])],
		});
		await FallaxTrigger.prototype.poll.call(unfiltered);
		assert.equal(unfiltered.calls[0].qs.verdict, undefined);
	});
});

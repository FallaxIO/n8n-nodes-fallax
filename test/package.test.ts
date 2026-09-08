import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import pkg from '../package.json' with { type: 'json' };

/**
 * The contract between the build and n8n, which no amount of testing the
 * TypeScript source can cover.
 *
 * n8n does not import this package; it reads the paths under `n8n` in
 * package.json, `require`s each one, and expects a class it can construct. Then
 * it resolves each node's icon relative to the file it just loaded. All of that
 * is the bundler's output, hand-written paths, and a copied SVG — three things
 * that break silently and separately, and none of which the compiler sees.
 */
const root = resolve(import.meta.dirname, '..');
const require = createRequire(join(root, 'package.json'));

const entries = [...pkg.n8n.credentials, ...pkg.n8n.nodes];

describe('the built package', () => {
	it.each(entries)('ships %s where package.json promises it', (entry) => {
		expect(existsSync(join(root, entry))).toBe(true);
	});

	it.each(entries)('exports a constructible class from %s', (entry) => {
		const exported = Object.values(require(join(root, entry)));
		expect(exported, 'exactly one class per file is what n8n loads').toHaveLength(1);

		// A node carries its identity on `description`, a credential carries it
		// directly. n8n reads whichever applies, so accept either and require
		// that one of them is there.
		const [Loaded] = exported as [new () => { name?: string; description?: { name?: string } }];
		const loaded = new Loaded();
		expect(loaded.description?.name ?? loaded.name).toBeTruthy();
	});

	it.each(pkg.n8n.nodes)('resolves the icon %s names, next to the built file', (entry) => {
		const built = join(root, entry);
		const [Node] = Object.values(require(built)) as [new () => { description: { icon?: string } }];
		const icon = new Node().description.icon;

		// `file:fallax.svg` is resolved by n8n relative to the built node, so a
		// node whose SVG did not get copied renders as a grey box rather than
		// failing to load. Nothing else would catch that.
		expect(icon, 'a node without an icon is a node with a grey box').toMatch(/^file:/);
		expect(existsSync(join(dirname(built), icon!.slice('file:'.length)))).toBe(true);
	});
});

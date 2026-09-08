import { defineConfig, type UserConfig } from 'tsdown';

/**
 * n8n loads a community package by `require`-ing the exact paths listed under
 * `n8n` in package.json, so the build has two hard constraints that are not
 * negotiable regardless of what the rest of the toolchain does:
 *
 *   - CommonJS. n8n's node loader requires the built files; ESM would not load.
 *   - The `dist/` tree has to mirror the source tree, because those `n8n` paths
 *     are written by hand and the icon path inside each node's description is
 *     resolved relative to the built file.
 *
 * `unbundle` is what keeps the second one true: one output file per input file,
 * names and directories preserved, rather than rolled-up chunks with generated
 * names. `GenericFunctions` therefore stays a real module shared by both nodes
 * instead of being copied into each.
 */
const config: UserConfig = defineConfig({
	entry: ['nodes/**/*.node.ts', 'credentials/**/*.credentials.ts'],
	format: 'cjs',
	platform: 'node',
	// `.cjs` is what tsdown would pick for a CommonJS build. n8n wants `.js`:
	// the paths under `n8n` in package.json are written by hand and the Creator
	// Portal expects that shape, so the extension is pinned rather than derived.
	outExtensions: () => ({ js: '.js' }),
	unbundle: true,
	sourcemap: true,
	clean: true,
	// Not a library: nothing imports this package, n8n only runs it. Declaration
	// files would be dead weight in the tarball.
	dts: false,
	// tsc emitted JavaScript and nothing else, but a node renders as a grey box
	// in the editor unless its SVG sits beside the .js that names it.
	copy: [
		{ from: 'nodes/**/*.svg', to: 'dist/nodes', flatten: false },
		{ from: 'credentials/**/*.svg', to: 'dist/credentials', flatten: false },
	],
});

export default config;

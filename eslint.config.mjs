import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import parser from '@typescript-eslint/parser';
import n8nNodesBase from 'eslint-plugin-n8n-nodes-base';

/**
 * ESLint is here for exactly one thing: the rules the Creator Portal runs.
 * Everything a general-purpose linter would catch is oxlint's job (see
 * .oxlintrc.json) and is not repeated here.
 *
 * "The rules the portal runs" is two plugins, not one, and that distinction is
 * the whole reason this file exists in its current shape. Submission is gated
 * by `@n8n/scan-community-package`, which lints the published tarball *and* the
 * provenance-attested source checkout with `@n8n/eslint-plugin-community-nodes`
 * layered over `eslint-plugin-n8n-nodes-base`. Only the older of those two was
 * wired up here at first, so `pnpm lint` was green while the scanner found
 * seven errors — including the missing author email that the portal reports as
 * "Error getting author email from npm". The config below is deliberately a
 * copy of the scanner's own (scanner/scanner.mjs, `buildScanConfig`), overrides
 * and all, so that gap cannot reopen: if this passes, the scan passes.
 *
 * The three `off`s under nodes/ and the one under credentials/ are the
 * scanner's, kept identical and for its reasons — in each case the newer plugin
 * has a rule that says the opposite of, or more precisely than, the older one.
 *
 * The scanner always uses `configs.recommended` rather than
 * `recommendedWithoutN8nCloudSupport`, so this does too. That is the stricter
 * of the pair (it adds the restricted globals and imports rules), and it is
 * what `n8n.strict: true` in package.json declares we hold ourselves to.
 *
 * No `parserOptions.project`: none of these rules are type-aware, so the parser
 * only ever needs to read syntax and never builds a program.
 *
 * That matters, because typescript-eslint cannot run on TypeScript 7 (it uses
 * the old JS compiler API, which the 7.0 package no longer ships) while this
 * repo typechecks with 7. Hence the split in package.json, which is the
 * side-by-side arrangement TypeScript documents for exactly this transition:
 *
 *   typescript     6.x   the API typescript-eslint resolves by bare name, used
 *                        here for parsing only, and by the editor's language
 *                        service
 *   typescript-7   7.x   an alias, and what `pnpm typecheck` actually runs
 *
 * Both check the same code, and only 7 gates CI. When typescript-eslint gains
 * TS 7 support, drop the alias and put 7 back under the plain name.
 */
export default [
	// The scanner lints `package.json` and `{nodes,credentials}/**` and nothing
	// else — its stated scope is "the shippable sources", excluding repo dev
	// files that never reach the tarball. Match it. Without this, the cloud
	// ruleset's no-restricted-imports fires on the tests' `node:fs` and friends,
	// which is a rule about what n8n Cloud will load at runtime and has nothing
	// to say about a file vitest runs on a laptop.
	{ ignores: ['dist/**', 'node_modules/**', 'test/**', '*.config.mjs', '*.config.mts'] },

	// The package.json and TypeScript rules in both plugins walk a TSESTree
	// AST, so the TypeScript parser has to be registered for both file types —
	// for .json because ESLint's default parser cannot read one at all.
	{
		files: ['**/*.json'],
		languageOptions: { parser, parserOptions: { extraFileExtensions: ['.json'] } },
	},
	{
		files: ['**/*.ts'],
		languageOptions: { parser, parserOptions: { sourceType: 'module' } },
	},

	n8nCommunityNodesPlugin.configs.recommended,

	{ plugins: { 'n8n-nodes-base': n8nNodesBase } },
	{
		files: ['package.json'],
		rules: n8nNodesBase.configs.community.rules,
	},
	{
		files: ['credentials/**/*.ts'],
		rules: {
			...n8nNodesBase.configs.credentials.rules,
			// Camel-cases the whole value, which is right for a credential in
			// n8n's own repository (where it is a docs slug) and wrong here,
			// where the sibling rule demands a real URL.
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			// credential-password-field in the newer plugin is more accurate.
			'n8n-nodes-base/cred-class-field-type-options-password-missing': 'off',
		},
	},
	{
		files: ['nodes/**/*.ts'],
		rules: {
			...n8nNodesBase.configs.nodes.rules,
			// These two demand the string literal "main"; node-connection-type-literal
			// in the newer plugin demands the NodeConnectionTypes enum instead.
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			// Some third-party APIs really do cap a limit, so maxValue is valid.
			'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
		},
	},
];

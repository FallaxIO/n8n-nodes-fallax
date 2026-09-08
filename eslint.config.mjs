import parser from '@typescript-eslint/parser';
import n8nNodesBase from 'eslint-plugin-n8n-nodes-base';

/**
 * ESLint is here for exactly one plugin: n8n's own rules, which are what the
 * Creator Portal review runs. Everything a general-purpose linter would catch
 * is oxlint's job (see .oxlintrc.json) and is not repeated here, so this file
 * stays a thin wrapper around `eslint-plugin-n8n-nodes-base` and nothing else.
 *
 * The plugin still ships eslintrc-style configs, so each rule set is spread in
 * by hand rather than through a `extends`. That also lets each one be scoped to
 * the files it is about, which the flat config format requires anyway.
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
const plugins = { 'n8n-nodes-base': n8nNodesBase };

export default [
	{ ignores: ['dist/**', 'node_modules/**'] },
	{
		files: ['package.json'],
		languageOptions: { parser, parserOptions: { extraFileExtensions: ['.json'] } },
		plugins,
		rules: {
			...n8nNodesBase.configs.community.rules,
			'n8n-nodes-base/community-package-json-name-still-default': 'off',
		},
	},
	{
		files: ['credentials/**/*.ts'],
		languageOptions: { parser, parserOptions: { sourceType: 'module' } },
		plugins,
		rules: {
			...n8nNodesBase.configs.credentials.rules,
			// Camel-cases the whole value, which is right for a credential in
			// n8n's own repository (where it is a docs slug) and wrong here,
			// where the sibling rule demands a real URL. The two fight; this is
			// the one that does not apply to a community package.
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
		},
	},
	{
		files: ['nodes/**/*.ts'],
		languageOptions: { parser, parserOptions: { sourceType: 'module' } },
		plugins,
		rules: n8nNodesBase.configs.nodes.rules,
	},
];

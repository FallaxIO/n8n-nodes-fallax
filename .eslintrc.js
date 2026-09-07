/**
 * n8n's own lint rules, which are what the Creator Portal review runs. They
 * cover the conventions that make a node feel native: alphabetical options,
 * sentence-case display names, descriptions that do not repeat the label, the
 * `Get Many` naming, and the credential-test requirement.
 */
module.exports = {
	root: true,
	env: { browser: true, es6: true, node: true },
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	ignorePatterns: ['.eslintrc.js', '**/*.js', '**/node_modules/**', '**/dist/**'],
	overrides: [
		{
			files: ['package.json'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/community'],
			// Its own project, because package.json has to be parsed for these
			// rules and must not be in the build's `include`, where tsc would copy
			// it into dist/ and ship a second package.json inside the package.
			parserOptions: { project: ['./tsconfig.eslint.json'] },
			rules: {
				'n8n-nodes-base/community-package-json-name-still-default': 'off',
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/credentials'],
			rules: {
				// Camel-cases the whole value, which is right for a credential in
				// n8n's own repository (where it is a docs slug) and wrong here,
				// where the sibling rule demands a real URL. The two fight; this is
				// the one that does not apply to a community package.
				'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
		},
	],
};

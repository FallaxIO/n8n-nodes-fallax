import { defineConfig } from 'vitest/config';

export default defineConfig({
	server: {
		// n8n-workflow ships sourcemaps that point at sources it does not ship.
		// Vite warns once per file, which buries the test output under a hundred
		// lines about a dependency this package cannot fix.
		sourcemapIgnoreList: () => true,
	},
});

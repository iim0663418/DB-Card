import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.toml' },
			miniflare: {
				durableObjects: {
					RATE_LIMITER: 'RateLimiterDO',
					LEARNING_COUNTER: 'LearningCounter',
					LEARNING_BATCHER: 'LearningBatcher',
				},
			},
		}),
	],
	test: {
		exclude: ['test/vcard-simple.test.js', 'node_modules/**'],
	},
});

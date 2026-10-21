import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Unit-test configuration for Anatomy Atlas.
 *
 * Node environment only: the domain logic under test (data integrity,
 * search ranking, quiz scoring, progress persistence) is deliberately
 * framework-independent, and no DOM test environment is installed.
 * React component behaviour is covered end-to-end by Playwright.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    reporters: ['default'],
  },
});

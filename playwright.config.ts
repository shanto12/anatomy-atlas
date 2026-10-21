import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end / accessibility configuration for Anatomy Atlas.
 *
 * Default mode builds the production bundle and serves it with `vite preview`
 * (the real thing users download). During parallel development, set QA_DEV=1
 * to run against the Vite dev server instead.
 */
const PORT = 4173;
const devMode = process.env.QA_DEV === '1';
const baseURL = process.env.QA_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      testIgnore: '**/webgl.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-pixel-7',
      testIgnore: '**/webgl.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'webkit-desktop',
      testIgnore: '**/webgl.spec.ts',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
    },
    {
      // Opt-in real WebGL project: software GPU is slow, so only the explicit
      // 3D checks run here. It is additive to the three required projects.
      name: 'chromium-webgl',
      testMatch: '**/webgl.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: process.env.QA_BASE_URL
    ? undefined
    : {
        command: devMode
          ? `npm run dev -- --port ${PORT} --strictPort`
          : `npm run build && npm run preview -- --port ${PORT} --strictPort`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});

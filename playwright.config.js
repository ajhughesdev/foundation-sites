const { defineConfig, devices } = require('@playwright/test');

const port = Number(process.env.F7_TEST_PORT || '4173');
const host = process.env.F7_TEST_HOST || '127.0.0.1';
const baseURL = process.env.F7_TEST_BASE_URL || `http://${host}:${port}`;

module.exports = defineConfig({
  testDir: './packages/core/playwright',
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node scripts/f7-static-server.js`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      HOST: host,
      PORT: String(port),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

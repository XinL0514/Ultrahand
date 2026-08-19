import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { getEnvironment } from './e2e/testdata/environments';
import { getTestAccountPoolSize } from './e2e/testdata/accounts';

export default defineConfig({
  testDir: './e2e',
  timeout: 90 * 1000,
  fullyParallel: true,
  // Worker count is capped at the account pool size so each concurrent
  // worker gets its own account/session (see e2e/fixture.ts storageState).
  // Defaults to 1 (serial) when MIABI_TEST_ACCOUNT_POOL_SIZE is unset.
  workers: getTestAccountPoolSize(),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: getEnvironment().appBaseURL,
    trace: 'retain-on-failure',
    locale: 'zh-CN',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

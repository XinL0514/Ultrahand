import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { getEnvironment } from './e2e/testdata/environments';

export default defineConfig({
  testDir: './e2e',
  timeout: 90 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: getEnvironment().appBaseURL,
    storageState: './e2e/.auth/user.json',
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

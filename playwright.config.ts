import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './e2e',
  timeout: 90 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'https://aixmy.miaobi.cn',
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

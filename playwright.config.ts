import { defineConfig } from '@playwright/test';
import 'dotenv/config';
import { getEnvironment } from './e2e/testdata/environments';
import { getTestAccountPoolSize } from './e2e/testdata/accounts';

export default defineConfig({
  testDir: './e2e',
  timeout: 90 * 1000,
  fullyParallel: true,
  // 工作进程数量受账号池大小限制，以便每个并发工作进程都拥有独立的账号和会话
  // （参见 e2e/fixture.ts 中的 storageState）。
  // 未设置 MIABI_TEST_ACCOUNT_POOL_SIZE 时，默认值为 1，即串行执行。
  workers: getTestAccountPoolSize(),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],
  globalSetup: './e2e/globalSetup.ts',
  use: {
    baseURL: getEnvironment().appBaseURL,
    trace: 'retain-on-failure',
    locale: 'zh-CN',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        // 不固定为 Desktop Chrome 的默认 1280×720 视口；有头模式下随最大化窗口布局。
        // 必须保留 Chrome 的原生设备缩放：--force-device-scale-factor 会导致 macOS 有头窗口白屏，
        // 即使 Playwright/Midscene 截图缓冲仍能抓到页面内容。
        viewport: null,
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },
  ],
});

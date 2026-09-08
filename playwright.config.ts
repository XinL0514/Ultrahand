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
        // `viewport: null` 在无头 Chromium 中会退回到 800×600（4:3）。课程详情
        // 弹窗中的“启动课件，开始上课”按钮会因此落在 Midscene 截图之外，造成视觉
        // waitFor 假超时。固定为登录流程也使用的标准桌面尺寸，保证有头和无头模式
        // 得到相同的 CSS 视口；不设置 --force-device-scale-factor，仍使用 Chrome 原生缩放。
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});

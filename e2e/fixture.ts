import { test as base, request } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';
import { PlaywrightAiFixture } from '@midscene/web/playwright';
import { getEnvironment } from './testdata/environments';
import { getTestAccountPoolSize } from './testdata/accounts';

type EndClassFixtures = {
  endClassGuard: void;
};

async function finalizeEndClassRecord(
  testInfo: TestInfo,
  recordToReport: PlayWrightAiFixtureType['recordToReport'],
  record: Record<string, unknown>,
) {
  testInfo.annotations.push({
    type: 'endClassGuard',
    description: JSON.stringify(record),
  });
  await testInfo.attach('end-class-guard', {
    body: JSON.stringify(record, null, 2),
    contentType: 'application/json',
  });

  // 同时将其写入 Midscene 的 AI 操作报告（由
  // @midscene/web/playwright-reporter 展示的“Execution”面板）；仅使用
  // testInfo.attach 时，记录只会出现在 Playwright 自己的 HTML 报告中。
  try {
    await recordToReport('endClassGuard 下课兜底调用', {
      content: JSON.stringify(record, null, 2),
    });
  } catch (err) {
    console.warn('[endClassGuard] recordToReport failed:', err);
  }
}

export const test = base.extend<PlayWrightAiFixtureType & EndClassFixtures>({
  ...PlaywrightAiFixture({
    waitForNetworkIdleTimeout: 2000,
    // 页面未变化时复用缓存的元素位置和 aiAct 计划，避免每一步都进行 AI 往返调用。
    // 界面发生变化时会自动使缓存失效。
    cache: true,
  }),

  // 在每个工作进程的整个生命周期内将其固定到一个稳定的账号槽位，避免并发
  // 工作进程共用登录或课堂会话。每个工作进程的 parallelIndex 是稳定的，且
  // 工作进程数量受账号池大小限制（参见 playwright.config.ts），因此不会循环映射
  // 到同一个槽位而发生冲突。
  storageState: async ({}, use, testInfo) => {
    const slot = testInfo.parallelIndex % getTestAccountPoolSize();
    await use(`./e2e/.auth/user-${slot}.json`);
  },

  // 安全兜底：测试会通过界面点击“下课”结束课堂，但该操作可能静默失败
  // （AI 误点击、超时或测试提前中止）。这里从网络请求中捕获 roomKey，并额外通过
  // API 强制结束课堂，避免不稳定的界面步骤让房间一直停留在“上课中”。
  endClassGuard: [
    async ({ page, recordToReport }, use, testInfo) => {
      let roomKey: string | undefined;
      page.on('request', (req) => {
        const match = req.url().match(/[?&]roomKey=([^&]+)/);
        if (match) roomKey = decodeURIComponent(match[1]);
      });

      await use();

      const record: Record<string, unknown> = { roomKey: roomKey ?? null };

      if (!roomKey) {
        record.called = false;
        record.reason = 'roomKey not captured';
        await finalizeEndClassRecord(testInfo, recordToReport, record);
        return;
      }

      try {
        const token = await page.evaluate(() => {
          const raw = window.localStorage.getItem('user');
          return raw ? (JSON.parse(raw).token as string | undefined) : undefined;
        });
        if (!token) {
          record.called = false;
          record.reason = 'auth token not found in localStorage';
          await finalizeEndClassRecord(testInfo, recordToReport, record);
          return;
        }

        const apiContext = await request.newContext();
        try {
          const res = await apiContext.post(
            `${getEnvironment().classroomApiBaseURL}/api/v2/classroom/over/course?roomKey=${encodeURIComponent(roomKey)}`,
            { headers: { authorization: token } },
          );
          record.called = true;
          record.status = res.status();
          record.ok = res.ok();
          if (!res.ok()) {
            console.warn(
              `[endClassGuard] 下课接口返回非成功状态 ${res.status()}，roomKey=${roomKey}`,
            );
          }
        } finally {
          await apiContext.dispose();
        }
      } catch (err) {
        record.called = false;
        record.error = err instanceof Error ? err.message : String(err);
        console.warn(`[endClassGuard] 下课兜底调用失败，roomKey=${roomKey}:`, err);
      }

      await finalizeEndClassRecord(testInfo, recordToReport, record);
    },
    // 不自动启用：只有在测试回调参数中解构 `endClassGuard` 的用例才会使用此清理逻辑。
    { auto: false },
  ],
});

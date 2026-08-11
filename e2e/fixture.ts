import { test as base, request } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';
import { PlaywrightAiFixture } from '@midscene/web/playwright';
import { getEnvironment } from './testdata/environments';

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

  // Also surface it in the midscene AI-action report (the "Execution" panel
  // shown by @midscene/web/playwright-reporter) — testInfo.attach alone only
  // shows up in Playwright's own HTML report, not midscene's report.
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
    // Reuse cached element locations / aiAct plans when the page hasn't changed,
    // to avoid an AI round-trip on every step. Auto-invalidates if the UI drifts.
    cache: true,
  }),

  // Safety net: tests end class via a UI click on 下课, which can fail
  // silently (AI mis-click, timeout, test aborting early). This captures the
  // roomKey off the wire and force-ends the class through the API too, so a
  // flaky UI step doesn't leave a room stuck in "in class".
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
    // Not auto: only tests that destructure `endClassGuard` in their test
    // callback params opt into this cleanup.
    { auto: false },
  ],
});

import { expect } from '@playwright/test';
import { test } from '@e2e/fixture';
import { getTestAccountForSlot } from '@e2e/testdata/accounts';

test.beforeEach(async ({ page, context }) => {
  // The pinned storageState fixture (e2e/fixture.ts) loads an already
  // logged-in session from global-setup, so force a logged-out state here
  // before the test itself exercises the login flow.
  await context.clearCookies();
  await page.goto('/#/home/profile');
  await page.evaluate(() => window.localStorage.clear());
  // goto() to the same URL the test body uses next is a no-op in the SPA
  // (hash unchanged, no real navigation), so force a reload here to make
  // the app re-check auth state against the now-empty storage.
  await page.reload();
});

test('可以正常登录',{ tag: '@smoke' }, async ({ page, aiAct, aiAssert, aiWaitFor }, testInfo) => {
    const { phone, password } = getTestAccountForSlot(testInfo.parallelIndex);
    await page.goto('/#/home/profile');
    await aiAct('点击登录按钮');
    await aiAct(`输入工号 ${phone}`);
    await aiAct(`输入密码 ${password}`);
    await aiAct('点击登录按钮');
    await aiWaitFor('登录成功,并且点击到我的页面能看到老师的工号', {
    timeoutMs: 15000,
  });
  await aiAssert('能看到老师的工号');
});

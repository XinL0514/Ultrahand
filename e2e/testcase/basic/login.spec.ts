import { expect } from '@playwright/test';
import { test } from '@e2e/fixture';
import { getTestAccountForSlot } from '@e2e/testdata/accounts';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
});

test('可以正常登录', async ({ page, aiAct, aiQuery, aiAssert, aiWaitFor }, testInfo) => {
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

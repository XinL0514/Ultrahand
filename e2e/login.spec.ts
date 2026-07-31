import { expect } from '@playwright/test';
import { test } from './fixture';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
});

test('可以正常登录', async ({ page, aiAct, aiQuery, aiAssert, aiWaitFor }) => {
    await page.goto('/#/home/profile');
    await aiAct('点击登录按钮');
    await aiAct('输入工号 MBAICST00005');
    await aiAct('输入密码 443860');
    await aiAct('点击登录按钮');
    await aiWaitFor('登录成功,并且点击到我的页面能看到老师的工号', {
    timeoutMs: 15000,
  });
  await aiAssert('能看到老师的工号');
});

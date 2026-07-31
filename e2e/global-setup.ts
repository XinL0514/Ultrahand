import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import { PlaywrightAgent } from '@midscene/web/playwright';
import 'dotenv/config';

const APP_URL = 'https://aixmy.miaobi.cn/#/home/profile';
const STORAGE_STATE_PATH = './e2e/.auth/user.json';

export default async function globalSetup() {
  const phone = process.env.MIABI_TEST_PHONE;
  const password = process.env.MIABI_TEST_PASSWORD;

  if (!phone || !password) {
    throw new Error(
      'MIABI_TEST_PHONE / MIABI_TEST_PASSWORD is not set. Copy .env.example to .env and fill in a test account.',
    );
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(APP_URL);

  const agent = new PlaywrightAgent(page);

  // The initial state here is the "not logged in" placeholder (with a
  // "立即登录" button), not the phone/password form itself — that only
  // appears after tapping the button, which aiAct below handles.
  await agent.aiWaitFor('页面上出现了"未登录"提示和"立即登录"按钮', {
    timeoutMs: 15000,
  });

  await agent.aiTap('立即登录按钮');
  await agent.aiWaitFor('登录表单已经出现,包含工号和密码输入框', {
    timeoutMs: 10000,
  });
  await agent.aiInput('工号输入框', { value: phone });
  await agent.aiInput('密码输入框', { value: password });
  await agent.aiTap('登录按钮');
  await agent.aiWaitFor('登录成功,页面已经离开登录表单', { timeoutMs: 15000 });

  await agent.aiAssert('当前不是登录页面或错误页面');

  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await agent.destroy();
  await browser.close();
}

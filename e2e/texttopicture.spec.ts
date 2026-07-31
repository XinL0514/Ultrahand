import { expect } from '@playwright/test';
import { test } from './fixture';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生图', async ({ aiAct, aiQuery, aiAssert, aiWaitFor, aiTap, aiInput }) => {
    await aiAct('点击开始上课')
    await aiAct('点击第一个课程分类下的第一个课程封面')
    await aiAct('点击开始上课')
    await aiTap('点击自动生成房间号')
    await aiAct('点击进入教室,等待教室加载完成')
    await aiAct('点击 输入框右侧附近的 更多 按钮')
    await aiAct('在AI功能弹窗里点击 文生图 选项')
    await aiInput('tiger', '聊天输入框', { mode: 'append' });
    await aiAct('点击发送按钮')
    await aiWaitFor('等待对话流中图片的加载动画结束和图片生成完成,生成图片以及缩略图加载出来需要一定时间可以稍等一会再判断', {
    timeoutMs: 180_000,
  });
  await aiAssert('能看到生成图片的缩略图里面的内容 跟输入的图片描述一致');
});

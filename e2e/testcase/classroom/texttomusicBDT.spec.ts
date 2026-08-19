import { test } from '@e2e/fixture';
import { textToMusicScenario } from '@e2e/testdata/scenarios/classroom';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生音乐', { tag: '@smoke' }, async ({ aiAct, aiAssert, aiTap, aiInput, aiWaitFor, endClassGuard }) => {
  await aiAct('点击带有 开始上课文本的 按钮');
  await aiAct('点击第一个课程分类下的第一个课程封面');
  await aiAct('点击 启动课件, 开始上课 按钮');
  await aiTap('点击 自动生成房间号 按钮');
  await aiAct('点击进入教室,等待教室加载完成');
  await aiAct('点击 更多 按钮');
  await aiAct('在AI功能弹窗里点击 文生音乐 选项');
  await aiInput(textToMusicScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');

  await aiWaitFor(
    `右侧对话流中刚刚发送的“/文生音乐 ${textToMusicScenario.prompt}”已经完成：对应的最终音乐已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比`,
    { timeoutMs: 180000 },
  );

  await aiAssert(
    `只检查右侧对话流中刚刚发送的“/文生音乐 ${textToMusicScenario.prompt}”这条消息对应的最终的音乐卡片：卡片中有封面, 有播放按钮, 有时长,和进度条 并且该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`,
  );
  await aiTap('点击左上角的 下课 按钮');
});

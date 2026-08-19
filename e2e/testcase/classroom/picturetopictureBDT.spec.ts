import { test } from '@e2e/fixture';
import { textToImageScenario, imageToImageScenario } from '@e2e/testdata/scenarios/classroom';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以图生图', { tag: '@smoke' }, async ({ aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  await aiTap('点击带有 开始上课文本的 按钮');
  await aiAct('等待课件选择页面加载完毕, 然后点击第一个课程分类下的第一个课程封面');
  await aiTap('点击 启动课件, 开始上课 按钮');
  await aiTap('点击 自动生成房间号 按钮');
  await aiTap('点击 立即进入');
  await aiWaitFor('教室页面已经加载完成，右侧对话/工具区域已经渲染出来，不再显示空白或加载中的转圈图标,不显示欢迎使用神笔马良, 并且显示出来对话框', {
    timeoutMs: 15000,
  });
  await aiTap('点击 更多 按钮');
  await aiAct('在AI功能弹窗里点击 文生图 选项');
  await aiInput(textToImageScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');

  await aiWaitFor(
    `右侧对话流中刚刚发送的“/文生图 ${textToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`,
    { timeoutMs: 180000 },
  );
  await aiAct('点击生成图片下方的 一对蓝色双引号 按钮')
  await aiTap('点击 更多 按钮');
  await aiAct('在AI功能弹窗里点击 图生图 选项');
  await aiInput(imageToImageScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');


  await aiWaitFor(
    `只检查右侧对话流中最新的“/图生图 ${imageToImageScenario.prompt}”消息卡片，左侧课件、上方或下方历史消息一律忽略。仅当这条消息卡片内的最终图片完整、清晰、稳定渲染，且图片内容是一只黑色的老虎时，才视为通过；同一张图片及同一消息卡片内必须完全不含“正在排队中～”、排队、生成中、加载中、加载图标、旋转图标、进度百分比、生成提示“小马良正在挥动他的魔法画笔！”或“中止任务”。任一条件不满足时必须继续等待，不得将其他消息中的已完成图片归属给该命令。`,
    { timeoutMs: 180_000, checkIntervalMs: 1000 },
  );

  await aiAssert(
    `只检查右侧对话流中最新的“/图生图 ${imageToImageScenario.prompt}”消息卡片，左侧课件、上方或下方历史消息一律忽略。仅当这条消息卡片内的最终图片完整、清晰、稳定渲染，且图片内容是一只黑色的老虎时，才视为通过；同一张图片及同一消息卡片内必须完全不含“正在排队中～”、排队、生成中、加载中、加载图标、旋转图标、进度百分比、生成提示“小马良正在挥动他的魔法画笔！”或“中止任务”。任一条件不满足时必须继续等待，不得将其他消息中的已完成图片归属给该命令。`,
  );
  await aiTap('点击左上角的 下课 按钮');
});

import { expect } from '@playwright/test';
import { test } from '@e2e/fixture';
import { textToImageScenario, imageToImageScenario } from '@e2e/testdata/scenarios';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以图生图', async ({ page, aiAct, aiAssert, aiTap, aiInput, aiWaitFor, endClassGuard }) => {
  await aiAct('点击带有 开始上课文本的 按钮');
  await aiAct('点击第一个课程分类下的第一个课程封面');
  await aiAct('点击 启动课件, 开始上课 按钮');
  await aiTap('点击 自动生成房间号 按钮');
  await aiAct('点击进入教室,等待教室加载完成');
  await aiAct('点击 更多 按钮');
  await aiAct('在AI功能弹窗里点击 文生图 选项');
  await aiInput(textToImageScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');

  await aiWaitFor(
    `右侧对话流中刚刚发送的“/文生图 ${textToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`,
    { timeoutMs: 180000 },
  );
  await aiAct('点击生成图片下方的 一对蓝色双引号 按钮')
  await aiAct('点击 更多 按钮');
  await aiAct('在AI功能弹窗里点击 图生图 选项');
  await aiInput(imageToImageScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');


  const aiFrame = page.frameLocator('iframe').first();
  const rightConversation = aiFrame.locator('body');

  await expect
    .poll(() => rightConversation.innerText(), {
      timeout: 30_000,
      intervals: [1000],
      message: `等待 /图生图 ${imageToImageScenario.prompt} 请求出现在右侧对话流`,
    })
    .toContain(imageToImageScenario.prompt);

  let sawGeneratingState = false;
  await expect
    .poll(
      async () => {
        const progressCount = await aiFrame.getByText(/^\d+%$/).count();
        const generatingMessageCount = await aiFrame
          .getByText('小马良正在挥动他的魔法画笔！', { exact: true })
          .count();
        const stopTaskCount = await aiFrame.getByText('中止任务', { exact: true }).count();
        sawGeneratingState ||= progressCount > 0 || generatingMessageCount > 0 || stopTaskCount > 0;
        return {
          sawGeneratingState,
          progressCount,
          generatingMessageCount,
          stopTaskCount,
        };
      },
      { timeout: 180_000, intervals: [1000], message: '等待图生图任务完成' },
    )
    .toEqual({
      sawGeneratingState: true,
      progressCount: 0,
      generatingMessageCount: 0,
      stopTaskCount: 0,
    });

  await aiWaitFor(
    `只观察右侧对话流中最新的“/图生图 ${imageToImageScenario.prompt}”任务。确认对应图片已经完整、清晰并稳定渲染，没有任何进度层、加载状态或生成提示；不要检查左侧课件或之前的图片。`,
    { timeoutMs: 30_000, checkIntervalMs: 3000 },
  );

  await aiAssert(
    `只检查右侧对话流中刚刚发送的“/图生图 ${textToImageScenario.prompt}”这条消息对应的最终图片：图片内容必须是一只${imageToImageScenario.prompt}（老虎），不能检查左侧已有图片；该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`,
  );
  await aiAct('点击左上角的 下课 按钮');
});

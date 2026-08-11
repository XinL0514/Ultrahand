import { expect } from '@playwright/test';
import { test } from '@e2e/fixture';
import { textToImageScenario } from '@e2e/testdata/scenarios';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生图', async ({ page, aiAct, aiAssert, aiTap, aiInput, endClassGuard }) => {
  await aiAct('点击带有 开始上课文本的 按钮');
  await aiAct('点击第一个课程分类下的第一个课程封面');
  await aiAct('点击 启动课件, 开始上课 按钮');
  await aiTap('点击 自动生成房间号 按钮');
  await aiAct('点击进入教室,等待教室加载完成');
  await aiAct('点击 更多 按钮');
  await aiAct('在AI功能弹窗里点击 文生图 选项');
  await aiInput(textToImageScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');

  const aiFrame = page.frameLocator('iframe').first();
  const aiBody = aiFrame.locator('body');

  // 页面会把"/文生图"和"tiger"拆成不同文本节点，因此检查 iframe 整体文本。
  await expect
    .poll(async () => aiBody.innerText(), {
      timeout: 30_000,
      intervals: [1000],
      message: `等待本次 /文生图 ${textToImageScenario.prompt} 请求出现在右侧对话中`,
    })
    .toContain(textToImageScenario.prompt);

  // 文生图结果会作为紧随命令后的助手消息渲染，而不是嵌在用户命令消息中。
  const generatedImage = aiFrame
    .getByRole('listitem')
    .filter({ has: aiFrame.getByText('神笔马良', { exact: true }) })
    .getByRole('img', { name: '图片', exact: true })
    .last();
  await expect(generatedImage).toBeVisible({ timeout: 180_000 });

  // 图片节点可见时可能仍在下载或解码；只在浏览器完成绘制后执行视觉断言。
  await expect
    .poll(
      () =>
        generatedImage.evaluate(
          (image: HTMLImageElement) =>
            image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
        ),
      {
        timeout: 30_000,
        intervals: [500, 1000],
        message: '等待文生图结果完成下载、解码和渲染',
      },
    )
    .toBe(true);
  await page.waitForTimeout(3_000);

  // 图片出现后，右侧对话不应仍显示进行中的任务状态。
  await expect(aiFrame.getByText('中止任务', { exact: true })).toHaveCount(0);
  await expect(aiFrame.getByText(/^\d+%$/)).toHaveCount(0);

  await aiAssert(
    `只检查右侧对话流中刚刚发送的"/文生图 ${textToImageScenario.prompt}"这条消息对应的最终图片：图片内容必须是一只老虎（${textToImageScenario.prompt}），不能检查左侧已有图片；该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`,
  );
  await aiAct('点击左上角的 下课 按钮');
});

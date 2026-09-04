import { test } from '@e2e/fixture';
import { textToImageScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生图', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const textToImageCondition = `右侧对话流中刚刚发送的“/文生图 ${textToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生图',
        prompt: textToImageScenario.prompt,
        completionText: textToImageCondition,
        assertText: `只检查右侧对话流中刚刚发送的“/文生图 ${textToImageScenario.prompt}”这条消息对应的最终图片：图片内容必须是一只老虎（${textToImageScenario.prompt}），不能检查左侧已有图片；该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`,
      },
    ],
  );
});

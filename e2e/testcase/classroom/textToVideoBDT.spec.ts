import { test } from '@e2e/fixture';
import { textToVideoScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生视频', { tag: '@smoke' }, async ({ aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const textToVideoCondition = `右侧对话流中刚刚发送的“/文生视频 ${textToVideoScenario.prompt}”已经完成：对应的最终视频已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  await runClassroomGenerationFlow(
    { aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生视频',
        prompt: textToVideoScenario.prompt,
        completionText: textToVideoCondition,
        checkIntervalMs: 10_000,
      },
    ],
  );
});

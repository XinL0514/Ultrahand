import { test } from '@e2e/fixture';
import { textToVideoScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(720_000);
});

test('可以文生视频', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const textToVideoCondition = `右侧对话流中刚刚发送的“/文生视频 ${textToVideoScenario.prompt}”已经完成：对应的最终视频已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  const textToVideoAssertText = `只检查右侧对话流中刚刚发送的“/文生视频 ${textToVideoScenario.prompt}”这条消息对应的最终的视频卡片：卡片中有封面, 有播放按钮, 并且该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生视频',
        prompt: textToVideoScenario.prompt,
        completionText: textToVideoCondition,
        checkIntervalMs: 10_000,
        timeoutMs: 360_000,
        assertText: textToVideoAssertText,
      },
    ],
  );
});

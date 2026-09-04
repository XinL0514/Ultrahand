import { test } from '@e2e/fixture';
import { textToMusicScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生音乐', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const textToMusicCondition = `右侧对话流中刚刚发送的“/文生音乐 ${textToMusicScenario.prompt}”已经完成：对应的最终音乐已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比`;
  const textToMusicAssertText = `只检查右侧对话流中刚刚发送的“/文生音乐 ${textToMusicScenario.prompt}”这条消息对应的最终的音乐卡片：卡片中有封面, 有播放按钮, 有时长,和进度条 并且该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生音乐',
        prompt: textToMusicScenario.prompt,
        completionText: textToMusicCondition,
        checkIntervalMs: 5_000,
        assertText: textToMusicAssertText,
      },
    ],
  );
});

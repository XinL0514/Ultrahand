import { test } from '@e2e/fixture';
import { pictureToGameTextToImageScenario, pictureToGameScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(600_000);
});

test('可以图生游戏', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const pictureToGamecompletionText = `右侧对话流中刚刚发送的“/文生图 ${pictureToGameTextToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  const pictureToGameassertText = `只检查右侧对话流中最新的“/图生游戏 ${pictureToGameScenario.prompt}”消息卡片，对应的游戏卡片已经真实渲染出来并且清晰可见，游戏有封面, 有标题, 有开始游戏按钮, 不再显示排队、生成中、加载中、空白游戏或进度百分比；不要根据左侧已有图片或视频判断完成`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生图',
        prompt: pictureToGameTextToImageScenario.prompt,
        completionText: pictureToGamecompletionText, 
      },
      {
        quotePreviousContent: true,
        optionLabel: '图生游戏',
        prompt: pictureToGameScenario.prompt,
        completionText: pictureToGameassertText,
        assertText: pictureToGameassertText,
        timeoutMs: 420_000,
        checkIntervalMs: 40_000
      },
    ],
  );
});

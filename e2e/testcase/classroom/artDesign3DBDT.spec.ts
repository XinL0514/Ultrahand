import { test } from '@e2e/fixture';
import { artDesign3DModelTextToImageScenario, artDesign3DModelScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以AI艺术3D模型', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const textToImagecompletionText = `右侧对话流中刚刚发送的“/文生图 ${artDesign3DModelTextToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  const artDesign3DModelcompletionText = `只检查右侧对话流中刚刚发送的“/AI艺术3D模型 ${artDesign3DModelScenario.prompt}”这条消息对应的最终图片：对应的最终视频已经真实渲染出来并且清晰可见, 不再显示排队、生成中、加载中、空白视频或进度百分比；不要根据左侧已有图片或视频判断完成`;
  const artDesign3DModelassertText = `只检查右侧对话流中最新的“/AI艺术3D模型 ${artDesign3DModelScenario.prompt}”消息卡片，对应的最终视频已经真实渲染出来并且清晰可见，视频封面有深色背景和浅色背景且是老虎的形状, 中间有一个播放按钮, 不再显示排队、生成中、加载中、空白视频或进度百分比；不要根据左侧已有图片或视频判断完成`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生图',
        prompt: artDesign3DModelTextToImageScenario.prompt,
        completionText: textToImagecompletionText,
        checkIntervalMs: 10_000,
      },
      {
        quotePreviousContent: true,
        optionLabel: 'AI艺术3D模型',
        prompt: artDesign3DModelScenario.prompt,
        completionText: artDesign3DModelcompletionText,
        assertText: artDesign3DModelassertText,
      }
    ],
  );
});

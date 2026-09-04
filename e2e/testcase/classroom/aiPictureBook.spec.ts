import { test } from '@e2e/fixture';
import { aiPictureBookTextToImageScenario, aiPictureBookScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(600_000);
});

test('可以AI绘本', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const aiPictureBookcompletionText = `右侧对话流中刚刚发送的“/文生图 ${aiPictureBookTextToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  const aiPictureBookassertText = `只检查右侧对话流中最新的“/绘本创作 ${aiPictureBookScenario.prompt}”消息卡片，对应的最终绘本已经真实渲染出来并且清晰可见，绘本有封面, 有标题, 有查看按钮, 不再显示排队、生成中、加载中、空白绘本或进度百分比；不要根据左侧已有图片或视频判断完成`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生图',
        prompt: aiPictureBookTextToImageScenario.prompt,
        completionText: aiPictureBookcompletionText, 
      },
      {
        quotePreviousContent: true,
        optionLabel: '绘本创作',
        prompt: aiPictureBookScenario.prompt,
        completionText: aiPictureBookassertText,
        assertText: aiPictureBookassertText,
        timeoutMs: 420_000,
        checkIntervalMs: 40_000
      },
    ],
  );
});

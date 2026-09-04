import { test } from '@e2e/fixture';
import { visualExplanationScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(600_000);
});

test('可以可视化讲解', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const visualExplanationcompletionText = `只检查右侧对话流中最新的“/可视化讲解 ${visualExplanationScenario.prompt}”消息卡片，对应的最终可视化讲解已经真实渲染出来并且清晰可见，可视化讲解有封面, 有标题, 有播放按钮, 不再显示排队、生成中、加载中、空白可视化讲解或进度百分比；不要根据左侧已有图片或视频判断完成`;
  const visualExplanationassertText = `只检查右侧对话流中最新的“/可视化讲解 ${visualExplanationScenario.prompt}”消息卡片，对应的最终可视化讲解已经真实渲染出来并且清晰可见，可视化讲解有封面, 卡片中有标题, 有 皮影戏 字样, 有播放按钮, 不再显示排队、生成中、加载中、空白可视化讲解或进度百分比；不要根据左侧已有图片或视频判断完成`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '可视化讲解',
        prompt: visualExplanationScenario.prompt,
        completionText: visualExplanationcompletionText,
        assertText: visualExplanationassertText,
        timeoutMs: 420_000,
        checkIntervalMs: 30_000 
      }
    ],
  );
});

import { test } from '@e2e/fixture';
import { explodedViewDiagramScenario, explodedViewDiagramTextToImageScenario } from '@e2e/testdata/scenarios/classroom';
import { runClassroomGenerationFlow } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以解构图', { tag: '@smoke' }, async ({ page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  const explodedViewTextToImageCondition = `右侧对话流中刚刚发送的“/文生图 ${explodedViewDiagramTextToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  const explodedViewCondition = `只检查右侧对话流中最新的“/解构图 ${explodedViewDiagramScenario.prompt}”消息卡片，左侧课件、上方或下方历史消息一律忽略。仅当这条消息卡片内的最终图片完整、清晰、稳定渲染，且图片内容是一个陀螺的解构图，才视为通过；同一张图片及同一消息卡片内必须完全不含“正在排队中～”、排队、生成中、加载中、加载图标、旋转图标、进度百分比、空白图片, 生成提示“小马良正在挥动他的魔法画笔！”或“中止任务”。任一条件不满足时必须继续等待，不得将其他消息中的已完成图片归属给该命令。`;
  await runClassroomGenerationFlow(
    { page, aiAct, aiTap, aiInput, aiWaitFor, aiAssert },
    [
      {
        optionLabel: '文生图',
        prompt: explodedViewDiagramTextToImageScenario.prompt,
        completionText: explodedViewTextToImageCondition,
      },
      {
        quotePreviousImage: true,
        optionLabel: '解构图',
        prompt: explodedViewDiagramScenario.prompt,
        completionText: explodedViewCondition,
        timeoutMs: 360_000,
      },
    ],
  );
});

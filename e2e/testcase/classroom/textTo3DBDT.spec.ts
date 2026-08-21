import { test } from '@e2e/fixture';
import { textTo3DScenario } from '@e2e/testdata/scenarios/classroom';
import { enterFirstClassroom, openAiPanelOption, exitClassroom, waitForStableThenAssert } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(500_000);
});

test('可以文生3D', { tag: '@smoke' }, async ({ aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  await enterFirstClassroom({ aiTap, aiWaitFor, aiAct });
  await openAiPanelOption({ aiTap, aiAct, aiWaitFor }, '文生3D');
  await aiInput(textTo3DScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');

  const textTo3DCondition = `右侧对话流中刚刚发送的“/文生3D ${textTo3DScenario.prompt}”已经完成：对应的最终视频已经真实渲染出来并且清晰可见，视频封面有深色背景和浅色背景, 中间有一个播放按钮, 不再显示排队、生成中、加载中、空白视频或进度百分比；不要根据左侧已有图片或视频判断完成`;
  await waitForStableThenAssert(
    { aiWaitFor, aiAssert },
    textTo3DCondition,
    textTo3DCondition,
    { timeoutMs: 300_000, checkIntervalMs: 30000 },
  );
  await exitClassroom({ aiTap });
});

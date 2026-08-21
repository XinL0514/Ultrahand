import { test } from '@e2e/fixture';
import { textToVideoScenario } from '@e2e/testdata/scenarios/classroom';
import { enterFirstClassroom, openAiPanelOption, exitClassroom, waitForStableThenAssert } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生视频', { tag: '@smoke' }, async ({ aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  await enterFirstClassroom({ aiAct, aiTap, aiWaitFor });
  await openAiPanelOption({ aiTap, aiAct, aiWaitFor }, '文生视频');
  await aiInput(textToVideoScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');

  const textToVideoCondition = `右侧对话流中刚刚发送的“/文生视频 ${textToVideoScenario.prompt}”已经完成：对应的最终视频已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  await waitForStableThenAssert(
    { aiWaitFor, aiAssert },
    textToVideoCondition,
    textToVideoCondition,
    { timeoutMs: 180000, checkIntervalMs: 10000 },
  );
  
  await exitClassroom({ aiTap });
});

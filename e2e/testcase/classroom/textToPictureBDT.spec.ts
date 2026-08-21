import { test } from '@e2e/fixture';
import { textToImageScenario } from '@e2e/testdata/scenarios/classroom';
import { enterFirstClassroom, openAiPanelOption, exitClassroom, waitForStableThenAssert } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以文生图', { tag: '@smoke' }, async ({ aiAct, aiTap, aiInput, aiWaitFor, aiAssert, endClassGuard }) => {
  await enterFirstClassroom({ aiTap, aiWaitFor, aiAct });
  await openAiPanelOption({ aiTap, aiAct, aiWaitFor }, '文生图');
  await aiInput(textToImageScenario.prompt, '聊天输入框', { mode: 'append' });
  await aiTap('输入框右侧的纸飞机发送按钮');

  const textToImageCondition = `右侧对话流中刚刚发送的“/文生图 ${textToImageScenario.prompt}”已经完成：对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  await waitForStableThenAssert(
    { aiWaitFor, aiAssert },
    textToImageCondition,
    textToImageCondition,
    { timeoutMs: 180000, checkIntervalMs: 3000  },
  );

  await aiAssert(
    `只检查右侧对话流中刚刚发送的“/文生图 ${textToImageScenario.prompt}”这条消息对应的最终图片：图片内容必须是一只老虎（${textToImageScenario.prompt}），不能检查左侧已有图片；该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`,
  );
  await exitClassroom({ aiTap });
});

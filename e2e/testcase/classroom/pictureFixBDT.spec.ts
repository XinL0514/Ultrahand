import { test } from '@e2e/fixture';
import { pictureFixScenario } from '@e2e/testdata/scenarios/classroom';
import {
  enterFirstClassroom,
  openAiPanelOption,
  waitForChatAttachmentControls,
  waitForStableThenAssert,
} from './helpers';
import { uploadTestFilesByChooser } from '@e2e/helpers/fileUpload';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/profile');
  test.setTimeout(360_000);
});

test('可以照片修复', { tag: '@smoke' }, async ({ page, aiTap, aiInput, aiWaitFor, endClassGuard, aiRightClick, aiAssert }) => {
  await enterFirstClassroom({ page, aiTap, aiWaitFor });
  await waitForChatAttachmentControls({ aiWaitFor });
  await aiTap('点击聊天输入框右侧的 + 图片附件上传按钮', { cacheable: false });
  await uploadTestFilesByChooser(page, 'images/pictureFix.webp', () =>
    aiTap('点击 照片图库'),
  );
  await aiWaitFor('对应的最终图片已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成', {
    timeoutMs: 20_000,
  });
//   await page.pause(); // 此时手动在浏览器里右键图片
//   const pictureFixcompletionText = `只检查右侧对话流中最新的“/照片修复 ${pictureFixScenario.prompt}”消息卡片，在此条消息接下来的消息中, 不要拿刚才上传的图片去判断, 只去对应的最终照片已经真实渲染出来并且清晰可见, 不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片或视频判断完成`;
//   const pictureFixassertText = `对应的最终图片已经真实渲染出来并且清晰可见，照片风格变为带有色彩且清晰不再是黑白且观感较新，不再显示排队、生成中、加载中、空白图片或进度百分比；不要根据左侧已有图片判断完成`;
  await aiRightClick('右键对话流中的这个黑白图片')
  await aiTap('点击图片操作菜单中的“引用”选项');
  await openAiPanelOption({ page }, '照片修复');
  await aiInput(pictureFixScenario.prompt, '聊天输入框', { mode: 'append' });
  // ...选择“照片修复”、输入 prompt 后
  const command = `/照片修复 ${pictureFixScenario.prompt}`;

  await aiTap('输入框右侧的纸飞机发送按钮');

  // 先确认新命令消息已进入对话流
  await aiWaitFor(
    `只检查右侧对话流最底部刚新增的消息卡片：其中显示刚刚发送的“${command}”命令。
     这条消息不能是此前上传的黑白原图。`,
    { timeoutMs: 30_000 },
  );

  // 再等待这条命令自己的最终结果稳定完成
  const pictureFixCompletionText = `
    只检查右侧对话流中刚刚发送的“${command}”消息卡片。
    该命令的最终图片对比之前的图片比、清晰、稳定渲染，图片为彩色且观感较新；
    卡片内不显示排队、生成中、加载中、空白图片、进度百分比或中止任务。
    不要把此前上传的黑白原图、左侧课件或历史消息当作本次结果。
  `;

  await waitForStableThenAssert(
    { aiWaitFor },
    pictureFixCompletionText,
    pictureFixCompletionText,
    {
      timeoutMs: 180_000,
      checkIntervalMs: 10_000,
    },
  );
  await aiAssert(pictureFixCompletionText)
  await aiTap('点击左上角的 下课 按钮');
});

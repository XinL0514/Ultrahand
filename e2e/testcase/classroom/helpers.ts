import type { Page } from '@playwright/test';
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';

type ClassroomFixtures = Pick<PlayWrightAiFixtureType, 'aiTap' | 'aiWaitFor'> & { page: Page };
type ClassroomGenerationFixtures = Pick<
  PlayWrightAiFixtureType,
  'aiAct' | 'aiTap' | 'aiInput' | 'aiWaitFor' | 'aiAssert'
> & { page: Page };

const DEFAULT_GENERATION_TIMEOUT_MS = 180_000;
const DEFAULT_GENERATION_CHECK_INTERVAL_MS = 3_000;

/** 课堂 AI 面板工作流中的一个业务生成步骤。 */
export interface ClassroomGenerationStep {
  /** AI 功能菜单中显示的精确标签，例如“文生图”或“图生视频”。 */
  optionLabel: string;
  prompt: string;
  /** 用于等待刚发送命令的结果稳定下来的描述。 */
  completionText: string;
  /** 可选的业务专属断言，在完成状态断言后执行。 */
  assertText?: string;
  timeoutMs?: number;
  checkIntervalMs?: number;
  /** 选择此选项前，先引用上一步生成的内容。 */
  quotePreviousContent?: boolean;
  /** @deprecated 请使用 quotePreviousContent；保留此字段以兼容已有的图像生成用例。 */
  quotePreviousImage?: boolean;
}

/**
 * 点击"开始上课"、选第一个课件、自动生成房间号并进入教室，等到教室页面渲染完成。
 * classroom/*BDT.spec.ts 用例开头都是这一整段，抽出来避免话术漂移。
 */
export async function enterFirstClassroom({ page, aiTap, aiWaitFor }: ClassroomFixtures) {
  await aiTap('点击带有 开始上课文本的 按钮');
  await aiWaitFor(
    '课件选择页面已经加载完成，课件分类以及课件封面已经渲染出来，不再显示空白或加载中的转圈图标',
    { timeoutMs: 15000 },
  );
  // 缓存过一次错误坐标就会一直复用而不重新走视觉定位（曾误点到分类标签而非封面），
  // 这一步只在进课时跑一次，禁用缓存换取每次都重新定位的正确性。
  await aiTap('点击第一个课程分类下的第一个课程封面', { cacheable: false });
  await aiWaitFor('课件预览面板已经渲染完成，显示出 启动课件, 开始上课 按钮，不再只是课件选择弹窗', {
    timeoutMs: 15000,
  });
  await aiTap('点击 启动课件, 开始上课 按钮');
  await aiTap('点击 自动生成房间号 按钮');
  await aiWaitFor(
    '点击 自动生成房间号 按钮后，房间号输入框已经渲染出来，并且显示所生成的房间号',
    { timeoutMs: 30000 },
  );
  await aiTap('点击 立即进入');
  // 这里此前依赖视觉模型辨识整个右侧面板。加载完成后，浅紫色面板的视觉效果偶尔
  // 会被误判成 loading spinner；实际 DOM 已有固定的聊天入口。改用两个稳定的入口
  // 校验，既避免误判，也确保下游操作使用的聊天 iframe 真的就绪。
  await waitForChatPanelReady(page, 60_000);
}

const CHAT_FRAME_URL_FRAGMENT = '/chat/ai-chat';

/** 等待课堂右侧聊天 iframe 出现并完成首屏渲染。 */
async function getChatFrame(page: Page, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const chatFrame = page.frames().find((frame) => frame.url().includes(CHAT_FRAME_URL_FRAGMENT));
    if (chatFrame) return chatFrame;
    await page.waitForTimeout(250);
  }
  throw new Error(`未在 ${timeoutMs}ms 内找到课堂聊天 iframe`);
}

async function waitForChatPanelReady(page: Page, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  const chatFrame = await getChatFrame(page, timeoutMs);
  const remaining = () => Math.max(deadline - Date.now(), 1_000);

  await chatFrame.getByText('新建对话', { exact: true }).waitFor({
    state: 'visible',
    timeout: remaining(),
  });
  await chatFrame.getByText('课堂文件', { exact: true }).waitFor({
    state: 'visible',
    timeout: remaining(),
  });
  // 聊天工具栏比顶部导航晚一拍渲染；“更多”是 AI 工具菜单的稳定入口。
  await chatFrame.getByText('更多', { exact: true }).waitFor({
    state: 'visible',
    timeout: remaining(),
  });
  return chatFrame;
}

/**
 * 等待聊天输入框右侧的附件工具完成渲染。
 *
 * “更多”只用于切换 AI 工具；照片修复上传必须使用输入框右侧的“+”。这组控件
 * 比聊天 iframe 的导航和快捷工具栏晚加载，不能仅凭“新建对话”已出现就开始点击。
 */
export async function waitForChatAttachmentControls({
  aiWaitFor,
}: Pick<ClassroomFixtures, 'aiWaitFor'>) {
  await aiWaitFor(
    '右侧聊天输入框已经完整渲染：输入框右侧清晰可见并可点击语音输入图标、+ 图片附件上传按钮和纸飞机发送按钮；不要把输入框上方用于切换 AI 工具的“更多”按钮当成附件上传入口',
    { timeoutMs: 60_000, checkIntervalMs: 3_000 },
  );
}

/**
 * 打开聊天工具栏的“更多”菜单并点击其中的精确菜单项。
 *
 * 这里不走视觉定位：`更多` 是 iframe 内有稳定文案的唯一入口，且菜单里的小图标很密集，
 * 让视觉模型点击容易落到相邻项。
 */
async function openChatMoreMenuItem(page: Page, optionLabel: string) {
  const chatFrame = await getChatFrame(page);
  const moreButton = chatFrame.getByText('更多', { exact: true });
  await moreButton.waitFor({ state: 'visible', timeout: 10_000 });
  await moreButton.click({ timeout: 10_000 });

  // 聊天 iframe 中存在两套同名文案：底层的 ai-tool-item-text 会被快捷工具浮层
  // 遮住，而浮层内的 item-text 才是用户实际可点击的菜单项。
  const escapedLabel = optionLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const option = chatFrame.locator('.item-text').filter({ hasText: new RegExp(`^\\s*${escapedLabel}\\s*$`) });
  await option.waitFor({ state: 'visible', timeout: 10_000 });
  await option.click({ timeout: 10_000 });
}

/** 打开教室右下角的“更多”AI 功能菜单，并点击其中一个选项（如 文生图/图生图/文生音乐）。 */
export async function openAiPanelOption({ page }: { page: Page }, optionLabel: string) {
  await openChatMoreMenuItem(page, optionLabel);
  // 功能项会异步初始化 TinyMCE 编辑器；其内容在嵌套 iframe 内，而不是当前聊天
  // frame 的 input/textarea。不能在这里校验“/功能名”前缀，否则会在编辑器已打开
  // 但尚未被当前 frame 读取到时假超时，并触发 finally 中的下课。下一步 aiInput
  // 会直接以“聊天输入框”为目标操作编辑器。
}

/** 点击左上角"下课"按钮结束教室会话。UI 断言仍然要走这一步，endClassGuard 只是兜底，不是替代。 */
export async function exitClassroom({ aiTap }: Pick<ClassroomFixtures, 'aiTap'>) {
  await aiTap('点击左上角的 下课 按钮');
}

/**
 * 执行完整的课堂内生成工作流。
 *
 * 该函数集中处理原本会重复出现的菜单选择、消息发送、稳定完成检查、每个步骤的
 * 默认超时时间和界面清理。各测试用例仍在业务场景旁维护各自的提示词和语义断言。
 * `endClassGuard` 仍是 API 层面的兜底机制，测试用例仍须从测试夹具中解构它以启用该机制。
 */
export async function runClassroomGenerationFlow(
  fixtures: ClassroomGenerationFixtures,
  steps: readonly ClassroomGenerationStep[],
) {
  if (steps.length === 0) {
    throw new Error('runClassroomGenerationFlow 至少需要一个生成步骤');
  }

  const { page, aiAct, aiTap, aiInput, aiWaitFor } = fixtures;
  await enterFirstClassroom({ page, aiTap, aiWaitFor });

  let workflowError: unknown;
  try {
    for (const step of steps) {
      if (step.quotePreviousContent || step.quotePreviousImage) {
        await aiTap('点击生成图片下方的 一对蓝色双引号 按钮');
      }

      await openAiPanelOption({ page }, step.optionLabel);
      await aiInput(step.prompt, '聊天输入框', { mode: 'append' });
      await aiTap('输入框右侧的纸飞机发送按钮');
      await waitForStableThenAssert(
        { aiWaitFor },
        step.completionText,
        step.assertText ?? step.completionText,
        {
          timeoutMs: step.timeoutMs ?? DEFAULT_GENERATION_TIMEOUT_MS,
          checkIntervalMs: step.checkIntervalMs ?? DEFAULT_GENERATION_CHECK_INTERVAL_MS,
        },
      );
    }
  } catch (err) {
    workflowError = err;
    throw err;
  } finally {
    // 即使生成或断言失败，仍要执行界面层面的“下课”流程。
    // 按需启用的 endClassGuard 测试夹具会提供 API 兜底。
    try {
      await exitClassroom({ aiTap });
    } catch (cleanupError) {
      // 清理失败不得掩盖原始的生成或断言错误。
      // 测试结束后 endClassGuard 仍会执行，并记录其 API 清理结果。
      if (workflowError) {
        console.warn('课堂 UI 下课失败，保留原始工作流错误:', cleanupError);
      } else {
        throw cleanupError;
      }
    }
  }
}

type WaitForOptions = Parameters<PlayWrightAiFixtureType['aiWaitFor']>[1];
type AssertFixtures = Pick<PlayWrightAiFixtureType, 'aiWaitFor'>;

/**
 * aiWaitFor 判定"已完成"后，同一次生成任务的 UI 有时会在下一帧再抖动一下（消息刚回来、图片还没稳定渲染，
 * 甚至可能是把上一轮历史图误判成本轮结果的瞬时假阳性）。这里短暂 settle 后再用同一类 waitFor 复检，
 * 不再调用独立的 aiAssert：后者对同一画面可能得出与刚通过的 waitFor 相反的结论，造成假失败。
 * 复检失败不代表任务真的失败——它只说明第一次判定命中的是假阳性，真实生成可能才刚开始（比如 0%/15% 进度），
 * 所以复检失败时要回去用原本的总预算重新完整等待，而不是让复检自己的短超时直接判定整条用例失败。
 * 如果调用方提供了不同的业务断言，最后也用 aiWaitFor 进行验证。
 */
export async function waitForStableThenAssert(
  { aiWaitFor }: AssertFixtures,
  waitText: string,
  assertText: string,
  options: WaitForOptions & { settleMs?: number } = {},
) {
  const { settleMs = 1500, timeoutMs = 30_000, checkIntervalMs, ...waitOptions } = options;
  const deadline = Date.now() + timeoutMs;
  // checkIntervalMs 必须小于当次调用的 timeoutMs，否则 Midscene 会直接同步抛出配置校验错误
  // （"checkIntervalMs must be less than timeoutMs"），且这种错误不会进 Midscene 报告、只在 Playwright 报错里能看到。
  // 循环重试时剩余预算会越来越小，一旦小于调用方传入的 checkIntervalMs 就会踩中这个问题，必须按剩余预算动态收窄。
  const safeInterval = (forTimeoutMs: number) =>
    checkIntervalMs === undefined ? undefined : Math.max(1, Math.min(checkIntervalMs, Math.floor(forTimeoutMs / 2)));

  for (;;) {
    const remaining = Math.max(deadline - Date.now(), 1000);
    await aiWaitFor(waitText, { ...waitOptions, timeoutMs: remaining, checkIntervalMs: safeInterval(remaining) });
    await new Promise((resolve) => setTimeout(resolve, settleMs));

    const remainingAfterSettle = deadline - Date.now();
    if (remainingAfterSettle <= 0) return;

    try {
      const confirmTimeoutMs = Math.min(remainingAfterSettle, 15_000);
      await aiWaitFor(waitText, { timeoutMs: confirmTimeoutMs, checkIntervalMs: safeInterval(confirmTimeoutMs) });
      break; // 复检也通过，状态真的稳定了
    } catch {
      // 复检发现其实还在生成，不能当成任务失败——继续用剩余预算重新走完整等待
    }
  }

  if (assertText === waitText) return;

  const remainingForAssert = deadline - Date.now();
  if (remainingForAssert <= 0) {
    throw new Error('生成结果已稳定，但在总超时内未完成业务断言验证');
  }
  await aiWaitFor(assertText, {
    ...waitOptions,
    timeoutMs: remainingForAssert,
    checkIntervalMs: safeInterval(remainingForAssert),
  });
}

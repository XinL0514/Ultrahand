import type { Page } from '@playwright/test';
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';

type ClassroomFixtures = Pick<PlayWrightAiFixtureType, 'aiTap' | 'aiWaitFor' | 'aiAct'>;
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
export async function enterFirstClassroom({ aiTap, aiWaitFor }: ClassroomFixtures) {
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

  await aiWaitFor(
    '教室页面已经加载完成，右侧对话流IM/工具区域已经渲染出来，不再显示空白页面或加载中的转圈图标, 不显示欢迎使用神笔马良, 房间里的课件图片以及右侧对话流IM中的新建对话, 课堂文件等入口渲染完成, 右侧对话流IM不能处于空白页面 IM里要显示出来 新建对话, 课堂文件 以及显示出来输入框才能判定为页面加载完毕',
    { timeoutMs: 30000 },
  );
}

/** 打开教室右上角的"更多"AI功能弹窗，并点击其中一个选项（如 文生图/图生图/文生音乐）。 */
export async function openAiPanelOption(
  { page, aiTap }: Pick<ClassroomFixtures, 'aiTap'> & { page: Page },
  optionLabel: string,
) {
  await aiTap('点击 更多');
  // 选项是密集排列的小图标按钮，视觉模型即使在计划中正确读出了文字，也可能把点击坐标落在相邻项
  // （例如把“照片修复”点成“绘本创作”）。这里改用 AI 聊天 iframe 内的精确文本定位；click 会自动滚动
  // 到不可见的选项，但不会猜测相邻按钮。
  const chatFrame = page.frames().find((frame) => frame.url().includes('/chat/ai-chat'));
  if (!chatFrame) {
    throw new Error('AI 功能弹窗已打开，但未找到聊天 iframe');
  }
  const option = chatFrame.getByText(optionLabel, { exact: true });
  await option.waitFor({ state: 'visible', timeout: 10_000 });
  await option.click();

  // 同样通过 DOM 验证输入框值，避免视觉模型把“/绘本创作”误读成“/照片修复”。
  const commandPrefix = `/${optionLabel}`;
  await chatFrame.waitForFunction(
    (prefix) => {
      const valueStartsWithPrefix = Array.from(document.querySelectorAll('input, textarea')).some(
        (element) =>
          (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
          element.value.trimStart().startsWith(prefix),
      );
      const editableStartsWithPrefix = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable]')).some(
        (element) => element.isContentEditable && element.innerText.trimStart().startsWith(prefix),
      );
      return valueStartsWithPrefix || editableStartsWithPrefix;
    },
    commandPrefix,
    { timeout: 8_000 },
  );
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
  await enterFirstClassroom({ aiAct, aiTap, aiWaitFor });

  let workflowError: unknown;
  try {
    for (const step of steps) {
      if (step.quotePreviousContent || step.quotePreviousImage) {
        await aiTap('点击生成图片下方的 一对蓝色双引号 按钮');
      }

      await openAiPanelOption({ page, aiTap }, step.optionLabel);
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

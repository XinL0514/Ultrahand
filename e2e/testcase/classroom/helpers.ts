import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';

type ClassroomFixtures = Pick<PlayWrightAiFixtureType, 'aiTap' | 'aiWaitFor' | 'aiAct'>;

/**
 * 点击"开始上课"、选第一个课件、自动生成房间号并进入教室，等到教室页面渲染完成。
 * 三个 classroom/*BDT.spec.ts 用例开头都是这一整段，抽出来避免话术漂移。
 */
export async function enterFirstClassroom({ aiTap, aiWaitFor }: ClassroomFixtures) {
  await aiTap('点击带有 开始上课文本的 按钮');
  // 缓存过一次错误坐标就会一直复用而不重新走视觉定位（曾误点到分类标签而非封面），
  // 这一步只在进课时跑一次，禁用缓存换取每次都重新定位的正确性。
  await aiWaitFor(
    '课件选择页面已经加载完成，课件分类以及课件封面已经渲染出来，不再显示空白或加载中的转圈图标',
    { timeoutMs: 15000 },
  );
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
  { aiAct, aiTap, aiWaitFor }: Pick<ClassroomFixtures, 'aiAct' | 'aiTap' | 'aiWaitFor'>,
  optionLabel: string,
) {
  await aiTap('点击 更多');
  // 弹窗里存在文案相近的选项（如"文生3D" vs "AI艺术3D模型"、"图生图" vs "文生图"），必须要求文字完全匹配。
  // 点击后不要求模型在同一次 aiAct 里自证成功：面板点击后没有明显的高亮反馈，
  // 之前让模型自己验证会导致它误判"没点中"，转而重新点"更多"、盲目滚动来"自救"，
  // 反而打乱已经点对的状态，最终整个任务超出重试预算而失败。
  // 现在把"点击"和"验证"拆成两步：点完就结束，交给下面独立的 aiWaitFor 检查输入框前缀。
  await aiAct(
    `点击AI功能弹窗里选项文字完全等于"${optionLabel}"（不多不少这几个字）的那一项，注意和相近文案区分（比如字序相反的"图生图"/"文生图"、或额外带修饰词的"AI艺术3D模型"之类，都不是目标）。如果当前一屏没看到目标，才需要上下滚动弹窗查找。点击一次后立刻结束这个任务，不需要在本次任务里反复验证是否点中、也不要重新点击"更多"或再次滚动去重复确认，后续会有单独的检查步骤`,
    { cacheable: false },
  );
  await aiWaitFor(`聊天输入框里已经出现"/${optionLabel}"这个前缀文字，说明刚才选中的AI功能选项生效了`, {
    timeoutMs: 8000,
  });
}

/** 点击左上角"下课"按钮结束教室会话。UI 断言仍然要走这一步，endClassGuard 只是兜底，不是替代。 */
export async function exitClassroom({ aiTap }: Pick<ClassroomFixtures, 'aiTap'>) {
  await aiTap('点击左上角的 下课 按钮');
}

type WaitForOptions = Parameters<PlayWrightAiFixtureType['aiWaitFor']>[1];
type AssertFixtures = Pick<PlayWrightAiFixtureType, 'aiWaitFor' | 'aiAssert'>;

/**
 * aiWaitFor 判定"已完成"后，同一次生成任务的 UI 有时会在下一帧再抖动一下（消息刚回来、图片还没稳定渲染，
 * 甚至可能是把上一轮历史图误判成本轮结果的瞬时假阳性），紧跟着的 aiAssert 独立截图判断就可能命中这个瞬时态而误判失败。
 * 这里在 assert 前用同样的条件短暂 settle 后再复检一次。
 * 复检失败不代表任务真的失败——它只说明第一次判定命中的是假阳性，真实生成可能才刚开始（比如 0%/15% 进度），
 * 所以复检失败时要回去用原本的总预算重新完整等待，而不是让复检自己的短超时直接判定整条用例失败；
 * 只有总预算耗尽了，才交给最后的 aiAssert 自然报错。
 */
export async function waitForStableThenAssert(
  { aiWaitFor, aiAssert }: AssertFixtures,
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
    if (remainingAfterSettle <= 0) break; // 总预算已耗尽，交给下面的 aiAssert 做最终判定

    try {
      const confirmTimeoutMs = Math.min(remainingAfterSettle, 15_000);
      await aiWaitFor(waitText, { timeoutMs: confirmTimeoutMs, checkIntervalMs: safeInterval(confirmTimeoutMs) });
      break; // 复检也通过，状态真的稳定了
    } catch {
      // 复检发现其实还在生成，不能当成任务失败——继续用剩余预算重新走完整等待
    }
  }

  await aiAssert(assertText);
}

# Ultrahand

AI 驱动的 Web UI 自动化测试框架,基于 [Midscene.js](https://midscenejs.com/) + [Playwright](https://playwright.dev/)。

用自然语言描述操作(`aiAct`)、查询(`aiQuery`)和断言(`aiAssert`),Midscene 用视觉模型直接理解截图完成元素定位,不依赖 CSS/XPath 选择器,减少 UI 改版带来的用例维护成本。

被测应用是神笔马良(`aixmy.miaobi.cn`),用例主要覆盖登录、课程列表,以及教室内 AI 面板的文生图 / 图生图流程。

## 目录结构

```
├── playwright.config.ts        # Playwright 配置,含 Midscene reporter、登录态复用
├── tsconfig.json                # 配置了 @e2e/* 路径别名,指向 ./e2e/*
├── .env.example                 # 模型 API key + 测试账号 + 环境地址占位,复制为 .env 后填真实值
└── e2e/
    ├── global-setup.ts          # 用 AI 完成一次真实登录,保存 storageState 到 e2e/.auth/user.json
    ├── fixture.ts                # 注入 Midscene AI 方法(aiAct/aiQuery/aiAssert/...)到 Playwright test,
    │                             # 并提供 endClassGuard 兜底下课的 opt-in fixture
    ├── testdata/
    │   ├── environments.ts      # getEnvironment(): 读取 appBaseURL / classroomApiBaseURL
    │   ├── accounts.ts          # getTestAccount(role?): 读取测试账号密码,支持多个命名角色
    │   └── scenarios.ts         # 业务用例数据,如文生图/图生图的 prompt
    ├── login.spec.ts            # 登录用例
    ├── texttopicture.spec.ts / texttopictureBDT.spec.ts     # 文生图用例(两种断言写法,见下文)
    ├── picturetopicture.spec.ts / picturetopictureBDT.spec.ts  # 图生图用例
    └── BDT/
        └── courses.spec.ts, ...  # 对应 BDT 版本用例
```

## 快速开始

1. 安装依赖:

   ```bash
   npm install
   npm run install:browsers   # 下载 Chromium
   ```

2. 配置环境变量:

   ```bash
   cp .env.example .env
   ```

   编辑 `.env`:
   - 选择 Gemini 或 GPT-5 其中一组,填入真实的 `MIDSCENE_MODEL_*`(参考 [Midscene 模型配置文档](https://midscenejs.com/model-common-config.md))
   - 填入 `MIABI_TEST_PHONE` / `MIABI_TEST_PASSWORD`,一个可用于测试的账号密码
   - 如需在不同环境运行(默认是 `aixmy.miaobi.cn` / `maliang.miaobi.cn`),可选填 `MIABI_APP_BASE_URL` / `MIABI_CLASSROOM_API_BASE_URL` 覆盖,详见 `e2e/testdata/environments.ts`

3. 运行测试:

   ```bash
   npm test                                       # 跑全部用例
   npm run test:headed                            # 有头模式,方便观察
   npx playwright test e2e/login.spec.ts          # 只跑单个文件
   npx playwright test -g "可以文生图"              # 按用例名跑单个用例
   ```

   首次运行会先执行 `global-setup.ts`:用 AI 走一遍真实登录流程,并把登录态保存到 `e2e/.auth/user.json`,后续用例直接复用这个登录态,不需要每次都重新登录。如果登录状态异常,删掉这个文件即可强制重新登录。

4. 查看报告:

   ```bash
   npm run test:report
   ```

   Midscene 会额外生成一份 HTML 报告(运行结束时终端会打印路径,默认在 `midscene_run/report/`),里面能看到每一步的截图和 AI 的决策过程,调试用例失败时优先看这个,比 Playwright 自带的 trace 更直观。

## 写新用例

参考 `e2e/BDT/courses.spec.ts`,通过 `@e2e/*` 别名引入 fixture 和测试数据:

```ts
import { expect } from '@playwright/test';
import { test } from '@e2e/fixture';

test('用例名', async ({ page, aiAct, aiQuery, aiAssert, aiWaitFor }) => {
  await page.goto('/#/your-route');
  await aiAct('用自然语言描述一步操作,比如"点击搜索框,输入关键词,回车"');
  await aiAssert('用自然语言描述预期看到的结果');
});
```

可用方法参考 [Midscene Agent API](https://midscenejs.com/web-api-reference)。

### 普通用例 vs BDT 用例

部分流程同时存在两个版本,例如 `picturetopicture.spec.ts` 与 `BDT/picturetopictureBDT.spec.ts`:

- 普通版本用 Playwright 的 `expect.poll` 等显式轮询对话 iframe 里的 DOM 状态(比如检查文本、检查"中止任务"/进度百分比是否消失)判断任务完成,再执行 `aiAssert`。
- BDT 版本改用 Midscene 的 `aiWaitFor`,直接用一段详细的自然语言描述完成条件去等待同样的状态,再配合类似措辞的 `aiAssert`。

新增教室内 AI 面板相关用例时,参照最相近的一组现有用例选择写法,并保持自然语言 prompt 的措辞风格(这些描述是针对真实页面文案反复调整过的)。

### 教室内用例记得用 endClassGuard

任何进入教室上课的用例,都建议在测试参数里解构 `endClassGuard`(`e2e/fixture.ts` 中的 opt-in fixture)。它会在测试结束后,即使 UI 上点击"下课"失败或用例提前中断,也通过 `classroomApiBaseURL` 接口用捕获到的 `roomKey` 兜底强制下课,避免教室卡在"上课中"状态。

## 已知限制

- Midscene 目前不支持 Anthropic/Claude 作为视觉定位模型,本项目使用 Gemini/GPT-5。
- 登录表单的真实文案/是否有验证码等细节以 `global-setup.ts` 首次真实运行结果为准,如遇登录失败,优先调整其中的自然语言描述,而非底层架构。
- 测试目前是串行执行(`playwright.config.ts` 中 `fullyParallel: false`, `workers: 1`),因为多个用例共用同一个教室/账号流程,并行跑容易互相冲突。

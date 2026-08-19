# Ultrahand

AI 驱动的 Web UI 自动化测试框架,基于 [Midscene.js](https://midscenejs.com/) + [Playwright](https://playwright.dev/)。

用自然语言描述操作(`aiAct`)、查询(`aiQuery`)和断言(`aiAssert`),Midscene 用视觉模型直接理解截图完成元素定位,不依赖 CSS/XPath 选择器,减少 UI 改版带来的用例维护成本。

被测应用是神笔马良(`aixmy.miaobi.cn`),用例主要覆盖登录、课程列表,以及教室内 AI 面板的文生图 / 图生图 / 文生音乐流程。

## 目录结构

```
├── playwright.config.ts        # Playwright 配置,含 Midscene reporter、登录态复用
├── tsconfig.json                # 配置了 @e2e/* 路径别名,指向 ./e2e/*
├── .env.example                 # 模型 API key + 测试账号 + 环境地址占位,复制为 .env 后填真实值
└── e2e/
    ├── global-setup.ts          # 用 AI 完成真实登录(按账号池逐个账号登录),保存 storageState 到 e2e/.auth/user-<slot>.json
    ├── fixture.ts                # 注入 Midscene AI 方法(aiAct/aiQuery/aiAssert/...)到 Playwright test,
    │                             # 按 worker 分配账号槽位的 storageState fixture,
    │                             # 并提供 endClassGuard 兜底下课的 opt-in fixture
    ├── testdata/
    │   ├── environments.ts      # getEnvironment(): 读取 appBaseURL / classroomApiBaseURL
    │   ├── accounts.ts          # getTestAccount(role?): 读取测试账号密码,支持多个命名角色;
    │   │                        # getTestAccountPoolSize() / getTestAccountForSlot(slot): 并发账号池
    │   └── scenarios/
    │       └── classroom.ts    # 教室内 AI 面板用例数据,如文生图/图生图/文生音乐的 prompt
    └── testcase/
        ├── basic/
        │   └── login.spec.ts            # 登录用例
        └── classroom/
            ├── courses.spec.ts          # 课程列表用例
            ├── texttopictureBDT.spec.ts    # 文生图用例
            ├── picturetopictureBDT.spec.ts # 文生图 → 引用生成图 → 图生图 的完整用例
            └── texttomusicBDT.spec.ts      # 文生音乐用例
```

按业务域分目录:`testcase/basic/` 放不依赖教室的通用流程(登录等),`testcase/classroom/` 放需要先进入教室上课的 AI 面板用例。

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
   - 如需并发执行(见下文"并发执行"一节),额外填入 `MIABI_TEST_ACCOUNT_POOL_SIZE=N` 及 `MIABI_TEST_PHONE_1`/`_PASSWORD_1` … `_N` 这 N 个账号;不填则默认单账号串行,和现状一致
   - 如需在不同环境运行(默认是 `aixmy.miaobi.cn` / `maliang.miaobi.cn`),可选填 `MIABI_APP_BASE_URL` / `MIABI_CLASSROOM_API_BASE_URL` 覆盖,详见 `e2e/testdata/environments.ts`

3. 运行测试:

   ```bash
   npm test                                                       # 跑全部用例
   npm run test:smoke                                             # 只跑标了 @smoke 的冒烟用例
   npm run test:headed                                            # 有头模式,方便观察
   npx playwright test e2e/testcase/basic/login.spec.ts          # 只跑单个文件
   npx playwright test -g "可以文生图"                              # 按用例名跑单个用例
   ```

   首次运行会先执行 `global-setup.ts`:用 AI 走一遍真实登录流程(账号池里每个账号各登录一次),并把每个账号的登录态分别保存到 `e2e/.auth/user-<slot>.json`,后续用例直接复用对应登录态,不需要每次都重新登录。如果登录状态异常,删掉对应文件(或整个 `e2e/.auth/` 目录)即可强制重新登录。

4. 查看报告:

   ```bash
   npm run test:report
   ```

   Midscene 会额外生成一份 HTML 报告(运行结束时终端会打印路径,默认在 `midscene_run/report/`),里面能看到每一步的截图和 AI 的决策过程,调试用例失败时优先看这个,比 Playwright 自带的 trace 更直观。

## 缓存

`e2e/fixture.ts` 里给 `PlaywrightAiFixture` 开启了 `cache: true`:当页面没有变化时,Midscene 会复用上一次运行时缓存的元素定位 / `aiAct` 执行计划,而不是每一步都重新走一次 AI 推理,这样能显著加快用例执行速度、减少模型调用开销。

- 缓存文件按"用例文件 + 用例名"生成,存在 `midscene_run/cache/testcase/**/*.cache.yaml`,例如 `midscene_run/cache/testcase/classroom/texttopictureBDT.spec.ts(可以文生图).cache.yaml`。
- 整个 `midscene_run/` 目录都在 `.gitignore` 里,缓存文件不会被提交,每个人本地各自生成。
- 如果页面结构变化导致缓存的定位/计划失效,Midscene 会自动探测并回退到重新推理,一般不需要手动干预。
- 如果怀疑是缓存导致的定位错误(比如页面改版后用例开始莫名失败),可以删掉对应的 `.cache.yaml` 文件(或整个 `midscene_run/cache/` 目录)强制下次重新生成。

## 写新用例

参考 `e2e/testcase/classroom/courses.spec.ts`,通过 `@e2e/*` 别名引入 fixture 和测试数据。新用例放到 `e2e/testcase/basic/` 或 `e2e/testcase/classroom/` 下(或按业务域新建子目录):

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

### 标记冒烟用例

给用例加第二个参数 `{ tag: '@smoke' }` 即可标记为冒烟用例,`npm run test:smoke`(即 `playwright test --grep @smoke`)只会跑带这个标签的用例:

```ts
test('用例名', { tag: '@smoke' }, async ({ page, aiAct, aiAssert }) => {
  ...
});
```

当前冒烟集:`basic/login.spec.ts`(登录)、`classroom/courses.spec.ts`(课程列表)、`classroom/texttopictureBDT.spec.ts`(文生图)。

### 教室内 AI 面板用例的写法

`testcase/classroom/` 下的用例统一用 Midscene 的 `aiWaitFor` 等待任务完成:先用一段详细的自然语言描述目标状态(比如"对应图片已渲染完成、不再显示排队/生成中/进度百分比"),等待条件满足后再执行措辞类似的 `aiAssert`。新增用例时保持这套写法和现有的自然语言 prompt 措辞风格(这些描述是针对真实页面文案反复调整过的)。

其中 `picturetopictureBDT.spec.ts` 是一个连续流程:先执行文生图,等图片生成后点击其下方的引用按钮,再基于这张图做图生图断言;不是两个独立场景,新增类似"基于已有结果继续操作"的用例可以参考它的结构。

### 教室内用例记得用 endClassGuard

任何进入教室上课的用例,都建议在测试参数里解构 `endClassGuard`(`e2e/fixture.ts` 中的 opt-in fixture)。它会在测试结束后,即使 UI 上点击"下课"失败或用例提前中断,也通过 `classroomApiBaseURL` 接口用捕获到的 `roomKey` 兜底强制下课,避免教室卡在"上课中"状态。

## 并发执行

默认不设置 `MIABI_TEST_ACCOUNT_POOL_SIZE` 时,套件是单账号 / 单 worker 串行执行,和历史行为完全一致。

要启用并发,在 `.env` 里设置账号池:

```bash
MIABI_TEST_ACCOUNT_POOL_SIZE=3
MIABI_TEST_PHONE_1=...
MIABI_TEST_PASSWORD_1=...
MIABI_TEST_PHONE_2=...
MIABI_TEST_PASSWORD_2=...
MIABI_TEST_PHONE_3=...
MIABI_TEST_PASSWORD_3=...
```

原理:
- `playwright.config.ts` 里 `workers` 等于账号池大小(`getTestAccountPoolSize()`),`fullyParallel: true`
- `e2e/global-setup.ts` 会依次登录池里的每个账号,分别保存 `e2e/.auth/user-0.json`、`user-1.json` … `user-<N-1>.json`
- `e2e/fixture.ts` 覆盖了 Playwright 内置的 `storageState` fixture,按 `testInfo.parallelIndex` 把每个 worker 固定绑定到一个账号槽位,且这个绑定在 worker 整个生命周期内不变

因为并发 worker 之间账号互不相同,自然就不会共用同一个登录态/教室会话,`testcase/classroom/` 下那些固定"点击第一个课程 + 自动生成房间号"的用例也就不会互相抢课或抢教室,不需要额外给用例加唯一化逻辑。

## 已知限制

- Midscene 目前不支持 Anthropic/Claude 作为视觉定位模型,本项目使用 Gemini/GPT-5。
- 登录表单的真实文案/是否有验证码等细节以 `global-setup.ts` 首次真实运行结果为准,如遇登录失败,优先调整其中的自然语言描述,而非底层架构。
- 测试默认单账号 / 串行执行;配置账号池(见上文"并发执行"一节)后可安全并发,每个 worker 各用各的账号,不会互相冲突。

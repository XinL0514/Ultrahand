# Ultrahand

AI 驱动的 Web UI 自动化测试框架,基于 [Midscene.js](https://midscenejs.com/) + [Playwright](https://playwright.dev/)。

用自然语言描述操作(`aiAct`)、查询(`aiQuery`)和断言(`aiAssert`),Midscene 用视觉模型直接理解截图完成元素定位,不依赖 CSS/XPath 选择器,减少 UI 改版带来的用例维护成本。

## 目录结构

```
├── playwright.config.ts   # Playwright 配置,含 Midscene reporter、登录态复用
├── .env.example           # 模型 API key + 测试账号占位,复制为 .env 后填真实值
└── e2e/
    ├── global-setup.ts    # 用 AI 完成一次真实登录,保存 storageState
    ├── fixture.ts         # 注入 Midscene AI 方法到 Playwright test
    └── courses.spec.ts    # 示例用例:课程列表加载
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

3. 运行测试:

   ```bash
   npm test
   ```

   首次运行会先执行 `global-setup.ts`:用 AI 走一遍真实登录流程,并把登录态保存到 `e2e/.auth/user.json`,后续用例直接复用这个登录态,不需要每次都重新登录。

4. 查看报告:

   ```bash
   npm run test:report
   ```

   Midscene 会额外生成一份 HTML 报告(运行结束时终端会打印路径,默认在 `midscene_run/report/`),里面能看到每一步的截图和 AI 的决策过程,调试用例失败时优先看这个。

## 写新用例

参考 `e2e/courses.spec.ts`:

```ts
import { expect } from '@playwright/test';
import { test } from './fixture';

test('用例名', async ({ page, aiAct, aiQuery, aiAssert, aiWaitFor }) => {
  await page.goto('/#/your-route');
  await aiAct('用自然语言描述一步操作,比如"点击搜索框,输入关键词,回车"');
  await aiAssert('用自然语言描述预期看到的结果');
});
```

可用方法参考 [Midscene Agent API](https://midscenejs.com/web-api-reference)。

## 已知限制

- Midscene 目前不支持 Anthropic/Claude 作为视觉定位模型,本项目使用 Gemini/GPT-5。
- 登录表单的真实文案/是否有验证码等细节以 `global-setup.ts` 首次真实运行结果为准,如遇登录失败,优先调整其中的自然语言描述,而非底层架构。

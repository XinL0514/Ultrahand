# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Ultrahand is an AI-driven Web UI end-to-end testing framework built on [Midscene.js](https://midscenejs.com/) + Playwright. Tests describe actions (`aiAct`), queries (`aiQuery`), and assertions (`aiAssert`) in natural language (Chinese); Midscene uses a vision model to locate elements directly from screenshots instead of CSS/XPath selectors, which reduces test maintenance when the UI changes.

The target application under test is 神笔马良 (a classroom / AI teaching tool at `aixmy.miaobi.cn`), with an in-classroom AI panel that supports 文生图 (text-to-image) and 图生图 (image-to-image) generation.

## Commands

```bash
npm install
npm run install:browsers   # downloads Chromium (required once)

npm test                   # run full suite (playwright test)
npm run test:headed        # run with a visible browser
npm run test:report        # open the Playwright HTML report

npx playwright test e2e/testcase/basic/login.spec.ts   # run a single file
npx playwright test -g "可以文生图"            # run a single test by name
```

Setup before running tests: `cp .env.example .env`, then fill in:
- One vision-model provider (`MIDSCENE_MODEL_BASE_URL` / `_API_KEY` / `_NAME` / `_FAMILY`) — Gemini or GPT-5. **Midscene does not support Claude/Anthropic as the vision-locating model.**
- `MIABI_TEST_PHONE` / `MIABI_TEST_PASSWORD` — a working test account.

`npm test` first runs `e2e/global-setup.ts` once: it performs a real AI-driven login and saves the session to `e2e/.auth/user.json`, which all specs then reuse via `storageState` (see `playwright.config.ts`) so tests don't each re-login. Delete that file to force a fresh login.

After a failure, check the Midscene HTML report first (path printed at the end of the run, defaults under `midscene_run/report/`) — it shows each step's screenshot and the AI's decision, which is more useful for debugging than the Playwright trace alone.

## Architecture

- `playwright.config.ts` — single `chromium` project, `fullyParallel: false` / `workers: 1` (tests are not safe to run concurrently — they share one classroom/account flow), `baseURL` comes from `getEnvironment().appBaseURL`, `locale: 'zh-CN'`.
- `e2e/global-setup.ts` — logs in once via a `PlaywrightAgent` (Midscene) driving natural-language steps, persists `storageState`.
- `e2e/fixture.ts` — extends Playwright's `test` with:
  - Midscene's `PlaywrightAiFixture` (`aiAct`, `aiQuery`, `aiAssert`, `aiTap`, `aiInput`, `aiWaitFor`, `recordToReport`, ...), with `cache: true` to reuse element locations/plans across unchanged pages and skip redundant AI round-trips. Cache files are written per spec-file+test-name under `midscene_run/cache/testcase/**/*.cache.yaml` (gitignored, regenerated locally per machine); Midscene auto-invalidates a cached entry when the page has drifted, but if a test starts failing for no obvious reason after a UI change, deleting the relevant `.cache.yaml` (or all of `midscene_run/cache/`) to force fresh AI inference is a reasonable first debugging step.
  - `endClassGuard` — an opt-in fixture (`{ auto: false }`, must be destructured explicitly in a test) that sniffs the `roomKey` off outgoing requests and, after the test body finishes, force-ends the classroom session via the `classroomApiBaseURL` API using the auth token from `localStorage`. This is a safety net for when the UI-driven "下课" (end class) click fails silently, so a flaky test doesn't leave a classroom stuck in "in session". Any spec that enters a classroom should destructure and use `endClassGuard`.
- `e2e/testdata/` — fixture/config data, read from environment variables with defaults, not hardcoded per-test:
  - `environments.ts` — `getEnvironment()` → `{ appBaseURL, classroomApiBaseURL }`, overridable via `MIABI_APP_BASE_URL` / `MIABI_CLASSROOM_API_BASE_URL`.
  - `accounts.ts` — `getTestAccount(role?)` → `{ phone, password }`, read from `MIABI_TEST_PHONE`/`MIABI_TEST_PASSWORD`, or `_<ROLE>`-suffixed variants for additional named accounts (e.g. `getTestAccount('login')` reads `MIABI_TEST_PHONE_LOGIN`). Throws if the corresponding env vars are unset.
  - `scenarios/classroom.ts` — plain business test-case data for classroom AI-panel flows (e.g. text-to-image, image-to-image, text-to-music prompts), unrelated to environment/account config.
- Path alias `@e2e/*` → `./e2e/*` (see `tsconfig.json`); specs import fixtures/testdata via `@e2e/...` rather than relative paths.
- `e2e/testcase/` — specs grouped by business domain:
  - `basic/` — flows that don't require entering a classroom (e.g. `login.spec.ts`).
  - `classroom/` — flows that first enter a classroom, then drive the in-classroom AI panel (`courses.spec.ts`, `texttopictureBDT.spec.ts`, `picturetopictureBDT.spec.ts`, `texttomusicBDT.spec.ts`). New domains should get their own subdirectory here rather than being added flat.

### Classroom AI-panel spec pattern

Specs under `testcase/classroom/` wait for AI-panel task completion via Midscene's `aiWaitFor`, given a detailed natural-language description of the target state (e.g. "the image has finished rendering, no longer showing queued/generating/progress-percentage"), then run a similarly-worded `aiAssert`. Follow this pattern and mirror the existing phrasing style for new `aiAct`/`aiWaitFor`/`aiAssert` prompts — they're tuned against the real app's copy and behavior.

`picturetopictureBDT.spec.ts` chains two AI actions rather than testing them independently: it runs text-to-image first, waits for the image, taps the quote-this-message button beneath it, then runs image-to-image and asserts on that second result. Use it as the reference when adding a "continue from a prior AI result" flow.

### Known constraints

- Midscene does not currently support Anthropic/Claude as a vision-locating model — this project uses Gemini or GPT-5.
- Login form copy / presence of captcha, etc. is only known from a real run of `global-setup.ts`. If login starts failing, first adjust the natural-language steps there rather than the underlying architecture.

import { test as base } from '@playwright/test';
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';
import { PlaywrightAiFixture } from '@midscene/web/playwright';

export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    waitForNetworkIdleTimeout: 2000,
    // Reuse cached element locations / aiAct plans when the page hasn't changed,
    // to avoid an AI round-trip on every step. Auto-invalidates if the UI drifts.
    cache: true,
  }),
);

import { expect } from '@playwright/test';
import { test } from '@e2e/fixture';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/home/courses');
});

test('课程列表能正常加载', async ({ aiQuery, aiAssert, aiWaitFor }) => {
  await aiWaitFor('课程列表已经加载完成,页面上出现了至少一个课程卡片', {
    timeoutMs: 15000,
  });

  const courses = await aiQuery<Array<{ title: string }>>(
    '{title: string}[], 页面上每个课程卡片对应的标题',
  );

  expect(courses.length).toBeGreaterThan(0);
  for (const course of courses) {
    expect(course.title).toBeTruthy();
  }

  await aiAssert('页面上展示的是课程列表,而不是登录页、空状态页或错误页');
});

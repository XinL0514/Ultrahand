import type { Locator, Page } from '@playwright/test';
import { getTestFiles, type TestFilePath } from '@e2e/testdata/files';

/**
 * 为页面中已有的 `<input type="file">` 设置本地测试文件。
 *
 * 适用于上传控件的 input 可以稳定定位时；input 即使被视觉样式隐藏，Playwright 也能直接赋值。
 *
 * @example
 * await uploadTestFilesToInput(
 *   page.locator('input[type="file"]'),
 *   'images/source.png',
 * );
 */
export async function uploadTestFilesToInput(fileInput: Locator, files: TestFilePath) {
  await fileInput.setInputFiles(getTestFiles(files));
}

/**
 * 点击页面上传入口并接管浏览器文件选择框，再设置仓库内的本地测试文件。
 *
 * 上传入口没有稳定选择器、只能通过 Midscene 的 `aiTap` 点击时使用此函数。必须把
 * `openFileChooser` 作为回调传入，以保证监听器在点击前已开始等待，不会错过 filechooser 事件。
 *
 * @example
 * await uploadTestFilesByChooser(page, 'images/source.png', () =>
 *   aiTap('点击图片上传按钮'),
 * );
 */
export async function uploadTestFilesByChooser(
  page: Page,
  files: TestFilePath,
  openFileChooser: () => Promise<unknown>,
) {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await openFileChooser();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(getTestFiles(files));
}

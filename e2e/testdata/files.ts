import { existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 仓库内测试素材的根目录。用例只应通过本模块取得文件路径，避免写入开发机绝对路径。
 */
export const TEST_FILES_ROOT = fileURLToPath(new URL('./files/', import.meta.url));

export type TestFilePath = string | readonly string[];

/**
 * 取得 `e2e/testdata/files/` 下的一个实际文件。
 *
 * @example
 * const sourceImage = getTestFile('images/source.png');
 */
export function getTestFile(relativePath: string): string {
  if (!relativePath.trim()) {
    throw new Error('测试文件路径不能为空');
  }

  const filePath = resolve(TEST_FILES_ROOT, relativePath);
  const rootWithSeparator = TEST_FILES_ROOT.endsWith(sep) ? TEST_FILES_ROOT : `${TEST_FILES_ROOT}${sep}`;

  // 不允许用 ../ 逃出测试素材目录，保证用例始终使用仓库里受管理的文件。
  if (!filePath.startsWith(rootWithSeparator)) {
    throw new Error(`测试文件必须位于 e2e/testdata/files/ 下：${relativePath}`);
  }

  if (!existsSync(filePath)) {
    throw new Error(
      `未找到测试文件：${relativePath}。请先将文件放到 e2e/testdata/files/ 对应目录中。`,
    );
  }

  if (!statSync(filePath).isFile()) {
    throw new Error(`测试文件路径不是一个文件：${relativePath}`);
  }

  return filePath;
}

/** 将一个或多个相对路径解析为可传给 Playwright `setInputFiles` 的绝对路径。 */
export function getTestFiles(filePaths: TestFilePath): string | string[] {
  if (typeof filePaths === 'string') {
    return getTestFile(filePaths);
  }

  if (filePaths.length === 0) {
    throw new Error('至少需要提供一个测试文件');
  }

  return filePaths.map(getTestFile);
}

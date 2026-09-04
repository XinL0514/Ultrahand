# 测试上传文件库

把需要由自动化用例上传的本地文件放在这个目录，并按文件类型归档：

```text
files/
├── images/      # 图片：png、jpg、webp 等
├── videos/      # 视频：mp4、mov 等
├── audio/       # 音频：mp3、wav 等
└── documents/   # 文档：pdf、docx 等
```

这些文件是测试夹具的一部分，可以随用例一起提交。不要放账号信息、真实用户资料或受版权/隐私限制的素材；大文件应使用 Git LFS 或由项目约定的制品存储管理。

在用例中只写相对于本目录的路径，不要写本机绝对路径：

```ts
import { uploadTestFilesByChooser } from '@e2e/helpers/fileUpload';

await uploadTestFilesByChooser(page, 'images/source.png', () =>
  aiTap('点击图片上传按钮'),
);
```

如果能稳定定位实际的 `<input type="file">`，可以直接上传：

```ts
import { uploadTestFilesToInput } from '@e2e/helpers/fileUpload';

await uploadTestFilesToInput(page.locator('input[type="file"]'), 'documents/example.pdf');
```

传入多个文件时使用数组，例如 `['images/first.png', 'images/second.png']`。框架会在执行前确认文件存在，并拒绝访问此目录以外的路径。

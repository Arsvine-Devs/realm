# ARSVINE REALM 文档索引

这里是面向人类维护者的文档入口。AI 工作流见 [`ai/INDEX.md`](./ai/INDEX.md)。

## 一般使用

- [`human/GENERAL.md`](./human/GENERAL.md)：安装、环境、启动和基本项目结构。

## 维护者

- [`human/MAINTAINER.md`](./human/MAINTAINER.md)：日常开发、测试、质量命令和修改入口。
- [`human/ARCHITECTURE.md`](./human/ARCHITECTURE.md)：系统边界、运行拓扑和数据流。
- [`human/ROUTING_AND_I18N.md`](./human/ROUTING_AND_I18N.md)：App Router、locale、过渡和 hash 导航。
- [`human/CONTENT_AND_MDX.md`](./human/CONTENT_AND_MDX.md)：博客、推文、MDX、内容 locale 和 fallback。
- [`human/SECURITY.md`](./human/SECURITY.md)：protected post、Cookie、限流和输入安全。
- [`human/ASSETS.md`](./human/ASSETS.md)：COS、Catalog、字体、图片和音频。
- [`human/PERFORMANCE.md`](./human/PERFORMANCE.md)：性能 tier、WebGL、动画和降级。
- [`human/OPERATIONS.md`](./human/OPERATIONS.md)：部署、自托管、数据库、发布和回滚。
- [`human/TROUBLESHOOTING.md`](./human/TROUBLESHOOTING.md)：按症状排查常见问题。

## 阅读顺序

首次运行：`GENERAL.md` → `MAINTAINER.md`。

修改代码：`MAINTAINER.md` → 对应维护者专题 → `../ai/GOTCHAS.md`。

发布资产或部署：`ASSETS.md` / `OPERATIONS.md`，先使用 dry-run 或只读检查。

## 文档规则

- 一个知识点只有一个权威位置；其他页面只保留短链接和必要上下文。
- 路径、命令、环境变量和 API 名称必须以当前源码、`package.json`、`.env.example` 和脚本为准。
- 不在文档中记录真实密钥、Token、Cookie、TOTP secret 或 COS 凭据。
- 设计草案、完成后的迁移计划和临时审查记录不属于日常文档；当前约束应写入维护者专题或 AI GOTCHAS。

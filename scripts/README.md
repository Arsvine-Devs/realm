# 维护脚本

[`Repository map`](../INDEX.md) · [`Human documentation catalog`](../docs/INDEX.md)

本目录包含资产、字体、图像、环境文件、数据库维护和 Windows 开发启动工具。

- 资产 Catalog 流程：`scripts/assets/` 与 [`docs/human/ASSETS.md`](../docs/human/ASSETS.md)
- 文档路径检查：`pnpm docs:check`，实现位于 `scripts/check-doc-links.mjs`
- 图像转换流程：[`scripts/images/README.md`](./images/README.md)
- 部署和数据库流程：[`docs/human/OPERATIONS.md`](../docs/human/OPERATIONS.md)
- AI 安全规则：[`AGENTS.md`](./AGENTS.md)

一次性媒体和字体工具保持独立。没有明确授权时，不要运行发布 COS 资产或修改数据库的命令。

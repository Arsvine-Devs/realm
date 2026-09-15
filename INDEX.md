# 仓库地图

ARSVINE REALM 是一个 Next.js App Router 应用，按 feature 组织源码，并配有独立的本地维护工具链。

## 主要范围

| 范围              | 责任                                                        | 权威入口                                             |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `src/app/`        | App Router 页面、layout、metadata、Route Handler、i18n      | [`src/app/README.md`](./src/app/README.md)           |
| `src/features/`   | 领域 UI、状态、server loader、contract 和样式               | [`src/features/README.md`](./src/features/README.md) |
| `src/shared/`     | 跨 feature 的稳定 hook、helper、UI primitive 和 contract    | [`src/shared/README.md`](./src/shared/README.md)     |
| `scripts/`        | 本地维护、资产、字体、图像和数据库工具                      | [`scripts/README.md`](./scripts/README.md)           |
| `config/`         | 固定服务拓扑和动态环境契约                                  | [`config/site-config.mjs`](./config/site-config.mjs) |
| `tests/`          | app、feature、shared、repository、operations 和 script 测试 | [`tests/README.md`](./tests/README.md)               |
| `.agents/skills/` | 可复用的审计、Catalog 和 protected content AI 工作流        | `docs/ai/INDEX.md`                                   |

## 入口

- 人类主页：[`README.md`](./README.md)
- 人类文档：[`docs/README.md`](./docs/README.md)
- 人类文档目录：[`docs/INDEX.md`](./docs/INDEX.md)
- 全网站架构拓扑：[`docs/architecture/SYSTEM_MAP.md`](./docs/architecture/SYSTEM_MAP.md)
- AI 仓库规则：[`AGENTS.md`](./AGENTS.md)
- AI 工作流目录：[`docs/ai/INDEX.md`](./docs/ai/INDEX.md)

## 重要范围指南

- Feature 边界：[`assets`](./src/features/assets/README.md)、[`blog`](./src/features/blog/README.md)、[`navigation`](./src/features/navigation/README.md)
- AI 工作流实现：[`realm-maintenance-audit`](./.agents/skills/realm-maintenance-audit/SKILL.md)、[`realm-assets-catalog`](./.agents/skills/realm-assets-catalog/SKILL.md)、[`realm-protected-content`](./.agents/skills/realm-protected-content/SKILL.md)

## 运行时边界

- Vercel 使用标准 Next.js App Router 输出；`server.js` 只用于本地开发和可选自托管。
- 公共媒体通过版本化 COS Catalog 解析；生成的 `dist/` 和 `cos-workspace/` 只是本地产物。
- Blog/Tweet 运行时通过 `config/site-config.mjs` 中的 Content origin 读取已发布 release。
- Protected blog 正文只在 grant 验证后运行时获取。

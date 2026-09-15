# 维护者指南

[返回文档索引](../INDEX.md)

本文面向准备修改代码、内容、测试、脚本或部署配置的维护者。

## 日常流程

1. `git status --short`，确认没有覆盖已有工作。
2. 阅读对应领域文档和 `../ai/GOTCHAS.md`。
3. 搜索现有 component、hook、server handler、type 和测试。
4. 先做最小范围修改，运行能最快否定当前改动的检查。
5. 非平凡变更完成后运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`；需要时再运行 `pnpm build`。
6. 视觉或交互变更补充桌面、移动端、route transition、protected blog、音乐、hash 和 cursor 手工验证。

## 常用命令

```bash
pnpm format:check
pnpm docs:check
pnpm env:sync
pnpm maintenance:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

单个测试：

```bash
pnpm vitest run tests/features/blog/blog-post-state.test.ts
pnpm vitest run -t "cancels a stale variant actor"
```

生产内容读取需要 `CONTENT_BASE_URL`；如果本地环境文件来自旧版本，先运行 `pnpm env:sync`，再按 [`OPERATIONS.md`](./OPERATIONS.md) 补齐 Content/Auth 配置。`env:sync` 会删除已登记的废弃变量，并保留未登记的临时调试键。

## 目录职责

- `src/app/` 只负责 route params、metadata、layout、SSG/ISR、not-found 和 HTTP 适配。
- `src/features/<feature>/` 持有领域 UI、model、server、contracts 和 styles。
- `src/shared/` 只存跨 feature 的稳定能力；单 feature 算法不要下沉。
- `tests/` 按 app、features、shared、repo、operations、scripts 分组。
- `scripts/assets/` 是资产 Catalog workflow；一次性图片、字体和 Windows 工具保持独立。

## CI 与平台支持

- `verify` 在 Ubuntu 上运行完整 `pnpm check`，是当前 master ruleset 要求的合并检查。
- `verify-windows` 在 Windows 上运行 Node 24 的依赖安装和 production build，用于发现 Windows 构建回归；当前是 advisory check，不是 master 的 required status。
- Windows 是受支持的开发/构建环境，但跨平台发布结论必须明确标注平台范围；Windows job 通过不等同于完整跨平台验证。

## 常见修改入口

| 需求                          | 入口                                                |
| ----------------------------- | --------------------------------------------------- |
| metadata、SEO、字体、社交链接 | `src/shared/config/site.ts`                         |
| UI 文案                       | `src/app/locales/*.json`                            |
| 多语言结构化数据              | `src/features/<feature>/contracts/data/`            |
| protected post                | `src/features/blog/`、`src/shared/lib/content/`     |
| 导航过渡和 hash               | `src/features/navigation/`、`src/app/shell/`        |
| HUD 与性能                    | `src/features/hud/`、`src/shared/lib/performance-*` |
| Catalog 和媒体                | `src/features/assets/`、`scripts/assets/`           |

## 质量原则

- 测试保护当前语义、已观察风险或有信息价值的不确定性；不为完成的迁移、旧内容仓库或源码排版保留测试。
- 自动生成目录、COS workspace、`.next/`、`dist/` 和本地环境文件不进入提交。
- 不把本地测试结果写成外部发布、生产、跨平台或独立审查结论。
- 依赖、抽象和流程的保留必须有持续收益；不要为了减少文件数而破坏真实语义边界。

专题文档入口见 [`../INDEX.md`](../INDEX.md)，AI workflow 见 [`../ai/INDEX.md`](../ai/INDEX.md)。

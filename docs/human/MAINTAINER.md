# 维护者指南

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

## 目录职责

- `src/app/` 只负责 route params、metadata、layout、SSG/ISR、not-found 和 HTTP 适配。
- `src/features/<feature>/` 持有领域 UI、model、server、contracts 和 styles。
- `src/shared/` 只存跨 feature 的稳定能力；单 feature 算法不要下沉。
- `tests/` 按 app、features、shared、repo、operations、scripts 分组。
- `scripts/assets/` 是资产 Catalog workflow；一次性图片、字体和 Windows 工具保持独立。

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

- 测试保护当前语义、已观察风险或有信息价值的不确定性；不为完成的迁移保留源码排版测试。
- 自动生成目录、COS workspace、`.next/`、`dist/` 和本地环境文件不进入提交。
- 不把本地测试结果写成外部发布、生产、跨平台或独立审查结论。
- 依赖、抽象和流程的保留必须有持续收益；不要为了减少文件数而破坏真实语义边界。

专题文档入口见 [`../INDEX.md`](../INDEX.md)，AI workflow 见 [`../ai/INDEX.md`](../ai/INDEX.md)。

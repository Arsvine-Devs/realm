# 测试与质量保障

[返回文档导航](./README.md)

本文说明自动化检查、测试目录、针对性运行方式和需要人工验证的交互场景。

## 标准命令

| 命令                     | 实际执行                                            | 适用场景                   |
| ------------------------ | --------------------------------------------------- | -------------------------- |
| `pnpm lint`              | Oxlint + ESLint 兼容规则                            | 静态规则检查               |
| `pnpm format`            | Prettier 写入                                       | 自动格式化                 |
| `pnpm format:check`      | Prettier 检查                                       | 格式门禁                   |
| `pnpm check:unused`      | Knip                                                | 未使用文件、依赖、导出检查 |
| `pnpm check:duplicates`  | JSCPD                                               | 生产代码重复报告           |
| `pnpm quality`           | Knip + JSCPD                                        | 维护扫描                   |
| `pnpm typecheck`         | `tsc --noEmit`                                      | TypeScript 类型检查        |
| `pnpm test`              | `vitest run`                                        | 全量单元与契约测试         |
| `pnpm build`             | `next build`                                        | 生产构建、SSG/ISR 合约检查 |
| `pnpm maintenance:check` | 字体配置检查                                        | 配置维护                   |
| `pnpm check`             | 格式、字体配置、lint、类型、Knip、JSCPD、测试、构建 | 提交和发布前               |

## 工具配置

新增配置集中在 `config/`：`prettier.json`、`prettier.ignore`、`oxlint.json`、`knip.jsonc`、`jscpd.json`。Prettier 通过 `package.json#prettier` 自动发现配置；CLI 同时读取 `.gitignore` 和 `config/prettier.ignore`。编辑器若需格式化排除规则，使用 `config/prettier.ignore` 作为 ignorePath，并避免格式化锁文件、补丁和静态资产。

Oxlint 承担已迁移的 Next、React、可访问性规则。根目录 `eslint.config.mjs` 保留自动发现入口，通过 `eslint-plugin-oxlint` 按实际启用配置关闭重复规则；未覆盖的 Next location、React deprecated/render-return、Compiler config/gating 等规则继续由 ESLint 检查。shared 依赖边界在迁移探针中未被 Oxlint 拦截，保留 ESLint 的 `no-restricted-imports`，并已验证非法 feature import 会失败。兼容层关闭 unused-disable 报告，因为原有 ESLint 注释同时供 Oxlint 使用。升级时核对迁移覆盖后再调整规则。

Knip 识别 App Router、测试及 package scripts，并显式登记文档支持的图片维护脚本、next-intl request 和 feature `public.ts` 公共 API。文件内仅供自身使用的 symbol 已改为非 export；多语言 registry 按模块对象传递的 data exports 仅在对应数据目录豁免 export 检查，文件和依赖仍被分析。公共入口通过 `config/knip.jsonc` 登记，未被统一忽略。

Oxlint 的 `media-has-caption` 仅在测试 fixture 和无对白的音乐播放器音频元素上关闭；access gate 的隐藏输入保留 `autoFocus`，因为它是唯一可输入的 TOTP 控件，关闭范围只限两个 access gate 文件。其余可访问性规则仍按代码逐项修复或留下局部说明。

JSCPD 使用 weak 模式，扫描生产 TS/TSX/JS/MJS，排除翻译数据，最小块为 80 tokens / 10 行。它输出重复位置与统计，不设置阻断阈值，也不生成报告文件；重复代码是否合并取决于职责是否相同。`path` 相对于 `config/jscpd.json` 所在目录解析。修改范围后检查实际扫描文件数，0 文件不构成有效检查。

## 运行针对性测试

单文件：

```bash
pnpm vitest run tests/features/blog/blog-post-state.test.ts
```

按名称：

```bash
pnpm vitest run -t "cancels a stale variant actor"
```

多个文件：

```bash
pnpm vitest run tests/features/navigation/content-hash-navigation.test.ts tests/app/locale-hot-switch.test.tsx
```

## 测试目录

```text
tests/
  app/          应用组合、根布局、全局 provider 和文档 bootstrap
  features/     单个业务 feature 的状态、UI、server handler 和契约
  shared/       跨 feature 工具、hooks、UI primitive 与 server helper
  repo/         仓库结构、路由、样式、补丁和维护约束
  operations/   部署拓扑等运维契约
  scripts/      维护脚本行为
  fixtures/     Catalog 等测试输入
```

所有新测试放在 `tests/`，不要把 `.test.ts` 或 `.test.tsx` 放回源码目录。Vitest 使用 `jsdom`，匹配 `**/*.test.{ts,tsx}`。

## 修改类型与最低验证

| 修改范围      | 最低自动检查                       | 额外验证                      |
| ------------- | ---------------------------------- | ----------------------------- |
| 文档          | Markdown 链接、`git diff --check`  | 命令和路径人工核对            |
| 纯工具函数    | 对应测试、typecheck                | 边界输入                      |
| React UI      | 对应 feature 测试、lint、typecheck | 桌面与移动布局                |
| 路由或 locale | navigation/app 测试、build         | 直接 URL、返回、切换 locale   |
| 受保护文章    | blog/security 测试、build          | 未授权与授权流程              |
| 资产 Catalog  | assets/script 测试、build          | dry-run、pointer 与 fallback  |
| WebGL/性能    | HUD/app 测试、build                | 降级、恢复、context loss      |
| 部署配置      | `pnpm check`                       | preview 或目标环境 smoke test |

## 人工交互清单

视觉或交互修改完成后至少检查：

- 桌面与移动布局无溢出或 HUD 遮挡。
- 首页 → content → detail 页面过渡完整。
- `/zh-CN/content#blog` 等 hash 入口对齐正确。
- public 与 protected 博客详情都能进入正确状态。
- locale 切换不重置音乐、HUD、WebGL 和允许保留的页面状态。
- 音乐播放器打开、关闭、切歌和移动端自动打开规则正确。
- CustomCursor 的 hover label、BACK 和 blur/scroll reset 正确。
- CJK、繁体罕见字和 accented Latin 字符没有错误字体。
- 性能 tier 降级后被禁用能力确实停止工作。

## 失败分类

检查失败时先分类：

1. 当前改动引起：修复后重跑相关检查。
2. 与当前改动无关的既有失败：记录准确命令和错误，不顺手扩大修复范围。
3. 环境或网络失败：检查 Node/pnpm、代理、registry、外部服务和凭据。
4. 阻断性验证缺失：明确说明未验证内容和风险。

不得把未运行的检查写成已通过。

## 仓库级保护

- `tests/repo/app-router-api.test.ts` 保护 App Router API 结构。
- `tests/repo/react-three-fiber-timer-patch.test.ts` 保护 Fiber 精确版本和 Timer 补丁。
- `tests/operations/deployment-topology.test.ts` 保护 Vercel 与 `server.js` 的运行边界。
- `tests/repo/sync-env-files.test.ts` 保护环境文件同步行为。
- `tests/features/blog/blog-protected-rsc-contract.test.ts` 保护 protected body 不进入静态 payload。

## 相关文档

- [`DEVELOPMENT.md`](./DEVELOPMENT.md)
- [`GOTCHAS.md`](./GOTCHAS.md)
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

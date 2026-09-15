# 测试布局

[`Repository map`](../INDEX.md) · [`Maintainer guide`](../docs/human/MAINTAINER.md) · [`AI rules`](./AGENTS.md)

测试按责任分组：

- `app/` — 应用 shell、layout、provider 和 bootstrap 行为。
- `features/` — 领域状态、UI、server handler 和安全 contract。
- `shared/` — 跨 feature helper 和 primitive。
- `repo/` — 当前仓库、构建和依赖 contract。
- `operations/` — 部署和运维边界。
- `scripts/` — 本地维护工具行为。
- `fixtures/` — 已提交的测试输入。

纯逻辑、server 和 repository 测试运行在 Node。DOM 与 React 测试使用 jsdom project；只需要浏览器 API 的 TypeScript 测试使用 `*.browser.test.ts` 后缀。

## 保留标准

测试必须保护当前行为、真实安全边界、已观察回归或有信息价值的不确定性。`repo/` 中的源码契约测试只用于无法通过运行时检查表达的 App Router、依赖 patch、CSS 动画图谱和部署边界；完成迁移的旧路径、旧仓库协议、源码排版和重复实现不属于保留理由。

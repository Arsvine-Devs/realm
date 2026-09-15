# Navigation feature

[`Feature domains`](../README.md) · [`Repository map`](../../../INDEX.md)

navigation feature 负责路由分类、过渡编排、hash 对齐、locale 切换、路由 loading 展示和安全的 locale-independent 页面状态。

- 内部路由变化必须经过 `navigateTo()` 或 `switchLocale()`。
- 过渡和对齐清理属于该 feature 的 contract。
- 修改前阅读 [`docs/human/ROUTING_AND_I18N.md`](../../../docs/human/ROUTING_AND_I18N.md) 和 [`AGENTS.md`](./AGENTS.md)。

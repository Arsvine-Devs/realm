# Asset Catalog feature

[`Feature domains`](../README.md) · [`Repository map`](../../../INDEX.md)

assets feature 将版本化 COS Catalog 数据解析为应用记录和可选的站点 shell 资产。

- 运行时代码位于 `model/` 和 `server/`。
- 源 manifest 与其所属 feature 数据放在一起。
- 生成的 hash、Catalog 版本和 public manifest 属于本地资产流程，不属于运行时源码。
- 人类操作流程见 [`docs/human/ASSETS.md`](../../../docs/human/ASSETS.md)，AI 约束见 [`AGENTS.md`](./AGENTS.md)。

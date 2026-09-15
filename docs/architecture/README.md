# ARSVINE 跨系统架构文档

[返回文档入口](../README.md) · [返回仓库地图](../../INDEX.md)

本目录记录 Realm 与 Platform 的当前边界，以及仍有解释价值的外部供应商和历史迁移记录。当前事实以两个仓库的源码、manifest、环境示例、Schema、测试和已执行检查为准；这里不重新定义 API。

## 文档分工

| 文档                                                       | 责任                                           | 生命周期   |
| ---------------------------------------------------------- | ---------------------------------------------- | ---------- |
| [`SYSTEM_MAP.md`](./SYSTEM_MAP.md)                         | 当前跨仓库拓扑、数据所有权、信任边界和证据范围 | 当前       |
| [`SUPPLIER_BOUNDARIES.md`](./SUPPLIER_BOUNDARIES.md)       | 当前外部供应商责任与可替换边界                 | 当前       |
| [`TENCENT_CLOUD_SNAPSHOT.md`](./TENCENT_CLOUD_SNAPSHOT.md) | 腾讯云控制面和 CDN/COS 的日期快照              | 快照/历史  |
| [`CONTENT_ADMIN_PIPELINE.md`](./CONTENT_ADMIN_PIPELINE.md) | 独立内容仓库迁移前的旧输入和旧流程             | 历史，只读 |
| [`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md)             | 已完成调查中的旧整改候选和决策记录             | 历史，只读 |
| [`VPS_MIGRATION.md`](./VPS_MIGRATION.md)                   | 供应商迁移的历史规划假设                       | 规划草案   |

历史文档保留是为了说明迁移来源和决策，不是当前运行手册。新流程应写入 Realm/Platform 各自的当前文档，并由源码和检查命令承担事实校验。

## 当前核心仓库

| 仓库                           | 当前角色                                                           | 维护入口                                                                               |
| ------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `Arsvine-Devs/realm`           | `arsvine.com` 展示面、Realm 内部静态数据、资产工具和受保护文章读取 | [`../../README.md`](../../README.md)                                                   |
| `Arsvine-Devs/platform`        | Console、Auth、API、Content 和共享运行时包                         | [`https://github.com/Arsvine-Devs/platform`](https://github.com/Arsvine-Devs/platform) |
| `Arsvine-Devs/arsvine-content` | 已废弃的一次性输入仓库，不属于当前运行时或本轮治理                 | [`CONTENT_ADMIN_PIPELINE.md`](./CONTENT_ADMIN_PIPELINE.md)                             |

## 证据标签

- `CURRENT`：由当前源码、manifest、Schema、脚本或仓库状态确认。
- `LIVE`：由日期明确的公开 DNS/HTTP/COS 探针确认。
- `CLAIMED`：来自供应商控制面或维护文档，尚未独立探测。
- `UNKNOWN`：当前证据不足，不写成已部署或已配置事实。
- `HISTORICAL`：只描述过去的系统状态、输入或规划。

## 保护范围

本目录不保存真实密钥、Token、Cookie、TOTP secret、数据库连接串、COS bucket 名称或私有对象路径。供应商记录只写职责、方向、字段名和迁移约束。

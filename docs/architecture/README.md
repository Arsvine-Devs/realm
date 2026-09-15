# ARSVINE REALM 全系统架构文档组

[返回文档入口](../README.md)

本目录记录 ARSVINE 系列站点当前的仓库、运行单元、数据源、外部供应商和服务边界。跨仓库拓扑以 Realm/Platform 当前源码、环境契约、部署设置和公开服务端点为准。

## 文档分工

| 文档                                                 | 权威职责                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [`SYSTEM_MAP.md`](./SYSTEM_MAP.md)                   | 当前跨仓库系统地图、部署拓扑、数据所有权、健康信号和待确认事项 |
| [`SUPPLIER_BOUNDARIES.md`](./SUPPLIER_BOUNDARIES.md) | 当前外部供应商、运行时耦合和控制面边界                         |

Realm 单仓库实现细节由 [`human/ARCHITECTURE.md`](../human/ARCHITECTURE.md)、[`human/CONTENT_AND_MDX.md`](../human/CONTENT_AND_MDX.md)、[`human/ASSETS.md`](../human/ASSETS.md)、[`human/OPERATIONS.md`](../human/OPERATIONS.md) 和 [`human/SECURITY.md`](../human/SECURITY.md) 负责。

## 证据标签

- `CURRENT`：由当前源码、Schema、manifest、脚本或仓库状态确认。
- `LIVE`：由公开 DNS、HTTP 或公开对象读取确认。
- `CLAIMED`：由部署控制面、配置意图或供应商控制面确认，尚未由独立运行探针完全覆盖。
- `UNKNOWN`：现有仓库和公开检查不足以判断。

## 当前仓库

| 工作区   | Git 仓库/分支                    | 当前基线                       | 系统角色                                   |
| -------- | -------------------------------- | ------------------------------ | ------------------------------------------ |
| Realm    | `Arsvine-Devs/realm` / `master`  | `07c761f` · `CURRENT` + `LIVE` | 主站、Realm 数据和资产工具                 |
| Platform | `Arsvine-Devs/platform` / `main` | `4479147` · `CURRENT` + `LIVE` | Console、Auth、API、Content 和共享运行时包 |

截至 2026-09-15，Vercel 团队 `arsvine-realm` 的核心项目为 `arsvine-realm`、`arsvine-admin`、`arsvine-auth`、`arsvine-api` 和 `arsvine-content`；`status.arsvine.com` 由 Better Stack 独立托管，不属于 Vercel 项目。

## 保护范围

本目录不保存真实密钥、Token、Cookie、TOTP secret、数据库连接串、COS bucket 名称或私有对象路径。供应商信息只记录职责、调用方向、公开端点和必要的控制面边界。

普通 npm/pnpm 依赖不列为外部供应商；只有承担托管运行时、存储、身份、CDN/DNS、外部 API 或状态页责任的服务才进入供应商文档。固定服务 origin 由 Realm `config/site-config.mjs` 和 Platform `@arsvine/site-config` 拥有，动态运行时输入见各仓库的配置文档。

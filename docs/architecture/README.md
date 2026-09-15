# ARSVINE REALM 全系统架构文档组

[返回文档入口](../README.md)

本目录记录 ARSVINE REALM 相关多个仓库、运行单元、数据源、外部供应商和未来自托管迁移边界。它面向需要理解整个系统的维护者，范围跨越主站、管理台、已发布 Content/API/Auth/CDN 链路、资产系统和相邻站点。

架构事实以 Realm/Platform 源码、环境契约和已发布服务端点为准；控制面记录保留其观测日期和证据等级。

## 文档分工

| 文档                                                       | 权威职责                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`SYSTEM_MAP.md`](./SYSTEM_MAP.md)                         | 跨仓库系统地图、部署拓扑、数据所有权、信任边界和当前证据                 |
| [`CONTENT_ADMIN_PIPELINE.md`](./CONTENT_ADMIN_PIPELINE.md) | 历史内容导入格式、旧流水线和已知漂移（迁移快照）                         |
| [`SUPPLIER_BOUNDARIES.md`](./SUPPLIER_BOUNDARIES.md)       | Vercel、Auth、API、Content、COS、EdgeOne、DNSPod、X 等外部供应与替换边界 |
| [`TENCENT_CLOUD_SNAPSHOT.md`](./TENCENT_CLOUD_SNAPSHOT.md) | 腾讯云域名、DNS、COS、EdgeOne、SSL 控制面与资产链路快照                  |
| [`VPS_MIGRATION.md`](./VPS_MIGRATION.md)                   | 脱离托管供应商时的目标拓扑、迁移顺序、保留语义和未决事项                 |

Realm 内部的单仓库细节仍由原有专题文档负责：[`human/ARCHITECTURE.md`](../human/ARCHITECTURE.md)、[`human/CONTENT_AND_MDX.md`](../human/CONTENT_AND_MDX.md)、[`human/ASSETS.md`](../human/ASSETS.md)、[`human/OPERATIONS.md`](../human/OPERATIONS.md) 和 [`human/SECURITY.md`](../human/SECURITY.md)。本目录负责把这些边界和 Admin/内容仓库连接起来。

## 证据标签

- `CURRENT`：由当前源码、Schema、manifest、脚本或仓库状态直接确认。
- `LIVE`：在本次调查中通过公开 DNS、HTTP 或 COS 公共对象读取确认。
- `CLAIMED`：来自维护文档、配置意图或供应商控制台控制面；尚未由外部运行时/独立探测证明。
- `UNKNOWN`：仓库和公开检查不足以判断；不把它写成已部署或已购买的事实。
- `OBSERVED_DRIFT`：当前行为或文件之间存在已复现的差异，文档只记录影响和建议，不在本次修复。

## 仓库快照

短 SHA 和工作树状态只表示本次调查时的快照，不是长期接口。

| 工作区                       | Git 仓库/分支                           | 调查时 HEAD | 状态                        | 系统角色                                     |
| ---------------------------- | --------------------------------------- | ----------- | --------------------------- | -------------------------------------------- |
| Realm                        | `Arsvine-Devs/realm` / `master`         | `e3e1010`   | `CURRENT`，主分支基线       | 主站源码、Realm 内部数据、资产构建工具       |
| Platform                     | `Arsvine-Devs/platform` / `main`        | `4fa5b7f`   | `CURRENT`，主分支基线       | Console、Auth、API、Content 和共享运行时包   |
| Content (retired input)      | `Arsvine-Devs/arsvine-content` / `main` | `a0237c4`   | `DEPRECATED_INPUT`，只读    | 一次性导入输入；不属于当前运行时闭环         |
| Docs                         | `Arsvine-Devs/arsvine-docs` / `main`    | `6976a0f`   | `CLAIMED`，本地有未提交重构 | 公开文档发布面；内容已过时，本次不作为事实源 |
| Lab                          | `ArsvineZhu/arsvine-lab` / `master`     | `aa350ef`   | 相邻项目，本地有未提交改动  | 主站链接到的独立实验站，不在核心内容闭环中   |
| X timeline research checkout | 同一 Realm 远端 / 已消失的研究分支      | `56364ed`   | 历史研究工作区              | 同一主站仓库的实验分支，不是独立供应商或服务 |

独立 Content 仓库 `C:\dev\arsvine-content` 仅作为一次性迁移输入；Content 运行时由 Platform 的 `apps/content` 负责。

Vercel CLI 当前团队为 `arsvine-realm`，当前核心项目清单为 `arsvine-realm`、`arsvine-admin`、`arsvine-auth`、`arsvine-api` 和 `arsvine-content`。核心项目的部署/资源关联见 [`SYSTEM_MAP.md`](./SYSTEM_MAP.md)，腾讯云控制面见 [`TENCENT_CLOUD_SNAPSHOT.md`](./TENCENT_CLOUD_SNAPSHOT.md)，供应商资源和环境变量边界见 [`SUPPLIER_BOUNDARIES.md`](./SUPPLIER_BOUNDARIES.md)。

## 保护范围

本目录不保存真实密钥、Token、Cookie、TOTP secret、数据库连接串、COS bucket 名称或私有对象路径。供应商文档只记录字段名、职责、调用方向和迁移约束。

普通 npm/pnpm 依赖不列为外部供应商；只有当依赖代表远端平台、外部数据源、托管运行时或供应商协议时，才在供应商文档中出现。Realm 固定服务 origin 见 `config/site-config.mjs`，动态环境变量见 [`../human/CONFIGURATION.md`](../human/CONFIGURATION.md)。

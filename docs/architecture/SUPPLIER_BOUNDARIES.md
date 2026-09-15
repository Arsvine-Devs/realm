# 外部供应商与替换边界

[返回文档组](./README.md) · [全系统地图](./SYSTEM_MAP.md)

本文只记录当前核心系统确实依赖的托管、存储、身份、CDN/DNS 或外部 API 责任。普通框架和 npm/pnpm 依赖不作为供应商清单。控制台读数和公开探针都有时间性，需按 `CLAIMED`/`LIVE` 标签理解。

## 当前供应商矩阵

| 供应商/能力     | 当前责任                                                                                   | 代码侧边界                                                                                                                | 状态                     |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Vercel          | Realm、Console、Auth、API、Content 的托管、Next build、Function/ISR/Proxy 和可选 telemetry | 各项目的 root directory、build command 和环境变量；应用不依赖 Vercel Cron                                                 | `CURRENT` + `CLAIMED`    |
| PostgreSQL/Neon | Realm visitor statistics、Auth DB、Platform Core DB                                        | Realm 只读 `DATABASE_URL`；Auth 读 `AUTH_DATABASE_URL`；API/Core DB 读 `CORE_DATABASE_URL`；事务和 migration 属于应用契约 | `CURRENT`                |
| Upstash Redis   | Realm 可选多实例限流；Console OIDC session 与限流                                          | REST URL/token；缺失或故障时的本地 limiter 是明确的短期 fail-open 策略                                                    | `CURRENT`                |
| Auth/OIDC       | `auth.arsvine.com` 的 Better Auth、OAuth/OIDC、JWKS、Passkey、TOTP 和角色                  | issuer、resource/audience、PKCE、redirect、scope 和 RP-initiated logout                                                   | `CURRENT`                |
| Content service | `content.arsvine.com` 的 published release read plane 和内部 publication endpoint          | immutable objects、current pointer、公开 protected 清理、`content:protected:read`                                         | `CURRENT`                |
| Tencent COS     | 私有 Catalog、公共媒体对象和发布对象存储                                                   | Realm asset workflow / Content object-storage adapter；pointer-last 和 hash object 是需保留的产品语义                     | `CURRENT` + `CLAIMED`    |
| Tencent EdgeOne | `cdn.arsvine.com` 的边缘 HTTPS、缓存和 COS 回源                                            | 浏览器只消费公共 CDN；Realm 不直接调用 EdgeOne API                                                                        | `CLAIMED`                |
| Tencent DNSPod  | apex、服务子域和 CDN 的权威 DNS                                                            | DNS 记录不是应用代码契约；清理时分别核对记录、项目域名和缓存                                                              | `LIVE` + `CLAIMED`       |
| GitHub          | 代码托管、Realm CI，以及已废弃内容仓库的历史记录                                           | Realm/Platform/Content runtime 不读取 GitHub 内容 API；独立内容仓库不属于当前治理范围                                     | `CURRENT` + `HISTORICAL` |
| Hitokoto        | Realm `/api/hitokoto` 的可选句子上游                                                       | Realm 自己拥有 timeout、缓存、限流和本地 fallback                                                                         | `CURRENT`                |

X 和 translation provider 只作为 Core/Content 中可能存在的来源或 variant metadata；当前 Platform 没有 X timeline scheduler、X API runtime 或 translation worker，不把它们写成当前运行服务。

## 当前接口抽象

| 抽象                      | 当前所有者                                                              | 必须保留的语义                                                         |
| ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `PublishedContentReader`  | Realm `src/shared/lib/content/content-api.ts`；Platform `apps/content`  | `CONTENT_BASE_URL`、release pointer、公开/受保护正文隔离               |
| `InternalRevalidator`     | Realm `/api/internal/revalidate`；Platform API 与 Realm asset publisher | timestamped HMAC、资源白名单、过期签名拒绝、partial/failed 结果        |
| `AuthVerifier`            | Platform `packages/authz`                                               | issuer、audience、JWKS、Bearer 错误分类和 scope/role 判定              |
| `ObjectStorage`           | Platform `packages/object-storage`；Realm Catalog adapter               | server-only credentials、text body、missing-body 错误和 key validation |
| `VisitorStatsPersistence` | Realm visitor feature                                                   | canonical host、匿名签名 key、CTE 幂等和 Asia/Shanghai 日界线          |
| `TelemetryProvider`       | Realm/Console 各自的可选 Vercel telemetry                               | 可关闭、失败隔离、不能阻断基础 UI                                      |
| `GeoProvider`             | Realm `src/proxy.ts` 的 Vercel Geo 输入                                 | 只用于 UI/可见性；不得参与 locale、授权或安全判断                      |

## 替换规则

替换供应商时，先保留上表的产品语义，再替换连接实现。不能因为更换 Vercel、PostgreSQL、Redis、COS 或 CDN 而恢复 GitHub 内容 fallback、扩大浏览器凭据范围、改变 protected body 隔离或删除 revision/pointer 验证。

当前环境变量的完整目录由 Realm [`docs/human/OPERATIONS.md`](../human/OPERATIONS.md) 和 Platform 仓库的 `docs/OPERATIONS.md` 维护；不要在此复制两份变量表。

## 证据边界

供应商控制面快照见 [`TENCENT_CLOUD_SNAPSHOT.md`](./TENCENT_CLOUD_SNAPSHOT.md)。它记录某一日期的资源状态，不自动覆盖当前代码或后续控制台变更。VPS 迁移文档仍是规划草案，不能作为当前部署步骤。

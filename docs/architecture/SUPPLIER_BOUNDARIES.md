# 外部供应商与运行边界

[返回文档组](./README.md)

本文记录 ARSVINE 当前运行链路中的外部供应商、职责和证据等级。普通框架与 npm/pnpm 依赖不列入本表；只有承担托管运行时、存储、身份、会话状态、CDN/DNS、状态页或外部 API 责任的服务才进入本表。

## 供应商矩阵

状态含义：`CURRENT` 表示代码或配置确认，`LIVE` 表示公开端点确认，`CLAIMED` 表示控制面确认但未由独立运行探针完全覆盖，`UNKNOWN` 表示现有证据不足。

| 供应商/平台     | 当前职责                                                                                               | 代码耦合                   | 当前证据                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------- |
| Vercel          | Realm、Console、Auth、API、Content 的生产托管；Next.js Functions、Proxy、Geo、Analytics/Speed Insights | 高                         | `CURRENT` + `LIVE`；五个 production deployment 均 `READY`            |
| Neon            | Realm 访客统计；Console/Auth/API 的数据库资源                                                          | 中高                       | `CURRENT` + `CLAIMED`；资源项目映射已确认，database/branch 未读取    |
| Upstash Redis   | Realm 限流；Console session 和限流                                                                     | 中                         | `CURRENT` + `CLAIMED`；当前资源项目映射已确认                        |
| Better Stack    | `status.arsvine.com` 状态页和外部健康检测                                                              | 无业务代码耦合             | `LIVE` + `CLAIMED`；CNAME 和页面 HTTP 200 已确认，monitor 配置未读取 |
| Auth / OIDC     | `auth.arsvine.com` 的身份、OAuth/OIDC、JWKS、Passkey、TOTP 和 role                                     | 中高                       | `CURRENT` + `LIVE`；Discovery/JWKS/health 可读                       |
| Content service | `content.arsvine.com` 的 published release、Blog/Tweet read API 和 protected internal variant          | 中                         | `CURRENT` + `LIVE`；readiness 和公开保护边界可读                     |
| Tencent COS     | private Catalog、public media object 和 publication storage                                            | 中高                       | `CURRENT` + `CLAIMED`；存储边界由代码和部署配置定义                  |
| Tencent EdgeOne | `cdn.arsvine.com` 的边缘缓存、HTTPS、安全策略和 COS 回源                                               | 低到中                     | `LIVE` + `CLAIMED`；CNAME 和 CDN 响应信号可读                        |
| Tencent DNSPod  | `arsvine.com` 的权威 DNS 和子域记录                                                                    | 低                         | `CLAIMED`；NS/控制面信息已记录，完整 zone 未读取                     |
| Tencent SSL     | CDN/域名的 TLS 证书和绑定                                                                              | 无运行时代码耦合           | `CLAIMED`；完整证书绑定清单未读取                                    |
| GitHub          | Realm/Platform 源代码托管、Realm CI 和代码审查入口                                                     | 低；不承载 Content runtime | `CURRENT`；两个仓库的 remote 和 Realm CI workflow 可读               |
| Hitokoto        | Realm `/api/hitokoto` 的第三方句子来源                                                                 | 低                         | `CURRENT`；服务端代理、缓存、限流和 fallback 已实现                  |
| Google Fonts    | Realm 构建阶段的 CSS/字体来源                                                                          | 低                         | `CURRENT`；构建脚本读取并生成自有 CDN stylesheet                     |

## Vercel

Vercel 团队为 `arsvine-realm`。项目设置和当前 production deployment 如下：

| 项目              | rootDirectory  | install command                  | build command                             | output | production commit    |
| ----------------- | -------------- | -------------------------------- | ----------------------------------------- | ------ | -------------------- |
| `arsvine-realm`   | 空             | 默认流程                         | 默认 Next.js 构建                         | 默认   | `07c761f` / `master` |
| `arsvine-admin`   | `apps/console` | 默认流程                         | 默认 Next.js 构建                         | 默认   | `4479147` / `main`   |
| `arsvine-auth`    | `apps/auth`    | `pnpm install --frozen-lockfile` | `pnpm build`                              | 默认   | `4479147` / `main`   |
| `arsvine-api`     | `apps/api`     | `pnpm install --frozen-lockfile` | `pnpm --filter @arsvine/api... build`     | `dist` | `4479147` / `main`   |
| `arsvine-content` | `apps/content` | `pnpm install --frozen-lockfile` | `pnpm --filter @arsvine/content... build` | `dist` | `4479147` / `main`   |

Realm 的 Vercel production deployment 使用标准 Next.js App Router 输出；`server.js` 只用于本地开发和可选自托管。Platform 的 Console、Auth、API 和 Content 使用各自项目的 rootDirectory 与构建设置。

Realm `master` 的 active GitHub ruleset 要求 `verify` 和 `Vercel` 状态。Platform 当前仓库包含独立的 Compose 参考环境 workflow，服务 production deployment 由 Vercel 项目负责。

## Neon

Vercel Marketplace 当前资源映射为：

- `neon-pink-ball` → `arsvine-realm`；
- `neon-camel-candle` → `arsvine-admin`、`arsvine-auth`、`arsvine-api`。

Realm 使用 Neon serverless driver 保存访客统计。Platform 的 Console/Auth/API 共用 `neon-camel-candle` 资源，分别承担 session、identity/security 和 Core authoring/publication 数据。实际 database、branch、备份和恢复策略仍需从 Neon 控制面确认。

## Upstash Redis

当前资源 `upstash-kv-bronze-candle` 连接 `arsvine-realm` 和 `arsvine-admin`。Realm 使用它保存分布式限流状态；Console 使用它保存 opaque session 和限流状态。Redis 不可用时，两个应用都使用进程内状态，无法提供多实例全局一致性。

## Better Stack Status Page

`status.arsvine.com` 的 DNS CNAME 为 `statuspage.betteruptime.com`，页面公开请求返回 HTTP 200。Status 是独立观测面，不参与核心服务请求。实际 monitor 列表、探针路径、通知渠道和阈值由 Better Stack 控制面维护。

Realm 的 canonical health 请求当前被 Vercel Bot Protection 返回 429；Console、Auth、API 和 Content 的公开 `/health/live`、`/health/ready` 探针返回 200。Status 对 Realm 应使用已允许的探针策略或可验证的 deployment health 入口。

## Auth、Content 与 API

- Auth 是唯一身份提供者，Console 通过 OIDC 登录；API 和 Content 验证 Auth 签发的 JWT。
- Console 浏览器只访问同源 BFF；BFF 使用 `@arsvine/site-config` 中的 API/Auth 拓扑和环境中的 OIDC client credential。
- API 使用 Core PostgreSQL 完成 authoring 和 publication；Content 保存 published release 并提供公开/保护读取。
- Realm 使用静态 Content/Auth origin 读取内容和保护正文；浏览器不直接读取 Content service。

## COS、EdgeOne 与 DNSPod

- 业务数据保存稳定 `catalogKey`，Catalog 将其映射到不可变 hash `objectKey`。
- public media 通过 `cdn.arsvine.com` 的 EdgeOne → COS 路径提供 HTTPS；private Catalog 只由 Realm 服务端读取。
- `cdn.arsvine.com` 的服务 origin 由 Realm `config/site-config.mjs` 拥有；COS bucket、Catalog pointer、CORS/Referer 和缓存规则属于资产运维配置。
- `arsvine.com` 的域名与子域由 DNS provider 管理；应用 deployment、DNS record、TLS certificate 和 CDN origin 是独立配置项。

## GitHub、Hitokoto 与 Google Fonts

- GitHub 保存 Realm/Platform 源码；Realm CI 在 push/pull request 上运行检查。应用运行时不从 GitHub 读取 Blog/Tweet Content。
- Realm 通过 `/api/hitokoto` 访问 `v1.hitokoto.cn`，使用 timeout、缓存、限流和预置 fallback；上游失败不会阻断基础页面。
- Realm 构建阶段读取 Google Fonts CSS，生成并发布自有 CDN stylesheet；生产页面使用 CDN stylesheet。

## 当前待确认事项

- Neon 实际 database、branch、备份/恢复责任和连接归属。
- Vercel preview protection、Git 自动部署规则和完整 deployment protection 设置。
- DNSPod 当前完整 zone、证书绑定、续期状态，以及 COS/EdgeOne 控制面中未被代码表达的策略。
- Better Stack 的 monitor 列表、通知渠道和阈值。

# 全系统地图与分布架构

[返回文档组](./README.md)

本文是跨仓库系统地图。主站内部的组件分层和受保护文章细节仍以 [`human/ARCHITECTURE.md`](../human/ARCHITECTURE.md) 与 [`human/SECURITY.md`](../human/SECURITY.md) 为准。

接口复核（2026-09-15）确认 `auth`、`api`、`content`、`console` 的 liveness 可达；API/Content readiness、Content 公共读面和未授权边界也已通过只读 HTTP 请求验证。认证后的 Console mutation、Realm 主站页面因未执行登录或受到外部 challenge，仍不作线上业务验收结论。

## 一句话模型

系统由公共展示面、Console 控制面、Auth 身份面、API 控制面、Content 发布读面和 CDN 资产面组成：Realm 负责展示，Console 通过 API 写入，Auth 提供 OIDC，Content 读取已发布 release，COS/EdgeOne 保存和分发媒体；Neon 与 Upstash 只承担各自明确的持久状态和限流状态。另有一个与 Realm 无业务闭环的临时活动答题站，活动结束后应独立清理。

## 全局拓扑

```mermaid
flowchart TB
  USER[Browser / Editor] --> DNS[DNSPod authoritative DNS]

  DNS --> MAIN[Vercel: arsvine.com\nRealm main site]
  DNS --> CONSOLE[Vercel: console.arsvine.com\nConsole BFF]
  DNS --> AUTH[auth.arsvine.com\nAuth OIDC]
  DNS --> API[api.arsvine.com\nControl API]
  DNS --> CONTENT[content.arsvine.com\nPublished Content]
  DNS --> DOCS[Vercel: docs.arsvine.com\nRspress documentation]
  DNS --> LAB[Vercel: lab.arsvine.com\nAdjacent Lab site]
  DNS --> CDN[cdn.arsvine.com\nTencent EdgeOne edge layer]
  DNS -. paused custom domain .-> QUIZ[Vercel: anti-fraud-quiz\ntemporary event site]

  MAIN --> PROXY[src/proxy.ts\nlocale + geo cookie]
  PROXY --> PAGES[Next App Router pages\nSSR / ISR / client shell]
  PAGES --> STATIC[Realm typed static data]
  PAGES --> CONTENT
  PAGES --> CATALOG[Private COS Catalog\nserver-side read]
  PAGES --> RDB[Neon Postgres\nvisitor statistics]
  PAGES --> RL[Upstash Redis\noptional distributed limits]
  PAGES --> QUOTE[Hitokoto API\nthrough Realm proxy]
  PAGES --> TEL[Vercel Analytics / Speed Insights\noptional telemetry]

  USER --> CDN
  CDN --> PUBCOS[Tencent COS public bucket\nimmutable media + public catalog]

  CONSOLE --> AUTH
  AUTH --> ADB[Auth PostgreSQL\nBetter Auth identities + sessions]
  CONSOLE --> API
  API --> CORE[Core PostgreSQL\nauthoring + publication state]
  API --> CONTENT_PUBLISH[Content internal publish endpoint]
  CONTENT_PUBLISH --> CONTENT
  API --> REALM_REVALIDATE[Realm internal revalidate\ntimestamped HMAC]
  CONSOLE --> ARL[Upstash Redis\nBFF sessions + limits]
  QUIZ --> QUIZKV[shared Upstash Redis\nquiz namespace]
```

图中的“Vercel”表示当前公开运行证据或仓库配置；它不是未来部署的必要组成部分。`Content`、`COS`、`Neon` 和 `Upstash` 分别属于不同的数据/基础设施边界，不能因为都由 Admin 或 Realm 调用就合并成一个存储层。

## 运行单元与责任

| 单元            | 仓库/入口                                               | 运行位置                                     | 主要责任                                                                                   | 当前状态                                                                               |
| --------------- | ------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Realm 主站      | `arsvine-realm`、`src/app/`、`src/proxy.ts`             | `arsvine.com`，当前为 Vercel                 | 首页、作品、经历、Life、博客展示、推文展示、RSS、sitemap、robots、受保护内容验证和资产读取 | `CURRENT`；公开请求本次被 Vercel Bot Protection challenge 拦截，不能据此评价页面可用性 |
| Console 管理台  | `arsvine-platform`、`apps/console`                      | `console.arsvine.com`                        | OIDC BFF、Blog/Tweet 管理 UI 和 API 请求代理                                               | `CURRENT` + `LIVE`；health 与未授权 BFF 边界已验证                                     |
| Auth 身份面     | `arsvine-auth`、`apps/auth`                             | `auth.arsvine.com`                           | Better Auth identity、OIDC/OAuth、WebAuthn/Passkey、TOTP、owner/editor role                | `CURRENT` + `LIVE`；Discovery/JWKS/health 可读，legacy identities 已导入               |
| API 控制面      | `arsvine-platform`、`apps/api`                          | `api.arsvine.com`                            | JWT/JWKS resource verification、Core authoring `/v1/*` 和 Content publish                  | `CURRENT` + `LIVE`；无 Token 请求正确拒绝，OpenAPI 与 health 可读                      |
| Content 内容面  | `arsvine-platform`、`apps/content`                      | `content.arsvine.com`                        | 已发布 release、Blog/Tweet read API、protected internal variant                            | `CURRENT` + `LIVE`；release、公开 protected 403、内部 scope 校验已验证                 |
| Asset 资产面    | Realm `scripts/assets/*`、COS bucket、`cdn.arsvine.com` | 腾讯云 COS 源站 + EdgeOne/CDN 观测到的边缘层 | 原始媒体、哈希对象、私有 Catalog、公有 site catalog、字体、音频和图片分发                  | `CURRENT` + `LIVE`；公共 pointer 可读                                                  |
| Realm 数据面    | `src/features/visitor-stats/`、`db/migrations/`         | Neon Postgres                                | 匿名访客 HMAC key、总计数、日计数和基线                                                    | `CURRENT`；数据库项目/分支未知                                                         |
| Platform 数据面 | `arsvine-platform/packages/core-db`、`apps/auth`        | PostgreSQL                                   | Auth identity/session 与 Core authoring/publication state                                  | `CURRENT`；生产 database/branch 和凭据归属仍需外部配置确认                             |
| 文档发布面      | `arsvine-docs`、Rspress `doc_build/`                    | 历史 `docs.arsvine.com` 部署面               | 公开技术文档                                                                               | Vercel 项目已删除；仓库和本地未提交重构保留，源文档不作为当前事实源                    |
| Realm Beta      | `arsvine-realm-beta`                                    | 历史 `beta.arsvine.com` 部署面               | Realm 的 beta/候选部署面                                                                   | 已不在当前 Vercel 项目清单；`beta` DNS 记录已由用户移除                                |
| 相邻 Lab        | `arsvine-lab`                                           | 历史 `lab.arsvine.com` 部署面                | 独立实验页面                                                                               | Vercel 项目已删除；DNS 记录暂停，Realm 仍发现相邻站点外链                              |
| 临时活动站      | `ArsvineZhu/anti-fraud-quiz`、Vercel `anti-fraud-quiz`  | `quiz.arsvine.com`（DNS 当前暂停）           | 活动答题、管理员控制台、现场监控；静态页面 + Functions + Redis                             | `CURRENT` + `CLAIMED`；活动后删除项目并清理 quiz namespace，不删除共享 Upstash 资源    |

## 临时旁路系统

`anti-fraud-quiz` 是明天活动使用的独立活动站，不读取 Realm Content、Neon、COS Catalog 或 Admin workspace，也不参与 Realm 的发布/revalidate 闭环。其公开仓库 README 和 Vercel deployment metadata 表明它使用静态 HTML、Vercel Functions 与 Redis 保存房间状态，并有 `/`、`/admin`、`/monitor` 三个页面。

当前 Vercel 项目已有 `READY` production deployment，框架 preset 为 Other、输出目录为 `public`、部署区域为 `iad1`、无故障转移区；DNSPod 的 `quiz` CNAME 记录暂停，Vercel 对该自定义域名报告未正确配置。这个站点的生命周期是一次活动，不应被当作未来 VPS 迁移对象。

该项目与 Realm、Admin 共用一个 Upstash for Redis 资源；资源清单此前还显示历史 Realm Beta 关联，但 Beta 项目现已移除。quiz 使用独立的 `QUIZ_*` 环境变量和 Redis 前缀。活动结束后的清理必须以项目、域名和 quiz key 为粒度；删除整个 Redis resource 会影响长期系统。

## Realm 主站内部边界

### 请求与渲染

Realm 的根入口是 `src/app/layout.tsx`，在 `[locale]` 之上保持全局 client shell。`src/app/[locale]/layout.tsx` 只处理 locale 验证、服务端 `next-intl` 和 locale metadata。主要页面使用静态数据、动态服务端读取或 300 秒 ISR；Route Handler 集中在 `src/app/api/`，当前全部使用 Node runtime/dynamic handler 声明。

`src/proxy.ts` 负责 locale redirect、受支持 locale 放行和 `GEO_COUNTRY` Cookie。它通过 `@vercel/functions` 读取 Vercel Geo；自托管时这一能力没有等价的当前实现，必须替换成反向代理或应用层的明确策略。

### 领域层

`src/features/` 按领域持有 `contracts`、`model`、`server`、`ui` 和 `styles`；`src/shared/` 只保留跨 feature 的稳定能力。公共页面主要来源如下：

| 数据类别                               | 当前所有者                                                       | 读取方式                                                  |
| -------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| 作品、经历、Life、技能、友链、站点配置 | Realm `src/features/*/contracts/` 与 `src/shared/config/site.ts` | 构建时/服务端静态 registry                                |
| 博客索引和 MDX 正文                    | Content release / COS objects                                    | Realm 服务端通过 `content.arsvine.com` 读取               |
| 推文月索引与月度 JSON                  | Content release / COS objects                                    | Realm 服务端通过 Content API 读取，再按 `visibility` 过滤 |
| 图片、音频、字体和装饰对象             | COS public bucket                                                | 浏览器使用 `cdn.arsvine.com` 的 `objectKey`               |
| Catalog 元数据                         | COS private bucket                                               | Realm 服务端读取 `current.json` 后校验 versioned sections |
| 访客计数                               | Realm Neon 数据库                                                | `/api/visitor-stats` 使用匿名签名 Cookie 和 HMAC key      |

### 主要失效隔离

- Content release/API 不可达时，Realm 使用 Content client 错误边界；生产不再回退到 GitHub 内容读取。
- Private Catalog 不可用时，资产 API 保留 `502` 与空 Catalog 的区别；页面使用 feature fallback。
- Upstash 未配置或暂时不可达时，限流退回单进程 Map；这保持本地可用性，但不提供多实例一致性。
- Hitokoto 失败时回退到预设文案；Telemetry 和 WebGL 失败不应阻断基础 UI。
- Protected blog 首次页面只给清理后的 metadata，正文由授权后的 runtime API 加载。

## 部署拓扑

### 当前 Vercel 形态

- Realm 的 `package.json` 提供 `pnpm build`，没有自己的 `vercel.json`；Vercel 使用 Next.js 标准构建输出。
- Realm 的 `server.js` 用于本地开发和可选自托管，不是 Vercel 的入口。
- Admin 有独立 `vercel.json`，声明 `/api/cron/x-timeline` 的 `0 2 * * *` UTC schedule；route 设置 `runtime = 'nodejs'`、`dynamic = 'force-dynamic'`、`maxDuration = 60`。
- Docs 的 `vercel.json` 将 Rspress `doc_build/` 作为静态输出；它是文档发布单元，不参与主站运行时。
- Lab 使用独立 Next.js 项目；公开首页本次返回 `X-Nextjs-Prerender: 1` 和 Vercel cache headers。

### 构建与交付

- Realm 有 `.github/workflows/ci.yml`：push 和 pull request 触发 Ubuntu `pnpm check`，并在 Windows 上执行依赖安装和 `pnpm build`。
- Admin、Content、Docs、Lab 的当前 checkout 均未发现 `.github/workflows`；它们是否依赖 Vercel Git integration、手动部署或其他外部 CI，当前为 `UNKNOWN`。
- Realm 的 GitHub Actions workflow 使用 `contents: read`，属于代码质量/构建面，不参与生产请求、内容写入、COS 发布或数据库迁移。
- Admin 的 `vercel.json` 与 Docs 的 `vercel.json` 是部署配置；Vercel 项目后台的 build hook、自动部署分支和 required check 未由本地文件确认。

Vercel CLI 进一步确认：

- `arsvine-realm` 和 `arsvine-admin` 的 Vercel project framework 均为 Next.js、Node `24.x`、root directory 为项目根；两者最新 production deployment 均为 `READY`，分别对应 Realm `master` 的 `4b8f799` 和 Admin `main` 的 `a0cc4a0`。
- `arsvine-lab` 历史上是独立 Next.js/Node `24.x` 项目；`arsvine-docs` 历史上是静态项目，build command 为 `pnpm build`、output directory 为 `doc_build`、Node `24.x`。这两个项目当前均已从 Vercel 项目清单移除。
- 删除前 Docs 最新 production deployment 对应 commit `6976a0f`；本地 `arsvine-docs` 的未提交重构没有进入该 deployment，仓库本地副本仍保留。
- Realm Beta 的历史 Vercel deployment 曾包含 `dev/x-timeline-provider-research` 的 READY preview；这证明研究分支曾被部署为候选预览，不证明它是独立生产服务。该项目目前已从团队项目清单移除。
- Vercel 当前团队项目清单只包含 `arsvine-realm`、`arsvine-admin` 和 `anti-fraud-quiz`；`arsvine-lab` 与 `arsvine-docs` 已删除。`quiz.arsvine.com` DNS 当前暂停，活动结束后再清理 quiz 项目关联和 quiz namespace。

### Vercel integration 与环境变量证据

CLI 的 Marketplace 资源清单此前显示：Realm 和 Admin 分别连接独立 Neon 资源；一个 Upstash for Redis 资源同时连接 `arsvine-realm`、`arsvine-realm-beta`、`arsvine-admin` 和临时 `anti-fraud-quiz`。`arsvine-realm-beta` 项目现已从当前 Vercel 项目清单移除，但共享 Upstash 资源未做删除操作，关联状态仍应单独复核。该段是 2026-09-13 的控制面 key 快照，旧 GitHub/bootstrap 变量不代表当前 Realm/Console runtime；当前代码契约以各仓库 `.env.example` 为准。CLI 只读取 key、target 和类型，没有读取 value。

### 已验证的公开运行信号

本次通过公开 DNS/HTTP 只读检查得到以下信号：

- `arsvine.com`、`ctrl.arsvine.com`、`docs.arsvine.com`、`lab.arsvine.com` 的 HTTP 响应包含 `Server: Vercel`；`ctrl.arsvine.com/login` 返回 Next.js 页面，`/api/admin/session` 与 `/api/cron/x-timeline` 在无凭据请求时返回 `401`。
- `arsvine.com` 的本次无会话请求返回 `429`，同时带 `X-Vercel-Mitigated: challenge`；这证明该请求经过 Vercel challenge，不证明主站应用本身下线。
- `cdn.arsvine.com` 的 DNS CNAME 指向 `*.eo.dnse0.com`；响应包含 `EO-Cache-Status` 和 `Server: tencent-cos`。腾讯 EdgeOne 官方文档将 `EO-Cache-Status` 定义为边缘缓存状态，并将 COS 列为常见源站 Server 值，因此资产链路按 EdgeOne/CDN → COS 记录。
- `cdn.arsvine.com/realm/site-catalog/current.json` 返回 `20260912T144508Z`；该 version 的公有 `assets.json` 当前为 `{"assets":{}}`。本地生成输出也是同一形状；这只说明 allowlisted site-catalog 记录为空，不能推断所有媒体对象不存在。
- `arsvine.com` 的权威 NS 查询返回 `lydia.dnspod.net` 和 `blithe.dnspod.net`，因此 DNSPod 作为当前权威 DNS 供应商有 `LIVE` 证据。具体账号、解析策略和 apex 记录仍未访问后台确认。
- 腾讯云控制台进一步确认 DNSPod 的完整记录分组、COS ACL/CORS/Referer/容灾状态、EdgeOne 源站/缓存/WAF/日志状态和 SSL 绑定；详见 [`TENCENT_CLOUD_SNAPSHOT.md`](./TENCENT_CLOUD_SNAPSHOT.md)。这些控制面读数按 `CLAIMED` 处理。

## 尚未确认的系统事实

- Realm 和 Admin 的 Neon Marketplace 资源已经分开，但各自 `DATABASE_URL` 对应的实际 database/branch、是否存在额外共享层仍未读取；Schema 可以共存，连接串归属仍需 Neon 后台确认。
- Admin 的 Vercel project、plan、主要 environment scope 已由 CLI 确认；preview protection、实际 Cron dashboard last-run/failure 和自动部署规则仍未确认。
- COS 私有 Catalog 桶的生命周期规则、COS/EdgeOne 备份恢复演练、COS 盗刷告警创建与告警接收策略仍未确定；当前 ACL、CORS、Referer、版本、复制、加密、日志和主要 EdgeOne 配置见 [`TENCENT_CLOUD_SNAPSHOT.md`](./TENCENT_CLOUD_SNAPSHOT.md)。
- DNSPod 中暂停的 `docs`、`lab`、`quiz` 记录与公共 DNS 缓存的收敛时间仍需在后续清理窗口确认；Vercel 项目删除与 DNS 记录删除必须分别确认，项目域名关联不等于记录已启用。
- 已废弃独立 Content 仓库的 branch protection、Token、审查规则和 webhook 设置不再属于当前运行时；如需迁移追溯，只保留历史记录。
- 生产翻译 endpoint 的真实供应商；代码接受 OpenAI-compatible URL，示例默认值是 DeepSeek，不能当作生产事实。
- `arsvine-docs` 项目已删除；其仓库当前未提交重构的后续处置，以及公开站点是否应成为未来系统架构文档的发布面仍未决定。

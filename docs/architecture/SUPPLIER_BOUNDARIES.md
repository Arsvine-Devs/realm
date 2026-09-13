# 外部供应商与替换边界

[返回文档组](./README.md)

本文只列出承担托管、存储、身份、调度、CDN/DNS 或外部 API 责任的供应商。普通框架和 npm/pnpm 依赖不作为供应商清单；只有它们直接连接到某个外部平台时，才在相关条目中出现。

## 结论先行

当前系统对供应商的依赖强度不相同：

- Vercel 同时承担多个运行时和平台能力，是当前最宽的耦合面。
- GitHub 不是单纯源码托管，它是 Content 的生产存储和 Admin 的写入协议；它与业务数据格式绑定最深。
- Neon 承担真正的持久状态，Realm 与 Admin 的表/职责分开，但是否同一 project 未知。
- COS/EdgeOne 的媒体链路已经通过 `catalogKey`、immutable object 和 pointer-last 形成相对清晰的语义边界。
- Upstash 只承担限流状态，X 和翻译只承担可选的输入/处理能力，迁移优先级较低；临时 quiz 也使用同一 Upstash resource，清理必须按 namespace 进行。
- DNSPod 没有代码耦合，但域名切换时是必要的控制面；域名注册和 SSL 证书仍是独立的腾讯云控制面责任。

## 供应商矩阵

状态含义：`CURRENT` 表示代码或配置已确认，`LIVE` 表示公开探测到，`CLAIMED` 表示控制台、文档或配置意图已观察到但尚未由外部运行时独立证明，`UNKNOWN` 表示仍缺少足够事实。

| 供应商/平台          | 当前职责                                                                                                                                                             | 代码/配置耦合          | 当前证据                                           | 脱离方式与主要风险                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Vercel               | Realm/Admin 托管；临时 anti-fraud-quiz；历史 Docs/Lab/Realm Beta；Realm ISR/Functions/Proxy/Geo；Admin Cron；部分 Analytics/Speed Insights；主站生产访问层 challenge | 高                     | `CURRENT` + `LIVE` + `CLAIMED`                     | Node/VPS + 反向代理；替换 Cron、Geo、WAF、缓存/ISR、日志和 telemetry；平台时限、重试、并发语义需要重新实现                         |
| Neon                 | Realm 访客统计；Admin 账户、邀请、workspace、WebAuthn 和事件                                                                                                         | 中高                   | `CURRENT` + `CLAIMED`；数据库 branch `UNKNOWN`     | 标准 PostgreSQL + 迁移/备份；替换 `@neondatabase/serverless`/`drizzle-orm/neon-http` 的连接适配；保留事务与并发约束                |
| Upstash Redis        | Realm/Admin 多实例限流；历史 Realm Beta 关联；临时 anti-fraud-quiz 房间状态；`INCR` + `EXPIRE`/`PTTL`                                                                | 中                     | `CURRENT` + `CLAIMED`；共享 resource 已由 CLI 确认 | Redis/Valkey 自托管或其他 Redis-compatible service；必须决定 Redis 故障时继续 fail-open 还是切换策略；不得删除共享 resource        |
| GitHub               | Content 仓库；Realm 私有读取；Admin 文件写入、删除、树扫描、sha 冲突控制和 commit history                                                                            | 高                     | `CURRENT`；内容仓库预期私有                        | 短期保留 GitHub 并替换托管即可；长期实现 `ContentRepository`/`CommitStore`，否则会把 GitHub Contents API 永久写进业务层            |
| Tencent COS          | 香港地域的公共媒体桶与私有 Catalog 桶；immutable media、private Catalog、public site catalog、字体和音频                                                             | 中高                   | `CURRENT` + `LIVE` + `CLAIMED`                     | S3/COS-compatible object store + `BlobStore`/Catalog pointer；需迁移对象、metadata、CORS、Referer、缓存和回滚版本                  |
| Tencent EdgeOne      | `cdn.arsvine.com` 的 COS 直回源、边缘缓存、HTTPS、IPv6、WAF/频控和 Bot 处置；代码看到 `EO-Cache-Status`，不直接调用 EdgeOne API                                      | 低到中，主要是运维配置 | `LIVE` + `CLAIMED` + 源码注释                      | Nginx/Caddy/CDN/其他边缘层；保留 `objectKey` URL、immutable cache、CORS、TLS、WAF 和 custom-domain 行为                            |
| Tencent DNSPod       | `arsvine.com` 权威 DNS、注册域名的解析记录和子域 CNAME 管理面                                                                                                        | 低                     | `LIVE` + `CLAIMED`，NS 为 `*.dnspod.net`           | 迁移 DNS zone 到其他托管 DNS；先降低 TTL、并行验证 CNAME/TLS，再切换；暂停记录、缓存和 Vercel 关联需分开核对                       |
| Tencent Domain/SSL   | 域名注册续费、SSL 证书签发/托管及 COS/EdgeOne 绑定                                                                                                                   | 无运行时代码耦合       | `CLAIMED`；控制台台账                              | 迁移注册商、ACME/其他 CA 和证书部署流程；必须分别处理续费、DNS 验证、边缘绑定和源站绑定                                            |
| X                    | Admin 可选的 user-post timeline source；bearer token、`since_id`、pagination token、external ID reconciliation                                                       | 中高，但功能可选       | `CURRENT`                                          | 保留已归档内容并关闭同步；或实现 `TimelineProvider` 替换来源；X API 当前按使用计费，配额/价格会影响运行成本                        |
| Translation endpoint | Admin per-workspace OpenAI-compatible `chat/completions`；博客和推文翻译                                                                                             | 中                     | `CURRENT`，真实厂商 `UNKNOWN`                      | 保留 `TranslationProvider` 接口，替换 endpoint/key/model；DeepSeek-specific branch 需变成 provider capability，而非 URL 字符串猜测 |
| Hitokoto             | Realm `/api/hitokoto` 的上游句子源                                                                                                                                   | 低                     | `CURRENT`                                          | 预置本地句库或其他 quote source；保留服务端代理、timeout、cache 和 fallback                                                        |
| Google Fonts         | 资产构建阶段的 CSS/字体来源；浏览器生产路径改为 `cdn.arsvine.com`                                                                                                    | 低                     | `CURRENT`                                          | 继续自托管已下载字体；取消 build-time fetch 后需保留 license、unicode-range 和 font metadata                                       |

## 各供应商边界

### Vercel：当前最宽的供应商面

Realm：

- `src/app/` 按 Next.js App Router 产出页面和 Route Handler。
- `src/proxy.ts` 使用 `@vercel/functions` 的 `geolocation()`，并依据 `VERCEL=1` 信任平台注入的 forwarding headers。
- 页面使用 ISR/SSR，`/api/*` 多为 Node dynamic route。
- `@vercel/analytics`、`@vercel/speed-insights` 仅在选择了 Vercel telemetry provider 时加载。

Admin：

- `vercel.json` 注册 `/api/cron/x-timeline` 的 `0 2 * * *` schedule。
- Cron route 读取 `CRON_SECRET`，每个 active workspace 执行一次 recent X sync。
- Admin 公开响应的 CSP/headers 和 `ctrl.arsvine.com` live headers 表明其当前为 Vercel/Next.js 运行。

Docs/Lab/临时活动站：

- Docs 以 `doc_build/` 静态输出部署；Lab 公开首页也返回 Vercel prerender/cache headers。
- `arsvine-docs` 历史上是独立站点，项目现已删除；即使其内容过时，也不应被误认成 Realm runtime 的依赖。
- `anti-fraud-quiz` 是公开 GitHub 仓库驱动的静态 HTML + Functions 项目，输出目录为 `public`，生产 deployment 已 `READY`；`quiz.arsvine.com` 在 DNSPod 中暂停，Vercel 报告该自定义域名尚未正确配置。它是明天活动的临时站点，活动后删除项目和域名关联。

Vercel CLI 还确认团队为 Hobby，当前仍在清单中的 `arsvine-realm`、`arsvine-admin` 使用 Next.js/Node `24.x`，`anti-fraud-quiz` 使用 Other preset 和 `public` 输出。`arsvine-realm` 与 `arsvine-admin` 的最新 production deployment 都是 `READY`，并分别锁定当前调查时的 Realm/Admin commit。删除前 Docs production 曾锁定旧的 `6976a0f`，因此本地未提交文档重构不影响当前核心站点。`arsvine-lab`、`arsvine-docs` 和 `arsvine-realm-beta` 已不在当前项目清单中。

Vercel 官方资料说明：Cron 触发 Vercel Function，Hobby 每日最多一次且时间精度为小时级；失败不会自动重试，重复投递/重叠运行需要应用自行处理锁和幂等。见 [Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) 与 [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)。

Next.js 16 的 `proxy.ts` 约定可自托管，但 Vercel-specific Geo helper、Vercel Bot Protection、Vercel Analytics 和 Speed Insights 不会随普通 Node 进程自动存在。见 [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)、[Next.js Proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) 和 [Vercel Next.js guide](https://vercel.com/docs/frameworks/full-stack/nextjs)。

### Neon：两组持久化责任

Realm 使用 `@neondatabase/serverless` 的 `neon(DATABASE_URL)` 保存访客统计；Realm 的 SQL 表前缀为 `arsvine_visitor_*`，包含匿名 identity、日访问、总计数和 baseline。统计失败只影响 About 的数字，不阻断主站其他页面。

Admin 使用 `drizzle-orm/neon-http`，Schema 当前包括：

- `users`：唯一 Owner、Editor、账户状态、auth method、session version；
- `workspace_configs`：每个用户一条 AES-256-GCM 加密配置；
- `invitations`、`account_events`：成员邀请和安全事件；
- `webauthn_challenges`、`webauthn_credentials`：认证挑战、credential、公钥、counter、撤销时间和设备 metadata。

Neon 官方 serverless driver 支持在 serverless/edge 环境通过 HTTP 或 WebSocket 查询；当前 Realm/Admin 都选择 HTTP 路径。见 [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)。Vercel Marketplace 当前显示 Realm 与 Admin 连接的是两条独立 Neon 资源；实际 database/branch 和连接串仍未读取。这让当前代码适合无长连接运行时，也意味着 VPS 迁移时需要重新选择 PostgreSQL driver/pool。

当前 Vercel integration 证据支持两个应用使用分开的 Neon 资源，但没有读取 Neon 后台的 project/branch 详情。迁移前仍应明确选择同库分 schema、同项目分数据库，或完全分离的 PostgreSQL 实例，并分别验证 backup/restore、migration、连接上限和访问权限。

### Upstash：限流状态，不是业务真相

Realm/Admin 都通过 `@upstash/redis` 连接 REST API。限流实现使用固定窗口：`INCR` 后首次 `EXPIRE`，后续用 `PTTL` 修复异常无 TTL 状态。

- 未配置时使用进程内 `Map`。
- Redis 请求失败时回退到本地 Map，并写错误日志。
- 这个 fail-open 行为保留用户可用性，但多实例场景下不再有全局限流保证。

Upstash 官方将其 TypeScript client 定义为基于 HTTP/REST 的 Redis client，适合 serverless；Vercel integration 通过 REST URL/token 注入变量。见 [@upstash/redis connection](https://upstash.com/docs/redis/howto/connect-with-upstash-redis) 与 [Vercel integration](https://upstash.com/docs/redis/howto/vercelintegration)。迁移到 VPS 时可使用本地 Redis/Valkey，但应先保留相同的 key、窗口、计数和故障策略。

Vercel Marketplace 此前显示这一条 Upstash resource 同时连接 Realm、Realm Beta、Admin 和临时 `anti-fraud-quiz`；Realm Beta 项目现已不在当前 Vercel 项目清单中，资源本身未做删除操作。quiz 使用 `QUIZ_*` 变量与独立 prefix；活动结束时只能清理 quiz keys/prefix 或解除项目关联，不得删除整个 resource。

### GitHub：内容存储和写入协议合二为一

Realm 只读：

- `GITHUB_OWNER`、`GITHUB_REPO`、`GITHUB_BRANCH`、`GITHUB_READ_TOKEN` 是全局应用环境变量。
- 服务端使用 Contents API raw media type 读取 index、MDX 和 tweet JSON。
- Content API 不直接暴露给浏览器。

Admin 读写：

- workspace 为每个成员保存 owner/repo/branch/token。
- Admin 使用 Git Trees API 列出博客 variant/月文件，Contents API 读取并使用 `sha` 做更新条件。
- `PUT`/`DELETE` 会产生 Git commit；多文件 batch 是多个串行 file operation。

GitHub 官方 Contents API 支持读取文件/目录、使用 Git Trees API 递归读取树，以及用 Base64 内容创建/更新/删除文件；更新必须提供当前 file SHA，Contents API 的并发写入可能产生冲突。见 [REST API endpoints for repository contents](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28)。

Realm 还使用 GitHub Actions 在 push/pull request 上运行 Ubuntu `pnpm check` 和 Windows `pnpm build`；Admin、Content、Docs、Lab 当前没有发现同类 workflow。该 CI 是交付验证面，不是 Content 运行时数据源；VPS 迁移时可以保留 GitHub Actions，也可以迁移到其他 CI runner。

因此 GitHub 是当前最深的业务供应商边界。若只是脱离 Vercel，建议暂时保留 GitHub；若同时脱离 GitHub，必须先定义 repository-neutral 的 path、ref、read/list、CAS write/delete、commit/audit 和 conflict contract。

### COS + EdgeOne：已有语义化资产边界

Realm 的资产流将稳定 `catalogKey` 写在业务数据中，把 hash `objectKey` 留给 Catalog build。构建阶段由 source manifest 和本地 workspace 生成：

1. 从 `cos-workspace/public-root-legacy` 或本地 staging 读取原始媒体。
2. 用 `sharp` 处理图片、计算短 hash、写入 `dist/cos-upload/public-root`。
3. 生成 `dist/cos-upload/private-root/realm/catalog/versions/<version>/*.json`。
4. 生成 public `realm/site-catalog/versions/<version>/assets.json`。
5. 用 COSCLI 先同步对象、验证目标对象，再分别切换 public/private `current.json` pointer。
6. pointer 成功切换后调用 Realm `/api/revalidate-assets`。

Realm server 通过 `cos-nodejs-sdk-v5` 读取 private Catalog；浏览器使用 public CDN object。当前 public/private pointer-last 语义和 versioned path 是未来替换对象存储时最应该保留的产品语义。

腾讯云控制台快照显示：两个桶都位于香港且 ACL 为私有读写；公共媒体桶约 171 MB，私有 Catalog 桶控制台容量显示为 0 B。公共媒体桶由 EdgeOne 通过桶策略读取，私有 Catalog 桶没有额外 bucket policy 行。两只桶的 CORS 和 Referer 白名单、服务端加密、日志状态见 [`TENCENT_CLOUD_SNAPSHOT.md`](./TENCENT_CLOUD_SNAPSHOT.md)。Realm 浏览器只读公共 CDN，私有 Catalog CORS 没有应用消费者；本次已移除私有桶的浏览器跨域规则，公共桶的开发/Preview 来源保留。

公共媒体桶的多 AZ、对象版本控制、跨地域复制均未开启；私有 Catalog 桶只开启了多 AZ，版本控制与跨地域复制仍未开启。公共桶的 COS 全球加速已关闭，私有桶原本就是关闭；EdgeOne 当前使用 COS 默认源站，代码没有使用全球加速域名。腾讯云传统 CDN 页面显示未开通。资产恢复不能假设 COS 原生版本或复制可用。

COS 官方资料支持自定义 CDN 域名、以 COS 作为源站、COSCLI `sync`/`cp` 和对象版本控制；见 [COS CDN acceleration](https://cloud.tencent.com/document/product/436/18670)、[COSCLI sync](https://cloud.tencent.com/document/product/436/63670) 和 [COS versioning](https://cloud.tencent.com/document/product/43602)。EdgeOne 官方将 `EO-Cache-Status` 定义为边缘缓存命中状态，并识别 `Server: tencent-cos` 为 COS 源站信号；见 [EdgeOne response headers](https://cloud.tencent.com/document/product/1552/87655)。

本地 `cos-workspace/` 当前包含 raw media、Catalog metadata、COSCLI 和历史日志，整体被 Git 忽略。它不是可从单独代码 checkout 自动重建的完整输入面；VPS 迁移必须先决定原始媒体和 Catalog metadata 的持久归档位置。COS 盗刷检测还指出两个桶都没有外网下行流量告警，这属于独立的运维风险记录。

### EdgeOne：资产边缘层和安全策略

EdgeOne 控制台显示 `arsvine.com` 站点已启用，DNSPod 托管接入，全球可用区不含中国大陆，个人版；只有 `cdn.arsvine.com` 已生效并直接回源公共 COS。全局配置包括强制 HTTPS 302、HTTP/2 回源、TLS 1.2/1.3、IPv6、Gzip/Brotli；智能加速和 HTTP/3 关闭。规则引擎有两条已启用的媒体/字体缓存规则，节点缓存最长 30 天，浏览器缓存按资源类型为 1 天或 7 天，并设置字体 CORS 响应头。

站点级 Web 防护使用自适应频控和 AI 爬虫 JavaScript challenge，托管漏洞规则集启用且已退出评估模式；没有域名独立策略、自定义/例外规则、源站防护、实时日志推送或离线日志。客户端认证在当前个人版不可用。这些是供应商控制面快照，不是独立安全测试结论。

### DNSPod：无代码耦合的域名控制面

公开 DNS 的 NS 记录指向 DNSPod；控制台记录显示根域名、`www`、`cdn`、`ctrl` 启用，`docs`、`lab`、`quiz` 记录暂停；`beta`、`fusang`、`mayrain` 和 `private-cdn` 记录已移除。`private-cdn` 的 COS 自定义源站绑定及证书校验 TXT 也已移除，相关证书资源仍保留但未绑定。现有启用记录分别指向 Realm apex/`www`、EdgeOne 和 Admin Vercel；具体目标名会因供应商配置变化，不作为应用接口。

Vercel CLI 当前仍能看到临时 `quiz` 项目及其暂停子域关联；`docs`、`lab` 对应项目已删除但 DNS 记录仍暂停。控制台暂停、供应商 DNS 缓存和 Vercel 项目存在状态必须分开处理；清理历史项目不能只删除 Vercel 项目，也不能只停用 DNS 记录。

DNSPod 官方 CNAME 文档说明 CNAME 用于将子域指向 CDN 或其他提供域名服务的目标。见 [DNSPod CNAME records](https://docs.dnspod.com/dns/cname-record/)。迁移时 DNS zone、证书和 TTL 是独立切换项，应与应用、数据库、资产发布分开回滚。域名台账显示 `arsvine.com` 状态正常、自动续费开启、到期时间为 2027-06-10；注册商、DNSPod、证书和边缘域名的迁移责任彼此独立。

### X：可选输入源

Admin 的 `lib/x-timeline.ts` 固定使用 `https://api.x.com/2`，读取 user post timeline 和按 ID lookup，使用 bearer token、`since_id`、`pagination_token`、`exclude=replies/retweets` 和 `tweet.fields`/`expansions`。X 返回的数据被规范化后写入 Content JSON；Realm 不在访问者请求时调用 X。

X 官方文档定义 `/2/users/:id/tweets` 为 user posts endpoint，并支持 `since_id`、分页和 exclude；当前 X API v2 按实际使用计费。见 [X timelines](https://docs.x.com/x-api/posts/timelines/introduction)、[X API overview](https://docs.x.com/x-api/overview) 和 [X usage and billing](https://docs.x.com/x-api/fundamentals/post-cap)。

替换 X 时需要保留 external ID 去重、删除/缺失 reconciliation、cursor 持久化和同步错误状态；如果不再需要自动同步，可以关闭 provider，保留现有 Content archive。

### Translation endpoint：已经可配置，但仍有供应商判断逻辑

Admin 没有绑定单一 AI SDK，而是保存 `baseUrl` 并对 `${baseUrl}/chat/completions` 发 HTTP 请求。这是有利于替换供应商的现有边界。当前代码仍通过 URL/model 是否包含 `deepseek` 来决定发送 DeepSeek-specific 字段，因此 provider 语义尚未完全抽象。

生产 endpoint、账户、价格、保留策略和数据区域均为 `UNKNOWN`。文档只使用 `.env.example` 中的示例，不将 DeepSeek 写成已确认的生产供应商。

### Hitokoto 与 Google Fonts：低优先级外部来源

Realm 通过 `/api/hitokoto` 代理 `v1.hitokoto.cn`，采用 timeout、边缘/进程缓存、限流和预设 fallback。Hitokoto 官方提供句子接口、QPS 说明和自部署指引，见 [Hitokoto sentence API](https://developer.hitokoto.cn/sentence/)。脱离时可以把句库随站点打包，保留代理响应格式和失败 fallback。

字体脚本在构建阶段从 Google Fonts CSS 读取 family/weight/unicode-range，把字体下载并改写到 Realm COS CDN。生产 HTML 加载的是自有 CDN stylesheet，不是浏览器每次直接访问 Google Fonts。Google Fonts CSS API 的行为见 [Google Fonts API](https://developers.google.com/fonts/docs/getting_started)。如果资源授权和归档已满足，未来可以直接从受版本控制的本地字体源构建。

## 供应商中立的目标接口

这些是迁移时的责任边界，不代表本次要立即新增抽象层。优先把现有调用点压缩到已有语义 owner，再在真正迁移前实现适配器。

| 语义接口              | 当前实现                                         | 必须保留的语义                                                                        |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `ContentRepository`   | Realm `content/github.ts`；Admin `lib/github.ts` | repo-relative path、安全校验、ref、list/read、sha/CAS write/delete、冲突和审计 commit |
| `PublicRevalidator`   | Realm `/api/revalidate*` + Admin fetch           | secret 认证、路径集合、partial/failed 结果、POST body 优先                            |
| `BlobStore`           | COS SDK/COSCLI                                   | get/put/list/head、metadata、immutable object key、public/private access              |
| `CatalogPointer`      | COS `current.json` + versioned sections          | pointer-last、完整版本可读后切换、双层 public/private 一致性                          |
| `Database`            | Neon serverless driver + Drizzle                 | PostgreSQL schema、事务、唯一 Owner、challenge consume、visitor counter 原子更新      |
| `RateLimiter`         | Upstash REST + local Map fallback                | key 生成、窗口、INCR/TTL、fail-open 选择和 `Retry-After`                              |
| `TimelineProvider`    | X API v2                                         | page/cursor、since ID、by-ID reconciliation、归档 external ID                         |
| `TranslationProvider` | OpenAI-compatible fetch                          | structured JSON、source/target locale、model metadata、stale marking                  |
| `Scheduler`           | Vercel Cron                                      | authenticated invocation、daily cadence、idempotency、lock、per-workspace result      |
| `GeoProvider`         | Vercel `geolocation()` + proxy headers           | 只用于 UI/可见性；不参与 locale、授权或安全判断                                       |
| `TelemetryProvider`   | Vercel Analytics/Speed Insights                  | 可关闭、失败隔离、production/preview 范围明确                                         |
| `EdgeDistribution`    | EdgeOne + COS origin                             | public HTTPS、origin access、cache TTL、CORS/Referer、WAF、purge 和回源错误边界       |
| `DomainControl`       | DNSPod + registrar                               | zone records、TTL、verification、domain lifecycle；与应用部署独立                     |
| `CertificateManager`  | Tencent SSL + EdgeOne/COS bindings               | issuance、renewal、deployment association、expiry observation                         |

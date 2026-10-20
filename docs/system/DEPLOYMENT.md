# 部署

这次没有部署任何项目。下面区分源码里的构建方式和线上探针。

## 谁在托管

| 表面       | 构建（CURRENT）                                                                                                                                                                                                                | 线上（LIVE 或 UNKNOWN）                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Realm      | `next build`。Vercel 使用 App Router 输出。`server.js` 只给 `pnpm dev` 和可选自托管                                                                                                                                            | `server: Vercel`。首页与 `/api/health/live` 这次都是 429 challenge。deployment SHA `UNKNOWN` |
| Console    | Platform `apps/console`，Next.js 16                                                                                                                                                                                            | Vercel，健康检查 200                                                                         |
| Auth       | Platform `apps/auth`，Next.js 16                                                                                                                                                                                               | Vercel，健康检查与 OIDC discovery 200                                                        |
| API        | Platform `apps/api`，Fastify。`vercel.json` 的 install 是 `pnpm install --frozen-lockfile`，build 是 `pnpm --filter @arsvine/api... build`，`outputDirectory` 为 `dist`，rewrite 到 `/api`。函数入口是 `apps/api/api/index.ts` | Vercel，健康检查 200                                                                         |
| Content    | Platform `apps/content`，Fastify。`vercel.json` 与 API 同形，filter 是 `@arsvine/content...`，入口是 `apps/content/api/index.ts`                                                                                               | Vercel，健康检查 200                                                                         |
| Docs       | `dev/docs-rewrite` 上是 Next.js + Fumadocs。`pnpm dev` 端口 3400                                                                                                                                                               | `docs.arsvine.com` 无 DNS。是否已有未绑定的 Vercel 项目 `UNKNOWN`                            |
| Ripple     | 源码仓库这次 404。页面是 Vite 形态：`<div id="root">`，脚本和样式来自 `cdn.arsvine.com/ripple/releases/20261015T152226Z/assets/`                                                                                               | Vercel HTML 200。健康检查也是 Vercel                                                         |
| Status     | 不在这些仓库里构建                                                                                                                                                                                                             | CNAME 到 `statuspage.betteruptime.com`                                                       |
| Afterimage | 不在本次开发范围内                                                                                                                                                                                                             | Vercel HTML 200。未改动                                                                      |

Platform `infra/compose` 是参考环境，不是这次确认的生产路径。`AGENTS.md` 禁止为普通任务改 Compose。

## 旧文档里的 Vercel 项目名

Realm `docs/architecture/SUPPLIER_BOUNDARIES.md` 曾经写下团队 `arsvine-realm` 和项目 `arsvine-realm`、`arsvine-admin`、`arsvine-auth`、`arsvine-api`、`arsvine-content`，以及 rootDirectory、安装命令和生产提交。这次没有 Vercel token，也没有跑 `vercel projects ls`。那些名称保持 `CLAIMED`，生产提交保持 `UNKNOWN`。不要把 `CLAIMED` 表抄回本目录当新事实。

Neon 资源名 `neon-pink-ball`、`neon-camel-candle` 与 Upstash 资源名 `upstash-kv-bronze-candle` 同样是先前控制面叙述，这次未复核，记 `CLAIMED`。实际 database、branch、备份 `UNKNOWN`。

## 环境变量键名

只记名字。值在各自 `.env.example` 或部署环境里，不写入 git。

Realm（`.env.example`）：`PORT`、`NEXT_PUBLIC_TELEMETRY_PROVIDER`、`CONTENT_SERVICE_CLIENT_ID`、`CONTENT_SERVICE_CLIENT_SECRET`、`ACCESS_GRANT_SECRET`、`TOTP_GROUPS_JSON`、`REVALIDATE_WEBHOOK_SECRET`、`TRUST_PROXY`、`VISITOR_STATS_SECRET`、`DATABASE_URL`、`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`、`COS_PRIVATE_BUCKET`、`COS_PRIVATE_REGION`、`COS_PUBLIC_BUCKET`、`COS_PUBLIC_REGION`、`COS_SECRET_ID`、`COS_SECRET_KEY`、`COS_PRIVATE_CATALOG_PREFIX`，以及本地推文压测键 `TWEETS_STRESS_*`、`ANALYZE`、`NEXT_BUILD_DIR`。

Platform：

- Auth：`AUTH_DATABASE_URL`、`BETTER_AUTH_SECRET`、`AUTH_TRUSTED_ORIGINS`
- API：`PORT`、`HOST`、`CORE_DATABASE_URL`、`CONTENT_PUBLISH_TOKEN`、`REVALIDATE_WEBHOOK_SECRET`
- Content：`PORT`、`HOST`、`S3_ENDPOINT`、`S3_REGION`、`S3_FORCE_PATH_STYLE`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PRIVATE_BUCKET`、`CONTENT_PUBLISH_TOKEN`
- Console：`SESSION_SECRET`、`AUTH_OIDC_CLIENT_ID`、`AUTH_OIDC_CLIENT_SECRET`、`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`、`TRUST_PROXY`、`NEXT_PUBLIC_ANALYTICS_ENABLED`、`NEXT_PUBLIC_ANALYTICS_SCRIPT_ORIGIN`、`NEXT_PUBLIC_ANALYTICS_CONNECT_ORIGIN`

Docs 应用在缺少 `DOCS_OIDC_CLIENT_ID`、`DOCS_OIDC_CLIENT_SECRET`、`DOCS_SESSION_SECRET` 时，内部文档只显示未开放说明。

固定 origin 不放进 dotenv。它们属于 `@arsvine/site-config`。

## 运行时版本

各仓库 `engines.node` 为 `24.x`，`.nvmrc` 在 Realm 是 `24`。2026-10-20 Node 发布索引里，带 LTS 代号的最新版本是 `v24.22.0`（Krypton，2026-10-14）。`v26.12.0` 的 `lts` 字段是 false，所以没有把引擎改到 26。

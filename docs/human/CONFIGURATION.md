# 环境变量配置

[返回文档索引](../INDEX.md) · [运维文档](./OPERATIONS.md)

Realm 的配置分为源码拥有的固定站点拓扑和部署时注入的运行时输入。固定拓扑集中在 [`config/site-config.mjs`](../../config/site-config.mjs)，站点内容与页面 metadata 继续由 [`src/shared/config/site.ts`](../../src/shared/config/site.ts) 拥有；运行时输入由 [`scripts/lib/env-provider.mjs`](../../scripts/lib/env-provider.mjs) 和应用侧 [`src/shared/config/env-provider.ts`](../../src/shared/config/env-provider.ts) 读取。

固定拓扑包括 Realm、Auth、Content、CDN origin，Content/Auth 的服务关系以及 revalidation endpoint。它们不进入 dotenv，也不在 `.env.local` 中覆盖。修改固定拓扑时同步 OIDC registration、DNS、Vercel domain 和相关文档。

## 使用方式

```powershell
Copy-Item .env.example .env.local
pnpm envctl stats
pnpm envctl query --key CONTENT_SERVICE_CLIENT_ID
pnpm env:check
pnpm env:sync
```

dotenv 文件优先级为 `.env.<mode>.local`、`.env.local`、`.env.<mode>`、`.env`，已经存在于进程环境的值优先。provider 的 `readEnv()` 会去除首尾空白并把空字符串视为未配置；列表读取使用逗号分隔并逐项去空白。

生成随机 secret：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

真实 secret 只放在未跟踪 `.env.local`、Vercel 对应项目环境或临时发布进程中，不进入 Git、浏览器 bundle、日志或测试 fixture。

## 固定站点拓扑

| 代码位置                                             | 固定内容                                       | 使用方                                  |
| ---------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| `config/site-config.mjs` 的 `serviceOrigins.realm`   | `https://arsvine.com`                          | Realm canonical URL、API revalidation   |
| `config/site-config.mjs` 的 `serviceOrigins.auth`    | `https://auth.arsvine.com`                     | protected Content token issuer          |
| `config/site-config.mjs` 的 `serviceOrigins.content` | `https://content.arsvine.com`                  | Blog/Tweet published release read plane |
| `config/site-config.mjs` 的 `serviceOrigins.cdn`     | `https://cdn.arsvine.com`                      | 浏览器媒体、Catalog 和字体              |
| `src/shared/config/site.ts` 的 `siteConfig`          | 站名、作者、页面 metadata、字体、locale 和资源 | Realm 页面、RSS、sitemap、robots        |

`NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_CDN_BASE`、`CONTENT_BASE_URL` 和 `AUTH_ISSUER` 不属于当前 Realm 动态环境契约；对应值由上述静态配置提供。服务端请求 Content 时使用静态 Content origin，因此浏览器 F12 不会直接出现 Content 请求。

## 公共与开发选项

| 变量                             | 填入内容与格式                         | 作用和消费者                          | 作用域 / 可见性                | 缺失或错误行为              |
| -------------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------ | --------------------------- |
| `PORT`                           | 十进制 TCP 端口 `1`–`65535`；例 `3000` | `server.js` 监听端口                  | local/self-hosted；服务端      | 默认 `3000`                 |
| `NEXT_PUBLIC_TELEMETRY_PROVIDER` | 只填 `vercel` 或留空                   | `TelemetryRoot` 选择 Vercel telemetry | local/preview/production；公开 | 留空或其他值时不加载        |
| `TWEETS_STRESS_TEST`             | `1` 开启，其他值关闭                   | synthetic Tweet archive 开关          | local；开发配置                | 使用 published Content data |
| `TWEETS_STRESS_YEARS`            | 正整数；例 `6`                         | synthetic archive 年数                | local；开发配置                | 默认 `6`                    |
| `TWEETS_STRESS_MONTHS_PER_YEAR`  | 正整数；例 `12`                        | 每年 synthetic 月数                   | local；开发配置                | 默认 `12`                   |
| `TWEETS_STRESS_TWEETS_PER_MONTH` | 正整数；例 `24`                        | 每月 synthetic Tweet 数               | local；开发配置                | 默认 `24`                   |
| `ANALYZE`                        | 只填 `true` 开启                       | `next.config.js` bundle analyzer      | local；构建配置                | analyzer 关闭               |
| `NEXT_BUILD_DIR`                 | 相对构建目录；例 `.next`               | Next.js build output                  | local/self-hosted；构建配置    | 使用 `.next`                |

## 受保护内容、revalidation 与访问控制

| 变量                            | 填入内容与格式                                                                                              | 作用和消费者                                    | 作用域 / 可见性                  | 缺失或错误行为                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------- | ---------------------------------- |
| `CONTENT_SERVICE_CLIENT_ID`     | Auth 注册的 OAuth client ID；例 `realm-content-reader`                                                      | Realm 服务端申请 `content:protected:read` token | local/preview/production；服务端 | protected body 读取 fail closed    |
| `CONTENT_SERVICE_CLIENT_SECRET` | 与 client ID 配对的 OAuth client secret                                                                     | Realm → Auth client credentials                 | local/preview/production；secret | protected body 读取 fail closed    |
| `ACCESS_GRANT_SECRET`           | Realm 专用长随机字符串                                                                                      | protected-post grant cookie 签名                | local/preview/production；secret | grant 创建/校验 fail closed        |
| `TOTP_GROUPS_JSON`              | 单行 JSON object map；例如 `{"friends-a":{"current":"JBSWY3DPEHPK3PXP","period":30,"digits":6,"window":1}}` | TOTP group 配置；`current` 是 base32 secret     | local/preview/production；secret | 非法 JSON 拒绝；留空表示没有 group |
| `REVALIDATE_WEBHOOK_SECRET`     | API、Realm 和资产发布端共享的长随机 HMAC secret                                                             | 校验 Content/asset revalidation event           | local/preview/production；secret | stale/错误签名事件拒绝             |
| `TRUST_PROXY`                   | `1`/`0` 或 `true`/`false`；仅在受控代理覆盖 IP header 时为 `1`                                              | trusted client IP 与限流 key                    | local/self-hosted；服务端        | 默认不信任 forwarded header        |
| `UPSTASH_REDIS_REST_URL`        | 绝对 HTTPS Upstash REST URL                                                                                 | 分布式 limiter endpoint                         | local/preview/production；服务端 | 使用进程内 limiter                 |
| `UPSTASH_REDIS_REST_TOKEN`      | 与 REST URL 配对的 bearer token                                                                             | Upstash REST 鉴权                               | local/preview/production；secret | 使用进程内 limiter                 |

## 访客统计与 COS

| 变量                         | 填入内容与格式                                              | 作用和消费者                                        | 作用域 / 可见性                    | 缺失或错误行为                    |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- | --------------------------------- |
| `VISITOR_STATS_SECRET`       | visitor statistics 专用长随机 HMAC secret                   | 匿名统计 Cookie 和 DB 写入                          | local/preview/production；secret   | 统计持久化跳过                    |
| `DATABASE_URL`               | PostgreSQL URL；托管数据库带 `?sslmode=require`             | visitor statistics feature、migration、seed         | local/preview/production；secret   | 统计写入和 db 命令失败            |
| `COS_PRIVATE_BUCKET`         | COS bucket name，无 protocol 或 `/`                         | server-side private Catalog、private publish target | local/preview/production；服务端值 | COS client 不创建，发布拒绝       |
| `COS_PRIVATE_REGION`         | Tencent COS region；例 `ap-hongkong`                        | private Catalog COS client                          | local/preview/production；服务端   | COS client 不创建                 |
| `COS_PUBLIC_BUCKET`          | COS bucket name，无 protocol 或 `/`                         | asset publisher public target                       | local；服务端脚本                  | 资产发布拒绝                      |
| `COS_PUBLIC_REGION`          | Tencent COS region；例 `ap-hongkong`                        | asset publisher public target                       | local；服务端脚本                  | 资产发布拒绝                      |
| `COS_SECRET_ID`              | Tencent Cloud CAM SecretId                                  | COS SDK/COSCLI 鉴权                                 | local；secret                      | COS 读取/发布拒绝                 |
| `COS_SECRET_KEY`             | 与 SecretId 配对的 CAM SecretKey                            | COS SDK/COSCLI 鉴权                                 | local；secret                      | COS 读取/发布拒绝                 |
| `COS_PRIVATE_CATALOG_PREFIX` | 相对 object-key prefix，不带首尾 `/`；无前缀留空            | private Catalog namespace                           | local/preview/production；服务端   | 使用 `realm/catalog/...`          |
| `COS_SESSION_TOKEN`          | 临时 CAM credentials 的 session token                       | COSCLI 临时凭据                                     | local；secret                      | 使用 SecretId/SecretKey pair      |
| `COSCLI_PATH`                | COSCLI 可执行文件的绝对或仓库相对路径                       | asset publisher CLI 选择                            | local；服务端脚本                  | 使用默认 cos-workspace executable |
| `COS_PRIVATE_LOCAL_ROOT`     | 仓库相对测试 fixture 目录；例 `tests/fixtures/private-root` | test-only local Catalog fallback                    | test；本地                         | 使用 generated private-root       |

## 注册动态变量

```powershell
pnpm envctl register `
  --key NEW_SERVICE_SECRET `
  --section Security `
  --description "Credential for the service" `
  --format "long random secret" `
  --scope local,preview,production `
  --requiredness conditional `
  --example "replace-with-a-long-random-secret" `
  --used-by src/shared/config/site.ts `
  --secret
```

`envctl register` 会检查消费者路径，更新 `config/env-contracts.json` 和 `.env.example`。只用于发布脚本或测试的键使用 `--source-only`，不会进入模板。固定拓扑、协议常量和 display metadata 应修改 `config/site-config.mjs` 或 `src/shared/config/site.ts`，不要注册成环境变量。

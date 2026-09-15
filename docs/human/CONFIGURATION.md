# 环境变量配置

[返回文档目录](../INDEX.md) · [运维文档](./OPERATIONS.md)

Realm 的环境变量契约只有一个机器来源：[`config/env-contracts.json`](../../config/env-contracts.json)。[`.env.example`](../../.env.example) 是可复制的安全模板，`pnpm env:check` 检查模板、契约和消费者路径一致。真实值只放在未跟踪的 `.env.local`、Vercel 对应项目环境或临时发布进程中。

## 加载、查询和同步

```powershell
Copy-Item .env.example .env.local
pnpm envctl stats
pnpm envctl query --key CONTENT_BASE_URL
pnpm env:check
pnpm env:sync
```

Realm 内部 provider 位于 `src/shared/config/env-provider.ts` 和 `scripts/lib/env-provider.mjs`。前者供应用 server code 规范化读取，后者供 Node 入口和脚本加载 dotenv、读取值和解析列表；文件优先级为 `.env.<mode>.local`、`.env.local`、`.env.<mode>`、`.env`，已经存在于进程环境的值优先。provider 的 `readEnv()` 会去除首尾空白并把空字符串视为未配置；列表读取使用逗号分隔并逐项去空白。

`pnpm env:sync` 以契约重建 `.env.example` 和 `.env.local` 的登记键：已有登记值保留，缺失值填入登记的本地默认值，未登记键清理；三个 source-only 键只在本地发布或测试时使用，不写入 `.env.example`。`pnpm envctl query` 只报告元数据和 set/unset 状态，不打印任何值。

随机 secret 可以用：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

把输出粘贴到相应的 secret 条目，不要提交或记录输出。`NEXT_PUBLIC_*` 只用于确实要进入浏览器的公开值；其余 secret 由服务端读取。

## Core 与公共面

| 变量                             | 填入内容与格式                                                    | 作用和消费者                                                    | 作用域 / 可见性                | 缺失或错误行为                                                      |
| -------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `PORT`                           | 十进制 TCP 端口 `1`–`65535`；默认示例 `3000`                      | `server.js` 监听端口                                            | local/self-hosted；服务端      | 默认 `3000`                                                         |
| `NEXT_PUBLIC_SITE_URL`           | 绝对 HTTPS canonical origin；例 `https://arsvine.com`             | sitemap、RSS、robots、Open Graph、canonical 和资产 revalidation | local/preview/production；公开 | 页面 metadata 使用内置 Realm URL；发布脚本没有值时拒绝 revalidation |
| `NEXT_PUBLIC_CDN_BASE`           | 绝对 HTTPS CDN origin，不带尾部 `/`；例 `https://cdn.arsvine.com` | `src/shared/lib/cdn.ts` 组装媒体 URL                            | local/preview/production；公开 | 使用内置 CDN origin                                                 |
| `NEXT_PUBLIC_TELEMETRY_PROVIDER` | 只填 `vercel` 或留空                                              | `TelemetryRoot` 选择 Vercel Analytics/Speed Insights            | local/preview/production；公开 | 留空或其他值时不加载 telemetry                                      |

## Content 与受保护文章

| 变量                            | 填入内容与格式                                                                                                                          | 作用和消费者                                       | 作用域 / 可见性                                      | 缺失或错误行为                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `CONTENT_BASE_URL`              | 绝对 HTTPS Content service origin；例 `https://content.arsvine.com`                                                                     | `content-api.ts` 读取 published Blog/Tweet release | local/preview/production；服务端 origin              | `/api/health/ready` 失败，页面读取返回 Content error |
| `AUTH_ISSUER`                   | 绝对 HTTPS Auth issuer origin；例 `https://auth.arsvine.com`                                                                            | protected Content token 的 issuer                  | local/preview/production；公开 origin                | 受保护正文读取 fail closed                           |
| `CONTENT_SERVICE_CLIENT_ID`     | Auth 注册的 OAuth client ID；例 `realm-content-reader`                                                                                  | Realm 服务端申请 `content:protected:read` token    | local/preview/production；非 secret ID，仍只在服务端 | 受保护正文读取 fail closed                           |
| `CONTENT_SERVICE_CLIENT_SECRET` | 与 client ID 配对的 OAuth client secret                                                                                                 | Realm → Auth client credentials                    | local/preview/production；secret                     | 受保护正文读取 fail closed，不能进入浏览器           |
| `ACCESS_GRANT_SECRET`           | Realm 专用长随机字符串                                                                                                                  | 签名 protected-post access grant cookie            | local/preview/production；secret                     | grant 创建/校验 fail closed                          |
| `TOTP_GROUPS_JSON`              | 单行 JSON object map，例如 `{"friends-a":{"current":"JBSWY3DPEHPK3PXP","period":30,"digits":6,"window":1}}`；`current` 是 base32 secret | 服务端 TOTP group 配置                             | local/preview/production；secret                     | 非法 JSON 拒绝；留空表示没有可用 group               |

## Revalidation、限流与统计

| 变量                        | 填入内容与格式                                                                | 作用和消费者                                      | 作用域 / 可见性                  | 缺失或错误行为                                       |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `REVALIDATE_WEBHOOK_SECRET` | API、Realm 和资产发布端共享的长随机 HMAC secret                               | 校验 `timestamp + "." + raw body` 的 SHA-256 HMAC | local/preview/production；secret | stale、无签名或错误签名事件拒绝                      |
| `TRUST_PROXY`               | `1`/`0` 或 `true`/`false`；仅在受控反向代理覆盖 forwarding IP header 时为 `1` | `src/shared/server/http.ts` 取得可信 client IP    | local/self-hosted；服务端        | 默认不信任 forwarded header；Vercel 由平台上下文识别 |
| `UPSTASH_REDIS_REST_URL`    | 绝对 HTTPS Upstash REST URL；例 `https://xxx.upstash.io`                      | Content/TOTP/revalidation limiter 的分布式状态    | local/preview/production；服务端 | 与 token 任一缺失或 Redis 故障时使用进程内 limiter   |
| `UPSTASH_REDIS_REST_TOKEN`  | 与 REST URL 配对的 bearer token                                               | Upstash REST 鉴权                                 | local/preview/production；secret | 使用进程内 limiter，不提供多实例一致性               |
| `VISITOR_STATS_SECRET`      | Realm 访客统计专用长随机 HMAC secret                                          | 匿名统计 Cookie 和 visitor DB 写入                | local/preview/production；secret | 统计持久化跳过，不阻断其它页面                       |
| `DATABASE_URL`              | PostgreSQL connection URL；托管数据库带 `?sslmode=require`                    | visitor statistics feature 和迁移/seed 脚本       | local/preview/production；secret | 统计写入和 `db:*` 命令失败                           |

## COS 运行时与发布

| 变量                         | 填入内容与格式                                              | 作用和消费者                                        | 作用域 / 可见性                    | 缺失或错误行为                                |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- | --------------------------------------------- |
| `COS_PRIVATE_BUCKET`         | COS bucket name，不带 protocol 或 `/`                       | 服务端读取 private Catalog；资产发布 private target | local/preview/production；服务端值 | private Catalog client 不创建；发布拒绝       |
| `COS_PRIVATE_REGION`         | Tencent COS region identifier；例 `ap-hongkong`             | private Catalog COS client 和发布 target            | local/preview/production；服务端   | private Catalog client 不创建；发布拒绝       |
| `COS_PUBLIC_BUCKET`          | COS bucket name，不带 protocol 或 `/`                       | `assets:publish` public media target                | local；服务端脚本                  | 资产发布拒绝                                  |
| `COS_PUBLIC_REGION`          | Tencent COS region identifier；例 `ap-hongkong`             | `assets:publish` public media target                | local；服务端脚本                  | 资产发布拒绝                                  |
| `COS_SECRET_ID`              | Tencent Cloud CAM SecretId                                  | COS SDK/COSCLI 鉴权                                 | local；secret                      | COS 读取或发布拒绝                            |
| `COS_SECRET_KEY`             | 与 SecretId 配对的 CAM SecretKey                            | COS SDK/COSCLI 鉴权                                 | local；secret                      | COS 读取或发布拒绝                            |
| `COS_PRIVATE_CATALOG_PREFIX` | 相对 object-key prefix，不带首尾 `/`；没有前缀时留空        | private Catalog key namespace                       | local/preview/production；服务端   | 直接使用 `realm/catalog/...`                  |
| `COS_SESSION_TOKEN`          | 临时 CAM credentials 的 session token                       | `assets:publish` 传给 COSCLI 的临时 token           | local；secret                      | 使用 SecretId/SecretKey pair                  |
| `COSCLI_PATH`                | COSCLI 可执行文件的绝对或仓库相对路径                       | `assets:publish` 选择 CLI                           | local；服务端脚本                  | 使用 `cos-workspace/coscli-windows-amd64.exe` |
| `COS_PRIVATE_LOCAL_ROOT`     | 仓库相对测试 fixture 目录；例 `tests/fixtures/private-root` | 测试环境的 local Catalog fallback root              | test；本地                         | 使用 `dist/cos-upload/private-root`           |

## Tweet 开发数据与构建选项

| 变量                             | 填入内容与格式               | 作用和消费者                        | 作用域 / 可见性             | 缺失或错误行为              |
| -------------------------------- | ---------------------------- | ----------------------------------- | --------------------------- | --------------------------- |
| `TWEETS_STRESS_TEST`             | `1` 开启，其他值关闭         | Tweet server synthetic archive 开关 | local；公开开发配置         | 使用 published Content data |
| `TWEETS_STRESS_YEARS`            | 正整数；例 `6`               | synthetic archive 年数              | local；开发配置             | 默认 `6`                    |
| `TWEETS_STRESS_MONTHS_PER_YEAR`  | 正整数；例 `12`              | 每年 synthetic 月数                 | local；开发配置             | 默认 `12`                   |
| `TWEETS_STRESS_TWEETS_PER_MONTH` | 正整数；例 `24`              | 每月 synthetic Tweet 数             | local；开发配置             | 默认 `24`                   |
| `ANALYZE`                        | 只填 `true` 开启             | `next.config.js` bundle analyzer    | local；构建配置             | analyzer 关闭               |
| `NEXT_BUILD_DIR`                 | 相对构建目录路径；例 `.next` | Next.js build output directory      | local/self-hosted；构建配置 | 使用 `.next`                |

## 注册变量

```powershell
pnpm envctl register `
  --key NEW_SERVICE_URL `
  --section Core `
  --description "Destination for the service" `
  --format "absolute HTTPS origin" `
  --scope local,preview,production `
  --requiredness conditional `
  --example "https://service.example.com" `
  --used-by src/shared/config/site.ts
```

`envctl register` 要求消费者路径存在，并同步写入 `config/env-contracts.json` 和 `.env.example`。只用于脚本/测试的键可使用 `--source-only`，这样不会进入示例文件。secret 的 `--example` 只能是占位符；真实值要通过本地未跟踪文件、Vercel CLI 或部署控制面单独注入。

# 部署与运维

[返回文档索引](../INDEX.md)

本文覆盖 Vercel、自托管、环境配置、ISR/revalidation、外部服务、发布 smoke test、回滚和故障响应。资产发布细节见 [`ASSETS.md`](./ASSETS.md)。

## 两种运行模式

### Vercel（当前生产）

Vercel 不运行 `server.js`，也不执行 `pnpm start`。它使用标准 Next.js 输出：

- `src/proxy.ts` → Proxy；
- `src/app/api/**/route.ts` → Functions；
- App Router page → static、ISR 或 dynamic rendering。

Build command：

```bash
pnpm build
```

Node.js 项目设置应为 `24.x`，并与 `package.json#engines` 一致。

### 自托管

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

`pnpm start` 运行：

```text
cross-env NODE_ENV=production node server.js
```

进程管理器示例：

```bash
pm2 start server.js --name arsvine-realm
```

自托管反向代理必须传递正确 host/protocol，并只在它覆盖 forwarding IP header 时设置 `TRUST_PROXY=1`。

### Docker 参考镜像

仓库根目录的 [`Dockerfile`](../../Dockerfile) 提供 Node.js 24 参考镜像。它不把 Content、COS、Neon 或 Upstash 凭据写入镜像：

```bash
docker build -t arsvine-realm:local .
docker run --rm -p 3000:3000 \\
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \\
  -e CONTENT_BASE_URL=http://localhost:3002 \\
  arsvine-realm:local
```

容器健康入口：

```text
GET /api/health/live   # 进程可响应
GET /api/health/ready  # Realm 进程和必要的当前运行配置可接收请求
```

`ready` 不等于 Content release、COS、Neon 或 Upstash 的完整业务验收；生产内容读取通过 `CONTENT_BASE_URL` 指向的 Content service 完成。

## 生产配置

最低配置：

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://arsvine.com
CONTENT_BASE_URL=https://content.arsvine.com
AUTH_ISSUER=https://auth.arsvine.com
```

受保护文章还需要服务端 `CONTENT_SERVICE_CLIENT_ID`、`CONTENT_SERVICE_CLIENT_SECRET` 和 `REVALIDATE_WEBHOOK_SECRET`。实际功能还可能需要 TOTP、Upstash、COS、Neon 变量。Realm 运行时不依赖 GitHub 内容变量。完整矩阵见 [`API-REF.md`](../ai/API-REF.md)。

部署环境中的 secret 不得暴露为 `NEXT_PUBLIC_*`。

## Realm 环境变量目录

完整的变量用途、填写格式、secret 可见性、作用域、消费者和失败行为见 [`CONFIGURATION.md`](./CONFIGURATION.md)。机器契约是 [`config/env-contracts.json`](../../config/env-contracts.json)，由 `pnpm env:check` 校验。

常用命令：

```bash
pnpm envctl stats
pnpm envctl query --key CONTENT_BASE_URL
pnpm env:sync
pnpm env:check
```

`.env.local` 是未跟踪文件。`pnpm env:sync` 按环境契约重建 `.env.example` 和本地键集合，保留已登记值、填入登记的默认值，并清理未登记键；source-only 的资产发布/测试输入只在本地文件中维护，不进入示例文件。Vercel 项目使用同名变量和对应 scope，真实 secret 不进入仓库。

## 发布前检查

```bash
pnpm install --frozen-lockfile
pnpm check
git status --short
```

确认：

- Node/pnpm 版本正确；
- lockfile 与 patch 可应用；
- 环境变量已配置到正确 environment；
- 没有把 `.env.local`、`cos-workspace/`、`dist/` 或私有媒体加入提交；
- protected post 和 asset Catalog 依赖已准备；
- 文档中的 migration/rollback 步骤已评审。
- Neon production branch 已完成 visitor statistics migration。

## Revalidation API

当前唯一的服务间刷新接口是 `POST /api/internal/revalidate`。Content/API 和资产发布脚本发送 JSON 事件，并使用 `REVALIDATE_WEBHOOK_SECRET` 对 `timestamp-header + "." + raw-body` 计算 SHA-256 HMAC，签名放在 `X-Arsvine-Signature`，毫秒时间戳放在 `X-Arsvine-Timestamp`。

事件类型为 `content.published` 或 `assets.published`。Content 事件的 `resources` 使用 `posts:<slug>`、`tweets`；资产事件使用 `assets`。Realm 只接受时间窗口内的有效签名，不接受浏览器请求、query secret 或旧的多端点协议。

发布方必须检查响应中的 `revalidated`、`failed` 和 HTTP 状态；部分刷新会返回 `partial`，全部失败返回 `500`。

## Published Content service

生产 Function 通过 `CONTENT_BASE_URL` 读取已发布 release。运维检查：

1. `CONTENT_BASE_URL` 使用生产 Content URL。
2. `/health/ready` 能读取当前 pointer 和 manifest。
3. `/v1/posts` 与 `/v1/tweets/months` 返回当前 release。
4. 公开 protected variant 返回 `PROTECTED_CONTENT`。
5. Realm 访客 grant 成功后，server-only service token 才能读取 protected body。

Content release 是生产内容的唯一读取来源；故障处理应检查 Content pointer、manifest 和服务认证，不恢复 GitHub 回退。

## Protected post

生产验收：

1. 未授权打开 protected page，只显示清理后的 metadata/gate。
2. HTML/RSC 中没有正文。
3. `/api/post-variant` 未授权返回 `403`。
4. 有效 TOTP 设置 `Secure; HttpOnly; SameSite=Lax` Cookie。
5. 正文随后通过 runtime API 加载。
6. 错误尝试触发限流。

详见 [`SECURITY.md`](./SECURITY.md)。

## Upstash

多实例生产应配置 Upstash Redis。监控：

- Redis REST error；
- `[rate-limit] redis enforce failed` 日志；
- TOTP/revalidation 异常请求量；
- fallback 到 local Map 的持续时间。

Redis 失败时系统可用性优先，会退回本地 limiter；这不是多实例安全保证，应尽快恢复。

## Neon visitor statistics

通过 Vercel Marketplace 为 production project 集成 Neon，确认 `DATABASE_URL` 已注入，并在 Vercel production environment 配置稳定的 `VISITOR_STATS_SECRET`。首次发布前运行：

```bash
pnpm db:migrate
pnpm db:seed:visitor-stats -- --total 1234
```

migration 是幂等的，创建 `arsvine_visitor_*` 表和累计计数初始行。若有上线前的历史访客估算值，在 migration 后执行一次基线命令；基线有唯一名称，重复执行不会重复增加。Preview、localhost 和非 canonical host 不写生产统计。

访客统计故障排查顺序：

1. 检查 `DATABASE_URL` 与 `VISITOR_STATS_SECRET` 是否存在于 production environment。
2. 检查 Neon migration 是否已完成，以及 `arsvine_visitor_totals` 是否存在单例行。
3. 如果基线尚未写入，执行 `pnpm db:seed:visitor-stats -- --total <估算人数>`。
4. 检查 Vercel Function 日志中的 `[visitor-stats] persistence failed` 摘要。
5. 用同一浏览器刷新，确认签名 Cookie 仍然存在且计数不重复增加。
6. 仅在统计功能恢复后再检查 About UI；数据库故障不应阻断站点其它页面。

Vercel Bot Protection 建议先以 Log 模式观察，再按误判情况决定是否启用 Challenge。它是平台层访问控制，应用层仍保留明显 bot User-Agent、同源和 JA4/IP 限流判断。

## COS 与 CDN

运维关注：

- public/private bucket region 与 credential；
- public CORS、Referer、`Vary: Origin`；
- `current.json` pointer 一致性；
- versioned object 完整性；
- CDN cache header 与 font Content-Type；
- 流量预算和告警。

资产发布、验证和回滚见 [`ASSETS.md`](./ASSETS.md)。

## Telemetry

```env
NEXT_PUBLIC_TELEMETRY_PROVIDER=vercel
```

未设置时 telemetry 完全禁用。页面只通过 `TelemetryRoot` 加载 provider，不能直接依赖 provider package。Provider render failure 由边界隔离，不得阻断页面。

检查 preview/localhost 是否按预期禁用数据采集，production domain 是否出现在 Vercel Analytics/Speed Insights。

## SEO 与 feed

```bash
curl -I https://arsvine.com/sitemap.xml
curl -I https://arsvine.com/zh-CN/rss.xml
curl -I https://arsvine.com/robots.txt
```

同时检查 response body、canonical host、locale URL、RSS language 和 content type。只检查 `200` 不足以发现错误 URL。

## 发布后 smoke test

- `/` 按 Cookie/Accept-Language `308` 到 locale。
- `/zh-CN`、`/zh-TW`、`/en` 可加载。
- `/zh-CN/content#blog` 正确滚动和 reveal。
- public blog 可直接读取。
- protected blog gate 与授权流程正确。
- tweets page、分页 API 与 fallback 正确。
- sitemap、RSS、robots 正确。
- 新 Catalog 与 public manifest 生效。
- 字体无 CJK tofu，远程图片无 CORS/Referer 错误。
- 音乐播放器不产生意外 autoplay/repeated download。
- mobile HUD、hash offset、drawer 和 cursor fallback 正常。
- telemetry 只在预期环境启用。
- production canonical host 的首次有效浏览器访问会增加总访客和今日访客各一次；同 Cookie 刷新不增加。
- Preview URL、明显 bot User-Agent 和跨站请求不会增加访客统计。

## 回滚

### 应用部署

使用 Vercel deployment rollback/promotion 或恢复上一个已知良好提交。回滚后重新执行 smoke test；不要假设应用回滚会自动回滚 COS pointer 或外部内容。

### 资产

```bash
pnpm assets:publish -- --rollback <version>
```

### 内容

确认 Content release 或 pointer 修复后，调用 content/tweet revalidation。Protected metadata 泄漏类问题应先下线索引入口，再调查缓存。

### Secret

泄漏时在平台轮换 secret/Token，重新部署 Function，并验证旧凭据失效。Auth、Content、COS、Upstash、TOTP 和 revalidation secret 分别处理。

## 故障响应顺序

1. 判断影响面：单 locale、单 route、内容、资产、认证或全站。
2. 查看 Vercel runtime/build log 或自托管 process log。
3. 检查最近 deployment、content index 和 Catalog pointer。
4. 检查外部依赖：Auth、Content、COS/CDN、Upstash。
5. 使用最小只读请求复现。
6. 能安全回滚时优先恢复服务，再做根因修复。
7. 把新发现的稳定陷阱补充到 [`AI GOTCHAS`](../ai/GOTCHAS.md)。

## 相关文档

- [`API-REF.md`](../ai/API-REF.md)
- [`ASSETS.md`](./ASSETS.md)
- [`SECURITY.md`](./SECURITY.md)
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

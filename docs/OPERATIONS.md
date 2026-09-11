# 部署与运维

[返回文档导航](./README.md)

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

## 生产配置

最低配置：

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://arsvine.com
```

实际功能还可能需要 GitHub、TOTP、Upstash、COS 和 revalidation 变量。完整矩阵见 [`CONFIGURATION.md`](./CONFIGURATION.md)。

部署环境中的 secret 不得暴露为 `NEXT_PUBLIC_*`。

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

## Revalidation API

认证 secret 放在 JSON body：

```bash
curl -X POST https://arsvine.com/api/revalidate-content \
  -H "content-type: application/json" \
  -d '{"secret":"REPLACE_ME","slug":"example-post"}'
```

| Route                          | 刷新范围                                             |
| ------------------------------ | ---------------------------------------------------- |
| `POST /api/revalidate`         | 三个 locale 的 tweets page                           |
| `POST /api/revalidate-content` | 三个 locale 的 content；可选安全 slug 的 blog detail |
| `POST /api/revalidate-assets`  | home、content、friends、web/life detail              |

`/api/revalidate` 为旧管理客户端保留 `GET ?secret=`，新自动化应使用 POST body。其他两个 endpoint 不接受 query secret。

Revalidation 每个 client 每分钟最多 30 次。响应可能包含 `paths`、`skipped`、`failed` 或 `partial`，自动化不能只检查 HTTP `2xx`；还要检查失败数组。

## 外部 GitHub 内容

生产 Function 通过 GitHub Contents API 读取私有仓库。运维检查：

1. Token 只读且未过期。
2. owner/repo/branch 指向预期环境。
3. `blog-index.json` 与实际 MDX locale 对齐。
4. 新内容发布后调用对应 revalidation。
5. GitHub failure 时 fallback 行为不会泄露 protected metadata。

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

## 回滚

### 应用部署

使用 Vercel deployment rollback/promotion 或恢复上一个已知良好提交。回滚后重新执行 smoke test；不要假设应用回滚会自动回滚 COS pointer 或外部内容。

### 资产

```bash
pnpm assets:publish -- --rollback <version>
```

### 内容

恢复外部内容仓库文件或索引后，调用 content/tweet revalidation。Protected metadata 泄漏类问题应先下线索引入口，再调查缓存。

### Secret

泄漏时在平台轮换 secret/Token，重新部署 Function，并验证旧凭据失效。COS、GitHub、Upstash、TOTP 和 revalidation secret 分别处理。

## 故障响应顺序

1. 判断影响面：单 locale、单 route、内容、资产、认证或全站。
2. 查看 Vercel runtime/build log 或自托管 process log。
3. 检查最近 deployment、content index 和 Catalog pointer。
4. 检查外部依赖：GitHub、COS/CDN、Upstash。
5. 使用最小只读请求复现。
6. 能安全回滚时优先恢复服务，再做根因修复。
7. 把新发现的稳定陷阱补充到 [`GOTCHAS.md`](./GOTCHAS.md)。

## 相关文档

- [`CONFIGURATION.md`](./CONFIGURATION.md)
- [`ASSETS.md`](./ASSETS.md)
- [`SECURITY.md`](./SECURITY.md)
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

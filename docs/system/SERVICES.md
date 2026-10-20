# 服务契约

浏览器直接打开的是展示站、Console、CDN 和状态页。Realm 在服务端读 Content。浏览器不拿 Content 的服务端凭证。

## 拓扑所有者

`@arsvine/site-config`（Platform `packages/site-config`，这次版本 `0.4.0`）导出 `sites`、`serviceOrigins` 与 `siteConfig`：

| 键      | Origin                        |
| ------- | ----------------------------- |
| realm   | `https://arsvine.com`         |
| ripple  | `https://ripple.arsvine.com`  |
| console | `https://console.arsvine.com` |
| auth    | `https://auth.arsvine.com`    |
| api     | `https://api.arsvine.com`     |
| content | `https://content.arsvine.com` |
| cdn     | `https://cdn.arsvine.com`     |
| status  | `https://status.arsvine.com`  |
| docs    | `https://docs.arsvine.com`    |

Realm `config/site-config.mjs` 只再导出这个包。不要在 dotenv 里覆盖这些 origin。

## 身份

Auth 是唯一身份源。Better Auth 加 OAuth provider、Passkey、TOTP、JWT。发现文档见 [`NETWORK.md`](./NETWORK.md)。

站点登记在 `@arsvine/site-config` 的 `sites`。带 `identity` 的站点进入 `identityOrigins`，Auth 把它和 `AUTH_TRUSTED_ORIGINS` 合并，不再为新域名改 Auth 源码。带 `login.resourceId` 的站点把解析后的 origin 放进 `siteConfig.auth.oauthResources`。Docs 的 resource 是它自己的 origin，因此这张表包含 `https://docs.arsvine.com`。JWT `audience` 仍只有 API 与 Content。

浏览器登录走 `@arsvine/site-kit` 的 `oidcClient`、`createPkceLogin`、`authorizationUrl`、`exchangeAuthorizationCode`。Console 和 Docs 只保留自己的 cookie。新登录站加一条 `sites` 记录并调用这四个函数。OIDC 客户端记录仍在 Auth 数据库，源码不代为插入。

Console OIDC：redirect `https://console.arsvine.com/auth/callback`，登出回跳 `https://console.arsvine.com/auth/signed-out`，resource 是 API origin。scope 含 `openid profile email` 以及 `content:read|write|publish`、`assets:read|write`、`integrations:read|write`、`jobs:read|run`。换票是授权码加 PKCE：`grant_type=authorization_code`，表单带 `code_verifier`。`AUTH_OIDC_CLIENT_ID` 与 `AUTH_OIDC_CLIENT_SECRET` 只留在 BFF。浏览器只打 Console 自己的 BFF，不接收 access token、数据库连接、发布 token、对象存储凭据或 session secret。变更请求带 `x-csrf-token`，对应 cookie 名 `arsvine_admin_csrf`。

API 与 Content 用 Auth JWT。`siteConfig.auth.audience` 与 `oauthResources` 是 API origin 和 Content origin。JWKS 使用 `https://auth.arsvine.com/api/auth/jwks`。API 写入路由要求 `content:write`，发布要求 `content:publish`。Core schema 带 `revision`，文章修订在 `post_revisions`。

受保护文章：Realm 用 `CONTENT_SERVICE_CLIENT_ID` / `CONTENT_SERVICE_CLIENT_SECRET` 向 Auth token 端点做 `client_credentials`，scope `content:protected:read`，resource 为 Content origin。换票函数是 `@arsvine/site-kit` 的 `fetchClientCredentialsToken`：HTTP Basic、`application/x-www-form-urlencoded`、`cache: no-store`。这两个键名属于 Realm，没有登记在 Platform `config/env-contracts.json`。Content 不签发这个 token；它用 `@arsvine/authz` 的 `verifyAccessToken` 校验 Bearer token，并要求 `content:protected:read`。正文仍只在 grant 校验之后进入运行时，不进静态 props 或未授权 RSC。

Docs 若启用登录，resource 是 `https://docs.arsvine.com`，scope 只有 `openid profile email`，内部页只接受 role `owner`。域名尚未绑定，所以这条登录链路没有线上探针。

## 内容与刷新

1. Console 用 OIDC access token 调 API。
2. API 写 Core。写入需要 `content:write`，发布需要 `content:publish`。
3. API 用头 `X-Publication-Token`（键名 `CONTENT_PUBLISH_TOKEN`）把不可变对象 POST 到 `siteConfig.content.publicationUrl`（`https://content.arsvine.com/v1/internal/publications`）。
4. Content 逐个校验对象后才切换 `realm-content/current.json`。
5. 指针写成功后，API 用 `signRevalidate` 对 `` `${毫秒时间戳}.${原始body}` `` 做 SHA-256 HMAC，输出 hex，POST 到 `revalidateUrls("realm-content")` 列出的订阅者。当前订阅者只有 Realm（`https://arsvine.com/api/internal/revalidate`）。新的缓存站要收到通知，就在 `distributionChannels["realm-content"].subscribers` 里写上自己的 site id，并在该记录上提供 `revalidatePath`。头是 `X-Arsvine-Timestamp`（毫秒数字符串）与 `X-Arsvine-Signature`。事件体字段是 `event`（`content.published`）、`releaseId`、`resources`、`timestamp`（ISO）。通知失败时 release 可能已经发布。
6. Realm 用 `verifyRevalidate` 校验，默认允许 5 分钟偏差，再按事件 `revalidatePath`。

Realm 资产发布脚本走同一把 `REVALIDATE_WEBHOOK_SECRET` 和同一个签名函数。访客统计 HMAC 和 TOTP HMAC 不是这把密钥，仍留在各自模块。

## 健康检查

`@arsvine/service-health` 的成功正文是 `{"status":"live"|"ready","service":"..."}`，`Cache-Control: no-store`。失败正文可以用 `not_ready`。

| 服务                        | 路径                                    | 2026-10-20                                                                                                             |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Realm                       | `/api/health/live`、`/api/health/ready` | 429 challenge。不要把这个 URL 当作唯一状态探针                                                                         |
| Console、Auth、API、Content | `/health/live`、`/health/ready`         | 200，`status` 为 `live` / `ready`，service 名与上表一致                                                                |
| Docs 源码                   | `/health/live`、`/health/ready`         | 未上线，无 DNS。三个 OIDC 键不齐时 ready 为 `not_ready`、HTTP 503，reason `missing_configuration:DOCS_OIDC`            |
| Ripple                      | `/health/live`、`/health/ready`         | 200，但 `status` 是 `ok`。ready 还带 `catalogVersion` 与 `tracks`。与共享 helper 不一致，仓库不可读，所以没有改 Ripple |

`live` 只证明进程能响应。ready 失败时正文 `status` 为 `not_ready`，HTTP 503。Auth 检查 `AUTH_DATABASE_URL`、`BETTER_AUTH_SECRET`、`AUTH_TRUSTED_ORIGINS`。Console 检查 `SESSION_SECRET`、`AUTH_OIDC_CLIENT_ID`、`AUTH_OIDC_CLIENT_SECRET`。API 检查 `CORE_DATABASE_URL`。Content 要能读对象存储和当前 release pointer。

## 状态页

`status.arsvine.com` 不参与请求链路。它只是外部观察面。

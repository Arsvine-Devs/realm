# 服务契约

浏览器直接打开的是展示站、Console、CDN 和状态页。Realm 在服务端读 Content。浏览器不拿 Content 的服务端凭证。

## 拓扑所有者

`@arsvine/site-config`（Platform `packages/site-config`，这次版本 `0.3.1`）导出 `serviceOrigins` 与 `siteConfig`：

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

Console OIDC：redirect `https://console.arsvine.com/auth/callback`，登出回跳 `https://console.arsvine.com/auth/signed-out`，resource 是 API origin。scope 含 `openid profile email` 以及 `content:read|write|publish`、`assets:read|write`、`integrations:read|write`、`jobs:read|run`。浏览器只打 Console 自己的 BFF。

API 与 Content 用 Auth JWT。`siteConfig.auth.audience` 与 `oauthResources` 是 API origin 和 Content origin。JWKS 使用 `https://auth.arsvine.com/api/auth/jwks`。

受保护文章：Realm 用 `CONTENT_SERVICE_CLIENT_ID` / `CONTENT_SERVICE_CLIENT_SECRET` 向 Auth token 端点做 `client_credentials`，scope `content:protected:read`，resource 为 Content origin。换票函数是 `@arsvine/site-kit` 的 `fetchClientCredentialsToken`。正文仍只在 grant 校验之后进入运行时，不进静态 props 或未授权 RSC。

Docs 若启用登录，resource 是 `https://docs.arsvine.com`，scope 只有 `openid profile email`，内部页只接受 role `owner`。域名尚未绑定，所以这条登录链路没有线上探针。

## 内容与刷新

1. Console 用 OIDC access token 调 API。
2. API 写 Core。发布需要 `content:publish`。
3. API 用 `CONTENT_PUBLISH_TOKEN` 把不可变对象交给 `siteConfig.content.publicationUrl`（`https://content.arsvine.com/v1/internal/publications`）。
4. Content 校验后切换 `realm-content/current.json`。
5. API 用 `signRevalidate` 对 `时间戳.原始body` 做 SHA-256 HMAC，POST 到 `siteConfig.realm.revalidateUrl`（`https://arsvine.com/api/internal/revalidate`）。头是 `X-Arsvine-Timestamp` 与 `X-Arsvine-Signature`。
6. Realm 用 `verifyRevalidate` 校验，默认允许 5 分钟偏差，再按事件 `revalidatePath`。

Realm 资产发布脚本走同一把 `REVALIDATE_WEBHOOK_SECRET` 和同一个签名函数。访客统计 HMAC 和 TOTP HMAC 不是这把密钥，仍留在各自模块。

## 健康检查

`@arsvine/service-health` 的成功正文是 `{"status":"live"|"ready","service":"..."}`，`Cache-Control: no-store`。失败正文可以用 `not_ready`。

| 服务                        | 路径                                    | 2026-10-20                                                                                                             |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Realm                       | `/api/health/live`、`/api/health/ready` | 429 challenge。不要把这个 URL 当作唯一状态探针                                                                         |
| Console、Auth、API、Content | `/health/live`、`/health/ready`         | 200，`status` 为 `live` / `ready`，service 名与上表一致                                                                |
| Docs 源码                   | `/health/live`、`/health/ready`         | 未上线，无 DNS                                                                                                         |
| Ripple                      | `/health/live`、`/health/ready`         | 200，但 `status` 是 `ok`。ready 还带 `catalogVersion` 与 `tracks`。与共享 helper 不一致，仓库不可读，所以没有改 Ripple |

## 状态页

`status.arsvine.com` 不参与请求链路。它只是外部观察面。

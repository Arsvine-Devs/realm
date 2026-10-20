# 网络

探测时间：2026-10-20。DNS 使用 `dig +time=3 +tries=1`。HTTP 使用 `curl -I`，连接超时 5 秒，总超时 12 秒。没有读取 DNSPod 或 EdgeOne 控制台，所以没有列出未查询到的记录。

## 权威 DNS

`arsvine.com` 的 NS 是 `lydia.dnspod.net` 与 `blithe.dnspod.net`。SOA 联系人是 `freednsadmin.dnspod.com`。这是 `LIVE` 的 DNSPod 权威域名，不是完整 zone 导出。证书绑定清单 `UNKNOWN`。

## 主机名

| 主机名                   | DNS（LIVE）                                 | HTTP（LIVE）                                                               | 这次的判断                                                        |
| ------------------------ | ------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `arsvine.com`            | A `216.198.79.1`                            | Vercel，HTTP 429，`x-vercel-mitigated: challenge`                          | 主站在 Vercel 后面，这次探针被挑战页拦住                          |
| `www.arsvine.com`        | CNAME `02040949b0001bf2.vercel-dns-017.com` | 同上，429                                                                  | 与主站同一类 Vercel 边缘                                          |
| `ripple.arsvine.com`     | CNAME `6e7b3016170cc011.vercel-dns-017.com` | Vercel，HTML 200                                                           | Ripple 体验站                                                     |
| `console.arsvine.com`    | CNAME `6cef0a7d2d3f85b3.vercel-dns-017.com` | `/health/live` 与 `/health/ready` 均为 200                                 | Console                                                           |
| `auth.arsvine.com`       | CNAME `77e1bbce16b2e95c.vercel-dns-017.com` | `/health/live`、`/health/ready`、OIDC discovery 均为 200                   | Auth                                                              |
| `api.arsvine.com`        | CNAME `429b1155b8d7d903.vercel-dns-017.com` | `/health/live` 与 `/health/ready` 200                                      | Control API                                                       |
| `content.arsvine.com`    | CNAME `adc4db5b226ef181.vercel-dns-017.com` | `/health/live` 与 `/health/ready` 200                                      | Content                                                           |
| `cdn.arsvine.com`        | CNAME `cdn.arsvine.com.eo.dnse0.com`        | 根路径 403；`server: tencent-cos`；响应含 `eo-log-uuid`、`eo-cache-status` | EdgeOne 回源到 COS。根路径拒绝列举是预期现象                      |
| `status.arsvine.com`     | CNAME `statuspage.betteruptime.com`         | HTML 200                                                                   | 状态页在 Better Stack 的 status page 主机上。监控项列表 `UNKNOWN` |
| `docs.arsvine.com`       | 无 A/AAAA/CNAME                             | `curl` 报 Could not resolve host                                           | 域名未绑定。`UNKNOWN` 部署                                        |
| `afterimage.arsvine.com` | CNAME `8ed0ab6059eea762.vercel-dns-017.com` | Vercel HTML 200，标题 `AFTERIMAGE — 余像`                                  | 仍在线的旧站。这次没有改 Vercel 或 DNS                            |
| `lab.arsvine.com`        | 无记录                                      | 无法解析                                                                   | Realm 界面里有这个链接，DNS 上不存在                              |
| `endfield.arsvine.com`   | 无记录                                      | 无法解析                                                                   | Realm 作品文案把它写成预留地址                                    |

`cdn.arsvine.com` 的 A 记录这次解析到 `43.159.99.102` 与 `43.159.98.107`，另有 AAAA。这些地址会变，只说明当时走了 EdgeOne，不作为固定配置。

## 公开对象

| URL                                                       | 结果                                       |
| --------------------------------------------------------- | ------------------------------------------ |
| `https://cdn.arsvine.com/ripple/catalog/current.json`     | 200，正文 `{"version":"20261015T152226Z"}` |
| `https://cdn.arsvine.com/realm/site-catalog/current.json` | 200，正文 version `20260912T144508Z`       |
| `https://cdn.arsvine.com/realm/catalog/current.json`      | 404                                        |
| `https://cdn.arsvine.com/realm-content/current.json`      | 404                                        |

后两个 404 与“私有 Catalog / Content 指针不走公网 CDN”的代码边界一致。不能从 404 推出 bucket 名称。

## OIDC 发现文档

`GET https://auth.arsvine.com/.well-known/openid-configuration` 返回 200。与代码一致的端点：

- issuer `https://auth.arsvine.com`
- authorization `https://auth.arsvine.com/api/auth/oauth2/authorize`
- token `https://auth.arsvine.com/api/auth/oauth2/token`
- userinfo `https://auth.arsvine.com/api/auth/oauth2/userinfo`
- end session `https://auth.arsvine.com/api/auth/oauth2/end-session`
- `jwks_uri` `https://auth.arsvine.com/api/auth/jwks`（200，`alg=EdDSA`，`crv=Ed25519`）

`GET https://auth.arsvine.com/jwks` 是 404，`x-matched-path: /jwks`。发现文档才是线上验证地址。`apps/auth/app/jwks/route.ts` 与 `apps/auth/app/oauth2/[...path]/route.ts` 把 `/jwks` 和 `/oauth2/*` 前缀改写到 `/api/auth` 下的同一处理器，但这次线上 `/jwks` 别名没有生效。JWT 校验使用发现文档上的 `https://auth.arsvine.com/api/auth/jwks`，不使用别名。

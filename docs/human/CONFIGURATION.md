# 环境变量配置

[返回文档索引](../INDEX.md) · [运行与部署](OPERATIONS.md)

生产配置由 VPS 注入。使用 [.env.example](../../.env.example) 查看字段，使用 [环境契约](../../config/env-contracts.json) 查数据格式和代码消费者。开发时可在 `.env.local` 配置本地服务。

| 用途                       | 变量                                                         |
| -------------------------- | ------------------------------------------------------------ |
| Next 进程端口              | `PORT`                                                       |
| Content 私网请求           | `CONTENT_INTERNAL_ORIGIN`                                    |
| Auth 私网令牌交换          | `AUTH_INTERNAL_ORIGIN`                                       |
| 预览 OAuth 服务与 audience | `AUTH_ORIGIN`、`CONTENT_ORIGIN`                              |
| 保护正文服务凭据           | `CONTENT_SERVICE_CLIENT_ID`、`CONTENT_SERVICE_CLIENT_SECRET` |
| TOTP 授权                  | `ACCESS_GRANT_SECRET`、`TOTP_GROUPS_JSON`                    |
| 访客统计                   | `DATABASE_URL`、`VISITOR_STATS_SECRET`                       |
| Valkey 限流                | `REDIS_URL`、`REDIS_KEY_PREFIX`                              |
| 媒体                       | `REALM_CATALOG_ROOT`、`REALM_CATALOG_POINTER`                |
| 入口请求头                 | `TRUST_PROXY`                                                |

生产默认站点地址来自 [站点契约](../../config/site-config.mjs)。Content 请求可从私网发送，授权令牌继续使用公开 Content audience。预览环境填写自己的 Auth、Content、数据库与 Valkey 绑定。仅在受控反向代理刷新客户端地址和国家码后设置 `TRUST_PROXY=1`。

`pnpm envctl query --key CONTENT_SERVICE_CLIENT_ID` 查看字段用途。新增环境变量时更新契约及示例，再运行 `pnpm env:check`。

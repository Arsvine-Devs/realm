# 全系统地图

[返回文档组](./README.md)

公开请求经 Cloudflare Tunnel 到 VPS 的 Caddy。Realm 使用 Next.js standalone，Ripple 由 Caddy 提供静态文件。平台的 `cdn.arsvine.com/media/` 读取生产公开媒体目录。预览使用各自的同源公开媒体目录。

Console 通过 Auth 登录并经同源 BFF 调用 API。API 事务写入 Core PostgreSQL。Content 用独立数据库账号读取已发布视图，Realm 每次读取当前文章和短帖。保护正文在 Realm 校验访问凭证后，再用服务令牌向 Content 读取。作品、经历和本地 Catalog 在 Content 失联时独立运行。

服务地址和身份契约由 `@arsvine/site-config` 管理。部署、域名路由和故障边界见 [Web 平台运维](https://github.com/Arsvine-Devs/platform/blob/main/ops/WEB.md)。Realm 的运行方式与媒体边界见 [运行与部署](../human/OPERATIONS.md) 和 [媒体与 Catalog](../human/ASSETS.md)。

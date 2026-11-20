# 全系统地图

[返回文档组](./README.md)

公开请求经 Cloudflare 到 VPS 的 Caddy。Realm 使用 Next.js standalone 运行，Ripple 由 Caddy 提供静态文件。Realm 同源 `/media/` 只提供公开媒体，Ripple 从同源静态曲库读取媒体地址。

Platform 的 Console 通过 Auth 登录，经同源 BFF 调用 API。API 持有 PostgreSQL 中的编辑数据，Content 提供已发布快照。Realm 从 Content 读取博客和动态，内容发布后 API 发送签名事件刷新页面。私有 Catalog、保护文章和数据库各自使用 VPS 私有路径。

服务地址和身份契约由 `@arsvine/site-config` 管理。部署、域名路由和探针由 VPS Web Ops 管理。Realm 的运行方式与媒体边界见 [运行与部署](../human/OPERATIONS.md) 和 [媒体与 Catalog](../human/ASSETS.md)。

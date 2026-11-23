# Realm 运行与部署

[返回文档索引](../INDEX.md)

Realm 使用 Node 26、仓库锁定的 pnpm 和 Next.js App Router。在开发环境运行 `pnpm dev`。使用 `pnpm build` 生成生产产物，`pnpm start` 在本地组装并启动同一份 standalone 产物。

## VPS 运行

生产产物由 `.next/standalone/`、`.next/static/` 和 `public/` 组成。发布服务组装产物并启动 Node 进程。页面按请求读取 Content 和活动 Catalog。正式站的公共媒体入口由平台登记为 `cdn.arsvine.com`。

运行环境从部署平台注入。变量格式见 [.env.example](../../.env.example)。Realm 在运行时经 `CONTENT_INTERNAL_ORIGIN` 读取 Content。在生产使用独立的 PostgreSQL 连接和访客 HMAC 密钥，使用 Valkey URL 和部署环境专用前缀。代理完成转发头清洗后设置 `TRUST_PROXY=1`。

私有 Catalog 由 `REALM_CATALOG_ROOT` 指向。它包含 `realm/catalog/versions/` 与 `realm/catalog/current.json`。平台生成当前指针路径和公开媒体源。将整个 Catalog 目录挂载给 Realm，原子替换指针后下一次请求即可读取新版本。

## 访客统计初始化

为目标环境配置 PostgreSQL 后，在 Realm 仓库运行 `pnpm db:migrate`。首次执行新版初始化时，会清空该环境的旧访客统计，并随机将总访客数设在 410 至 430 之间。之后新访客使总数和当日统计各增加一次，重复访问由访客标识去重。数据库记录初始化状态，后续执行会保留已累积的访客数。

## 发布与探针

- `GET /api/health/live` 表示应用进程可访问。
- `GET /api/health/ready` 校验 Realm 自己的活动 Catalog。Content 有独立健康检查。
- 文章和短帖读取已提交的发布状态。保护正文需要有效 TOTP 授权，正文请求使用 `private, no-store`。

首次上线前确认三种语言路由、公开博客 HTML、保护正文的未授权响应、RSS、内容写入后的公开可见性、媒体文件与访客统计。媒体流程见 [媒体与 Catalog](ASSETS.md)。

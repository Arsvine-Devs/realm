# Realm 运行与部署

[返回文档索引](../INDEX.md)

Realm 使用 Node 26、仓库锁定的 pnpm 和 Next.js App Router。在开发环境运行 `pnpm dev`。使用 `pnpm build` 生成生产产物，`pnpm start` 在本地组装并启动同一份 standalone 产物。

## VPS 运行

生产产物由 `.next/standalone/`、`.next/static/` 和 `public/` 组成。将静态目录放入 standalone 文件树，再运行其中的 `node server.js`。ISR 在单进程内使用内存缓存，进程重启后从已发布数据重新生成。反向代理转发应用请求，并将 `/media/` 映射到公开媒体树。

运行环境从部署平台注入。变量格式见 [.env.example](../../.env.example)。Realm 在运行时经 `CONTENT_INTERNAL_ORIGIN` 读取 Content。在生产使用独立的 PostgreSQL 连接和访客 HMAC 密钥，使用 Valkey URL 和部署环境专用前缀。代理完成转发头清洗后设置 `TRUST_PROXY=1`。

私有 Catalog 由 `REALM_CATALOG_ROOT` 指向。它包含 `realm/catalog/versions/`。将 `REALM_CATALOG_POINTER` 指向公开媒体树中同一份当前版本指针。路径应位于按目录挂载的卷中，以便 Realm 看见指针替换。

## 发布与探针

- `GET /api/health/live` 表示应用进程可访问。
- `GET /api/health/ready` 校验活动 Catalog 及 Content 就绪。
- `POST /api/internal/revalidate` 接收带时间戳和 HMAC 的 `content.published` 与 `assets.published` 事件。刷新在发布指针切换后执行。
- 公开博客在首访渲染后进入 ISR。保护正文需要有效 TOTP 授权，正文请求使用 `private, no-store`。

首次上线前确认三种语言重定向、公开博客 HTML、保护正文的未授权响应、RSS、发布刷新、媒体文件与访客统计。媒体流程见 [媒体与 Catalog](ASSETS.md)。

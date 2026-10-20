# 数据

不记录连接串、bucket 名、密钥或私有对象路径。

## Postgres

| 使用者 | 键名                | 代码里的职责                                | 证据                                                                              |
| ------ | ------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| Realm  | `DATABASE_URL`      | `@neondatabase/serverless` 保存匿名访客计数 | `CURRENT`。托管项目是否仍叫 Neon `CLAIMED`，见 [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| Auth   | `AUTH_DATABASE_URL` | Better Auth 的身份、会话、Passkey、TOTP     | `CURRENT`                                                                         |
| API    | `CORE_DATABASE_URL` | Drizzle / `pg` 上的 Core 写作与发布状态     | `CURRENT`                                                                         |

Content 服务不拥有这篇 Postgres。它保存已发布对象。

## 对象存储

Realm 资产工具使用腾讯云 COS：私有桶键 `COS_PRIVATE_*`，公有桶键 `COS_PUBLIC_*`，凭据键 `COS_SECRET_ID` / `COS_SECRET_KEY`。凭据只作为进程输入。

Content 使用 S3 兼容接口：`S3_ENDPOINT`、`S3_REGION`、`S3_FORCE_PATH_STYLE`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PRIVATE_BUCKET`。代码把这组键用于已发布 release，不在本包里写出 endpoint 主机名。

公网媒体走 `https://cdn.arsvine.com`。2026-10-20 的响应头是 `server: tencent-cos` 加上 EdgeOne 的 `eo-log-uuid`（`LIVE`）。

## Catalog 与 Content 指针

`@arsvine/site-config` 的命名空间：

| 名字                             | 值              | 用途             |
| -------------------------------- | --------------- | ---------------- |
| `catalogNamespaces.realmAssets`  | `realm`         | Realm 媒体与资产 |
| `catalogNamespaces.realmContent` | `realm-content` | 已发布博客/推文  |
| `catalogNamespaces.ripple`       | `ripple`        | Ripple 曲目投影  |

两条指针形式不同，不要合成一个：

- Content 指针是 `realm-content/current.json`（`siteConfig.content.pointerKey`）。CDN 上该键 404，符合私有发布。
- 不可变 release 先写在 `realm-content/releases/<releaseId>/`（含 `manifest.json`）。Content 逐个校验对象之后才写指针。中途失败时旧指针保持可读。
- `catalogPointer("realm-content")` 返回内容指针，不返回 `realm-content/catalog/current.json`。`catalogPointer("ripple")` 返回 `siteConfig.ripple.musicPointer`（`ripple/catalog/current.json`），CDN 上可读。其他单个路径段才是 `{namespace}/catalog/current.json`，所以 `catalogPointer("realm")` 是 `realm/catalog/current.json`。
- 公网还有 `realm/site-catalog/current.json`（`LIVE`，version `20260912T144508Z`）。这个键不由 `catalogPointer` 生成。`realm/catalog/current.json` 在 CDN 上 404。私有 Catalog 由 Realm 服务端读取，前缀可由 `COS_PRIVATE_CATALOG_PREFIX` 附加。

Ripple `/api/music` 在 2026-10-20 返回 version `20261015T152226Z`，`sourceCatalogVersion` `20260912T144508Z`，8 首曲目。曲目 URL 位于 `cdn.arsvine.com/realm/audio/...` 与 `cdn.arsvine.com/ripple/releases/20261015T152226Z/...`。发布顺序仍是先写不可变对象，最后切指针。Ripple 发布不得写 Realm 键。这次没有执行发布。

## Upstash

Realm 与 Console 使用 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。Realm 用它做分布式限流，Console 用它做 opaque session 和限流。代码在 Redis 不可用时退回进程内状态，多实例不再全局一致（`CURRENT`）。线上资源 ID `CLAIMED`，未复核。

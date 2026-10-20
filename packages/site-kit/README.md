# `@arsvine/site-kit`

新 Arsvine 站点要接上的最小运行时：

- `@arsvine/site-config` 的 origin、OIDC 与 catalog 命名空间
- `@arsvine/service-health` 的 live/ready 响应
- `catalogPointer(namespace)`：`{namespace}/catalog/current.json`
- `fetchClientCredentialsToken`：向 Auth 换取受保护读取用的短期 token
- `signRevalidate` / `verifyRevalidate`：Realm 刷新 webhook 的 HMAC

不包含 Console、Core 数据库或对象存储实现。

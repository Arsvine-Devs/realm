# `@arsvine/site-kit`

新 Arsvine 站点要接上的最小运行时：

- `@arsvine/site-config` 的 origin、OIDC 与 catalog 命名空间
- `@arsvine/service-health` 的 live/ready 响应
- `catalogPointer("realm-content")` 返回 `realm-content/current.json`；`catalogPointer("ripple")` 返回 `ripple/catalog/current.json`；其他单个路径段返回 `{namespace}/catalog/current.json`
- `fetchClientCredentialsToken`：向 Auth token endpoint 用 HTTP Basic 和 `client_credentials` 表单换短期 access token
- `signRevalidate` / `verifyRevalidate`：`HMAC-SHA256`，输入为 `` `${timestamp}.${body}` ``

不包含 Console、Core 数据库或对象存储实现。

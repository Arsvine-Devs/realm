# ARSVINE 站点体系知识包

捕获日期：2026-10-20。预定的唯一长文在 `Arsvine-Devs/docs`。当天 `cursor[bot]` 推送 `Arsvine-Devs/platform` 和 `Arsvine-Devs/docs` 都返回 403。本地克隆、分支和提交记在 [`REPOS.md`](./REPOS.md)。在那些分支推上去之前，以 GitHub 上这个 Realm 分支的 `docs/system/` 为准。

## 怎么读

| 文件                               | 回答的问题                                                   |
| ---------------------------------- | ------------------------------------------------------------ |
| [`REPOS.md`](./REPOS.md)           | 哪些仓库存在、默认分支、这次用的开发分支、各自不该拥有什么   |
| [`NETWORK.md`](./NETWORK.md)       | 域名现在解析到哪里，公开 HTTP 看到了什么                     |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | 每个站点怎么构建、托管在哪、环境变量只记键名                 |
| [`DATA.md`](./DATA.md)             | Postgres、COS、Content 对象、Upstash、Catalog 命名空间       |
| [`SERVICES.md`](./SERVICES.md)     | Auth、Console、API、Content、Realm、Ripple、状态页之间的契约 |
| [`STACK.md`](./STACK.md)           | 这次实际采用的依赖基线，以及故意不统一的部分                 |

证据只用四种标签：

- `CURRENT`：这次读到的源码、manifest、脚本或 git 状态。
- `LIVE`：这次用短超时的 DNS 或 HTTP 读到的公开结果。
- `CLAIMED`：仓库里已有的控制面叙述，这次没有重新打开对应控制台。
- `UNKNOWN`：这次探测失败或凭据看不到。

## 这次没有做的事

没有合并到 `master` 或 `main`。没有部署，没有改 DNS，没有发布 COS，没有切换 Catalog 指针，没有调用 revalidate webhook，没有写生产数据库。没有打开 Vercel CLI。没有把桌面应用 `ArsvineZhu/Ripple-Next` 折进网站栈。没有恢复 `afterimage`。

固定 origin 的代码所有者仍是 Platform 的 `@arsvine/site-config`。本目录记录 2026-10-20 的事实，不替代那个包。

# 依赖基线

核对日期：2026-10-20。版本来自当时的 npm `version` 与 Node `https://nodejs.org/dist/index.json`。只提升已经兼容、而且仓库里本来就钉死的维护版本。canary 不用。

## 实际采用

| 依赖                                                                 | 版本                                         | 理由                                                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Node                                                                 | `24.x`（索引中的 LTS 为 `v24.22.0` Krypton） | `v26.12.0` 还不是 LTS                                                                                               |
| pnpm                                                                 | `12.14.0`                                    | 各仓库 `packageManager` 已是这个版本，npm 上的 latest 也是它                                                        |
| Next.js                                                              | `16.4.2`                                     | latest 稳定版。`16.5` 只有 canary                                                                                   |
| React / React DOM                                                    | `19.3.1`                                     | latest                                                                                                              |
| TypeScript                                                           | `6.0.3`                                      | 见下面的钉住原因                                                                                                    |
| eslint                                                               | `10.13.0`                                    | 从 `10.12.0` 升到当时能通过 `minimumReleaseAge: 1440` 的维护版                                                      |
| oxlint / eslint-plugin-oxlint                                        | `1.88.0`                                     | Console 从 `1.82.0` 对齐到 Platform 根和 Realm。npm latest `1.89.0` 发布于 2026-10-19，未满 1440 分钟，安装策略拒绝 |
| knip                                                                 | Realm 根 `6.41.0`                            | 未推送 Platform `b4cd586` 的根和 Console 钉的是 `6.42.0`。npm 上更新的发布时间这次没有重新查询                      |
| prettier                                                             | `3.9.10`                                     | Console 从 `3.9.6` 对齐                                                                                             |
| jscpd                                                                | `5.4.1`                                      | Console 从 `5.2.0` 对齐 Platform 根与 Realm                                                                         |
| vitest                                                               | `5.0.5`                                      | 已是 latest                                                                                                         |
| xstate                                                               | `5.33.3`                                     | Realm 从 `5.33.2` 升到 latest                                                                                       |
| fumadocs-core / fumadocs-ui                                          | `16.17.5` 与 `16.17.7` 各有一份本地钉        | `fe7141d` 仍是 `16.17.5`。`4497d82` 是 `16.17.7`。见 [`DEPLOYMENT.md`](./DEPLOYMENT.md)                             |
| fumadocs-mdx                                                         | `15.4.7`                                     | latest `15.4.9` 发布于 2026-10-20，未满发布年龄，保持原钉                                                           |
| better-auth 与 `@better-auth/oauth-provider`、`@better-auth/passkey` | `1.7.11`                                     | 三个包在 `b4cd586` 的 `apps/auth/package.json` 同号。更后面的 npm 版本这次没有重新查询                              |
| Fastify                                                              | `^5.12.7`                                    | `b4cd586` 的 API 与 Content 声明。`@fastify/swagger` 是 `^9.9.2`，API 的 `@sinclair/typebox` 是 `^0.34.52`          |
| Drizzle                                                              | `^0.45.4`                                    | `b4cd586` 的 `@arsvine/core-db` 声明                                                                                |

Realm、Platform 的 Next 应用、Docs 都在这条 Next 16 / React 19 / TypeScript 6.0.3 / Node 24 线上。API 与 Content 是 Fastify，不是 Next，这是服务形态差异，不是落后的前端栈。

## 未推送 Platform 分支上的其余钉扎

来源是 `/tmp/arsvine-parallel/platform` 的 `b4cd586`，不是 Realm 的 `package.json`。`pnpm-workspace.yaml` 的 `minimumReleaseAge` 是 `1440`，`overrides.typescript` 是精确的 `6.0.3`。`@arsvine/site-config@0.4.0`、`@arsvine/service-health@0.1.0`、`@arsvine/site-kit@0.2.0` 在 Platform 分支是 `private: true`。没有 publish。`0.4.0` 起，登录站和分发订阅者来自 `sites` 与 `distributionChannels`，不再在 Auth 或发布器里各写一份 origin。

| 声明                                                  | 版本                                        |
| ----------------------------------------------------- | ------------------------------------------- |
| `pg` / `@types/pg`                                    | `^8.23.1`                                   |
| `@aws-sdk/client-s3`                                  | `^3.1152.0`                                 |
| `jose`                                                | `^6.2.12`                                   |
| `@upstash/redis`                                      | `^1.39.0`                                   |
| `dotenv`                                              | `18.0.8`                                    |
| `tsx`                                                 | `^4.23.15`                                  |
| `@types/node`                                         | `^26.6.5`                                   |
| Auth 的 `@types/react` / `@types/react-dom`           | `19.3.0`                                    |
| Console 的 `@mdxeditor/editor`                        | `4.2.4`                                     |
| Console 的 `@base-ui/react`                           | `^1.5.0`                                    |
| Auth 的 `radix-ui` / `shadcn` / `cn` / `lucide-react` | `^1.6.7` / `^4.21.0` / `^0.3.0` / `^1.45.0` |

`dotenv.config` 使用 `{ override: false, quiet: true }`。上表这些 UI 包没有并进 Realm 的界面栈。`DEPENDENCIES.md` 里关于 `pnpm peers check` 和具体 npm 发布时间的句子，这次没有重新执行或查询，所以不抄进本文件。

## 故意不统一

- TypeScript 不到 7，也不到 6.1。npm 上 TypeScript latest 是 `7.0.2`。`typescript-eslint@8.72.0` 的 peer 是 `typescript >=4.8.4 <6.1.0`。`eslint-config-next@16.4.2` 的 peer 没有单独放行 TypeScript 7。Realm `docs/ai/GOTCHAS.md` 记录了这颗钉。
- `@react-three/fiber` 保持精确版本 `9.8.2`，补丁文件是 `patches/@react-three__fiber@9.8.2.patch`。`10.x` 只有 canary。`pnpm-workspace.yaml` 同时把 `cos-request` override 到 `1.3.3`，并有 `patches/cos-request@1.3.3.patch`。这两个补丁必须和版本一起动。
- three `0.186.1`、sass `1.105.2`、next-intl `4.14.9` 已是当时的 latest，未改。
- Ripple 线上是 Vite 静态资源和一个返回 `status:"ok"` 的健康检查，不是 Next。仓库 404，所以没有重写。
- `ArsvineZhu/Ripple-Next` 是桌面应用，不进这张表。
- Afterimage 仍在 Vercel 上返回 200。不把它迁到这套栈。
- 共享包用仓库复制，不用 npm 发布。`publishConfig.registry` 仍指向 GitHub Packages，但这次没有 publish。

## 共享运行时

| 包                                                                                                    | 所有者                                                 | 消费者                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `@arsvine/site-config`                                                                                | Platform                                               | Realm、Docs、Platform 各应用。Ripple 克隆缺失，未写入                                                                |
| `@arsvine/service-health`                                                                             | Platform                                               | 同上，加上各健康路由                                                                                                 |
| `@arsvine/site-kit`                                                                                   | Platform（这次从只存在于 Realm 的副本收回到 Platform） | Realm 的刷新校验、资产发布签名、受保护内容换票；API 的发布签名。`4497d82` 有文件副本，文档站 `package.json` 不依赖它 |
| `@arsvine/env`、`@arsvine/contracts`、`@arsvine/authz`、`@arsvine/core-db`、`@arsvine/object-storage` | Platform                                               | 只在 Platform 内部使用                                                                                               |

`site-kit` 不复制 origin 字符串，只转出 site-config 与 service-health，并提供 `catalogPointer`、`signRevalidate`、`verifyRevalidate`、`fetchClientCredentialsToken`。`catalogPointer("realm-content")` 返回内容指针，规则见 [`DATA.md`](./DATA.md)。

Platform 内部包的职责，来自同一提交的源码：`@arsvine/authz` 校验 Auth JWT 并解析 scope；`@arsvine/contracts` 是 API 线协议类型；`@arsvine/core-db` 是 Core schema 与查询；`@arsvine/object-storage` 是 S3 兼容读写；`@arsvine/observability` 把结构化日志写到 stdout；`@arsvine/env` 读取并 trim 环境变量。这些包只在 Platform 内部使用，没有复制进 Realm。

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
| knip                                                                 | `6.41.0`                                     | Console 从 `6.35.1` 对齐。npm latest `6.42.1` 同样未满发布年龄                                                      |
| prettier                                                             | `3.9.10`                                     | Console 从 `3.9.6` 对齐                                                                                             |
| jscpd                                                                | `5.4.1`                                      | Console 从 `5.2.0` 对齐 Platform 根与 Realm                                                                         |
| vitest                                                               | `5.0.5`                                      | 已是 latest                                                                                                         |
| xstate                                                               | `5.33.3`                                     | Realm 从 `5.33.2` 升到 latest                                                                                       |
| fumadocs-core / fumadocs-ui                                          | `16.17.7`                                    | Docs 从 `16.17.5`。发布于 2026-10-19 13:28Z，已满 1440 分钟                                                         |
| fumadocs-mdx                                                         | `15.4.7`                                     | latest `15.4.9` 发布于 2026-10-20，未满发布年龄，保持原钉                                                           |
| better-auth 与 `@better-auth/oauth-provider`、`@better-auth/passkey` | `1.7.4`                                      | 三个包保持同号。npm latest `1.7.12` 发布于 2026-10-20，未满 `minimumReleaseAge` 1440 分钟，没有升                   |
| Fastify                                                              | 声明保持 `^5.6.2`                            | npm latest 是 `5.12.7`，已落在范围内。是否写进锁文件以本次 `pnpm install` 的解析结果为准，不另改范围下限            |
| Drizzle                                                              | 声明保持 `^0.45.2`                           | npm latest 是 `0.45.4`，同样只跟随范围内的锁文件解析                                                                |

Realm、Platform 的 Next 应用、Docs 都在这条 Next 16 / React 19 / TypeScript 6.0.3 / Node 24 线上。API 与 Content 是 Fastify，不是 Next，这是服务形态差异，不是落后的前端栈。

## 故意不统一

- TypeScript 不到 7，也不到 6.1。npm 上 TypeScript latest 是 `7.0.2`。`typescript-eslint@8.72.0` 的 peer 是 `typescript >=4.8.4 <6.1.0`。`eslint-config-next@16.4.2` 的 peer 没有单独放行 TypeScript 7。Realm `docs/ai/GOTCHAS.md` 记录了这颗钉。
- `@react-three/fiber` 保持精确版本 `9.8.2`，补丁文件是 `patches/@react-three__fiber@9.8.2.patch`。`10.x` 只有 canary。`pnpm-workspace.yaml` 同时把 `cos-request` override 到 `1.3.3`，并有 `patches/cos-request@1.3.3.patch`。这两个补丁必须和版本一起动。
- three `0.186.1`、sass `1.105.2`、next-intl `4.14.9` 已是当时的 latest，未改。
- Ripple 线上是 Vite 静态资源和一个返回 `status:"ok"` 的健康检查，不是 Next。仓库 404，所以没有重写。
- `ArsvineZhu/Ripple-Next` 是桌面应用，不进这张表。
- Afterimage 仍在 Vercel 上返回 200。不把它迁到这套栈。
- 共享包用仓库复制，不用 npm 发布。`publishConfig.registry` 仍指向 GitHub Packages，但这次没有 publish。

## 共享运行时

| 包                                                                                                    | 所有者                                                 | 消费者                                                                                            |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `@arsvine/site-config`                                                                                | Platform                                               | Realm、Docs、Platform 各应用。Ripple 克隆缺失，未写入                                             |
| `@arsvine/service-health`                                                                             | Platform                                               | 同上，加上各健康路由                                                                              |
| `@arsvine/site-kit`                                                                                   | Platform（这次从只存在于 Realm 的副本收回到 Platform） | Realm 的刷新校验、资产发布签名、受保护内容换票；API 的发布签名。Docs 镜像该包，但文档站不调用刷新 |
| `@arsvine/env`、`@arsvine/contracts`、`@arsvine/authz`、`@arsvine/core-db`、`@arsvine/object-storage` | Platform                                               | 只在 Platform 内部使用                                                                            |

`site-kit` 不复制 origin 字符串，只转出 site-config 与 service-health，并提供 `catalogPointer`、`signRevalidate`、`verifyRevalidate`、`fetchClientCredentialsToken`。

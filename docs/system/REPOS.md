# 仓库

组织 `Arsvine-Devs`。个人账号 `ArsvineZhu`。下面的默认分支来自 2026-10-20 的 `gh repo list` / `gh api`。提交号是当天克隆到的分支尖端。

## 网站体系内

| 仓库                    | 默认分支                | 这次的开发分支                                                                          | 尖端                 | 角色                                                                                                                                           | 不该拥有                                 |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `Arsvine-Devs/realm`    | `master`                | `dev/cloud-agent-1792508094914-8y8cd`（已包含 `dev/system-unify-2026-10` 的 `cba6449`） | 工作区在该分支上继续 | 主站 `arsvine.com`。Next.js App Router、访客统计、私有 Catalog 工具、受保护文章运行时                                                          | 身份提供、Core 写作库、第二份跨仓长文    |
| `Arsvine-Devs/platform` | `main`                  | `dev/system-unify-eead`，从 `dev/system-unify-2026-10` 的 `9174a21` 拉出                | 该分支               | Console、Auth、API、Content，以及 `@arsvine/site-config`、`@arsvine/service-health`、`@arsvine/site-kit`、`@arsvine/env`、`@arsvine/contracts` | 访客站点 UI、Ripple 曲目页面、文档站正文 |
| `Arsvine-Devs/docs`     | `master`（不是 `main`） | `dev/system-unify-eead`，从 `dev/docs-rewrite` 的 `d0b4a7b` 拉出                        | 该分支               | 文档应用，目标域名 `docs.arsvine.com`。本目录是跨仓知识包的唯一长文                                                                            | 业务数据库、COS 发布、Realm 页面实现     |
| `Arsvine-Devs/.github`  | `main`                  | 未改                                                                                    | `UNKNOWN`（未克隆）  | 组织元数据                                                                                                                                     | 站点运行时                               |

`origin/master` 上的 Realm 尖端是 `17a809f`。Platform `origin/main` 尖端是 `4479147`。Docs `origin/master` 尖端是 `dd60f35`（Rspress 初始线）；Fumadocs 重写在 `dev/docs-rewrite`，还没有进入默认分支。

生产 deployment 的 git SHA 这次没有从 Vercel 读到，记为 `UNKNOWN`。不要把上面的分支尖端当成线上版本。

## 这次读不到的仓库

`gh repo clone Arsvine-Devs/ripple-website` 与 `gh api repos/Arsvine-Devs/ripple-website` 都是 404。`LIVE` 的 `https://ripple.arsvine.com` 仍然是 Vercel 上的站点。源码是否私有、改名或删除，这次凭据无法区分，记 `UNKNOWN`。因此没有为它创建 `dev/system-unify-eead`，也没有把它改写成 Next.js。

`ArsvineZhu/afterimage`、`arsvine-lab`、`arsvine-content`、`arsvine-tweets` 对这次凭据同样 404。不能把 404 写成“已确认归档”。

同一次 `gh repo list ArsvineZhu` 里，`Fusang` 与 `arsvine-docs` 的 `isArchived` 为 true。它们不是现行站点仓库。

## 明确不是网站

`ArsvineZhu/Ripple-Next` 是跨平台桌面灵动岛，默认分支 `main`，2026-10-17 仍有推送。不纳入站点依赖基线，不接收 `@arsvine/site-kit`。

## 同步方式

Platform `scripts/sync-site-packages.mjs` 把 `site-config`、`service-health`、`site-kit` 复制到旁边已有 `.git` 的 `realm`、`ripple-website`、`docs`。不发布到 npm 或 GitHub Packages。这次机器上没有 Ripple 克隆，脚本跳过它。

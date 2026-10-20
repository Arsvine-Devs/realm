# 仓库

组织 `Arsvine-Devs`。个人账号 `ArsvineZhu`。下面的默认分支来自 2026-10-20 的 `gh repo list` / `gh api`。提交号是当天克隆到的分支尖端。

## 网站体系内

| 仓库                    | 默认分支                | 这次的开发分支                                                                          | 尖端                      | 角色                                                                                                                                           | 不该拥有                                 |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `Arsvine-Devs/realm`    | `master`                | `dev/cloud-agent-1792508094914-8y8cd`（已包含 `dev/system-unify-2026-10` 的 `cba6449`） | 工作区在该分支上继续      | 主站 `arsvine.com`。Next.js App Router、访客统计、私有 Catalog 工具、受保护文章运行时                                                          | 身份提供、Core 写作库、第二份跨仓长文    |
| `Arsvine-Devs/platform` | `main`                  | 未推送，见下方本地副本                                                                  | `origin/main` `4479147`   | Console、Auth、API、Content，以及 `@arsvine/site-config`、`@arsvine/service-health`、`@arsvine/site-kit`、`@arsvine/env`、`@arsvine/contracts` | 访客站点 UI、Ripple 曲目页面、文档站正文 |
| `Arsvine-Devs/docs`     | `master`（不是 `main`） | 未推送，见下方本地副本                                                                  | `origin/master` `dd60f35` | 文档应用，目标域名 `docs.arsvine.com`。本目录是目前推得到的跨仓知识包                                                                          | 业务数据库、COS 发布、Realm 页面实现     |
| `Arsvine-Devs/.github`  | `main`                  | 未改                                                                                    | `UNKNOWN`（未克隆）       | 组织元数据                                                                                                                                     | 站点运行时                               |

`origin/master` 上的 Realm 尖端是 `17a809f`。Platform `origin/main` 尖端是 `4479147`。Docs `origin/master` 尖端是 `dd60f35`（Rspress 初始线）。GitHub 上已有 Docs `origin/dev/docs-rewrite` `d0b4a7b`，以及 Platform `origin/dev/system-unify-2026-10` `9174a21`。这两个远程尖端之后的提交没有推上去。

生产 deployment 的 git SHA 这次没有从 Vercel 读到，记为 `UNKNOWN`。不要把上面的分支尖端当成线上版本。

## 本地未推送的副本

`cursor[bot]` 推送 `Arsvine-Devs/platform` 和 `Arsvine-Devs/docs` 返回 403。下表是 2026-10-20 仍只在本地的尖端。不要重置这些分支。父提交 `4479147`、`9174a21`、`d0b4a7b`、`dd60f35` 已经在 GitHub。

| 克隆路径                         | 分支                      | 提交                                       | 读到的内容                                                                                                  |
| -------------------------------- | ------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `/tmp/arsvine-parallel/platform` | `dev/platform-unify-eead` | `b4cd586a1de3c021d5679ca6f2b5386c3473e95d` | 从 `main` `4479147` 拉出。系统说明在 `docs/system/README.md` 与 `docs/system/DEPENDENCIES.md`               |
| `/tmp/arsvine-sites/platform`    | `dev/system-unify-eead`   | `1146e506b408eac29919a903de9e36f545f75320` | 更早的平行尝试，历史里有 `9174a21`。只用来补 `b4cd586` 没有写进 `docs/system/` 的事实                       |
| `/tmp/arsvine-parallel/docs`     | `dev/docs-unify-eead`     | `fe7141dbaada7c7f0c7b3f5b9ba8ea034fe2bbd6` | 父提交 `14db029ad71774f0208753348c6e80039490a238`，再往前是 `dd60f35`。站点自身事实在 `docs/system/site.md` |
| `/tmp/arsvine-sites/docs`        | `dev/system-unify-eead`   | `4497d827e4ac7a0ce14f918b73f9bd18102a784a` | 知识包副本，与本目录正文相同。历史里有 `d0b4a7b`                                                            |

## 这次读不到的仓库

`gh repo clone Arsvine-Devs/ripple-website` 与 `gh api repos/Arsvine-Devs/ripple-website` 都是 404。`LIVE` 的 `https://ripple.arsvine.com` 仍然是 Vercel 上的站点。源码是否私有、改名或删除，这次凭据无法区分，记 `UNKNOWN`。因此没有为它创建 `dev/system-unify-eead`，也没有把它改写成 Next.js。

`ArsvineZhu/afterimage`、`arsvine-lab`、`arsvine-content`、`arsvine-tweets` 对这次凭据同样 404。不能把 404 写成“已确认归档”。

同一次 `gh repo list ArsvineZhu` 里，`Fusang` 与 `arsvine-docs` 的 `isArchived` 为 true。它们不是现行站点仓库。

## 明确不是网站

`ArsvineZhu/Ripple-Next` 是跨平台桌面灵动岛，默认分支 `main`，2026-10-17 仍有推送。不纳入站点依赖基线，不接收 `@arsvine/site-kit`。

## 同步方式

Platform `scripts/sync-site-packages.mjs` 把 `site-config`、`service-health`、`site-kit` 复制到旁边已有 `.git` 的 `realm`、`ripple-website`、`docs`。不发布到 npm 或 GitHub Packages。这次机器上没有 Ripple 克隆，脚本跳过它。

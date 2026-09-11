# 配置参考

[返回文档导航](./README.md)

本文汇总运行时环境变量和主要配置文件。变量注册表以 `scripts/sync-env-files.mjs` 与 `.env.example` 为准；源码读取点决定实际行为。

## 环境文件优先级

`server.js` 根据 `NODE_ENV` 加载：

```text
.env.<environment>.local
.env.local
.env.<environment>
.env
```

本地开发通常只修改 `.env.local`。不要提交包含 secret 的环境文件。

## Core 与 Public

| 变量                             | 默认/示例                 | 可见性     | 用途                                                     |
| -------------------------------- | ------------------------- | ---------- | -------------------------------------------------------- |
| `PORT`                           | `3000`                    | 服务端     | 自定义 `server.js` 监听端口                              |
| `NEXT_PUBLIC_SITE_URL`           | `https://arsvine.com`     | 浏览器可见 | canonical、Open Graph、sitemap、RSS、robots              |
| `NEXT_PUBLIC_CDN_BASE`           | `https://cdn.arsvine.com` | 浏览器可见 | `realm/` 与 `shared/` 资产基础 URL                       |
| `NEXT_PUBLIC_TELEMETRY_PROVIDER` | 未设置                    | 浏览器可见 | 设为 `vercel` 时启用 Analytics 与 Speed Insights adapter |

`NEXT_PUBLIC_*` 会进入浏览器 bundle，绝不能存放 Token 或密钥。

## 外部内容仓库

| 变量                | 默认   | 用途                           |
| ------------------- | ------ | ------------------------------ |
| `GITHUB_OWNER`      | 无     | 私有内容仓库 owner             |
| `GITHUB_REPO`       | 无     | 私有内容仓库名称               |
| `GITHUB_BRANCH`     | `main` | 内容分支                       |
| `GITHUB_READ_TOKEN` | 无     | GitHub Contents API 只读 Token |

四项未完整配置时，博客退回内置文章，推文退回空状态。Token 只在服务端使用。

## 安全与 revalidation

| 变量                  | 默认   | 用途                                |
| --------------------- | ------ | ----------------------------------- |
| `ACCESS_GRANT_SECRET` | 无     | 签名受保护文章访问 Cookie           |
| `TOTP_GROUPS_JSON`    | 无     | TOTP group 配置 JSON                |
| `REVALIDATE_SECRET`   | 无     | revalidation API 认证               |
| `TRUST_PROXY`         | 未设置 | 自托管可信反向代理下允许读取转发 IP |

示例仅用于说明结构，不要复用示例 secret：

```env
TOTP_GROUPS_JSON={"friends-a":{"current":"REPLACE_ME","period":30,"digits":6,"window":1}}
```

Vercel 通过 `VERCEL=1` 自动启用其受管转发头策略。自托管环境只有在反向代理会覆盖来访者提供的 `X-Forwarded-For` / `X-Real-IP` 时才能设置 `TRUST_PROXY=1`。

## Upstash

| 变量                       | 默认 | 用途                |
| -------------------------- | ---- | ------------------- |
| `UPSTASH_REDIS_REST_URL`   | 无   | 分布式限流 REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | 无   | 分布式限流 Token    |

缺少 Upstash 时，限流退回进程内 `Map`；适合本地和单实例验证，不适合多实例生产保证。

## Tencent COS

| 变量                         | 默认                                     | 用途                               |
| ---------------------------- | ---------------------------------------- | ---------------------------------- |
| `COS_PRIVATE_BUCKET`         | 无                                       | 私有 Catalog bucket                |
| `COS_PRIVATE_REGION`         | 无                                       | 私有 bucket region                 |
| `COS_PUBLIC_BUCKET`          | 无                                       | 公共资产与公开 pointer bucket      |
| `COS_PUBLIC_REGION`          | 无                                       | 公共 bucket region                 |
| `COS_SECRET_ID`              | 无                                       | 当前进程 COS 凭据                  |
| `COS_SECRET_KEY`             | 无                                       | 当前进程 COS 凭据                  |
| `COS_PRIVATE_CATALOG_PREFIX` | 空                                       | `realm/catalog/` 前的可选私有前缀  |
| `COS_SESSION_TOKEN`          | 无                                       | 可选临时会话 Token，仅发布脚本读取 |
| `COSCLI_PATH`                | `cos-workspace/coscli-windows-amd64.exe` | 可选 coscli 路径，仅发布脚本读取   |

`COS_PRIVATE_LOCAL_ROOT` 只供测试环境的本地 Catalog fixture 使用，不是生产配置。

COS 凭据必须通过当前命令的环境传入。不要运行 `coscli config init`，不要把凭据写入仓库或日志。

## 推文压力测试

以下变量只用于开发态合成数据：

| 变量                             |   默认 |
| -------------------------------- | -----: |
| `TWEETS_STRESS_TEST`             | 未启用 |
| `TWEETS_STRESS_YEARS`            |    `6` |
| `TWEETS_STRESS_MONTHS_PER_YEAR`  |   `12` |
| `TWEETS_STRESS_TWEETS_PER_MONTH` |   `24` |

启用方式：

```env
TWEETS_STRESS_TEST=1
```

不要在生产环境启用。

## 构建高级选项

| 变量             | 默认    | 用途                                       |
| ---------------- | ------- | ------------------------------------------ |
| `ANALYZE`        | 未启用  | 设为 `true` 时启用 `@next/bundle-analyzer` |
| `NEXT_BUILD_DIR` | `.next` | 覆盖 Next.js `distDir`                     |

## 环境文件同步

```bash
pnpm env:sync
```

该命令会重写 `.env.example` 和 `.env.local` 的已注册部分，保留已有值，并把未注册键保存在 `(unmanaged)` 区域。可指定其他文件：

```bash
node scripts/sync-env-files.mjs --local path/to/.env.local --example path/to/.env.example
```

运行后检查差异，确保没有意外保留拼写错误的变量。

## 主要配置文件

| 文件                             | 作用                                           |
| -------------------------------- | ---------------------------------------------- |
| `src/shared/config/site.ts`      | 站点身份、SEO、字体、社交链接                  |
| `src/shared/contracts/locale.ts` | locale、HTML/OG/RSS locale 映射                |
| `src/app/i18n/data.ts`           | 静态翻译数据注册表                             |
| `config/image-hosts.js`          | `next/image` 远程 host allowlist               |
| `next.config.js`                 | Next.js、next-intl、bundle analyzer、build dir |
| `pnpm-workspace.yaml`            | pnpm 安全策略、override 和补丁                 |
| `server.js`                      | 本地与自托管入口、环境文件加载                 |

## 相关文档

- [`SECURITY.md`](./SECURITY.md)
- [`ASSETS.md`](./ASSETS.md)
- [`OPERATIONS.md`](./OPERATIONS.md)

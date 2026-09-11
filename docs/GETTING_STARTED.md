# 快速开始

[返回文档导航](./README.md)

本文面向第一次在本地运行 ARSVINE REALM 的开发者。完成后应能在 `http://localhost:3000` 打开 locale 前缀页面，并能运行基础质量检查。

## 前置条件

| 工具               | 要求                             | 说明                                 |
| ------------------ | -------------------------------- | ------------------------------------ |
| Node.js            | `24.x`                           | 与生产和 `package.json#engines` 一致 |
| pnpm               | 见 `package.json#packageManager` | 安装与 CI 使用同一版本               |
| Git                | 当前稳定版                       | 用于获取代码和检查工作区             |
| Windows PowerShell | 可选                             | `dev.arsvine.com` 本地 COS 流程需要  |

确认版本：

```bash
node --version
pnpm --version
```

## 安装依赖

```bash
pnpm install --frozen-lockfile
```

日常开发通常也可以使用 `pnpm install`。CI 和可重复环境应使用 `--frozen-lockfile`，避免安装过程改写 `pnpm-lock.yaml`。

仓库通过 `pnpm-workspace.yaml` 固定构建许可、依赖最小发布时间、`postcss` override，以及 `@react-three/fiber@9.7.0` 补丁。不要改用 npm 或 yarn 重新生成锁文件。

## 创建本地环境文件

macOS / Linux：

```bash
cp .env.example .env.local
```

PowerShell：

```powershell
Copy-Item .env.example .env.local
```

最小本地配置：

```env
PORT=3000
NEXT_PUBLIC_SITE_URL=https://arsvine.com
NEXT_PUBLIC_CDN_BASE=https://cdn.arsvine.com
```

没有 GitHub 内容仓库配置时，博客使用 `content/blog/init/` 的内置文章，推文页显示空状态。没有 COS 私有 Catalog 配置时，可选远程资产会按各模块的 fallback 行为处理。

完整变量说明见 [`CONFIGURATION.md`](./CONFIGURATION.md)。不要把服务端 secret 放入任何 `NEXT_PUBLIC_*` 变量。

## 启动开发服务器

```bash
pnpm dev
```

该命令运行 `node server.js`，不是 `next dev`。`server.js` 按以下顺序加载环境文件，前面的值优先：

```text
.env.development.local
.env.local
.env.development
.env
```

打开：

```text
http://localhost:3000
```

根路径会根据 `NEXT_LOCALE` Cookie 或 `Accept-Language` 进行 `308` 重定向，默认进入 `/zh-CN`。

## 验证安装

先运行快速检查：

```bash
pnpm lint
pnpm typecheck
pnpm test
```

准备提交或发布前运行完整检查：

```bash
pnpm check
```

`pnpm check` 执行格式、字体配置、Oxlint/ESLint、TypeScript、Knip、Vitest 和生产构建。命令与配置见 [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md)。

## 使用真实 COS 资产进行本地调试

COS Referer 策略通常拒绝 `localhost`。Windows 上可运行：

```powershell
scripts\dev-host-setup.cmd
```

脚本会请求管理员权限，临时添加 `dev.arsvine.com` hosts 记录和必要的代理绕过，然后在端口 `80` 启动同一个开发服务器。正常退出时会清理临时设置。

仅管理 hosts：

```powershell
scripts\dev-host-setup.cmd -HostsOnly
scripts\dev-host-setup.cmd -Remove
```

不要手工持久化 COS 凭据或代理配置。

## 下一步

- 阅读 [`DEVELOPMENT.md`](./DEVELOPMENT.md) 了解日常工作流。
- 阅读 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 了解系统边界。
- 启动或安装失败时查阅 [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)。

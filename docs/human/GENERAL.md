# 一般使用

本文面向第一次运行 ARSVINE REALM 或只想了解项目边界的人。维护代码前继续阅读 [`MAINTAINER.md`](./MAINTAINER.md)。

## 项目概览

ARSVINE REALM 是一个末日废土 HUD 风格的个人作品集与博客，包含项目、经历、生活记录、博客、推文、友链、音乐播放器和可选的 protected post。

生产平台是 Vercel，运行时为 Node.js `24.x`，包管理器版本见 `package.json#packageManager`。用户页面使用 `/<locale>/...`，UI locale 为 `zh-CN`、`zh-TW` 和 `en`。

## 安装和启动

```bash
pnpm install --frozen-lockfile
pnpm dev
```

PowerShell：

```powershell
Copy-Item .env.example .env.local
```

打开 `http://localhost:3000`。根路径按 `NEXT_LOCALE` Cookie、`Accept-Language`、`zh-CN` 的顺序选择 locale。

如果需要本地 COS Referer 调试，阅读 [`OPERATIONS.md`](./OPERATIONS.md) 和 `scripts/dev-host-setup.cmd`；不要把本地凭据提交到仓库。

## 常用命令

```bash
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm check
```

`pnpm check` 是完整本地质量门禁。日常修改优先运行对应的单文件测试和 `pnpm typecheck`，完成前再运行完整门禁。

## 仓库边界

```text
src/app/       App Router 页面、layout、Route Handler、i18n
src/features/  按业务领域组织的 UI、model、server、contracts、styles
src/shared/    跨 feature 的稳定 contract、hook、UI 和 server helper
content/       内置博客 fallback
public/        启动关键静态文件
scripts/       本地维护、资产、字体和图像工具
tests/         app、feature、shared、repo、operations、scripts 测试
docs/          人类维护文档和 AI 工作流资料
```

详细命令、目录职责和验证方式见 [`MAINTAINER.md`](./MAINTAINER.md)。

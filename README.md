# ARSVINE REALM

ARSVINE REALM 是一个以末日废土 HUD 为视觉语言的个人作品集与博客。它承载项目、经历、生活记录、博客、推文、友链和个人资料，并通过统一页面过渡、三语 UI、音乐播放器、WebGL 氛围效果和 TOTP 私密文章构成一个持续维护的个人网络空间。

![ARSVINE REALM 预览](./docs/preview.png)

## 项目状态

| 项目            | 当前设置                                   |
| --------------- | ------------------------------------------ |
| 类型            | 个人站点，不是通用模板                     |
| 生产平台        | Vercel                                     |
| Runtime         | Node.js `24.x`                             |
| Package manager | pnpm，版本见 `package.json#packageManager` |
| UI locale       | `zh-CN`、`zh-TW`、`en`                     |
| 公共路由        | `/<locale>/...`                            |
| 内容源          | 仓库内 typed data + 私有 GitHub 内容仓库   |
| 媒体            | Tencent COS + versioned Catalog            |

## 主要能力

- 五列 HUD 风格首页与响应式 content hub。
- 通过 `TransitionContext` 统一管理 home、content 和 detail 页面过渡。
- `next-intl` 三语 UI，以及博客内可选 `ja`、`ru`、`fr` content locale。
- App Router SSG/ISR 博客详情、动态 sitemap、RSS 和 robots。
- 外部私有 GitHub 仓库提供博客和推文；不可用时有明确 fallback。
- TOTP protected post，正文不会进入未授权 HTML 或 RSC payload。
- 腾讯 COS 公共媒体、私有 Catalog、immutable hash object 与 pointer-last 发布。
- Desktop Three.js 氛围与交互效果，移动端提供简化路径。
- 七级自适应性能 tier，根据 frame pacing 逐步关闭高成本能力。
- 音乐播放器、CustomCursor、hash navigation 和 locale 热切换状态保持。

## 技术栈

```text
Next.js 16 App Router
React 19 + TypeScript
SCSS Modules
next-intl 4
Three.js + React Three Fiber + Cannon
GSAP + Web Animations API
XState
next-mdx-remote
Vitest + Testing Library
```

## 快速开始

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

PowerShell 创建环境文件：

```powershell
Copy-Item .env.example .env.local
```

打开 `http://localhost:3000`。根路径会根据 `NEXT_LOCALE` Cookie、`Accept-Language` 和默认 `zh-CN` 重定向到 locale 前缀 URL。

完整安装说明见 [`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md)。

## 常用命令

```bash
pnpm dev           # node server.js
pnpm build         # next build
pnpm start         # 自托管 production server
pnpm lint          # Oxlint + ESLint 兼容规则
pnpm typecheck     # TypeScript
pnpm test          # Vitest
pnpm format        # Prettier 自动格式化
pnpm quality       # Knip + JSCPD 维护扫描
pnpm check         # 格式 + 字体配置 + lint + typecheck + Knip + JSCPD + test + build
```

资产维护：

```bash
pnpm assets:prepare
pnpm assets:build
pnpm assets:publish -- --dry-run
```

真实 `assets:publish` 会写入远程 COS 并调用 revalidation，执行前必须阅读 [`docs/ASSETS.md`](./docs/ASSETS.md)。

## 文档

完整入口：[`docs/README.md`](./docs/README.md)

| 任务         | 文档                                                      |
| ------------ | --------------------------------------------------------- |
| 首次安装     | [`GETTING_STARTED.md`](./docs/GETTING_STARTED.md)         |
| 日常开发     | [`DEVELOPMENT.md`](./docs/DEVELOPMENT.md)                 |
| 系统架构     | [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md)               |
| 路由与国际化 | [`ROUTING_AND_I18N.md`](./docs/ROUTING_AND_I18N.md)       |
| 内容与 MDX   | [`CONTENT_AND_MDX.md`](./docs/CONTENT_AND_MDX.md)         |
| 安全         | [`SECURITY.md`](./docs/SECURITY.md)                       |
| 资产与 CDN   | [`ASSETS.md`](./docs/ASSETS.md)                           |
| 性能         | [`PERFORMANCE.md`](./docs/PERFORMANCE.md)                 |
| 测试         | [`TESTING_AND_QUALITY.md`](./docs/TESTING_AND_QUALITY.md) |
| 部署运维     | [`OPERATIONS.md`](./docs/OPERATIONS.md)                   |
| 配置参考     | [`CONFIGURATION.md`](./docs/CONFIGURATION.md)             |
| 故障排查     | [`TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)         |
| 历史回归     | [`GOTCHAS.md`](./docs/GOTCHAS.md)                         |

## 项目结构

```text
config/              小型运行配置
content/blog/init/    内置博客 fallback
docs/                开发和运维文档
patches/             pnpm dependency patch
public/              身份与启动关键静态文件
scripts/             资产、字体、图像和本地维护脚本
src/app/             App Router、Route Handler、i18n、全局 shell
src/features/        按领域组织的业务模块
src/shared/          跨领域 contract、hook、UI、server helper
tests/               app、feature、shared、repo、operations、scripts 测试
server.js            本地开发与可选自托管入口
```

## 部署边界

生产部署在 Vercel，使用标准 Next.js App Router 构建输出。Vercel 不运行 `server.js`。

自托管流程：

```bash
pnpm build
pnpm start
```

部署、环境变量、ISR 和 smoke test 见 [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)。

## License 与内容政策

- 源代码：[`MIT License`](./LICENSE)
- 原创文章、图片、笔记、设计和站点内容：CC BY-NC-ND 4.0

站内 copyright 页面提供完整中英文说明。

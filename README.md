<div align="center">
  <h1>ARSVINE REALM</h1>
  <p>
    <a href="https://github.com/Arsvine-Devs/realm/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Arsvine-Devs/realm/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="https://nodejs.org/"><img alt="Node.js 24.x" src="https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white" /></a>
    <a href="https://nextjs.org/"><img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" /></a>
    <a href="https://arsvine.com"><img alt="Deployed on Vercel" src="https://img.shields.io/badge/deployed%20on-Vercel-000000?logo=vercel&logoColor=white" /></a>
    <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2f855a.svg" /></a>
  </p>
  <p><em>记录项目、文字、实验以及仍在成形中的事物的个人档案终端。</em></p>
  <p><img alt="ARSVINE REALM 预览" src="./docs/preview.png" /></p>
  <p><strong>ARSVINE REALM</strong> 是 Arsvine Zhu 的末日废土 HUD 风格个人作品集与博客。</p>
  <p>
    <a href="https://arsvine.com">访问站点</a> ·
    <a href="https://github.com/ArsvineZhu">作者 GitHub</a> ·
    <a href="https://github.com/Arsvine-Devs/realm">浏览仓库</a> ·
    <a href="./docs/README.md">阅读文档</a>
  </p>
</div>

它把项目档案、多语言写作、生活记录、音乐、WebGL 氛围和受保护文章访问流程组合在一个持续演进的界面中。

## 内容与能力

- 五列 HUD 首页和响应式内容中心。
- `zh-CN`、`zh-TW`、`en` UI，以及额外的博客 content locale。
- 作品集、经历、生活记录、友链、推文、RSS、sitemap 和 robots 路由。
- 带 hash 导航和 locale 状态保持的首页/内容/详情过渡。
- 带自适应性能能力的桌面 Three.js 氛围层。
- 音乐播放器、自定义光标、剧透控件和可访问的响应式交互。
- 运行时受 TOTP 保护的文章；未授权静态输出不包含 protected body。
- 使用不可变 hash 对象和 pointer-last 发布的腾讯 COS 媒体 Catalog。

Blog 与 Tweet 的运行时内容来自 `content.arsvine.com` 的已发布 release；站点不再把仓库内的旧 Blog 文件作为运行时来源。

## 技术栈

`Next.js 16` · `React 19` · `TypeScript` · `SCSS Modules` · `next-intl` · `Three.js` · `React Three Fiber` · `GSAP` · `XState` · `MDX` · `Vitest`

## 本地运行

```bash
pnpm install --frozen-lockfile
pnpm env:sync
pnpm dev
```

PowerShell 也可以从模板开始：

```powershell
Copy-Item .env.example .env.local
```

打开 `http://localhost:3000`。完整环境变量说明见 [`docs/human/OPERATIONS.md`](./docs/human/OPERATIONS.md)。

## 继续阅读

- [文档入口](./docs/README.md) — 人类维护与运维文档。
- [仓库地图](./INDEX.md) — 代码、工具和文档边界。
- [AI 工作流目录](./docs/ai/INDEX.md) — Skills、playbook 和当前不变量。
- [安全政策](./SECURITY.md) — 漏洞披露和生产安全边界。
- [许可证](./LICENSE) — 源码使用 MIT；原始站点内容按站点展示的政策处理。

## 项目状态

站点作为个人档案持续演进。生产应用运行在 Vercel，源码变更通过仓库质量门禁验证；本地检查不替代已认证的线上业务流程验收。

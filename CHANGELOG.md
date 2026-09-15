# Changelog

All notable changes to **ARSVINE REALM** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- 增加 `pnpm docs:check`，在维护门禁中验证 Markdown 本地链接、路径目标和索引↔页面双向导航。

### Fixed

- 修正架构文档中的 `/api/revalidate` method 漂移，并将 route method 表收敛到 AI API reference。
- 修正图片脚本文档中不存在的 `.gitkeep` 说明。

### Clarified

- 记录 Windows CI 是 advisory build contract；master required checks 仍是 Ubuntu `verify` 与 Vercel。

## [2.0.5] — 2026-09-12

### Added

- 发布音乐资源 `ADELPHOCLAST`，作者：铁痕电台-MSR / Crywolf / YMIR。
- 重建人类文档、AI playbook 和仓库共享 Skills：`realm-maintenance-audit`、`realm-assets-catalog`、`realm-protected-content`。
- 在资产 Skill 中加入 COST 原文、只读本地 Catalog verifier、dotenv runner、中断恢复规则和 pointer-last 发布检查。
- 新增 `docs/INDEX.md`、`docs/README.md`、`docs/human/`、`docs/ai/`，并为 app、feature、shared、scripts、tests 等重要边界补充简明入口文档。
- 新增统一的 revalidation 请求包装器、TOTP code form、详情页 link card 和 navigation transition surface helper。

### Changed

- 根 README 改为面向访客的展示页，加入居中 hero、CI、Node.js、Next.js、Vercel、License 徽章，并将维护信息移入文档。
- Vitest 默认改用 Node 环境，DOM 测试进入独立 project；相关 `.ts` 测试改为 `*.browser.test.ts`，降低 Node-only 测试的 jsdom 成本。
- 测试改为优先保护运行时、安全、构建和外部边界；删除 Pages Router、源码排版和迁移位置等历史契约测试，保留 protected RSC、TOTP、限流、Catalog、WebGL、导航和性能能力测试。
- 删除无实际消费者的 feature `public.ts` barrel，改用真实组件、Provider 和 model 入口；保留 locale data、asset manifest 与 protected blog 的语义边界。
- 统一 App Router route classification，移除旧 `asPath`、Pages Router template fallback 和重复的 route template 概念。
- 将资产流程拆分为 `scripts/assets/`：legacy preparation、Catalog build、media/filesystem/catalog transform、COS publish 分别拥有清晰边界；visitor-stat CLI 共享轻量 dotenv loader。
- `assets:prepare-legacy` 要求显式日期；Catalog 发布器现在先上传 immutable objects，再验证实际 key，最后切换双 pointer 并请求 revalidation，同时输出阶段进度、心跳和 `Retry-After` 诊断。
- 共享 detail card 只统一布局，Work/Life inline detail 与 standalone detail、各 feature 的业务 link 映射继续保持独立。

### Removed

- 删除过时的嵌套 `AGENTS.md`、历史 superpowers design records、迁移型测试和无消费者 feature barrel。
- `.agents/skills/` 改为仓库共享且可版本化；仅保留 `.agents/local/` 作为本地缓存边界。

### Verification

- Node/DOM 两个 Vitest project 共 96 个测试文件、418 个测试通过；`format:check`、维护检查、lint、typecheck、Knip、JSCPD 和 production build 全部通过。
- 资产本地 manifest、public/private Catalog sections、pointer 文件和音频哈希产物均通过本地 verifier；Skill 均通过 `quick_validate.py`。

<details>
<summary>历史版本（2.0.3 及更早）</summary>

## [2.0.3] — 2026-07-25

### Fixed

- **后台标签页 hitokoto 轮询**：`useFateTypingEffect` 的打字循环每周期拉取 `/api/hitokoto`，但此前仅受 `textVisible`（动画可见性）控制，不监听标签页可见性。用户切到后台标签页后，浏览器把 `setTimeout` 节流到 ≥1s，把 ~20s 打字周期拉成每分钟一次的持续轮询（Vercel Firewall 报告：24h 内 ~1.2k 请求、90% 命中 `/api/hitokoto`、单一 IP + 单一 JA4 指纹 + Mac UA）。现新增 `document.visibilityState` 跟踪：标签页隐藏时整个循环拆除（清超时 + abort 进行中的 hitokoto 请求 + 清空 buffer），回到前台从预设轮重新开始。与 `useRealtimeStats` / `useEnvParamsTypingEffect` 的可见性处理一致。

### Security

- **hitokoto IP 限流（纵深防御）**：`/api/hitokoto` 新增按 IP 限流 30 次/10 分钟，复用既有 `enforceRateLimit` 工具。真实活跃用户打到 origin 约 2 次/10 分钟（edge `s-maxage=300` 缓存 + 60s 进程内缓存），15x 余量，仅拦截绕过缓存的突发爬虫/脚本。超出时返回 `429 { error: 'rate_limited' }`，带 `Cache-Control: private, no-store` + `Retry-After`，避免被 edge 缓存误伤其他用户。

### Tests

- 新增 `tests/features/hud/useTypingEffect.test.tsx` 可见性暂停用例。
- 新增 `tests/shared/hitokoto-handler.test.ts` 限流用例（成功 / 429 / unknown bucket）。

## [2.0.2] — 2026-07-25

### Security

- **brace-expansion DoS**: 升级 `brace-expansion` v1 从 `1.1.15` → `1.1.16`，修复连续非展开 `{}` 组导致的 O(2ⁿ) 指数级时间复杂度拒绝服务漏洞。该漏洞通过 `eslint` → `minimatch@3` 传递依赖引入，30 组 ~90 字节输入可阻塞线程数分钟。
- **PostCSS 路径遍历与 .map 文件泄露**: 升级 `postcss` 从 `8.5.10` → `8.5.18`，修复 `PreviousMap` 通过 `sourceMappingURL` 注释中 `../` 路径遍历读取任意 `.map` 文件并泄露 `sourcesContent` 的漏洞（CVE-2026 系列）。
- **PostCSS 任意文件读取与信息泄露**: 同上升级，修复默认选项下攻击者可通过 CSS 注释中的绝对/相对路径读取任意文件，并通过 `JSON.parse` 错误消息泄露文件开头 ~10 字节内容的漏洞，同时消除文件存在性预言机和 DoS 原语。
- **sharp / libvips 多个 CVE**: 升级 `sharp` 从 `0.34.5` → `0.35.3`（内置 libvips 8.18.3），修复上游 libvips 中的 CVE-2026-33327、CVE-2026-33328、CVE-2026-35590、CVE-2026-35591 等图像处理漏洞。

### Changed

- 升级 pnpm 从 `11.7.0` → `11.17.0`。
- 依赖版本覆盖（overrides）从 `package.json` 的 `pnpm` 字段迁移至 `pnpm-workspace.yaml`，以适配 pnpm 11 的新配置位置。

### Dependencies

- `next`: `16.2.10` → `16.2.11`
- `next-intl`: `4.13.2` → `4.13.4`
- `react` / `react-dom`: `19.2.7` → `19.2.8`
- `@next/bundle-analyzer`: `16.2.10` → `16.2.11`
- `eslint-config-next`: `16.2.10` → `16.2.11`

---

## [2.0.1] — 2026-07-24

### Fixed

- **运行时与交互稳定性加固**:
  - 自定义光标：修复注册机制与共享状态的竞态，统一光标切换动画。
  - 电力系统：持久化逻辑重构，增加测试覆盖，避免状态在刷新后丢失或不一致。
  - 路由过渡：修复内容页关闭时的过渡状态，移除冗余的 PagesNavigationRuntime。
  - 受保护博客文章状态机：补充取消路径的边界处理，对应 `docs/ai/GOTCHAS.md` 中的注意事项。
  - 音乐播放器：水合后恢复用户音乐选择，移动端自动弹出的保护逻辑加严。
  - GitHub 内容源：推文与内容加载容错增强，避免网络波动时整页崩溃。
  - 资源目录：catalog provider 回退路径修复。
  - Tesseract 体验与导航列：动画时序和可见性修正。
- **资源发布**: 修复 `assets-publish` 脚本未递归发布子目录的问题。
- **CI 工作流**: 调整并发与缓存策略，加速构建。

### Added

- 新增 15+ 个测试文件覆盖光标、电力系统、过渡、博客状态机、音乐播放器、激活拉杆、资源发布脚本等关键路径，测试总数从 ~280 增至 402。
- `docs/ai/GOTCHAS.md` 与 `docs/human/PERFORMANCE.md` 补充新的注意事项与性能调优记录。

---

## [2.0.0] — 2026-07-22

初始公开发布版本。ARSVINE REALM 2.0 全面重构：

- 基于 **Next.js 16 App Router** + **React 19** + **TypeScript**
- 末世 HUD 主题视觉，左栏导航 + 中央内容区 + 背景 Three.js 场景
- **next-intl 4** 三语支持（zh-CN / zh-TW / en），静态 locale 注册表
- MDX 博客系统，支持受保护文章（TOTP / 签名 cookie 访问控制）
- 自定义音乐播放器（云端音频目录 + 本地回退）
- 路由过渡动画、自定义光标、视差头像、粒子效果
- 完整的性能分级（性能分数 → 特效启用/禁用）
- 全面测试套件（Vitest + Testing Library，400+ 测试）

[2.0.3]: https://github.com/Arsvine-Devs/realm/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/Arsvine-Devs/realm/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/Arsvine-Devs/realm/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/Arsvine-Devs/realm/releases/tag/v2.0.0

</details>

[2.0.5]: https://github.com/Arsvine-Devs/realm/compare/v2.0.3...v2.0.5
[Unreleased]: https://github.com/Arsvine-Devs/realm/compare/v2.0.5...HEAD

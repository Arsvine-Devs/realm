# 开发指南

[返回文档导航](./README.md)

本文面向已经完成本地安装、准备修改代码或内容的维护者。安装步骤见 [`GETTING_STARTED.md`](./GETTING_STARTED.md)，完整测试策略见 [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md)。

## 开发基线

- Next.js 16 App Router、React 19、TypeScript。
- Node.js `24.x`，pnpm 版本以 `package.json#packageManager` 为准。
- SCSS Modules 与共享 SCSS partials。
- `next-intl` 4，UI locale 为 `zh-CN`、`zh-TW`、`en`。
- Vitest + `jsdom`，测试统一位于 `tests/`。
- `server.js` 是本地开发和可选自托管入口；Vercel 不运行它。

不要把脚本改成直接调用 `next dev` 或 `next start`。自定义服务器负责环境文件优先级、端口和优雅退出。

## 日常工作流

开始修改前：

```bash
git status --short
pnpm install --frozen-lockfile
```

只在依赖确实变化时修改 `package.json` 和 `pnpm-lock.yaml`。工作区可能已经包含其他人的改动，不要覆盖、重置或顺手格式化无关文件。

推荐流程：

1. 阅读对应专题和 [`GOTCHAS.md`](./GOTCHAS.md)。
2. 搜索既有 component、hook、service、type、schema 和测试。
3. 做最小范围修改。
4. 运行针对性测试。
5. 运行 `pnpm check`。
6. 对视觉或交互改动执行人工验证。

## 常用命令

```bash
pnpm dev
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm quality
pnpm check
```

单个测试：

```bash
pnpm vitest run tests/features/blog/blog-client.test.ts
pnpm vitest run -t "reading time"
```

## 目录职责

```text
config/                 小型运行配置，例如远程图片 host
content/blog/init/      本地开发/测试覆盖同名内容，生产环境的博客 fallback
docs/                   项目维护文档
patches/                pnpm dependency patch
public/                 身份与启动关键静态文件
scripts/                本地维护、资产、字体和图像脚本
src/app/                App Router 页面、layout、Route Handler、i18n
src/features/           按业务领域组织的 UI、model、server、contracts、styles
src/shared/             跨 feature contract、hook、UI、server helper、lib
tests/                  app、feature、shared、repo、operations、scripts 测试
server.js               本地开发与可选自托管入口
```

业务实现优先放入所属 `src/features/<feature>/`，`src/app/` 路由文件保持为参数、metadata、SSG/ISR 和 HTTP 适配层。只有被多个 feature 消费的稳定能力才进入 `src/shared/`。

## 常见修改入口

| 需求                               | 优先位置                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| 站点 metadata、SEO、字体、社交链接 | `src/shared/config/site.ts`                              |
| UI 文案                            | `src/app/locales/*.json`                                 |
| locale 合约                        | `src/shared/contracts/locale.ts`                         |
| 多语言结构化数据                   | `src/features/<feature>/contracts/data/`                 |
| 博客和推文运行时内容               | 外部 GitHub 内容仓库                                     |
| 内置博客 fallback                  | `content/blog/init/`                                     |
| MDX renderer                       | `src/features/blog/ui/mdx/`                              |
| protected post 状态                | `src/features/blog/model/blogPostState.ts`               |
| 导航过渡                           | `src/features/navigation/model/TransitionProvider.tsx`   |
| hash 导航                          | `src/features/navigation/model/contentHashNavigation.ts` |
| HUD 与左面板                       | `src/features/hud/`、`src/app/shell/MainLayout.tsx`      |
| 音乐播放                           | `src/features/music/`                                    |
| 资产 Catalog                       | `src/features/assets/`、`scripts/assets-*.mjs`           |
| 远程图片 host                      | `config/image-hosts.js`                                  |
| 全局 token 和 z-index              | `src/app/styles/globals.scss`                            |

## App Router 边界

- 页面、layout、metadata 和 Route Handler 全部位于 `src/app/`。
- `src/app/layout.tsx` 持有稳定的 document、全局 provider、HUD 和 `MainLayout`。
- `src/app/[locale]/layout.tsx` 是 nested server layout，只负责 locale 验证、server-side i18n 和 locale metadata。
- 不要把全局 provider 移回 `[locale]` layout，否则切换 locale 会重置音乐、HUD、WebGL 和导航状态。
- API route 只导出支持的 HTTP 方法；业务 handler 放在 feature/server 或 shared/server 边界。

完整说明见 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 和 [`ROUTING_AND_I18N.md`](./ROUTING_AND_I18N.md)。

## 导航与页面状态

内部导航必须使用：

```ts
useTransition().navigateTo(url);
```

locale 切换使用同一 context 的 `switchLocale()`。不要用 `router.push()` 绕过 home/content/detail 动画。

只有明确允许且不敏感的页面状态可以通过 `LocalePageState` 跨 locale 保留。认证输入、错误和 pending action 不得保存。

## 国际化数据

结构化数据通常采用：

```text
index.ts   zh-CN，同时作为 fallback
zh-TW.ts
en.ts
```

新增 UI locale 时必须同步更新：

- `src/shared/contracts/locale.ts`
- `src/app/locales/<locale>.json`
- 相关 feature data
- `src/app/i18n/data.ts` 静态注册表
- locale 解析与测试

不要动态 `require` locale 数据。详情见 [`ROUTING_AND_I18N.md`](./ROUTING_AND_I18N.md)。

## 样式约定

- component 样式使用同目录 SCSS Module。
- feature section 样式留在所属 feature。
- 全局 token、字体和 semantic z-index 位于 `src/app/styles/globals.scss`。
- 响应式边界为 `767px` / `768px`。
- 接收 hash 或 `scrollIntoView()` 的移动端 section 使用 `scroll-margin-top: var(--mobile-section-scroll-offset)`。
- `--font-display` 只用于确定为 Latin 的装饰文字；用户内容、翻译、CJK 和 accented Latin 使用安全字体。
- 不用不断增大的 literal z-index 修复层叠问题，优先使用 `--z-*` token 并检查 stacking context。

## 内容与资产

内容格式、MDX component 和外部内容仓库见 [`CONTENT_AND_MDX.md`](./CONTENT_AND_MDX.md)。

资产日常流程：

```bash
pnpm assets:prepare
pnpm assets:build
pnpm assets:publish -- --dry-run
```

真实发布会访问 COS 并切换 pointer，详见 [`ASSETS.md`](./ASSETS.md)。不要把 `cos-workspace/`、私有音频或凭据提交到仓库。

## 维护脚本

| 脚本                                | 用途                                 |
| ----------------------------------- | ------------------------------------ |
| `scripts/sync-env-files.mjs`        | 同步环境文件注册表                   |
| `scripts/prepare-cos-workspace.mjs` | 规范化旧 COS mirror                  |
| `scripts/assets-build.mjs`          | hash、验证并生成 Catalog             |
| `scripts/assets-publish.mjs`        | 上传、验证、切换 pointer、revalidate |
| `scripts/convert-images.mjs`        | 批量转换图片                         |
| `scripts/fetch-google-fonts.mjs`    | 下载并重写字体 CSS                   |
| `scripts/regen-favicons.mjs`        | 生成 favicon 与 PWA icons            |
| `scripts/dev-host-setup.cmd`        | Windows 本地 COS Referer 环境        |

运行不熟悉的脚本前先阅读其参数和 [`ASSETS.md`](./ASSETS.md)。

## 依赖与补丁

- 使用 pnpm，不生成 npm/yarn lockfile。
- pnpm workspace 配置位于 `pnpm-workspace.yaml`，不要移到 `package.json#pnpm`。
- 安全 override 的当前版本以 `pnpm-workspace.yaml` 为准。
- `@react-three/fiber` 精确固定为 `9.7.0`，并应用 `patches/@react-three__fiber@9.7.0.patch`。
- `cos-request` 通过 workspace override 固定为 `1.3.3`，并应用 `patches/cos-request@1.3.3.patch`，避免 Node.js 24 的 `url.parse()` deprecation；升级 COS SDK 时必须重新验证该 patch。
- 升级 Fiber 必须重建 patch 并保持 `tests/repo/react-three-fiber-timer-patch.test.ts` 通过。
- 升级 `cos-request` 必须保持 `tests/repo/cos-request-url-patch.test.ts` 通过，并用 `NODE_OPTIONS=--trace-deprecation pnpm build` 检查构建日志。
- 网络安装失败时先检查代理或 registry，不要把网络问题误判为代码问题。

## 完成前检查

```bash
pnpm check
git diff --check
git status --short
```

确认没有意外修改锁文件、环境文件、生成目录或用户已有改动。视觉验证清单见 [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md)。

## 相关文档

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`ROUTING_AND_I18N.md`](./ROUTING_AND_I18N.md)
- [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md)
- [`GOTCHAS.md`](./GOTCHAS.md)

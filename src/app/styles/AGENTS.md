# styles/

SCSS Modules + 共享 partials + 全局样式。**优先 CSS 变量 + SCSS Module，避免全局选择器漏到无关组件。**

## 结构

```text
styles/
├── globals.scss                   # 全局变量、@import 顺序、HTML/body 基线、字体声明
├── _animations.scss               # 共享 keyframe（revealLogo、loadingPulse 等）
├── _columns.scss                  # 五列导航的样式（首页 + 移动端 panel）
├── _layout.scss                   # 首页 layout 聚合入口（拆到 styles/layout/）
├── _sections.scss                 # /content 聚合页分区与 mobile scroll-margin
├── layout/                        # 首页 left panel / drawer / bottom bar partials
├── loading-screen/                # 首屏 Loading 各子组件 partials
├── detail-standalone/             # web/life 详情页共享骨架 partials
├── sections/                      # /content 分区样式（about/friends/life/work/...）
└── *.module.scss                  # 单组件样式或 module 聚合入口
```

## 字体变量（`globals.scss`）

| 变量 | 字体 | 用途 |
|---|---|---|
| `--font-display` | `ZELDA Free` | 装饰性英文 HUD 标题。**仅基础拉丁，无 CJK/无完整带音标拉丁** —— 不要用在博客标题、用户内容、需要国际化的位置 |
| `--font-hud` | `Dosis` | HUD 数字/标签/博客标题等通用无衬线。Variable Font，wght 200–800 |
| `--font-reading` | `Noto Serif SC` 栈 | MDX 博客正文。Variable Font，wght 200–900 |
| `--font-typewriter` | Courier 栈 | 等宽 / 打字机 |

> 历史教训：博客标题原本用 `--font-display`，法语 `é à ñ` 直接成方块。新增任何接收任意语言内容的标题/正文，**绝对不要**用 `--font-display`。

## 主题/反转模式

- `--ark-highlight-green` —— 主强调色，改色重新主题化只动这个变量。
- `--ark-inverted-*` —— 反转模式（拉杆触发）下的颜色。
- 反转模式由 `MainLayout` 顶层 `.inverted` class 驱动。组件用 `:global(.inverted) &` 选择器，或者读 `useHudPower().isInverted`。**优先 CSS 变量层**，不要在组件里写大量 if/else。

## 移动端顶部安全区

`globals.scss` 三个变量：

- `--mobile-hud-clearance`
- `--mobile-section-scroll-offset`
- `--mobile-detail-top-offset`

都包含了 `env(safe-area-inset-top)`。`.contentSection` / `.friendLinkSection` / `.detailViewWrapper` 等任何会被 `scrollIntoView` 或 hash 跳转命中的 anchor，**必须**设 `scroll-margin-top: var(--mobile-section-scroll-offset)`。

`scrollIntoView({ block: 'start' })` 按 CSSOM 规范自动尊重 `scroll-margin-top`，**不要**写 JS 滚动偏移 helper。

## 共享 partial 引用规则

`@use '../styles/_animations.scss' as *;` 在 module 顶部 import，再用 `animation: revealLogo ...`。新加的 keyframe 要决定：

- 仅一个组件用 → 留在该组件的 `.module.scss` 里。
- 跨组件共享 → 进 `_animations.scss`，注释说明被谁引用。

`_layout.scss` / `_columns.scss` / `_sections.scss` 用同一思路，不要往里堆单组件样式。

- `styles/_layout.scss` 现在只做聚合入口，具体规则放到 `styles/layout/`。
- `features/hud/ui/loading/HomeLoadingScreen.module.scss` 是 HUD loading screen 的 CSS Module 入口，内部通过 `styles/loading-screen/` shared partials 组织。
- `shared/ui/detail/StandaloneDetailView.module.scss` 是 web/life 详情页共用 module 入口，旧的 `Minecraft.module.scss` 已废弃。

## 反模式

- **不要**把 Logo 揭示和视差重新合并到一个元素。`logoReveal` 独占 `revealLogo` 的 `forwards` transform，嵌套 `logoMotion` 独占 rAF transform；全尺寸 `logoContainer` 不得添加 filter/drop-shadow，也不再使用 inline `!important` 覆盖关键帧。
- **不要**把 About 图片的粒子 Canvas 当作静态图的唯一渲染路径。`aboutParticleFallback` 必须覆盖未进入视口、非 full tier、移动端、readiness timeout、资源错误和 WebGL context loss。
- **不要**给会接收 `<Explain>` 工具提示的容器加 `transform`（会创建 stacking context，工具提示被困在原段落内）。`pages/[locale]/blog/[slug].tsx` 的 IntersectionObserver 在 `transitionend` 时显式把 `transform` 设回 `'none'`（**不是** `''`，空串会回到 SCSS 初始值）。
- **不要**用 `--font-display` 渲染任何会出现在用户输入或多语言内容里的文本（见上方"历史教训"）。
- **不要**在组件 SCSS 里硬编码颜色 hex，先看 `globals.scss` 是否已有变量；新增颜色时也加变量，不要直接用色值。

## 添加新 SCSS Module

1. 文件名 `<ComponentName>.module.scss`，与组件同目录。
2. 顶部 `@use '../styles/_animations.scss' as *;`（按需）。
3. 组件里 `import styles from './ComponentName.module.scss'`，class 名 camelCase（自动转，不要再用 kebab-case）。
4. 反转模式样式优先用 CSS 变量；少量复杂状态用 `:global(.inverted) &`。

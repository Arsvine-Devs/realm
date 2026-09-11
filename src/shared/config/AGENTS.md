# data/

站点级配置 + 内容数据。**日常维护优先改这里，不要直接动组件。**

## 结构

```text
data/
├── site.ts                       # 站点身份、SEO、字体、locale tokens
├── music.ts                      # 音乐播放列表
├── projects/{index.ts, en.ts, zh-TW.ts}      # 作品 + 详情页可复制 token
├── experience/{index.ts, en.ts, zh-TW.ts}    # 教育/工作时间线
├── life/{index.ts, en.ts, zh-TW.ts}          # 游戏/旅行/生活
├── skills/{index.ts, en.ts, zh-TW.ts}        # 技能树
└── friendLinks/{index.ts, en.ts, zh-TW.ts}   # 友情链接 + 致谢服务
```

`index.ts` 是简体（`zh-CN`，默认 fallback）。每个主题的 `en.ts` / `zh-TW.ts` 必须**导出与 `index.ts` 完全一致的命名 export 集合**——`lib/i18n-data.ts` 用这个约定按 locale 取模块。

## 修改流程

1. 三语主题（projects / experience / life / skills / friendLinks）：把字段在三个文件里同步。漏一个会触发翻译 fallback（不是错误，但用户能看出来）。
2. 单语数据（`music.ts`、`site.ts`）：直接改即可。`site.ts` 的字段会进 App Router metadata / sitemap / RSS / robots。
3. **不要在 data 文件里写 React 组件 / JSX**。这里是纯数据 + 类型。
4. **不要新增 dynamic import**。`lib/i18n-data.ts` 用静态 registry 显式映射，新增 locale 时改 registry，而不是改成动态 `require`。

## 站点身份（`site.ts`）

`SiteConfig` 类型在 `shared/types/index.ts`。集中字段：

- 站点名称、作者、邮箱、版权起始年份
- `metaTitle` / `metaDescription` / RSS 描述
- 首页打字机签名（与一言交替循环）
- 社交链接
- favicon / Open Graph image / Twitter image
- Google Fonts 链接（`fonts.googleStylesheet` 是 `scripts/fetch-google-fonts.mjs` 的输入；`fonts.cdnStylesheet` 是浏览器实际加载的 URL）
- `htmlLang` / `og:locale` / RSS language
- 各页面（`content` / `friends` / `copyright` / `access` 等）的 SEO 与 heading 文案

`url` 字段空字符串时回退到 `https://arsvine.com`，但建议在 `.env.local` 设 `NEXT_PUBLIC_SITE_URL` 让 sitemap / RSS / robots / Open Graph 用正确域名（环境变量优先级更高）。

## 多语言文章（`content/blog/`）vs 三语数据（`data/`）

两套机制不一样：

- **`data/<topic>/<locale>.ts`**：站点结构性内容（项目、技能、生活），按 locale 全量切换。
- **`content/blog/<slug>/<locale>.mdx`**：博客文章，**外置仓库为主、仓库内 `init/` 兜底**。可有 `ja | ru | fr` 等"仅文章可见"语言，UI 仍保持用户选择。

## CDN 资源引用

不要在 data 文件里硬编码完整 URL。统一通过 `lib/cdn.ts` helper：

```ts
import { cover, gallery, post, avatar } from '../../lib/cdn';

cover('projects/foo.webp'); // → cdn.arsvine.com/covers/projects/foo.webp
gallery('life/games/001.jpg'); // → cdn.arsvine.com/gallery/life/games/001.jpg
post('2026/blog-image.png'); // → cdn.arsvine.com/posts/2026/blog-image.png
```

Catalog helper 返回稳定逻辑引用，由 SSG/ISR 通过私有 catalog 解析为带 hash 的 COS object key。缺少 catalog 时不应把附加媒体复制到 `public/` 作为生产 fallback。

## UI 文案（不在这里）

UI 字符串走 `next-intl`，集中在 `locales/{zh-CN,zh-TW,en}.json`。data 只放结构化内容（项目标题、描述、tag 等），UI 上的按钮文案 / 占位 / 错误提示在 locales。

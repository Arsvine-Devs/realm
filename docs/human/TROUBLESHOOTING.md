# 故障排查

[返回文档索引](../INDEX.md)

本文按现象给出检查顺序和修复方向。先收集事实，再修改代码；不要把网络、环境或外部服务问题直接归因于应用。

## 通用检查

```bash
node --version
pnpm --version
git status --short
pnpm typecheck
pnpm test
```

记录：

- 完整命令；
- 首个错误和 stack；
- route、locale、浏览器和 viewport；
- 是否 production/preview/local；
- 相关环境变量是否“存在”（不要打印值）；
- 最近 deployment、content index 或 Catalog version。

## 安装失败或 patch 未应用

现象：`pnpm install` 警告 patch 不匹配，或 Fiber clock 测试失败。

检查：

```bash
pnpm --version
pnpm vitest run tests/repo/react-three-fiber-timer-patch.test.ts
```

确认 `package.json` 精确使用 `@react-three/fiber: 9.7.0`，`pnpm-workspace.yaml` 的 patch key 与 `patches/@react-three__fiber@9.7.0.patch` 一致。不要用 caret 绕过失败。

依赖下载慢或失败时检查当前 shell 的 proxy/registry。只设置临时进程级代理，不提交代理配置。

## `pnpm dev` 无法启动

检查：

- Node 是否为 `24.x`；
- `PORT` 是否被占用；
- `.env.local` 是否有无效格式；
- 报错来自 `server.js` prepare、Next compile 还是应用运行时。

更换临时端口：

```powershell
$env:PORT=3001; pnpm dev
```

不要改成 `next dev` 规避 `server.js`，这会绕过项目环境加载路径。

## 根路径进入错误语言

语言优先级：

```text
NEXT_LOCALE Cookie > Accept-Language > zh-CN
```

检查 `NEXT_LOCALE` Cookie 和 request `Accept-Language`。`GEO_COUNTRY` 不参与语言选择。访问 `/fr/...` 时 Proxy 会剥掉不支持的 locale-like segment，再加受支持 locale。

相关测试：

```bash
pnpm vitest run tests/repo/proxy.test.ts tests/app/i18n/config.test.ts
```

## Locale 切换后音乐/HUD 被重置

检查全局 provider 是否仍在 `src/app/layout.tsx`，而不是 `[locale]/layout.tsx`；locale 控件是否调用 `switchLocale()`。

```bash
pnpm vitest run tests/app/locale-hot-switch.test.tsx
```

## 内部导航没有动画或停在遮罩层

检查：

- 是否直接调用了 `router.push()`；
- `navigateTo()` queue 是否被旧 animation callback 占用；
- source-based loading kind 是否被改成 target-based；
- transition cleanup 是否取消 WAAPI/GSAP/timer；
- wrapper inline opacity/clip-path 是否在完成后清理。

运行 navigation 测试，并分别复现 home → content、content → detail、detail → detail、detail → home。

## Hash 导航位置错误

确认：

- section ID 与 URL hash 一致；
- `LayoutAnchorsContext` 注册的是实际 scroll container；
- mobile section 有 `scroll-margin-top: var(--mobile-section-scroll-offset)`；
- 没有额外 JavaScript offset 与 CSS 重复补偿。

## 博客只显示 fallback 或语言不正确

检查 `blog-index.json`：

- `availableLocales` 是否包含目标文件；
- `variants` key 是否一致；
- `blog/<slug>/<locale>.mdx` 是否存在；
- `originLocale` 是否为 `zh-CN`、`zh-TW` 或 `en`；
- GitHub owner/repo/branch/Token 是否指向预期仓库。

UI locale 和 content-only locale 是两个概念；`ja`、`ru`、`fr` 不会切换 UI。

## 博客或推文没有外部内容

缺少 GitHub 配置时是预期 fallback。配置存在时检查 Function log 中的 GitHub status，但不要记录 Token。

路径错误时检查 repo-relative 规则，不要通过允许 absolute URL 或 traversal 来“修复”。

开发推文压力模式：

```env
TWEETS_STRESS_TEST=1
```

生产环境禁止启用。

## Protected post 卡在 loading/auth

检查：

1. `ACCESS_GRANT_SECRET` 与 `TOTP_GROUPS_JSON` 是否存在。
2. index 中 `access.group` 是否对应配置 group。
3. `/api/grant-check`、`/api/protected-verify`、`/api/post-variant` status。
4. 是否触发 `429` 和 `Retry-After`。
5. XState actor 是否被 article/locale change 正确取消。

不要把 fetch 移到 component effect，也不要加入 slug request-key ref。

## Protected 正文出现在页面源代码

这是安全事故。立即停止发布/下线相关索引入口，确认 page 初始 `mdxSource` 为 `null`，metadata 已清理，并运行：

```bash
pnpm vitest run tests/features/blog/blog-protected-rsc-contract.test.ts
```

检查 CDN/ISR cache 后再恢复入口。

## Asset API 返回 `502`

`502` 表示 Catalog 读取/验证失败，不等于空 Catalog。检查：

- `COS_PRIVATE_BUCKET` / `REGION`；
- 当前 Function credential；
- private `realm/catalog/current.json`；
- 对应 version section JSON；
- `COS_PRIVATE_CATALOG_PREFIX`；
- Catalog schema 与 objectKey。

不要把失败转换成假 `200 []`，否则 UI 会把基础设施故障当成无内容。

## 图片、音频或 manifest 在本地 `403`

COS Referer 通常拒绝 localhost。使用：

```powershell
scripts\dev-host-setup.cmd
```

如果 `dev.arsvine.com` 仍失败，检查 hosts、系统 proxy bypass、bucket Referer allowlist、CORS origin 和 CDN cache key 是否包含 `Origin`。

## 新资产发布后页面仍旧

检查顺序：

1. public/private version object 是否存在；
2. 两个 pointer 是否指向新 version；
3. `/api/revalidate-assets` response 的 `failed`；
4. ISR route 是否包含目标 detail；
5. CDN 是否缓存了旧 public manifest；
6. 数据中的 `catalogKey` 是否正确。

不要删除旧 object，直到新版本全部验证。

## 字体 CJK tofu 或 Firefox 不加载

检查 response header：

```bash
curl -I -H "Referer: https://arsvine.com/" https://cdn.arsvine.com/shared/fonts/google-fonts.css
```

常见原因：

- COS Value 字段误填 `Cache-Control: ...`，形成重复 header name；
- Content-Type 错误；
- Referer/CORS 拒绝；
- 把 Latin-only `--font-display` 用于 CJK 或 accented text；
- 误认为 variable font 相同 URL 是重复文件并手工拆分。

## WebGL 不显示或频繁闪烁

先检查 `<html>` performance capability：

```js
document.documentElement.dataset.performanceTier;
document.documentElement.dataset.performanceReason;
```

再检查：reduced motion、Save-Data、runtime FPS、lazy import error、`webglcontextlost`、canvas 是否因 transition 反复 unmount。

不要直接删除 performance gate。

## CustomCursor label 卡住

检查 route、scroll、blur、visibility、registered target leave 和 DOM unmount 是否统一调用 reset helper。不要直接写内部 ref。

如果 cursor 静止 CPU 仍高，检查 at-rest rAF 是否能停止，以及 hover 状态是否永久为 true。

## 音乐播放器切歌不播放

点击 track 必须设置明确 play intent，由 `audio.load()` → `audio.play()` 消费。不要加“只有当前已播放才 autoplay”的 guard。

移动端首次进入不应自动打开播放器；desktop delay 与 mobile guard 要同时保留。

## Windows production build 异常

`next.config.js` 在 Windows production 关闭 webpack cache，这是有意兼容。先清理由当前失败生成且确认可重建的 build output，再重跑；不要删除用户文件或 lockfile。

可用 `NEXT_BUILD_DIR` 指向临时 build dir 诊断：

```powershell
$env:NEXT_BUILD_DIR='.next-diagnostic'; pnpm build
```

## Revalidation 返回 `401`、`429` 或 partial

- `401`：`REVALIDATE_SECRET` 未配置、请求未携带或不匹配。
- `429`：一分钟窗口超限，遵循 `Retry-After`。
- `partial` / `failed`：逐项检查 route；不要只根据 HTTP `2xx` 判定成功。

`revalidate-content` 和 `revalidate-assets` 使用 POST JSON body。只有旧 `/api/revalidate` 兼容 query secret。

## `pnpm env:sync` 后出现未知键

脚本会保留未注册键到 `(unmanaged)` 区域，防止删除开发者临时配置。检查它是否为：

- 合法临时变量；
- 已删除变量；
- 拼写错误；
- 本应加入注册表的新配置。

修正后再次运行并检查 Git diff。

## 何时升级为回归说明

如果问题满足以下条件，应补充 [`AI GOTCHAS`](../ai/GOTCHAS.md)：

- 曾真实发生；
- 表面修复容易重新引入；
- 需要保留特定实现或测试；
- 仅靠通用最佳实践无法推导。

## 相关文档

- [`MAINTAINER.md`](./MAINTAINER.md)
- [`OPERATIONS.md`](./OPERATIONS.md)
- [`AI GOTCHAS`](../ai/GOTCHAS.md)

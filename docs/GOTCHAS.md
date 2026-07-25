# 历史回归与不可破坏约束

[返回文档导航](./README.md)

本文件记录项目中真实发生过、仅靠通用最佳实践不容易发现的回归。修改相关模块前先阅读对应条目，并保留关联测试。

## 领域索引

- 内容与安全：1、8、9、10、16、17、22、23、24、25、26。
- 字体与资产：2、3、4、5、29。
- 路由与布局：6、7、18、19、21、28。
- HUD、WebGL 与性能：11、12、15、20、29。
- 音乐：13、14。
- 测试结构：27。

## 1. 不要重新引入 `reading-time`

项目在 `src/features/blog/server/blog.ts` 使用同时统计 CJK 字符和 Latin/Cyrillic 单词的估算器。

普通 whitespace estimator 会把长中文文章压缩成极低时长。必须继续去除 code block、inline code、HTML/JSX 和 MDX import/export，并只向 metadata 暴露 `readingMinutes`。

## 2. `--font-display` 只适合确定为 Latin 的装饰文字

`ZELDA Free` 字符集不完整。不要用于 CJK、accented Latin、博客标题、翻译或用户内容。

- HUD 安全标题：`--font-hud`
- 长文：`--font-reading`
- typewriter/monospace：`--font-typewriter`

## 3. COS custom header 的 Value 只填写值

正确：

```text
Key: Cache-Control
Value: public, max-age=31536000, immutable
```

错误：

```text
Value: Cache-Control: public, max-age=31536000, immutable
```

错误写法会产生畸形 header，Firefox 可能拒绝字体并出现繁体罕见字 tofu。

## 4. Google Fonts variable font URL 重复是正常现象

多个 `@font-face` weight 可以指向同一个 variable `.woff2`。不要修改 `scripts/fetch-google-fonts.mjs` 强制每个 weight 一个文件。

## 5. COSCLI 凭据必须是临时的

`pnpm assets:publish` 通过当前进程传入 credential，并使用 `--init-skip`。不要运行 `coscli config init`、提交 config、打印 secret 或提交 `cos-workspace/`。

## 6. 内部导航必须使用 `navigateTo()`

```ts
useTransition().navigateTo(url)
```

直接 `router.push()` 会跳过页面过渡、column retract/expand 和 detail choreography。

## 7. Loading overlay 根据 source route 选择

`useRouteLoadingKind()` 读取离开的 route：

- home/content → blog detail：左面板仍显示，使用 default/right overlay。
- blog detail → blog detail：左面板已隐藏，使用 standalone overlay。

不要改成 target-based。

## 8. Protected async work 属于 XState invoked actor

grant check 和 variant load 留在 `authChecking` / `loadingVariant` actor。离开 state 时 `AbortSignal` 自动取消旧请求。

不要把请求移到 React effect，否则 article/locale change 会重新引入 stale response race。

## 9. `ARTICLE_CHANGED` 必须完整替换 context

transition 必须保留：

- `reenter: true`；
- `replaceArticle`；
- error reset；
- 新 `authState`；
- 新文章的 `displayedContentLocale`。

不要按 slug/locale request key 去重。`useBlogPostState` 可以用完整 memoized `articleInput` 对象身份跳过 Strict Mode 初始 effect 重放，但任何真实 input 变化都必须发送 `ARTICLE_CHANGED`，继续走 actor cancellation。

保留 article reset、stale actor cancellation、forbidden fallback、`AUTH_GRANTED` continuation 和 Strict Mode 测试。

## 10. Protected body 永远不能进入静态 props

未授权 protected post：

- `mdxSource` 为 `null`；
- metadata 清理 excerpt、tags、reading time；
- body 只在 runtime grant 后加载；
- 直接 `/api/post-variant` 返回 `403`。

不要用 ciphertext 或隐藏 JSON 替代；不变量是静态数据中没有正文。

## 11. Avatar reveal 与 parallax 分层

方形 reveal wrapper 持有 reveal keyframe；内部 motion layer 持有 pointer parallax；mask pseudo-element 持有 chromatic separation。

不要把职责合回整个 left panel，否则会创建 viewport-sized filter layer 和 transform 冲突。

## 12. CustomCursor hover 状态通过 helper reset

route、scroll、blur、visibility、target leave 和 DOM unmount 都可能留下 BACK 等 label。新增 cursor semantics 时调用现有 reset helper，不要直接写内部 ref。

## 13. 点击 MusicPlayer track 表示立即播放

track click 设置显式 play intent，由 `audio.load()` → `audio.play()` 消费。不要加“只有当前正在播放才自动播放新 track”的 guard。

## 14. MusicPlayer 移动端不能自动打开

desktop 可以延迟 auto-open；mobile guard 必须保留。首次进入就覆盖手机大部分屏幕是已修复的体验回归。

## 15. `ActivationLever` 必须是 button

保留 button semantics、`aria-label` 和 cursor label。不要为样式方便改成 `div`。

## 16. Blog reveal 结束后 transform 必须为 `none`

正确：

```ts
element.style.transform = 'none';
```

空字符串可能恢复 stylesheet transform 并继续创建 stacking context，使 `<Explain>` tooltip 被后续段落压住。

## 17. `<AnimatedTitleChars>` 默认 uppercase

Web/Life hero 依赖默认 uppercase；博客标题必须显式：

```tsx
<AnimatedTitleChars uppercase={false} />
```

Latin 单词还要传 inline-block + nowrap 的 word wrapper，避免窄屏错误断词。

## 18. 移动端 section anchor 使用 CSS scroll margin

```scss
scroll-margin-top: var(--mobile-section-scroll-offset);
```

不要增加 JavaScript scroll offset helper，与 CSS 双重补偿会造成新偏移。

## 19. Locale 不由 IP 决定

固定顺序：

```text
NEXT_LOCALE Cookie > Accept-Language > zh-CN
```

`GEO_COUNTRY` 只用于非安全 UI 微调，不能参与语言、认证或授权。

## 20. WebGL effect 不应频繁 churn context

desktop Three.js effect 使用 SSR-disabled lazy import，ready 后不应随普通 transition 反复 unmount/remount。重复销毁 GPU context 会造成卡顿和不稳定。

能力关闭或 context loss 时应有明确 pause/cleanup/fallback，不是无限重建。

## 21. `/[locale]/game` 不是路由

Game project 在 content hub 的 in-page detail mode 展示。不要恢复旧 matcher、prefetch、redirect 或 link。

## 22. GitHub 内容路径只能是 repo-relative

`src/shared/lib/content/github.ts` 必须拒绝：

- absolute/protocol-relative URL；
- leading `/` 与反斜杠；
- query、fragment；
- traversal 与 encoded traversal。

路径按 segment 编码，并从固定 GitHub API base 构建。

## 23. 外链必须解析，不能 substring match

作品外链使用 `new URL()` 和 hostname allow/variant logic。不要用 `includes('github.com')` 或 `includes('bilibili.com')`，`github.com.evil.test` 会误判。

unsafe 输入降级为纯文本。

## 24. Blog 内部目标使用验证 helper

不要把任意 slug 直接交给 `navigateTo()` 或 `Link href`。只允许安全 locale 和单 segment slug；不安全目标退回 `/${locale}/content#blog`。

## 25. Locale fallback banner 使用显式 dispatch

`LocaleFallbackBanner.tsx` 按 locale allowlist 分支选择文案。不要用用户可控字符串进行动态 method/property dispatch。

## 26. Typing effect 语言检测必须按 script

`src/features/hud/model/typing-effect.ts` 显式识别 Latin、Han、Hiragana、Katakana、Hangul。

纯 Latin 才走 alphabetic profile；混合 CJK 走 CJK cadence。不要退回宽泛 Unicode range。

## 27. 新测试统一放 `tests/`

```text
tests/features/<feature>/
tests/shared/
tests/app/
tests/repo/
tests/operations/
tests/scripts/
```

不要在 `src/` 旁新增 test file。

## 28. Global shell 必须位于 locale segment 之上

`src/app/layout.tsx` 持有 document、client i18n、HUD、navigation 和 `MainLayout`；`[locale]/layout.tsx` 是 nested server layout。

移到 `[locale]` 下会让 locale switch 重置全局状态。locale 使用 `switchLocale()`，普通内部 route 使用 `navigateTo()`。

## 29. Fiber 精确固定并应用 Timer patch

```text
package.json: @react-three/fiber = 9.6.1
pnpm-workspace.yaml: patches/@react-three__fiber@9.6.1.patch
```

补丁把 Fiber built dist 的 `THREE.Clock` 改成 `THREE.Timer` compatibility clock，使 Tesseract 在详情页可安全切换 `frameloop="never"` 暂停、恢复后继续渲染。

不能用 caret。dist filename 含内容 hash，自动 patch upgrade 可能只产生 warning 并静默退回 Clock。

升级时重新 `pnpm patch`、更新精确版本和 patch key，并保持 `tests/repo/react-three-fiber-timer-patch.test.ts` 通过。

## 30. About 图片粒子必须保留静态 fallback

`AboutParticleImage` 只在桌面 `full` tier 且首次进入视口后创建 R3F Canvas。离开视口或页面隐藏时暂停 demand frameloop 和轮换 timer；重新进入时保持已组装状态，不重复 intro。

静态 normal/inverted 图片必须始终留在 DOM 中，并覆盖移动端、非 full tier、700ms readiness timeout、动态 import/图片加载失败和 WebGL context loss。序列源的缓存键必须包含 `src` 与 `sampleSize`，否则相同图片使用不同采样分辨率时会复用错误数据。

## 维护本文件

只记录已经发生且需要保留特殊实现/测试的项目陷阱。通用开发说明放入对应专题；新条目包含原因、禁止做法、必需行为和回归测试。

## 相关文档

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`SECURITY.md`](./SECURITY.md)
- [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md)
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

# lib/

跨 feature 的非 React 基础设施：SSR/SSG 数据访问、内容鉴权、纯函数工具、CDN/区域可见性。**没有 React hooks**（hooks 在 `hooks/`），**没有 UI 组件**（在 `features/` 或 `shared/ui/`），**没有 feature 专属领域逻辑**（HUD 专属代码在 `features/hud/model/`）。

`shared` 是 eslint 强制的叶子层：禁止 `import` 任何 `@/app` / `@/features` / `@/pages`。如果一段代码只被单个 feature 消费，放该 feature 的 `model/`，不要下沉到本目录。

## 文件清单

### 内容仓库 + 鉴权

| 文件                      | 职责                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `content/github.ts`       | GitHub Contents API 客户端（`Accept: application/vnd.github.raw`）+ 60s in-process 缓存                         |
| `content/types.ts`        | `ContentBlogIndex`、`ContentPostAccess`、`TotpGroupConfig` 等共享类型                                           |
| `content/access-grant.ts` | HMAC-签名授权 cookie：`createAccessGrant` / `verifyAccessGrant` / `createAccessGrantCookie`（HttpOnly, 1h TTL） |
| `content/access-api.ts`   | `/api/protected-verify` / `/api/grant-check` 的 response 类型                                                   |
| `content/totp.ts`         | RFC 6238 TOTP 校验，支持 previous secret window（密钥轮换期内宽限）                                             |
| `content/rate-limit.ts`   | in-process + Upstash 限流，由 `/api/protected-verify` 按 (client-ip, group) 调用                                |

### 资源 / 区域 / 文档

| 文件                    | 职责                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `cdn.ts`                | `cover()` / `gallery()` / `post()` / `avatar()` / `music()` helper -- 生成稳定 Catalog 引用与 CDN 资产 URL |
| `region-visibility.ts`  | 基于访客所在地的 UI 微调（X / Bilibili 等被屏蔽地区隐藏外链）。**仅 UI**，不参与权限决策                   |
| `document-bootstrap.ts` | 根布局注入的内联脚本：首次绘制前从 storage 读 power state / theme，避免无主题闪烁                          |
| `ui-timings.ts`         | 跨组件共享的动画时长常量（如 `CONTENT_DETAIL_EXIT_DELAY_MS`）                                              |

### 纯函数工具

| 文件                                             | 职责                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `hash.ts`                                        | 内容锚点 hash 工具                                                                                           |
| `safe-external-href.ts`                          | `getSafeExternalHref` -- 仅放行 http/https，防 `javascript:`/`data:` XSS                                     |
| `title-reveal.ts`                                | 标题逐字 reveal 动画（gsap.context 包裹）                                                                    |
| `cursor-targets.ts`                              | 自定义光标目标注册契约（navigation content ↔ hud cursor overlay）                                            |
| `hud-typing-visibility.ts`                       | HUD 打字 overlay 可见性跨树契约（navigation ↔ hud ↔ app shell）                                              |
| `locale-resolution.ts`                           | `NEXT_LOCALE cookie > Accept-Language > zh-CN` 解析                                                          |
| `performance-tiers.ts` / `performance-policy.ts` | 自适应性能分层常量与初始策略；`document-bootstrap.ts` 与 `features/hud/model/useAdaptivePerformance.ts` 共享 |

> HUD 专属模块已迁出本目录：4D 投影几何（`tesseract-geometry`）、env 遥测文本（`env-telemetry-artifact`）、打字效果（`typing-effect`）、rAF lerp 工具（`raf-lerp`）、WebGL context loss（`webgl-context-loss`）均在 `features/hud/model/`。自适应性能分层（`performance-tiers` / `performance-policy`）因被 `document-bootstrap.ts` 共享，保留在本目录。博客系统在 `features/blog/`，推文在 `features/tweets/`，i18n 静态 registry 在 `src/app/i18n/data.ts`。

## 写新文件时

- **服务端代码**（读 GitHub、解析 MDX、签 cookie、调外部 API）放 feature 的 `server/` 或 shared server 边界；`src/app/api/**/route.ts` 只做 App Router HTTP 适配，业务逻辑不要堆进 route 文件。
- **跨页面/组件复用的常量**（动画时长、storage key、配额）抽到 `ui-timings.ts` 或新建专用模块；不要在组件文件里散落 magic number。
- **单 feature 专属逻辑不下沉**：只被单个 feature 消费的代码放该 feature 的 `model/`，不放在本目录。
- **不要把 React hooks 写在这里**。hooks 在 `hooks/`，UI 在 `features/` 或 `shared/ui/`。lib 是非 React 的。
- **测试边界**：算法层（reducer、解析、URL 构造、几何）必须测；I/O 边界（GitHub API、TOTP）按 fixture 思路测；UI 不在 lib 范围内。

## 测试

测试位于仓库根目录的 `tests/shared/lib/` 与 `tests/features/`。运行：

```bash
pnpm test
pnpm vitest run tests/shared/lib/cdn.test.ts
```

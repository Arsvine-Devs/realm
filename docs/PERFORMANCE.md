# 性能与降级策略

[返回文档导航](./README.md)

本文说明首屏性能策略、七级 runtime tier、能力属性、采样阈值、恢复规则和 WebGL 生命周期。

## 设计目标

- 首次 HTML 与 hydration 对性能状态达成一致。
- 根据真实 frame pacing 降级，而不是根据粗粒度设备标签猜测。
- 每次只关闭一个能力组，保持站点核心功能可用。
- reduced motion 与 Save-Data 始终优先于视觉效果。
- WebGL、rAF、pointer listener 和动画在能力关闭后真正停止。

## Tier 与能力

| Tier | Logo | Ambient WebGL | Heavy CSS | Decorative motion | Interactive WebGL | Custom cursor |
|---|---:|---:|---:|---:|---:|---:|
| `full` | on | on | on | on | on | on |
| `logo-reduced` | off | on | on | on | on | on |
| `ambient-reduced` | off | off | on | on | on | on |
| `css-reduced` | off | off | off | on | on | on |
| `motion-reduced` | off | off | off | off | on | on |
| `webgl-reduced` | off | off | off | off | off | on |
| `minimal` | off | off | off | off | off | off |

Logo 本体在所有 tier 可见；`allowLogoEffects=false` 只移除 pointer、rAF、parallax 和 chromatic layers。

## Hydration-safe 初始策略

document bootstrap 只读取明确用户信号：

| 信号 | 初始 tier | reason |
|---|---|---|
| `prefers-reduced-motion` | `minimal` | `reduced-motion` |
| Save-Data | `motion-reduced` | `save-data` |
| 无 | `full` | `none` |

不使用 effective type、RTT、downlink、device memory 或 CPU concurrency 决定视觉 tier，因为它们不代表 frame pacing，且经常过期或粗糙。

## Runtime 采样

页面可见且 opening animation 结束后采样：

```text
窗口：最多 120 frames 或 2500ms
poor：平均 FPS < 45，或 slow frames >= 25%
healthy：平均 FPS >= 55，且 slow frames <= 10%
```

降级：

- 第一个 poor window 立即从 `full` 进入 `logo-reduced`。
- 后续 tier 需要连续两个 poor window。
- 后续降级 cooldown 为 5 秒。

恢复：

- 连续三个 healthy window 恢复一级。
- 恢复 cooldown 为 10 秒。
- 页面不能恢复到比显式偏好或 session runtime ceiling 更高的 tier。
- 一旦 runtime 关闭 logo effects，本次 page session 不恢复到 `full`；完整刷新重置该 ceiling。

## DOM 能力属性

`src/shared/lib/performance-tiers.ts` 是 tier 到能力的唯一映射，状态写入 `<html>`：

```text
data-performance-tier
data-performance-reason
data-logo-effects
data-ambient-webgl
data-heavy-css-effects
data-decorative-motion
data-interactive-webgl
data-custom-cursor
```

React 和 CSS 都消费能力属性，不枚举特定 tier。新增效果时先判断属于哪个能力组；只有无法归类时才增加新能力。

## React 使用原则

- 使用 HUD performance context，不在 component 内重复读取设备启发式信息。
- 能力关闭时清理 rAF、timer、observer、pointer listener、GSAP tween 和 WebGL resource。
- 可选模块 lazy import 失败时保留基础 UI。
- 不因短暂 route transition 反复 unmount 已准备好的 WebGL canvas。
- 动画 callback 必须支持取消，避免旧 transition 在新导航后写 DOM。

## WebGL

desktop-only：

- `RainMorimeEffect`：ambient WebGL。
- `TesseractExperience`：interactive WebGL 与 physics。

mobile 不加载完整 canvas，使用简化充电行为。

Context loss 通过共享 listener 捕获，阻止默认恢复风暴并通知能力层关闭对应效果。不要在错误边界中无限 remount canvas。

## React Three Fiber Timer patch

`@react-three/fiber` 精确固定为 `9.6.1`。`pnpm-workspace.yaml` 应用：

```text
patches/@react-three__fiber@9.6.1.patch
```

补丁把 built dist 中的 `THREE.Clock` 替换为 `THREE.Timer` compatibility clock，使 Canvas 可安全切换 `frameloop`；详情页暂停 Tesseract 时使用 `frameloop="never"`，恢复后切回 `"always"`。

升级流程：

1. 选择新 Fiber 版本。
2. `pnpm patch @react-three/fiber@<version>`。
3. 对新 dist 重新生成 Timer patch。
4. 同步更新 `package.json` 精确版本与 `pnpm-workspace.yaml` patch key。
5. 运行 `tests/repo/react-three-fiber-timer-patch.test.ts` 和 `pnpm check`。

不能使用 caret；patch 目标含内容 hash，pnpm 对不匹配 patch 可能只警告并继续安装。

## CSS 与合成层

- Logo reveal wrapper 限制在 artwork 方形区域。
- pointer parallax 与 reveal transform 分层。
- chromatic effect 使用 mask、transform 和 opacity。
- About 图片粒子只在桌面 `full` tier 且进入视口后挂载；Canvas 使用 `frameloop="demand"`，离开视口、页面隐藏或动画/交互回位结束后停止渲染。
- About 静态图片 fallback 始终保留，性能降级、readiness timeout、资源错误和 WebGL context loss 时不得留下空白。
- 不在全左面板添加 filter/drop-shadow 合成层。
- capability off 时通过 CSS attribute 关闭 expensive effect。
- 不用 `will-change` 覆盖整个 viewport 或长期保留无用 layer。

## CustomCursor

Custom cursor 保留到 `minimal` 前一层。静止且非 hover 时停止 rAF，由 mousemove/hover 重新唤醒。route、scroll、blur、visibility 和 DOM unmount 必须通过 reset helper 清理 label/target 状态。

## 添加高成本效果

1. 定义效果所属 capability。
2. 明确 mount、pause、unmount 和 failure 行为。
3. 确认 reduced motion 路径。
4. 确认 listener/rAF/resource cleanup。
5. 增加 tier contract 和 component 测试。
6. 在 desktop/mobile、正常与降级 tier 下人工验证。

## 诊断

在浏览器检查 `<html>`：

```js
document.documentElement.dataset.performanceTier
document.documentElement.dataset.performanceReason
```

如果效果未出现，先确认 capability attribute，再检查 lazy import、context loss 和 reduced motion，不要直接删除 gate。

## 相关测试

```text
tests/app/document-bootstrap-performance.test.ts
tests/app/main-layout-performance.test.tsx
tests/features/hud/performance-tiers.test.ts
tests/features/hud/useAdaptivePerformance.test.ts
tests/features/hud/left-panel-performance.test.tsx
tests/features/hud/webgl-context-loss.test.ts
tests/repo/react-three-fiber-timer-patch.test.ts
```

## 相关文档

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md)
- [`GOTCHAS.md`](./GOTCHAS.md)

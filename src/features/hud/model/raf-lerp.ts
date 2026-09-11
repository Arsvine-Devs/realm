/**
 * 60fps 动画共享的数学与调度工具。
 *
 * 仓库内有 3 处手写 rAF 循环：
 *   - CustomCursor：cursor 坐标 lerp（用 customCursorShared 的 lerp）
 *   - LeftPanel：头像视差 + 双低通 + 速度驱动色散
 *   - TesseractExperience：电池吸引（用 R3F useFrame，不能切普通 rAF）
 *
 * TesseractExperience 因 R3F 渲染循环上下文保留 useFrame；其余两处共享
 * 基础数学。rAF 调度本身（start / cancel / idle 检测）每处仍由组件自己写
 * —— 因为 LeftPanel 有"split 双低通 + 速度驱动"等业务语义，硬抽象成 hook
 * 会让调用方代码反而更绕。
 *
 * 本文件只抽最纯粹的数学工具，让三处的"lerp / clamp"实现归一。
 */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 简易一阶低通：y = a * x + (1 - a) * yPrev。常用于平滑抖动量。
 * a 越接近 1 → 越快跟随；a 越接近 0 → 越平滑。
 */
export function lowPass(prev: number, next: number, alpha: number): number {
  return alpha * next + (1 - alpha) * prev;
}

/**
 * 判断"rAF loop 是否还该继续"——典型用法是 idle 时停帧省 CPU：
 *   if (isAtRest(current, target, threshold)) { stop; }
 */
export function isAtRest(current: number, target: number, epsilon = 0.05): boolean {
  return Math.abs(current - target) < epsilon;
}

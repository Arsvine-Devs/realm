import { useRef, useEffect } from 'react';
import styles from './Noise.module.scss'; // Use SCSS module

interface NoiseProps {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
}

const Noise = ({
  patternSize = 250, // 噪点图案的基础尺寸 (px)
  patternScaleX = 1, // X轴缩放 (当前未使用，CSS控制)
  patternScaleY = 1, // Y轴缩放 (当前未使用，CSS控制)
  patternRefreshInterval = 4, // 图案刷新间隔 (帧数，值越大刷新越慢)
  patternAlpha = 10, // 噪点透明度 (0-255，值越小越透明)
}: NoiseProps) => {
  const grainRef = useRef<HTMLCanvasElement | null>(null); // Canvas 元素引用

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0; // 动画帧计数器
    let animationFrameId: number | null = null; // requestAnimationFrame 的 ID

    // 创建离屏 Canvas 用于生成噪点图案
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;
    const patternCtx = patternCanvas.getContext('2d');
    if (!patternCtx) return;

    const patternData = patternCtx.createImageData(patternSize, patternSize);
    const patternPixelDataLength = patternSize * patternSize * 4; // RGBA

    // 更新离屏 Canvas 中的噪点图案数据
    const updatePattern = () => {
      for (let i = 0; i < patternPixelDataLength; i += 4) {
        const value = Math.random() * 255; // 随机灰度值
        patternData.data[i] = value; // R
        patternData.data[i + 1] = value; // G
        patternData.data[i + 2] = value; // B
        patternData.data[i + 3] = patternAlpha; // Alpha (透明度)
      }
      patternCtx.putImageData(patternData, 0, 0);
    };

    // 将生成的噪点图案绘制到主 Canvas 上
    const drawGrain = () => {
      const { width, height } = canvas; // 获取当前主 Canvas 尺寸
      ctx.clearRect(0, 0, width, height); // 清除上一帧

      if (patternCanvas.width > 0 && patternCanvas.height > 0) {
        const pattern = ctx.createPattern(patternCanvas, 'repeat'); // 创建可重复的图案
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height); // 填充整个 Canvas
        } else {
          console.error('Failed to create noise pattern');
        }
      } else {
        console.error('Pattern canvas has zero dimensions');
      }
    };

    // 动画循环
    const loop = () => {
      if (canvas.width > 0 && canvas.height > 0) {
        // 仅当 Canvas 有效尺寸时更新
        if (frame % patternRefreshInterval === 0) {
          // 控制刷新频率
          updatePattern();
          drawGrain();
        }
        frame++;
      }
      animationFrameId = window.requestAnimationFrame(loop);
    };

    // 初始化
    updatePattern(); // 生成初始图案
    drawGrain(); // 立即绘制第一帧
    loop(); // 启动动画

    // 清理函数
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId); // 取消动画帧
      }
    };
    // Dependencies: Include props that affect the pattern or drawing
  }, [patternSize, patternRefreshInterval, patternAlpha]); // 依赖项：影响图案或绘制的 props

  // Use the SCSS module class name
  return <canvas className={styles.noiseOverlay} ref={grainRef} />;
};

export default Noise;

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { listenForWebglContextLoss } from '@/shared/lib/webgl-context-loss';

interface RainMorimeEffectProps {
  onContextLost: () => void;
}

const RainMorimeEffect = ({ onContextLost }: RainMorimeEffectProps) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, powerPreference: 'low-power' });
    } catch {
      console.warn('RainMorimeEffect: WebGL context creation failed, skipping background effect');
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      uniform float time;
      uniform float scanlineIntensity;
      uniform float glitchIntensity;
      uniform float noiseIntensity;

      float rand(vec2 co){
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
        float scanline = sin(vUv.y * 800.0 + time * 0.5) * 0.5 + 0.5;
        color.rgb += vec3(scanline * scanlineIntensity * 0.05);

        float glitchOffset = (rand(vec2(time * 0.1, vUv.y * 0.2)) - 0.5) * 2.0 * glitchIntensity * 0.01;
        float glitchTrigger = step(0.995, rand(vec2(time * 0.05)));
        vec2 glitchUv = vUv + vec2(glitchOffset * glitchTrigger, 0.0);

        float noise = (rand(vUv + time * 0.01) - 0.5) * noiseIntensity * 0.1;
        color.a = clamp(scanline * 0.02 + noise * 0.05, 0.0, 0.1);

        gl_FragColor = color;
      }
    `;

    const uniforms = {
      time: { value: 0.0 },
      scanlineIntensity: { value: 0.6 },
      glitchIntensity: { value: 0.2 },
      noiseIntensity: { value: 0.15 }
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const timer = new THREE.Timer();
    timer.connect(document);
    let rafId: number;
    let paused = false;
    let contextLost = false;

    const animate = (timestamp?: number) => {
      if (paused || contextLost) return;
      rafId = requestAnimationFrame(animate);
      timer.update(timestamp);
      uniforms.time.value = timer.getElapsed();
      renderer.render(scene, camera);
    };
    animate();

    const handleVisibility = () => {
      if (document.hidden) {
        paused = true;
        cancelAnimationFrame(rafId);
      } else {
        paused = false;
        if (!contextLost) animate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const canvas = renderer.domElement;
    const removeContextLossListener = listenForWebglContextLoss(canvas, () => {
      contextLost = true;
      cancelAnimationFrame(rafId);
      onContextLost();
    });

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
      removeContextLossListener();
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      timer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [onContextLost]);

  // 组件容器样式 (固定定位，覆盖全屏，位于内容之后)
  const style: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1, // 确保在其他内容后面
    pointerEvents: 'none' // 不响应鼠标事件
  };

  return <div ref={mountRef} style={style} />;
};

export default RainMorimeEffect;

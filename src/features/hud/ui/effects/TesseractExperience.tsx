import React, { Suspense, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, usePlane } from '@react-three/cannon';
import * as THREE from 'three';

import Tesseract, { type TesseractHandle } from './Tesseract';
import {
  computeBatteryAttractionOffset,
  projectWorldPositionToCanvas,
  resolveBatteryAnchorPosition,
  resolveBatteryWorldPosition,
  type BatteryPosition3D,
} from '@/features/hud/model/tesseract-geometry';
import { listenForWebglContextLoss } from '@/shared/lib/webgl-context-loss';

function resolvePhysicsMesh(tesseractRef: React.RefObject<TesseractHandle | null>) {
  return tesseractRef.current?.meshRef.current ?? null;
}

function Plane(props: { position: [number, number, number] }) {
  const [ref] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    material: {
      restitution: 0.3,
    },
    ...props,
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#050a11" transparent opacity={0} />
    </mesh>
  );
}

function WebglContextLossListener({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(
    () => listenForWebglContextLoss(gl.domElement, onContextLost),
    [gl, onContextLost],
  );

  return null;
}

interface SceneLogicProps {
  isConnecting: boolean;
  tesseractRef: React.RefObject<TesseractHandle | null>;
  batteryPosition3D: BatteryPosition3D | null;
  canvasRectRef: React.RefObject<DOMRect | null>;
  batteryElementRef: React.RefObject<HTMLDivElement | null>;
  batteryIconRectRef: React.RefObject<DOMRect | null>;
  linePositionAttrRef: React.RefObject<THREE.BufferAttribute | null>;
  isDragging: boolean;
}

function SceneLogic({
  isConnecting,
  tesseractRef,
  batteryPosition3D,
  canvasRectRef,
  batteryElementRef,
  batteryIconRectRef,
  linePositionAttrRef,
  isDragging,
}: SceneLogicProps) {
  const currentOffsetRef = useRef({ x: 0, y: 0 });
  // 复用临时 Vector3，避免 useFrame 热点循环每帧分配
  const tesseractWorldPosRef = useRef(new THREE.Vector3());
  const batteryWorldPosRef = useRef(new THREE.Vector3());
  const dragWorldPosRef = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    if (isConnecting && batteryPosition3D) {
      const physicsMesh = resolvePhysicsMesh(tesseractRef);
      if (physicsMesh) {
        const tesseractWorldPos = tesseractWorldPosRef.current;
        physicsMesh.getWorldPosition(tesseractWorldPos);
        const batteryWorldPos = resolveBatteryWorldPosition(batteryPosition3D, camera, batteryWorldPosRef.current);

        tesseractWorldPos.clampLength(0, 50);
        batteryWorldPos.clampLength(0, 50);
        const lineAttr = linePositionAttrRef.current;
        if (lineAttr) {
          lineAttr.setXYZ(0, tesseractWorldPos.x, tesseractWorldPos.y, tesseractWorldPos.z);
          lineAttr.setXYZ(1, batteryWorldPos.x, batteryWorldPos.y, batteryWorldPos.z);
          lineAttr.needsUpdate = true;
        }
      }
    }

    const batteryEl = batteryElementRef.current;
    const canvasRect = canvasRectRef.current;
    const iconRect = batteryIconRectRef.current;
    if (!batteryEl || !canvasRect || !iconRect) {
      return;
    }

    let targetX = 0;
    let targetY = 0;

    if (isDragging) {
      const physicsMesh = resolvePhysicsMesh(tesseractRef);
      if (physicsMesh) {
        const worldPosition = dragWorldPosRef.current;
        physicsMesh.getWorldPosition(worldPosition);
        const tesseractScreen = projectWorldPositionToCanvas(worldPosition, camera, canvasRect);
        const offset = computeBatteryAttractionOffset({
          tesseractScreen,
          iconRect,
          currentOffset: currentOffsetRef.current,
        });
        targetX = offset.x;
        targetY = offset.y;
      }
    }

    const currentOffset = currentOffsetRef.current;
    currentOffset.x += (targetX - currentOffset.x) * 0.18;
    currentOffset.y += (targetY - currentOffset.y) * 0.18;

    if (
      Math.abs(currentOffset.x) < 0.05
      && Math.abs(currentOffset.y) < 0.05
      && targetX === 0
      && targetY === 0
    ) {
      currentOffset.x = 0;
      currentOffset.y = 0;
      batteryEl.style.transform = '';
    } else {
      batteryEl.style.transform = `translate(${currentOffset.x.toFixed(2)}px, ${currentOffset.y.toFixed(2)}px)`;
    }
  });

  return null;
}

interface TesseractExperienceProps {
  chargeBattery: () => void;
  isActivated: boolean;
  isInverted: boolean;
  paused: boolean;
  onDraggingChange?: (dragging: boolean) => void;
  powerDisplayRef: React.RefObject<HTMLDivElement | null>;
  batteryIconRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onContextLost: () => void;
}

const TesseractExperience = ({
  chargeBattery,
  isActivated,
  isInverted,
  paused,
  onDraggingChange,
  powerDisplayRef,
  batteryIconRef,
  scrollContainerRef,
  onContextLost,
}: TesseractExperienceProps) => {
  const [batteryPosition3D, setBatteryPosition3D] = useState<BatteryPosition3D | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const tesseractRef = useRef<TesseractHandle | null>(null);
  const [isTesseractDragging, setIsTesseractDragging] = useState(false);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const batteryIconRectRef = useRef<DOMRect | null>(null);
  const batteryElementRef = useRef<HTMLDivElement | null>(null);
  const connectionLinePositions = useMemo(() => new Float32Array(6), []);
  const linePositionAttrRef = useRef<THREE.BufferAttribute | null>(null);

  useEffect(() => {
    batteryElementRef.current = powerDisplayRef.current ?? null;
  }, [powerDisplayRef]);

  useEffect(() => {
    if (paused) {
      batteryElementRef.current?.style.removeProperty('transform');
      return;
    }

    const batteryElement = powerDisplayRef.current ?? null;
    batteryElementRef.current = batteryElement;

    const updatePosition = () => {
      const canvasElement = glRef.current?.domElement ?? null;
      const iconElement = batteryIconRef.current ?? null;

      if (!canvasElement || !iconElement) {
        canvasRectRef.current = null;
        batteryIconRectRef.current = null;
        startTransition(() => {
          setBatteryPosition3D(null);
        });
        return;
      }

      const canvasRect = canvasElement.getBoundingClientRect();
      const iconRect = iconElement.getBoundingClientRect();
      canvasRectRef.current = canvasRect;
      batteryIconRectRef.current = iconRect;

      const nextPosition = resolveBatteryAnchorPosition(
        canvasRect,
        iconRect,
      );
      startTransition(() => {
        setBatteryPosition3D(nextPosition);
      });
    };

    const initialTimeoutId = window.setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    const activeScrollContainer = scrollContainerRef.current;

    if (activeScrollContainer) {
      activeScrollContainer.addEventListener('scroll', updatePosition, { passive: true });
    } else {
      window.addEventListener('scroll', updatePosition, { passive: true });
    }

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.removeEventListener('resize', updatePosition);
      if (activeScrollContainer) {
        activeScrollContainer.removeEventListener('scroll', updatePosition);
      } else {
        window.removeEventListener('scroll', updatePosition);
      }
      if (batteryElement) {
        batteryElement.style.transform = '';
      }
      canvasRectRef.current = null;
      batteryIconRectRef.current = null;
      batteryElementRef.current = null;
    };
  }, [batteryIconRef, paused, powerDisplayRef, scrollContainerRef]);

  useEffect(() => {
    onDraggingChange?.(paused ? false : isTesseractDragging);
  }, [isTesseractDragging, onDraggingChange, paused]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '17.5vh',
        left: '6.4vw',
        width: '36.4vw',
        height: '65vh',
        zIndex: 7,
        pointerEvents: 'none',
        visibility: paused ? 'hidden' : 'visible',
      }}
      aria-hidden={paused}
    >
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        shadows="percentage"
        camera={{ position: [-3, -1, 8], fov: 50 }}
        style={{
          background: 'transparent',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
        gl={{ alpha: true }}
        onCreated={({ gl }) => {
          glRef.current = gl;
          gl.setClearColor(new THREE.Color(0, 0, 0), 0);
        }}
      >
        <WebglContextLossListener onContextLost={onContextLost} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-5, -5, -5]} intensity={0.5} color="red" />
          <pointLight position={[0, 5, -10]} intensity={0.8} color="blue" />

          {isActivated && (
            <Physics gravity={[0, -9.82, 0]}>
              <Plane position={[0, -3, 0]} />
              {batteryPosition3D ? (
                <Tesseract
                  ref={tesseractRef}
                  position={[0, 1, 0]}
                  batteryPosition3D={batteryPosition3D}
                  onConnectChange={setIsConnecting}
                  chargeBattery={chargeBattery}
                  onDraggingChange={setIsTesseractDragging}
                  isInverted={isInverted}
                />
              ) : null}
            </Physics>
          )}

          {isActivated && isConnecting && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  ref={linePositionAttrRef}
                  attach="attributes-position"
                  args={[connectionLinePositions, 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#888888" />
            </line>
          )}

          {isActivated && (
            <SceneLogic
              isConnecting={isConnecting}
              tesseractRef={tesseractRef}
              batteryPosition3D={batteryPosition3D}
              canvasRectRef={canvasRectRef}
              batteryElementRef={batteryElementRef}
              batteryIconRectRef={batteryIconRectRef}
              linePositionAttrRef={linePositionAttrRef}
              isDragging={isTesseractDragging}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default TesseractExperience;

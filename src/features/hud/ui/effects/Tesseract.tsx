import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import * as THREE from 'three';

import {
  createTesseractLineGeometry,
  resolveBatteryWorldPosition,
  type BatteryPosition3D,
} from '@/features/hud/model/tesseract-geometry';

export interface TesseractHandle {
  getPosition: () => THREE.Vector3 | undefined;
  meshRef: React.RefObject<THREE.Group | null>;
}

interface TesseractProps {
  position: [number, number, number];
  batteryPosition3D: BatteryPosition3D;
  onConnectChange: (connected: boolean) => void;
  chargeBattery: () => void;
  onDraggingChange: (dragging: boolean) => void;
  isInverted: boolean;
}

function emitCursorHover(active: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('arsvine:tesseract-cursor-hover', { detail: { active } }));
}

function Tesseract({
  position,
  batteryPosition3D,
  onConnectChange,
  chargeBattery,
  onDraggingChange,
  isInverted,
  ref,
}: TesseractProps & { ref?: React.Ref<TesseractHandle> }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const isConnectingRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const chargeCooldownRef = useRef(false);
  const dragStartPos = useRef(new THREE.Vector3());
  const { camera, mouse } = useThree();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const batteryWorldPosRef = useMemo(() => new THREE.Vector3(), []);
  const targetPlane = useRef(new THREE.Plane());
  const planeNormal = useRef(new THREE.Vector3());
  const mouseNdc = useMemo(() => new THREE.Vector2(), []);

  const outerSize = 0.4;
  const innerSize = 0.2;
  const halfOuter = outerSize / 2;
  const ndcMargin = 0.1;
  const dragMinY = -3 + halfOuter + 0.05;

  const [, api] = useBox(
    () => ({
      mass: 1,
      position: position ? [position[0], Math.max(position[1], 8), position[2]] : [0, 8, 0],
      args: [outerSize, outerSize, outerSize],
      linearDamping: 0.1,
      angularDamping: 0.5,
      allowSleep: false,
      material: {
        restitution: 0.8,
      },
    }),
    groupRef,
  );

  const lineGeometry = useMemo(
    () => createTesseractLineGeometry(outerSize, innerSize),
    [innerSize, outerSize],
  );

  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsDragging(true);
    onDraggingChange(true);

    if (groupRef.current) {
      dragStartPos.current.copy(groupRef.current.position);
      planeNormal.current.copy(camera.getWorldDirection(new THREE.Vector3()).negate());
      targetPlane.current.setFromNormalAndCoplanarPoint(planeNormal.current, dragStartPos.current);
    }

    const target = event.target as Element & {
      setPointerCapture: (pointerId: number) => void;
    };
    target.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const target = event.target as Element & {
      hasPointerCapture: (pointerId: number) => boolean;
      releasePointerCapture: (pointerId: number) => void;
    };
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
    onDraggingChange(false);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !groupRef.current) {
      return;
    }
    event.stopPropagation();
  };

  useImperativeHandle(
    ref,
    () => ({
      getPosition: () => groupRef.current?.position,
      meshRef: groupRef,
    }),
    [],
  );

  useEffect(
    () => () => {
      emitCursorHover(false);
    },
    [],
  );

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    if (coreRef.current) {
      coreRef.current.rotation.x += 0.015;
      coreRef.current.rotation.y += 0.02;
    }

    let currentlyConnecting = false;

    if (isDragging) {
      const clampedNdcX = Math.max(-1 + ndcMargin, Math.min(1 - ndcMargin, mouse.x));
      const clampedNdcY = Math.max(-1 + ndcMargin, Math.min(1 - ndcMargin, mouse.y));
      mouseNdc.set(clampedNdcX, clampedNdcY);
      raycaster.setFromCamera(mouseNdc, camera);

      if (raycaster.ray.intersectPlane(targetPlane.current, targetPosition)) {
        const clampedY = Math.max(targetPosition.y, dragMinY);
        api.position.set(targetPosition.x, clampedY, targetPosition.z);
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);

        resolveBatteryWorldPosition(batteryPosition3D, camera, batteryWorldPosRef);
        const distance = targetPosition.distanceTo(batteryWorldPosRef);

        if (distance < 2.5) {
          currentlyConnecting = true;
          if (!chargeCooldownRef.current) {
            chargeBattery();
            chargeCooldownRef.current = true;
            window.setTimeout(() => {
              chargeCooldownRef.current = false;
            }, 200);
          }
        }
      }
    } else {
      groupRef.current.rotation.x += 0.005;
      groupRef.current.rotation.y += 0.007;
    }

    if (isConnectingRef.current !== currentlyConnecting) {
      isConnectingRef.current = currentlyConnecting;
      onConnectChange(currentlyConnecting);
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={hovered ? '#aaaaff' : '#888888'} linewidth={3} />
      </lineSegments>

      <mesh ref={coreRef} castShadow>
        <octahedronGeometry args={[0.08]} />
        <meshBasicMaterial color={isInverted ? '#E08FFF' : '#B2F2BB'} wireframe />
      </mesh>

      <mesh
        visible={false}
        scale={[outerSize * 1.5, outerSize * 1.5, outerSize * 1.5]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOver={() => {
          setHovered(true);
          emitCursorHover(true);
        }}
        onPointerOut={() => {
          setHovered(false);
          emitCursorHover(false);
        }}
      >
        <boxGeometry />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

Tesseract.displayName = 'Tesseract';

export default Tesseract;

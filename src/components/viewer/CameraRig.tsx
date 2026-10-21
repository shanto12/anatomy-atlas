import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { getOrganFocus, getOrganFramingRadius } from '@/viewer/geometry';
import { viewerControls } from '@/viewer/controls';

type Variant = 'hero' | 'explore' | 'organ' | 'system';

interface CameraRigProps {
  variant: Variant;
  autoRotate: boolean;
  interactive: boolean;
  controls: boolean;
  resetSignal: number;
  focusOrganId: string | null;
  focusSignal: number;
  selectedOrganId: string | null;
  reducedMotion: boolean;
}

interface Preset {
  position: [number, number, number];
  target: [number, number, number];
}

const PRESETS: Record<Variant, Preset> = {
  // The hero is composed slightly below and right of centre so the museum plate in the
  // top-left corner never collides with the head.
  hero: { position: [1.75, 5.15, 14.9], target: [-0.55, 4.3, 0] },
  explore: { position: [1.05, 4.75, 15.1], target: [0, 3.98, 0] },
  system: { position: [1.2, 4.85, 14.6], target: [0, 4.08, 0] },
  organ: { position: [1.2, 5.3, 13.0], target: [0, 4.6, 0] },
};

/**
 * Camera distance for an organ. "organ" fills the frame with the structure, "explore" keeps a
 * comfortable amount of body context around it.
 */
function focusDistanceFor(organId: string, variant: Variant, fov: number): number {
  const radius = getOrganFramingRadius(organId);
  const halfFov = THREE.MathUtils.degToRad(fov * 0.5);
  const fit = radius / Math.tan(halfFov);
  if (variant === 'organ') return THREE.MathUtils.clamp(fit * 1.5, 0.5, 14);
  if (variant === 'system') return THREE.MathUtils.clamp(fit * 3.2, 4.4, 13);
  return THREE.MathUtils.clamp(fit * 3.4, 4.2, 13);
}

function computeDefault(variant: Variant, aspect: number): { position: THREE.Vector3; target: THREE.Vector3 } {
  const preset = PRESETS[variant] ?? PRESETS.explore;
  const target = new THREE.Vector3(preset.target[0], preset.target[1], preset.target[2]);
  const position = new THREE.Vector3(preset.position[0], preset.position[1], preset.position[2]);
  const zoom = aspect < 1.05 ? Math.min(1.6, 1 + (1.05 - aspect) * 0.6) : 1;
  position.sub(target).multiplyScalar(zoom).add(target);
  return { position, target };
}

/**
 * Camera experience: damped orbit/zoom, a reset target, and smooth "focus on this organ"
 * flights. Animations are hand-damped here instead of using an animation library so they can
 * be cancelled instantly by the user grabbing the scene, and skipped for reduced motion.
 */
export default function CameraRig({
  variant,
  autoRotate,
  interactive,
  controls,
  resetSignal,
  focusOrganId,
  focusSignal,
  selectedOrganId,
  reducedMotion,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  // OrbitControls' implementation type lives in drei; `any` keeps the public bundle free of
  // drei internals while letting us drive target and auto-rotate imperatively.
  const controlsRef = useRef<any>(null);
  const anim = useRef({
    active: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
  });
  const tmp = useRef({ dir: new THREE.Vector3(), focus: new THREE.Vector3() });
  const reducedRef = useRef(reducedMotion);
  const autoRotateRef = useRef(autoRotate);
  const interactiveRef = useRef(interactive);
  const controlsEnabledRef = useRef(controls);
  const variantRef = useRef(variant);
  const aspectRef = useRef(size.width / Math.max(1, size.height));
  reducedRef.current = reducedMotion;
  autoRotateRef.current = autoRotate;
  interactiveRef.current = interactive;
  controlsEnabledRef.current = controls;
  variantRef.current = variant;
  aspectRef.current = size.width / Math.max(1, size.height);

  const enabled = useMemo(() => controls && interactive, [controls, interactive]);

  const snapTo = (position: THREE.Vector3, target: THREE.Vector3) => {
    camera.position.copy(position);
    const orbit = controlsRef.current;
    if (orbit) {
      orbit.target.copy(target);
      orbit.update();
    } else {
      camera.lookAt(target);
    }
  };

  const animateTo = (position: THREE.Vector3, target: THREE.Vector3) => {
    if (reducedRef.current) {
      anim.current.active = false;
      snapTo(position, target);
      return;
    }
    anim.current.position.copy(position);
    anim.current.target.copy(target);
    anim.current.active = true;
  };

  const goHome = (instant = false) => {
    const view = computeDefault(variantRef.current, aspectRef.current);
    if (instant) snapTo(view.position, view.target);
    else animateTo(view.position, view.target);
  };

  const focusOrgan = (organId: string, instant = false) => {
    const orbit = controlsRef.current;
    const focus = getOrganFocus(organId);
    if (!orbit || !focus) return;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 32;
    const distance = focusDistanceFor(organId, variantRef.current, fov);
    const target = tmp.current.focus.set(focus[0], focus[1], focus[2]);
    const dir = tmp.current.dir.copy(camera.position).sub(orbit.target);
    if (dir.lengthSq() < 1e-6) dir.set(0.25, 0.12, 1);
    dir.normalize().multiplyScalar(distance);
    const position = new THREE.Vector3().copy(target).add(dir);
    if (instant || reducedRef.current) snapTo(position, target);
    else animateTo(position, target);
  };

  // Initial framing.
  useEffect(() => {
    const view = computeDefault(variantRef.current, aspectRef.current);
    if (variantRef.current === 'organ' && selectedOrganId) {
      camera.position.copy(view.position);
      const orbit = controlsRef.current;
      if (orbit) {
        orbit.target.copy(view.target);
        orbit.update();
      }
      focusOrgan(selectedOrganId, true);
      return;
    }
    snapTo(view.position, view.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  // Reset signal.
  useEffect(() => {
    if (!resetSignal) return;
    goHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // Focus signal.
  useEffect(() => {
    if (!focusSignal || !focusOrganId) return;
    focusOrgan(focusOrganId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal, focusOrganId]);

  // "organ" variant follows the selection.
  useEffect(() => {
    if (variantRef.current !== 'organ' || !selectedOrganId) return;
    focusOrgan(selectedOrganId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganId]);

  // Zoom buttons from the explorer.
  useEffect(
    () =>
      viewerControls.subscribeZoom((factor) => {
        const orbit = controlsRef.current;
        if (!orbit) return;
        const target = orbit.target;
        const dir = tmp.current.dir.copy(camera.position).sub(target);
        let distance = dir.length();
        if (!Number.isFinite(distance) || distance < 0.001) return;
        distance = THREE.MathUtils.clamp(distance * factor, 2.2, 30);
        dir.setLength(distance);
        const position = tmp.current.focus.copy(target).add(dir);
        animateTo(position, target);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera],
  );

  useFrame((state, delta) => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    if (anim.current.active) {
      const step = reducedRef.current ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 4.8);
      state.camera.position.lerp(anim.current.position, step);
      orbit.target.lerp(anim.current.target, step);
      orbit.autoRotate = false;
      orbit.update();
      if (
        state.camera.position.distanceToSquared(anim.current.position) < 0.0009 &&
        orbit.target.distanceToSquared(anim.current.target) < 0.0009
      ) {
        state.camera.position.copy(anim.current.position);
        orbit.target.copy(anim.current.target);
        orbit.update();
        anim.current.active = false;
      }
    } else {
      orbit.autoRotate = Boolean(
        autoRotateRef.current && interactiveRef.current && controlsEnabledRef.current && !reducedRef.current,
      );
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      target={[PRESETS.explore.target[0], PRESETS.explore.target[1], PRESETS.explore.target[2]]}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={2.2}
      maxDistance={30}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI * 0.56}
      rotateSpeed={0.72}
      zoomSpeed={0.85}
      autoRotateSpeed={0.55}
      onStart={() => {
        anim.current.active = false;
      }}
    />
  );
}

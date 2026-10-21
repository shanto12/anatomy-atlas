import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { SystemId } from '@/lib/types';
import { ORGAN_BY_ID } from '@/viewer/anatomy';
import { CATALOG_ORGAN_BY_ID } from '@/viewer/catalog';

interface ViewerLabelsProps {
  activeSystems: SystemId[] | null;
  selectedOrganId: string | null;
  hoveredId: string | null;
  showLabels: boolean;
}

interface LabelEntry {
  id: string;
  name: string;
  at: [number, number, number];
  color: string;
  selected: boolean;
}

interface FrameItem {
  entry: LabelEntry;
  x: number;
  y: number;
  visible: boolean;
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const MAX_LABELS = 12;

/**
 * Museum-style labels. Anchors are projected into the stage and overlaps are resolved in 2D.
 *
 * The label DOM is created imperatively (not with react-dom's createPortal) because this
 * component lives inside the react-three-fiber tree — the R3F reconciler must never see a
 * `<span>`. Updates happen in a single `useFrame`, so the camera can move without React churn.
 */
export default function ViewerLabels({
  activeSystems,
  selectedOrganId,
  hoveredId,
  showLabels,
}: ViewerLabelsProps) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const layer = useRef<HTMLDivElement | null>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const dims = useRef(new Map<string, { w: number; h: number }>());
  const frame = useRef({
    items: [] as FrameItem[],
    placed: Array.from({ length: MAX_LABELS }, () => ({ x1: 0, y1: 0, x2: 0, y2: 0 })) as Rect[],
    vec: new THREE.Vector3(),
  });

  const entries = useMemo<LabelEntry[]>(() => {
    const map = new Map<string, LabelEntry>();
    const add = (id: string | null) => {
      if (!id || map.has(id)) return;
      const placement = ORGAN_BY_ID[id];
      if (!placement) return;
      const catalog = CATALOG_ORGAN_BY_ID[id];
      map.set(id, {
        id,
        name: catalog?.name ?? placement.name,
        at: placement.focus ?? placement.at,
        color: catalog?.systemColor ?? '#d9cbb2',
        selected: id === selectedOrganId,
      });
    };

    add(selectedOrganId);
    add(hoveredId);
    if (showLabels && activeSystems && activeSystems.length > 0) {
      for (const placement of Object.values(ORGAN_BY_ID)) {
        if (activeSystems.includes(placement.systemId)) add(placement.id);
        if (map.size >= MAX_LABELS) break;
      }
    }

    return Array.from(map.values()).slice(0, MAX_LABELS);
  }, [activeSystems, selectedOrganId, hoveredId, showLabels]);

  // Create the DOM overlay once and sync one pill per entry.
  useEffect(() => {
    const container = gl.domElement.closest('.viewer-shell') as HTMLElement | null;
    if (!container) return undefined;
    const element = document.createElement('div');
    element.className = 'viewer-label-layer';
    element.setAttribute('aria-hidden', 'true');
    container.appendChild(element);
    layer.current = element;
    return () => {
      element.remove();
      layer.current = null;
      nodes.current.clear();
      dims.current.clear();
    };
  }, [gl]);

  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    const wanted = new Set(entries.map((entry) => entry.id));
    // Remove stale pills
    for (const [id, node] of nodes.current) {
      if (!wanted.has(id)) {
        node.remove();
        nodes.current.delete(id);
        dims.current.delete(id);
      }
    }
    // Add or update pills
    for (const entry of entries) {
      let node = nodes.current.get(entry.id);
      if (!node) {
        node = document.createElement('div');
        const dot = document.createElement('span');
        dot.className = 'viewer-label__dot';
        dot.style.background = entry.color;
        const text = document.createElement('span');
        text.className = 'viewer-label__text';
        text.textContent = entry.name;
        node.appendChild(dot);
        node.appendChild(text);
        node.style.opacity = '0';
        element.appendChild(node);
        nodes.current.set(entry.id, node);
      }
      node.classList.toggle('is-selected', entry.selected);
      const text = node.querySelector<HTMLElement>('.viewer-label__text');
      if (text && text.textContent !== entry.name) text.textContent = entry.name;
      const dot = node.querySelector<HTMLElement>('.viewer-label__dot');
      if (dot) dot.style.background = entry.color;
      dims.current.set(entry.id, { w: node.offsetWidth, h: node.offsetHeight });
    }
    // Re-measure after webfonts settle.
    const timer = window.setTimeout(() => {
      for (const [id, node] of nodes.current) {
        dims.current.set(id, { w: node.offsetWidth, h: node.offsetHeight });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [entries]);

  useFrame(() => {
    if (!layer.current) return;
    const width = size.width;
    const height = size.height;
    const { items, placed, vec } = frame.current;
    items.length = 0;

    for (const entry of entries) {
      vec.set(entry.at[0], entry.at[1], entry.at[2]).project(camera);
      items.push({
        entry,
        x: (vec.x * 0.5 + 0.5) * width,
        y: (-vec.y * 0.5 + 0.5) * height,
        visible: vec.z > -1 && vec.z < 1,
      });
    }

    // Selected first, then hovered, then roughly top-to-bottom.
    items.sort(
      (a, b) =>
        Number(b.entry.selected) - Number(a.entry.selected) ||
        Number(b.entry.id === hoveredId) - Number(a.entry.id === hoveredId) ||
        a.y - b.y,
    );

    let placedCount = 0;
    for (const item of items) {
      const node = nodes.current.get(item.entry.id);
      if (!node) continue;
      if (!item.visible) {
        node.style.opacity = '0';
        continue;
      }
      const dim = dims.current.get(item.entry.id) ?? { w: 96, h: 26 };
      const gap = 14;
      let x = item.x + gap;
      if (x + dim.w > width - 12) x = item.x - dim.w - gap;
      x = clamp(x, 12, Math.max(12, width - dim.w - 12));
      let y = item.y - dim.h / 2;

      for (let pass = 0; pass < 2; pass += 1) {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          let hit: Rect | null = null;
          for (let i = 0; i < placedCount; i += 1) {
            const rect = placed[i];
            if (x < rect.x2 + 4 && x + dim.w > rect.x1 - 4 && y < rect.y2 + 4 && y + dim.h > rect.y1 - 4) {
              hit = rect;
              break;
            }
          }
          if (!hit) break;
          y = pass === 0 ? hit.y2 + 5 : hit.y1 - dim.h - 5;
        }
        if (y + dim.h <= height - 12 && y >= 12) break;
        y = item.y - dim.h - 10;
      }

      y = clamp(y, 12, Math.max(12, height - dim.h - 12));

      if (placedCount < placed.length) {
        const rect = placed[placedCount];
        rect.x1 = x;
        rect.y1 = y;
        rect.x2 = x + dim.w;
        rect.y2 = y + dim.h;
        placedCount += 1;
      }

      node.style.opacity = '1';
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

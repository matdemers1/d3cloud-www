import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { flatShaded, loadMesher, type HouseMesh, type MeshPart, type Mesher, type PartKind, type Vec3 } from '../../../vendor/d3-floorspec/mesh.js';
// manifold-3d's WebAssembly, served from this origin like every other asset of the build.
import wasmUrl from '../../../vendor/d3-floorspec/manifold.wasm?url';
import type { Derived, FloorspecDocument } from '../../../vendor/d3-floorspec/engine.js';
import { FLOORSPEC } from '../spec';

/**
 * The playground's 3D view (FLR-T-10.2): the document meshed by @floorspec/mesh — walls with their
 * openings cut, floors, ceilings, slabs, roofs, stairs, extension fallbacks — from what the engine
 * already derived, drawn with three.js. Its own chunk, with the mesher and three.js, loaded only when
 * a valid document is shown. Drag to orbit, scroll or pinch to zoom; it draws only when something
 * changes, so nothing runs while it is still.
 */

let mesher: Promise<Mesher> | null = null;
const getMesher = () => (mesher ??= loadMesher({ locateFile: () => wasmUrl }));

/**
 * A house's own surfaces, not interface colour, so not tokens: the same plaster, oak and slate in
 * either theme — the editor's quiet defaults (apps/web/src/editor/three/parts.ts).
 */
const COLOURS: Record<PartKind, number> = {
  wall: 0xd8d2c6,
  junctionFill: 0xd8d2c6,
  opening: 0x9fc3dc,
  floor: 0xc8b391,
  ceiling: 0xf2f0ea,
  slab: 0xb9b6ae,
  roof: 0x5b616d,
  roofGable: 0xd8d2c6,
  stairFlight: 0xb58b5f,
  stairLanding: 0xb58b5f,
  stairBlock: 0xb58b5f,
  extension: 0x9aa0ae,
};
/** The model's ink lines, and the light: also the scene's, not the interface's. */
const EDGE = 0x5b616d;
const OUTLINED: ReadonlySet<PartKind> = new Set(['wall', 'junctionFill', 'slab', 'roof', 'stairFlight', 'stairLanding', 'stairBlock']);
const ROOFS: ReadonlySet<PartKind> = new Set(['roof', 'roofGable']);

/** Where a level sits, lowest first. */
function levelOrder(document: FloorspecDocument): Map<string, number> {
  const levels = Object.entries((document.levels ?? {}) as Record<string, { elevation?: number }>);
  levels.sort(([ia, a], [ib, b]) => (a.elevation ?? 0) - (b.elevation ?? 0) || (ia < ib ? -1 : 1));
  return new Map(levels.map(([id], i) => [id, i]));
}

/** The middle of the plan in whole base units, so Float32 metres stay precise far from the origin. */
function originOf(document: FloorspecDocument): Vec3 {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const j of Object.values((document.junctions ?? {}) as Record<string, { position?: [number, number] }>)) {
    const [x, y] = j.position ?? [NaN, NaN];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return Number.isFinite(minX) ? [Math.round((minX + maxX) / 2), Math.round((minY + maxY) / 2), 0] : [0, 0, 0];
}

/** What shows: a cutaway at `level` leaves off every level above it, and that level's ceilings and roof. */
function visible(part: MeshPart, cutaway: boolean, level: string | undefined, order: Map<string, number>): boolean {
  if (part.kind === 'opening' && part.opening?.category !== 'window') return false; // a door's cut is a pick target, not a surface
  if (!cutaway || level === undefined) return true;
  const at = order.get(part.level);
  const current = order.get(level);
  if (at === undefined || current === undefined) return true;
  if (at > current) return false;
  return !(at === current && (part.kind === 'ceiling' || ROOFS.has(part.kind)));
}

/** Whether this browser gives a canvas a WebGL context at all: asked once, before anything is built. */
function hasWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

const NO_WEBGL = 'This browser could not start WebGL, so there is no 3D view. The plan and the diagnostics do not need it.';

type Status = { state: 'meshing' } | { state: 'ready'; parts: number; ms: number } | { state: 'error'; message: string };

export interface View3DProps {
  document: FloorspecDocument;
  derived: Derived;
  level: string | undefined;
  cutaway: boolean;
  highlight: readonly string[];
  /** Read by assistive technology in place of the picture. */
  label: string;
}

/** Remounted (by key) for each document shown, so it starts meshing afresh. */
export default function View3D({ document, derived, level, cutaway, highlight, label }: View3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [house, setHouse] = useState<HouseMesh | null>(null);
  const [webgl] = useState(hasWebGL);
  const [status, setStatus] = useState<Status>(() => (webgl ? { state: 'meshing' } : { state: 'error', message: NO_WEBGL }));
  // The view, kept across re-renders: re-framing only when the house or the cut changes.
  const view = useRef<{ renderer: WebGLRenderer; camera: PerspectiveCamera; controls: OrbitControls; scene: Scene; render: () => void } | null>(null);

  // Mesh the document: manifold-3d's WASM is fetched once for the page.
  useEffect(() => {
    if (!webgl) return;
    let cancelled = false;
    getMesher()
      .then((m) => {
        if (cancelled) return;
        const started = performance.now();
        const mesh = m.meshDerived(document, derived, { origin: originOf(document) });
        setHouse(mesh);
        setStatus({ state: 'ready', parts: mesh.parts.length, ms: Math.round(performance.now() - started) });
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [document, derived, webgl]);

  // The renderer, the camera and the controls: made once, disposed with the view.
  useEffect(() => {
    const el = canvas.current;
    const box = host.current;
    if (!el || !box || !webgl) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas: el, antialias: true, alpha: true });
    } catch {
      return; // Rare after the probe: the panel stays empty, and the plan and diagnostics are unaffected.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.1));
    const sun = new DirectionalLight(0xffffff, 1.9);
    sun.position.set(-0.6, -1, 1.4);
    scene.add(sun);
    const camera = new PerspectiveCamera(30, 1, 0.05, 2000);
    camera.up.set(0, 0, 1); // Floorspec's axes: z up (Core 2.1)
    const controls = new OrbitControls(camera, el);
    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);
    const resize = () => {
      const { width, height } = box.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(box);
    view.current = { renderer, camera, controls, scene, render };
    resize();
    return () => {
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      view.current = null;
    };
  }, [webgl]);

  // The house in the scene, as shown: the cut, and what a selected diagnostic names.
  useEffect(() => {
    const v = view.current;
    if (!v || !house) return;
    const order = levelOrder(document);
    const lit = new Set(highlight);
    const accent = new Color(FLOORSPEC.accent);
    const group = new Group();
    const owned: { dispose(): void }[] = [];
    const edgeMaterial = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.55 });
    owned.push(edgeMaterial);
    for (const part of house.parts) {
      if (!visible(part, cutaway, level, order)) continue;
      const { positions, normals } = flatShaded(part.mesh);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new BufferAttribute(normals, 3));
      const glass = part.kind === 'opening';
      const colour = new Color(COLOURS[part.kind]);
      if (lit.has(part.id)) colour.lerp(accent, 0.75);
      const material = new MeshLambertMaterial({
        color: colour,
        transparent: glass,
        opacity: glass ? 0.45 : 1,
        side: part.closed ? 0 : 2, // FrontSide, or DoubleSide for a one-sided sheet
        polygonOffset: true,
        // A floor over its slab, a ceiling under the floor above: drawn in front of what shares its plane.
        polygonOffsetFactor: part.kind === 'ceiling' ? -2 : part.kind === 'floor' ? -1 : 0,
        polygonOffsetUnits: part.kind === 'ceiling' ? -2 : part.kind === 'floor' ? -1 : 0,
      });
      owned.push(geometry, material);
      group.add(new Mesh(geometry, material));
      if (OUTLINED.has(part.kind)) {
        const edges = new EdgesGeometry(geometry, 25);
        owned.push(edges);
        group.add(new LineSegments(edges, edgeMaterial));
      }
    }
    v.scene.add(group);
    v.render();
    return () => {
      v.scene.remove(group);
      for (const o of owned) o.dispose();
    };
  }, [house, document, level, cutaway, highlight]);

  // Frame the house from the south-west, as the editor's first view does, when it or the cut changes.
  useEffect(() => {
    const v = view.current;
    if (!v || !house) return;
    const bounds = new Box3().setFromObject(v.scene);
    if (bounds.isEmpty()) return;
    const sphere = bounds.getBoundingSphere(new Sphere());
    // From the south-west, a third of the way up, as the editor's first view: the distance at which
    // every corner of the box is inside the field of view, each way.
    const elevation = Math.atan(1 / Math.SQRT2);
    const azimuth = (-135 * Math.PI) / 180;
    const back = new Vector3(Math.cos(azimuth) * Math.cos(elevation), Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation));
    const right = new Vector3().crossVectors(v.camera.up, back).normalize();
    const up = new Vector3().crossVectors(back, right);
    const tanV = Math.tan((v.camera.fov * Math.PI) / 360);
    const tanH = tanV * v.camera.aspect;
    let distance = 0.5;
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const c = new Vector3(x, y, z).sub(sphere.center);
          const depth = c.dot(back);
          distance = Math.max(distance, Math.abs(c.dot(right)) / tanH + depth, Math.abs(c.dot(up)) / tanV + depth);
        }
    distance *= 1.08;
    v.camera.position.copy(sphere.center).addScaledVector(back, distance);
    v.camera.near = Math.max(0.05, distance - sphere.radius * 2);
    v.camera.far = distance + sphere.radius * 4;
    v.camera.updateProjectionMatrix();
    v.controls.target.copy(sphere.center);
    v.controls.update();
    v.render();
  }, [house, level, cutaway]);

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0">
        <canvas ref={canvas} role="img" aria-label={label} className="block h-full w-full touch-none" />
      </div>
      <p role="status" className="pointer-events-none absolute bottom-2 left-3 font-mono text-11 text-fg-faint">
        {status.state === 'meshing' ? 'Meshing…' : status.state === 'ready' ? `${status.parts} parts · meshed in ${status.ms} ms · drag to orbit` : ''}
      </p>
      {status.state === 'error' && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-14 text-fg-muted">{status.message}</p>
      )}
    </div>
  );
}

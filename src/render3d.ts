import * as THREE from "three";
import { CLASSES, RACES } from "./data/codex";
import { PLANE_META } from "./data/story";
import { TILE } from "./engine";
import type { Hero } from "./types";
import type { Ent, PlaneWorld } from "./world";

const WALL_H = 62;
const CAM_OFFSET = new THREE.Vector3(0, 640, 540);

function col(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function darken(hex: string, amt: number): THREE.Color {
  return col(hex).multiplyScalar(amt);
}

// A single character body: a capsule torso and a spherical head, grouped so it
// can be positioned by its feet at y=0.
function buildFigure(bodyColor: string, headColor: string, r: number, emissive = false): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: col(bodyColor) });
  if (emissive) bodyMat.emissive = darken(bodyColor, 0.35);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.52, r * 0.9, 4, 10), bodyMat);
  body.position.y = r * 0.95;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.44, 12, 10),
    new THREE.MeshLambertMaterial({ color: col(headColor) }),
  );
  head.position.y = r * 1.78;
  g.add(body, head);
  return g;
}

export class World3D {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  private hemi: THREE.HemisphereLight;
  private dir: THREE.DirectionalLight;
  private staticCache = new Map<string, THREE.Group>();
  private currentStatic: THREE.Group | null = null;
  private entMeshes = new Map<string, THREE.Object3D>();
  private camTarget = new THREE.Vector3();
  private camReady = false;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement) {
    // No MSAA and a capped internal resolution keep the frame rate high even on
    // machines that fall back to software WebGL (SwiftShader) with no GPU.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 1, 9000);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x2a2622, 0.95);
    this.dir = new THREE.DirectionalLight(0xfff0d2, 0.75);
    this.dir.position.set(0.6, 1, 0.4);
    this.scene.add(this.hemi, this.dir);
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    // Cap the longest edge of the drawing buffer; CSS upscales it to full size.
    const cap = 960;
    const scale = Math.min(1, cap / Math.max(w, h));
    this.renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
  }

  private buildStatic(map: PlaneWorld): THREE.Group {
    const pal = PLANE_META[map.id];
    const group = new THREE.Group();

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(map.w * TILE, map.h * TILE),
      new THREE.MeshLambertMaterial({ color: col(pal.ground) }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((map.w * TILE) / 2, 0, (map.h * TILE) / 2);
    group.add(ground);

    const grid = new THREE.GridHelper(Math.max(map.w, map.h) * TILE, Math.max(map.w, map.h), 0x000000, 0x000000);
    (grid.material as THREE.Material).opacity = 0.08;
    (grid.material as THREE.Material).transparent = true;
    grid.position.set((map.w * TILE) / 2, 0.5, (map.h * TILE) / 2);
    group.add(grid);

    // Count then instance the three tile types that get geometry.
    const counts = { wall: 0, water: 0, lava: 0 };
    for (let i = 0; i < map.tiles.length; i++) {
      const t = map.tiles[i];
      if (t === 1) counts.wall++;
      else if (t === 2) counts.water++;
      else if (t === 3) counts.lava++;
    }

    const wallMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TILE, WALL_H, TILE),
      new THREE.MeshLambertMaterial({ color: col(pal.wall) }),
      Math.max(1, counts.wall),
    );
    const waterMat = new THREE.MeshLambertMaterial({ color: col("#1a3344") });
    waterMat.emissive = col("#0e2230");
    const waterMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 6, TILE), waterMat, Math.max(1, counts.water));
    const lavaMat = new THREE.MeshLambertMaterial({ color: col("#5a2018") });
    lavaMat.emissive = col("#c0401a");
    lavaMat.emissiveIntensity = 0.6;
    const lavaMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 8, TILE), lavaMat, Math.max(1, counts.lava));

    const m = new THREE.Matrix4();
    let wi = 0;
    let ai = 0;
    let li = 0;
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const t = map.tiles[ty * map.w + tx];
        const cx = tx * TILE + TILE / 2;
        const cz = ty * TILE + TILE / 2;
        if (t === 1) {
          m.makeTranslation(cx, WALL_H / 2, cz);
          wallMesh.setMatrixAt(wi++, m);
        } else if (t === 2) {
          m.makeTranslation(cx, 3, cz);
          waterMesh.setMatrixAt(ai++, m);
        } else if (t === 3) {
          m.makeTranslation(cx, 4, cz);
          lavaMesh.setMatrixAt(li++, m);
        }
      }
    }
    wallMesh.count = counts.wall;
    waterMesh.count = counts.water;
    lavaMesh.count = counts.lava;
    wallMesh.instanceMatrix.needsUpdate = true;
    waterMesh.instanceMatrix.needsUpdate = true;
    lavaMesh.instanceMatrix.needsUpdate = true;
    if (counts.wall) group.add(wallMesh);
    if (counts.water) group.add(waterMesh);
    if (counts.lava) group.add(lavaMesh);
    return group;
  }

  setMap(map: PlaneWorld): void {
    // Swapping planes clears per-entity meshes; the new plane repopulates them.
    for (const mesh of this.entMeshes.values()) this.scene.remove(mesh);
    this.entMeshes.clear();
    if (this.currentStatic) this.scene.remove(this.currentStatic);
    let group = this.staticCache.get(map.id);
    if (!group) {
      group = this.buildStatic(map);
      this.staticCache.set(map.id, group);
    }
    this.currentStatic = group;
    this.scene.add(group);
    const pal = PLANE_META[map.id];
    const bg = darken(pal.wall, 0.35);
    this.scene.background = bg;
    this.scene.fog = new THREE.Fog(bg, 1400, 3200);
    this.camReady = false;
  }

  private makeMesh(ent: Ent, hero?: Hero): THREE.Object3D | null {
    if (ent.kind === "player" && hero) {
      const race = RACES.find((r) => r.id === hero.raceId);
      const cls = CLASSES.find((c) => c.id === hero.classId);
      const g = buildFigure(cls?.color ?? "#8aa0b8", race?.colors.skin ?? "#d2a07a", ent.r);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(ent.r * 1.15, 2.2, 8, 24),
        new THREE.MeshBasicMaterial({ color: col("#c6a15b") }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1.5;
      g.add(ring);
      return g;
    }
    if (ent.kind === "npc") return buildFigure(ent.color ?? "#cccccc", "#f0e0c8", ent.r);
    if (ent.kind === "enemy") {
      const scale = ent.def?.boss ? 1.5 : 1;
      const g = buildFigure(ent.color ?? "#833333", darken(ent.color ?? "#833333", 0.6).getStyle(), ent.r * scale, true);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(ent.r * scale * 1.15, 2, 8, 20),
        new THREE.MeshBasicMaterial({ color: col("#8a2432") }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1.5;
      g.add(ring);
      return g;
    }
    if (ent.kind === "portal") {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(ent.r, 5, 10, 28),
        new THREE.MeshBasicMaterial({ color: col(ent.color ?? "#c6a15b") }),
      );
      mesh.position.y = ent.r + 4;
      return mesh;
    }
    if (ent.kind === "shrine") {
      const g = new THREE.Group();
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 8, 26, 8),
        new THREE.MeshLambertMaterial({ color: col("#c6a15b") }),
      );
      pillar.position.y = 13;
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(7, 12, 10),
        new THREE.MeshBasicMaterial({ color: col("#ffe9b0") }),
      );
      orb.position.y = 30;
      g.add(pillar, orb);
      return g;
    }
    if (ent.kind === "chest") {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(22, 16, 16),
        new THREE.MeshLambertMaterial({ color: col("#8a5a22") }),
      );
      mesh.position.y = 8;
      return mesh;
    }
    if (ent.kind === "totem") {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(14, 30, 14),
        new THREE.MeshLambertMaterial({ color: col("#6d8a4a") }),
      );
      mesh.position.y = 15;
      return mesh;
    }
    if (ent.kind === "loot") {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(8),
        new THREE.MeshBasicMaterial({ color: col(ent.color ?? "#c6a15b") }),
      );
      mesh.position.y = 12;
      return mesh;
    }
    if (ent.kind === "proj") {
      return new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(3, ent.r), 8, 8),
        new THREE.MeshBasicMaterial({ color: col(ent.color ?? "#ffffff") }),
      );
    }
    return null;
  }

  // Reconcile entity meshes with the live entity list and drive the camera.
  sync(ents: Ent[], hero: Hero, time: number, shake: number): void {
    const live = new Set<string>();
    for (const ent of ents) {
      const isPlayer = ent.kind === "player";
      const x = isPlayer ? hero.x : ent.x;
      const y = isPlayer ? hero.y : ent.y;
      live.add(ent.id);
      let mesh = this.entMeshes.get(ent.id);
      if (!mesh) {
        const made = this.makeMesh(ent, hero);
        if (!made) continue;
        mesh = made;
        this.entMeshes.set(ent.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(x, ent.kind === "proj" ? 22 : 0, y);
      if (ent.kind === "portal") {
        mesh.rotation.y = time * 1.2;
        mesh.position.y = ent.r + 4 + Math.sin(time * 3) * 3;
      } else if (ent.kind === "loot") {
        mesh.rotation.y = time * 2;
        mesh.position.y = 12 + Math.sin(time * 5) * 3;
      } else if (isPlayer) {
        mesh.rotation.y = -hero.facing + Math.PI / 2;
      }
    }
    for (const [id, mesh] of this.entMeshes) {
      if (!live.has(id)) {
        this.scene.remove(mesh);
        this.entMeshes.delete(id);
      }
    }

    // Follow camera: ease toward the hero, then sit at a fixed angled offset.
    if (!this.camReady) {
      this.camTarget.set(hero.x, 0, hero.y);
      this.camReady = true;
    } else {
      this.camTarget.lerp(this.tmp.set(hero.x, 0, hero.y), 0.12);
    }
    const jx = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    const jz = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    this.camera.position.set(
      this.camTarget.x + CAM_OFFSET.x + jx,
      CAM_OFFSET.y,
      this.camTarget.z + CAM_OFFSET.z + jz,
    );
    this.camera.lookAt(this.camTarget.x, 0, this.camTarget.z);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  // Convert a canvas-pixel cursor position to a point on the ground plane,
  // returned in the game's world (x, y) coordinate space.
  screenToGround(px: number, py: number, canvasW: number, canvasH: number): { x: number; y: number } | null {
    this.tmp2.set((px / canvasW) * 2 - 1, -((py / canvasH) * 2 - 1));
    this.raycaster.setFromCamera(this.tmp2, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmp);
    if (!hit) return null;
    return { x: hit.x, y: hit.z };
  }

  // Project a world (x, y) ground point to overlay-canvas pixels for labels.
  worldToScreen(x: number, y: number, cssW: number, cssH: number, height = 30): { x: number; y: number; visible: boolean } {
    this.tmp.set(x, height, y).project(this.camera);
    return {
      x: (this.tmp.x * 0.5 + 0.5) * cssW,
      y: (-this.tmp.y * 0.5 + 0.5) * cssH,
      visible: this.tmp.z < 1,
    };
  }
}

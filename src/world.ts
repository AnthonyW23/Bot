import { enemiesFor } from "./data/bestiary";
import { NPCS, PLANE_META } from "./data/story";
import { RNG, TILE } from "./engine";
import type { EnemyDef, Landmark, NpcDef, PlaneId, Tile } from "./types";

export interface Ent {
  id: string;
  kind: "player" | "npc" | "enemy" | "loot" | "portal" | "chest" | "shrine" | "proj" | "prop" | "totem";
  x: number;
  y: number;
  r: number;
  hp?: number;
  maxHp?: number;
  def?: EnemyDef;
  npc?: NpcDef;
  vx?: number;
  vy?: number;
  life?: number;
  color?: string;
  plane?: PlaneId;
  name?: string;
  hurt?: number;
  atkCd?: number;
  ai?: number;
  marked?: boolean;
  hexed?: boolean;
  stunned?: number;
  dropId?: string;
  unique?: boolean;
}

export interface PlaneWorld {
  id: PlaneId;
  w: number;
  h: number;
  tiles: Uint8Array;
  spawn: { x: number; y: number };
  landmarks: Landmark[];
  home?: { x: number; y: number };
}

export function idx(w: number, x: number, y: number): number {
  return y * w + x;
}

export function inBounds(m: PlaneWorld, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < m.w && ty < m.h;
}

export function tileAt(m: PlaneWorld, px: number, py: number): Tile {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (!inBounds(m, tx, ty)) return 1;
  return m.tiles[idx(m.w, tx, ty)] as Tile;
}

export function blocked(m: PlaneWorld, px: number, py: number, r: number): boolean {
  const pts = [
    [px - r, py],
    [px + r, py],
    [px, py - r],
    [px, py + r],
    [px - r * 0.7, py - r * 0.7],
    [px + r * 0.7, py + r * 0.7],
  ];
  return pts.some(([x, y]) => {
    const t = tileAt(m, x, y);
    return t === 1;
  });
}

function fill(m: PlaneWorld, t: Tile): void {
  m.tiles.fill(t);
}

function rect(m: PlaneWorld, x: number, y: number, w: number, h: number, t: Tile): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (inBounds(m, i, j)) m.tiles[idx(m.w, i, j)] = t;
    }
  }
}

function circle(m: PlaneWorld, cx: number, cy: number, r: number, t: Tile): void {
  for (let j = cy - r; j <= cy + r; j++) {
    for (let i = cx - r; i <= cx + r; i++) {
      if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r && inBounds(m, i, j)) {
        m.tiles[idx(m.w, i, j)] = t;
      }
    }
  }
}

function path(m: PlaneWorld, x0: number, y0: number, x1: number, y1: number, t: Tile = 0): void {
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    if (inBounds(m, x, y)) {
      m.tiles[idx(m.w, x, y)] = t;
      if (inBounds(m, x + 1, y)) m.tiles[idx(m.w, x + 1, y)] = t;
    }
    if (Math.abs(x1 - x) > Math.abs(y1 - y)) x += Math.sign(x1 - x);
    else y += Math.sign(y1 - y);
  }
}

function building(m: PlaneWorld, x: number, y: number, w: number, h: number, door: "n" | "s" | "e" | "w"): void {
  rect(m, x, y, w, h, 1);
  rect(m, x + 1, y + 1, w - 2, h - 2, 0);
  const mx = x + Math.floor(w / 2);
  const my = y + Math.floor(h / 2);
  if (door === "s") {
    m.tiles[idx(m.w, mx, y + h - 1)] = 0;
    m.tiles[idx(m.w, mx - 1, y + h - 1)] = 0;
  }
  if (door === "n") {
    m.tiles[idx(m.w, mx, y)] = 0;
    m.tiles[idx(m.w, mx - 1, y)] = 0;
  }
  if (door === "e") {
    m.tiles[idx(m.w, x + w - 1, my)] = 0;
    m.tiles[idx(m.w, x + w - 1, my - 1)] = 0;
  }
  if (door === "w") {
    m.tiles[idx(m.w, x, my)] = 0;
    m.tiles[idx(m.w, x, my - 1)] = 0;
  }
}

export function generatePlane(id: PlaneId, seed: number): PlaneWorld {
  const rng = new RNG(seed + id.length * 997);
  // The Material Plane is the demo village: a compact map keeps the 3D scene
  // small and fast. Other planes stay large.
  const w = id === "material" ? 40 : 96;
  const h = id === "material" ? 40 : 96;
  const m: PlaneWorld = {
    id,
    w,
    h,
    tiles: new Uint8Array(w * h),
    spawn: { x: 24.5 * TILE, y: 48.8 * TILE },
    landmarks: [],
  };
  fill(m, 0);
  if (id === "material") genMaterial(m, rng);
  if (id === "feywild") genFey(m, rng);
  if (id === "shadowfell") genShadow(m, rng);
  if (id === "hells") genHells(m, rng);
  if (id === "abyss") genAbyss(m, rng);
  for (let i = 0; i < w; i++) {
    m.tiles[idx(w, i, 0)] = 1;
    m.tiles[idx(w, i, h - 1)] = 1;
    m.tiles[idx(w, 0, i)] = 1;
    m.tiles[idx(w, w - 1, i)] = 1;
  }
  return m;
}

function scatterTrees(m: PlaneWorld, rng: RNG, dens: number, t: Tile = 1): void {
  for (let y = 2; y < m.h - 2; y++) {
    for (let x = 2; x < m.w - 2; x++) {
      if (rng.next() < dens) m.tiles[idx(m.w, x, y)] = t;
    }
  }
}

function genMaterial(m: PlaneWorld, rng: RNG): void {
  // Compact 40x40 village of Ashenford. Central square, a cluster of cottages,
  // paths out to four planar doors, a shrine, a chest, and a bandit corner.
  scatterTrees(m, rng, 0.06);
  // Clear a generous walkable heart so the village never boxes the player in.
  rect(m, 8, 8, 24, 24, 0);
  // Central square + connecting lanes.
  rect(m, 16, 18, 10, 8, 0);
  path(m, 20, 22, 34, 22); // east lane to the Gate
  path(m, 20, 22, 20, 6); // north lane to the standing stones
  path(m, 20, 22, 20, 35); // south lane to the well
  path(m, 20, 22, 7, 32); // southwest lane to the infernal circle
  path(m, 20, 22, 7, 10); // northwest lane to the chapel crater
  // Cottages around the square (walls with a doorway).
  building(m, 14, 15, 4, 4, "s");
  building(m, 22, 14, 4, 4, "s");
  building(m, 26, 20, 4, 4, "w");
  building(m, 14, 27, 4, 4, "n");
  building(m, 24, 27, 4, 4, "n");
  // The First Gate courtyard to the east.
  circle(m, 34, 22, 3, 0);
  // Planar door clearings.
  circle(m, 20, 6, 3, 0);
  circle(m, 20, 35, 3, 0);
  circle(m, 7, 32, 3, 0);
  circle(m, 7, 10, 3, 3);
  circle(m, 7, 10, 2, 0);
  // Bandit corner.
  circle(m, 32, 33, 3, 0);
  m.spawn = { x: 20 * TILE, y: 24 * TILE };
  m.home = { x: 20 * TILE, y: 24 * TILE };
  m.landmarks = [
    { id: "inn", name: "The Cracked Stein", x: 20, y: 20, kind: "building" },
    { id: "gate", name: "The First Gate", x: 34, y: 22, kind: "quest" },
    { id: "stones", name: "Standing Stones", x: 20, y: 6, kind: "portal", plane: "feywild" },
    { id: "well", name: "Well of Silence", x: 20, y: 35, kind: "portal", plane: "shadowfell" },
    { id: "circle", name: "Infernal Circle", x: 7, y: 32, kind: "portal", plane: "hells" },
    { id: "crater", name: "Chapel Crater", x: 7, y: 10, kind: "portal", plane: "abyss" },
    { id: "shrine_m", name: "Ashenford Shrine", x: 23, y: 25, kind: "shrine" },
    { id: "camp", name: "Bandit Camp", x: 32, y: 33, kind: "quest" },
    { id: "chest_m", name: "Waycache", x: 17, y: 24, kind: "chest" },
  ];
}

function genFey(m: PlaneWorld, rng: RNG): void {
  scatterTrees(m, rng, 0.22);
  for (let i = 0; i < 18; i++) circle(m, rng.int(8, 88), rng.int(8, 88), rng.int(2, 5), 0);
  circle(m, 22, 70, 5, 0);
  circle(m, 48, 28, 7, 0);
  path(m, 22, 70, 48, 28);
  m.spawn = { x: 22 * TILE, y: 70 * TILE };
  m.home = { x: 22 * TILE, y: 70 * TILE };
  m.landmarks = [
    { id: "fey_home", name: "Moon Gate", x: 22, y: 70, kind: "portal", plane: "material" },
    { id: "thicket", name: "Gilded Heart", x: 48, y: 28, kind: "quest" },
    { id: "shrine_f", name: "Fey Shrine", x: 24, y: 68, kind: "shrine" },
    { id: "chest_f", name: "Dewcache", x: 36, y: 50, kind: "chest" },
  ];
}

function genShadow(m: PlaneWorld, rng: RNG): void {
  fill(m, 1);
  for (let i = 0; i < 30; i++) circle(m, rng.int(6, 90), rng.int(6, 90), rng.int(3, 8), 0);
  rect(m, 20, 60, 10, 10, 0);
  path(m, 24, 64, 58, 30);
  rect(m, 54, 26, 10, 10, 1);
  rect(m, 56, 28, 6, 6, 0);
  m.tiles[idx(m.w, 58, 35)] = 0;
  m.spawn = { x: 24 * TILE, y: 64 * TILE };
  m.home = { x: 24 * TILE, y: 64 * TILE };
  m.landmarks = [
    { id: "sh_home", name: "Silent Gate", x: 24, y: 64, kind: "portal", plane: "material" },
    { id: "keep", name: "Ashen Keep", x: 58, y: 30, kind: "quest" },
    { id: "shrine_s", name: "Gray Shrine", x: 22, y: 62, kind: "shrine" },
    { id: "chest_s", name: "Ossuary", x: 40, y: 48, kind: "chest" },
  ];
}

function genHells(m: PlaneWorld, rng: RNG): void {
  fill(m, 0);
  for (let i = 0; i < 40; i++) circle(m, rng.int(4, 92), rng.int(4, 92), rng.int(1, 3), 3);
  for (let i = 0; i < 20; i++) rect(m, rng.int(4, 80), rng.int(4, 80), rng.int(3, 8), 1, 1);
  rect(m, 18, 64, 12, 10, 0);
  path(m, 24, 68, 64, 24);
  circle(m, 66, 22, 6, 0);
  m.spawn = { x: 22 * TILE, y: 68 * TILE };
  m.home = { x: 22 * TILE, y: 68 * TILE };
  m.landmarks = [
    { id: "h_home", name: "Contract Circle", x: 22, y: 68, kind: "portal", plane: "material" },
    { id: "spire", name: "Brass Spire", x: 66, y: 22, kind: "quest" },
    { id: "shrine_h", name: "Brimstone Shrine", x: 20, y: 66, kind: "shrine" },
    { id: "chest_h", name: "War-chest", x: 40, y: 44, kind: "chest" },
    { id: "slag", name: "Slag Fields", x: 34, y: 40, kind: "quest" },
  ];
}

function genAbyss(m: PlaneWorld, rng: RNG): void {
  scatterTrees(m, rng, 0.08, 1);
  for (let i = 0; i < 25; i++) circle(m, rng.int(6, 90), rng.int(6, 90), rng.int(2, 6), 2);
  circle(m, 20, 72, 6, 0);
  circle(m, 60, 30, 8, 0);
  path(m, 20, 72, 60, 30);
  m.spawn = { x: 20 * TILE, y: 72 * TILE };
  m.home = { x: 20 * TILE, y: 72 * TILE };
  m.landmarks = [
    { id: "a_home", name: "Fen Gate", x: 20, y: 72, kind: "portal", plane: "material" },
    { id: "fen", name: "Screaming Heart", x: 60, y: 30, kind: "quest" },
    { id: "shrine_a", name: "Fen Shrine", x: 18, y: 70, kind: "shrine" },
    { id: "teeth", name: "Teeth-Stones", x: 42, y: 52, kind: "quest" },
    { id: "chest_a", name: "Ichor Cache", x: 30, y: 58, kind: "chest" },
  ];
}

export function spawnEntities(map: PlaneWorld, seed: number, killed: Set<string>, looted: Set<string>): Ent[] {
  const rng = new RNG(seed + 17);
  const ents: Ent[] = [];
  for (const npc of NPCS.filter((n) => n.plane === map.id)) {
    ents.push({
      id: npc.id,
      kind: "npc",
      x: npc.x * TILE,
      y: npc.y * TILE,
      r: 14,
      npc,
      color: npc.color,
      name: npc.name,
    });
  }
  for (const lm of map.landmarks) {
    const px = lm.x * TILE;
    const py = lm.y * TILE;
    if (lm.kind === "portal") {
      ents.push({ id: lm.id, kind: "portal", x: px, y: py, r: 22, plane: lm.plane, name: lm.name, color: PLANE_META[lm.plane ?? "material"].accent });
    }
    if (lm.kind === "shrine") {
      ents.push({ id: lm.id, kind: "shrine", x: px, y: py, r: 16, name: lm.name, color: "#c6a15b" });
    }
    if (lm.kind === "chest" && !looted.has(lm.id)) {
      ents.push({ id: lm.id, kind: "chest", x: px, y: py, r: 14, name: lm.name, color: "#b9893a" });
    }
  }
  if (map.id === "abyss" && !looted.has("totem")) {
    ents.push({ id: "totem", kind: "totem", x: 42 * TILE, y: 52 * TILE, r: 16, name: "Whispering Knight", color: "#6d8a4a" });
  }
  const fodder = enemiesFor(map.id, false);
  if (map.id === "material") {
    const wolf = fodder.find((e) => e.id === "wolf") ?? fodder[0]!;
    const pup = { ...wolf, hp: 26, damage: 5, speed: 78, name: "Thornwolf" };
    const spots = [
      [26, 22],
      [28, 24],
    ];
    spots.forEach(([tx, ty], i) => {
      const id = `intro_wolf_${i}`;
      if (!killed.has(id)) ents.push(enemyEnt(id, pup, tx * TILE, ty * TILE));
    });
  }
  const count = map.id === "material" ? 12 : 22;
  for (let i = 0; i < count; i++) {
    const id = `${map.id}_m_${i}`;
    if (killed.has(id)) continue;
    const def = rng.pick(fodder);
    let x = 0;
    let y = 0;
    for (let t = 0; t < 20; t++) {
      x = rng.float(3, map.w - 3) * TILE;
      y = rng.float(3, map.h - 3) * TILE;
      if (!blocked(map, x, y, 12) && Math.hypot(x - map.spawn.x, y - map.spawn.y) > 180) break;
    }
    ents.push(enemyEnt(id, def, x, y));
  }
  const bosses = enemiesFor(map.id, true).filter((e) => e.id !== "amalgam");
  for (const def of bosses) {
    const id = `boss_${def.id}`;
    if (killed.has(id)) continue;
    const spot = map.landmarks.find((l) => l.kind === "quest") ?? map.landmarks[1]!;
    ents.push(enemyEnt(id, def, spot.x * TILE, spot.y * TILE, true));
  }
  if (map.id === "material") {
    const bid = "bandit_leader";
    if (!killed.has(bid)) {
      const d = { ...enemiesFor("material", false)[1]!, id: "bandit_leader", name: "Red-Scarf Captain", hp: 90, damage: 12, xp: 70, boss: true };
      ents.push(enemyEnt(bid, d, 32 * TILE, 33 * TILE, true));
    }
    const hid = "blink_cross";
    if (!killed.has(hid)) {
      const d = enemiesFor("feywild", false).find((e) => e.id === "blinkdog")!;
      ents.push(enemyEnt(hid, { ...d, name: "Crossed Blink Hound" }, 20 * TILE, 9 * TILE));
    }
  }
  return ents;
}

function enemyEnt(id: string, def: EnemyDef, x: number, y: number, unique = false): Ent {
  return {
    id,
    kind: "enemy",
    x,
    y,
    r: def.boss ? 20 : 13,
    hp: def.hp,
    maxHp: def.hp,
    def,
    color: def.color,
    name: def.name,
    atkCd: 0,
    ai: 0,
    unique,
  };
}

export function tryMove(m: PlaneWorld, e: Ent, dx: number, dy: number): void {
  const nx = e.x + dx;
  if (!blocked(m, nx, e.y, e.r * 0.85)) e.x = nx;
  const ny = e.y + dy;
  if (!blocked(m, e.x, ny, e.r * 0.85)) e.y = ny;
}

export { PLANE_META, TILE };

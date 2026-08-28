import { CLASSES, RACES } from "./data/codex";
import { PLANE_META } from "./data/story";
import { TILE } from "./engine";
import type { Hero, PlaneId } from "./types";
import type { Ent, PlaneWorld } from "./world";
import type { Particle } from "./engine";

export function resize(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  map: PlaneWorld,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  t: number,
): void {
  const pal = PLANE_META[map.id];
  ctx.fillStyle = pal.ground;
  ctx.fillRect(camX, camY, vw, vh);
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const x1 = Math.min(map.w, Math.ceil((camX + vw) / TILE) + 1);
  const y1 = Math.min(map.h, Math.ceil((camY + vh) / TILE) + 1);
  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const tile = map.tiles[ty * map.w + tx]!;
      const x = tx * TILE;
      const y = ty * TILE;
      if (tile === 0) {
        ctx.fillStyle = shade(pal.ground, hash2(tx, ty) * 0.08);
        ctx.fillRect(x, y, TILE + 1, TILE + 1);
        if (hash2(tx, ty) > 0.86) {
          ctx.fillStyle = pal.accent + "55";
          ctx.fillRect(x + 10, y + 12, 4, 4);
        }
      } else if (tile === 1) {
        ctx.fillStyle = pal.wall;
        ctx.fillRect(x, y, TILE + 1, TILE + 1);
        ctx.fillStyle = shade(pal.wall, 0.12);
        ctx.fillRect(x + 6, y + 4, TILE - 12, TILE - 10);
      } else if (tile === 2) {
        ctx.fillStyle = map.id === "abyss" ? "#1c2430" : "#1a3344";
        ctx.fillRect(x, y, TILE + 1, TILE + 1);
        ctx.fillStyle = `rgba(80,140,180,${0.25 + Math.sin(t * 2 + tx) * 0.1})`;
        ctx.fillRect(x, y, TILE, TILE);
      } else if (tile === 3) {
        ctx.fillStyle = "#5a2018";
        ctx.fillRect(x, y, TILE + 1, TILE + 1);
        ctx.fillStyle = `rgba(220,80,30,${0.35 + Math.sin(t * 3 + ty) * 0.15})`;
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      }
    }
  }
}

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * (1 + amt)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * (1 + amt)));
  const b = Math.max(0, Math.min(255, (n & 255) * (1 + amt)));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function drawEnt(ctx: CanvasRenderingContext2D, e: Ent, time: number, hero?: Hero): void {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, e.r * 0.7, e.r * 0.9, e.r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  if (e.kind === "portal") {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
    g.addColorStop(0, "#fff6");
    g.addColorStop(0.4, e.color ?? "#c6a15b");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (e.kind === "shrine") {
    ctx.fillStyle = "#c6a15b";
    ctx.fillRect(-6, -18, 12, 24);
    ctx.beginPath();
    ctx.arc(0, -22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (e.kind === "chest") {
    ctx.fillStyle = "#8a5a22";
    ctx.fillRect(-10, -8, 20, 14);
    ctx.fillStyle = "#c6a15b";
    ctx.fillRect(-2, -8, 4, 8);
    ctx.restore();
    return;
  }
  if (e.kind === "totem") {
    ctx.fillStyle = "#6d8a4a";
    ctx.fillRect(-7, -16, 14, 22);
    ctx.fillStyle = "#3d1a44";
    ctx.fillRect(-4, -12, 8, 6);
    ctx.restore();
    return;
  }
  if (e.kind === "loot") {
    ctx.fillStyle = e.color ?? "#c6a15b";
    ctx.beginPath();
    ctx.arc(0, 0, 6 + Math.sin(time * 6) * 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (e.kind === "proj") {
    ctx.fillStyle = e.color ?? "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(time * 8 + e.x) * (e.kind === "player" ? 1.2 : 0.6);
  ctx.translate(0, bob);
  if (e.hurt && e.hurt > 0) ctx.globalAlpha = 0.55 + Math.sin(time * 40) * 0.25;
  if (e.kind === "player" && hero) drawHero(ctx, hero);
  else if (e.kind === "npc") drawFigure(ctx, e.color ?? "#ccc", 0.9, false);
  else drawFigure(ctx, e.color ?? "#833", e.def?.boss ? 1.35 : 1, true);
  ctx.restore();
  if (e.kind === "enemy" && e.hp && e.maxHp && e.hp < e.maxHp) {
    ctx.fillStyle = "#000";
    ctx.fillRect(e.x - 14, e.y - 28, 28, 4);
    ctx.fillStyle = "#a33b3b";
    ctx.fillRect(e.x - 14, e.y - 28, 28 * (e.hp / e.maxHp), 4);
  }
  if (e.kind === "npc" && e.name) {
    ctx.fillStyle = "#e8dcc4";
    ctx.font = "12px Cinzel, serif";
    ctx.textAlign = "center";
    ctx.fillText(e.name, e.x, e.y - 28);
  }
}

function drawHero(ctx: CanvasRenderingContext2D, hero: Hero): void {
  const race = RACES.find((r) => r.id === hero.raceId)!;
  const cls = CLASSES.find((c) => c.id === hero.classId)!;
  drawFigure(ctx, race.colors.skin, 1, false, race.colors.hair, race.id, cls.color);
}

function drawFigure(
  ctx: CanvasRenderingContext2D,
  skin: string,
  scale: number,
  monster: boolean,
  hair?: string,
  race?: string,
  accent?: string,
): void {
  ctx.scale(scale, scale);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -10, 7, 0, Math.PI * 2);
  ctx.fill();
  if (hair) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(-1, -13, 7, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  if (race === "tiefling") {
    ctx.strokeStyle = skin;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -16);
    ctx.lineTo(-7, -24);
    ctx.moveTo(4, -16);
    ctx.lineTo(7, -24);
    ctx.stroke();
  }
  if (race === "elf" || race === "halfelf") {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.lineTo(-13, -14);
    ctx.lineTo(-6, -8);
    ctx.moveTo(7, -10);
    ctx.lineTo(13, -14);
    ctx.lineTo(6, -8);
    ctx.fill();
  }
  if (race === "dwarf" && hair) {
    ctx.fillStyle = hair;
    ctx.fillRect(-6, -6, 12, 8);
  }
  if (race === "dragonborn") {
    ctx.fillStyle = accent ?? skin;
    ctx.fillRect(-3, -8, 6, 4);
  }
  if (monster) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(-3, -11, 1.4, 0, Math.PI * 2);
    ctx.arc(3, -11, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (accent) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(16, -8);
    ctx.stroke();
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, parts: Particle[]): void {
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

export function drawMinimap(c: HTMLCanvasElement, map: PlaneWorld, ents: Ent[], px: number, py: number): void {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0b0709";
  ctx.fillRect(0, 0, c.width, c.height);
  const sx = c.width / (map.w * TILE);
  const sy = c.height / (map.h * TILE);
  ctx.fillStyle = PLANE_META[map.id].ground;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = PLANE_META[map.id].wall;
  for (let y = 0; y < map.h; y += 2) {
    for (let x = 0; x < map.w; x += 2) {
      if (map.tiles[y * map.w + x] === 1) ctx.fillRect(x * TILE * sx, y * TILE * sy, 2, 2);
    }
  }
  for (const e of ents) {
    if (e.kind === "portal") ctx.fillStyle = "#62b0ff";
    else if (e.kind === "npc") ctx.fillStyle = "#e8dcc4";
    else if (e.kind === "enemy" && e.def?.boss) ctx.fillStyle = "#ff6b81";
    else continue;
    ctx.fillRect(e.x * sx - 1, e.y * sy - 1, 3, 3);
  }
  ctx.fillStyle = "#c6a15b";
  ctx.fillRect(px * sx - 2, py * sy - 2, 4, 4);
}

export function drawBigMap(c: HTMLCanvasElement, map: PlaneWorld, px: number, py: number, plane: PlaneId): void {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#140c10";
  ctx.fillRect(0, 0, c.width, c.height);
  const sx = c.width / (map.w * TILE);
  const sy = c.height / (map.h * TILE);
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const t = map.tiles[y * map.w + x]!;
      ctx.fillStyle = t === 1 ? PLANE_META[plane].wall : t === 3 ? "#a33b3b" : t === 2 ? "#1a3344" : PLANE_META[plane].ground;
      ctx.fillRect(x * TILE * sx, y * TILE * sy, TILE * sx + 0.5, TILE * sy + 0.5);
    }
  }
  ctx.fillStyle = "#c6a15b";
  ctx.beginPath();
  ctx.arc(px * sx, py * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8dcc4";
  ctx.font = "14px Cinzel, serif";
  ctx.fillText(PLANE_META[plane].name, 16, 22);
}

export function drawPortrait(c: HTMLCanvasElement, hero: Hero): void {
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#0b0709";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.translate(c.width / 2, c.height * 0.62);
  ctx.scale(c.width / 70, c.width / 70);
  drawHero(ctx, hero);
  ctx.restore();
}

import type { Vec2 } from "./types";

export const TILE = 48;

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function ang(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function len(x: number, y: number): number {
  return Math.hypot(x, y) || 1;
}

export function xpToLevel(level: number): number {
  return Math.floor(90 * Math.pow(level, 1.42));
}

export function xpToSkill(level: number): number {
  return Math.floor(40 * Math.pow(level, 1.35));
}

export function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export class RNG {
  private s: number;
  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }
  next(): number {
    this.s = (Math.imul(1664525, this.s) + 1013904223) >>> 0;
    return this.s / 4294967296;
  }
  float(a = 0, b = 1): number {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)]!;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  shuffle<T>(arr: T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }
}

export class Input {
  keys = new Set<string>();
  pressed = new Set<string>();
  mouse = { x: 0, y: 0, down: false, right: false, clicked: false, rclicked: false };

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    });
    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    canvas.addEventListener("mousedown", (e) => {
      canvas.focus();
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
      }
      if (e.button === 2) {
        this.mouse.right = true;
        this.mouse.rclicked = true;
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  just(k: string): boolean {
    return this.pressed.has(k);
  }

  endFrame(): void {
    this.pressed.clear();
    this.mouse.clicked = false;
    this.mouse.rclicked = false;
  }
}

export class Camera {
  x = 0;
  y = 0;
  shake = 0;
  follow(tx: number, ty: number, w: number, h: number, dt: number): void {
    this.x = lerp(this.x, tx - w / 2, 1 - Math.pow(0.0008, dt));
    this.y = lerp(this.y, ty - h / 2, 1 - Math.pow(0.0008, dt));
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 18);
  }
  world(mx: number, my: number): Vec2 {
    const jx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const jy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    return { x: mx + this.x + jx, y: my + this.y + jy };
  }
  apply(ctx: CanvasRenderingContext2D): void {
    const jx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const jy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    ctx.translate(-this.x + jx, -this.y + jy);
  }
}

export class AudioBus {
  ctx: AudioContext | null = null;
  muted = false;
  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }
  tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.04): void {
    const c = this.ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }
  hit(): void {
    this.tone(140, 0.08, "sawtooth", 0.05);
  }
  swing(): void {
    this.tone(220, 0.05, "triangle", 0.03);
  }
  pickup(): void {
    this.tone(520, 0.1, "square", 0.04);
    this.tone(780, 0.12, "square", 0.03);
  }
  level(): void {
    this.tone(330, 0.12, "square", 0.05);
    this.tone(440, 0.16, "square", 0.05);
    this.tone(660, 0.2, "square", 0.04);
  }
  portal(): void {
    this.tone(90, 0.4, "sine", 0.06);
    this.tone(180, 0.35, "triangle", 0.04);
  }
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export function burst(parts: Particle[], x: number, y: number, color: string, n = 10): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 140;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.4,
      max: 0.7,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

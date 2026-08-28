import type { EnemyDef, PlaneId } from "../types";

export const ENEMIES: EnemyDef[] = [
  { id: "wolf", name: "Thornwolf", plane: "material", hp: 38, speed: 95, damage: 7, range: 28, aggro: 220, xp: 18, color: "#6b5a4a", tags: ["beast"] },
  { id: "bandit", name: "Ashenford Cutpurse", plane: "material", hp: 46, speed: 78, damage: 8, range: 32, aggro: 200, xp: 22, color: "#5c4638", tags: ["humanoid"] },
  { id: "skeleton", name: "Gate Wight", plane: "material", hp: 52, speed: 62, damage: 9, range: 30, aggro: 240, xp: 26, color: "#cfc6b0", tags: ["undead"] },
  { id: "wraith", name: "Warden-Wraith", plane: "material", hp: 220, speed: 70, damage: 14, range: 46, aggro: 340, xp: 160, color: "#9aa7c4", tags: ["undead", "planar"], boss: true, shard: "material" },
  { id: "sprite", name: "Spite Sprite", plane: "feywild", hp: 28, speed: 120, damage: 6, range: 26, aggro: 210, xp: 16, color: "#7ec8a3", tags: ["fey"] },
  { id: "blinkdog", name: "Blink Hound", plane: "feywild", hp: 44, speed: 130, damage: 8, range: 28, aggro: 240, xp: 24, color: "#d4b46a", tags: ["fey", "beast"] },
  { id: "dryad", name: "Thorned Dryad", plane: "feywild", hp: 70, speed: 70, damage: 10, range: 160, aggro: 260, xp: 32, color: "#3d6b4a", tags: ["fey"] },
  { id: "hag", name: "Gilt-Tooth Hag", plane: "feywild", hp: 260, speed: 68, damage: 15, range: 70, aggro: 360, xp: 180, color: "#8a6d34", tags: ["fey"], boss: true, shard: "feywild" },
  { id: "shadow", name: "Hungering Shadow", plane: "shadowfell", hp: 36, speed: 88, damage: 8, range: 26, aggro: 230, xp: 20, color: "#2a3344", tags: ["undead"] },
  { id: "wight", name: "Gray March Wight", plane: "shadowfell", hp: 64, speed: 64, damage: 11, range: 32, aggro: 250, xp: 30, color: "#6b7380", tags: ["undead"] },
  { id: "sorrow", name: "Sorrowsworn", plane: "shadowfell", hp: 90, speed: 80, damage: 13, range: 36, aggro: 280, xp: 44, color: "#3d4a5c", tags: ["undead", "planar"] },
  { id: "deathknight", name: "Ashen Castellan", plane: "shadowfell", hp: 300, speed: 60, damage: 16, range: 48, aggro: 380, xp: 200, color: "#1c2430", tags: ["undead"], boss: true, shard: "shadowfell" },
  { id: "imp", name: "Avernus Imp", plane: "hells", hp: 32, speed: 110, damage: 7, range: 150, aggro: 220, xp: 18, color: "#c45c3a", tags: ["fiend"] },
  { id: "bearded", name: "Bearded Devil", plane: "hells", hp: 80, speed: 72, damage: 13, range: 36, aggro: 250, xp: 36, color: "#8b1e1e", tags: ["fiend"] },
  { id: "bone", name: "Bone Devil", plane: "hells", hp: 110, speed: 78, damage: 14, range: 40, aggro: 270, xp: 50, color: "#d8c8a0", tags: ["fiend"] },
  { id: "erinyes", name: "Contract Erinyes", plane: "hells", hp: 320, speed: 90, damage: 17, range: 200, aggro: 400, xp: 220, color: "#7a1f2b", tags: ["fiend"], boss: true, shard: "hells" },
  { id: "dretch", name: "Dretch", plane: "abyss", hp: 34, speed: 70, damage: 8, range: 26, aggro: 200, xp: 16, color: "#6d8a4a", tags: ["fiend"] },
  { id: "vrock", name: "Vrock", plane: "abyss", hp: 96, speed: 100, damage: 14, range: 38, aggro: 280, xp: 48, color: "#5a3d6b", tags: ["fiend"] },
  { id: "hezrou", name: "Hezrou", plane: "abyss", hp: 140, speed: 62, damage: 16, range: 40, aggro: 260, xp: 58, color: "#4a5c2a", tags: ["fiend"] },
  { id: "fragment", name: "Abyssal Fragment", plane: "abyss", hp: 360, speed: 75, damage: 18, range: 56, aggro: 420, xp: 240, color: "#3d1a44", tags: ["fiend", "planar"], boss: true, shard: "abyss" },
  { id: "amalgam", name: "The Unsealed", plane: "material", hp: 520, speed: 85, damage: 20, range: 70, aggro: 500, xp: 400, color: "#c6a15b", tags: ["planar"], boss: true },
];

export function enemiesFor(plane: PlaneId, bosses = false): EnemyDef[] {
  return ENEMIES.filter((e) => (e.plane === plane || e.plane === "any") && !!e.boss === bosses);
}

export function enemyById(id: string): EnemyDef {
  return ENEMIES.find((e) => e.id === id) ?? ENEMIES[0]!;
}

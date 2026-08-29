import type { Item, ItemAffix, Rarity, Slot, WeaponStyle } from "../types";
import { RNG } from "../engine";

export interface ItemBase {
  id: string;
  name: string;
  slot: Slot;
  style?: WeaponStyle;
  damage?: number;
  armor?: number;
}

export const BASES: ItemBase[] = [
  { id: "dagger", name: "Dagger", slot: "mainhand", style: "melee", damage: 7 },
  { id: "rapier", name: "Rapier", slot: "mainhand", style: "melee", damage: 9 },
  { id: "longsword", name: "Longsword", slot: "mainhand", style: "melee", damage: 11 },
  { id: "greataxe", name: "Greataxe", slot: "mainhand", style: "melee", damage: 14 },
  { id: "mace", name: "Mace", slot: "mainhand", style: "melee", damage: 10 },
  { id: "spear", name: "Spear", slot: "mainhand", style: "melee", damage: 10 },
  { id: "warhammer", name: "Warhammer", slot: "mainhand", style: "melee", damage: 13 },
  { id: "longbow", name: "Longbow", slot: "mainhand", style: "ranged", damage: 10 },
  { id: "shortbow", name: "Shortbow", slot: "mainhand", style: "ranged", damage: 8 },
  { id: "staff", name: "Staff", slot: "mainhand", style: "magic", damage: 8 },
  { id: "wand", name: "Wand", slot: "mainhand", style: "magic", damage: 7 },
  { id: "orb", name: "Orb", slot: "offhand", style: "magic", damage: 3 },
  { id: "shield", name: "Shield", slot: "offhand", armor: 6 },
  { id: "padded", name: "Padded Armor", slot: "armor", armor: 4 },
  { id: "leather", name: "Leather Armor", slot: "armor", armor: 6 },
  { id: "chain", name: "Chain Mail", slot: "armor", armor: 10 },
  { id: "scale", name: "Scale Mail", slot: "armor", armor: 12 },
  { id: "plate", name: "Plate Armor", slot: "armor", armor: 16 },
  { id: "robes", name: "Arcane Robes", slot: "armor", armor: 3 },
  { id: "helm", name: "Helm", slot: "helm", armor: 3 },
  { id: "circlet", name: "Circlet", slot: "helm", armor: 1 },
  { id: "cloak", name: "Cloak", slot: "cloak", armor: 2 },
  { id: "ring", name: "Ring", slot: "ring" },
  { id: "amulet", name: "Amulet", slot: "amulet" },
];

const PREFIXES: ItemAffix[] = [
  { id: "flaming", name: "Flaming", stats: { fire: 4 } },
  { id: "frost", name: "Frostbitten", stats: { frost: 4 } },
  { id: "venom", name: "Venomous", stats: { poison: 3 } },
  { id: "radiant", name: "Radiant", stats: { radiant: 4 } },
  { id: "shadow", name: "Umbral", stats: { occult: 4 } },
  { id: "swift", name: "Swift", stats: { speed: 0.08 } },
  { id: "keen", name: "Keen", stats: { crit: 6 } },
  { id: "vampiric", name: "Vampiric", stats: { lifesteal: 4 } },
  { id: "planar", name: "Planar", stats: { planar: 8 } },
  { id: "sturdy", name: "Sturdy", stats: { armor: 3 } },
  { id: "sage", name: "Sage's", stats: { mana: 12 } },
  { id: "berserker", name: "Berserker's", stats: { meleePct: 8 } },
];

const SUFFIXES: ItemAffix[] = [
  { id: "bear", name: "of the Bear", stats: { str: 2 } },
  { id: "fox", name: "of the Fox", stats: { dex: 2 } },
  { id: "ox", name: "of the Ox", stats: { con: 2 } },
  { id: "owl", name: "of the Owl", stats: { int: 2 } },
  { id: "owl2", name: "of the Watcher", stats: { wis: 2 } },
  { id: "peacock", name: "of the Peacock", stats: { cha: 2 } },
  { id: "warding", name: "of Warding", stats: { armor: 4 } },
  { id: "leech", name: "of the Leech", stats: { lifesteal: 3 } },
  { id: "ashenford", name: "of Ashenford", stats: { hp: 10 } },
  { id: "hells", name: "of Avernus", stats: { fire: 6 } },
  { id: "fey", name: "of the Summer Court", stats: { speed: 0.1 } },
  { id: "sorrow", name: "of Sorrow", stats: { occult: 5 } },
  { id: "abyss", name: "of the Endless", stats: { damage: 5 } },
];

const RARITY_AFFIXES: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  artifact: 5,
};

export const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "artifact",
];

export function rollRarity(rng: RNG, luck = 0): Rarity {
  const n = rng.next() - luck * 0.02;
  if (n > 0.992) return "artifact";
  if (n > 0.97) return "legendary";
  if (n > 0.9) return "epic";
  if (n > 0.72) return "rare";
  if (n > 0.42) return "uncommon";
  return "common";
}

export function itemPower(item: Item): number {
  const rareBonus = RARITY_ORDER.indexOf(item.rarity) * 4;
  const affix = item.affixes.reduce((s, a) => {
    let n = 0;
    for (const v of Object.values(a.stats)) n += Math.abs(v ?? 0);
    return s + n;
  }, 0);
  return (item.damage ?? 0) + (item.armor ?? 0) + affix + item.ilvl + rareBonus;
}

export function generateItem(rng: RNG, ilvl: number, luck = 0, prefer?: Slot): Item {
  const pool = prefer ? BASES.filter((b) => b.slot === prefer) : BASES;
  const base = rng.pick(pool.length ? pool : BASES);
  const rarity = rollRarity(rng, luck);
  const affixes: ItemAffix[] = [];
  const n = RARITY_AFFIXES[rarity];
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const from = i % 2 === 0 ? PREFIXES : SUFFIXES;
    const a = rng.pick(from);
    if (used.has(a.id)) continue;
    used.add(a.id);
    const scaled: ItemAffix = {
      ...a,
      stats: Object.fromEntries(
        Object.entries(a.stats).map(([k, v]) => [k, typeof v === "number" ? +(v * (1 + ilvl * 0.06)).toFixed(2) : v]),
      ),
    };
    affixes.push(scaled);
  }
  const prefixes = affixes.filter((a) => PREFIXES.some((p) => p.id === a.id));
  const suffixes = affixes.filter((a) => SUFFIXES.some((p) => p.id === a.id));
  const name = `${prefixes[0]?.name ?? ""} ${base.name} ${suffixes[0]?.name ?? ""}`.replace(/\s+/g, " ").trim();
  const scale = 1 + ilvl * 0.07 + RARITY_ORDER.indexOf(rarity) * 0.08;
  return {
    id: `it_${rng.int(1, 1e9)}`,
    name,
    slot: base.slot,
    rarity,
    ilvl,
    base: base.id,
    style: base.style,
    damage: base.damage ? Math.round(base.damage * scale) : undefined,
    armor: base.armor ? Math.round(base.armor * scale) : undefined,
    affixes,
    lore: flavor(rng, rarity, base.name),
  };
}

function flavor(rng: RNG, rarity: Rarity, base: string): string {
  const lines = [
    `A ${base.toLowerCase()} that still smells of the forge.`,
    "Scratched with a prayer no one remembers finishing.",
    "Warm to the touch, as if recently held by someone afraid.",
    "The metal remembers a plane that is not this one.",
    "Inlaid with a shard of something that should not glitter.",
    "A craftsman's pride, and a soldier's last argument.",
  ];
  if (rarity === "legendary" || rarity === "artifact") {
    return rng.pick([
      "Named in a language the Gate still understands.",
      "It hums when other planes draw near.",
      "Once worn by a warden of the First Gate.",
    ]);
  }
  return rng.pick(lines);
}

export function startingGear(weaponId: string, rng: RNG): Item[] {
  const w = BASES.find((b) => b.id === weaponId) ?? BASES[2]!;
  const weapon: Item = {
    id: "start_w",
    name: `Travelworn ${w.name}`,
    slot: w.slot,
    rarity: "common",
    ilvl: 1,
    base: w.id,
    style: w.style,
    damage: w.damage,
    armor: w.armor,
    affixes: [],
    lore: "You carried this into Ashenford. It already wants replacing.",
  };
  const armor = generateItem(rng, 1, 0, "armor");
  armor.rarity = "common";
  armor.affixes = [];
  armor.name = `Patched ${armor.base === "robes" ? "Robes" : "Leather"}`;
  return [weapon, armor];
}

export function sumAffix(items: Item[], key: string): number {
  let n = 0;
  for (const it of items) {
    if (!it) continue;
    for (const a of it.affixes) n += a.stats[key] ?? 0;
    if (key === "damage") n += it.damage ?? 0;
    if (key === "armor") n += it.armor ?? 0;
  }
  return n;
}

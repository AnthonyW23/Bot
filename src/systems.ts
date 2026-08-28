import { classById, raceById } from "./data/codex";
import { generateItem, startingGear, sumAffix } from "./data/loot";
import { questById } from "./data/story";
import { RNG, mod, xpToLevel, xpToSkill } from "./engine";
import type { AbilityId, DialogueOption, Hero, Item, PlaneId, SaveFile, SkillId } from "./types";

export const SKILLS: SkillId[] = [
  "melee",
  "archery",
  "defense",
  "arcane",
  "divine",
  "nature",
  "occult",
  "stealth",
  "speech",
  "survival",
  "crafting",
  "perception",
];

export const SAVE_KEY = "veilbreaker.save.v1";

export function emptySkills(): Record<SkillId, { level: number; xp: number }> {
  return Object.fromEntries(SKILLS.map((s) => [s, { level: 1, xp: 0 }])) as Record<
    SkillId,
    { level: number; xp: number }
  >;
}

export function createHero(name: string, raceId: string, classId: string, abilities: Hero["abilities"]): Hero {
  const cls = classById(classId);
  const race = raceById(raceId);
  const rng = new RNG(hash(name + raceId + classId));
  const gear = startingGear(cls.startingWeapon, rng);
  const first = cls.tree[0];
  const hp = cls.hitDie + Math.max(0, mod(abilities.con)) * 2 + 10 + (first?.stats?.hp ?? 0);
  const mana = (cls.caster ? 20 + mod(abilities[cls.caster]) * 4 : 8) + (race.id === "gnome" ? 6 : 0) + (first?.stats?.mana ?? 0);
  const skills = emptySkills();
  if (race.id === "human") {
    skills.speech.level = 2;
    skills.perception.level = 2;
  }
  if (race.id === "elf") skills.perception.level = 3;
  if (race.id === "halfelf") skills.speech.level = 3;
  if (race.id === "dwarf") skills.crafting.level = 3;
  const equipped: Hero["equipped"] = {
    mainhand: gear[0],
    armor: gear[1],
  };
  return {
    name: name.trim() || "Unnamed Wanderer",
    raceId,
    classId,
    level: 1,
    xp: 0,
    abilities,
    hp,
    maxHp: hp,
    mana,
    maxMana: mana,
    stamina: 100,
    maxStamina: 100,
    skills,
    treeUnlocked: cls.tree[0] ? [cls.tree[0].id] : [],
    skillPoints: race.id === "human" ? 2 : 1,
    attributePoints: 0,
    inventory: [...gear],
    gold: 25,
    equipped,
    questLog: [],
    flags: {},
    shards: [],
    x: 24.5 * 48,
    y: 48.8 * 48,
    plane: "material",
    facing: 0,
    shrine: { plane: "material", x: 24.5 * 48, y: 49.4 * 48 },
  };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function equippedList(h: Hero): Item[] {
  return Object.values(h.equipped).filter((x): x is Item => !!x);
}

export function derived(h: Hero) {
  const items = equippedList(h);
  const cls = classById(h.classId);
  const race = raceById(h.raceId);
  const str = h.abilities.str + sumAffix(items, "str");
  const dex = h.abilities.dex + sumAffix(items, "dex");
  const intel = h.abilities.int + sumAffix(items, "int");
  const wis = h.abilities.wis + sumAffix(items, "wis");
  const cha = h.abilities.cha + sumAffix(items, "cha");
  const armor = sumAffix(items, "armor") + h.skills.defense.level + (treeStat(h, "armor") ?? 0);
  const speed =
    (race.speed + (treeStat(h, "speed") ?? 0) + sumAffix(items, "speed")) * (h.flags._wild ? 1.18 : 1);
  const crit = 5 + (treeStat(h, "crit") ?? 0) + sumAffix(items, "crit") + (race.id === "halfling" ? 3 : 0);
  const weapon = h.equipped.mainhand;
  const style = weapon?.style ?? cls.style;
  return { str, dex, int: intel, wis, cha, armor, speed, crit, style, items, cls, race };
}

export function treeStat(h: Hero, key: string): number {
  const cls = classById(h.classId);
  let n = 0;
  for (const id of h.treeUnlocked) {
    const node = cls.tree.find((t) => t.id === id);
    if (node?.stats && typeof node.stats[key] === "number") n += node.stats[key]!;
  }
  return n;
}

export function hasNode(h: Hero, id: string): boolean {
  return h.treeUnlocked.includes(id);
}

export function canUnlock(h: Hero, id: string): boolean {
  const cls = classById(h.classId);
  const node = cls.tree.find((t) => t.id === id);
  if (!node || hasNode(h, id) || h.skillPoints < node.cost) return false;
  if (node.requires.length === 0) return true;
  return node.requires.every((r) => hasNode(h, r));
}

export function unlockNode(h: Hero, id: string): boolean {
  if (!canUnlock(h, id)) return false;
  const cls = classById(h.classId);
  const node = cls.tree.find((t) => t.id === id)!;
  h.treeUnlocked.push(id);
  h.skillPoints -= node.cost;
  if (node.stats?.hp) {
    h.maxHp += node.stats.hp;
    h.hp += node.stats.hp;
  }
  if (node.stats?.mana) {
    h.maxMana += node.stats.mana;
    h.mana += node.stats.mana;
  }
  return true;
}

export function grantSkillXp(h: Hero, skill: SkillId, amount: number): boolean {
  const s = h.skills[skill];
  s.xp += amount;
  let leveled = false;
  while (s.xp >= xpToSkill(s.level) && s.level < 99) {
    s.xp -= xpToSkill(s.level);
    s.level += 1;
    leveled = true;
  }
  return leveled;
}

export function grantXp(h: Hero, amount: number): { levels: number } {
  const d = derived(h);
  const bonus = d.race.traits.some((t) => t.includes("XP")) ? 1.05 : 1;
  h.xp += Math.round(amount * bonus);
  let levels = 0;
  while (h.xp >= xpToLevel(h.level)) {
    h.xp -= xpToLevel(h.level);
    h.level += 1;
    levels += 1;
    h.skillPoints += 1;
    if (h.level % 2 === 0) h.attributePoints += 1;
    const con = mod(h.abilities.con);
    const add = Math.max(1, Math.ceil(d.cls.hitDie / 2) + con);
    h.maxHp += add;
    h.hp = Math.min(h.maxHp, h.hp + add);
    h.maxMana += d.cls.caster ? 4 : 1;
    h.mana = h.maxMana;
  }
  return { levels };
}

export function attackDamage(h: Hero, rng: RNG, opts?: { sneak?: boolean; smite?: boolean }): { dmg: number; crit: boolean } {
  const d = derived(h);
  const skill = d.style === "ranged" ? h.skills.archery.level : d.style === "magic" ? casterSkill(h) : h.skills.melee.level;
  const casterKey = d.cls.caster ?? "int";
  const casterStat = casterKey === "wis" ? d.wis : casterKey === "cha" ? d.cha : d.int;
  const stat =
    d.style === "ranged" ? d.dex : d.style === "magic" ? casterStat : d.cls.primary === "dex" ? d.dex : d.str;
  let dmg = 6 + (h.equipped.mainhand?.damage ?? 6) * 0.65 + mod(stat) * 1.8 + skill * 0.35;
  dmg += sumAffix(d.items, "damage");
  if (d.style === "melee") dmg *= 1 + (treeStat(h, "meleePct") ?? 0) / 100;
  if (d.style === "magic") dmg *= 1 + (treeStat(h, "arcanePct") + treeStat(h, "divinePct") + treeStat(h, "naturePct")) / 100;
  if (opts?.sneak) dmg *= 1.55 + (treeStat(h, "sneakPct") ?? 0) / 100;
  if (opts?.smite) dmg += 8 + h.level * 1.4 + (treeStat(h, "divinePct") ?? 0) * 0.2;
  if (h.flags._rage) dmg *= 1.35;
  if (h.flags._inspire) dmg *= 1.25;
  const critRoll = rng.next() * 100;
  const lucky = d.race.id === "halfling" && critRoll > 99 ? rng.next() * 100 : critRoll;
  const crit = lucky < d.crit;
  if (crit) dmg *= 1.75 + (treeStat(h, "critDmg") ?? 0) + (d.race.id === "halforc" ? 0.2 : 0);
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

function casterSkill(h: Hero): number {
  const cls = classById(h.classId);
  if (cls.id === "cleric" || cls.id === "paladin") return h.skills.divine.level;
  if (cls.id === "druid" || cls.id === "ranger") return h.skills.nature.level;
  if (cls.id === "warlock") return h.skills.occult.level;
  if (cls.id === "bard" || cls.id === "sorcerer") return Math.max(h.skills.arcane.level, h.skills.speech.level);
  return h.skills.arcane.level;
}

export function optionAllowed(h: Hero, opt: DialogueOption): boolean {
  const r = opt.require;
  if (!r) return true;
  if (r.race && h.raceId !== r.race) return false;
  if (r.class && h.classId !== r.class) return false;
  if (r.flag && !h.flags[r.flag]) return false;
  if (r.cha && h.abilities.cha < r.cha) return false;
  if (r.shards && h.shards.length < r.shards) return false;
  if (r.skill && h.skills[r.skill].level < (r.skillMin ?? 1)) return false;
  return true;
}

export function startQuest(h: Hero, id: string, detail?: string): boolean {
  if (h.questLog.some((q) => q.id === id)) return false;
  h.questLog.push({ id, step: 0, done: false, generated: id.startsWith("gen_"), detail });
  return true;
}

export function advanceQuest(h: Hero, id: string): void {
  const q = h.questLog.find((x) => x.id === id && !x.done);
  if (!q) return;
  const def = questById(id);
  q.step += 1;
  if (def && q.step >= def.steps.length) q.done = true;
}

export function completeQuest(h: Hero, id: string, rng: RNG): { xp: number; gold: number; item?: Item } {
  let q = h.questLog.find((x) => x.id === id);
  if (!q) {
    startQuest(h, id);
    q = h.questLog.find((x) => x.id === id)!;
  }
  q.done = true;
  const def = questById(id);
  const xp = def?.xp ?? 60;
  const gold = def?.gold ?? 20;
  h.gold += gold;
  grantXp(h, xp);
  const item = generateItem(rng, Math.max(1, h.level), 0.4);
  h.inventory.push(item);
  return { xp, gold, item };
}

export function addShard(h: Hero, plane: PlaneId): boolean {
  if (h.shards.includes(plane)) return false;
  h.shards.push(plane);
  if (h.shards.length >= 5) {
    const q = h.questLog.find((x) => x.id === "main_gate");
    if (q) q.step = Math.max(q.step, 3);
  } else {
    const q = h.questLog.find((x) => x.id === "main_gate");
    if (q) q.step = Math.max(q.step, 2);
  }
  return true;
}

export function equipItem(h: Hero, item: Item): void {
  const prev = h.equipped[item.slot];
  h.equipped[item.slot] = item;
  if (prev && !h.inventory.includes(prev)) h.inventory.push(prev);
}

export function saveGame(hero: Hero, extra: Omit<SaveFile, "hero">): void {
  const data: SaveFile = { hero, ...extra };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(): SaveFile | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveFile;
  } catch {
    return null;
  }
}

export function spendAttribute(h: Hero, id: AbilityId): boolean {
  if (h.attributePoints <= 0) return false;
  h.abilities[id] += 1;
  h.attributePoints -= 1;
  return true;
}

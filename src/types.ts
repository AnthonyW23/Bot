export type PlaneId = "material" | "feywild" | "shadowfell" | "hells" | "abyss";

export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type SkillId =
  | "melee"
  | "archery"
  | "defense"
  | "arcane"
  | "divine"
  | "nature"
  | "occult"
  | "stealth"
  | "speech"
  | "survival"
  | "crafting"
  | "perception";

export type Slot = "mainhand" | "offhand" | "armor" | "helm" | "ring" | "amulet" | "cloak";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "artifact";

export type WeaponStyle = "melee" | "ranged" | "magic";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Abilities {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface SkillState {
  level: number;
  xp: number;
}

export interface ItemAffix {
  id: string;
  name: string;
  stats: Partial<Record<string, number>>;
}

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  ilvl: number;
  base: string;
  style?: WeaponStyle;
  damage?: number;
  armor?: number;
  affixes: ItemAffix[];
  lore?: string;
  unique?: boolean;
}

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  x: number;
  y: number;
  requires: string[];
  cost: number;
  grantAbility?: string;
  stats?: Partial<Record<string, number>>;
}

export interface RaceDef {
  id: string;
  name: string;
  lore: string;
  bonus: Partial<Abilities>;
  traits: string[];
  colors: { skin: string; hair: string; accent: string };
  speed: number;
}

export interface ClassDef {
  id: string;
  name: string;
  lore: string;
  hitDie: number;
  primary: AbilityId;
  caster?: AbilityId;
  style: WeaponStyle;
  startingWeapon: string;
  abilities: AbilityDef[];
  tree: TreeNode[];
  color: string;
}

export interface AbilityDef {
  id: string;
  name: string;
  desc: string;
  hotkey: string;
  mana: number;
  stamina: number;
  cooldown: number;
  range: number;
  requiresNode?: string;
}

export interface DialogueOption {
  label: string;
  next?: string;
  require?: {
    skill?: SkillId;
    skillMin?: number;
    race?: string;
    class?: string;
    flag?: string;
    cha?: number;
    shards?: number;
  };
  skillCheck?: { skill: SkillId; dc: number; success: string; fail: string };
  setFlag?: Record<string, string | number | boolean>;
  startQuest?: string;
  advanceQuest?: string;
  completeQuest?: string;
  shop?: boolean;
  heal?: boolean;
  travel?: PlaneId;
  grantXp?: number;
  grantGold?: number;
  giveLoot?: boolean;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  options: DialogueOption[];
}

export interface QuestDef {
  id: string;
  name: string;
  plane?: PlaneId;
  steps: string[];
  xp: number;
  gold: number;
  main?: boolean;
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  plane: PlaneId;
  x: number;
  y: number;
  color: string;
  role: "story" | "vendor" | "wanderer";
  dialogue: Record<string, DialogueNode>;
  start: string;
  wander?: boolean;
}

export interface EnemyDef {
  id: string;
  name: string;
  plane: PlaneId | "any";
  hp: number;
  speed: number;
  damage: number;
  range: number;
  aggro: number;
  xp: number;
  color: string;
  tags: string[];
  boss?: boolean;
  shard?: PlaneId;
}

export type Tile = 0 | 1 | 2 | 3 | 4;

export interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: "portal" | "shrine" | "chest" | "quest" | "building";
  plane?: PlaneId;
  label?: string;
}

export interface Hero {
  name: string;
  raceId: string;
  classId: string;
  level: number;
  xp: number;
  abilities: Abilities;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  skills: Record<SkillId, SkillState>;
  treeUnlocked: string[];
  skillPoints: number;
  attributePoints: number;
  inventory: Item[];
  gold: number;
  equipped: Partial<Record<Slot, Item>>;
  questLog: { id: string; step: number; done: boolean; generated?: boolean; detail?: string }[];
  flags: Record<string, string | number | boolean>;
  shards: PlaneId[];
  x: number;
  y: number;
  plane: PlaneId;
  facing: number;
  shrine: { plane: PlaneId; x: number; y: number };
}

export interface SaveFile {
  hero: Hero;
  worldSeed: number;
  killed: string[];
  looted: string[];
  time: number;
}

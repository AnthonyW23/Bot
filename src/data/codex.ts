import type { AbilityDef, AbilityId, Abilities, ClassDef, RaceDef, TreeNode } from "../types";

export const ABILITY_NAMES: Record<AbilityId, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const RACES: RaceDef[] = [
  {
    id: "human",
    name: "Human",
    lore: "Adaptable and restless. Humans fill every calling, and the Gate's crack has made them braver than wise.",
    bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: ["Versatile: +2 skill points at start", "Ambitious: +5% XP"],
    colors: { skin: "#d2a07a", hair: "#5a3a22", accent: "#c6a15b" },
    speed: 1,
  },
  {
    id: "elf",
    name: "Elf",
    lore: "Long-lived children of starlight. The Feywild still sings in their blood, even on the Material Plane.",
    bonus: { dex: 2, int: 1 },
    traits: ["Fey Ancestry: resist charm", "Keen Senses: +2 Perception", "Darkvision"],
    colors: { skin: "#edd5b3", hair: "#c9d36a", accent: "#7ec8a3" },
    speed: 1.08,
  },
  {
    id: "dwarf",
    name: "Dwarf",
    lore: "Stone-kin who measure worth in craft and grit. Poison rarely takes them; grudges always do.",
    bonus: { con: 2, str: 1 },
    traits: ["Dwarven Resilience: poison resist", "Stonecunning: +2 crafting", "Steady: less knockback"],
    colors: { skin: "#c48a62", hair: "#8b2e1c", accent: "#8aa0b8" },
    speed: 0.92,
  },
  {
    id: "halfling",
    name: "Halfling",
    lore: "Small folk with luck that borders on rude. They walk into ruin humming, and often walk out.",
    bonus: { dex: 2, cha: 1 },
    traits: ["Lucky: attacks reroll a 1", "Brave: fear resist", "Nimble: +dodge distance"],
    colors: { skin: "#e0b48a", hair: "#6b3a1e", accent: "#d4a017" },
    speed: 0.95,
  },
  {
    id: "dragonborn",
    name: "Dragonborn",
    lore: "Scaled heirs of draconic pacts. Their breath is a memory of older, hungrier skies.",
    bonus: { str: 2, cha: 1 },
    traits: ["Breath Weapon", "Draconic Resistance: fire"],
    colors: { skin: "#c45c3a", hair: "#f0d48a", accent: "#e23a2e" },
    speed: 1,
  },
  {
    id: "gnome",
    name: "Gnome",
    lore: "Curious to the point of peril. Illusions cling to them like jokes they refuse to explain.",
    bonus: { int: 2, dex: 1 },
    traits: ["Gnome Cunning: resist mental control", "Tinker: +crafting XP"],
    colors: { skin: "#f0d2a8", hair: "#d8c84a", accent: "#6ec1ff" },
    speed: 0.94,
  },
  {
    id: "halfelf",
    name: "Half-Elf",
    lore: "Caught between hearth and starlight. They collect friends the way others collect scars.",
    bonus: { cha: 2, dex: 1, wis: 1 },
    traits: ["Fey Ancestry", "Silver Tongue: +2 Speech"],
    colors: { skin: "#e2b890", hair: "#3d2a44", accent: "#b07ac8" },
    speed: 1.03,
  },
  {
    id: "halforc",
    name: "Half-Orc",
    lore: "Born where peace failed. When they should fall, something in them refuses.",
    bonus: { str: 2, con: 1 },
    traits: ["Relentless: survive a killing blow once per shrine", "Savage Attacks: crits hit harder"],
    colors: { skin: "#6d8a4a", hair: "#1c1a16", accent: "#8b1e1e" },
    speed: 1.02,
  },
  {
    id: "tiefling",
    name: "Tiefling",
    lore: "Infernal blood is a rumor they cannot outrun. The Hells know their names already.",
    bonus: { cha: 2, int: 1 },
    traits: ["Hellish Resistance: fire", "Infernal Legacy: bonus occult damage"],
    colors: { skin: "#7a3a48", hair: "#1a0e10", accent: "#d45c22" },
    speed: 1,
  },
];

function node(p: Partial<TreeNode> & Pick<TreeNode, "id" | "name" | "desc" | "x" | "y">): TreeNode {
  return { requires: [], cost: 1, ...p };
}

function ab(
  id: string,
  name: string,
  desc: string,
  hotkey: string,
  extra: Partial<AbilityDef> = {},
): AbilityDef {
  return { id, name, desc, hotkey, mana: 0, stamina: 12, cooldown: 4, range: 90, ...extra };
}

const fighterTree: TreeNode[] = [
  node({ id: "f1", name: "Second Wind", desc: "Heal a burst of vitality in the fray.", x: 50, y: 86, grantAbility: "second_wind" }),
  node({ id: "f2", name: "Action Surge", desc: "A second strike in the same breath.", x: 50, y: 68, requires: ["f1"], grantAbility: "action_surge" }),
  node({ id: "f3", name: "Weapon Mastery", desc: "+12% melee damage.", x: 28, y: 52, requires: ["f1"], stats: { meleePct: 12 } }),
  node({ id: "f4", name: "Hold the Line", desc: "+8 defense, slower knockback.", x: 72, y: 52, requires: ["f1"], stats: { armor: 8 } }),
  node({ id: "f5", name: "Sweeping Blow", desc: "Cleave through clustered foes.", x: 28, y: 34, requires: ["f3"], grantAbility: "cleave" }),
  node({ id: "f6", name: "Indomitable", desc: "+20 max HP.", x: 72, y: 34, requires: ["f4"], stats: { hp: 20 } }),
  node({ id: "f7", name: "Champion", desc: "Crit chance +10%.", x: 50, y: 16, requires: ["f2", "f5"], stats: { crit: 10 } }),
];

const wizardTree: TreeNode[] = [
  node({ id: "w1", name: "Study", desc: "+15 max mana.", x: 50, y: 86, stats: { mana: 15 } }),
  node({ id: "w2", name: "Magic Missile", desc: "Unerring darts of force.", x: 32, y: 66, requires: ["w1"], grantAbility: "missile" }),
  node({ id: "w3", name: "Shield", desc: "A ward that drinks a hit.", x: 68, y: 66, requires: ["w1"], grantAbility: "shield" }),
  node({ id: "w4", name: "Fireball", desc: "The old answer to crowds.", x: 32, y: 42, requires: ["w2"], grantAbility: "fireball" }),
  node({ id: "w5", name: "Misty Step", desc: "Blink a short distance.", x: 68, y: 42, requires: ["w3"], grantAbility: "blink" }),
  node({ id: "w6", name: "Evoker's Edge", desc: "+18% arcane damage.", x: 50, y: 22, requires: ["w4"], stats: { arcanePct: 18 } }),
];

const rogueTree: TreeNode[] = [
  node({ id: "r1", name: "Sneak Attack", desc: "From stealth or behind, strike true.", x: 50, y: 86, grantAbility: "sneak" }),
  node({ id: "r2", name: "Cunning Action", desc: "Dash costs less stamina.", x: 30, y: 64, requires: ["r1"], stats: { stamCost: -0.25 } }),
  node({ id: "r3", name: "Evasion", desc: "Dodge window longer.", x: 70, y: 64, requires: ["r1"], stats: { dodgeTime: 0.12 } }),
  node({ id: "r4", name: "Assassinate", desc: "First hit on an unaware foe crits.", x: 30, y: 40, requires: ["r2"], stats: { ambush: 1 } }),
  node({ id: "r5", name: "Smoke", desc: "Vanish in a puff of night.", x: 70, y: 40, requires: ["r3"], grantAbility: "smoke" }),
  node({ id: "r6", name: "Death from Below", desc: "+25% sneak damage.", x: 50, y: 18, requires: ["r4", "r5"], stats: { sneakPct: 25 } }),
];

const paladinTree: TreeNode[] = [
  node({ id: "p1", name: "Divine Smite", desc: "Spend mana to burn the unholy.", x: 50, y: 86, grantAbility: "smite" }),
  node({ id: "p2", name: "Lay on Hands", desc: "A well of healing in your palms.", x: 30, y: 64, requires: ["p1"], grantAbility: "lay_hands" }),
  node({ id: "p3", name: "Aura of Warding", desc: "Nearby damage reduced.", x: 70, y: 64, requires: ["p1"], stats: { aura: 6 } }),
  node({ id: "p4", name: "Oathkeeper", desc: "+10% divine damage.", x: 50, y: 40, requires: ["p2", "p3"], stats: { divinePct: 10 } }),
  node({ id: "p5", name: "Radiant Crusade", desc: "A cone of searing light.", x: 50, y: 18, requires: ["p4"], grantAbility: "radiance" }),
];

const rangerTree: TreeNode[] = [
  node({ id: "n1", name: "Hunter's Mark", desc: "Mark a foe; your shots find them.", x: 50, y: 86, grantAbility: "mark" }),
  node({ id: "n2", name: "Colossus Slayer", desc: "Bonus damage vs wounded.", x: 30, y: 62, requires: ["n1"], stats: { execute: 8 } }),
  node({ id: "n3", name: "Volley", desc: "Rain arrows in an arc.", x: 70, y: 62, requires: ["n1"], grantAbility: "volley" }),
  node({ id: "n4", name: "Horde Breaker", desc: "Shots chain to a nearby foe.", x: 50, y: 36, requires: ["n2", "n3"], stats: { chain: 1 } }),
  node({ id: "n5", name: "Fey Wanderer", desc: "+nature damage, Feywild speed.", x: 50, y: 16, requires: ["n4"], stats: { naturePct: 15 } }),
];

const barbTree: TreeNode[] = [
  node({ id: "b1", name: "Rage", desc: "More damage, less incoming, burning stamina.", x: 50, y: 86, grantAbility: "rage" }),
  node({ id: "b2", name: "Reckless", desc: "Your hits and theirs strike truer.", x: 32, y: 62, requires: ["b1"], grantAbility: "reckless" }),
  node({ id: "b3", name: "Thick Hide", desc: "+14 max HP.", x: 68, y: 62, requires: ["b1"], stats: { hp: 14 } }),
  node({ id: "b4", name: "Brutal Critical", desc: "Crits deal far more.", x: 50, y: 36, requires: ["b2", "b3"], stats: { critDmg: 0.5 } }),
  node({ id: "b5", name: "Relentless Rage", desc: "Rage heals as you strike.", x: 50, y: 16, requires: ["b4"], stats: { rageHeal: 4 } }),
];

const clericTree: TreeNode[] = [
  node({ id: "c1", name: "Sacred Flame", desc: "A spear of searing dawn.", x: 50, y: 86, grantAbility: "sacred_flame" }),
  node({ id: "c2", name: "Cure Wounds", desc: "Knit flesh with prayer.", x: 30, y: 64, requires: ["c1"], grantAbility: "cure" }),
  node({ id: "c3", name: "Spirit Guardians", desc: "A ring of wrathful spirits.", x: 70, y: 64, requires: ["c1"], grantAbility: "spirits" }),
  node({ id: "c4", name: "Beacon", desc: "+divine damage and healing.", x: 50, y: 38, requires: ["c2", "c3"], stats: { divinePct: 14 } }),
  node({ id: "c5", name: "Dawnburst", desc: "A nova of light.", x: 50, y: 16, requires: ["c4"], grantAbility: "dawnburst" }),
];

const warlockTree: TreeNode[] = [
  node({ id: "k1", name: "Eldritch Blast", desc: "The pact's first word.", x: 50, y: 86, grantAbility: "blast" }),
  node({ id: "k2", name: "Hex", desc: "Curse a foe; they take more.", x: 30, y: 64, requires: ["k1"], grantAbility: "hex" }),
  node({ id: "k3", name: "Agonizing", desc: "Blast scales with Charisma.", x: 70, y: 64, requires: ["k1"], stats: { blastCha: 1 } }),
  node({ id: "k4", name: "Dark One's Own", desc: "Kills restore HP.", x: 50, y: 40, requires: ["k2"], stats: { onKillHp: 8 } }),
  node({ id: "k5", name: "Hunger of the Planes", desc: "Blast explodes on kill.", x: 50, y: 18, requires: ["k3", "k4"], stats: { blastNova: 1 } }),
];

const bardTree: TreeNode[] = [
  node({ id: "d1", name: "Inspiration", desc: "A song that steels your next strike.", x: 50, y: 86, grantAbility: "inspire" }),
  node({ id: "d2", name: "Vicious Mockery", desc: "Words that wound.", x: 32, y: 64, requires: ["d1"], grantAbility: "mockery" }),
  node({ id: "d3", name: "Healing Word", desc: "A lyric that knits.", x: 68, y: 64, requires: ["d1"], grantAbility: "healword" }),
  node({ id: "d4", name: "Cutting Words", desc: "Enemies near you deal less.", x: 50, y: 40, requires: ["d2"], stats: { aura: 5 } }),
  node({ id: "d5", name: "Magnum Opus", desc: "A stunning chord.", x: 50, y: 18, requires: ["d3", "d4"], grantAbility: "opus" }),
];

const druidTree: TreeNode[] = [
  node({ id: "u1", name: "Thorn Whip", desc: "A lash of living wood.", x: 50, y: 86, grantAbility: "thorn" }),
  node({ id: "u2", name: "Moonbeam", desc: "A pillar of silver fire.", x: 32, y: 62, requires: ["u1"], grantAbility: "moonbeam" }),
  node({ id: "u3", name: "Wild Shape", desc: "Speed and thorns for a time.", x: 68, y: 62, requires: ["u1"], grantAbility: "wildshape" }),
  node({ id: "u4", name: "Land's Stride", desc: "Hazards slow you less.", x: 50, y: 38, requires: ["u2", "u3"], stats: { hazard: 0.5 } }),
  node({ id: "u5", name: "Wrath of the Wild", desc: "A burst of roots.", x: 50, y: 16, requires: ["u4"], grantAbility: "roots" }),
];

const monkTree: TreeNode[] = [
  node({ id: "m1", name: "Flurry", desc: "Two strikes for one breath.", x: 50, y: 86, grantAbility: "flurry" }),
  node({ id: "m2", name: "Patient Defense", desc: "Dodge restores stamina.", x: 32, y: 62, requires: ["m1"], stats: { dodgeStam: 8 } }),
  node({ id: "m3", name: "Step of the Wind", desc: "Faster movement.", x: 68, y: 62, requires: ["m1"], stats: { speed: 0.15 } }),
  node({ id: "m4", name: "Stunning Strike", desc: "A hit that stills.", x: 50, y: 38, requires: ["m2", "m3"], grantAbility: "stun" }),
  node({ id: "m5", name: "Empty Body", desc: "Brief invulnerability.", x: 50, y: 16, requires: ["m4"], grantAbility: "empty" }),
];

const sorcTree: TreeNode[] = [
  node({ id: "s1", name: "Chaos Bolt", desc: "Unstable, hungry magic.", x: 50, y: 86, grantAbility: "chaos" }),
  node({ id: "s2", name: "Metamagic: Twin", desc: "Your next spell repeats.", x: 32, y: 62, requires: ["s1"], grantAbility: "twin" }),
  node({ id: "s3", name: "Font of Magic", desc: "+20 mana.", x: 68, y: 62, requires: ["s1"], stats: { mana: 20 } }),
  node({ id: "s4", name: "Wild Surge", desc: "Spells may explode larger.", x: 50, y: 38, requires: ["s2", "s3"], stats: { wild: 1 } }),
  node({ id: "s5", name: "Dragon's Breath", desc: "A cone of ancestral fire.", x: 50, y: 16, requires: ["s4"], grantAbility: "sbreath" }),
];

export const CLASSES: ClassDef[] = [
  {
    id: "barbarian",
    name: "Barbarian",
    lore: "Rage is a craft. You spend it the way a smith spends heat.",
    hitDie: 12,
    primary: "str",
    style: "melee",
    startingWeapon: "greataxe",
    color: "#c45c3a",
    abilities: [
      ab("rage", "Rage", "Enter a fury: more damage, less pain.", "1", { stamina: 0, mana: 0, cooldown: 16 }),
      ab("reckless", "Reckless Attack", "Your next hits cannot miss; you take more.", "2", { requiresNode: "b2" }),
    ],
    tree: barbTree,
  },
  {
    id: "bard",
    name: "Bard",
    lore: "You keep the old songs honest, and make new ones sharp enough to cut.",
    hitDie: 8,
    primary: "cha",
    caster: "cha",
    style: "magic",
    startingWeapon: "rapier",
    color: "#c084fc",
    abilities: [
      ab("inspire", "Inspiration", "Your next strike is blessed.", "1", { mana: 8, stamina: 0 }),
      ab("mockery", "Vicious Mockery", "An insult with teeth.", "2", { mana: 6, stamina: 0, range: 220, requiresNode: "d2" }),
      ab("healword", "Healing Word", "A lyric that knits flesh.", "3", { mana: 12, stamina: 0, requiresNode: "d3" }),
    ],
    tree: bardTree,
  },
  {
    id: "cleric",
    name: "Cleric",
    lore: "The Dawnfather still answers, though the answer is often fire.",
    hitDie: 8,
    primary: "wis",
    caster: "wis",
    style: "magic",
    startingWeapon: "mace",
    color: "#f0d48a",
    abilities: [
      ab("sacred_flame", "Sacred Flame", "Radiant judgment.", "1", { mana: 8, stamina: 0, range: 240 }),
      ab("cure", "Cure Wounds", "Lay hands and hope.", "2", { mana: 14, stamina: 0, requiresNode: "c2" }),
    ],
    tree: clericTree,
  },
  {
    id: "druid",
    name: "Druid",
    lore: "The wilds are a parliament. You speak for the trees that cannot run.",
    hitDie: 8,
    primary: "wis",
    caster: "wis",
    style: "magic",
    startingWeapon: "staff",
    color: "#5dcc7a",
    abilities: [
      ab("thorn", "Thorn Whip", "Pull and puncture.", "1", { mana: 6, stamina: 0, range: 180 }),
      ab("moonbeam", "Moonbeam", "A pillar of silver fire.", "2", { mana: 16, stamina: 0, range: 260, requiresNode: "u2" }),
    ],
    tree: druidTree,
  },
  {
    id: "fighter",
    name: "Fighter",
    lore: "No mystery. Only the work of staying standing one heartbeat longer.",
    hitDie: 10,
    primary: "str",
    style: "melee",
    startingWeapon: "longsword",
    color: "#8aa0b8",
    abilities: [
      ab("second_wind", "Second Wind", "Steal a second breath.", "1", { stamina: 0, cooldown: 14 }),
      ab("action_surge", "Action Surge", "Strike twice in a blink.", "2", { stamina: 18, requiresNode: "f2" }),
    ],
    tree: fighterTree,
  },
  {
    id: "monk",
    name: "Monk",
    lore: "The body is a gate. You open it from the inside.",
    hitDie: 8,
    primary: "dex",
    style: "melee",
    startingWeapon: "staff",
    color: "#e8dcc4",
    abilities: [
      ab("flurry", "Flurry of Blows", "Two hits, one breath.", "1", { stamina: 10 }),
      ab("stun", "Stunning Strike", "Still a foe's ki.", "2", { stamina: 16, requiresNode: "m4" }),
    ],
    tree: monkTree,
  },
  {
    id: "paladin",
    name: "Paladin",
    lore: "Oaths are weapons. Yours still cuts.",
    hitDie: 10,
    primary: "str",
    caster: "cha",
    style: "melee",
    startingWeapon: "longsword",
    color: "#62b0ff",
    abilities: [
      ab("smite", "Divine Smite", "Spend light to unmake the unholy.", "1", { mana: 10, stamina: 8 }),
      ab("lay_hands", "Lay on Hands", "A reservoir of mercy.", "2", { mana: 0, stamina: 0, cooldown: 18, requiresNode: "p2" }),
    ],
    tree: paladinTree,
  },
  {
    id: "ranger",
    name: "Ranger",
    lore: "You learned the land by bleeding on it. Now it bleeds back for you.",
    hitDie: 10,
    primary: "dex",
    style: "ranged",
    startingWeapon: "longbow",
    color: "#3d6b4a",
    abilities: [
      ab("mark", "Hunter's Mark", "Name a death.", "1", { mana: 8, stamina: 0, range: 320 }),
      ab("volley", "Volley", "Many arrows, one decision.", "2", { stamina: 16, range: 280, requiresNode: "n3" }),
    ],
    tree: rangerTree,
  },
  {
    id: "rogue",
    name: "Rogue",
    lore: "The honest path is crowded. You take the other one.",
    hitDie: 8,
    primary: "dex",
    style: "melee",
    startingWeapon: "dagger",
    color: "#6b7280",
    abilities: [
      ab("sneak", "Sneak Attack", "From the blind side.", "1", { stamina: 10 }),
      ab("smoke", "Smoke Bomb", "Leave only a cough.", "2", { stamina: 14, requiresNode: "r5" }),
    ],
    tree: rogueTree,
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    lore: "Magic did not ask your permission. It lives in you like a second pulse.",
    hitDie: 6,
    primary: "cha",
    caster: "cha",
    style: "magic",
    startingWeapon: "wand",
    color: "#ff6b81",
    abilities: [
      ab("chaos", "Chaos Bolt", "A spell that has opinions.", "1", { mana: 9, stamina: 0, range: 260 }),
      ab("twin", "Twin Spell", "Cast it twice.", "2", { mana: 14, stamina: 0, requiresNode: "s2" }),
    ],
    tree: sorcTree,
  },
  {
    id: "warlock",
    name: "Warlock",
    lore: "You bargained. The other party is still collecting.",
    hitDie: 8,
    primary: "cha",
    caster: "cha",
    style: "magic",
    startingWeapon: "wand",
    color: "#7c3aed",
    abilities: [
      ab("blast", "Eldritch Blast", "The pact's handshake.", "1", { mana: 4, stamina: 0, range: 300 }),
      ab("hex", "Hex", "A curse that follows.", "2", { mana: 10, stamina: 0, range: 260, requiresNode: "k2" }),
    ],
    tree: warlockTree,
  },
  {
    id: "wizard",
    name: "Wizard",
    lore: "The universe is a text. You have learned to write in the margins.",
    hitDie: 6,
    primary: "int",
    caster: "int",
    style: "magic",
    startingWeapon: "staff",
    color: "#62b0ff",
    abilities: [
      ab("missile", "Magic Missile", "Force that does not miss.", "1", { mana: 8, stamina: 0, range: 280, requiresNode: "w2" }),
      ab("fireball", "Fireball", "The classic argument.", "2", { mana: 22, stamina: 0, range: 300, requiresNode: "w4" }),
      ab("blink", "Misty Step", "Leave a question mark.", "3", { mana: 12, stamina: 0, requiresNode: "w5" }),
    ],
    tree: wizardTree,
  },
];

export const RACIAL_ABILITIES: Record<string, AbilityDef> = {
  human: ab("human_resolve", "Human Resolve", "Steel yourself: heal and sharpen your next blows.", "", {
    mana: 0,
    stamina: 0,
    cooldown: 16,
  }),
  elf: ab("elf_feystep", "Fey Step", "Blink through starlight to your cursor.", "", {
    mana: 0,
    stamina: 8,
    cooldown: 8,
    range: 220,
  }),
  dwarf: ab("dwarf_stone", "Stone Endurance", "Harden like living rock: brief damage reduction and mending.", "", {
    mana: 0,
    stamina: 0,
    cooldown: 18,
  }),
  halfling: ab("halfling_luck", "Halfling Luck", "Fortune shrugs off harm and restores your wind.", "", {
    mana: 0,
    stamina: 0,
    cooldown: 12,
  }),
  dragonborn: ab("dragon_breath", "Draconic Breath", "Exhale a cone of ancestral fire.", "", {
    mana: 0,
    stamina: 12,
    cooldown: 10,
    range: 200,
  }),
  gnome: ab("gnome_cunning", "Cunning Ward", "Illusions restore mana and turn a blow aside.", "", {
    mana: 0,
    stamina: 0,
    cooldown: 14,
  }),
  halfelf: ab("halfelf_charm", "Charming Word", "A honeyed word stuns nearby foes.", "", {
    mana: 0,
    stamina: 0,
    cooldown: 14,
    range: 180,
  }),
  halforc: ab("halforc_savage", "Savage Blow", "A brutal strike that lands far harder.", "", {
    mana: 0,
    stamina: 14,
    cooldown: 9,
  }),
  tiefling: ab("tiefling_rebuke", "Hellish Rebuke", "Answer pain with a burst of infernal fire.", "", {
    mana: 0,
    stamina: 0,
    cooldown: 10,
    range: 150,
  }),
};

export function racialAbility(raceId: string): AbilityDef | undefined {
  return RACIAL_ABILITIES[raceId];
}

// Every ability the hero can bind to the hotbar: class abilities, abilities
// granted by lattice nodes, and the race's signature ability.
export function abilityRegistry(classId: string, raceId: string): AbilityDef[] {
  const cls = classById(classId);
  const list: AbilityDef[] = [...cls.abilities];
  const seen = new Set(list.map((a) => a.id));
  for (const n of cls.tree) {
    if (n.grantAbility && !seen.has(n.grantAbility)) {
      seen.add(n.grantAbility);
      list.push(ab(n.grantAbility, n.name, n.desc, "", { requiresNode: n.id }));
    }
  }
  const racial = racialAbility(raceId);
  if (racial && !seen.has(racial.id)) list.push(racial);
  return list;
}

export function abilityById(classId: string, raceId: string, id: string): AbilityDef | undefined {
  return abilityRegistry(classId, raceId).find((a) => a.id === id);
}

export function raceById(id: string): RaceDef {
  return RACES.find((r) => r.id === id) ?? RACES[0]!;
}

export function classById(id: string): ClassDef {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[4]!;
}

export function defaultAbilities(classId: string): Abilities {
  const cls = classById(classId);
  const scores: Abilities = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
  const priority: AbilityId[] = [];
  const push = (id: AbilityId) => {
    if (!priority.includes(id)) priority.push(id);
  };
  push(cls.primary);
  if (cls.caster) push(cls.caster);
  push("con");
  (["dex", "str", "wis", "int", "cha"] as AbilityId[]).forEach(push);
  priority.forEach((k, i) => {
    scores[k] = STANDARD_ARRAY[i] ?? 8;
  });
  return scores;
}

export function applyRace(base: Abilities, raceId: string): Abilities {
  const b = { ...base };
  const r = raceById(raceId);
  (Object.keys(r.bonus) as AbilityId[]).forEach((k) => {
    b[k] += r.bonus[k] ?? 0;
  });
  return b;
}

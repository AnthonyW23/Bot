import { describe, expect, it } from "vitest";
import { generateItem, itemPower, rollRarity, startingGear } from "./data/loot";
import { RNG } from "./engine";
import {
  addShard,
  attackDamage,
  canUnlock,
  createHero,
  grantSkillXp,
  grantXp,
  optionAllowed,
  startQuest,
  unlockNode,
} from "./systems";
import { generatePlane, tileAt } from "./world";
import { applyRace, defaultAbilities } from "./data/codex";
import { xpToLevel, xpToSkill } from "./engine";

describe("hero creation", () => {
  it("builds a named D&D adventurer with gear and a shrine", () => {
    const hero = createHero("Mira's Guest", "tiefling", "warlock", applyRace(defaultAbilities("warlock"), "tiefling"));
    expect(hero.name).toBe("Mira's Guest");
    expect(hero.classId).toBe("warlock");
    expect(hero.raceId).toBe("tiefling");
    expect(hero.hp).toBeGreaterThan(10);
    expect(hero.equipped.mainhand?.base).toBe("wand");
    expect(hero.shards).toEqual([]);
    expect(hero.shrine.plane).toBe("material");
  });

  it("gives warlocks their highest score in Charisma", () => {
    const w = applyRace(defaultAbilities("warlock"), "tiefling");
    expect(w.cha).toBeGreaterThanOrEqual(w.str);
    expect(w.cha).toBeGreaterThanOrEqual(w.con);
    expect(w.cha).toBeGreaterThanOrEqual(17);
  });

  it("applies racial ability bonuses", () => {
    const base = defaultAbilities("fighter");
    const human = applyRace(base, "human");
    expect(human.str).toBe(base.str + 1);
    expect(human.cha).toBe(base.cha + 1);
  });
});

describe("leveling", () => {
  it("levels from experience and grants skill points", () => {
    const hero = createHero("A", "human", "fighter", applyRace(defaultAbilities("fighter"), "human"));
    const need = xpToLevel(1);
    const before = hero.skillPoints;
    const { levels } = grantXp(hero, need);
    expect(levels).toBe(1);
    expect(hero.level).toBe(2);
    expect(hero.skillPoints).toBeGreaterThan(before);
  });

  it("raises use-based skills independently", () => {
    const hero = createHero("A", "elf", "ranger", applyRace(defaultAbilities("ranger"), "elf"));
    const start = hero.skills.archery.level;
    grantSkillXp(hero, "archery", xpToSkill(start) + 5);
    expect(hero.skills.archery.level).toBe(start + 1);
    expect(hero.skills.melee.level).toBe(1);
  });
});

describe("combat and loot", () => {
  it("rolls positive damage", () => {
    const hero = createHero("A", "halfelf", "rogue", applyRace(defaultAbilities("rogue"), "halfelf"));
    const { dmg } = attackDamage(hero, new RNG(7), { sneak: true });
    expect(dmg).toBeGreaterThan(5);
  });

  it("generates named items with valid rarity", () => {
    const rng = new RNG(42);
    const item = generateItem(rng, 5, 0.5);
    expect(item.name.length).toBeGreaterThan(3);
    expect(itemPower(item)).toBeGreaterThan(0);
    expect(["common", "uncommon", "rare", "epic", "legendary", "artifact"]).toContain(item.rarity);
  });

  it("starting gear matches the class weapon", () => {
    const gear = startingGear("greataxe", new RNG(1));
    expect(gear[0]?.base).toBe("greataxe");
  });

  it("rarity roller is deterministic for a seed", () => {
    expect(rollRarity(new RNG(1))).toBe(rollRarity(new RNG(1)));
  });
});

describe("quests, dialogue, lattice", () => {
  it("starts a main quest once", () => {
    const hero = createHero("A", "dwarf", "cleric", applyRace(defaultAbilities("cleric"), "dwarf"));
    expect(startQuest(hero, "main_gate")).toBe(true);
    expect(startQuest(hero, "main_gate")).toBe(false);
    expect(hero.questLog[0]?.id).toBe("main_gate");
  });

  it("gates speech options on skill level", () => {
    const hero = createHero("A", "halfling", "bard", applyRace(defaultAbilities("bard"), "halfling"));
    hero.skills.speech.level = 1;
    expect(optionAllowed(hero, { label: "x", require: { skill: "speech", skillMin: 3 } })).toBe(false);
    hero.skills.speech.level = 4;
    expect(optionAllowed(hero, { label: "x", require: { skill: "speech", skillMin: 3 } })).toBe(true);
  });

  it("unlocks adjacent lattice nodes only", () => {
    const hero = createHero("A", "human", "fighter", applyRace(defaultAbilities("fighter"), "human"));
    expect(hero.treeUnlocked).toContain("f1");
    expect(canUnlock(hero, "f2")).toBe(true);
    expect(canUnlock(hero, "f7")).toBe(false);
    expect(unlockNode(hero, "f2")).toBe(true);
    expect(hero.treeUnlocked).toContain("f2");
  });

  it("collects unique planar shards", () => {
    const hero = createHero("A", "dragonborn", "paladin", applyRace(defaultAbilities("paladin"), "dragonborn"));
    expect(addShard(hero, "feywild")).toBe(true);
    expect(addShard(hero, "feywild")).toBe(false);
    expect(hero.shards).toEqual(["feywild"]);
  });
});

describe("planes", () => {
  it("keeps the Ashenford spawn walkable", () => {
    const map = generatePlane("material", 0x51a7e1);
    expect(tileAt(map, map.spawn.x, map.spawn.y)).not.toBe(1);
    expect(map.landmarks.some((l) => l.kind === "portal" && l.plane === "feywild")).toBe(true);
  });

  it("builds all five planes", () => {
    for (const id of ["material", "feywild", "shadowfell", "hells", "abyss"] as const) {
      const m = generatePlane(id, 99);
      expect(m.tiles.length).toBe(m.w * m.h);
      expect(m.landmarks.length).toBeGreaterThan(2);
    }
  });
});

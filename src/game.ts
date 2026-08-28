import { ABILITY_NAMES, applyRace, classById, defaultAbilities } from "./data/codex";
import { generateItem } from "./data/loot";
import { enemyById } from "./data/bestiary";
import { QUEST_TEMPLATES, QUESTS, WANDERER_LINES, npcById, questById } from "./data/story";
import { AudioBus, Camera, Input, RNG, TILE, ang, burst, dist } from "./engine";
import { drawBigMap, drawEnt, drawMinimap, drawParticles, drawPortrait, drawWorld, resize } from "./render";
import {
  addShard,
  advanceQuest,
  attackDamage,
  completeQuest,
  createHero,
  derived,
  equipItem,
  grantSkillXp,
  grantXp,
  hasNode,
  loadGame,
  optionAllowed,
  saveGame,
  spendAttribute,
  startQuest,
  treeStat,
  unlockNode,
} from "./systems";
import type { AbilityId, DialogueNode, DialogueOption, Hero, Item, PlaneId } from "./types";
import {
  $,
  bindTitle,
  closeDialogue,
  fillCreate,
  openDialogue,
  renderCharacter,
  renderCreateSummary,
  renderInventory,
  renderJournal,
  renderSkills,
  show,
  toast,
  updateHud,
} from "./ui";
import { type Ent, type PlaneWorld, blocked, generatePlane, spawnEntities, tileAt, tryMove } from "./world";
import type { Particle } from "./engine";

type Screen = "title" | "create" | "play";
type Overlay = "none" | "inv" | "skills" | "journal" | "char" | "map" | "pause" | "dialogue" | "death" | "victory";

const seed = 0x51a7e1;
const maps = new Map<PlaneId, PlaneWorld>();
const planeIds: PlaneId[] = ["material", "feywild", "shadowfell", "hells", "abyss"];
for (const p of planeIds) maps.set(p, generatePlane(p, seed));

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  cam = new Camera();
  audio = new AudioBus();
  screen: Screen = "title";
  overlay: Overlay = "none";
  hero: Hero | null = null;
  ents: Ent[] = [];
  parts: Particle[] = [];
  killed = new Set<string>();
  looted = new Set<string>();
  time = 0;
  atkCd = 0;
  dodge = 0;
  invuln = 0;
  cds: Record<string, number> = {};
  createSel = { raceId: "human", classId: "fighter", abilities: applyRace(defaultAbilities("fighter"), "human") };
  pickers: ReturnType<typeof fillCreate> | null = null;
  floating: { x: number; y: number; t: number; text: string; color: string }[] = [];
  marked?: Ent;
  hexed?: Ent;
  inspireT = 0;
  rageT = 0;
  wildT = 0;
  twin = false;
  stealth = 0;
  shopStock: Item[] = [];
  drops: Record<string, Item> = {};
  saveAcc = 0;
  prev = 0;
  genKills = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new Input(canvas);
    window.addEventListener("resize", () => resize(canvas));
    resize(canvas);
    bindTitle(
      () => this.openCreate(),
      () => this.continueGame(),
      !!loadGame(),
    );
    $("btn-back-title").onclick = () => this.toTitle();
    $("btn-embark").onclick = () => this.embark();
    $("btn-resume").onclick = () => this.setOverlay("none");
    $("btn-save").onclick = () => this.save();
    $("btn-title").onclick = () => this.toTitle();
    $("btn-respawn").onclick = () => this.respawn();
    $("btn-victory-title").onclick = () => this.toTitle();
    this.pickers = fillCreate(() => this.refreshCreate());
    this.refreshCreate();
    this.loop(0);
  }

  toTitle(): void {
    this.screen = "title";
    this.hero = null;
    show("title-screen", true);
    show("create-screen", false);
    show("hud", false);
    ["inventory", "skills", "journal", "character-sheet", "map-overlay", "pause", "death", "victory", "dialogue"].forEach(
      (id) => show(id, false),
    );
    bindTitle(
      () => this.openCreate(),
      () => this.continueGame(),
      !!loadGame(),
    );
  }

  openCreate(): void {
    this.screen = "create";
    show("title-screen", false);
    show("create-screen", true);
    this.refreshCreate();
  }

  refreshCreate(): void {
    if (!this.pickers) return;
    const raceId = this.pickers.race();
    const classId = this.pickers.cls();
    const keepSwap = this.createSel.classId === classId && this.createSel.raceId === raceId;
    this.createSel = {
      raceId,
      classId,
      abilities: keepSwap ? this.createSel.abilities : applyRace(defaultAbilities(classId), raceId),
    };
    renderCreateSummary(this.createSel);
    const abs = $("ability-swap");
    abs.innerHTML = "";
    (Object.keys(this.createSel.abilities) as AbilityId[]).forEach((k) => {
      const row = document.createElement("div");
      row.className = "ability-chip";
      row.innerHTML = `<span>${ABILITY_NAMES[k]}</span><span>${this.createSel.abilities[k]}</span>`;
      const up = document.createElement("button");
      up.textContent = "↕";
      up.title = "Swap with next";
      up.onclick = () => {
        const keys = Object.keys(this.createSel.abilities) as AbilityId[];
        const i = keys.indexOf(k);
        const n = keys[(i + 1) % keys.length]!;
        const tmp = this.createSel.abilities[k];
        this.createSel.abilities[k] = this.createSel.abilities[n];
        this.createSel.abilities[n] = tmp;
        this.refreshCreate();
      };
      row.appendChild(up);
      abs.appendChild(row);
    });
    const name = this.pickers.name();
    ($("btn-embark") as HTMLButtonElement).disabled = name.trim().length < 2;
    const ghost: Hero = createHero(name || "Wanderer", raceId, classId, this.createSel.abilities);
    drawPortrait($("create-portrait") as HTMLCanvasElement, ghost);
  }

  embark(): void {
    if (!this.pickers) return;
    const name = this.pickers.name();
    this.hero = createHero(name, this.createSel.raceId, this.createSel.classId, this.createSel.abilities);
    startQuest(this.hero, "main_gate");
    this.enter("material", true);
    show("create-screen", false);
    show("hud", true);
    this.screen = "play";
    toast("Ashenford. The ale is honest. The sky is not.");
  }

  continueGame(): void {
    const s = loadGame();
    if (!s) return;
    this.hero = s.hero;
    this.killed = new Set(s.killed);
    this.looted = new Set(s.looted);
    this.time = s.time;
    this.enter(this.hero.plane, false);
    show("title-screen", false);
    show("hud", true);
    this.screen = "play";
    toast("The chronicle remembers you.");
  }

  enter(plane: PlaneId, atSpawn: boolean): void {
    const h = this.hero!;
    h.plane = plane;
    const map = maps.get(plane)!;
    if (atSpawn) {
      h.x = map.spawn.x;
      h.y = map.spawn.y;
    }
    this.ents = spawnEntities(map, seed, this.killed, this.looted);
    this.ents.push({ id: "player", kind: "player", x: h.x, y: h.y, r: 12 });
    this.spawnWanderers(map);
    this.cam.x = h.x - this.canvas.width / 2;
    this.cam.y = h.y - this.canvas.height / 2;
    this.audio.portal();
    this.shopStock = [0, 1, 2, 3, 4].map((i) => generateItem(new RNG(seed + i + plane.length * 9), Math.max(1, h.level), 0.2));
  }

  spawnWanderers(map: PlaneWorld): void {
    const rng = new RNG(seed + 99 + map.id.length);
    for (let i = 0; i < 6; i++) {
      let x = 0;
      let y = 0;
      for (let t = 0; t < 12; t++) {
        x = rng.float(8, map.w - 8) * TILE;
        y = rng.float(8, map.h - 8) * TILE;
        if (!blocked(map, x, y, 12)) break;
      }
      const id = `wander_${map.id}_${i}`;
      this.ents.push({
        id,
        kind: "npc",
        x,
        y,
        r: 12,
        name: rng.pick(["A baker", "A miller", "A pilgrim", "A caravan guard", "A weary parent", "A hedge-witch"]),
        color: rng.pick(["#c48a62", "#e0b48a", "#8aa0b8", "#6d8a4a"]),
        npc: {
          id,
          name: "Passerby",
          title: "Of Ashenford's edges",
          plane: map.id,
          x: x / TILE,
          y: y / TILE,
          color: "#ccc",
          role: "wanderer",
          start: "hello",
          dialogue: {
            hello: {
              id: "hello",
              speaker: "Passerby",
              text: rng.pick(WANDERER_LINES),
              options: this.wanderOptions(id, rng, map.id),
            },
          },
        },
      });
    }
  }

  wanderOptions(id: string, rng: RNG, plane: PlaneId): DialogueOption[] {
    const opts: DialogueOption[] = [{ label: "I'll be on my way.", next: undefined }];
    if (rng.chance(0.55)) {
      const tmpl = rng.pick(QUEST_TEMPLATES);
      const qid = `gen_${id}`;
      const enemy = rng.pick(["Thornwolves", "shadows", "imps", "sprites"]);
      const place = rng.pick(["the north wood", "the ruin road", "the fen-edge", "the brass ditch"]);
      const detail = tmpl.detail.replace("{n}", String(rng.int(3, 6))).replace("{enemy}", enemy).replace("{place}", place).replace("{item}", rng.pick(["locket", "prayer-bead", "iron key"]));
      opts.unshift({
        label: "You look like you need a blade for hire.",
        next: undefined,
        startQuest: qid,
        setFlag: { [`qdetail_${qid}`]: detail },
      });
      if (!QUESTS.some((q) => q.id === qid)) {
        QUESTS.push({
          id: qid,
          name: rng.pick(tmpl.names),
          plane,
          steps: [detail, "Return to the one who asked."],
          xp: 70,
          gold: rng.int(12, 40),
        });
      }
    }
    opts.unshift({
      label: "Tell me a longer tale. (Speech)",
      next: undefined,
      require: { skill: "speech", skillMin: 2 },
      grantXp: 12,
      grantGold: 5,
    });
    return opts;
  }

  save(silent = false): void {
    if (!this.hero) return;
    saveGame(this.hero, { worldSeed: seed, killed: [...this.killed], looted: [...this.looted], time: this.time });
    if (!silent) toast("The chronicle is bound.");
  }

  setOverlay(o: Overlay): void {
    this.overlay = o;
    show("inventory", o === "inv");
    show("skills", o === "skills");
    show("journal", o === "journal");
    show("character-sheet", o === "char");
    show("map-overlay", o === "map");
    show("pause", o === "pause");
    show("death", o === "death");
    show("victory", o === "victory");
    if (o === "dialogue") show("dialogue", true);
    else closeDialogue();
    const h = this.hero;
    if (h && o === "inv") renderInventory(h, (it) => this.equip(it), (it) => this.drop(it));
    if (h && o === "skills") renderSkills(h, (id) => this.unlock(id));
    if (h && o === "journal") renderJournal(h);
    if (h && o === "char") renderCharacter(h, (id) => this.spend(id));
    if (h && o === "map") {
      $("map-title").textContent = maps.get(h.plane)!.id;
      drawBigMap($("map-canvas") as HTMLCanvasElement, maps.get(h.plane)!, h.x, h.y, h.plane);
    }
  }

  equip(it: Item): void {
    if (!this.hero) return;
    equipItem(this.hero, it);
    renderInventory(this.hero, (i) => this.equip(i), (i) => this.drop(i));
  }

  drop(it: Item): void {
    if (!this.hero) return;
    this.hero.inventory = this.hero.inventory.filter((x) => x !== it);
    if (this.hero.equipped[it.slot] === it) delete this.hero.equipped[it.slot];
    renderInventory(this.hero, (i) => this.equip(i), (i) => this.drop(i));
  }

  unlock(id: string): void {
    if (!this.hero) return;
    if (unlockNode(this.hero, id)) {
      this.audio.level();
      toast("The lattice answers.");
    }
    renderSkills(this.hero, (n) => this.unlock(n));
  }

  spend(id: AbilityId): void {
    if (!this.hero) return;
    spendAttribute(this.hero, id);
    renderCharacter(this.hero, (k) => this.spend(k));
  }

  loop = (ts: number): void => {
    const dt = this.prev ? Math.min(0.033, (ts - this.prev) / 1000) : 0.016;
    this.prev = ts;
    this.time += dt;
    if (this.screen === "play" && this.hero) this.update(dt);
    this.draw();
    this.input.endFrame();
    requestAnimationFrame(this.loop);
  };

  update(dt: number): void {
    const h = this.hero!;
    const map = maps.get(h.plane)!;
    this.handleKeys();
    if (this.overlay !== "none") return;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.dodge = Math.max(0, this.dodge - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.inspireT = Math.max(0, this.inspireT - dt);
    this.rageT = Math.max(0, this.rageT - dt);
    this.wildT = Math.max(0, this.wildT - dt);
    this.stealth = Math.max(0, this.stealth - dt);
    h.flags._inspire = this.inspireT > 0;
    h.flags._rage = this.rageT > 0;
    h.flags._wild = this.wildT > 0;
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, (this.cds[k] ?? 0) - dt);
    const d = derived(h);
    let mx = 0;
    let my = 0;
    if (this.input.keys.has("w") || this.input.keys.has("ArrowUp")) my -= 1;
    if (this.input.keys.has("s") || this.input.keys.has("ArrowDown")) my += 1;
    if (this.input.keys.has("a") || this.input.keys.has("ArrowLeft")) mx -= 1;
    if (this.input.keys.has("d") || this.input.keys.has("ArrowRight")) mx += 1;
    const moving = mx || my;
    const sprint = this.input.keys.has("Shift") && h.stamina > 0;
    const spd = (118 * d.speed + (sprint ? 55 : 0) + (this.rageT ? 20 : 0)) * (this.dodge > 0.15 ? 2.2 : 1);
    if (moving) {
      const len = Math.hypot(mx, my) || 1;
      const dummy: Ent = { id: "p", kind: "player", x: h.x, y: h.y, r: 12 };
      tryMove(map, dummy, (mx / len) * spd * dt, (my / len) * spd * dt);
      h.x = dummy.x;
      h.y = dummy.y;
      const p = this.ents.find((e) => e.id === "player");
      if (p) {
        p.x = h.x;
        p.y = h.y;
      }
      if (sprint) h.stamina = Math.max(0, h.stamina - dt * 28);
      grantSkillXp(h, "survival", dt * 2);
    }
    if (!sprint) h.stamina = Math.min(h.maxStamina, h.stamina + dt * 22);
    h.mana = Math.min(h.maxMana, h.mana + dt * 3.2);
    const aim = this.cam.world(this.input.mouse.x, this.input.mouse.y);
    h.facing = ang(h, aim);
    if (tileAt(map, h.x, h.y) === 3) h.hp -= dt * 8;
    if (tileAt(map, h.x, h.y) === 2) h.stamina = Math.max(0, h.stamina - dt * 10);

    if (this.input.mouse.clicked && this.atkCd <= 0) this.primary(aim);
    if (this.input.just(" ") && h.stamina >= 18) this.doDodge(mx, my);
    const cls = classById(h.classId);
    cls.abilities.forEach((a, i) => {
      const key = String(i + 1);
      if (this.input.just(key)) this.cast(a.id, aim);
    });

    this.updateEnemies(dt, map);
    this.updateProjs(dt, map);
    this.pickups();
    this.interactPrompt();
    if (this.input.just("e") || this.input.just("f")) this.interact();
    this.parts = this.parts.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      return p.life > 0;
    });
    this.floating = this.floating.filter((f) => {
      f.t -= dt;
      f.y -= 18 * dt;
      return f.t > 0;
    });
    this.cam.follow(h.x, h.y, this.canvas.width, this.canvas.height, dt);
    if (h.hp <= 0) this.die();
    this.saveAcc += dt;
    if (this.saveAcc > 25) {
      this.saveAcc = 0;
      this.save(true);
    }
    updateHud(h);
    drawMinimap($("minimap-canvas") as HTMLCanvasElement, map, this.ents, h.x, h.y);
    drawPortrait($("hud-portrait") as HTMLCanvasElement, h);
  }

  handleKeys(): void {
    if (this.screen !== "play") return;
    const tog = (k: string, o: Overlay) => {
      if (this.input.just(k)) this.setOverlay(this.overlay === o ? "none" : o);
    };
    if (this.input.just("Escape")) {
      if (this.overlay === "none") this.setOverlay("pause");
      else if (this.overlay !== "death" && this.overlay !== "victory") this.setOverlay("none");
    }
    if (this.overlay === "dialogue") return;
    tog("i", "inv");
    tog("k", "skills");
    tog("j", "journal");
    tog("c", "char");
    tog("m", "map");
  }

  primary(aim: { x: number; y: number }): void {
    const h = this.hero!;
    const d = derived(h);
    this.atkCd = d.style === "melee" ? 0.38 : 0.48;
    this.audio.swing();
    grantSkillXp(h, d.style === "ranged" ? "archery" : d.style === "magic" ? "arcane" : "melee", 6);
    if (d.style === "melee") this.meleeHit(aim, false);
    else this.shoot(aim, d.style === "magic" ? "#62b0ff" : "#e8dcc4", 1);
    if (this.twin) {
      this.twin = false;
      this.shoot(aim, "#ff6b81", 1);
    }
  }

  meleeHit(aim: { x: number; y: number }, sneak: boolean): void {
    const h = this.hero!;
    const rng = new RNG((this.time * 1000) | 0);
    const a = ang(h, aim);
    let any = false;
    for (const e of this.ents) {
      if (e.kind !== "enemy" || (e.hp ?? 0) <= 0) continue;
      const dd = dist(h, e);
      const ea = ang(h, e);
      let da = Math.abs(ea - a);
      while (da > Math.PI) da = Math.abs(da - Math.PI * 2);
      const reach = 46 + (hasNode(h, "f5") ? 18 : 0);
      if (dd < reach + e.r && da < 0.9) {
        const { dmg, crit } = attackDamage(h, rng, { sneak: sneak || this.stealth > 0 });
        this.hurt(e, dmg, crit);
        any = true;
        if (!hasNode(h, "f5")) break;
      }
    }
    if (!any) burst(this.parts, h.x + Math.cos(a) * 28, h.y + Math.sin(a) * 28, "#e8dcc4", 4);
  }

  shoot(aim: { x: number; y: number }, color: string, dmgMul: number): void {
    const h = this.hero!;
    const a = ang(h, aim);
    this.ents.push({
      id: `pr_${this.time}`,
      kind: "proj",
      x: h.x,
      y: h.y,
      r: 5,
      vx: Math.cos(a) * 420,
      vy: Math.sin(a) * 420,
      life: 0.9,
      color,
      hp: dmgMul,
    });
  }

  doDodge(mx: number, my: number): void {
    const h = this.hero!;
    const extra = treeStat(h, "dodgeTime");
    const cost = 18 * (1 + (treeStat(h, "stamCost") || 0));
    if (h.stamina < cost) return;
    h.stamina -= cost;
    this.dodge = 0.28;
    this.invuln = 0.28 + extra;
    const a = mx || my ? Math.atan2(my, mx) : h.facing;
    const dummy: Ent = { id: "p", kind: "player", x: h.x, y: h.y, r: 12 };
    tryMove(maps.get(h.plane)!, dummy, Math.cos(a) * 70, Math.sin(a) * 70);
    h.x = dummy.x;
    h.y = dummy.y;
    if (treeStat(h, "dodgeStam")) h.stamina = Math.min(h.maxStamina, h.stamina + treeStat(h, "dodgeStam"));
    grantSkillXp(h, "stealth", 4);
  }

  cast(id: string, aim: { x: number; y: number }): void {
    const h = this.hero!;
    const cls = classById(h.classId);
    const def = cls.abilities.find((a) => a.id === id);
    if (!def) return;
    if (def.requiresNode && !hasNode(h, def.requiresNode)) {
      toast("The lattice does not yet open that path.");
      return;
    }
    if ((this.cds[id] ?? 0) > 0) return;
    if (h.mana < def.mana || h.stamina < def.stamina) {
      toast("Not enough breath or will.");
      return;
    }
    h.mana -= def.mana;
    h.stamina -= def.stamina;
    this.cds[id] = def.cooldown;
    const rng = new RNG((this.time * 999) | 0);
    if (id === "second_wind" || id === "cure" || id === "healword" || id === "lay_hands") {
      const amt = 16 + h.level * 3 + (id === "lay_hands" ? 24 : 0);
      h.hp = Math.min(h.maxHp, h.hp + amt);
      toast(`You mend ${amt} wounds.`);
      grantSkillXp(h, "divine", 8);
      return;
    }
    if (id === "rage") {
      this.rageT = 8;
      toast("Rage.");
      return;
    }
    if (id === "inspire") {
      this.inspireT = 6;
      toast("A brighter measure.");
      grantSkillXp(h, "speech", 6);
      return;
    }
    if (id === "wildshape") {
      this.wildT = 8;
      toast("The wild answers.");
      return;
    }
    if (id === "smoke") {
      this.stealth = 4;
      this.invuln = 0.6;
      toast("Gone.");
      return;
    }
    if (id === "twin") {
      this.twin = true;
      toast("The spell splits.");
      return;
    }
    if (id === "blink") {
      const dummy: Ent = { id: "p", kind: "player", x: h.x, y: h.y, r: 12 };
      const a = ang(h, aim);
      tryMove(maps.get(h.plane)!, dummy, Math.cos(a) * 140, Math.sin(a) * 140);
      h.x = dummy.x;
      h.y = dummy.y;
      burst(this.parts, h.x, h.y, "#62b0ff", 16);
      return;
    }
    if (id === "empty") {
      this.invuln = 1.4;
      toast("Nothing can hold nothing.");
      return;
    }
    if (id === "mark") {
      this.marked = this.nearestEnemy(260);
      toast(this.marked ? `Marked: ${this.marked.name}` : "No prey in sight.");
      return;
    }
    if (id === "hex") {
      this.hexed = this.nearestEnemy(260);
      toast(this.hexed ? "Hexed." : "Nothing to curse.");
      return;
    }
    if (id === "fireball" || id === "dawnburst" || id === "opus" || id === "roots" || id === "sbreath" || id === "radiance") {
      const a = ang(h, aim);
      const tx = h.x + Math.cos(a) * 180;
      const ty = h.y + Math.sin(a) * 180;
      burst(this.parts, tx, ty, "#ff9a3c", 22);
      this.cam.shake = 10;
      for (const e of this.ents) {
        if (e.kind === "enemy" && dist({ x: tx, y: ty }, e) < 90) {
          const { dmg, crit } = attackDamage(h, rng);
          this.hurt(e, Math.round(dmg * 1.4), crit);
        }
      }
      grantSkillXp(h, "arcane", 10);
      return;
    }
    if (id === "smite") {
      this.meleeHit(aim, false);
      const e = this.nearestEnemy(50);
      if (e) {
        const { dmg, crit } = attackDamage(h, rng, { smite: true });
        this.hurt(e, dmg, crit);
      }
      grantSkillXp(h, "divine", 8);
      return;
    }
    if (id === "flurry" || id === "action_surge") {
      this.meleeHit(aim, false);
      this.meleeHit(aim, false);
      return;
    }
    if (id === "sneak") {
      this.meleeHit(aim, true);
      return;
    }
    if (id === "stun") {
      this.meleeHit(aim, false);
      const e = this.nearestEnemy(48);
      if (e) e.stunned = 1.6;
      return;
    }
    if (id === "reckless") {
      this.meleeHit(aim, false);
      return;
    }
    if (id === "volley") {
      for (let i = -2; i <= 2; i++) {
        const a = ang(h, aim) + i * 0.12;
        this.ents.push({
          id: `v_${this.time}_${i}`,
          kind: "proj",
          x: h.x,
          y: h.y,
          r: 4,
          vx: Math.cos(a) * 400,
          vy: Math.sin(a) * 400,
          life: 0.8,
          color: "#e8dcc4",
          hp: 1,
        });
      }
      return;
    }
    this.shoot(aim, "#c084fc", id === "blast" ? 1.15 : 1);
    grantSkillXp(h, "occult", 5);
  }

  nearestEnemy(r: number): Ent | undefined {
    const h = this.hero!;
    let best: Ent | undefined;
    let bd = r;
    for (const e of this.ents) {
      if (e.kind !== "enemy" || (e.hp ?? 0) <= 0) continue;
      const d = dist(h, e);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  hurt(e: Ent, dmg: number, crit: boolean): void {
    if (e === this.marked) dmg = Math.round(dmg * 1.18);
    if (e === this.hexed) dmg += 4;
    if (this.hero && treeStat(this.hero, "execute") && (e.hp ?? 0) < (e.maxHp ?? 1) * 0.5) dmg += treeStat(this.hero, "execute");
    e.hp = (e.hp ?? 0) - dmg;
    e.hurt = 0.15;
    this.audio.hit();
    this.cam.shake = Math.min(14, 4 + dmg * 0.08);
    this.floating.push({ x: e.x, y: e.y - 20, t: 0.6, text: crit ? `${dmg}!` : String(dmg), color: crit ? "#ffb347" : "#e8dcc4" });
    burst(this.parts, e.x, e.y, e.color ?? "#a33", 8);
    const h = this.hero!;
    const ls = treeStat(h, "lifesteal") + (h.equipped.mainhand?.affixes.reduce((s, a) => s + (a.stats.lifesteal ?? 0), 0) ?? 0);
    if (ls) h.hp = Math.min(h.maxHp, h.hp + ls * 0.2);
    if ((e.hp ?? 0) <= 0) this.kill(e);
  }

  kill(e: Ent): void {
    const h = this.hero!;
    const def = e.def;
    this.killed.add(e.id);
    if (def) {
      const { levels } = grantXp(h, def.xp);
      grantSkillXp(h, "defense", 3);
      if (levels) {
        this.audio.level();
        show("levelup", true);
        setTimeout(() => show("levelup", false), 1600);
        toast(`Level ${h.level}. The planes notice.`);
      }
      if (treeStat(h, "onKillHp")) h.hp = Math.min(h.maxHp, h.hp + treeStat(h, "onKillHp"));
      if (treeStat(h, "rageHeal") && this.rageT > 0) h.hp = Math.min(h.maxHp, h.hp + treeStat(h, "rageHeal"));
      const rng = new RNG(hashStr(e.id) + h.level);
      if (rng.chance(0.55 + h.level * 0.01) || def.boss) {
        const it = generateItem(rng, h.level + (def.boss ? 2 : 0), def.boss ? 1 : 0);
        this.ents.push({ id: `loot_${e.id}`, kind: "loot", x: e.x, y: e.y, r: 10, color: rarityColor(it.rarity), dropId: it.id, name: it.name });
        this.drops[it.id] = it;
      }
      if (def.shard) {
        if (addShard(h, def.shard)) toast(`A shard of the Circlet answers: ${def.shard}.`);
        if (def.shard === "shadowfell") {
          const q = h.questLog.find((x) => x.id === "graveyard");
          if (q) q.step = 1;
        }
      }
      if (e.id === "bandit_leader") {
        const q = h.questLog.find((x) => x.id === "bandits");
        if (q) q.step = 1;
        h.flags.bandits_dead = true;
      }
      if (e.id === "blink_cross") h.flags.blink_dead = true;
      if (e.id === "boss_amalgam" || def.id === "amalgam") this.win();
      const gens = h.questLog.filter((q) => q.id.startsWith("gen_") && !q.done);
      if (gens.length) {
        this.genKills += 1;
        if (this.genKills >= 4) {
          gens.forEach((q) => {
            q.step = Math.max(q.step, 1);
          });
          this.genKills = 0;
          toast("A side task can be turned in.");
        }
      }
    }
    this.ents = this.ents.filter((x) => x !== e);
  }

  updateEnemies(dt: number, map: PlaneWorld): void {
    const h = this.hero!;
    for (const e of this.ents) {
      if (e.kind !== "enemy" || !e.def) continue;
      e.hurt = Math.max(0, (e.hurt ?? 0) - dt);
      e.stunned = Math.max(0, (e.stunned ?? 0) - dt);
      if (e.stunned > 0) continue;
      e.atkCd = Math.max(0, (e.atkCd ?? 0) - dt);
      const d = dist(h, e);
      const aggro = e.def.aggro * (this.stealth > 0 ? 0.35 : 1);
      if (d < aggro) {
        const a = ang(e, h);
        const sp = e.def.speed * (e.def.boss ? 1 : 1);
        if (d > e.def.range - 4) tryMove(map, e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
        if (d < e.def.range + 8 && (e.atkCd ?? 0) <= 0) {
          e.atkCd = e.def.boss ? 1.1 : 1.35;
          if (this.invuln <= 0) {
            let dmg = e.def.damage + (e.hexed ? -2 : 0);
            dmg = Math.max(1, dmg - Math.floor(derived(h).armor * 0.12));
            if (this.rageT > 0) dmg = Math.round(dmg * 0.75);
            if (treeStat(h, "aura")) dmg = Math.max(1, dmg - treeStat(h, "aura") * 0.15);
            h.hp -= dmg;
            grantSkillXp(h, "defense", 2);
            this.cam.shake = 6;
            this.floating.push({ x: h.x, y: h.y - 18, t: 0.5, text: String(Math.round(dmg)), color: "#ff6b81" });
            if (h.raceId === "halforc" && h.hp <= 0 && !h.flags._relentless) {
              h.flags._relentless = true;
              h.hp = 1;
              toast("Relentless. You refuse.");
            }
          }
        }
        if (e.def.id === "blinkdog" && Math.random() < dt * 0.4) {
          tryMove(map, e, Math.cos(a) * 80, Math.sin(a) * 80);
        }
      } else {
        e.ai = (e.ai ?? 0) + dt;
        if (e.ai > 1.6) {
          e.ai = 0;
          tryMove(map, e, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
        }
      }
    }
  }

  updateProjs(dt: number, map: PlaneWorld): void {
    const h = this.hero!;
    for (const p of [...this.ents]) {
      if (p.kind !== "proj") continue;
      p.life = (p.life ?? 0) - dt;
      p.x += (p.vx ?? 0) * dt;
      p.y += (p.vy ?? 0) * dt;
      if ((p.life ?? 0) <= 0 || blocked(map, p.x, p.y, 2)) {
        this.ents = this.ents.filter((x) => x !== p);
        continue;
      }
      for (const e of this.ents) {
        if (e.kind !== "enemy" || (e.hp ?? 0) <= 0) continue;
        if (dist(p, e) < e.r + p.r + 4) {
          const { dmg, crit } = attackDamage(h, new RNG((this.time * 100) | 0));
          this.hurt(e, Math.round(dmg * (p.hp ?? 1)), crit);
          if (treeStat(h, "chain")) {
            const other = this.ents.find((o) => o.kind === "enemy" && o !== e && dist(e, o) < 90);
            if (other) this.hurt(other, Math.round(dmg * 0.45), false);
          }
          this.ents = this.ents.filter((x) => x !== p);
          break;
        }
      }
    }
  }

  pickups(): void {
    const h = this.hero!;
    for (const e of [...this.ents]) {
      if (e.kind !== "loot") continue;
      if (dist(h, e) < 28) {
        const it = e.dropId ? this.drops[e.dropId] : undefined;
        if (it) {
          h.inventory.push(it);
          toast(`${it.name} (${it.rarity})`);
          this.audio.pickup();
        }
        this.ents = this.ents.filter((x) => x !== e);
      }
    }
  }

  nearInteract(): Ent | undefined {
    const h = this.hero!;
    let best: Ent | undefined;
    let bd = 46;
    for (const e of this.ents) {
      if (!["npc", "portal", "chest", "shrine", "totem"].includes(e.kind)) continue;
      const d = dist(h, e);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    const map = maps.get(h.plane)!;
    for (const lm of map.landmarks) {
      if (lm.kind !== "quest" && lm.kind !== "building") continue;
      const d = Math.hypot(h.x - lm.x * TILE, h.y - lm.y * TILE);
      if (d < bd && lm.id === "gate") {
        return { id: "gate", kind: "prop", x: lm.x * TILE, y: lm.y * TILE, r: 20, name: "The First Gate" };
      }
    }
    return best;
  }

  interactPrompt(): void {
    const e = this.nearInteract();
    const el = $("interact-prompt");
    if (!e) {
      el.classList.add("hidden");
      return;
    }
    el.classList.remove("hidden");
    el.textContent = `E  ${e.name ?? e.kind}`;
  }

  interact(): void {
    const h = this.hero!;
    const e = this.nearInteract();
    if (!e) return;
    if (e.kind === "npc" && e.npc) {
      const qid = `gen_${e.npc.id}`;
      const gq = h.questLog.find((x) => x.id === qid && !x.done && x.step >= 1);
      if (gq) {
        const r = completeQuest(h, qid, new RNG(this.time * 10));
        toast(`They press coin into your palm. +${r.gold}g`);
      }
      const start = this.dialogueStart(e.npc.id, e.npc.start);
      const node = e.npc.dialogue[start] ?? e.npc.dialogue[e.npc.start];
      if (node) this.beginTalk(e.npc.id, node);
      grantSkillXp(h, "speech", 4);
      return;
    }
    if (e.kind === "portal" && e.plane) {
      this.enter(e.plane, true);
      toast(`You step into ${e.plane}.`);
      return;
    }
    if (e.kind === "shrine") {
      h.hp = h.maxHp;
      h.mana = h.maxMana;
      h.shrine = { plane: h.plane, x: e.x, y: e.y };
      h.flags._relentless = false;
      toast("The shrine learns your name.");
      this.save();
      return;
    }
    if (e.kind === "chest") {
      this.looted.add(e.id);
      const it = generateItem(new RNG(hashStr(e.id)), h.level + 1, 0.6);
      h.inventory.push(it);
      toast(`Inside: ${it.name}`);
      this.ents = this.ents.filter((x) => x !== e);
      return;
    }
    if (e.kind === "totem") {
      this.looted.add("totem");
      h.flags.pip_resolved = true;
      const q = h.questLog.find((x) => x.id === "pip_toy");
      if (q) q.step = 1;
      toast("The whisper snaps like a twig.");
      this.ents = this.ents.filter((x) => x !== e);
      burst(this.parts, e.x, e.y, "#6d8a4a", 20);
      return;
    }
    if (e.id === "gate") this.gateTalk();
  }

  dialogueStart(npcId: string, fallback: string): string {
    const h = this.hero!;
    if (npcId === "mira" && h.flags.calen_found && !h.questLog.find((q) => q.id === "mira_brother")?.done) return "found_calen";
    if (npcId === "brann" && h.flags.got_iron) return "done";
    if (npcId === "rhew" && h.flags.bandits_dead) return "done";
    if (npcId === "pip" && h.flags.pip_resolved) return "done";
    return fallback;
  }

  beginTalk(npcId: string, node: DialogueNode): void {
    this.setOverlay("dialogue");
    const run = (n: DialogueNode) => {
      openDialogue(n, this.hero!, (opt) => this.pickOption(npcId, opt, run));
    };
    run(node);
  }

  pickOption(npcId: string, opt: DialogueOption, run: (n: DialogueNode) => void): void {
    const h = this.hero!;
    if (!optionAllowed(h, opt)) return;
    if (opt.skillCheck) {
      const sk = h.skills[opt.skillCheck.skill].level + Math.floor((h.abilities.cha - 10) / 2);
      const ok = sk + Math.random() * 6 >= opt.skillCheck.dc;
      grantSkillXp(h, opt.skillCheck.skill, ok ? 12 : 4);
      const next = ok ? opt.skillCheck.success : opt.skillCheck.fail;
      toast(ok ? "The words land." : "They do not believe you.");
      const npc = npcById(npcId) ?? this.ents.find((e) => e.id === npcId)?.npc;
      const node = npc?.dialogue[next];
      if (node) run(node);
      else this.setOverlay("none");
      return;
    }
    if (opt.setFlag) Object.assign(h.flags, opt.setFlag);
    if (opt.startQuest) {
      const detail = String(h.flags[`qdetail_${opt.startQuest}`] ?? "");
      if (startQuest(h, opt.startQuest, detail)) toast(`Begun: ${questById(opt.startQuest)?.name ?? "a task"}`);
    }
    if (opt.advanceQuest) advanceQuest(h, opt.advanceQuest);
    if (opt.completeQuest) {
      const r = completeQuest(h, opt.completeQuest, new RNG(this.time * 100));
      toast(`Complete. +${r.xp} XP, ${r.gold} gold, ${r.item?.name}`);
    }
    if (opt.grantXp) grantXp(h, opt.grantXp);
    if (opt.grantGold) h.gold += opt.grantGold;
    if (opt.heal) {
      h.hp = h.maxHp;
      toast("Warmth returns.");
    }
    if (opt.giveLoot) {
      const it = generateItem(new RNG(this.time | 0), h.level + 2, 1);
      h.inventory.push(it);
      toast(it.name);
    }
    if (opt.shop) {
      this.openShop();
      return;
    }
    if (opt.travel) {
      this.setOverlay("none");
      this.enter(opt.travel, true);
      return;
    }
    if (opt.next) {
      const npc = npcById(npcId) ?? this.ents.find((e) => e.id === npcId)?.npc;
      const node = npc?.dialogue[opt.next];
      if (node) run(node);
      else this.setOverlay("none");
    } else this.setOverlay("none");
  }

  openShop(): void {
    this.setOverlay("none");
    const h = this.hero!;
    const it = this.shopStock[0];
    if (!it) {
      toast("Sold through.");
      return;
    }
    const cost = 20 + it.ilvl * 12 + 15;
    if (h.gold < cost) {
      toast(`They want ${cost} gold.`);
      return;
    }
    h.gold -= cost;
    h.inventory.push(it);
    this.shopStock.shift();
    toast(`Bought ${it.name} for ${cost}g.`);
  }

  gateTalk(): void {
    const h = this.hero!;
    if (h.shards.length >= 5) {
      toast("The Circlet drinks the shards. Something unsealed claws through.");
      if (!this.ents.some((e) => e.def?.id === "amalgam")) {
        const def = enemyById("amalgam");
        this.ents.push({
          id: "boss_amalgam",
          kind: "enemy",
          x: h.x + 80,
          y: h.y,
          r: 26,
          hp: def.hp,
          maxHp: def.hp,
          def,
          color: def.color,
          name: def.name,
          unique: true,
          atkCd: 0,
        });
      }
      return;
    }
    toast(`The Gate is a wound. Shards held: ${h.shards.length}/5.`);
    if (!h.questLog.some((q) => q.id === "main_gate")) startQuest(h, "main_gate");
    const q = h.questLog.find((x) => x.id === "main_gate");
    if (q && q.step < 1) q.step = 1;
  }

  die(): void {
    if (this.overlay === "death") return;
    const h = this.hero!;
    h.gold = Math.max(0, Math.floor(h.gold * 0.7));
    this.setOverlay("death");
  }

  respawn(): void {
    const h = this.hero!;
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    h.stamina = h.maxStamina;
    h.plane = h.shrine.plane;
    h.x = h.shrine.x;
    h.y = h.shrine.y;
    this.enter(h.plane, false);
    this.setOverlay("none");
    toast("You wake tasting iron and incense.");
  }

  win(): void {
    const h = this.hero!;
    $("victory-text").textContent =
      `${h.name} the ${h.raceId} ${h.classId} bound five planes with a repaired sentence. Ashenford's sky remembers how to be only one color. For now.`;
    this.setOverlay("victory");
  }

  draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.screen !== "play" || !this.hero) return;
    const map = maps.get(this.hero.plane)!;
    ctx.save();
    this.cam.apply(ctx);
    drawWorld(ctx, map, this.cam.x, this.cam.y, this.canvas.width, this.canvas.height, this.time);
    const ordered = [...this.ents].sort((a, b) => a.y - b.y);
    for (const e of ordered) {
      if (e.kind === "player") {
        drawEnt(ctx, { ...e, x: this.hero.x, y: this.hero.y }, this.time, this.hero);
      } else drawEnt(ctx, e, this.time);
    }
    drawParticles(ctx, this.parts);
    for (const f of this.floating) {
      ctx.globalAlpha = Math.max(0, f.t * 2);
      ctx.fillStyle = f.color;
      ctx.font = "bold 16px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function rarityColor(r: Item["rarity"]): string {
  return {
    common: "#d7d2c8",
    uncommon: "#5dcc7a",
    rare: "#62b0ff",
    epic: "#c084fc",
    legendary: "#ffb347",
    artifact: "#ff6b81",
  }[r];
}

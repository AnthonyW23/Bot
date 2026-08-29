import { CLASSES, RACES, ABILITY_NAMES, abilityRegistry } from "./data/codex";
import { SKILL_LABELS, questById, PLANE_META } from "./data/story";
import { canUnlock, derived, optionAllowed } from "./systems";
import type { AbilityDef, DialogueNode, DialogueOption, Hero, Item, SkillId } from "./types";

export const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function show(id: string, on = true): void {
  $(id).classList.toggle("hidden", !on);
}

export function toast(msg: string): void {
  const stack = $("toast-stack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

export function bindTitle(onNew: () => void, onContinue: () => void, hasSave: boolean): void {
  $("btn-new").onclick = onNew;
  $("btn-continue").onclick = onContinue;
  show("btn-continue", hasSave);
}

export function fillCreate(
  onChange: () => void,
): { race: () => string; cls: () => string; name: () => string } {
  const raceList = $("race-list");
  const classList = $("class-list");
  raceList.innerHTML = "";
  classList.innerHTML = "";
  RACES.forEach((r, i) => {
    const b = document.createElement("button");
    b.className = `choice${i === 0 ? " selected" : ""}`;
    b.dataset.id = r.id;
    b.innerHTML = `<strong>${r.name}</strong><small>${r.lore}</small>`;
    b.onclick = () => {
      raceList.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
      b.classList.add("selected");
      onChange();
    };
    raceList.appendChild(b);
  });
  CLASSES.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = `choice${i === 4 ? " selected" : ""}`;
    b.dataset.id = c.id;
    b.innerHTML = `<strong>${c.name}</strong><small>${c.lore}</small>`;
    b.onclick = () => {
      classList.querySelectorAll(".choice").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      onChange();
    };
    classList.appendChild(b);
  });
  $("hero-name").oninput = onChange;
  return {
    race: () => (raceList.querySelector(".selected") as HTMLElement).dataset.id!,
    cls: () => (classList.querySelector(".selected") as HTMLElement).dataset.id!,
    name: () => ($<HTMLInputElement>("hero-name").value),
  };
}

export function renderCreateSummary(heroLike: { raceId: string; classId: string; abilities: Hero["abilities"] }): void {
  const race = RACES.find((r) => r.id === heroLike.raceId)!;
  const cls = CLASSES.find((c) => c.id === heroLike.classId)!;
  $("create-summary").innerHTML = `<p><strong>${race.name} ${cls.name}</strong></p><p class="muted">${race.traits.join(" · ")}</p>`;
}

export function updateHud(h: Hero): void {
  const hp = $("hp-fill");
  hp.style.width = `${(h.hp / h.maxHp) * 100}%`;
  $("hp-text").textContent = `${Math.ceil(h.hp)} / ${h.maxHp}`;
  $("mana-fill").style.width = `${(h.mana / Math.max(1, h.maxMana)) * 100}%`;
  $("mana-text").textContent = `${Math.ceil(h.mana)} / ${h.maxMana}`;
  $("stam-fill").style.width = `${(h.stamina / h.maxStamina) * 100}%`;
  $("stam-text").textContent = `${Math.ceil(h.stamina)}`;
  const need = Math.floor(90 * Math.pow(h.level, 1.42));
  $("xp-fill").style.width = `${(h.xp / need) * 100}%`;
  $("xp-text").textContent = `Lv ${h.level}`;
  $("plane-badge").textContent = PLANE_META[h.plane].name;
  const bar = $("hotbar");
  bar.innerHTML = "";
  const registry = abilityRegistry(h.classId, h.raceId);
  h.hotbar.forEach((abilityId, i) => {
    const d = document.createElement("div");
    const ability = abilityId ? registry.find((a) => a.id === abilityId) : undefined;
    const locked = ability?.requiresNode && !h.treeUnlocked.includes(ability.requiresNode);
    d.className = "hotkey" + (locked ? " cooling" : "") + (ability ? "" : " empty");
    d.innerHTML = `<b>${i + 1}</b>${ability ? ability.name : "—"}`;
    bar.appendChild(d);
  });
  const q = h.questLog.find((x) => !x.done);
  const tr = $("quest-tracker");
  if (!q) {
    tr.innerHTML = `<h4>Chronicle</h4><div>Speak with Mira at the Cracked Stein.</div>`;
  } else {
    const def = questById(q.id);
    const step = def?.steps[q.step] ?? q.detail ?? "Continue.";
    tr.innerHTML = `<h4>${def?.name ?? "Side task"}</h4><div>${step}</div><div class="muted">${h.shards.length}/5 shards</div>`;
  }
}

export function openDialogue(node: DialogueNode, hero: Hero, onPick: (o: DialogueOption) => void): void {
  show("dialogue", true);
  $("dlg-speaker").textContent = node.speaker;
  $("dlg-text").textContent = node.text;
  const box = $("dlg-options");
  box.innerHTML = "";
  node.options.forEach((o) => {
    const b = document.createElement("button");
    b.className = "dlg-opt";
    const ok = optionAllowed(hero, o);
    b.disabled = !ok;
    b.innerHTML = o.label + (o.require?.skill ? ` <span class="req">[${SKILL_LABELS[o.require.skill]}]</span>` : "");
    b.onclick = () => onPick(o);
    box.appendChild(b);
  });
}

export function closeDialogue(): void {
  show("dialogue", false);
}

export function renderInventory(h: Hero, onEquip: (it: Item) => void, onDrop: (it: Item) => void): void {
  const slots = $("equip-slots");
  slots.innerHTML = "";
  (["mainhand", "offhand", "armor", "helm", "cloak", "ring", "amulet"] as const).forEach((s) => {
    const it = h.equipped[s];
    const d = document.createElement("div");
    d.className = "slot";
    d.innerHTML = `<strong>${s}</strong><div class="${it ? "r-" + it.rarity : ""}">${it ? it.name : "—"}</div>`;
    slots.appendChild(d);
  });
  const grid = $("inv-grid");
  grid.innerHTML = "";
  h.inventory.forEach((it) => {
    const d = document.createElement("div");
    d.className = `inv-item r-${it.rarity}`;
    d.textContent = it.name;
    d.onclick = () => onEquip(it);
    d.oncontextmenu = (e) => {
      e.preventDefault();
      onDrop(it);
    };
    d.onmouseenter = (e) => tip(itemTip(it), e.clientX, e.clientY);
    d.onmouseleave = hideTip;
    grid.appendChild(d);
  });
  $("inv-detail").innerHTML = `<p>Gold: ${h.gold}</p><p class="muted">${h.inventory.length} items</p>`;
}

export function itemTip(it: Item): string {
  const aff = it.affixes.map((a) => a.name).join(", ");
  return `<strong class="r-${it.rarity}">${it.name}</strong><br/>${it.rarity} ${it.slot}<br/>${it.damage ? `Damage ${it.damage}<br/>` : ""}${it.armor ? `Armor ${it.armor}<br/>` : ""}${aff}<br/><em>${it.lore ?? ""}</em>`;
}

export function renderSkills(
  h: Hero,
  onNode: (id: string) => void,
  onBind?: (slot: number, abilityId: string | null) => void,
): void {
  $("skill-points-label").textContent = `${h.skillPoints} skill point${h.skillPoints === 1 ? "" : "s"} · class lattice and use-based skills`;
  const cls = CLASSES.find((c) => c.id === h.classId)!;
  const svg = document.getElementById("skill-lines") as unknown as SVGSVGElement;
  const wrap = $("skill-tree-wrap");
  const w = wrap.clientWidth || 700;
  const ht = wrap.clientHeight || 420;
  svg.setAttribute("viewBox", `0 0 ${w} ${ht}`);
  svg.innerHTML = "";
  cls.tree.forEach((n) => {
    n.requires.forEach((r) => {
      const p = cls.tree.find((t) => t.id === r);
      if (!p) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String((p.x / 100) * w));
      line.setAttribute("y1", String((p.y / 100) * ht));
      line.setAttribute("x2", String((n.x / 100) * w));
      line.setAttribute("y2", String((n.y / 100) * ht));
      line.setAttribute("stroke", h.treeUnlocked.includes(n.id) ? "#c6a15b" : "#5a4030");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);
    });
  });
  const nodes = $("skill-nodes");
  nodes.innerHTML = "";
  cls.tree.forEach((n) => {
    const b = document.createElement("button");
    const owned = h.treeUnlocked.includes(n.id);
    b.className = "tree-node" + (owned ? " owned" : canUnlock(h, n.id) ? "" : " locked");
    b.style.left = n.x + "%";
    b.style.top = n.y + "%";
    b.textContent = n.name;
    b.title = n.desc;
    b.onclick = () => onNode(n.id);
    nodes.appendChild(b);
  });
  const list = $("skill-list");
  list.innerHTML = Object.entries(h.skills)
    .map(([k, v]) => `<div><strong>${SKILL_LABELS[k as SkillId]}</strong> ${v.level}</div>`)
    .join("");
  renderAbilityBinder(h, onBind);
}

// The hotbar binder: every ability the hero owns, with buttons to place it in
// hotbar slots 1–6. Locked abilities (lattice node not yet spent) are dimmed.
function renderAbilityBinder(h: Hero, onBind?: (slot: number, abilityId: string | null) => void): void {
  const wrap = $("ability-binder");
  wrap.innerHTML = "<h3>Hotbar — assign your skills</h3>";
  const registry = abilityRegistry(h.classId, h.raceId);
  registry.forEach((ability: AbilityDef) => {
    const locked = !!ability.requiresNode && !h.treeUnlocked.includes(ability.requiresNode);
    const row = document.createElement("div");
    row.className = "bind-row" + (locked ? " locked" : "");
    const name = document.createElement("div");
    name.className = "bind-name";
    name.innerHTML = `<span>${ability.name}</span><small>${locked ? "Locked — spend a lattice point first" : ability.desc}</small>`;
    row.appendChild(name);
    const slots = document.createElement("div");
    slots.className = "bind-slots";
    for (let i = 0; i < h.hotbar.length; i++) {
      const b = document.createElement("button");
      const active = h.hotbar[i] === ability.id;
      b.className = "bind-slot" + (active ? " active" : "");
      b.textContent = String(i + 1);
      b.disabled = locked || !onBind;
      b.title = active ? `Unbind from slot ${i + 1}` : `Bind to slot ${i + 1}`;
      b.onclick = () => onBind?.(i, active ? null : ability.id);
      slots.appendChild(b);
    }
    row.appendChild(slots);
    wrap.appendChild(row);
  });
}

export function renderJournal(h: Hero): void {
  $("journal-body").innerHTML =
    `<p>Shards: ${h.shards.join(", ") || "none"}</p>` +
    h.questLog
      .map((q) => {
        const d = questById(q.id);
        return `<div><strong>${d?.name ?? q.id}</strong> — ${q.done ? "complete" : d?.steps[q.step] ?? q.detail}</div>`;
      })
      .join("") +
    (h.questLog.length ? "" : "<p class='muted'>No ink on the page yet.</p>");
}

export function renderCharacter(h: Hero, onSpend: (id: keyof Hero["abilities"]) => void): void {
  const d = derived(h);
  const race = RACES.find((r) => r.id === h.raceId)!;
  const cls = CLASSES.find((c) => c.id === h.classId)!;
  $("char-body").innerHTML = `
    <p><strong>${h.name}</strong> · ${race.name} ${cls.name} · Level ${h.level}</p>
    <p>Armor ${d.armor} · Crit ${d.crit.toFixed(0)}% · Gold ${h.gold}</p>
    <p class="muted">${race.lore}</p>
    <div id="abs"></div>
    <p>${h.attributePoints} attribute points</p>`;
  const abs = $("abs");
  (Object.keys(h.abilities) as (keyof Hero["abilities"])[]).forEach((k) => {
    const row = document.createElement("div");
    row.className = "ability-chip";
    row.innerHTML = `<span>${ABILITY_NAMES[k]} ${h.abilities[k]}</span>`;
    if (h.attributePoints > 0) {
      const b = document.createElement("button");
      b.textContent = "+";
      b.onclick = () => onSpend(k);
      row.appendChild(b);
    }
    abs.appendChild(row);
  });
}

function tip(html: string, x: number, y: number): void {
  const t = $("tooltip");
  t.innerHTML = html;
  t.classList.remove("hidden");
  t.style.left = x + 12 + "px";
  t.style.top = y + 12 + "px";
}
function hideTip(): void {
  $("tooltip").classList.add("hidden");
}

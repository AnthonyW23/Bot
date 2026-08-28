import type { DialogueNode, NpcDef, PlaneId, QuestDef } from "../types";

export const SKILL_LABELS = {
  melee: "Melee",
  archery: "Archery",
  defense: "Defense",
  arcane: "Arcane",
  divine: "Divine",
  nature: "Nature",
  occult: "Occult",
  stealth: "Stealth",
  speech: "Speech",
  survival: "Survival",
  crafting: "Crafting",
  perception: "Perception",
};

export const QUESTS: QuestDef[] = [
  {
    id: "main_gate",
    name: "The First Gate",
    main: true,
    steps: [
      "Speak with Mira Venn at the Cracked Stein in Ashenford.",
      "Investigate the Gate ruins east of town and claim the Material shard.",
      "Gather shards from the Feywild, Shadowfell, Nine Hells, and Abyss.",
      "Return five shards to the First Gate and reseal the wound.",
    ],
    xp: 800,
    gold: 250,
  },
  {
    id: "mira_brother",
    name: "The Brother Who Followed Lights",
    plane: "feywild",
    steps: [
      "Hear Mira's worry about her brother Calen.",
      "Find Calen in the Gilded Thicket of the Feywild.",
      "Return word to Mira.",
    ],
    xp: 140,
    gold: 40,
  },
  {
    id: "bandits",
    name: "Road of Knives",
    plane: "material",
    steps: ["Constable Rhew wants the bandit camp broken.", "Slay the camp's leader in the southern woods."],
    xp: 110,
    gold: 35,
  },
  {
    id: "graveyard",
    name: "Quiet the Gray",
    plane: "shadowfell",
    steps: ["Sister Calia asks you to cleanse the graveyard well.", "Defeat the Ashen Castellan in the Shadowfell."],
    xp: 160,
    gold: 50,
  },
  {
    id: "infernal_iron",
    name: "Iron That Remembers Fire",
    plane: "hells",
    steps: ["Brann Ironvein wants infernal iron.", "Return after visiting the Nine Hells."],
    xp: 120,
    gold: 45,
  },
  {
    id: "pip_toy",
    name: "A Toy That Whispers",
    plane: "abyss",
    steps: ["Pip lost a wooden knight near the crater-well.", "Destroy the totem or keep it. Return to Pip."],
    xp: 90,
    gold: 15,
  },
  {
    id: "elowen_hunt",
    name: "Something That Isn't a Wolf",
    plane: "material",
    steps: ["Elowen marked a displacer-sign in the north wood.", "Slay the blink hound that crossed over."],
    xp: 100,
    gold: 30,
  },
  {
    id: "vex_contract",
    name: "A Contract, Unsigned",
    plane: "hells",
    steps: ["Hear Vex's offer.", "Enter the Hells through her circle — or refuse."],
    xp: 80,
    gold: 20,
  },
];

function n(id: string, speaker: string, text: string, options: DialogueNode["options"]): DialogueNode {
  return { id, speaker, text, options };
}

export const NPCS: NpcDef[] = [
  {
    id: "mira",
    name: "Mira Venn",
    title: "Innkeeper of the Cracked Stein",
    plane: "material",
    x: 24.8,
    y: 51.6,
    color: "#c48a62",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Mira Venn", "You look like someone who has slept in worse beds than mine. Sit. The ale is honest, which is more than I can say for the sky of late.", [
        { label: "What's wrong with the sky?", next: "sky" },
        { label: "I need a room, and news.", next: "room" },
        { label: "You seem tired, not just busy. (Speech)", next: "brother", require: { skill: "speech", skillMin: 3 } },
        { label: "Leave her to her work.", next: undefined },
      ]),
      sky: n("sky", "Mira Venn", "A month ago the First Gate east of town cracked like a tooth. Since then: lights in the Thornwood that aren't lanterns. Graves that won't stay shut. A devil drinking in my corner as if she pays rent. And my brother Calen walked toward the standing stones humming a song I don't know.", [
        { label: "Tell me about the Gate.", next: "gate", startQuest: "main_gate", setFlag: { mira_intro: true } },
        { label: "Calen — your brother?", next: "brother", startQuest: "mira_brother" },
        { label: "I'll look into it.", next: "go", startQuest: "main_gate", setFlag: { mira_intro: true } },
      ]),
      room: n("room", "Mira Venn", "Room's yours. News is worse. The Gate's cracked, and people have started praying to whatever answers first.", [
        { label: "Then I'll start at the Gate.", next: "go", startQuest: "main_gate", setFlag: { mira_intro: true } },
        { label: "Who else in town still has their wits?", next: "people" },
      ]),
      people: n("people", "Mira Venn", "Brann at the forge. Sister Calia at the dawn-chapel. Constable Rhew, if you like men who think a sword solves weather. Elowen in the woods. Vex in the corner — don't sign anything. And Pip under the stairs, who should not have found what he found.", [
        { label: "I'll make the rounds.", next: "go" },
      ]),
      brother: n("brother", "Mira Venn", "Calen followed foxfire into the standing stones. The Feywild took him the way a river takes a dropped cup. If you walk those woods, look for a man who laughs a half-second late.", [
        { label: "I'll find him.", next: "go", startQuest: "mira_brother", setFlag: { mira_calen: true } },
        { label: "The Gate first. Then your brother.", next: "gate", startQuest: "main_gate" },
      ]),
      gate: n("gate", "Mira Venn", "The First Gate was a lock the old wardens built between worlds. Someone — or something — turned the key the wrong way. Shards of the Circlet of Binding fell through. Folk say a traveler who gathers them can close it. Folk also say a lot of things after three ales.", [
        { label: "I will gather the shards.", next: "go", startQuest: "main_gate", setFlag: { mira_intro: true, swore_gate: true }, grantXp: 25 },
        { label: "If the pay is right.", next: "pay" },
      ]),
      pay: n("pay", "Mira Venn", "I can offer stew, a bed, and the knowledge that the Abyss leaking into the well is bad for property values. The rest you take from whatever tries to eat you.", [
        { label: "Fair enough.", next: "go", startQuest: "main_gate" },
      ]),
      go: n("go", "Mira Venn", "The Gate stands east, past the broken road. Don't die in a way that makes a mess in my common room.", [
        { label: "I'll be back.", next: undefined },
      ]),
      found_calen: n("found_calen", "Mira Venn", "He sent word? Alive, and late, and laughing. That is Calen. Thank you. The Stein will not charge you again — not for bread, not for rumor.", [
        { label: "Keep a room warm.", next: undefined, completeQuest: "mira_brother", grantGold: 40 },
      ]),
    },
  },
  {
    id: "brann",
    name: "Brann Ironvein",
    title: "Dwarven smith",
    plane: "material",
    x: 27.4,
    y: 51.8,
    color: "#c48a62",
    role: "vendor",
    start: "hello",
    dialogue: {
      hello: n("hello", "Brann Ironvein", "If you're here to waste time, the inn is that way. If you're here because your steel is embarrassed, show me.", [
        { label: "What do you make of the Gate?", next: "gate" },
        { label: "I need gear. (Open trade)", shop: true },
        { label: "You mentioned strange ore.", next: "ore", require: { flag: "mira_intro" } },
        { label: "Good day.", next: undefined },
      ]),
      gate: n("gate", "Brann Ironvein", "Stone should not weep light. That ruin east of town is weeping. I don't like work that ignores the grain of the world.", [
        { label: "Could you use metal from another plane?", next: "ore" },
        { label: "I'll leave you to the anvil.", next: undefined },
      ]),
      ore: n("ore", "Brann Ironvein", "Infernal iron remembers every strike. Bring me a fist of it from the Hells and I'll hammer you something that doesn't flinch when demons do.", [
        { label: "I'll bring it.", next: undefined, startQuest: "infernal_iron", setFlag: { brann_iron: true } },
        { label: "Trade first.", shop: true },
      ]),
      done: n("done", "Brann Ironvein", "Aye. That's the stink of Avernus. Good. Hold still while I make you less mortal.", [
        { label: "I can live with that.", next: undefined, completeQuest: "infernal_iron", giveLoot: true, grantXp: 40 },
      ]),
    },
  },
  {
    id: "calia",
    name: "Sister Calia",
    title: "Priest of the Dawnfather",
    plane: "material",
    x: 21.6,
    y: 51.4,
    color: "#f0d48a",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Sister Calia", "Light on your path. Mine has been thin of late. The graveyard south of town opened like an eye, and what looked back was not the Dawnfather.", [
        { label: "Can you heal me?", heal: true, next: "healed" },
        { label: "Tell me about the graveyard.", next: "grave" },
        { label: "I walk with a different kind of vow. (Paladin/Cleric)", next: "vow", require: { class: "paladin" } },
        { label: "I'll not keep you.", next: undefined },
      ]),
      healed: n("healed", "Sister Calia", "The Dawnfather still lends warmth. Spend it on something worth the heat.", [
        { label: "The graveyard.", next: "grave" },
        { label: "Thank you.", next: undefined },
      ]),
      grave: n("grave", "Sister Calia", "A well of silence sits among the stones. Step through and you will find the Shadowfell wearing our dead like coats. A castellan who would not abdicate still sits a throne of ash. End him, and perhaps the graves will remember how to sleep.", [
        { label: "I will quiet them.", next: undefined, startQuest: "graveyard", setFlag: { calia_grave: true } },
      ]),
      vow: n("vow", "Sister Calia", "Then you already know: mercy is a blade you keep sheathed until the moment it must not be. The Castellan was one of us, once.", [
        { label: "I will give him rest, not a sermon.", next: undefined, startQuest: "graveyard", grantXp: 20 },
      ]),
    },
  },
  {
    id: "rhew",
    name: "Constable Rhew",
    title: "Ashenford's last badge",
    plane: "material",
    x: 28.2,
    y: 53.0,
    color: "#8aa0b8",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Constable Rhew", "If you're a pilgrim, keep walking. If you're a blade for hire, the south road has grown a bandit camp like a boil.", [
        { label: "I'll lance it.", next: "job", startQuest: "bandits" },
        { label: "Bandits seem small, with planes tearing.", next: "small" },
        { label: "Not my business.", next: undefined },
      ]),
      job: n("job", "Constable Rhew", "Their leader wears a red scarf and thinks fear is a government. Bring me quiet. I'll bring you coin.", [
        { label: "Done.", next: undefined },
      ]),
      small: n("small", "Constable Rhew", "Demons don't eat the baker if the baker's already been robbed. Order is a pile of small stones. Help me stack.", [
        { label: "I'll deal with the camp.", next: undefined, startQuest: "bandits" },
      ]),
      done: n("done", "Constable Rhew", "The south road has birds on it again. That's a kind of hymn. Here — the town's thanks, such as it is.", [
        { label: "Keep the badge shining.", next: undefined, completeQuest: "bandits", grantGold: 35 },
      ]),
    },
  },
  {
    id: "elowen",
    name: "Elowen",
    title: "Half-elf tracker",
    plane: "material",
    x: 30.5,
    y: 42.8,
    color: "#7ec8a3",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Elowen", "The north wood is lying. Tracks start as wolf and finish as something that skipped three steps of being alive.", [
        { label: "Show me.", next: "hunt" },
        { label: "The Feywild is bleeding through.", next: "fey" },
        { label: "I'll leave the woods to you.", next: undefined },
      ]),
      hunt: n("hunt", "Elowen", "A blink-hound crossed at the standing stones. Kill it before it teaches the local wolves to vanish mid-pounce.", [
        { label: "I'll hunt.", next: undefined, startQuest: "elowen_hunt", setFlag: { elowen_hunt: true } },
      ]),
      fey: n("fey", "Elowen", "Then you already hear the song. Don't follow it without iron in your pocket and your name firmly in your mouth.", [
        { label: "I'll be careful.", next: "hunt" },
      ]),
    },
  },
  {
    id: "vex",
    name: "Vex",
    title: "Tiefling at the corner table",
    plane: "material",
    x: 23.4,
    y: 53.4,
    color: "#7a3a48",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Vex", "Don't flinch. I get that enough from the chapel. I have a circle out behind the mill that opens on Avernus, first layer, very reasonable weather if you like brimstone. I am not your enemy. I am a door with opinions.", [
        { label: "Why would I walk into the Hells?", next: "why" },
        { label: "Open the door.", next: "open", startQuest: "vex_contract" },
        { label: "A tiefling offering Hell. How original. (Tiefling)", next: "kin", require: { race: "tiefling" } },
        { label: "I'll drink elsewhere.", next: undefined },
      ]),
      why: n("why", "Vex", "Because a shard of the Circlet fell into a devil's ledger, and ledgers in the Nine Hells do not misplace things. Also because you look like someone who collects terrible ideas.", [
        { label: "Fine. Show me the circle.", next: "open", startQuest: "vex_contract" },
        { label: "I don't sign.", next: "unsigned" },
      ]),
      unsigned: n("unsigned", "Vex", "Good. Unsigned is my favorite kind of contract. The circle still works. I just like watching people pretend they have a choice.", [
        { label: "Then I'll use it on my terms.", next: undefined, startQuest: "vex_contract", setFlag: { vex_unsigned: true } },
      ]),
      kin: n("kin", "Vex", "Then you know the Hells already have a file on you. Walking in is just paperwork. I'll not charge family the usual lie.", [
        { label: "Open it.", next: "open", grantXp: 15 },
      ]),
      open: n("open", "Vex", "Southwest of town, the stones that look like a failed well. Step through. Don't take the first deal you hear. Or do. I'm not your mother.", [
        { label: "See you on the other side — or not.", next: undefined, setFlag: { vex_circle: true } },
      ]),
    },
  },
  {
    id: "pip",
    name: "Pip",
    title: "Child under the stairs",
    plane: "material",
    x: 25.4,
    y: 53.6,
    color: "#e0b48a",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Pip", "Are you the sort of grown-up who gives things back, or the sort who keeps them because they shine?", [
        { label: "What did you lose?", next: "toy" },
        { label: "Go find Mira.", next: undefined },
      ]),
      toy: n("toy", "Pip", "A wooden knight. I threw it at the well behind the chapel because it whispered. Then the well whispered back. I want it gone, or I want it to be just wood again.", [
        { label: "I'll deal with your knight.", next: undefined, startQuest: "pip_toy", setFlag: { pip_toy: true } },
      ]),
      done: n("done", "Pip", "If it isn't whispering, I can sleep. If it is, I'll hide under further stairs.", [
        { label: "It's handled.", next: undefined, completeQuest: "pip_toy", grantGold: 15 },
      ]),
    },
  },
  {
    id: "solen",
    name: "Archivist Solen",
    title: "Hooded cataloguer",
    plane: "material",
    x: 21.2,
    y: 53.2,
    color: "#9aa7c4",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Archivist Solen", "I collect endings. The Gate is an ending that has begun again. If you walk the planes, bring me observations. I pay in facts, which are rarer than gold.", [
        { label: "What do you know of the Circlet?", next: "circlet" },
        { label: "I'm listening.", next: "listen" },
        { label: "I don't work for mysteries.", next: undefined },
      ]),
      circlet: n("circlet", "Archivist Solen", "Five shards. Five planes. Material, Feywild, Shadowfell, Nine Hells, Abyss. The Circlet of Binding was not jewelry. It was a sentence the cosmos agreed to serve. Complete it, or the sentence becomes a scream.", [
        { label: "Then I'll finish the sentence.", next: undefined, startQuest: "main_gate", grantXp: 20 },
      ]),
      listen: n("listen", "Archivist Solen", "Portals: standing stones north for the Feywild. Grave-well south for the Shadowfell. Vex's circle southwest for Avernus. The crater behind the chapel for the Abyss. The Gate itself, east, for the ending.", [
        { label: "I'll remember.", next: undefined, setFlag: { solen_map: true } },
      ]),
    },
  },
  {
    id: "tam",
    name: "Old Tam",
    title: "Always one cup ahead",
    plane: "material",
    x: 26.8,
    y: 54.2,
    color: "#b9893a",
    role: "wanderer",
    start: "hello",
    wander: true,
    dialogue: {
      hello: n("hello", "Old Tam", "The foxes in the Thornwood have court manners now. One bowed at me. I bowed back. That's how you don't get turned into a harp.", [
        { label: "How do I walk the Feywild and return?", next: "advice" },
        { label: "You're drunk.", next: "drunk" },
      ]),
      advice: n("advice", "Old Tam", "Eat salt before you go. Keep your true name behind your teeth. If a beautiful thing asks you to dance, say you have a stone in your shoe. Works on hags. Works on taxmen.", [
        { label: "I'll remember the stone.", next: undefined, grantXp: 10, setFlag: { tam_advice: true } },
      ]),
      drunk: n("drunk", "Old Tam", "And yet I'm the only one who came back from the lights. Draw your own pint of conclusions.", [
        { label: "Fair.", next: undefined },
      ]),
    },
  },
  {
    id: "calen",
    name: "Calen Venn",
    title: "Late, and laughing",
    plane: "feywild",
    x: 40,
    y: 38,
    color: "#d4b46a",
    role: "story",
    start: "hello",
    dialogue: {
      hello: n("hello", "Calen Venn", "You're from the other side of the song. Tell Mira I didn't drown — I learned a new way to breathe. The hag in the gilt thicket has a shard in her teeth. Ugly jewelry. Someone should take it.", [
        { label: "Come home.", next: "home" },
        { label: "I'll tell Mira you're alive.", next: "word", setFlag: { calen_found: true }, advanceQuest: "mira_brother" },
      ]),
      home: n("home", "Calen Venn", "Soon. Time is sticky here. Take the shard first or the thicket will keep growing through Ashenford's floorboards.", [
        { label: "I'll hunt the hag.", next: undefined, setFlag: { calen_found: true }, advanceQuest: "mira_brother" },
      ]),
      word: n("word", "Calen Venn", "Good. She worries like a fortress. That's why the inn still stands.", [
        { label: "Stay yourself.", next: undefined },
      ]),
    },
  },
  {
    id: "nym",
    name: "Nym of the Unseelie",
    title: "A courtesy with knives",
    plane: "feywild",
    x: 28,
    y: 52,
    color: "#b07ac8",
    role: "wanderer",
    start: "hello",
    dialogue: {
      hello: n("hello", "Nym of the Unseelie", "Mortals always look surprised to be hunted politely. The Summer Court dropped a shard and pretended not to notice. The hag noticed. Hags notice everything except their own faces.", [
        { label: "Where is she?", next: "where" },
        { label: "Do you want the shard?", next: "want" },
      ]),
      where: n("where", "Nym of the Unseelie", "Heart of the Gilded Thicket, where the trees grow in knots like unkept promises. Try not to accept food. Try harder not to refuse it rudely.", [
        { label: "I'll be rude to the hag instead.", next: undefined },
      ]),
      want: n("want", "Nym of the Unseelie", "I want the story of you taking it. That is more valuable than iron. Go on. Be interesting.", [
        { label: "I'll try.", next: undefined, grantXp: 10 },
      ]),
    },
  },
  {
    id: "castellan_shade",
    name: "Gray Chaplain",
    title: "A sermon without a congregation",
    plane: "shadowfell",
    x: 36,
    y: 44,
    color: "#9aa7c4",
    role: "wanderer",
    start: "hello",
    dialogue: {
      hello: n("hello", "Gray Chaplain", "We kept the rites after the color left. The Castellan believes duty outlives warmth. He is wrong, but he is consistent, which the dead find comforting.", [
        { label: "How do I reach him?", next: "how" },
        { label: "Sister Calia sent me.", next: "calia", require: { flag: "calia_grave" } },
      ]),
      how: n("how", "Gray Chaplain", "Follow the sound of a throne scraping stone. He sits in the keep that remembers being proud.", [
        { label: "I'll end the watch.", next: undefined },
      ]),
      calia: n("calia", "Gray Chaplain", "Then tell her the light still has a forwarding address, even here. It is simply late.", [
        { label: "I'll carry that.", next: undefined, grantXp: 15 },
      ]),
    },
  },
  {
    id: "ledger",
    name: "Quartermaster Vhask",
    title: "Devil of inventories",
    plane: "hells",
    x: 32,
    y: 40,
    color: "#c45c3a",
    role: "vendor",
    start: "hello",
    dialogue: {
      hello: n("hello", "Quartermaster Vhask", "Welcome to Avernus. Please keep your limbs inside the war at all times. I sell steel that has already been damned, which saves you a step.", [
        { label: "Trade.", shop: true },
        { label: "I'm looking for a circlet shard.", next: "shard" },
        { label: "Infernal iron for a dwarf.", next: "iron", require: { flag: "brann_iron" } },
      ]),
      shard: n("shard", "Quartermaster Vhask", "Logged under Erinyes custody, aerial division, extremely overdue. She will not give it to you. She may drop it if you inconvenience her enough.", [
        { label: "Where?", next: "where" },
      ]),
      where: n("where", "Quartermaster Vhask", "The brass spire. You will know it because it hates you personally.", [
        { label: "Of course it does.", next: undefined },
      ]),
      iron: n("iron", "Quartermaster Vhask", "Take a lump from the slag fields. If Brann forges it, tell him Vhask still wants that hammer back in a century or two.", [
        { label: "I'll tell him.", next: undefined, setFlag: { got_iron: true }, advanceQuest: "infernal_iron" },
      ]),
    },
  },
  {
    id: "dretch_speaker",
    name: "A Mouth That Was a Person",
    title: "Abyssal accident",
    plane: "abyss",
    x: 44,
    y: 48,
    color: "#6d8a4a",
    role: "wanderer",
    start: "hello",
    dialogue: {
      hello: n("hello", "A Mouth That Was a Person", "THE SHARD IS IN THE FRAGMENT. THE FRAGMENT IS IN THE FEN. THE FEN IS IN YOUR FUTURE. ALSO: A CHILD'S TOY IS SCREAMING IN A KIND WAY.", [
        { label: "The totem. Where?", next: "toy" },
        { label: "I'll kill the fragment.", next: undefined },
      ]),
      toy: n("toy", "A Mouth That Was a Person", "NEAR THE TEETH-STONES. BREAK IT AND THE WHISPER STOPS. KEEP IT AND THE WHISPER PAYS YOU. THIS IS NOT ADVICE. THIS IS WEATHER.", [
        { label: "I'll decide when I see it.", next: undefined, setFlag: { totem_hint: true } },
      ]),
    },
  },
];

export const WANDERER_LINES = [
  "The Gate hummed last night. My teeth still ache.",
  "Don't trust lights that move against the wind.",
  "I sold a chicken to a man with too many smiles. He paid in petals that turned to ash.",
  "If you see my cousin, tell him the Shadowfell already did.",
  "Salt on the windowsill. Iron under the bed. Prayer if you have any left.",
  "The well behind the chapel smells like a storm that learned to hate.",
  "Brann's hammer has been going since dawn. That's how you know the world is still pretending.",
  "I heard a devil tip well. That's how they get you — etiquette.",
];

export const QUEST_TEMPLATES = [
  {
    kind: "kill" as const,
    names: ["Culling the Bleed", "A Local Horror", "Teeth in the Dark"],
    detail: "Slay {n} {enemy} near {place}.",
  },
  {
    kind: "fetch" as const,
    names: ["Something Lost", "A Keepsake", "Bring It Home"],
    detail: "Recover a missing {item} from {place}.",
  },
  {
    kind: "visit" as const,
    names: ["Walk the Wound", "See It Yourself", "A Witness"],
    detail: "Travel to {place} and return with word.",
  },
];

export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function npcById(id: string): NpcDef | undefined {
  return NPCS.find((n) => n.id === id);
}

export const PLANE_META: Record<
  PlaneId,
  { name: string; blurb: string; ground: string; wall: string; accent: string; fog: string }
> = {
  material: {
    name: "Material Plane — Vaelthorn",
    blurb: "Ashenford and the cracked Gate.",
    ground: "#2d4a38",
    wall: "#3d342c",
    accent: "#6b8f5e",
    fog: "rgba(20, 28, 18, 0.18)",
  },
  feywild: {
    name: "Feywild — The Gilded Thicket",
    blurb: "Color with too many opinions.",
    ground: "#1c3d3a",
    wall: "#5a2d5c",
    accent: "#7ec8a3",
    fog: "rgba(90, 20, 90, 0.16)",
  },
  shadowfell: {
    name: "Shadowfell — The Gray Marches",
    blurb: "A world that mislaid its warmth.",
    ground: "#2a3038",
    wall: "#1c2228",
    accent: "#8a93a0",
    fog: "rgba(10, 14, 22, 0.32)",
  },
  hells: {
    name: "Nine Hells — Avernus",
    blurb: "War as a climate.",
    ground: "#3a1c16",
    wall: "#5a2420",
    accent: "#c45c3a",
    fog: "rgba(80, 18, 10, 0.22)",
  },
  abyss: {
    name: "The Abyss — Screaming Fen",
    blurb: "Chaos with a body.",
    ground: "#243018",
    wall: "#3d1a44",
    accent: "#6d8a4a",
    fog: "rgba(40, 10, 50, 0.24)",
  },
};

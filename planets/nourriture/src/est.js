/* =========================================================
   SACCHARIA — ZONE EST : LA CUISINE SALÉE
   est.js  —  À brancher dans script.js :
     • setup()  → initEastZone()
     • draw()   → drawEastZone()   (si scene === "east")
     • update() → updateEast()     (si scene === "east")
     • keyPressed() → keyPressedEast()
   ========================================================= */

// ──────────────────────────────────────────────────────────
// CONFIGURATION GÉNÉRALE
// ──────────────────────────────────────────────────────────

const EAST_W = 1920;
const EAST_H = 400;

// Palette cuisine salée — tons sel, mer, roche
const EAST_PALETTE = {
  floor:       [210, 200, 185],
  wall:        [190, 145, 110],
  wallTop:     [158, 108, 80],
  counter:     [120,  80,  55],
  skyTop:      [112, 142, 172],
  skyBottom:   [190, 208, 220],
  saltFlat:    [232, 226, 212],
  saltCrust:   [246, 240, 228],
  saltRock:    [180, 170, 152],
  seaGlimmer:  [148, 180, 205],
  path:        [200, 186, 164],
  woodDark:    [90,  62,  40],
  roof:        [126, 78,  56],
  steam:       [255, 245, 235],
  saliSkin:    [220, 170, 110],
  saliApron:   [255, 255, 255],
  saliHat:     [250, 248, 240],
  text:        [255, 245, 230],
  textDim:     [210, 185, 155],
  gold:        [255, 210,  80],
  accent:      [200,  80,  50],
  accentSoft:  [230, 140,  90],
  panelBg:     [30,  18,  10, 210],
  greenOk:     [80, 210, 120],
  redKo:       [210,  70,  60]
};

// ──────────────────────────────────────────────────────────
// ÉTAT DE LA ZONE
// ──────────────────────────────────────────────────────────

const eastState = {
  active:        false,
  area:          "outside",  // "outside" | "inside"
  currentBuilding: null,     // id bâtiment courant si inside
  miniGame:      null,       // null | "recette" | "duel" | "meme"
  recipesFound:  0,
  recipesGoal:   5,
  duelDone:      false,
  memeDone:      false,
  complete:      false,
  saliMet:       false,

  // Dialogue Chef Sali
  saliDialogue:  null,
  saliQueue:     [],
  saliCharIdx:   0,
  saliFrame:     0,

  // Particules décoratives
  steamParticles: [],

  // Retour monde : coordonnée X dans le world global
  returnWorldX: 5540
};

// ──────────────────────────────────────────────────────────
// CHEF SALI — PNJ
// ──────────────────────────────────────────────────────────

const chefSali = {
  x: EAST_W * 0.30,
  y: EAST_H * 0.60,
  threshold: 90,
  bobPhase: 0,
  prompt: "[E] Parler à Chef Sali"
};

const SALI_LINES = {
  outsideIntro: [
    { speaker: "Narrateur", text: "Au bout des plaines de sel, le Quartier des Épreuves surgit dans la brume. Odeur âcre, saveurs tranchantes — bienvenue chez Chef Sali." },
    { speaker: "Narrateur", text: "Le Roi Dulcis attend ici son plat d'UMAMI. Entre dans les bâtiments pour rencontrer Chef Sali et relever ses trois épreuves." }
  ],
  intro: [
    { speaker: "Chef Sali", text: "Ah, un étranger dans ma cuisine… Tu sens le sucre. C'est déjà suspect." },
    { speaker: "Chef Sali", text: "Tu viens chercher le Sel d'Umami pour ce gourmand de Roi Dulcis, je suppose. Pas si vite." },
    { speaker: "Chef Sali", text: "Trois épreuves t'attendent dans les bâtiments autour. L'Atelier Recettes à gauche, la Salle du Sel à droite, et la Salle des Mèmes plus loin. Réussis-les, et le Sel sera à toi." }
  ],
  revisit: [
    { speaker: "Chef Sali", text: "Les épreuves sont dans les bâtiments autour. T'as pas besoin de moi pour les trouver." }
  ],
  recetteIntro: [
    { speaker: "Chef Sali", text: "Je vais te décrire un plat. Tu cries son nom dans le micro comme si ta vie en dépendait. Cinq recettes. Pas une de moins." }
  ],
  duelIntro: [
    { speaker: "Chef Sali", text: "Pincée de Sel. Six assiettes sur les étagères. Tu vises, tu lances. Huit tirs pour en toucher cinq. Prouve que ta main est aussi précise que ton palais." }
  ],
  memeIntro: [
    { speaker: "Chef Sali", text: "Ah, maintenant le vrai test culturel. Ces images… les gens les partagent sur internet. Dis-moi ce que tu vois." }
  ],
  victoire: [
    { speaker: "Chef Sali", text: "…Pas mal. Tu commences à mériter une place dans cette cuisine. Mais reste humble." }
  ],
  alreadyDone: [
    { speaker: "Chef Sali", text: "T'as déjà fait ça. Va pas te reposer sur tes lauriers." }
  ]
};

const EAST_BUILDINGS = [
  {
    id: "recette",
    name: "Atelier Recettes",
    subtitle: "Descriptions culinaires",
    role: "game",
    miniGame: "recette",
    x: 80, y: 48, w: 360, h: 200
  },
  {
    id: "sali",
    name: "Cuisine de Sali",
    subtitle: "Chef & menu principal",
    role: "sali",
    miniGame: null,
    x: 610, y: 28, w: 390, h: 220
  },
  {
    id: "duel",
    name: "Salle du Sel",
    subtitle: "Précision de lancer",
    role: "game",
    miniGame: "duel",
    x: 1140, y: 48, w: 360, h: 200
  },
  {
    id: "meme",
    name: "Salle des Mèmes",
    subtitle: "Reconnaissance visuelle",
    role: "game",
    miniGame: "meme",
    x: 1480, y: 48, w: 360, h: 200
  }
];

// ──────────────────────────────────────────────────────────
// MINI-JEU 1 : RECETTE MYSTÈRE (reconnaissance vocale)
// ──────────────────────────────────────────────────────────

const RECIPES = [
  {
    name: "burger",
    keywords: ["burger", "hamburger", "hambourgeois"],
    hints: [
      "Deux pains briochés qui encadrent une galette de viande grillée.",
      "Ketchup, moutarde, cheddar fondu, salade, oignon, cornichons.",
      "On le tient à deux mains. Impossible à manger proprement.",
      "Un mot anglais, emblème de la fast food mondiale."
    ]
  },
  {
    name: "kebab",
    keywords: ["kebab", "kebap", "kébab", "chawarma", "shawarma"],
    hints: [
      "De la viande rôtie sur une broche verticale, découpée à la volée.",
      "Servi dans du pain pita ou une galette, avec sauce blanche et crudités.",
      "Le roi de la sortie de boîte à 3h du matin.",
      "Un mot turc. En France, c'est souvent de l'agneau ou du poulet."
    ]
  },
  {
    name: "pizza",
    keywords: ["pizza", "pizz"],
    hints: [
      "Une pâte fine étalée, garnie de sauce tomate et de fromage fondu.",
      "Cuite au four à très haute température, idéalement sur pierre.",
      "Originaire de Naples. Margherita, quatre fromages, reine…",
      "Quatre lettres. Probablement le plat le plus livré au monde."
    ]
  },
  {
    name: "tacos",
    keywords: ["tacos", "taco"],
    hints: [
      "Une galette de blé roulée, garnie de viande, de fromage et de sauce.",
      "En France, c'est une version différente du taco mexicain original.",
      "On y met souvent des frites à l'intérieur. C'est très généreux.",
      "Cinq lettres. Street food venue du Mexique, réinventée en France."
    ]
  },
  {
    name: "hot dog",
    keywords: ["hot dog", "hotdog", "saucisse", "chien chaud"],
    hints: [
      "Une saucisse fumée glissée dans un pain allongé et moelleux.",
      "Garni de moutarde, de ketchup, et parfois de choucroute.",
      "Incontournable dans les stades américains et les marchés de Noël.",
      "Deux mots anglais. Le second est un animal domestique."
    ]
  },
  {
    name: "frites",
    keywords: ["frites", "frite", "patate frite"],
    hints: [
      "Des bâtonnets de pomme de terre plongés dans l'huile bouillante.",
      "Croustillantes dehors, fondantes dedans. Sel et ketchup en option.",
      "La Belgique se dispute avec la France pour les avoir inventées.",
      "Un mot au pluriel. La base de presque tous les repas street food."
    ]
  },
  {
    name: "nuggets",
    keywords: ["nuggets", "nugget", "chicken nuggets", "nuggets de poulet"],
    hints: [
      "De petits morceaux de poulet pané et frits, croustillants partout.",
      "Inventés par McDo dans les années 80. Sauce barbecue ou miel-moutarde.",
      "Format idéal pour partager, ou pas — on les mange souvent seul.",
      "Un mot anglais. Littéralement des 'pépites' de poulet."
    ]
  },
  {
    name: "samossa",
    keywords: ["samossa", "samosa", "samossas", "samosas"],
    hints: [
      "Un chausson triangulaire frit, farci de pommes de terre épicées ou de viande.",
      "La pâte est fine et croustillante. On le trempe dans de la sauce chutney.",
      "Originaire d'Asie du Sud, vendu à la pièce dans les épiceries du monde entier.",
      "Trois syllabes. Street food indienne que l'on trouve dans toutes les villes de France."
    ]
  },
  {
    name: "sandwich",
    keywords: ["sandwich", "sandwiche", "sandwitch"],
    hints: [
      "Deux tranches de pain qui encadrent n'importe quelle garniture.",
      "Jambon-beurre, club, BLT, végétarien… il en existe pour tout le monde.",
      "Il doit son nom à un comte anglais qui refusait de quitter sa table de jeu.",
      "Un mot de neuf lettres. La street food la plus simple du monde."
    ]
  },
  {
    name: "wrap",
    keywords: ["wrap", "wraps", "galette", "tortilla"],
    hints: [
      "Une galette de blé souple roulée autour d'une garniture complète.",
      "Poulet grillé, salade, tomate, sauce — tout est dedans, rien ne tombe.",
      "Plus sain que le burger sur le papier. Aussi pratique à manger debout.",
      "Un mot anglais de quatre lettres. Littéralement 'enveloppé'."
    ]
  },
  {
    name: "fallafel",
    keywords: ["fallafel", "falafel", "falafels", "pois chiche"],
    hints: [
      "Des boulettes de pois chiches ou de fèves, épicées et frites.",
      "Servies dans du pain pita avec du houmous, du taboulé et de la sauce tahini.",
      "Plat végétarien emblématique du Moyen-Orient.",
      "Trois syllabes. Street food que l'on trouve dans tout le Marais à Paris."
    ]
  },
  {
    name: "naan",
    keywords: ["naan", "nan", "pain naan"],
    hints: [
      "Un pain plat moelleux cuit dans un four tandoor brûlant.",
      "Souvent beurré à l'ail et à la coriandre en sortant du four.",
      "Originaire d'Inde, il accompagne les currys et plats en sauce.",
      "Quatre lettres. Pain incontournable de la street food indienne."
    ]
  }
];

const recetteState = {
  active:        false,
  currentIdx:    0,            // index dans RECIPES (ordre aléatoire)
  order:         [],           // ordre de passage mélangé
  hintIdx:       0,
  hintTimer:     0,
  HINT_INTERVAL: 240,          // frames entre indices
  found:         [],           // booleans
  feedback:      null,         // { text, ok, timer }
  listening:     false,
  phase:         "intro"       // "intro" | "playing" | "done"
};

function initRecetteGame() {
  recetteState.active   = true;
  recetteState.phase    = "intro";
  recetteState.hintIdx  = 0;
  recetteState.hintTimer = 0;
  recetteState.feedback  = null;
  // ordre aléatoire des recettes non encore trouvées
  const remaining = RECIPES
    .map((r, i) => i)
    .filter(i => !recetteState.found[i]);
  recetteState.order = shuffleArray(remaining);
  recetteState.currentIdx = 0;
  eastSpeechListen("recette");
}

function updateRecetteGame() {
  if (!recetteState.active) return;

  if (recetteState.phase === "playing") {
    recetteState.hintTimer++;
    if (recetteState.hintTimer >= recetteState.HINT_INTERVAL) {
      recetteState.hintTimer = 0;
      const recipe = RECIPES[recetteState.order[recetteState.currentIdx]];
      if (recetteState.hintIdx < recipe.hints.length - 1) {
        recetteState.hintIdx++;
      }
    }
  }

  if (recetteState.feedback) {
    recetteState.feedback.timer--;
    if (recetteState.feedback.timer <= 0) recetteState.feedback = null;
  }
}

function drawRecetteGame() {
  if (!recetteState.active) return;
  const p = EAST_PALETTE;

  // Fond semi-transparent
  fill(p.panelBg[0], p.panelBg[1], p.panelBg[2], p.panelBg[3]);
  noStroke();
  rect(60, 60, EAST_W - 120, EAST_H - 120, 14);
  stroke(p.accentSoft[0], p.accentSoft[1], p.accentSoft[2], 120);
  strokeWeight(1);
  noFill();
  rect(60, 60, EAST_W - 120, EAST_H - 120, 14);
  noStroke();

  // Titre
  fill(p.gold[0], p.gold[1], p.gold[2]);
  textFont("Georgia"); textStyle(BOLD); textSize(20); textAlign(CENTER, TOP);
  text("Recette Mystère", EAST_W / 2, 84);

  // Compteur de recettes
  const found = recetteState.found.filter(Boolean).length;
  textFont("monospace"); textStyle(NORMAL); textSize(12);
  fill(p.textDim[0], p.textDim[1], p.textDim[2]);
  text(`Recettes trouvées : ${found} / ${eastState.recipesGoal}`, EAST_W / 2, 112);

  // Points de progression
  for (let i = 0; i < eastState.recipesGoal; i++) {
    const px = EAST_W / 2 - (eastState.recipesGoal * 18) / 2 + i * 18 + 9;
    if (recetteState.found[i]) fill(p.greenOk[0], p.greenOk[1], p.greenOk[2]);
    else fill(60, 40, 25);
    ellipse(px, 132, 10, 10);
  }

  if (recetteState.phase === "intro") {
    fill(p.text[0], p.text[1], p.text[2]);
    textFont("Georgia"); textSize(15); textAlign(CENTER, CENTER);
    text("Chef Sali va décrire un plat.\nDis son nom à voix haute dans le micro.", EAST_W / 2, EAST_H / 2 - 20);
    fill(p.accentSoft[0], p.accentSoft[1], p.accentSoft[2]);
    textFont("monospace"); textSize(12);
    text("[E / ESPACE] — Commencer", EAST_W / 2, EAST_H / 2 + 40);
    return;
  }

  if (recetteState.phase === "done") {
    fill(p.greenOk[0], p.greenOk[1], p.greenOk[2]);
    textFont("Georgia"); textStyle(BOLD); textSize(22); textAlign(CENTER, CENTER);
    text("Toutes les recettes trouvées !", EAST_W / 2, EAST_H / 2 - 20);
    textStyle(NORMAL); textSize(14); fill(p.text[0], p.text[1], p.text[2]);
    text("Chef Sali est… impressionné. Presque.", EAST_W / 2, EAST_H / 2 + 20);
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(12);
    text("[E / ESPACE] — Continuer", EAST_W / 2, EAST_H / 2 + 60);
    return;
  }

  // Phase playing
  const recipe = RECIPES[recetteState.order[recetteState.currentIdx]];
  const hint = recipe.hints[recetteState.hintIdx];

  // Bulle indice
  const bx = 100, by = 155, bw = EAST_W - 200, bh = 120;
  fill(50, 30, 15, 200);
  rect(bx, by, bw, bh, 10);
  stroke(p.accentSoft[0], p.accentSoft[1], p.accentSoft[2], 80);
  strokeWeight(0.5); noFill();
  rect(bx, by, bw, bh, 10); noStroke();

  // Icône Chef Sali miniature dans bulle
  drawSaliAvatar(bx + 44, by + bh / 2);

  fill(p.text[0], p.text[1], p.text[2]);
  textFont("Georgia"); textStyle(ITALIC); textSize(14); textAlign(LEFT, CENTER);
  text(`"${hint}"`, bx + 76, by + bh / 2, bw - 88, bh - 20);
  textStyle(NORMAL);

  // Indice numéro
  fill(p.textDim[0], p.textDim[1], p.textDim[2]);
  textFont("monospace"); textSize(10); textAlign(RIGHT, TOP);
  text(`Indice ${recetteState.hintIdx + 1}/${recipe.hints.length}`, bx + bw - 8, by + 6);

  // Prochain indice — barre de progression
  const prog = recetteState.hintTimer / recetteState.HINT_INTERVAL;
  if (recetteState.hintIdx < recipe.hints.length - 1) {
    fill(50, 30, 15);
    rect(bx, by + bh + 6, bw, 5, 2);
    fill(p.accentSoft[0], p.accentSoft[1], p.accentSoft[2]);
    rect(bx, by + bh + 6, bw * prog, 5, 2);
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(10); textAlign(LEFT, TOP);
    text("prochain indice...", bx, by + bh + 14);
  }

  // Zone micro
  const micY = 330;
  const isListening = recetteState.listening;
  fill(isListening ? 60 : 30, isListening ? 20 : 10, 10, 200);
  rect(EAST_W / 2 - 100, micY, 200, 44, 8);
  if (isListening) {
    stroke(p.accent[0], p.accent[1], p.accent[2], 150 + sin(frameCount * 0.15) * 80);
    strokeWeight(1.5); noFill();
    rect(EAST_W / 2 - 100, micY, 200, 44, 8); noStroke();
  }
  fill(isListening ? p.accent[0] : p.textDim[0],
       isListening ? p.accent[1] : p.textDim[1],
       isListening ? p.accent[2] : p.textDim[2]);
  textFont("monospace"); textSize(12); textAlign(CENTER, CENTER);
  text(isListening ? "🎙 En écoute…" : "🎙 Micro en attente", EAST_W / 2, micY + 22);

  // Dernier transcript affiché
  if (eastSpeechState.lastTranscript) {
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(11); textAlign(CENTER, TOP);
    text(`"${eastSpeechState.lastTranscript}"`, EAST_W / 2, micY + 54);
  }

  // Feedback OK / KO
  if (recetteState.feedback) {
    const alpha = map(recetteState.feedback.timer, 0, 90, 0, 255);
    const c = recetteState.feedback.ok ? p.greenOk : p.redKo;
    fill(c[0], c[1], c[2], alpha);
    textFont("Georgia"); textStyle(BOLD); textSize(22); textAlign(CENTER, CENTER);
    text(recetteState.feedback.text, EAST_W / 2, EAST_H / 2 + 80);
    textStyle(NORMAL);
  }

  // Raccourcis bas
  fill(p.textDim[0], p.textDim[1], p.textDim[2]);
  textFont("monospace"); textSize(10); textAlign(CENTER, BOTTOM);
  text("[S] — Passer    [ECHAP] — Quitter", EAST_W / 2, EAST_H - 74);
}

// Strip accents, lowercase, remove punctuation — used for voice matching
function _normalizeVoice(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "");
}

function _recetteSkip() {
  if (recetteState.phase !== "playing") return;
  const recipe = RECIPES[recetteState.order[recetteState.currentIdx]];
  recetteState.feedback = { text: "→ " + recipe.name.toUpperCase(), ok: false, timer: 120 };
  recetteState.currentIdx++;
  if (
    recetteState.currentIdx >= recetteState.order.length ||
    eastState.recipesFound >= eastState.recipesGoal
  ) {
    recetteState.phase = "done";
    eastSpeechStop();
    if (typeof GameSounds !== "undefined") GameSounds.play("win");
  } else {
    recetteState.hintIdx = 0;
    recetteState.hintTimer = 0;
  }
}

// Returns true if transcript matched (stops checking other alternatives)
function onRecetteVoiceResult(transcript) {
  if (recetteState.phase !== "playing") return false;
  const norm = _normalizeVoice(transcript);
  const recipe = RECIPES[recetteState.order[recetteState.currentIdx]];

  if (recipe.keywords.some(kw => norm.includes(_normalizeVoice(kw)))) {
    const ri = recetteState.order[recetteState.currentIdx];
    recetteState.found[ri] = true;
    eastState.recipesFound++;
    recetteState.feedback = { text: "✓ " + recipe.name.toUpperCase() + " !", ok: true, timer: 120 };
    recetteState.currentIdx++;
    if (
      recetteState.currentIdx >= recetteState.order.length ||
      eastState.recipesFound >= eastState.recipesGoal
    ) {
      recetteState.phase = "done";
      eastSpeechStop();
      if (typeof GameSounds !== "undefined") GameSounds.play("win");
    } else {
      recetteState.hintIdx = 0;
      recetteState.hintTimer = 0;
    }
    return true;
  } else {
    recetteState.feedback = { text: "Essaie encore…", ok: false, timer: 80 };
    if (typeof GameSounds !== "undefined") GameSounds.play("wrong");
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// MINI-JEU 2 : PINCÉE DE SEL (trajectoire parabolique)
// ──────────────────────────────────────────────────────────

const SLING_TOTAL_SHOTS = 8;
const SLING_HITS_TO_WIN  = 5;
const SLING_GRAVITY      = 0.18;
const SLING_LAUNCH_X     = 120;
const SLING_LAUNCH_Y     = 300;
const SLING_MAX_SPEED    = 22;

const SLING_DISHES = [
  { x: 650,  y: 278, w: 80, h: 26, food: "soupe"   },
  { x: 840,  y: 242, w: 84, h: 26, food: "poisson"  },
  { x: 1020, y: 276, w: 80, h: 26, food: "risotto"  },
  { x: 1190, y: 240, w: 80, h: 26, food: "ragout"   },
  { x: 1360, y: 274, w: 84, h: 26, food: "salade"   },
  { x: 1530, y: 240, w: 80, h: 26, food: "tarte"    }
];

const slingState = {
  active:    false,
  phase:     "intro",
  shots:     0,
  hits:      0,
  dishes:    [],
  salt:      null,
  prevMouse: false,
  particles: [],
  camShake:  0
};

function initDuelGame() {
  slingState.active    = true;
  slingState.phase     = "intro";
  slingState.shots     = 0;
  slingState.hits      = 0;
  slingState.salt      = null;
  slingState.prevMouse = false;
  slingState.particles = [];
  slingState.camShake  = 0;
  slingState.dishes = SLING_DISHES.map(d => ({
    x: d.x, y: d.y, w: d.w, h: d.h, food: d.food,
    hit: false, wobble: 0, saltDots: []
  }));
}

function getSlingMouseEast() {
  // Meme conversion (inverse) que drawEastScene avec getEastFit().
  const fit = (typeof getEastFit === "function")
    ? getEastFit()
    : { sx: 1, sy: 1, ox: 0, oy: 0 };
  return {
    mx: (mouseX - fit.ox) / fit.sx,
    my: (mouseY - fit.oy) / fit.sy
  };
}

function getSlingVelocity(mx, my) {
  const dx = mx - SLING_LAUNCH_X;
  const dy = my - SLING_LAUNCH_Y;
  const d  = Math.sqrt(dx * dx + dy * dy);
  const spd = Math.min(d * 0.12, SLING_MAX_SPEED);
  const ang = Math.atan2(dy, dx);
  return { vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd };
}

function updateDuelGame() {
  if (!slingState.active) return;

  if (slingState.camShake > 0) slingState.camShake -= 0.75;

  for (const dish of slingState.dishes) {
    if (dish.wobble > 0) dish.wobble -= 1.1;
    if (dish.wobble < 0) dish.wobble = 0;
  }

  for (const pt of slingState.particles) {
    pt.x  += pt.vx;
    pt.y  += pt.vy;
    pt.vy += 0.06;
    pt.vx *= 0.97;
    pt.life--;
  }
  slingState.particles = slingState.particles.filter(p => p.life > 0);

  if (slingState.phase === "flying" && slingState.salt) {
    const s = slingState.salt;
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 18) s.trail.shift();
    s.x  += s.vx;
    s.y  += s.vy;
    s.vy += SLING_GRAVITY;

    for (const dish of slingState.dishes) {
      if (!dish.hit &&
          s.x > dish.x - dish.w / 2 && s.x < dish.x + dish.w / 2 &&
          s.y > dish.y - dish.h     && s.y < dish.y + dish.h) {
        dish.hit    = true;
        dish.wobble = 42;
        slingState.hits++;
        slingState.camShake = 6;
        for (let i = 0; i < 24; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 1.5 + Math.random() * 4.5;
          slingState.particles.push({
            x: s.x, y: s.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - Math.random() * 3,
            life: 22 + Math.floor(Math.random() * 38),
            maxLife: 60,
            sz: 2 + Math.random() * 4.5
          });
        }
        dish.saltDots = Array.from({ length: 14 }, () => ({
          dx: (Math.random() - 0.5) * dish.w * 0.72,
          dy: (Math.random() - 0.5) * dish.h * 0.52,
          sz: 2 + Math.random() * 3
        }));
      }
    }

    if (s.x > EAST_W + 30 || s.y > EAST_H + 30 || s.x < -30) {
      slingState.salt  = null;
      slingState.shots++;
      if (slingState.shots >= SLING_TOTAL_SHOTS ||
          slingState.hits  >= SLING_HITS_TO_WIN) {
        if (slingState.hits >= SLING_HITS_TO_WIN) eastState.duelDone = true;
        slingState.phase = "done";
        if (typeof GameSounds !== "undefined") {
          GameSounds.play(slingState.hits >= SLING_HITS_TO_WIN ? "win" : "lose");
        }
      } else {
        slingState.phase = "aiming";
      }
    }
  }

  if (slingState.phase === "aiming") {
    const { mx, my } = getSlingMouseEast();
    const clicked = mouseIsPressed;
    if (clicked && !slingState.prevMouse && mx > SLING_LAUNCH_X + 20) {
      const { vx, vy } = getSlingVelocity(mx, my);
      slingState.salt  = { x: SLING_LAUNCH_X, y: SLING_LAUNCH_Y, vx, vy, trail: [] };
      slingState.phase = "flying";
    }
    slingState.prevMouse = clicked;
  }
}

function drawSlingTrajectory(mx, my) {
  const { vx, vy: vy0 } = getSlingVelocity(mx, my);
  let px = SLING_LAUNCH_X, py = SLING_LAUNCH_Y;
  let pvx = vx, pvy = vy0;
  noStroke();
  for (let i = 0; i < 52; i++) {
    if (i % 3 === 0) {
      const alpha = map(i, 0, 52, 220, 10);
      const sz    = map(i, 0, 52, 6, 2);
      fill(255, 215, 90, alpha);
      ellipse(px, py, sz, sz);
    }
    px  += pvx;
    py  += pvy;
    pvy += SLING_GRAVITY;
    if (px > EAST_W + 50 || py > EAST_H + 50) break;
  }
}

// Rich food art drawn at origin (0,0), dish.w × dish.h
function _drawSlingFood(food, w, h) {
  if (food === "soupe") {
    // bowl rim
    fill(205, 190, 168); stroke(165, 145, 118); strokeWeight(1);
    ellipse(0, 0, w, h * 0.64);
    // broth
    fill(188, 92, 35); noStroke();
    ellipse(0, 2, w * 0.75, h * 0.38);
    // floating bits
    fill(55, 135, 55);  ellipse(-9, 2, 5, 5);
    fill(195, 55, 28);  ellipse(7,  1, 4, 4);
    fill(235, 195, 70); ellipse(0,  4, 3, 3);
    fill(160, 80, 25);  ellipse(-3, 0, 4, 3);
  } else if (food === "poisson") {
    // plate
    fill(238, 230, 215); stroke(192, 175, 152); strokeWeight(1);
    ellipse(0, 0, w, h * 0.56);
    // fish body
    fill(215, 198, 162); noStroke();
    ellipse(-4, -1, w * 0.56, h * 0.3);
    // grill marks
    stroke(85, 50, 22, 200); strokeWeight(1.5);
    for (let i = -2; i <= 2; i++) line(i * 6 - 2, -h * 0.1, i * 6 + 2, h * 0.1);
    // tail
    noStroke(); fill(195, 170, 132);
    triangle(w * 0.25, 0, w * 0.37, -h * 0.14, w * 0.37, h * 0.14);
    // lemon wedge
    fill(238, 218, 55); noStroke();
    ellipse(-w * 0.3, 0, 10, 7);
    fill(220, 200, 40);
    line(-w * 0.3, -3, -w * 0.3, 3);
  } else if (food === "risotto") {
    // plate
    fill(244, 237, 220); stroke(196, 180, 155); strokeWeight(1);
    ellipse(0, 0, w, h * 0.58);
    // creamy mound
    fill(228, 208, 152); noStroke();
    ellipse(0, -2, w * 0.6, h * 0.32);
    // herbs
    fill(55, 155, 55);
    for (let i = 0; i < 5; i++) ellipse(-10 + i * 5, -3 + (i % 2) * 2, 3, 3);
    // parmesan
    fill(255, 250, 228, 200);
    ellipse(-5, -5, 9, 3); ellipse(5, -2, 8, 3);
  } else if (food === "ragout") {
    // cast-iron pot body
    fill(52, 42, 34); stroke(32, 24, 18); strokeWeight(1.5);
    ellipse(0, 0, w * 0.8, h * 0.7);
    // side handles
    stroke(40, 30, 20); strokeWeight(1);
    fill(44, 34, 26);
    ellipse(-w * 0.42, 0, 13, 8);
    ellipse( w * 0.42, 0, 13, 8);
    // stew
    fill(168, 68, 28); noStroke();
    ellipse(0, 1, w * 0.55, h * 0.35);
    // bubbles
    fill(225, 115, 50, 190);
    ellipse(-6, 0, 6, 5); ellipse(6, 1, 5, 5); ellipse(0, -2, 4, 4);
  } else if (food === "salade") {
    // bowl
    fill(230, 222, 202); stroke(186, 170, 145); strokeWeight(1);
    ellipse(0, 0, w, h * 0.63);
    noStroke();
    const lc = [[58,148,44],[78,168,50],[44,118,34],[68,158,60]];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const c   = lc[i % 4];
      fill(c[0], c[1], c[2]);
      push(); translate(Math.cos(ang) * w * 0.2, Math.sin(ang) * h * 0.1);
      rotate(ang); ellipse(0, 0, 13, 7); pop();
    }
    fill(208, 48, 38); ellipse(-4, 1, 7, 7); ellipse(5, -1, 6, 6);
  } else if (food === "tarte") {
    // crust
    fill(212, 177, 122); stroke(168, 128, 78); strokeWeight(1.5);
    ellipse(0, 0, w * 0.88, h * 0.63);
    // custard fill
    fill(242, 200, 98); noStroke();
    ellipse(0, 0, w * 0.68, h * 0.44);
    // crimped dots
    stroke(168, 128, 78); strokeWeight(1); noFill();
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      point(Math.cos(ang) * w * 0.41, Math.sin(ang) * h * 0.28);
    }
    // strawberry
    noStroke(); fill(208, 38, 48);
    triangle(-2, -h * 0.1, -6, h * 0.08, 2, h * 0.08);
    fill(255, 60, 62); ellipse(-2, -h * 0.04, 7, 7);
    fill(55, 155, 40); ellipse(-2, -h * 0.12, 4, 3);
  }
}

function drawSlingDish(dish) {
  const wobX = dish.wobble > 0 ? Math.sin(dish.wobble * 0.55) * 4 * (dish.wobble / 40) : 0;
  push();
  translate(dish.x + wobX, dish.y);
  if (dish.hit) {
    rotate(Math.sin(frameCount * 0.07) * 0.03);
    _drawSlingFood(dish.food, dish.w, dish.h);
    // salt crystal dots on food
    noStroke();
    for (const dot of dish.saltDots) {
      fill(255, 252, 240, 170 + Math.sin(frameCount * 0.05 + dot.dx) * 25);
      ellipse(dot.dx, dot.dy, dot.sz, dot.sz * 0.7);
    }
    // animated glitter
    fill(255, 255, 255, 110);
    for (let i = 0; i < 4; i++) {
      const gx = Math.sin(frameCount * 0.1 + i * 1.6) * dish.w * 0.22;
      const gy = Math.cos(frameCount * 0.07 + i * 1.2) * dish.h * 0.18;
      ellipse(gx, gy, 2.5, 2.5);
    }
  } else {
    _drawSlingFood(dish.food, dish.w, dish.h);
    // steam for hot dishes
    if (dish.food === "soupe" || dish.food === "ragout") {
      stroke(255, 255, 255, 45); strokeWeight(1); noFill();
      const t = frameCount * 0.04;
      for (let st = 0; st < 2; st++) {
        beginShape();
        for (let j = 0; j < 6; j++) {
          const wy = -dish.h * 0.4 - j * 5;
          const wx = Math.sin(t + j * 0.8 + st * 1.5) * 4 + (st - 0.5) * 10;
          vertex(wx, wy);
        }
        endShape();
      }
      noStroke();
    }
  }
  pop();
}

function drawSlingParticles() {
  noStroke();
  for (const pt of slingState.particles) {
    const alpha = map(pt.life, 0, pt.maxLife, 0, 220);
    fill(255, 248, 218, alpha);
    push();
    translate(pt.x, pt.y);
    rotate(frameCount * 0.09 + pt.life * 0.18);
    const s = pt.sz * (pt.life / pt.maxLife);
    beginShape();
    vertex(0, -s); vertex(s * 0.5, 0); vertex(0, s); vertex(-s * 0.5, 0);
    endShape(CLOSE);
    pop();
  }
}

function drawFlyingSalt(s) {
  noStroke();
  for (let i = 0; i < s.trail.length; i++) {
    const ratio = i / s.trail.length;
    fill(255, 250, 230, ratio * 190);
    ellipse(s.trail[i].x, s.trail[i].y, ratio * 7, ratio * 7);
    if (i % 4 === 0 && ratio > 0.3) {
      fill(255, 255, 255, ratio * 100);
      ellipse(s.trail[i].x + 2, s.trail[i].y - 2, ratio * 3, ratio * 3);
    }
  }
  push();
  translate(s.x, s.y);
  rotate(frameCount * 0.18);
  fill(255, 240, 175, 55); noStroke();
  ellipse(0, 0, 20, 20);
  fill(248, 246, 232);
  stroke(255, 255, 255, 200); strokeWeight(0.5);
  beginShape();
  vertex(0, -8); vertex(5, 0); vertex(0, 8); vertex(-5, 0);
  endShape(CLOSE);
  noStroke();
  fill(255, 255, 255, 210); ellipse(-2, -2, 3, 3);
  pop();
}

function drawSaltShakerLaunch() {
  const lx = SLING_LAUNCH_X, ly = SLING_LAUNCH_Y;
  // wooden barrel stand
  fill(108, 72, 42); stroke(76, 50, 26); strokeWeight(1.5);
  rect(lx - 28, ly - 8, 56, 34, 4);
  stroke(58, 36, 16); strokeWeight(1);
  line(lx - 28, ly + 4,  lx + 28, ly + 4);
  line(lx - 28, ly + 16, lx + 28, ly + 16);
  stroke(92, 60, 32, 110); strokeWeight(0.5);
  for (let i = 0; i < 4; i++) line(lx - 18 + i * 12, ly - 6, lx - 18 + i * 12, ly + 26);
  noStroke();
  // glass shaker body
  fill(236, 232, 218, 215); stroke(188, 178, 158); strokeWeight(1.5);
  rect(lx - 13, ly - 54, 26, 46, 5);
  // salt visible inside
  fill(255, 253, 244, 200); noStroke();
  rect(lx - 11, ly - 32, 22, 22, 3);
  fill(225, 220, 208, 160);
  for (let i = 0; i < 6; i++) ellipse(lx - 7 + (i % 3) * 7, ly - 28 + Math.floor(i / 3) * 8, 3.5, 3.5);
  // metal cap
  fill(188, 188, 188); stroke(148, 148, 148); strokeWeight(1);
  rect(lx - 10, ly - 64, 20, 14, 4);
  fill(75, 75, 75); noStroke();
  for (let i = 0; i < 3; i++) ellipse(lx - 5 + i * 5, ly - 58, 2.5, 2.5);
  // glass shine
  fill(255, 255, 255, 75); noStroke();
  rect(lx - 9, ly - 50, 4, 30, 2);
}

function _drawKitchenBg() {
  // Dark stone-wall base
  const ctx = drawingContext;
  const wallG = ctx.createLinearGradient(0, 0, 0, EAST_H);
  wallG.addColorStop(0,   "#160a02");
  wallG.addColorStop(0.6, "#221208");
  wallG.addColorStop(1,   "#0e0702");
  ctx.fillStyle = wallG;
  ctx.fillRect(0, 0, EAST_W, EAST_H);

  // Stone bricks
  noFill(); stroke(42, 26, 12, 70); strokeWeight(0.7);
  const bW = 110, bH = 26;
  for (let row = 0; row * bH < EAST_H * 0.8; row++) {
    const off = (row % 2) * (bW / 2);
    for (let col = -1; col * bW < EAST_W + bW; col++) {
      rect(col * bW + off, row * bH, bW - 2, bH - 1, 1);
    }
  }
  noStroke();

  // Ceiling wooden beams
  fill(48, 30, 14, 225);
  for (let i = 0; i < 8; i++) rect(i * 256 - 22, 0, 38, EAST_H * 0.2);
  fill(38, 22, 10, 200);
  rect(0, 10, EAST_W, 9); rect(0, 34, EAST_W, 6);

  // Torch sconces between beams
  const torchXs = [128, 384, 640, 896, 1152, 1408, 1664];
  for (const tx of torchXs) {
    fill(78, 56, 30); stroke(50, 34, 16); strokeWeight(1);
    rect(tx - 5, 46, 10, 20, 2);
    noStroke();
    const fl = Math.sin(frameCount * 0.13 + tx * 0.009) * 5;
    fill(255, 160, 40, 28); ellipse(tx, 42 + fl * 0.3, 28, 20);
    fill(255, 130, 25, 55); ellipse(tx, 46 + fl * 0.2, 16, 13);
    fill(255, 210, 70, 115); ellipse(tx, 50 + fl * 0.1, 9, 11);
    fill(255, 255, 200, 210); ellipse(tx, 52, 4, 6);
  }

  // Hanging copper pots from beams
  const potXs = [256, 512, 768, 1024, 1280, 1536];
  for (const px of potXs) {
    stroke(75, 52, 28); strokeWeight(1);
    line(px, 14, px, 60);
    noStroke();
    fill(162, 86, 36); ellipse(px, 70, 32, 24);
    fill(138, 68, 28); ellipse(px, 64, 32, 10);
    stroke(112, 56, 20); strokeWeight(2); noFill();
    arc(px, 62, 20, 12, PI, TWO_PI);
    noStroke();
    fill(218, 138, 65, 95); ellipse(px - 5, 64, 9, 5);
  }

  // Hanging herb bundles
  const herbXs = [730, 960, 1180, 1400];
  for (const hx of herbXs) {
    stroke(80, 100, 44, 150); strokeWeight(1);
    line(hx, 55, hx, 118);
    noStroke();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      fill(62 + i * 7, 112 + i * 5, 36, 175);
      ellipse(hx + Math.cos(ang) * 7, 114 + Math.sin(ang) * 5, 9, 5);
    }
    fill(198, 182, 96, 178); ellipse(hx, 108, 10, 13);
  }

  // Large wooden shelving unit (background frame)
  fill(68, 44, 22); noStroke();
  rect(555, 96, 1040, 7, 2);
  for (let i = 0; i <= 6; i++) rect(555 + i * 173, 96, 9, 195);

  // Stone floor
  const flY = EAST_H * 0.8;
  const flG = ctx.createLinearGradient(0, flY, 0, EAST_H);
  flG.addColorStop(0, "#1c1006");
  flG.addColorStop(1, "#0c0602");
  ctx.fillStyle = flG;
  ctx.fillRect(0, flY, EAST_W, EAST_H - flY);
  stroke(28, 16, 6, 90); strokeWeight(0.5); noFill();
  for (let col = 0; col * 72 < EAST_W; col++) rect(col * 72, flY, 72, EAST_H - flY);
  noStroke();

  // Wooden counter on left (where shaker stands)
  fill(92, 58, 28); stroke(65, 40, 18); strokeWeight(1.5);
  rect(28, flY - 22, 226, 30, 3);
  fill(76, 48, 22); noStroke();
  rect(32, flY + 6, 218, 16, 2);
  stroke(78, 50, 24, 80); strokeWeight(0.5);
  for (let i = 0; i < 5; i++) line(38 + i * 44, flY - 20, 42 + i * 44, flY + 6);
  noStroke();

  // Salt pile on counter near shaker
  fill(248, 244, 232, 200); ellipse(192, flY - 16, 30, 11);
  fill(255, 252, 242, 160); ellipse(190, flY - 20, 20, 8);
  fill(255, 255, 242, 200);
  for (let i = 0; i < 6; i++) ellipse(172 + i * 5 + Math.sin(i) * 2, flY - 10 - i * 0.5, 2.5, 2.5);
}

function _drawSlingShelf(d) {
  const sx = d.x - d.w / 2 - 14, sy = d.y + 7, sw = d.w + 14;
  // bracket shadows
  fill(34, 20, 8, 100); noStroke();
  triangle(sx, sy + 4, sx, sy + 26, sx + 18, sy + 4);
  triangle(sx + sw, sy + 4, sx + sw, sy + 26, sx + sw - 18, sy + 4);
  // shelf plank
  fill(98, 62, 30); stroke(70, 44, 20); strokeWeight(1.2);
  rect(sx, sy, sw, 11, 2);
  // top highlight
  stroke(130, 88, 48, 150); strokeWeight(0.7);
  line(sx + 2, sy + 1, sx + sw - 2, sy + 1);
  noStroke();
  // wood grain
  fill(84, 52, 24, 75);
  for (let i = 0; i < 3; i++) rect(sx + 12 + i * (sw / 3.5), sy + 2, 2, 7, 1);
}

function drawDuelGame() {
  if (!slingState.active) return;
  const p = EAST_PALETTE;

  const shakeX = slingState.camShake > 0 ? (Math.random() - 0.5) * slingState.camShake : 0;
  const shakeY = slingState.camShake > 0 ? (Math.random() - 0.5) * slingState.camShake : 0;

  push();
  translate(shakeX, shakeY);

  _drawKitchenBg();
  for (const d of SLING_DISHES) _drawSlingShelf(d);
  for (const dish of slingState.dishes) drawSlingDish(dish);
  drawSlingParticles();
  drawSaltShakerLaunch();

  if (slingState.phase === "aiming") {
    const { mx, my } = getSlingMouseEast();
    if (mx > SLING_LAUNCH_X + 20) {
      drawSlingTrajectory(mx, my);
      stroke(255, 200, 100, 45); strokeWeight(1);
      line(SLING_LAUNCH_X, SLING_LAUNCH_Y - 42, mx, my);
      noStroke();
    }
  }
  if (slingState.salt) drawFlyingSalt(slingState.salt);

  pop();

  // HUD bar
  const ctx = drawingContext;
  const hudG = ctx.createLinearGradient(0, 0, 0, 58);
  hudG.addColorStop(0, "rgba(10,5,1,0.96)");
  hudG.addColorStop(1, "rgba(10,5,1,0.55)");
  ctx.fillStyle = hudG;
  ctx.fillRect(0, 0, EAST_W, 58);

  textFont("Georgia"); textStyle(BOLD); textSize(19); textAlign(LEFT, TOP);
  fill(255, 212, 95); text("Pincée de Sel", 20, 8);
  textStyle(NORMAL); textFont("monospace"); textSize(11);
  fill(p.textDim[0], p.textDim[1], p.textDim[2]); text("Tirs :", 20, 34);
  for (let i = 0; i < SLING_TOTAL_SHOTS; i++) {
    noStroke();
    if (i < slingState.hits)        fill(255, 212, 75, 230);
    else if (i < slingState.shots)  fill(90, 55, 42, 220);
    else                            fill(155, 135, 95, 180);
    ellipse(68 + i * 19, 41, 13, 13);
  }
  textAlign(RIGHT, TOP);
  fill(p.gold[0], p.gold[1], p.gold[2]); textSize(13);
  text(`${slingState.hits} / ${SLING_HITS_TO_WIN} assiettes salées`, EAST_W - 20, 8);
  fill(p.textDim[0], p.textDim[1], p.textDim[2]); textSize(11);
  text("Clic gauche → lancer", EAST_W - 20, 32);

  if (slingState.phase === "intro") {
    fill(10, 5, 1, 185); noStroke(); rect(0, 0, EAST_W, EAST_H);
    fill(34, 20, 8); stroke(175, 138, 62, 160); strokeWeight(2);
    rect(EAST_W / 2 - 430, EAST_H / 2 - 82, 860, 172, 18);
    noStroke();
    fill(255, 215, 90);
    textFont("Georgia"); textStyle(BOLD); textSize(23); textAlign(CENTER, CENTER);
    text("Pincée de Sel", EAST_W / 2, EAST_H / 2 - 50);
    textStyle(NORMAL); fill(p.text[0], p.text[1], p.text[2]); textSize(14);
    text("Chef Sali a aligné six plats sur les étagères de sa cuisine.", EAST_W / 2, EAST_H / 2 - 14);
    text("Vise avec la souris et clique pour lancer une pincée de sel.", EAST_W / 2, EAST_H / 2 + 12);
    fill(p.accentSoft[0], p.accentSoft[1], p.accentSoft[2]);
    textFont("monospace"); textSize(12);
    text(`Touche ${SLING_HITS_TO_WIN} plats sur ${SLING_TOTAL_SHOTS} tirs pour réussir l'épreuve.     [E] — Commencer`, EAST_W / 2, EAST_H / 2 + 52);
    return;
  }

  if (slingState.phase === "done") {
    const win = eastState.duelDone;
    fill(10, 5, 1, 175); noStroke(); rect(0, 0, EAST_W, EAST_H);
    fill(34, 20, 8); noStroke();
    if (win) { stroke(165, 200, 75, 185); } else { stroke(195, 58, 58, 185); }
    strokeWeight(2);
    rect(EAST_W / 2 - 370, EAST_H / 2 - 82, 740, 172, 18);
    noStroke();
    fill(win ? p.greenOk[0] : p.redKo[0], win ? p.greenOk[1] : p.redKo[1], win ? p.greenOk[2] : p.redKo[2]);
    textFont("Georgia"); textStyle(BOLD); textSize(24); textAlign(CENTER, CENTER);
    text(win ? "Épreuve réussie !" : "Trop peu de touches…", EAST_W / 2, EAST_H / 2 - 40);
    textStyle(NORMAL); fill(p.text[0], p.text[1], p.text[2]); textSize(15);
    text(win
      ? `${slingState.hits} plats salés sur ${SLING_TOTAL_SHOTS} tirs — Chef Sali approuve.`
      : `Seulement ${slingState.hits}/${SLING_HITS_TO_WIN} plats touchés. Recommence.`,
      EAST_W / 2, EAST_H / 2 + 4);
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(12);
    text(win ? "[E] — Continuer" : "[E] — Réessayer     [ECHAP] — Quitter", EAST_W / 2, EAST_H / 2 + 46);
  }
}

// ──────────────────────────────────────────────────────────
// MINI-JEU 3 : MÈMES ALIMENTAIRES (images + vocal)
// ──────────────────────────────────────────────────────────
//
// AJOUTER LES MOTS-CLÉS :
//   Pour chaque mème ci-dessous, remplis le tableau keywords:[].
//   Mets tous les mots (en minuscules) que l'utilisateur pourrait
//   prononcer pour identifier cette image.
//   Exemple :  keywords: ["dinde", "banc", "turkey", "volaille"]
//
//   L'utilisateur doit dire au moins UN de ces mots à voix haute
//   pour valider le mème. La reconnaissance est en français (fr-FR).
//
// CHANGER LA DURÉE PAR IMAGE :
//   Modifie MEME_TIME_LIMIT (en frames, 60 frames ≈ 1 seconde).
//
// CHANGER LE SEUIL DE VICTOIRE :
//   Modifie MEME_WIN_THRESHOLD (nombre de mèmes à identifier pour gagner).
// ──────────────────────────────────────────────────────────

const MEME_TIME_LIMIT    = 900;  // frames par image  (≈ 15 s à 60 fps)
const MEME_WIN_THRESHOLD = 6;    // mèmes à identifier sur 11 pour gagner

const MEMES = [
  {
    id:       "blanc-de-dinde",
    path:     "assets/Images jeu meme/banc de dinde.png",
    label:    "Blanc de dinde",
    keywords: ["blanc", "dinde", "noisy", "grand", "doux", "loup"]
  },
  {
    id:       "bouzelouf",
    path:     "assets/Images jeu meme/bouzelouf.png",
    label:    "Bouzelouf",
    keywords: ["bouzelouf", "tasty", "crousty", "cinq"]
  },
  {
    id:       "ce-soir-on-mange-du-riz",
    path:     "assets/Images jeu meme/ce soir on mange du riz.png",
    label:    "Ce soir on mange du riz",
    keywords: ["ce", "soir", "on", "mange", "du", "riz"]
  },
  {
    id:       "fraise-framboise",
    path:     "assets/Images jeu meme/fraise framboise.png",
    label:    "Fraise framboise",
    keywords: ["fraise", "framboise", "myrtille", "renta", "gateau"]
  },
  {
    id:       "il-est-lent-ce-lait",
    path:     "assets/Images jeu meme/il est lent ce lait.png",
    label:    "Il est lent ce lait",
    keywords: ["il", "est", "lent", "ce", "lait"]
  },
  {
    id:       "je-suis-le-laitier",
    path:     "assets/Images jeu meme/je suis le laitier.png",
    label:    "Je suis le laitier",
    keywords: ["je", "suis", "le", "laitier", "mon", "lait", "est", "delicieux"]
  },
  {
    id:       "les-fruits-sont-hyper-tenses",
    path:     "assets/Images jeu meme/les fruits sont hyper tensés.png",
    label:    "Les fruits sont hyper tensés",
    keywords: ["fruits", "sont", "hyper", "tenses", "tensés"]
  },
  {
    id:       "mange-bien",
    path:     "assets/Images jeu meme/mange bien.png",
    label:    "Mange bien",
    keywords: ["mange", "bien"]
  },
  {
    id:       "mayonnaise-sacoche",
    path:     "assets/Images jeu meme/mayonnaise sacoche.png",
    label:    "Mayonnaise sacoche",
    keywords: ["mayonnaise", "sacoche", "fleche"]
  },
  {
    id:       "my-big-burger-sauce-bbq",
    path:     "assets/Images jeu meme/my big burger sauce bbq.png",
    label:    "My big burger sauce bbq",
    keywords: ["my", "big", "burger", "sauce", "bbq", "tk"]
  },
  {
    id:       "tape-dans-les-pates",
    path:     "assets/Images jeu meme/tape dans les pates.png",
    label:    "Tape dans les pates",
    keywords: ["vasy", "tape", "dans", "les", "pates"]
  }
];

const memeState = {
  active:      false,
  phase:       "intro",   // "intro" | "playing" | "done"
  images:      [],
  order:       [],
  currentIdx:  0,
  found:       [],
  feedback:    null,
  listening:   false,
  timeLeft:    MEME_TIME_LIMIT,
  score:       0,
  totalToFind: MEMES.length
};

function preloadMemeImages() {
  memeState.images = MEMES.map((m) => {
    // Encodage propre du path (les noms de fichiers contiennent espaces / accents).
    const encoded = m.path.split("/").map(encodeURIComponent).join("/");
    let img;
    try {
      img = loadImage(
        encoded,
        () => { /* loaded */ },
        () => {
          console.warn("[meme] echec chargement :", m.path);
          // 2eme tentative avec path brut au cas ou
          img = loadImage(m.path, () => {}, () => {
            console.warn("[meme] echec definitif :", m.path);
          });
          memeState.images[MEMES.indexOf(m)] = img;
        }
      );
    } catch (e) {
      console.warn("[meme] loadImage threw :", m.path, e);
      img = null;
    }
    return img;
  });
}

function initMemeGame() {
  memeState.active     = true;
  memeState.phase      = "intro";
  memeState.currentIdx = 0;
  memeState.feedback   = null;
  memeState.timeLeft   = MEME_TIME_LIMIT;
  memeState.score      = 0;
  memeState.order      = shuffleArray(MEMES.map((_, i) => i));
  eastSpeechListen("meme");
}

function _memeAdvance() {
  memeState.currentIdx++;
  memeState.timeLeft = MEME_TIME_LIMIT;
  eastSpeechState.lastTranscript = "";
  if (memeState.currentIdx >= memeState.order.length) {
    memeState.phase = "done";
    eastSpeechStop();
    if (memeState.score >= MEME_WIN_THRESHOLD) eastState.memeDone = true;
    if (typeof GameSounds !== "undefined") {
      GameSounds.play(memeState.score >= MEME_WIN_THRESHOLD ? "win" : "lose");
    }
  }
}

function updateMemeGame() {
  if (!memeState.active || memeState.phase !== "playing") return;

  if (memeState.feedback) {
    memeState.feedback.timer--;
    if (memeState.feedback.timer <= 0) memeState.feedback = null;
  }

  memeState.timeLeft--;
  if (memeState.timeLeft <= 0) {
    memeState.feedback = { text: "Temps écoulé !", ok: false, timer: 90 };
    _memeAdvance();
  }
}

function drawMemeGame() {
  if (!memeState.active) return;
  const p = EAST_PALETTE;

  // Fond panneau
  fill(p.panelBg[0], p.panelBg[1], p.panelBg[2], p.panelBg[3]);
  noStroke();
  rect(60, 60, EAST_W - 120, EAST_H - 120, 14);
  stroke(p.accentSoft[0], p.accentSoft[1], p.accentSoft[2], 100);
  strokeWeight(1); noFill();
  rect(60, 60, EAST_W - 120, EAST_H - 120, 14); noStroke();

  // Titre
  fill(p.gold[0], p.gold[1], p.gold[2]);
  textFont("Georgia"); textStyle(BOLD); textSize(20); textAlign(CENTER, TOP);
  text("Mèmes Alimentaires", EAST_W / 2, 84);

  // Score en cours
  textFont("monospace"); textStyle(NORMAL); textSize(11);
  fill(p.textDim[0], p.textDim[1], p.textDim[2]);
  text(`Identifiés : ${memeState.score} / ${MEME_WIN_THRESHOLD} requis`, EAST_W / 2, 113);

  // Pastilles de progression (une par mème)
  for (let i = 0; i < memeState.totalToFind; i++) {
    const px = EAST_W / 2 - (memeState.totalToFind * 16) / 2 + i * 16 + 8;
    noStroke();
    if (memeState.found[i])                       fill(p.greenOk[0], p.greenOk[1], p.greenOk[2]);
    else if (i < memeState.currentIdx)             fill(p.redKo[0],   p.redKo[1],   p.redKo[2]);
    else if (i === memeState.currentIdx && memeState.phase === "playing") fill(p.gold[0], p.gold[1], p.gold[2]);
    else                                           fill(55, 38, 22);
    ellipse(px, 132, 10, 10);
  }

  // ── INTRO ──
  if (memeState.phase === "intro") {
    fill(p.text[0], p.text[1], p.text[2]);
    textFont("Georgia"); textSize(14); textAlign(CENTER, CENTER);
    text("Chef Sali va te montrer des images venues d'internet.", EAST_W / 2, EAST_H / 2 - 36);
    text("Dis à voix haute un mot qui correspond à l'image.", EAST_W / 2, EAST_H / 2 - 12);
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(11);
    text(`Tu as ${Math.round(MEME_TIME_LIMIT / 60)} secondes par image. Identifie ${MEME_WIN_THRESHOLD} mèmes sur ${MEMES.length} pour gagner.`, EAST_W / 2, EAST_H / 2 + 18);
    fill(p.accentSoft[0], p.accentSoft[1], p.accentSoft[2]); textSize(12);
    text("[E] — Commencer", EAST_W / 2, EAST_H / 2 + 52);
    return;
  }

  // ── DONE ──
  if (memeState.phase === "done") {
    const win = eastState.memeDone;
    fill(win ? p.greenOk[0] : p.redKo[0], win ? p.greenOk[1] : p.redKo[1], win ? p.greenOk[2] : p.redKo[2]);
    textFont("Georgia"); textStyle(BOLD); textSize(22); textAlign(CENTER, CENTER);
    text(win ? "Culture internet validée !" : "Pas assez de mèmes identifiés.", EAST_W / 2, EAST_H / 2 - 26);
    textStyle(NORMAL); fill(p.text[0], p.text[1], p.text[2]); textSize(14);
    text(win
      ? `${memeState.score} / ${memeState.totalToFind} mèmes reconnus. Chef Sali hoche la tête.`
      : `${memeState.score} / ${memeState.totalToFind} reconnus — il en fallait ${MEME_WIN_THRESHOLD}. Réessaie.`,
      EAST_W / 2, EAST_H / 2 + 12);
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(12);
    text(win ? "[E] — Continuer" : "[E] — Réessayer     [ECHAP] — Quitter", EAST_W / 2, EAST_H / 2 + 52);
    return;
  }

  // ── PLAYING ──
  const memeIdx = memeState.order[memeState.currentIdx];
  const meme    = MEMES[memeIdx];
  const img     = memeState.images[memeIdx];

  const imgW = 400, imgH = 230;
  const imgX = EAST_W / 2 - imgW / 2, imgY = 148;

  // Cadre image
  fill(28, 16, 8, 210); noStroke();
  rect(imgX - 6, imgY - 6, imgW + 12, imgH + 12, 8);

  if (img && img.width > 0) {
    imageMode(CORNER);
    image(img, imgX, imgY, imgW, imgH);
    imageMode(CENTER);
  } else {
    fill(46, 28, 14); rect(imgX, imgY, imgW, imgH);
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(12); textAlign(CENTER, CENTER);
    text(`[ ${meme.label} ]`, EAST_W / 2, imgY + imgH / 2);
  }

  // Barre de temps (sous l'image)
  const barY = imgY + imgH + 8;
  const ratio = memeState.timeLeft / MEME_TIME_LIMIT;
  fill(38, 22, 10); noStroke(); rect(imgX, barY, imgW, 9, 3);
  const bc = ratio > 0.5 ? [88, 196, 88] : ratio > 0.25 ? [245, 168, 30] : [215, 48, 48];
  fill(bc[0], bc[1], bc[2]); rect(imgX, barY, imgW * ratio, 9, 3);
  fill(p.textDim[0], p.textDim[1], p.textDim[2]);
  textFont("monospace"); textSize(10); textAlign(RIGHT, TOP);
  text(`${Math.ceil(memeState.timeLeft / 60)}s`, imgX + imgW, barY + 12);

  // Numéro de mème
  textAlign(LEFT, TOP);
  fill(p.textDim[0], p.textDim[1], p.textDim[2]);
  text(`${memeState.currentIdx + 1} / ${memeState.totalToFind}`, imgX, barY + 12);

  // Zone micro
  const micY = barY + 28;
  const isListening = memeState.listening;
  fill(isListening ? 62 : 28, isListening ? 22 : 12, 10, 210);
  noStroke(); rect(EAST_W / 2 - 130, micY, 260, 40, 8);
  if (isListening) {
    stroke(p.accent[0], p.accent[1], p.accent[2], 130 + sin(frameCount * 0.18) * 80);
    strokeWeight(1.5); noFill();
    rect(EAST_W / 2 - 130, micY, 260, 40, 8); noStroke();
  }
  fill(isListening ? p.accent[0] : p.textDim[0],
       isListening ? p.accent[1] : p.textDim[1],
       isListening ? p.accent[2] : p.textDim[2]);
  textFont("monospace"); textSize(11); textAlign(CENTER, CENTER);
  text(isListening ? "🎙 Dis le mot…" : "🎙 En attente…", EAST_W / 2, micY + 20);

  // Dernier transcript affiché
  if (eastSpeechState.lastTranscript) {
    fill(p.textDim[0], p.textDim[1], p.textDim[2]);
    textFont("monospace"); textSize(11); textAlign(CENTER, TOP);
    text(`"${eastSpeechState.lastTranscript}"`, EAST_W / 2, micY + 46);
  }

  // Feedback (bonne/mauvaise réponse / temps écoulé)
  if (memeState.feedback) {
    const alpha = map(memeState.feedback.timer, 0, 90, 0, 255);
    const c = memeState.feedback.ok ? p.greenOk : p.redKo;
    fill(c[0], c[1], c[2], alpha);
    textFont("Georgia"); textStyle(BOLD); textSize(20); textAlign(CENTER, CENTER);
    text(memeState.feedback.text, EAST_W / 2, EAST_H - 100);
    textStyle(NORMAL);
  }

  fill(p.textDim[0], p.textDim[1], p.textDim[2]);
  textFont("monospace"); textSize(10); textAlign(CENTER, BOTTOM);
  text("[ECHAP] — Quitter", EAST_W / 2, EAST_H - 74);
}

// Returns true if transcript matched
function onMemeVoiceResult(transcript) {
  if (memeState.phase !== "playing") return false;
  const norm    = _normalizeVoice(transcript);
  const memeIdx = memeState.order[memeState.currentIdx];
  const meme    = MEMES[memeIdx];

  if (meme.keywords.some(kw => norm.includes(_normalizeVoice(kw)))) {
    memeState.found[memeIdx] = true;
    memeState.score++;
    memeState.feedback = { text: "✓ " + meme.label + " !", ok: true, timer: 110 };
    _memeAdvance();
    return true;
  } else {
    memeState.feedback = { text: "Pas tout à fait… Réessaie.", ok: false, timer: 80 };
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// MOTEUR VOCAL PARTAGÉ
// ──────────────────────────────────────────────────────────

const eastSpeechState = {
  recognition:    null,
  active:         false,
  mode:           null,    // "recette" | "meme"
  lastTranscript: "",
  supported:      false
};

function initEastSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    eastSpeechState.supported = false;
    console.warn("[EST] Web Speech API non supportée.");
    return;
  }
  eastSpeechState.supported = true;
  const recog = new SpeechRecognition();
  recog.lang = "fr-FR";
  recog.continuous = true;
  recog.interimResults = false;
  recog.maxAlternatives = 3;

  recog.onresult = (e) => {
    const finals = Array.from(e.results)
      .slice(e.resultIndex)
      .filter(r => r.isFinal);

    for (const result of finals) {
      // Collect all alternatives (browser may provide up to maxAlternatives)
      const alts = Array.from({ length: result.length }, (_, i) => result[i].transcript.trim());
      eastSpeechState.lastTranscript = alts[0];

      // Try each alternative — stop on first match
      for (const transcript of alts) {
        let matched = false;
        if (eastSpeechState.mode === "recette") {
          recetteState.listening = true;
          matched = onRecetteVoiceResult(transcript);
        } else if (eastSpeechState.mode === "meme") {
          memeState.listening = true;
          matched = onMemeVoiceResult(transcript);
        }
        if (matched) break;
      }
    }
  };

  recog.onend = () => {
    if (eastSpeechState.active) {
      // Small delay avoids rapid start/stop cycling on some browsers
      setTimeout(() => {
        if (eastSpeechState.active) {
          try { recog.start(); } catch (_) {}
        }
      }, 120);
    } else {
      recetteState.listening = false;
      memeState.listening    = false;
    }
  };

  recog.onerror = (e) => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      console.warn("[EST] Speech error:", e.error);
    }
  };

  eastSpeechState.recognition = recog;
}

function eastSpeechListen(mode) {
  // Mode "ecoute" : micro + input ecrit en parallele
  eastSpeechState.mode = mode;
  if (mode === "recette") recetteState.listening = true;
  if (mode === "meme")    memeState.listening    = true;
  showEastTextInput(mode);

  if (!eastSpeechState.supported || !eastSpeechState.recognition) return;
  eastSpeechState.active = true;
  eastSpeechState.lastTranscript = "";
  try { eastSpeechState.recognition.start(); } catch (_) {}
}

function eastSpeechStop() {
  eastSpeechState.active = false;
  eastSpeechState.mode   = null;
  recetteState.listening = false;
  memeState.listening    = false;
  hideEastTextInput();
  try { eastSpeechState.recognition && eastSpeechState.recognition.stop(); } catch (_) {}
}

// ── Input ecrit (clavier) pour les epreuves vocales ──
let _eastTextInputInited = false;
function _initEastTextInput() {
  if (_eastTextInputInited) return;
  const wrap   = document.getElementById("east-text-input");
  const field  = document.getElementById("east-text-field");
  const submit = document.getElementById("east-text-submit");
  if (!wrap || !field || !submit) return;

  const validate = () => {
    const v = (field.value || "").trim();
    if (!v) return;
    field.value = "";
    if (eastSpeechState.mode === "recette") onRecetteVoiceResult(v);
    else if (eastSpeechState.mode === "meme") onMemeVoiceResult(v);
  };
  submit.addEventListener("click", validate);
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); validate(); }
  });
  // Empeche les fleches/touches du jeu de bouger le joueur quand on tape
  field.addEventListener("keydown", (e) => e.stopPropagation());
  _eastTextInputInited = true;
}
function showEastTextInput(mode) {
  _initEastTextInput();
  const wrap  = document.getElementById("east-text-input");
  const field = document.getElementById("east-text-field");
  if (!wrap || !field) return;
  wrap.hidden = false;
  field.placeholder = (mode === "recette")
    ? "Tape le nom du plat puis Entree"
    : "Tape un mot du meme puis Entree";
  field.value = "";
  setTimeout(() => field.focus(), 30);
}
function hideEastTextInput() {
  const wrap = document.getElementById("east-text-input");
  if (wrap) wrap.hidden = true;
}

// ──────────────────────────────────────────────────────────
// DESSIN DE LA ZONE EST (scène principale)
// ──────────────────────────────────────────────────────────

function drawEastZoneBackground() {
  if (eastState.area === "outside") {
    drawEastOutsideBackground();
    return;
  }

  const building = getCurrentBuilding();
  if (building && building.role === "sali") {
    drawSaliKitchenBackground();
    return;
  }

  drawChallengeBuildingBackground(building);
}

function drawSaltCrystal(cx, cy, sz) {
  const s = sz || 1;
  noStroke();
  fill(248, 244, 238, 210);
  beginShape();
  vertex(cx, cy - 18 * s); vertex(cx + 8 * s, cy - 6 * s);
  vertex(cx + 4 * s, cy); vertex(cx - 4 * s, cy); vertex(cx - 8 * s, cy - 6 * s);
  endShape(CLOSE);
  fill(238, 234, 226, 160);
  beginShape();
  vertex(cx + 6 * s, cy - 10 * s); vertex(cx + 16 * s, cy - 4 * s);
  vertex(cx + 12 * s, cy); vertex(cx + 4 * s, cy);
  endShape(CLOSE);
  beginShape();
  vertex(cx - 6 * s, cy - 10 * s); vertex(cx - 16 * s, cy - 4 * s);
  vertex(cx - 12 * s, cy); vertex(cx - 4 * s, cy);
  endShape(CLOSE);
  fill(255, 253, 250, 120);
  ellipse(cx - 2 * s, cy - 12 * s, 3 * s, 5 * s);
}

function drawEastOutsideBackground() {
  const p = EAST_PALETTE;
  const tf = frameCount;
  noStroke();

  // Ciel : degrade plus chaleureux (coucher de soleil sur les salines)
  const skyH = EAST_H * 0.55;
  const skyGrad = drawingContext.createLinearGradient(0, 0, 0, skyH);
  skyGrad.addColorStop(0,   "rgb(225,160,140)");
  skyGrad.addColorStop(0.5, "rgb(238,200,170)");
  skyGrad.addColorStop(1,   "rgb(250,232,205)");
  drawingContext.fillStyle = skyGrad;
  drawingContext.fillRect(0, 0, EAST_W, skyH);

  // Soleil bas
  fill(255, 200, 130, 230);
  ellipse(EAST_W * 0.78, skyH - 22, 90, 90);
  fill(255, 230, 170, 130);
  ellipse(EAST_W * 0.78, skyH - 22, 150, 150);

  // Mer lointaine
  fill(120, 150, 175, 160);
  rect(0, skyH - 14, EAST_W, 18);
  for (let i = 0; i < 24; i++) {
    fill(255, 240, 210, 90);
    rect((i * 88 + (tf * 0.4) % 88), skyH - 8 + (i % 2) * 4, 30, 2, 1);
  }

  // Silhouettes de montagnes de sel (3 plans)
  fill(p.saltRock[0] - 20, p.saltRock[1] - 20, p.saltRock[2] - 20, 200);
  beginShape();
  vertex(0, skyH); vertex(160, skyH - 70); vertex(340, skyH - 14);
  vertex(520, skyH - 80); vertex(720, skyH - 6); vertex(960, skyH - 90);
  vertex(1200, skyH - 8); vertex(1420, skyH - 70); vertex(1640, skyH - 12);
  vertex(1800, skyH - 55); vertex(EAST_W, skyH);
  endShape(CLOSE);
  fill(p.saltRock[0] + 10, p.saltRock[1] + 10, p.saltRock[2] + 10, 170);
  beginShape();
  vertex(0, skyH); vertex(240, skyH - 42); vertex(480, skyH);
  vertex(760, skyH - 58); vertex(1060, skyH); vertex(1300, skyH - 48);
  vertex(1560, skyH); vertex(1760, skyH - 36); vertex(EAST_W, skyH);
  endShape(CLOSE);

  // Plaine de sel (sol)
  fill(p.saltFlat[0], p.saltFlat[1], p.saltFlat[2]);
  rect(0, skyH - 4, EAST_W, EAST_H - skyH + 4);

  // Croute de sel brillante a la surface
  fill(p.saltCrust[0], p.saltCrust[1], p.saltCrust[2], 220);
  rect(0, skyH - 4, EAST_W, 12);

  // Texture craquelee (octogones du sel sec)
  stroke(195, 188, 173, 80); strokeWeight(0.8);
  for (let x = 0; x < EAST_W; x += 60) {
    for (let y = Math.floor(skyH) + 18; y < EAST_H; y += 42) {
      const ox = (y / 42) % 2 ? 30 : 0;
      noFill();
      beginShape();
      vertex(x + ox, y); vertex(x + ox + 30, y - 8);
      vertex(x + ox + 60, y); vertex(x + ox + 60, y + 16);
      vertex(x + ox + 30, y + 24); vertex(x + ox, y + 16);
      endShape(CLOSE);
    }
  }
  noStroke();

  // ──── ROUTE PRINCIPALE : grande allee paves entre les 4 batiments ────
  // Route horizontale qui passe devant les portes
  const roadY = EAST_H * 0.78;
  // ombre
  fill(160, 140, 110, 120);
  rect(0, roadY + 18, EAST_W, 8);
  // base route
  fill(218, 200, 170);
  rect(0, roadY, EAST_W, 36);
  // bordures
  fill(120, 90, 60);
  rect(0, roadY,      EAST_W, 3);
  rect(0, roadY + 33, EAST_W, 3);
  // paves
  stroke(180, 158, 130, 200); strokeWeight(0.8);
  for (let x = 0; x < EAST_W; x += 40) {
    const off = ((x / 40) % 2 === 0) ? 0 : 20;
    line(x + off, roadY + 4,  x + off, roadY + 32);
  }
  for (let y = roadY + 12; y < roadY + 30; y += 12) {
    line(0, y, EAST_W, y);
  }
  noStroke();

  // Petites allees verticales vers chaque porte de batiment
  for (const b of EAST_BUILDINGS) {
    const px = b.x + b.w / 2;
    const py0 = b.y + b.h;
    const py1 = roadY;
    fill(230, 212, 184);
    rect(px - 14, py0, 28, py1 - py0);
    fill(180, 158, 130, 150);
    rect(px - 14, py0, 2, py1 - py0);
    rect(px + 12, py0, 2, py1 - py0);
  }

  // Sortie centrale en bas : grande fleche au sol "← MONDE"
  const gx = EAST_W / 2;
  fill(255, 215, 90, 200);
  beginShape();
  vertex(gx - 28, EAST_H - 18);
  vertex(gx + 28, EAST_H - 18);
  vertex(gx + 28, EAST_H - 10);
  vertex(gx + 38, EAST_H - 10);
  vertex(gx,      EAST_H - 2);
  vertex(gx - 38, EAST_H - 10);
  vertex(gx - 28, EAST_H - 10);
  endShape(CLOSE);
  fill(60, 40, 18);
  textFont("monospace"); textStyle(BOLD); textSize(11); textAlign(CENTER, CENTER);
  text("SORTIE", gx, EAST_H - 14);
  textStyle(NORMAL);

  // Cristaux de sel decoratifs (hors route)
  const crystals = [
    [55, EAST_H - 78, 0.9], [220, EAST_H - 65, 0.7], [490, EAST_H - 80, 1.1],
    [770, EAST_H - 68, 0.8], [1070, EAST_H - 82, 1.0], [1360, EAST_H - 66, 0.9],
    [1620, EAST_H - 78, 1.0], [1860, EAST_H - 65, 0.7]
  ];
  for (const [cx, cy, sz] of crystals) drawSaltCrystal(cx, cy, sz);

  // Petites herbes salines au bord de la route
  for (let i = 0; i < 16; i++) {
    const hx = 90 + i * 116;
    fill(150, 170, 130, 180);
    rect(hx, roadY - 6, 2, 6);
    rect(hx + 4, roadY - 8, 2, 8);
    rect(hx - 3, roadY - 4, 2, 4);
  }

  // Batiments
  for (const b of EAST_BUILDINGS) drawExteriorBuilding(b);

  // Pancarte SORTIE plus visible au-dessus de la fleche
  push();
  translate(gx, EAST_H - 56);
  const pulse = 0.5 + 0.5 * Math.sin(tf * 0.08);
  fill(0, 200);
  rect(-58, -16, 116, 28, 6);
  stroke(255, 215, 90, 200 + pulse * 55); strokeWeight(2); noFill();
  rect(-58, -16, 116, 28, 6); noStroke();
  fill(255, 215, 90);
  textFont("monospace"); textStyle(BOLD); textSize(12); textAlign(CENTER, CENTER);
  text("↓ RETOUR MONDE", 0, -2);
  textStyle(NORMAL);
  pop();
}

const BUILDING_STYLES = {
  recette: { wall: [210, 170, 128], base: [185, 142, 100], roof: [158, 88, 54],  icon: "🍲", windowTint: [160, 210, 180, 190] },
  sali:    { wall: [215, 178, 136], base: [192, 150, 108], roof: [130, 80,  50],  icon: "👨‍🍳", windowTint: [255, 220, 160, 190] },
  duel:    { wall: [190, 160, 175], base: [165, 132, 148], roof: [100, 70, 110],  icon: "⚔️",  windowTint: [180, 170, 230, 190] },
  meme:    { wall: [200, 165, 130], base: [175, 138, 102], roof: [120, 75,  95],  icon: "📱",  windowTint: [200, 180, 215, 190] }
};

function drawExteriorBuilding(building) {
  const p = EAST_PALETTE;
  const x = building.x;
  const y = building.y;
  const w = building.w;
  const h = building.h;
  const doorW = Math.round(w * 0.18);
  const doorH = Math.round(h * 0.38);
  const doorX = x + w / 2 - doorW / 2;
  const doorY = y + h - doorH;
  const style = BUILDING_STYLES[building.id] || BUILDING_STYLES.recette;
  const roofH = Math.round(h * 0.26);
  const winW  = Math.round(w * 0.18);
  const winH  = Math.round(h * 0.26);
  const winY  = y + Math.round(h * 0.28);

  // Statut (termine ou en cours)
  const done = (
    building.id === "recette" ? eastState.recipesFound >= eastState.recipesGoal :
    building.id === "duel"    ? eastState.duelDone :
    building.id === "meme"    ? eastState.memeDone :
    false
  );
  const isNext = !done && (
    (building.id === "recette" && eastState.recipesFound < eastState.recipesGoal) ||
    (building.id === "duel"    && !eastState.duelDone) ||
    (building.id === "meme"    && !eastState.memeDone)
  );

  // Halo lumineux clignotant pour le prochain bâtiment à faire
  if (isNext) {
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.1);
    noStroke();
    fill(style.glow ? style.glow[0] : 255, style.glow ? style.glow[1] : 215, style.glow ? style.glow[2] : 90, 60 + pulse * 80);
    ellipse(x + w / 2, y + h / 2, w + 80 + pulse * 30, h + 80 + pulse * 30);
  }

  // Ombre portée
  noStroke();
  fill(0, 28);
  rect(x + 8, y + h + 3, w, 12, 4);

  // Toit
  fill(style.roof[0], style.roof[1], style.roof[2]);
  triangle(x - 12, y + roofH, x + w + 12, y + roofH, x + w / 2, y - roofH);
  stroke(style.roof[0] - 20, style.roof[1] - 20, style.roof[2] - 20, 180);
  strokeWeight(1.5);
  line(x - 12, y + roofH, x + w / 2, y - roofH);
  line(x + w + 12, y + roofH, x + w / 2, y - roofH);
  noStroke();
  // Tuiles
  fill(style.roof[0] - 30, style.roof[1] - 30, style.roof[2] - 30, 120);
  for (let i = 0; i < 5; i++) {
    rect(x - 6, y + roofH * 0.3 + i * (roofH * 0.18), w + 12, 2);
  }

  // Façade
  fill(style.wall[0], style.wall[1], style.wall[2]);
  rect(x, y, w, h, 10);
  fill(style.base[0], style.base[1], style.base[2]);
  rect(x, y + h - 18, w, 18, 0, 0, 8, 8);
  // Briques douces
  stroke(style.base[0] - 18, style.base[1] - 18, style.base[2] - 18, 80); strokeWeight(0.6);
  for (let by = y + 50; by < y + h - 20; by += 14) line(x + 6, by, x + w - 6, by);
  noStroke();

  // Deux fenêtres lumineuses
  const wt = style.windowTint;
  fill(wt[0], wt[1], wt[2], wt[3]);
  rect(x + Math.round(w * 0.08), winY, winW, winH, 6);
  rect(x + w - Math.round(w * 0.08) - winW, winY, winW, winH, 6);
  stroke(style.roof[0], style.roof[1], style.roof[2], 140); strokeWeight(2);
  const midL = x + Math.round(w * 0.08) + winW / 2;
  const midR = x + w - Math.round(w * 0.08) - winW / 2;
  line(midL, winY, midL, winY + winH);
  line(midR, winY, midR, winY + winH);
  noStroke();
  fill(255, 255, 255, 60);
  rect(x + Math.round(w * 0.08) + 3, winY + 3, winW * 0.46, winH * 0.4, 2);
  rect(x + w - Math.round(w * 0.08) - winW + 3, winY + 3, winW * 0.46, winH * 0.4, 2);

  // Porte
  fill(p.woodDark[0], p.woodDark[1], p.woodDark[2]);
  rect(doorX, doorY, doorW, doorH, 6);
  fill(145, 116, 84);
  rect(doorX + 5, doorY + 7, doorW - 10, doorH - 12, 3);
  fill(220, 190, 130);
  ellipse(doorX + doorW - 10, doorY + doorH / 2, 5, 5);
  // Petit panneau "ENTREE" devant la porte
  fill(0, 180);
  rect(doorX - 4, doorY - 16, doorW + 8, 14, 3);
  fill(255, 215, 130);
  textFont("monospace"); textStyle(BOLD); textSize(8); textAlign(CENTER, CENTER);
  text("[E]", doorX + doorW / 2, doorY - 8);
  textStyle(NORMAL);

  // Enseigne avec icone + nom + statut
  fill(28, 16, 8, 235);
  rect(x + 14, y + 8, w - 28, 40, 6);
  stroke(style.glow ? style.glow[0] : 255, style.glow ? style.glow[1] : 215, style.glow ? style.glow[2] : 90, 180);
  strokeWeight(1.5); noFill();
  rect(x + 14, y + 8, w - 28, 40, 6); noStroke();
  textSize(20); textAlign(LEFT, CENTER);
  text(style.icon, x + 22, y + 28);
  fill(246, 222, 176);
  textFont("Georgia"); textStyle(BOLD); textSize(13); textAlign(CENTER, CENTER);
  text(building.name, x + w / 2 + 10, y + 22);
  textStyle(NORMAL); textSize(9);
  fill(done ? color(120, 220, 140) : color(220, 200, 160));
  text(done ? "✓ termine" : (building.subtitle || ""), x + w / 2 + 10, y + 38);
}

function drawSaliKitchenBackground() {
  const p = EAST_PALETTE;

  // Sol
  fill(p.floor[0], p.floor[1], p.floor[2]);
  noStroke();
  rect(0, 0, EAST_W, EAST_H);

  // Carrelage
  stroke(p.wall[0] - 20, p.wall[1] - 20, p.wall[2] - 20, 60);
  strokeWeight(0.5);
  for (let x = 0; x < EAST_W; x += 48)  line(x, 0, x, EAST_H);
  for (let y = 0; y < EAST_H; y += 48)  line(0, y, EAST_W, y);
  noStroke();

  // Mur du fond
  fill(p.wallTop[0], p.wallTop[1], p.wallTop[2]);
  rect(0, 0, EAST_W, EAST_H * 0.32);

  // Plan de travail
  fill(p.counter[0], p.counter[1], p.counter[2]);
  rect(0, EAST_H * 0.28, EAST_W, 38);
  fill(p.counter[0] - 20, p.counter[1] - 20, p.counter[2] - 20);
  rect(0, EAST_H * 0.28, EAST_W, 6);

  // Casseroles suspendues (couvrent toute la largeur)
  const potCount = Math.floor(EAST_W / 148);
  for (let i = 0; i < potCount; i++) {
    const px = 80 + i * 148;
    stroke(100, 70, 50); strokeWeight(1.5);
    line(px, 0, px, 52); noStroke();
    fill(80, 55, 40);
    ellipse(px, 52, 44, 14);
    fill(110, 80, 55);
    ellipse(px, 46, 40, 32);
    fill(80, 55, 40);
    rect(px + 18, 42, 16, 6, 3);
  }

  // Épices sur le comptoir
  const spices = [
    [200,  60,  40],   // piment
    [255, 200,  50],   // curcuma
    [180, 110,  60],   // cannelle
    [100, 160,  80],   // herbes
    [240, 130,  50],   // paprika
    [220, 200, 180]    // sel
  ];
  const spiceBase = EAST_W * 0.50;
  for (let i = 0; i < spices.length; i++) {
    const sx = spiceBase + i * 72, sy = EAST_H * 0.28 - 28;
    fill(spices[i][0], spices[i][1], spices[i][2]);
    rect(sx - 8, sy, 16, 24, 2);
    fill(200, 190, 180);
    rect(sx - 6, sy - 6, 12, 8, 1);
    fill(spices[i][0], spices[i][1], spices[i][2], 160);
    ellipse(sx, sy - 2, 8, 8);
  }

  // Vapeur montante (particules)
  updateAndDrawSteam();

  // Grande marmite
  const potX = EAST_W * 0.65, potY = EAST_H * 0.28;
  fill(70, 50, 35);
  ellipse(potX, potY - 5, 80, 22);
  fill(90, 65, 45);
  rect(potX - 38, potY - 5, 76, 55, 0, 0, 6, 6);
  fill(70, 50, 35);
  ellipse(potX, potY + 50, 76, 18);
  fill(60, 40, 25);
  rect(potX + 38, potY + 10, 18, 8, 3);
  rect(potX - 56, potY + 10, 18, 8, 3);

  // Fenêtre
  const winX = EAST_W * 0.82, winY = 40, winW = 100, winH = 80;
  fill(180, 210, 230, 140);
  rect(winX, winY, winW, winH, 4);
  stroke(120, 90, 70); strokeWeight(2);
  line(winX + winW / 2, winY, winX + winW / 2, winY + winH);
  line(winX, winY + winH / 2, winX + winW, winY + winH / 2);
  noStroke();
  fill(220, 200, 160, 60);
  rect(winX + 2, winY + 2, winW / 2 - 3, winH / 2 - 3, 2);

  // Porte de sortie
  _drawRoomDoor();

  // Tableau de quêtes (mur gauche)
  drawEastMenuBoard();
}

function _drawRoomDoor() {
  const cx = EAST_W / 2;
  const dw = 88, dh = 72;
  const dx = cx - dw / 2, dy = EAST_H - dh - 10;

  // Stone/mortar door frame
  fill(44, 28, 16); noStroke();
  rect(dx - 10, dy - 8, dw + 20, dh + 18, 4);
  // Lintel (top stone)
  fill(58, 38, 22); rect(dx - 14, dy - 10, dw + 28, 12, 2);

  // Door body
  fill(118, 80, 44); stroke(84, 54, 28); strokeWeight(1.5);
  rect(dx, dy, dw, dh, 3);

  // Recessed panels
  const ph = (dh - 26) / 2;
  fill(102, 68, 36); noStroke();
  rect(dx + 8, dy + 8, dw - 16, ph, 2);
  rect(dx + 8, dy + 8 + ph + 6, dw - 16, ph, 2);

  // Panel highlights
  stroke(140, 100, 58, 120); strokeWeight(0.6); noFill();
  rect(dx + 9, dy + 9, dw - 18, ph - 2, 1);
  rect(dx + 9, dy + 9 + ph + 6, dw - 18, ph - 2, 1);
  noStroke();

  // Door handle
  fill(195, 162, 88); stroke(155, 124, 62); strokeWeight(1);
  ellipse(dx + dw - 15, dy + dh / 2, 11, 11);
  fill(140, 108, 48); noStroke();
  ellipse(dx + dw - 15, dy + dh / 2 + 9, 5, 7);

  // Light seeping under door
  fill(255, 215, 155, 35);
  rect(dx + 4, dy + dh - 2, dw - 8, 3, 1);

  // "SORTIE" sign
  fill(36, 22, 10); stroke(178, 142, 72, 180); strokeWeight(1);
  rect(cx - 40, dy - 26, 80, 20, 3);
  noStroke(); fill(218, 192, 135);
  textFont("monospace"); textStyle(BOLD); textSize(11); textAlign(CENTER, CENTER);
  text("SORTIE", cx, dy - 16);
  textStyle(NORMAL);
}

function _drawRecetteDecor() {
  // Chalkboard on left wall
  fill(28, 46, 36); stroke(72, 52, 32); strokeWeight(3);
  rect(70, 36, 290, 152, 4);
  stroke(90, 68, 44); strokeWeight(1.5); noFill();
  rect(70, 36, 290, 152, 4); noStroke();
  // inner chalk frame
  stroke(200, 200, 188, 70); strokeWeight(1); noFill();
  rect(78, 44, 274, 136, 2); noStroke();
  // chalk text
  fill(220, 218, 206, 195);
  textFont("monospace"); textStyle(BOLD); textSize(13); textAlign(CENTER, TOP);
  text("Menu du Jour", 215, 50);
  textStyle(NORMAL); textSize(10);
  fill(195, 193, 182, 160);
  const plats = ["· Soupe de Sel Cristal", "· Risotto Brume Salée", "· Tarte de l'Abysse", "· Salade des Marées Grises"];
  for (let i = 0; i < plats.length; i++) text(plats[i], 215, 70 + i * 22);
  // smudge
  fill(185, 183, 172, 25); ellipse(318, 170, 44, 16);

  // Cookbook shelf on right wall
  fill(42, 26, 12); stroke(28, 16, 6); strokeWeight(1);
  rect(1575, 40, 290, 152, 4);
  // shelf plank
  fill(84, 54, 26); noStroke();
  rect(1568, 185, 304, 10, 2);
  const bkCols = [[175,44,30],[35,86,148],[44,116,58],[150,116,38],[96,38,125],[174,96,26],[42,108,120]];
  const bkWs   = [28, 20, 24, 16, 26, 22, 18];
  let bx = 1582;
  for (let i = 0; i < bkCols.length; i++) {
    const c = bkCols[i], w = bkWs[i];
    fill(c[0], c[1], c[2]); stroke(c[0]-28, c[1]-18, c[2]-18); strokeWeight(0.8);
    rect(bx, 48, w, 137, 1);
    fill(255, 255, 255, 55); noStroke(); rect(bx + 3, 54, w - 6, 5);
    bx += w + 4;
  }

  // Microphone stand (left of centre console)
  const mx = 756, my = EAST_H * 0.35 + 4;
  fill(72, 62, 58); noStroke(); rect(mx - 2, my - 72, 5, 72);
  fill(56, 48, 44); ellipse(mx, my, 30, 11);
  fill(46, 44, 42); stroke(65, 62, 60); strokeWeight(1);
  ellipse(mx, my - 82, 24, 30);
  fill(74, 72, 70, 180); noStroke();
  for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) ellipse(mx + c * 5, my - 88 + r * 5, 3, 3);
  fill(64, 60, 56); noStroke(); rect(mx - 2, my - 68, 5, 6);

  // Recipe cards pinned on right side wall
  const cards = [{ x:1110, y:44, rot:-0.04 },{ x:1248, y:50, rot:0.03 },{ x:1378, y:42, rot:-0.03 },{ x:1498, y:48, rot:0.05 }];
  for (const cd of cards) {
    push(); translate(cd.x, cd.y); rotate(cd.rot);
    fill(250, 244, 226); stroke(198, 182, 152); strokeWeight(1);
    rect(0, 0, 92, 62, 2);
    fill(212, 48, 48); noStroke(); ellipse(46, 1, 8, 8);
    stroke(158, 138, 108); strokeWeight(0.7);
    for (let l = 0; l < 4; l++) line(10, 16 + l * 11, 82, 16 + l * 11);
    noStroke(); pop();
  }
}

function _drawDuelDecor() {
  // Target boards on left wall
  const tgts = [{ cx:142, cy:104 },{ cx:340, cy:104 }];
  for (const t of tgts) {
    stroke(65, 45, 22); strokeWeight(1.5); line(t.cx, 0, t.cx, 46); noStroke();
    const rings = [[58,[32,32,32]],[42,[198,38,38]],[28,[252,252,252]],[16,[198,38,38]],[7,[255,215,55]]];
    for (const [r, c] of rings) { fill(c[0],c[1],c[2]); ellipse(t.cx,t.cy,r*2,r*2); }
    stroke(255,255,255,55); strokeWeight(0.5);
    line(t.cx-20,t.cy,t.cx+20,t.cy); line(t.cx,t.cy-20,t.cx,t.cy+20); noStroke();
  }

  // Small salt-shaker display shelf (left mid)
  fill(72, 48, 24); stroke(52, 32, 14); strokeWeight(1);
  rect(462, 116, 150, 8, 2); noStroke();
  for (let i = 0; i < 3; i++) {
    const sx = 490 + i * 50;
    fill(232, 228, 212, 215); stroke(182, 172, 150); strokeWeight(1);
    rect(sx - 8, 78, 16, 38, 4);
    fill(188, 184, 175); stroke(148, 142, 130); strokeWeight(1);
    rect(sx - 6, 72, 12, 10, 3);
    fill(55, 55, 55); noStroke();
    for (let j = 0; j < 3; j++) ellipse(sx - 4 + j * 4, 76, 2.2, 2.2);
    fill(255, 255, 255, 68); noStroke(); rect(sx - 5, 82, 3, 24, 1);
  }

  // Salt bags stacked in right corner
  const bags = [{ x:1692, y:206, w:92, h:52 },{ x:1704, y:158, w:88, h:52 },{ x:1698, y:112, w:82, h:50 }];
  for (const b of bags) {
    fill(226, 218, 202); stroke(188, 178, 160); strokeWeight(1.5);
    rect(b.x, b.y, b.w, b.h, 7);
    fill(158, 146, 128); noStroke(); rect(b.x + b.w/2 - 12, b.y - 5, 24, 9, 3);
    fill(138, 126, 110);
    textFont("monospace"); textStyle(BOLD); textSize(11); textAlign(CENTER, CENTER);
    text("SEL", b.x + b.w/2, b.y + b.h/2);
    textStyle(NORMAL);
    fill(245, 242, 235, 175); noStroke();
    for (let d = 0; d < 5; d++) ellipse(b.x + 14 + d * 13, b.y + b.h - 14, 3, 3);
  }

  // Salt crystals on floor corners
  push(); translate(592, EAST_H - 28); scale(0.48); drawSaltCrystal(0, 0, 1); pop();
  push(); translate(630, EAST_H - 20); scale(0.32); drawSaltCrystal(0, 0, 1); pop();
  push(); translate(1374, EAST_H - 28); scale(0.48); drawSaltCrystal(0, 0, 1); pop();
  push(); translate(1412, EAST_H - 20); scale(0.32); drawSaltCrystal(0, 0, 1); pop();
}

function _drawMemeDecor() {
  // Two monitor screens on left wall
  const screens = [{ x:78, y:36, w:268, h:152 },{ x:464, y:40, w:248, h:148 }];
  for (const sc of screens) {
    fill(18, 16, 24); stroke(38, 32, 48); strokeWeight(2);
    rect(sc.x, sc.y, sc.w, sc.h, 6);
    fill(32, 26, 48, 210); noStroke();
    rect(sc.x+6, sc.y+6, sc.w-12, sc.h-12, 3);
    fill(26, 22, 34); noStroke();
    rect(sc.x + sc.w/2 - 11, sc.y + sc.h, 22, 14, 2);
    rect(sc.x + sc.w/2 - 26, sc.y + sc.h + 12, 52, 7, 2);
    fill(60, 240, 80); ellipse(sc.x + 11, sc.y + sc.h - 8, 5, 5);
  }
  // Screen 1 — big smile emoji
  push(); translate(screens[0].x+7, screens[0].y+7);
  const sw = screens[0].w-14, sh = screens[0].h-14;
  fill(255, 205, 48); ellipse(sw/2, sh/2, 94, 94);
  fill(28, 18, 8); ellipse(sw/2-17, sh/2-10, 15, 17); ellipse(sw/2+17, sh/2-10, 15, 17);
  noFill(); stroke(28, 18, 8); strokeWeight(4); arc(sw/2, sh/2+10, 52, 38, 0, PI);
  noStroke(); pop();
  // Screen 2 — bar chart
  push(); translate(screens[1].x+7, screens[1].y+7);
  const sw2 = screens[1].w-14, sh2 = screens[1].h-14;
  const bars = [[0.1,38,195,55,215],[0.28,55,200,55,215],[0.46,215,55,195,215],[0.64,55,160,215,215]];
  for (const [bx2,r,g,b] of bars) { fill(r,g,b,178); rect(sw2*bx2, sh2-68, 28, 60, 2); }
  stroke(152, 132, 175); strokeWeight(0.8); noFill();
  line(sw2*0.05, 10, sw2*0.05, sh2-10); line(sw2*0.05, sh2-10, sw2-8, sh2-10);
  noStroke(); fill(195, 175, 235);
  textFont("monospace"); textSize(10); textAlign(LEFT, TOP); text("VOTES", 12, 12);
  pop();

  // Speakers on right wall
  const spks = [{ x:1670, y:40 },{ x:1810, y:40 }];
  for (const sp of spks) {
    fill(20, 16, 26); stroke(38, 30, 50); strokeWeight(1.5);
    rect(sp.x, sp.y, 82, 144, 5);
    fill(38, 32, 48); stroke(58, 50, 72); strokeWeight(1);
    ellipse(sp.x+41, sp.y+84, 62, 62);
    fill(22, 18, 30); noStroke(); ellipse(sp.x+41, sp.y+84, 40, 40);
    fill(48, 42, 62); ellipse(sp.x+41, sp.y+84, 18, 18);
    fill(38, 32, 48); stroke(58, 50, 72); strokeWeight(0.8);
    ellipse(sp.x+41, sp.y+28, 26, 26);
    fill(22, 18, 30); noStroke(); ellipse(sp.x+41, sp.y+28, 14, 14);
    for (let l = 0; l < 5; l++) {
      const lc = [[255,28,78],[255,175,0],[0,215,115],[28,155,255],[175,0,255]][l];
      fill(lc[0], lc[1], lc[2], 175 + Math.sin(frameCount*0.15 + l)*55);
      rect(sp.x + 7 + l*14, sp.y+132, 10, 5, 2);
    }
  }

  // Trophy on a small shelf (centre-right)
  fill(72, 48, 24); stroke(52, 32, 14); strokeWeight(1);
  rect(820, 154, 186, 8, 2); noStroke();
  const tX = 913, tY = 154;
  fill(215, 172, 58); noStroke();
  rect(tX-8, tY-38, 16, 38, 2);
  fill(228, 188, 68); ellipse(tX, tY-38, 30, 14);
  fill(192, 152, 44); rect(tX-15, tY-12, 30, 6, 1); rect(tX-19, tY-6, 38, 8, 2);
  stroke(215, 172, 58); strokeWeight(2); noFill();
  arc(tX-8, tY-26, 16, 20, HALF_PI, PI+HALF_PI);
  arc(tX+8, tY-26, 16, 20, -HALF_PI, HALF_PI);
  noStroke(); fill(255, 238, 135);
  textFont("Georgia"); textSize(14); textAlign(CENTER, CENTER); text("★", tX, tY-30);
}

function drawChallengeBuildingBackground(building) {
  const theme = getBuildingTheme(building ? building.miniGame : null);
  const mg    = building ? building.miniGame : null;

  // Floor
  noStroke();
  fill(theme.floor[0], theme.floor[1], theme.floor[2]);
  rect(0, 0, EAST_W, EAST_H);

  // Floor tiles
  stroke(theme.floor[0]-18, theme.floor[1]-18, theme.floor[2]-18, 70);
  strokeWeight(0.5);
  for (let x = 0; x < EAST_W; x += 60) line(x, 0, x, EAST_H);
  for (let y = 0; y < EAST_H; y += 60) line(0, y, EAST_W, y);
  noStroke();

  // Wall
  fill(theme.wall[0], theme.wall[1], theme.wall[2]);
  rect(0, 0, EAST_W, EAST_H * 0.35);
  // Wall trim
  fill(theme.trim[0], theme.trim[1], theme.trim[2]);
  rect(0, EAST_H * 0.35, EAST_W, 14);
  // Subtle skirting at bottom
  fill(theme.trim[0]-12, theme.trim[1]-12, theme.trim[2]-12);
  rect(0, EAST_H - 12, EAST_W, 12);

  // Themed decorations
  if (mg === "recette") _drawRecetteDecor();
  if (mg === "duel")    _drawDuelDecor();
  if (mg === "meme")    _drawMemeDecor();

  // Exit door
  _drawRoomDoor();

  // Game console (centre)
  const cx = EAST_W / 2, cy = EAST_H * 0.35;
  fill(48, 32, 22, 225);
  rect(cx - 94, cy - 80, 188, 122, 10);
  fill(theme.glow[0], theme.glow[1], theme.glow[2], 72);
  rect(cx - 86, cy - 72, 172, 58, 6);
  // screen scanlines
  stroke(0, 0, 0, 30); strokeWeight(1); noFill();
  for (let sl = 0; sl < 7; sl++) line(cx-86, cy-72+sl*8, cx+86, cy-72+sl*8);
  noStroke();
  fill(245, 233, 205);
  textFont("Georgia"); textStyle(BOLD); textSize(18); textAlign(CENTER, TOP);
  text(building ? building.name : "Bâtiment", cx, cy - 68);
  fill(222, 212, 184);
  textFont("monospace"); textStyle(NORMAL); textSize(11);
  text(building ? building.subtitle : "Épreuve", cx, cy - 38);
  fill(248, 218, 148);
  text("[E] — Lancer l'épreuve", cx, cy + 18);
}

function drawEastMenuBoard() {
  const p = EAST_PALETTE;
  const bx = 40, by = EAST_H * 0.36, bw = 260, bh = 190;

  fill(80, 52, 32);
  rect(bx, by, bw, bh, 6);
  fill(100, 68, 42);
  rect(bx + 3, by + 3, bw - 6, bh - 6, 4);

  fill(p.gold[0], p.gold[1], p.gold[2]);
  textFont("Georgia"); textStyle(BOLD); textSize(12); textAlign(CENTER, TOP);
  text("Épreuves du Chef", bx + bw / 2, by + 10);

  const items = [
    {
      label: "1. Recette Mystère",
      done: eastState.recipesFound >= eastState.recipesGoal,
      partial: `${eastState.recipesFound}/${eastState.recipesGoal}`
    },
    { label: "2. Duel de Chef",      done: eastState.duelDone },
    { label: "3. Mèmes Alim.",       done: eastState.memeDone }
  ];

  textStyle(NORMAL); textSize(11);
  for (let i = 0; i < items.length; i++) {
    const iy = by + 34 + i * 38;
    fill(items[i].done ? p.greenOk[0] : 60,
         items[i].done ? p.greenOk[1] : 40,
         items[i].done ? p.greenOk[2] : 20, 180);
    rect(bx + 8, iy, bw - 16, 30, 4);
    fill(items[i].done ? p.greenOk[0] : p.textDim[0],
         items[i].done ? p.greenOk[1] : p.textDim[1],
         items[i].done ? p.greenOk[2] : p.textDim[2]);
    textFont("monospace"); textAlign(LEFT, CENTER);
    text(items[i].label, bx + 14, iy + 12);
    if (items[i].partial) {
      textAlign(RIGHT, CENTER);
      text(items[i].partial, bx + bw - 14, iy + 12);
    } else if (items[i].done) {
      textAlign(RIGHT, CENTER);
      text("✓", bx + bw - 14, iy + 12);
    }
  }

  // Check completion globale
  if (
    eastState.recipesFound >= eastState.recipesGoal &&
    eastState.duelDone &&
    eastState.memeDone
  ) {
    eastState.complete = true;
    eastState.saltItemGiven = true;
    if(window.SpaceCrystals)SpaceCrystals.complete('nourriture');
    fill(p.gold[0], p.gold[1], p.gold[2]);
    textFont("Georgia"); textStyle(BOLD); textSize(10); textAlign(CENTER, BOTTOM);
    text("Zone complétée !", bx + bw / 2, by + bh - 6);
    textStyle(NORMAL);
  }
}

// ──────────────────────────────────────────────────────────
// CHEF SALI — DESSIN
// ──────────────────────────────────────────────────────────

function drawChefSali() {
  const p = EAST_PALETTE;
  const cx = chefSali.x;
  chefSali.bobPhase += 0.04;
  const cy = chefSali.y + sin(chefSali.bobPhase) * 2.5;

  // Ombre
  fill(0, 40);
  ellipse(cx, cy + 36, 40, 10);

  // Corps (tablier)
  fill(p.saliApron[0], p.saliApron[1], p.saliApron[2]);
  rect(cx - 16, cy - 18, 32, 44, 4, 4, 8, 8);
  fill(220, 220, 220);
  rect(cx - 6, cy - 14, 12, 36, 3);

  // Bras gauche (tenant une louche)
  fill(p.saliSkin[0], p.saliSkin[1], p.saliSkin[2]);
  rect(cx - 26, cy - 10, 12, 28, 6);
  fill(110, 80, 55);
  rect(cx - 24, cy + 14, 4, 20, 2);
  ellipse(cx - 22, cy + 36, 14, 10);

  // Bras droit
  fill(p.saliSkin[0], p.saliSkin[1], p.saliSkin[2]);
  rect(cx + 14, cy - 10, 12, 28, 6);

  // Tête
  fill(p.saliSkin[0], p.saliSkin[1], p.saliSkin[2]);
  ellipse(cx, cy - 30, 36, 38);

  // Chapeau de chef
  fill(p.saliHat[0], p.saliHat[1], p.saliHat[2]);
  rect(cx - 18, cy - 54, 36, 20, 3);
  rect(cx - 12, cy - 74, 24, 24, 4, 4, 0, 0);
  fill(235, 230, 220);
  rect(cx - 18, cy - 56, 36, 4, 2);

  // Visage (sourcils broussailleux, expression neutre/sévère)
  fill(80, 55, 35);
  // sourcils
  rect(cx - 14, cy - 38, 10, 3, 1);
  rect(cx + 4,  cy - 38, 10, 3, 1);
  // légère inclination mécontente
  push();
  translate(cx - 9, cy - 38);
  rotate(-0.2);
  rect(0, 0, 10, 3, 1);
  pop();
  push();
  translate(cx + 4, cy - 38);
  rotate(0.2);
  rect(0, 0, 10, 3, 1);
  pop();
  // yeux
  fill(50, 30, 20);
  ellipse(cx - 8, cy - 30, 6, 7);
  ellipse(cx + 8, cy - 30, 6, 7);
  fill(255);
  ellipse(cx - 7, cy - 31, 2, 2);
  ellipse(cx + 9, cy - 31, 2, 2);
  // bouche (neutre)
  fill(160, 100, 80);
  rect(cx - 7, cy - 20, 14, 3, 2);

  // Moustache
  fill(80, 55, 35);
  ellipse(cx - 5, cy - 24, 10, 5);
  ellipse(cx + 5, cy - 24, 10, 5);

  // Prompt interaction
  if (!eastState.miniGame) {
    fill(0, 180);
    const lbl = chefSali.prompt;
    textFont("monospace"); textSize(11); textAlign(CENTER, BOTTOM);
    const lw = textWidth(lbl) + 14;
    rect(cx - lw / 2, cy - 90, lw, 18, 4);
    fill(255, 240, 200);
    text(lbl, cx, cy - 74);
  }
}

function drawSaliAvatar(ax, ay) {
  // Version miniature pour les bulles de dialogue
  const p = EAST_PALETTE;
  fill(p.saliSkin[0], p.saliSkin[1], p.saliSkin[2]);
  ellipse(ax, ay, 22, 24);
  fill(p.saliHat[0], p.saliHat[1], p.saliHat[2]);
  rect(ax - 11, ay - 18, 22, 10, 2);
  rect(ax - 7,  ay - 28, 14, 13, 3, 3, 0, 0);
  fill(80, 55, 35);
  ellipse(ax - 4, ay - 2, 4, 5);
  ellipse(ax + 4, ay - 2, 4, 5);
}

// ──────────────────────────────────────────────────────────
// SYSTÈME DIALOGUE CHEF SALI (indépendant du système principal)
// ──────────────────────────────────────────────────────────

const SPEAKER_COLORS_EAST = {
  "Chef Sali":  [230, 140, 70],
  "Narrateur":  [180, 160, 220]
};

function pushSaliDialogue(lines) {
  eastState.saliQueue.push(...lines);
  advanceSaliDialogue();
}

function advanceSaliDialogue() {
  if (eastState.saliQueue.length === 0) {
    eastState.saliDialogue = null;
    return;
  }
  eastState.saliDialogue = eastState.saliQueue.shift();
  eastState.saliCharIdx  = 0;
  eastState.saliFrame    = frameCount;
  if (typeof GameSounds !== "undefined" && eastState.saliDialogue) {
    GameSounds.speakLine(eastState.saliDialogue.speaker, eastState.saliDialogue.text);
  }
}

function updateSaliDialogue() {
  if (!eastState.saliDialogue) return;
  const speed = (typeof DIALOGUE_TYPING_SPEED !== "undefined") ? DIALOGUE_TYPING_SPEED : 1.5;
  const elapsed = frameCount - eastState.saliFrame;
  eastState.saliCharIdx = min(
    eastState.saliDialogue.text.length,
    Math.floor(elapsed / speed)
  );
}

function drawSaliDialogue() {
  if (!eastState.saliDialogue) return;
  const p = EAST_PALETTE;
  const boxX = 30, boxY = EAST_H - 110, boxW = EAST_W - 60, boxH = 88;

  noStroke();
  fill(0, 215);
  rect(boxX, boxY, boxW, boxH, 10);
  stroke(160, 100, 60, 120); strokeWeight(1); noFill();
  rect(boxX, boxY, boxW, boxH, 10); noStroke();

  const sc = SPEAKER_COLORS_EAST[eastState.saliDialogue.speaker] || [255, 255, 255];
  fill(sc[0], sc[1], sc[2]);
  textFont("Georgia"); textStyle(BOLD); textSize(14); textAlign(LEFT, TOP);
  text(eastState.saliDialogue.speaker, boxX + 14, boxY + 8);

  textStyle(NORMAL); textSize(13); fill(245, 235, 215);
  text(
    eastState.saliDialogue.text.substring(0, eastState.saliCharIdx),
    boxX + 14, boxY + 30, boxW - 28, boxH - 38
  );

  // Triangle "continuer"
  if (eastState.saliCharIdx >= eastState.saliDialogue.text.length && frameCount % 60 < 30) {
    fill(255);
    triangle(
      boxX + boxW - 20, boxY + boxH - 14,
      boxX + boxW - 10, boxY + boxH - 14,
      boxX + boxW - 15, boxY + boxH - 6
    );
  }

  fill(255, 200); textFont("monospace"); textSize(9); textAlign(RIGHT, TOP);
  text("[E/ESPACE]", boxX + boxW - 12, boxY + 8);
}

function saliDialogueKeyPress() {
  if (!eastState.saliDialogue) return false;
  if (eastState.saliCharIdx < eastState.saliDialogue.text.length) {
    eastState.saliCharIdx = eastState.saliDialogue.text.length;
    return true;
  }
  advanceSaliDialogue();
  return true;
}

// ──────────────────────────────────────────────────────────
// VAPEUR (particules décoratives)
// ──────────────────────────────────────────────────────────

function updateAndDrawSteam() {
  const p = EAST_PALETTE;
  const potX = EAST_W * 0.65, potY = EAST_H * 0.28 - 5;

  // Ajout de nouvelles particules
  if (frameCount % 8 === 0) {
    eastState.steamParticles.push({
      x:     potX + random(-14, 14),
      y:     potY,
      vx:    random(-0.3, 0.3),
      vy:    random(-1.2, -0.6),
      alpha: 160,
      size:  random(10, 20)
    });
  }

  noStroke();
  for (let i = eastState.steamParticles.length - 1; i >= 0; i--) {
    const s = eastState.steamParticles[i];
    s.x     += s.vx;
    s.y     += s.vy;
    s.alpha -= 2.8;
    s.size  += 0.4;
    if (s.alpha <= 0) { eastState.steamParticles.splice(i, 1); continue; }
    fill(p.steam[0], p.steam[1], p.steam[2], s.alpha);
    ellipse(s.x, s.y, s.size, s.size);
  }
}

// ──────────────────────────────────────────────────────────
// JOUEUR DANS LA ZONE EST
// ──────────────────────────────────────────────────────────

// L'état du joueur est géré depuis script.js (playerIn ou westPlayer).
// eastPlayer est une copie légère pour la zone Est.
const eastPlayer = {
  x:         EAST_W / 2,
  y:         EAST_H - 70,
  walkPhase: 0,
  facing:    3            // 3 = regarde vers le haut (vers Chef Sali)
};

function drawEastPlayer() {
  // Reutilise le sprite global pour un design uniforme partout.
  if (typeof drawHeroSprite === "function") {
    drawHeroSprite(eastPlayer.x, eastPlayer.y, eastPlayer.facing, eastPlayer.walkPhase);
  }
}

// ──────────────────────────────────────────────────────────
// HOOKS PRINCIPAUX (à appeler depuis script.js)
// ──────────────────────────────────────────────────────────

/**
 * initEastZone()
 * À appeler dans setup() de script.js, après createCanvas().
 */
function initEastZone() {
  eastState.active = false;
  eastState.area = "outside";
  eastState.currentBuilding = null;
  eastState.saliMet = false;
  recetteState.found = new Array(RECIPES.length).fill(false);
  memeState.found    = new Array(MEMES.length).fill(false);
  initEastSpeech();
  // Note : preloadMemeImages() doit être appelé séparément dans setup()
}

/**
 * enterEastZone()
 * À appeler quand le joueur entre dans la zone Est
 * (par ex. en touchant un portail en world).
 */
function enterEastZone() {
  eastState.active = true;
  if (typeof scene !== "undefined") scene = "east";
  eastState.area = "outside";
  eastState.currentBuilding = null;
  eastState.miniGame = null;

  // Spawn intelligent selon l'avancement
  if (!eastState.saliMet) {
    // Premiere visite : devant la Cuisine de Sali (porte centrale)
    const sali = EAST_BUILDINGS.find(b => b.id === "sali");
    eastPlayer.x = sali.x + sali.w / 2;
    eastPlayer.y = sali.y + sali.h + 18;
  } else {
    // Visite suivante : devant le prochain mini-jeu non termine
    let target = null;
    if (eastState.recipesFound < eastState.recipesGoal) target = EAST_BUILDINGS.find(b => b.id === "recette");
    else if (!eastState.duelDone) target = EAST_BUILDINGS.find(b => b.id === "duel");
    else if (!eastState.memeDone) target = EAST_BUILDINGS.find(b => b.id === "meme");
    if (!target) target = EAST_BUILDINGS.find(b => b.id === "sali");
    eastPlayer.x = target.x + target.w / 2;
    eastPlayer.y = target.y + target.h + 18;
  }
  eastPlayer.facing = 3;

  eastSpeechStop();
  eastState._saliMenuOpen = false;
  if (!eastState.saliMet) pushSaliDialogue(SALI_LINES.outsideIntro);
}

/**
 * leaveEastArea()
 * Retourne dans le monde global. Appelée quand le joueur sort par la porte Est.
 */
function leaveEastArea() {
  eastState.active = false;
  eastSpeechStop();
  eastState.miniGame = null;
  eastState._saliMenuOpen = false;
  if (typeof scene !== "undefined") scene = "world";
  if (typeof player !== "undefined" && typeof WORLD_H !== "undefined") {
    player.x = eastState.returnWorldX;
    player.y = WORLD_H - player.radius - 18;
  }
}

/**
 * drawEastScene()
 * Appelée par le draw() global : scene 1920×400 → canvas planetaire 5760×1200 (fit-to-width).
 */
function drawEastScene() {
  // Decor lateral CAVE (salines + cuisinerie sur les ecrans gauche/droit)
  if (typeof drawSideDecorForEast === "function") drawSideDecorForEast();

  const fit = getEastFit();
  const p = EAST_PALETTE;

  // Bandes haut/bas de l'ecran central : decor ciel + sol etendu pour
  // eviter les bandes noires inelegantes du fit-to-width.
  // Bande haute = extension du ciel
  drawingContext.save();
  noStroke();
  if (fit.oy > 0) {
    const skyG = drawingContext.createLinearGradient(0, 0, 0, fit.oy);
    skyG.addColorStop(0, "rgb(180,120,110)");
    skyG.addColorStop(1, "rgb(225,160,140)");
    drawingContext.fillStyle = skyG;
    drawingContext.fillRect(fit.ox, 0, EAST_W * fit.sx, fit.oy);
  }
  // Bande basse = extension du sable / salines
  const bottomY = fit.oy + EAST_H * fit.sy;
  const bottomH = (typeof PLANET_H !== "undefined" ? PLANET_H : height) - bottomY;
  if (bottomH > 0) {
    fill(p.saltFlat[0] - 10, p.saltFlat[1] - 10, p.saltFlat[2] - 10);
    rect(fit.ox, bottomY, EAST_W * fit.sx, bottomH);
    // Texture craquelee
    stroke(195, 188, 173, 60); strokeWeight(0.8);
    for (let x = 0; x < EAST_W * fit.sx; x += 70) {
      for (let y = bottomY + 16; y < bottomY + bottomH; y += 50) {
        const off = ((y / 50) % 2) ? 35 : 0;
        noFill();
        beginShape();
        vertex(fit.ox + x + off, y); vertex(fit.ox + x + off + 35, y - 10);
        vertex(fit.ox + x + off + 70, y); vertex(fit.ox + x + off + 70, y + 20);
        vertex(fit.ox + x + off + 35, y + 30); vertex(fit.ox + x + off, y + 20);
        endShape(CLOSE);
      }
    }
    noStroke();
  }
  drawingContext.restore();

  push();
  translate(fit.ox, fit.oy);
  scale(fit.sx, fit.sy);
  drawEastZone();
  pop();

  // HUD est : en coords ecran absolues, sous le HUD global (y=42).
  drawEastHUDAbsolute();
}

/** HUD de la zone est en coords ecran (CAVE 5760x1200). */
function drawEastHUDAbsolute() {
  const p = EAST_PALETTE;
  const building = getCurrentBuilding();
  const locationLabel = eastState.area === "outside"
    ? "Exterieur"
    : (building ? building.name : "Interieur");

  const CX0 = (typeof CENTER_X0 !== "undefined") ? CENTER_X0 : 0;
  const SCRW = (typeof SCREEN_W !== "undefined") ? SCREEN_W : (typeof VIEW_W !== "undefined" ? VIEW_W : width);
  // Sous le bandeau du haut (qui finit a y=42)
  const y = 56;
  const h = 44;
  const w = SCRW - 32;
  const x = CX0 + 16;

  fill(0, 200); rect(x, y, w, h, 8);
  stroke(p.gold[0], p.gold[1], p.gold[2], 200); strokeWeight(2); noFill();
  rect(x, y, w, h, 8); noStroke();

  fill(p.gold[0], p.gold[1], p.gold[2]);
  textFont("monospace"); textStyle(BOLD); textSize(15); textAlign(LEFT, CENTER);
  text(`ZONE EST — ${locationLabel}`, x + 14, y + h / 2);

  fill(p.text[0], p.text[1], p.text[2]);
  textAlign(CENTER, CENTER); textStyle(NORMAL); textSize(14);
  const summary = `Recettes : ${eastState.recipesFound}/${eastState.recipesGoal}  |  ` +
                  `Duel : ${eastState.duelDone ? "✓" : "—"}  |  ` +
                  `Memes : ${eastState.memeDone ? "✓" : "—"}`;
  text(summary, x + w / 2, y + h / 2);

  if (eastState.complete) {
    fill(p.greenOk[0], p.greenOk[1], p.greenOk[2]);
    textAlign(RIGHT, CENTER); textStyle(BOLD); textSize(14);
    text("ZONE COMPLETEE ✓", x + w - 14, y + h / 2);
    textStyle(NORMAL);
  }
}

// Helper de scaling pour la zone est : scale UNIFORME (fit-to-width) avec
// offset vertical centre. Les bandes haut/bas du CAVE sont comblees par un
// decor de ciel + sable etendu (pas de bandes noires).
function getEastFit() {
  const CX0 = (typeof CENTER_X0 !== "undefined") ? CENTER_X0 : 0;
  const SCRW = (typeof SCREEN_W !== "undefined") ? SCREEN_W : ((typeof VIEW_W !== "undefined") ? VIEW_W : width);
  const SCRH = (typeof PLANET_H !== "undefined") ? PLANET_H : ((typeof VIEW_H !== "undefined") ? VIEW_H : height);
  const s = SCRW / EAST_W; // fit-to-width : remplit la largeur de l'ecran central
  return {
    sx: s,
    sy: s,
    s: s,
    ox: CX0,
    oy: (SCRH - EAST_H * s) / 2,
    sceneW: EAST_W,
    sceneH: EAST_H
  };
}

/**
 * drawEastZone()
 * Remplace le contenu de draw() quand scene === "east".
 * Dessine TOUT : fond, PNJ, joueur, mini-jeu actif, dialogues.
 */
function drawEastZone() {
  if (!eastState.active) return;

  drawEastZoneBackground();

  // Chef Sali (masqué pendant un mini-jeu actif)
  if (!eastState.miniGame && isInsideSaliKitchen()) drawChefSali();

  // Joueur (masqué pendant un mini-jeu)
  if (!eastState.miniGame) {
    drawEastPlayer();
    drawEastInteractionPrompts();
  }

  // Mini-jeu actif
  if (eastState.miniGame === "recette") drawRecetteGame();
  if (eastState.miniGame === "duel")    drawDuelGame();
  if (eastState.miniGame === "meme")    drawMemeGame();

  // Dialogues Chef Sali (toujours au-dessus)
  updateSaliDialogue();
  drawSaliDialogue();

  // HUD est : dessine HORS du scale (en coords ecran), depuis drawEastScene.
}

/**
 * updateEast()
 * À appeler dans draw() avant drawEastZone() quand scene === "east".
 */
function updateEast() {
  if (!eastState.active) return;
  if (typeof logOpen !== "undefined" && logOpen) return;
  if (typeof interactPrompt !== "undefined") interactPrompt = null;

  const wasComplete = eastState.complete;
  eastState.complete =
    eastState.recipesFound >= eastState.recipesGoal &&
    eastState.duelDone &&
    eastState.memeDone;

  // Premiere fois que la zone est completee : Chef Sali oriente vers le Roi
  if (!wasComplete && eastState.complete && !eastState.completionAnnounced) {
    eastState.completionAnnounced = true;
    pushSaliDialogue([
      { speaker: "Chef Sali", text: "Hmpf... Tu as passe les trois epreuves. Tu merites ce flacon de SEL D'UMAMI." },
      { speaker: "Chef Sali", text: "Apporte-le au Roi Dulcis. C'est le deuxieme plat de son Menu Cosmique." }
    ]);
  }

  // Mouvements joueur (hors mini-jeu) — meme vitesse que dans les autres zones
  if (!eastState.miniGame && !eastState.saliDialogue) {
    const running = keyIsDown(SHIFT) ? 2.2 : 1.0;
    const speed = 5.2 * running;
    let dx = 0, dy = 0;
    // ZQSD (FR) + WASD (QWERTY) + fleches
    if (keyIsDown(LEFT_ARROW)  || keyIsDown(81) || keyIsDown(65))  { dx -= speed; eastPlayer.facing = 1; eastPlayer.walkPhase += 0.18; }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68))                    { dx += speed; eastPlayer.facing = 2; eastPlayer.walkPhase += 0.18; }
    if (keyIsDown(UP_ARROW)    || keyIsDown(90) || keyIsDown(87))  { dy -= speed; eastPlayer.facing = 3; eastPlayer.walkPhase += 0.18; }
    if (keyIsDown(DOWN_ARROW)  || keyIsDown(83))                    { dy += speed; eastPlayer.facing = 0; eastPlayer.walkPhase += 0.18; }
    moveEastPlayerBy(dx, dy);

    // Reset walkPhase si immobile
    const moving =
      keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW) ||
      keyIsDown(UP_ARROW)   || keyIsDown(DOWN_ARROW)  ||
      keyIsDown(65) || keyIsDown(68) || keyIsDown(87) || keyIsDown(83) ||
      keyIsDown(81) || keyIsDown(90);
    if (!moving) eastPlayer.walkPhase = 0;
  }

  updateRecetteGame();
  updateDuelGame();
  updateMemeGame();
}

/**
 * keyPressedEast(key, keyCode)
 * À appeler dans keyPressed() de script.js quand scene === "east".
 * Retourne true si la touche a été consommée.
 */
function keyPressedEast() {
  // Dialogue en cours → n'importe quelle touche avance
  if (eastState.saliDialogue) {
    const closed = saliDialogueKeyPress();
    if (closed && !eastState.saliDialogue && eastState._pendingMiniGame) {
      const toStart = eastState._pendingMiniGame;
      eastState._pendingMiniGame = null;
      startEastMiniGame(toStart);
    }
    return true;
  }

  // ECHAP — quitter mini-jeu
  if (keyCode === 27) {
    if (eastState.miniGame) {
      eastSpeechStop();
      eastState.miniGame = null;
      return true;
    }
    return false;
  }

  // S — passer la recette courante
  if ((key === 's' || key === 'S') && eastState.miniGame === "recette" && recetteState.phase === "playing") {
    _recetteSkip();
    return true;
  }

  // Interaction / avancer dialogue mini-jeu
  if (keyCode === 69 || keyCode === 32) {
    // Mini-jeu recette
    if (eastState.miniGame === "recette") {
      if (recetteState.phase === "intro") {
        recetteState.phase = "playing";
        return true;
      }
      if (recetteState.phase === "done") {
        eastSpeechStop();
        eastState.miniGame = null;
        return true;
      }
      return true;
    }

    // Mini-jeu duel (Pincée de Sel — slingState)
    if (eastState.miniGame === "duel") {
      if (slingState.phase === "intro") {
        slingState.phase = "aiming";
        return true;
      }
      if (slingState.phase === "done") {
        if (eastState.duelDone) {
          eastState.miniGame = null;
          slingState.active = false;
        } else {
          initDuelGame();
          slingState.phase = "aiming";
        }
        return true;
      }
      return true;
    }

    // Mini-jeu mème
    if (eastState.miniGame === "meme") {
      if (memeState.phase === "intro") {
        memeState.phase = "playing";
        memeState.timeLeft = MEME_TIME_LIMIT;
        return true;
      }
      if (memeState.phase === "done") {
        if (eastState.memeDone || keyCode === 27) {
          eastSpeechStop();
          eastState.miniGame = null;
        } else {
          initMemeGame();
          memeState.phase = "playing";
        }
        return true;
      }
      if (keyCode === 27) {
        eastSpeechStop();
        eastState.miniGame = null;
        return true;
      }
      return true;
    }

    // Interactions de zone
    if (!eastState.miniGame) {
      if (eastState.area === "outside") {
        if (isNearOutsideExit()) {
          leaveEastArea();
          return true;
        }
        const nearbyDoor = getNearbyBuildingDoor();
        if (nearbyDoor) {
          enterEastBuilding(nearbyDoor.building.id);
          return true;
        }
      } else {
        const building = getCurrentBuilding();
        if (isNearInteriorExit()) {
          exitEastBuilding();
          return true;
        }
        if (building && building.role === "sali") {
          const d = dist(eastPlayer.x, eastPlayer.y, chefSali.x, chefSali.y);
          if (d < chefSali.threshold) {
            openSaliMenu();
            return true;
          }
        }
        if (building && building.role === "game" && building.miniGame && isNearChallengeConsole()) {
          launchMiniGameFromBuilding(building.miniGame);
          return true;
        }
      }
    }
    return false;
  }

  // Pincée de Sel : E démarre ou continue, ECHAP quitte
  if (eastState.miniGame === "duel" && slingState.active) {
    if (slingState.phase === "intro") {
      slingState.phase = "aiming";
      return true;
    }
    if (slingState.phase === "done") {
      if (eastState.duelDone || keyCode === 27) {
        // victoire ou ECHAP → retour à la zone est
        eastState.miniGame = null;
        slingState.active  = false;
      } else {
        // défaite + toute autre touche → réessayer
        initDuelGame();
        slingState.phase = "aiming";
      }
      return true;
    }
    return true;
  }

  return false;
}

// ──────────────────────────────────────────────────────────
// MENU CHEF SALI
// ──────────────────────────────────────────────────────────

function openSaliMenu() {
  if (!isInsideSaliKitchen()) return;
  const lines = eastState.saliMet ? SALI_LINES.revisit : SALI_LINES.revisit;
  pushSaliDialogue(lines);
}

function getBuildingById(id) {
  return EAST_BUILDINGS.find(b => b.id === id) || null;
}

function getCurrentBuilding() {
  if (eastState.area !== "inside") return null;
  return getBuildingById(eastState.currentBuilding);
}

function isInsideSaliKitchen() {
  return eastState.area === "inside" && eastState.currentBuilding === "sali";
}

function getBuildingDoor(building) {
  const doorW = 52;
  const doorH = 56;
  return {
    x: building.x + building.w / 2,
    y: building.y + building.h - doorH / 2,
    w: doorW,
    h: doorH
  };
}

function getNearbyBuildingDoor() {
  if (eastState.area !== "outside") return null;
  let best = null;
  let bestDist = Infinity;
  for (const building of EAST_BUILDINGS) {
    const door = getBuildingDoor(building);
    const targetY = door.y + door.h / 2 + 8;
    const d = dist(eastPlayer.x, eastPlayer.y, door.x, targetY);
    if (d < 110 && d < bestDist) {
      best = { building, door };
      bestDist = d;
    }
  }
  return best;
}

function isNearInteriorExit() {
  if (eastState.area !== "inside") return false;
  return dist(eastPlayer.x, eastPlayer.y, EAST_W / 2, EAST_H - 52) < 74;
}

function isNearOutsideExit() {
  if (eastState.area !== "outside") return false;
  return eastPlayer.y > EAST_H - 55 && abs(eastPlayer.x - EAST_W / 2) < 90;
}

function isNearChallengeConsole() {
  if (eastState.area !== "inside") return false;
  return dist(eastPlayer.x, eastPlayer.y, EAST_W / 2, EAST_H * 0.35 + 4) < 86;
}

function startEastMiniGame(which) {
  eastSpeechStop();
  eastState.miniGame = which;
  if (which === "recette") {
    initRecetteGame();
    speakGameRules([
      { speaker: "Chef Sali", text: "Atelier Recettes." },
      { speaker: "Narrateur", text: "Je vais décrire un plat. Crie son nom dans le microphone ou tape-le dans le champ de texte, puis valide. Cinq recettes à identifier pour réussir." }
    ]);
  }
  if (which === "duel") {
    initDuelGame();
    speakGameRules([
      { speaker: "Chef Sali", text: "Pincée de Sel." },
      { speaker: "Narrateur", text: "Six assiettes sont sur les étagères. Tu as huit tirs pour en toucher cinq. Vise avec la souris et clique pour lancer." }
    ]);
  }
  if (which === "meme") {
    initMemeGame();
    speakGameRules([
      { speaker: "Chef Sali", text: "Salle des Mèmes." },
      { speaker: "Narrateur", text: "Une image s'affiche. Écris ce que tu vois dans le champ de texte et valide avant la fin du temps. Identifie le maximum de mèmes pour réussir." }
    ]);
  }
}

function launchMiniGameFromBuilding(which) {
  const doneMap = {
    recette: eastState.recipesFound >= eastState.recipesGoal,
    duel:    eastState.duelDone,
    meme:    eastState.memeDone
  };
  if (doneMap[which]) {
    pushSaliDialogue([{ speaker: "Narrateur", text: "Cette épreuve est déjà terminée dans ce bâtiment." }]);
    return;
  }
  startEastMiniGame(which);
}

function enterEastBuilding(buildingId) {
  const building = getBuildingById(buildingId);
  if (!building) return;

  eastState.area = "inside";
  eastState.currentBuilding = building.id;
  eastState._saliMenuOpen = false;
  eastSpeechStop();

  eastPlayer.x = EAST_W / 2;
  eastPlayer.y = EAST_H - 92;
  eastPlayer.facing = 3;
  eastPlayer.walkPhase = 0;

  if (building.role === "sali" && !eastState.saliMet) {
    eastState.saliMet = true;
    pushSaliDialogue(SALI_LINES.intro);
  }
}

function exitEastBuilding() {
  const building = getCurrentBuilding();
  if (!building) return;

  const door = getBuildingDoor(building);
  eastState.area = "outside";
  eastState.currentBuilding = null;
  eastState._saliMenuOpen = false;
  eastSpeechStop();

  eastPlayer.x = door.x;
  eastPlayer.y = Math.min(EAST_H - 34, door.y + 72);
  eastPlayer.facing = 3;
  eastPlayer.walkPhase = 0;
}

function moveEastPlayerBy(dx, dy) {
  if (dx !== 0) {
    const nx = eastPlayer.x + dx;
    if (canEastPlayerMoveTo(nx, eastPlayer.y)) eastPlayer.x = nx;
  }
  if (dy !== 0) {
    const ny = eastPlayer.y + dy;
    if (canEastPlayerMoveTo(eastPlayer.x, ny)) eastPlayer.y = ny;
  }
}

function canEastPlayerMoveTo(x, y) {
  if (eastState.area === "outside") {
    if (x < 20 || x > EAST_W - 20 || y < 60 || y > EAST_H - 20) return false;
    for (const building of EAST_BUILDINGS) {
      if (pointInRect(x, y, building.x + 10, building.y + 20, building.w - 20, building.h - 10)) return false;
    }
    return true;
  }

  return x >= 28 && x <= EAST_W - 28 && y >= 50 && y <= EAST_H - 20;
}

function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function drawEastInteractionPrompts() {
  if (eastState.miniGame || eastState.saliDialogue) return;

  if (eastState.area === "outside") {
    const nearDoor = getNearbyBuildingDoor();
    if (nearDoor) drawPromptTag(nearDoor.door.x, nearDoor.door.y + 22, `[E] Entrer : ${nearDoor.building.name}`);
    if (isNearOutsideExit()) drawPromptTag(EAST_W / 2, EAST_H - 86, "[E] Quitter la Zone Est");
    return;
  }

  if (isNearInteriorExit()) drawPromptTag(EAST_W / 2, EAST_H - 96, "[E] Sortir du bâtiment");

  const building = getCurrentBuilding();
  if (building && building.role === "game" && isNearChallengeConsole()) {
    drawPromptTag(EAST_W / 2, EAST_H * 0.35 - 90, `[E] Lancer : ${building.name}`);
  }
}

function drawPromptTag(x, y, label) {
  textFont("monospace"); textSize(11); textStyle(NORMAL); textAlign(CENTER, CENTER);
  const w = textWidth(label) + 16;
  noStroke();
  fill(0, 178);
  rect(x - w / 2, y - 10, w, 20, 5);
  fill(255, 238, 194);
  text(label, x, y + 1);
}

function getBuildingTheme(miniGame) {
  if (miniGame === "recette") {
    return { wall: [144, 102, 84], trim: [108, 68, 52], floor: [176, 142, 110], glow: [255, 198, 112] };
  }
  if (miniGame === "duel") {
    return { wall: [94, 84, 124], trim: [66, 58, 90], floor: [150, 142, 176], glow: [170, 205, 255] };
  }
  if (miniGame === "meme") {
    return { wall: [128, 92, 108], trim: [88, 58, 70], floor: [175, 140, 156], glow: [255, 170, 208] };
  }
  return { wall: [130, 100, 80], trim: [96, 70, 55], floor: [180, 152, 122], glow: [255, 214, 146] };
}

// ──────────────────────────────────────────────────────────
// HUD ZONE EST
// ──────────────────────────────────────────────────────────

function drawEastHUD() {
  const p = EAST_PALETTE;
  const building = getCurrentBuilding();
  const locationLabel = eastState.area === "outside"
    ? "Extérieur"
    : (building ? building.name : "Intérieur");

  // Bandeau haut
  noStroke(); fill(0, 170);
  rect(0, 0, EAST_W, 36);

  fill(p.gold[0], p.gold[1], p.gold[2]);
  textFont("monospace"); textStyle(BOLD); textSize(13); textAlign(LEFT, CENTER);
  text(`ZONE EST — ${locationLabel}`, 14, 18);

  fill(p.text[0], p.text[1], p.text[2]);
  textAlign(CENTER, CENTER); textStyle(NORMAL); textSize(11);
  const summary = `Recettes : ${eastState.recipesFound}/${eastState.recipesGoal}  |  ` +
                  `Duel : ${eastState.duelDone ? "✓" : "—"}  |  ` +
                  `Mèmes : ${eastState.memeDone ? "✓" : "—"}`;
  text(summary, EAST_W / 2, 18);

  if (eastState.complete) {
    fill(p.greenOk[0], p.greenOk[1], p.greenOk[2]);
    textAlign(RIGHT, CENTER); textStyle(BOLD); textSize(12);
    text("ZONE COMPLÉTÉE ✓", EAST_W - 14, 18);
    textStyle(NORMAL);
  }

}


// ──────────────────────────────────────────────────────────
// UTILITAIRES
// ──────────────────────────────────────────────────────────

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

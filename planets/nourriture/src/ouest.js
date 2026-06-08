/* =========================================================
   SACCHARIA — ZONE OUEST : SWEET ISLAND
   ouest.js — port du prototype sketch_ouest.js au format hub
   Hooks (utilises depuis script.js) :
     • initWestZone()   — dans setup()
     • enterWestZone()  — quand on entre par la porte ouest
     • updateWest()     — dans draw() avant le rendu
     • drawWestZone()   — dans draw() quand scene === "west"
     • keyPressedWest() — dans keyPressed() quand scene === "west"
     • mousePressedWest() — dans mousePressed() quand scene === "west"
     • mouseReleasedWest() — dans mouseReleased() quand scene === "west"
   ========================================================= */

const WEST_W = 1920;
const WEST_H = 1200;
const WEST_TILE = 32;

const WEST_QUEST_INGREDIENTS = ["Farine", "Oeuf de Lune", "Sucre Cristal"];

const westState = {
  active: false,
  phase: "MAP",            // "MAP" | "DIALOGUE" | "MEMOIRE" | "CUISINE"
  currentDialog: null,
  cakeBaked: false,        // quand true → Grand Gateau dispo pour le Roi
  cakeDelivered: false,    // mis a true par script.js quand livre
  obtained: [],
  returnWorldY: 1180,
  tFrame: 0,
  hasOverlay: false,
  paramsCached: false
};

const westPlayerLocal = {
  x: WEST_W / 2,
  y: 475,
  w: 22, h: 28,
  speed: 5.2,
  dir: "down",
  anim: 0,
  moving: false
};

const westLandmarksLocal = {
  chef:     { x: 680,  y: 400, w: 40, h: 46, label: "Chef Marshmallow" },
  distrib:  { x: 1300, y: 587, w: 50, h: 70, label: "Distributeur a Bonbons" },
  oven:     { x: 1500, y: 400, w: 60, h: 60, label: "Four Geant" },
  signpost: { x: 960,  y: 720, w: 20, h: 32, label: "Pancarte (sortie)" }
};

// ---------- CUISINE (Cooking Mama) ----------
const westCuisine = {
  step: "INTRO",
  ingredients: [
    { id: "flour", name: "Farine", color: "#f3e9c7", got: false, x: 640,  y: 225 },
    { id: "egg",   name: "Oeuf",   color: "#fff4c2", got: false, x: 1120, y: 225 },
    { id: "sugar", name: "Sucre",  color: "#ffffff", got: false, x: 1600, y: 225 }
  ],
  dragging: null,
  bowl: { x: 960, y: 450, r: 90, filled: 0, dough: "#f5e6b3" },
  mix: { progress: 0, lastAngle: null, speed: 0, warning: 0, spilled: 0, lastPinch: 0, handWasOpen: true },
  pour: { progress: 0, tilt: 0 },
  bake: { temperature: 0, done: false, color: 0, timer: 0 }
};

// ---------- MEMOIRE (Distributeur Magique) ----------
const westMemo = {
  state: "INTRO",
  sequence: [], player: [], showIdx: 0, timer: 0,
  level: 3, buttonRadius: 60, hoverIdx: -1, lastPressedIdx: -1,
  cursorLeftSince: true, wonIngredient: null
};
const WEST_MEMO_BUTTONS = [
  { name: "Fraise",   color: [255, 105, 180] },
  { name: "Citron",   color: [255, 215,  64] },
  { name: "Myrtille", color: [ 86, 130, 240] }
];

// ---------- Utilities ----------
function westHasAllIngredients() {
  return westState.obtained.length >= WEST_QUEST_INGREDIENTS.length;
}
function westNextIngredient() {
  return WEST_QUEST_INGREDIENTS[westState.obtained.length];
}
function westNearLandmark(key, thresh = 80) {
  const lm = westLandmarksLocal[key];
  return dist(westPlayerLocal.x, westPlayerLocal.y, lm.x, lm.y) < thresh;
}

function westPointer() {
  // Doit faire la transformation INVERSE de drawWestZone :
  // ecran → translate(fit.ox, fit.oy) → scale(fit.sx, fit.sy) → scene WEST_W×WEST_H
  const vw = (typeof VIEW_W !== "undefined") ? VIEW_W : width;
  const vh = (typeof VIEW_H !== "undefined") ? VIEW_H : height;
  const fit = (typeof fitSceneFill === "function")
    ? fitSceneFill(WEST_W, WEST_H, vw, vh)
    : { sx: vw / WEST_W, sy: vh / WEST_H, ox: 0, oy: 0 };
  return {
    x: (mouseX - (fit.ox || 0)) / fit.sx,
    y: (mouseY - (fit.oy || 0)) / fit.sy
  };
}

// ──────────────────────────────────────────────────────────
// HOOKS PRINCIPAUX (appeles depuis script.js)
// ──────────────────────────────────────────────────────────

function initWestZone() {
  westState.active = false;
  westState.phase = "MAP";
  westState.currentDialog = null;
  westState.obtained = [];
  westState.cakeBaked = false;
  westState.cakeDelivered = false;
  westResetCuisine();
  westResetMemoire();
}

function enterWestZone() {
  if (typeof scene !== "undefined") scene = "west";
  westState.active = true;
  westState.phase = "MAP";
  // Spawn intelligent : pres de l'objectif courant
  if (!westState.obtained || westState.obtained.length === 0) {
    // Jamais venu : pres du Chef Marshmallow (intro)
    westPlayerLocal.x = westLandmarksLocal.chef.x + 50;
    westPlayerLocal.y = westLandmarksLocal.chef.y + 100;
  } else if (!westHasAllIngredients()) {
    // Ingredients incomplets : pres du distributeur
    westPlayerLocal.x = westLandmarksLocal.distrib.x - 80;
    westPlayerLocal.y = westLandmarksLocal.distrib.y + 30;
  } else if (!westState.cakeBaked) {
    // Pret a cuisiner : pres du four
    westPlayerLocal.x = westLandmarksLocal.oven.x - 80;
    westPlayerLocal.y = westLandmarksLocal.oven.y + 80;
  } else {
    // Gateau cuit : pres de la sortie pour le ramener
    westPlayerLocal.x = westLandmarksLocal.signpost.x;
    westPlayerLocal.y = westLandmarksLocal.signpost.y - 30;
  }
  westPlayerLocal.dir = "down";
}

function leaveWestZone() {
  westState.active = false;
  if (typeof scene !== "undefined") scene = "world";
  if (typeof player !== "undefined") {
    player.x = 116;
    player.y = westState.returnWorldY || 1180;
  }
}

function updateWest() {
  if (!westState.active) return;
  westState.tFrame++;

  if (westState.phase === "MAP") westUpdatePlayer();
}

function drawWestZone() {
  if (!westState.active) return;
  const vw = (typeof VIEW_W !== "undefined") ? VIEW_W : width;
  const vh = (typeof VIEW_H !== "undefined") ? VIEW_H : height;
  const fit = (typeof fitSceneFill === "function")
    ? fitSceneFill(WEST_W, WEST_H, vw, vh)
    : { sx: vw / WEST_W, sy: vh / WEST_H, ox: 0, oy: 0 };
  push();
  translate(fit.ox || 0, fit.oy || 0);
  scale(fit.sx, fit.sy);

  if (westState.phase === "MAP" || westState.phase === "DIALOGUE") {
    westDrawMap();
    westDrawPlayer();
    if (westState.phase === "MAP") westDrawInteractionHint();
    if (westState.phase === "DIALOGUE") westDrawDialogue();
  } else if (westState.phase === "MEMOIRE") {
    westDrawMemoire();
  } else if (westState.phase === "CUISINE") {
    westDrawCuisine();
  }

  westDrawHud();
  pop();
}

function keyPressedWest() {
  // Dialogue → ESPACE continue
  if (westState.phase === "DIALOGUE") {
    if (key === " " || keyCode === 32 || keyCode === ENTER || key === "e" || key === "E") {
      westState.phase = "MAP";
      westState.currentDialog = null;
    }
    return true;
  }

  // ECHAP → sortie de mini-jeu
  if ((westState.phase === "CUISINE" || westState.phase === "MEMOIRE") &&
      (keyCode === 27 || key === "a" || key === "A")) {
    westState.phase = "MAP";
    return true;
  }

  // CUISINE intro → ESPACE
  if (westState.phase === "CUISINE" && (key === " " || keyCode === 32)) {
    if (westCuisine.step === "INTRO") westCuisine.step = "INGREDIENTS";
    return true;
  }

  // MEMOIRE intro → ESPACE
  if (westState.phase === "MEMOIRE" && (key === " " || keyCode === 32) && westMemo.state === "INTRO") {
    westMemo.state = "SHOW";
    return true;
  }

  // MAP — interaction E
  if (westState.phase === "MAP" && (key === "e" || key === "E")) {
    if (westNearLandmark("chef")) {
      const msg = westState.cakeBaked
        ? "Bravo ! Le Grand Gateau est pret. Apporte-le au Roi Dulcis dans son chateau du sud !"
        : "Bienvenue sur Sweet Island ! Pour ma recette il me faut trois ingredients : FARINE, OEUF DE LUNE, SUCRE CRISTAL.\n\nGagne-les au Distributeur Magique (trois manches), puis viens cuisiner au Four Geant.";
      westPushDialog("Chef Marshmallow", msg);
    } else if (westNearLandmark("signpost")) {
      // Retour immediat a Saccharia (pas de dialogue bloquant).
      leaveWestZone();
      return true;
    } else if (westNearLandmark("distrib")) {
      if (westHasAllIngredients()) {
        westPushDialog("Distributeur", "Tous les ingredients sont obtenus ! Va au Four Geant.");
      } else {
        westResetMemoire();
        westState.phase = "MEMOIRE";
        speakGameRules([
          { speaker: "Distributeur", text: "Jeu de Mémoire." },
          { speaker: "Narrateur", text: "Observe bien la séquence de couleurs qui s'affiche, puis reproduis-la dans le même ordre en cliquant sur les boutons colorés. La séquence s'allonge à chaque niveau réussi." }
        ]);
      }
    } else if (westNearLandmark("oven")) {
      if (!westHasAllIngredients()) {
        const manquants = WEST_QUEST_INGREDIENTS.filter(i => !westState.obtained.includes(i));
        westPushDialog("Four Geant", "Il manque encore : " + manquants.join(", ") + " !");
      } else if (westState.cakeBaked) {
        westPushDialog("Four Geant", "Le Grand Gateau est deja cuit. Apporte-le au Roi !");
      } else {
        westResetCuisine();
        westState.phase = "CUISINE";
        speakGameRules([
          { speaker: "Chef Marshmallow", text: "Cuisine de Sweet Island !" },
          { speaker: "Narrateur", text: "Fais glisser les ingrédients dans le bol, puis mélange en tournant la souris en cercle. Ensuite, verse la pâte en inclinant le récipient, et enfin cuis le gâteau au four en maintenant la bonne température." }
        ]);
      }
    } else if (westPlayerLocal.y > WEST_H - 120) {
      // Sortie au sud
      leaveWestZone();
    }
    return true;
  }

  return false;
}

function mousePressedWest() {
  if (!westState.active) return false;

  if (westState.phase === "DIALOGUE") {
    westState.phase = "MAP";
    westState.currentDialog = null;
    return true;
  }

  if (westState.phase === "MEMOIRE") {
    if (westMemo.state === "INTRO") {
      westMemo.state = "SHOW";
      return true;
    }
    // Clic explicite sur un bouton couleur en phase PLAY
    if (westMemo.state === "PLAY") {
      const p = westPointer();
      for (let i = 0; i < 3; i++) {
        const bx = WEST_W / 4 + i * (WEST_W / 4);
        const by = WEST_H / 2 + 80;
        if (dist(p.x, p.y, bx, by) < westMemo.buttonRadius + 16) {
          westMemoPress(i);
          westMemo.lastPressedIdx = i;
          westMemo.cursorLeftSince = false;
          return true;
        }
      }
    }
  }

  if (westState.phase === "CUISINE") {
    // Click rapide pour faire monter la temperature au four
    if (westCuisine.step === "BAKE" && !westCuisine.bake.done) {
      westCuisine.bake.temperature += 8;
    }
    if (westCuisine.step === "INTRO") {
      westCuisine.step = "INGREDIENTS";
      return true;
    }
    if (westCuisine.step === "INGREDIENTS") {
      const p = westPointer();
      for (const ing of westCuisine.ingredients) {
        if (!ing.got && dist(p.x, p.y, ing.x, ing.y) < 50) {
          westCuisine.dragging = ing;
          return true;
        }
      }
    }
    if (westCuisine.step === "DONE") {
      westState.cakeBaked = true;
      westState.phase = "MAP";
      // Dialogue de relance vers le Roi
      westPushDialog("Chef Marshmallow", "★ GATEAU PARFAIT ★ Apporte-le maintenant au Roi Dulcis dans son chateau du sud !");
      return true;
    }
  }

  return false;
}

function mouseReleasedWest() {
  if (!westState.active) return false;
  if (westState.phase === "CUISINE" && westCuisine.dragging) {
    const p = westPointer();
    const ing = westCuisine.dragging;
    if (dist(p.x, p.y, westCuisine.bowl.x, westCuisine.bowl.y) < westCuisine.bowl.r) {
      ing.got = true;
      westCuisine.bowl.filled++;
      if (westCuisine.ingredients.every(i => i.got)) {
        westCuisine.step = "MIX";
        if (typeof GameSounds !== "undefined") GameSounds.play("mixStart");
      }
    }
    westCuisine.dragging = null;
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────
// MAP : RENDU + MOUVEMENT JOUEUR
// ──────────────────────────────────────────────────────────

function westUpdatePlayer() {
  const s = westPlayerLocal.speed;
  let dx = 0, dy = 0;
  if (keyIsDown(LEFT_ARROW)  || keyIsDown(65) || keyIsDown(81)) dx -= 1;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) dx += 1;
  if (keyIsDown(UP_ARROW)    || keyIsDown(87) || keyIsDown(90)) dy -= 1;
  if (keyIsDown(DOWN_ARROW)  || keyIsDown(83)) dy += 1;
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  const running = keyIsDown(SHIFT) ? 1.5 : 1;
  westPlayerLocal.x += dx * s * running;
  westPlayerLocal.y += dy * s * running;
  westPlayerLocal.x = constrain(westPlayerLocal.x, 40, WEST_W - 40);
  westPlayerLocal.y = constrain(westPlayerLocal.y, 375, WEST_H - 40);
  westPlayerLocal.moving = (dx !== 0 || dy !== 0);
  if (dx < 0) westPlayerLocal.dir = "left";
  else if (dx > 0) westPlayerLocal.dir = "right";
  else if (dy < 0) westPlayerLocal.dir = "up";
  else if (dy > 0) westPlayerLocal.dir = "down";
  if (westPlayerLocal.moving) westPlayerLocal.anim += 0.25;
}

function westDrawMap() {
  const tf = westState.tFrame;

  // Ciel degrade plus riche (rose → lavande)
  noStroke();
  for (let y = 0; y < WEST_H * 0.5; y += 4) {
    const t = y / (WEST_H * 0.5);
    fill(lerp(255, 240, t), lerp(200, 180, t), lerp(230, 240, t));
    rect(0, y, WEST_W, 4);
  }
  // Soleil dore
  fill(255, 230, 150, 220);
  ellipse(WEST_W - 240, 140, 110, 110);
  fill(255, 245, 200, 140);
  ellipse(WEST_W - 240, 140, 160, 160);
  // Nuages cotonneux
  fill(255, 255, 255, 200);
  for (let i = 0; i < 6; i++) {
    const cx = (i * 360 + tf * 0.2) % WEST_W;
    const cy = 80 + (i % 2) * 50;
    ellipse(cx, cy, 90, 30);
    ellipse(cx + 30, cy - 8, 60, 26);
    ellipse(cx - 30, cy + 4, 60, 22);
  }

  westDrawCandyMountains();
  westDrawChocolateRiver(0, 537, WEST_W, 50);

  // Sol carrele rose plus doux
  for (let y = 300; y < WEST_H; y += WEST_TILE) {
    for (let x = 0; x < WEST_W; x += WEST_TILE) {
      const c = ((x / WEST_TILE + y / WEST_TILE) % 2 === 0)
        ? [255, 215, 230]
        : [255, 195, 215];
      fill(c[0], c[1], c[2]);
      rect(x, y, WEST_TILE, WEST_TILE);
    }
  }

  // Chemin clair en biscuit qui relie les 4 landmarks
  westDrawCookiePath();

  // Petits pixels de bonbons
  randomSeed(42);
  for (let i = 0; i < 320; i++) {
    const x = random(WEST_W), y = random(300, WEST_H);
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#fff", "#c2f0ff"]));
    rect(floor(x / 4) * 4, floor(y / 4) * 4, 8, 4);
  }

  westDrawCakeHouse(240,  137, "strawberry");
  westDrawCakeHouse(800,  112, "vanilla");
  westDrawCakeHouse(1400, 150, "chocolate");

  westDrawCandyTree(160,  400);
  westDrawCandyTree(540,  412);
  westDrawCandyTree(1040, 425);
  westDrawCandyTree(1540, 412);
  westDrawCandyTree(420,  640);
  westDrawCandyTree(1240, 700);
  westDrawCandyTree(1720, 650);

  westDrawCupcakeTower(1760, 200);
  westDrawCupcakeTower(1100, 220);
  westDrawChef(westLandmarksLocal.chef.x, westLandmarksLocal.chef.y);
  westDrawGiantOven(westLandmarksLocal.oven.x, westLandmarksLocal.oven.y);
  westDrawDistributor(westLandmarksLocal.distrib.x, westLandmarksLocal.distrib.y);
  westDrawSignpost(westLandmarksLocal.signpost.x, westLandmarksLocal.signpost.y);

  // Coeurs/etoiles flottants
  for (let i = 0; i < 10; i++) {
    const fx = (i * 217 + tf * 0.6) % WEST_W;
    const fy = 320 + ((i * 73 + tf * 0.4) % (WEST_H - 360));
    fill(255, 200, 230, 100 + Math.sin(tf * 0.1 + i) * 50);
    ellipse(fx, fy, 6, 6);
  }

  // Voile rose tres leger
  noStroke();
  fill(255, 200, 230, 20);
  rect(0, 0, WEST_W, WEST_H);
}

function westDrawCookiePath() {
  // Chemin en biscuit reliant Chef → Distributeur → Four → Signpost
  const order = [
    westLandmarksLocal.chef,
    westLandmarksLocal.distrib,
    westLandmarksLocal.oven,
    westLandmarksLocal.signpost
  ];
  noStroke();
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i];
    const b = order[i + 1];
    const ax = a.x + 25, ay = a.y + 60;
    const bx = b.x + 25, by = b.y + 60;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    push();
    translate(ax, ay);
    rotate(ang);
    // Ombre
    fill(0, 50); rect(0, -10, len, 24, 6);
    // Biscuit
    fill(232, 200, 150);
    rect(0, -14, len, 24, 8);
    // Pepites
    fill(110, 70, 40);
    for (let j = 0; j < len; j += 22) {
      ellipse(j + 8, -8 + ((j / 22) % 3) * 4, 3, 3);
      ellipse(j + 16, -4 - ((j / 22) % 2) * 4, 3, 3);
    }
    // Bords plus sombres
    fill(200, 160, 110, 150);
    rect(0, -14, len, 3);
    rect(0, 7, len, 3);
    pop();
  }
}

function westDrawCandyMountains() {
  noStroke();
  fill(180, 120, 170);
  for (let i = 0; i < 16; i++) {
    triangle(i * 130 + 160, 287, i * 130 + 440, 175, i * 130 + 720, 287);
  }
  fill(255, 245, 255);
  for (let i = 0; i < 16; i++) {
    triangle(i * 130 + 360, 212, i * 130 + 440, 175, i * 130 + 520, 212);
  }
}

function westDrawChocolateRiver(x, y, w, h) {
  fill(90, 42, 22);
  rect(x, y, w, h);
  for (let i = 0; i < 40; i++) {
    fill(140, 70, 40);
    rect((i * 28 + (westState.tFrame * 0.5) % 28) % w, y + 8 + (i % 2) * 18, 14, 4);
  }
  fill(255, 235, 210);
  for (let i = 0; i < 30; i++) {
    rect((i * 33 + westState.tFrame * 0.3) % w, y + 4 + (i % 3) * 12, 4, 4);
  }
}

function westDrawCakeHouse(x, y, flavor) {
  fill(0, 0, 0, 40);
  rect(x - 6, y + 140, 190, 14);
  let base = color(240, 220, 180), cream = color(255, 245, 230), berry = color(220, 40, 90);
  if (flavor === "strawberry") { base = color(255, 170, 195); berry = color(200, 30, 80); }
  if (flavor === "chocolate")  { base = color(110, 60, 35); cream = color(245, 220, 195); berry = color(220, 40, 80); }
  fill(base); rect(x, y + 50, 180, 90);
  fill(cream); rect(x - 5, y + 38, 190, 23);
  for (let i = 0; i < 10; i++) rect(x + i * 18 - 2, y + 54, 16, 10 + (i % 3) * 5);
  fill(base); rect(x + 25, y, 130, 50);
  fill(cream); rect(x + 20, y - 8, 140, 18);
  fill(135, 206, 235); rect(x + 70, y + 75, 36, 28);
  fill(255); rect(x + 75, y + 78, 8, 8);
  fill(90, 50, 30); rect(x + 20, y + 94, 34, 46);
  fill(255, 215, 0); rect(x + 45, y + 118, 5, 5);
  fill(berry); rect(x + 80, y - 23, 16, 16);
  fill(120, 180, 80); rect(x + 92, y - 28, 8, 8);
}

function westDrawCupcakeTower(x, y) {
  push();
  noStroke();
  fill(200, 60, 100); rect(x, y + 38, 104, 65);
  for (let i = 0; i < 10; i++) {
    fill(i % 2 === 0 ? color(160, 30, 70) : color(220, 80, 120));
    rect(x + i * 10.4, y + 38, 8, 65);
  }
  fill(255, 245, 230);
  rect(x + 10, y + 12, 84, 32);
  rect(x + 20, y - 8, 64, 26);
  rect(x + 30, y - 26, 44, 24);
  fill(220, 40, 80); rect(x + 46, y - 39, 16, 16);
  fill(120, 180, 80); rect(x + 56, y - 44, 8, 8);
  pop();
}

function westDrawCandyTree(x, y) {
  noStroke();
  fill(130, 70, 40); rect(x + 18, y + 38, 14, 52);
  fill(255, 180, 210); rect(x, y, 52, 47);
  fill(255, 120, 170); rect(x + 8, y + 8, 36, 31);
  fill(255, 245, 230); rect(x + 18, y + 13, 14, 13);
}

function westDrawChef(x, y) {
  const tf = westState.tFrame;
  const bob = Math.sin(tf * 0.08) * 2;
  const by = y + bob;

  noStroke();
  // Ombre
  fill(0, 70); ellipse(x + 5, by + 60, 60, 10);

  // Corps (tablier blanc rose)
  fill(255, 250, 250);
  rect(x - 22, by + 5, 50, 56, 6);
  // Boutons
  fill(255, 150, 200);
  ellipse(x + 4, by + 18, 4, 4);
  ellipse(x + 4, by + 32, 4, 4);
  ellipse(x + 4, by + 46, 4, 4);

  // Tete (marshmallow)
  fill(255, 245, 245);
  ellipse(x + 4, by - 6, 50, 50);
  // Joues rosees
  fill(255, 180, 200, 200);
  ellipse(x - 11, by - 1, 9, 5);
  ellipse(x + 19, by - 1, 9, 5);
  // Yeux
  fill(60, 40, 80);
  ellipse(x - 5, by - 10, 5, 6);
  ellipse(x + 13, by - 10, 5, 6);
  fill(255);
  ellipse(x - 4, by - 11, 1.5, 1.5);
  ellipse(x + 14, by - 11, 1.5, 1.5);
  // Sourire chaleureux
  noFill(); stroke(200, 80, 120); strokeWeight(2);
  arc(x + 4, by - 2, 14, 8, 0, PI);
  noStroke();

  // Toque de chef plissee
  fill(255, 250, 250);
  rect(x - 18, by - 32, 44, 12, 3);
  ellipse(x + 4, by - 36, 40, 18);
  ellipse(x - 8, by - 40, 22, 18);
  ellipse(x + 16, by - 40, 22, 18);
  ellipse(x + 4, by - 44, 22, 18);

  // Cuillere en main
  fill(220, 180, 140);
  rect(x + 30, by + 20, 4, 24);
  fill(240, 220, 180);
  ellipse(x + 32, by + 18, 10, 8);

  // Bulle indicative au-dessus
  const bubbleText = westState.cakeBaked
    ? "Au Roi !"
    : (westHasAllIngredients() ? "Au four !" : "3 ingredients !");
  fill(255, 255, 255, 240);
  stroke(200, 150, 180); strokeWeight(2);
  rect(x - 50, by - 100, 150, 36, 12);
  noStroke();
  fill(255, 255, 255, 240);
  triangle(x + 10, by - 64, x + 22, by - 50, x + 34, by - 64);
  fill(140, 60, 100);
  textFont("Georgia"); textStyle(BOLD); textSize(14); textAlign(CENTER, CENTER);
  text(bubbleText, x + 25, by - 82);
  textStyle(NORMAL);
}

function westDrawGiantOven(x, y) {
  const tf = westState.tFrame;
  noStroke();
  fill(0, 0, 0, 60); rect(x - 39, y + 68, 118, 10);
  fill(120, 90, 70); rect(x - 44, y - 26, 122, 102);
  fill(90, 60, 50);
  for (let j = 0; j < 6; j++) {
    rect(x - 44, y - 26 + j * 17, 122, 6);
    for (let i = 0; i < 10; i++) {
      rect(x - 44 + ((j % 2) ? 10 : 0) + i * 12, y - 26 + j * 17, 8, 17);
    }
  }
  fill(40, 20, 10); rect(x - 28, y + 8, 91, 57);
  fill(50, 28, 18); rect(x - 23, y + 5, 81, 47);
  const fb = 150 + sin(tf * 0.3) * 50;
  fill(255, fb, 30); rect(x - 15, y + 26, 60, 18);
  fill(255, 230, 120); rect(x - 5, y + 31, 36, 10);
}

function westDrawDistributor(x, y) {
  const tf = westState.tFrame;
  noStroke();
  fill(0, 0, 0, 60); rect(x - 33, y + 75, 78, 10);
  fill(180, 40, 70); rect(x - 33, y + 12, 68, 70);
  fill(220, 60, 90); rect(x - 28, y + 18, 58, 10);
  fill(60, 20, 30); rect(x - 5, y + 46, 16, 6);
  fill(180, 220, 255, 220); rect(x - 39, y - 52, 78, 63);
  fill(220, 240, 255, 220); rect(x - 33, y - 57, 68, 10);
  randomSeed(7);
  for (let i = 0; i < 16; i++) {
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#aaffaa", "#ffffff"]));
    rect(x - 31 + (i % 8) * 8, y - 44 + floor(i / 8) * 10, 8, 8);
  }
  if (!westHasAllIngredients()) {
    const g = 150 + sin(tf * 0.15) * 80;
    noFill();
    stroke(255, 240, 100, g);
    strokeWeight(2);
    rect(x - 41, y - 60, 84, 140);
    noStroke();
  }
}

function westDrawSignpost(x, y) {
  const tf = westState.tFrame;
  const pulse = 0.6 + 0.4 * Math.sin(tf * 0.08);
  // Ombre
  fill(0, 60); ellipse(x + 10, y + 70, 70, 12);
  // Poteau
  fill(120, 70, 40);
  rect(x + 5, y, 10, 60, 2);
  fill(150, 90, 50);
  rect(x + 4, y, 3, 60);
  // Panneau (plus grand)
  stroke(140, 80, 30); strokeWeight(2);
  fill(225, 170, 100);
  rect(x - 30, y - 14, 80, 36, 6);
  noStroke();
  fill(180, 130, 70);
  rect(x - 30, y + 16, 80, 6, 3);
  // Halo lumineux pour bien indiquer la sortie
  fill(255, 230, 130, 80 + pulse * 100);
  ellipse(x + 10, y + 4, 110, 50);
  // Texte
  fill(70, 30, 20);
  textFont("Georgia"); textStyle(BOLD); textSize(13); textAlign(CENTER, CENTER);
  text("← RETOUR", x + 10, y - 2);
  textSize(11);
  text("SACCHARIA", x + 10, y + 14);
  textStyle(NORMAL);
}

function westDrawPlayer() {
  // Reutilise le sprite Zyx global pour un design uniforme partout.
  const facingMap = { down: 0, left: 1, right: 2, up: 3 };
  const facing = facingMap[westPlayerLocal.dir] || 0;
  if (typeof drawHeroSprite === "function") {
    drawHeroSprite(westPlayerLocal.x, westPlayerLocal.y, facing, westPlayerLocal.anim);
  }
}

function westDrawInteractionHint() {
  let msg = "";
  if (westNearLandmark("chef")) {
    msg = westState.cakeBaked ? "[E] Le gateau est pret !" : "[E] Parler au Chef";
  } else if (westNearLandmark("distrib")) {
    msg = westHasAllIngredients() ? "Ingredients deja obtenus" : "[E] Distributeur (memoire)";
  } else if (westNearLandmark("oven")) {
    msg = westHasAllIngredients() ? "[E] Cuisiner" : "[E] Il manque des ingredients...";
  } else if (westNearLandmark("signpost") || westPlayerLocal.y > WEST_H - 130) {
    msg = "[E] Retourner a Saccharia";
  }
  if (!msg) return;
  noStroke();
  fill(20, 10, 25, 220);
  rect(westPlayerLocal.x - 110, westPlayerLocal.y - 68, 220, 30, 4);
  fill(255, 215, 64);
  textAlign(CENTER, CENTER);
  textSize(13);
  text(msg, westPlayerLocal.x, westPlayerLocal.y - 53);
}

function westDrawDialogue() {
  if (!westState.currentDialog) return;
  // Cadre uniforme (memes couleurs que script.js / sali)
  noStroke();
  fill(0, 215);
  rect(60, WEST_H - 220, WEST_W - 120, 180, 10);
  stroke(255, 90); strokeWeight(1); noFill();
  rect(60, WEST_H - 220, WEST_W - 120, 180, 10); noStroke();

  // Nom du speaker en couleur
  const speakerName = westState.currentDialog.speaker || "";
  const sc = (typeof SPEAKER_COLORS !== "undefined" && SPEAKER_COLORS[speakerName])
    ? SPEAKER_COLORS[speakerName]
    : [255, 215, 64];
  fill(sc[0], sc[1], sc[2]);
  textFont("Georgia"); textStyle(BOLD); textSize(20); textAlign(LEFT, TOP);
  text(speakerName, 80, WEST_H - 208);
  textStyle(NORMAL);

  // Typing animation uniforme
  const speed = (typeof DIALOGUE_TYPING_SPEED !== "undefined") ? DIALOGUE_TYPING_SPEED : 1.5;
  if (typeof westState.currentDialog._frame !== "number") {
    westState.currentDialog._frame = frameCount;
  }
  const fullText = westState.currentDialog.text || "";
  const elapsed = frameCount - westState.currentDialog._frame;
  const charIdx = Math.min(fullText.length, Math.floor(elapsed / speed));

  fill(245, 235, 255);
  textSize(16);
  text(fullText.substring(0, charIdx), 80, WEST_H - 175, WEST_W - 160, 130);

  if (charIdx >= fullText.length && frameCount % 60 < 30) {
    fill(255);
    triangle(WEST_W - 100, WEST_H - 60, WEST_W - 80, WEST_H - 60, WEST_W - 90, WEST_H - 48);
  }
  fill(255, 200);
  textFont("monospace"); textSize(11);
  textAlign(RIGHT, BOTTOM);
  text("[ESPACE / E]", WEST_W - 80, WEST_H - 50);
}

function westDrawHud() {
  noStroke();
  fill(20, 10, 25, 210);
  rect(12, 50, 370, 78, 4);
  fill(255, 215, 64);
  rect(12, 50, 370, 3);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text("QUETE OUEST : Le Grand Gateau", 22, 58);
  textSize(12);
  fill(255, 230, 200);
  text("• Ingredients : " + westState.obtained.length + "/" + WEST_QUEST_INGREDIENTS.length +
       (westState.obtained.length ? "  (" + westState.obtained.join(", ") + ")" : ""), 22, 80);
  text("• Gateau cuit : " + (westState.cakeBaked ? "OK — apporte-le au Roi !" : "a faire"), 22, 100);
}

function westPushDialog(speaker, text) {
  westState.currentDialog = { speaker, text };
  westState.phase = "DIALOGUE";
  if (typeof GameSounds !== "undefined") GameSounds.speakLine(speaker, text);
}

// ──────────────────────────────────────────────────────────
// MEMOIRE — Distributeur Magique (Simon)
// ──────────────────────────────────────────────────────────

function westResetMemoire() {
  westMemo.state = "INTRO";
  westMemo.sequence = [];
  westMemo.player = [];
  westMemo.showIdx = 0;
  westMemo.timer = 0;
  westMemo.level = 3 + westState.obtained.length;
  westMemo.hoverIdx = -1;
  westMemo.lastPressedIdx = -1;
  westMemo.cursorLeftSince = true;
  westMemo.wonIngredient = null;
}

function westGenSequence(len) {
  const out = [];
  for (let i = 0; i < len; i++) out.push(Math.floor(Math.random() * 3));
  return out;
}

function westDrawMemoire() {
  const tf = westState.tFrame;
  // Fond du mini-jeu : un rect dans la scene (pas background() qui effacerait
  // les decors lateraux CAVE).
  noStroke();
  fill(38, 18, 52);
  rect(0, 0, WEST_W, WEST_H);

  for (let i = 0; i < 60; i++) {
    fill(255, 220, 255, 60 + (i % 3) * 40);
    rect((i * 71 + tf * 0.4) % WEST_W, (i * 59 + tf * 0.2) % WEST_H, 4, 4);
  }

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(34);
  text("DISTRIBUTEUR MAGIQUE", WEST_W / 2, 92);
  fill(255, 215, 64);
  textSize(16);
  text("Survole une couleur (sors pour re-selectionner) ou clique-la", WEST_W / 2, 140);
  fill(255, 220, 180);
  textSize(13);
  text("[ECHAP] quitter   •   [ESPACE] demarrer   •   Manche " +
       (westState.obtained.length + 1) + "/3   (memorise " + westMemo.level + " couleurs)",
       WEST_W / 2, WEST_H - 60);

  if (westMemo.state === "SHOW" && westMemo.sequence.length === 0) {
    westMemo.sequence = westGenSequence(westMemo.level);
    westMemo.timer = tf;
    westMemo.showIdx = 0;
  }

  if (westMemo.state === "INTRO") {
    fill(255); textSize(24);
    text("Manche " + (westState.obtained.length + 1) +
         " — gagne : " + (westNextIngredient() || "—"), WEST_W / 2, 200);
    textSize(16); fill(255, 215, 64);
    text("Clique un bouton, survole-le ou [ESPACE] pour commencer", WEST_W / 2, 240);
  } else if (westMemo.state === "SHOW") {
    fill(255); textSize(20);
    text("Memorise la sequence (" + westMemo.sequence.length + " couleurs)...", WEST_W / 2, 200);
    if (tf - westMemo.timer > 45) {
      westMemo.showIdx++;
      westMemo.timer = tf;
      if (westMemo.showIdx >= westMemo.sequence.length) {
        westMemo.state = "PLAY";
        westMemo.player = [];
      }
    }
  } else if (westMemo.state === "PLAY") {
    fill(120, 255, 160); textSize(22);
    text("A toi ! (" + westMemo.player.length + "/" + westMemo.sequence.length + ")", WEST_W / 2, 200);
  } else if (westMemo.state === "LOSE") {
    fill(255, 100, 120); textSize(26);
    text("Rate ! Nouvelle sequence...", WEST_W / 2, 200);
    if (tf - westMemo.timer > 80) {
      westMemo.sequence = westGenSequence(westMemo.level);
      westMemo.player = [];
      westMemo.state = "SHOW";
      westMemo.showIdx = 0;
      westMemo.timer = tf;
      westMemo.lastPressedIdx = -1;
      westMemo.cursorLeftSince = true;
    }
  } else if (westMemo.state === "WIN") {
    fill(255, 220, 80); textSize(28);
    text("★ INGREDIENT OBTENU : " + (westMemo.wonIngredient || "") + " ★", WEST_W / 2, 220);
    if (westHasAllIngredients()) {
      fill(255); textSize(16);
      text("Tous les ingredients obtenus ! [ECHAP] puis va au Four Geant.", WEST_W / 2, 260);
    } else {
      fill(255); textSize(16);
      text("Prepare-toi pour la prochaine manche...", WEST_W / 2, 260);
      if (tf - westMemo.timer > 120) {
        westMemo.level = 3 + westState.obtained.length;
        westMemo.sequence = westGenSequence(westMemo.level);
        westMemo.player = [];
        westMemo.state = "SHOW";
        westMemo.showIdx = 0;
        westMemo.timer = tf;
        westMemo.lastPressedIdx = -1;
        westMemo.cursorLeftSince = true;
      }
    }
  }

  westMemo.hoverIdx = -1;
  const p = westPointer();
  for (let i = 0; i < 3; i++) {
    const bx = WEST_W / 4 + i * (WEST_W / 4), by = WEST_H / 2 + 80;
    const lit = (westMemo.state === "SHOW" &&
                 westMemo.showIdx < westMemo.sequence.length &&
                 westMemo.sequence[westMemo.showIdx] === i &&
                 (tf - westMemo.timer) < 35);
    const c = WEST_MEMO_BUTTONS[i].color;
    noStroke();
    fill(0, 0, 0, 80);
    rect(bx - 80, by - 90, 160, 200, 6);
    const factor = lit ? 1.0 : 0.55;
    fill(c[0] * factor, c[1] * factor, c[2] * factor);
    rect(bx - 68, by - 88, 136, 172, 6);
    fill(255, 255, 255, lit ? 220 : 80);
    rect(bx - 50, by - 72, 22, 14, 3);
    fill(40, 20, 30); textSize(16);
    textAlign(CENTER, CENTER);
    text(WEST_MEMO_BUTTONS[i].name, bx, by + 120);

    if (dist(p.x, p.y, bx, by) < westMemo.buttonRadius + 10) {
      westMemo.hoverIdx = i;
      noFill();
      stroke(255, 230, 120);
      strokeWeight(3);
      rect(bx - 72, by - 92, 144, 180, 6);
      noStroke();
    }
  }

  if (westMemo.hoverIdx === -1 || westMemo.hoverIdx !== westMemo.lastPressedIdx) {
    westMemo.cursorLeftSince = true;
  }

  if (westMemo.hoverIdx >= 0 && westMemo.cursorLeftSince) {
    if (westMemo.state === "INTRO") {
      westMemo.state = "SHOW";
      westMemo.cursorLeftSince = false;
    } else if (westMemo.state === "PLAY") {
      westMemoPress(westMemo.hoverIdx);
      westMemo.lastPressedIdx = westMemo.hoverIdx;
      westMemo.cursorLeftSince = false;
    }
  }
}

function westMemoPress(i) {
  if (westMemo.state !== "PLAY") return;
  if (typeof GameSounds !== "undefined") GameSounds.play("memoryBeep");
  westMemo.player.push(i);
  const idx = westMemo.player.length - 1;
  if (westMemo.player[idx] !== westMemo.sequence[idx]) {
    westMemo.state = "LOSE";
    westMemo.timer = westState.tFrame;
    if (typeof GameSounds !== "undefined") GameSounds.play("lose");
  } else if (westMemo.player.length === westMemo.sequence.length) {
    const ing = westNextIngredient();
    if (ing) westState.obtained.push(ing);
    westMemo.wonIngredient = ing;
    westMemo.state = "WIN";
    westMemo.timer = westState.tFrame;
    if (typeof GameSounds !== "undefined") GameSounds.play("win");
  }
}

// ──────────────────────────────────────────────────────────
// CUISINE — Cooking Mama
// ──────────────────────────────────────────────────────────

function westResetCuisine() {
  westCuisine.step = "INTRO";
  for (const ing of westCuisine.ingredients) ing.got = false;
  westCuisine.bowl.filled = 0;
  westCuisine.mix = { progress: 0, lastAngle: null, speed: 0, warning: 0, spilled: 0, lastPinch: 0, handWasOpen: true };
  westCuisine.pour = { progress: 0, tilt: 0 };
  westCuisine.bake = { temperature: 0, done: false, color: 0, timer: 0 };
}

function westDrawCuisine() {
  const tf = westState.tFrame;

  // Fond pastel
  for (let y = 0; y < WEST_H; y += 4) {
    const t = y / WEST_H;
    fill(lerp(255, 210, t), lerp(220, 170, t), lerp(240, 200, t));
    rect(0, y, WEST_W, 4);
  }
  for (let x = 0; x < WEST_W; x += 40) {
    for (let y = 525; y < WEST_H; y += 40) {
      fill((x / 40 + y / 40) % 2 ? color(230, 200, 180) : color(210, 180, 160));
      rect(x, y, 40, 40);
    }
  }
  fill(160, 110, 80); rect(0, 500, WEST_W, 25);
  fill(200, 150, 110); rect(0, 497, WEST_W, 5);

  // Bandeau
  noStroke();
  fill(20, 10, 25, 210);
  rect(10, 130, WEST_W - 20, 60, 4);
  fill(255, 215, 64);
  textAlign(LEFT, CENTER);
  textSize(16);
  text("CUISINE — " + westStepLabel(westCuisine.step), 24, 152);
  fill(255);
  textSize(13);
  text(westStepHint(), 24, 178);
  fill(255, 215, 64);
  textAlign(RIGHT, CENTER);
  text("[ECHAP] quitter", WEST_W - 24, 162);

  if (westCuisine.step === "INTRO")        westDrawCuisineIntro();
  else if (westCuisine.step === "INGREDIENTS") westDrawIngredientsStep();
  else if (westCuisine.step === "MIX")        westDrawMixStep();
  else if (westCuisine.step === "BAKE")       westDrawBakeStep();
  else if (westCuisine.step === "DONE")       westDrawDoneStep();
}

function westStepLabel(s) {
  return ({ INTRO: "Intro", INGREDIENTS: "Etape 1 : Ingredients",
            MIX: "Etape 2 : Melanger", BAKE: "Etape 3 : Cuire",
            DONE: "Succes !" })[s];
}

function westStepHint() {
  if (westCuisine.step === "INTRO") return "Clique ou appuie [ESPACE] pour commencer";
  if (westCuisine.step === "INGREDIENTS") return "Clique-glisse chaque ingredient dans le bol (3 a ajouter)";
  if (westCuisine.step === "MIX") return "Fais des cercles dans le bol avec la souris — pas trop vite !";
  if (westCuisine.step === "BAKE") return "Clique super vite (ou maintiens [F] / crie dans le micro) pour faire monter la temperature !";
  if (westCuisine.step === "DONE") return "Gateau parfait ! Clique pour revenir a la carte";
  return "";
}

function westDrawCuisineIntro() {
  fill(20, 10, 25, 210);
  rect(WEST_W / 2 - 320, WEST_H / 2 - 130, 640, 260, 6);
  fill(255, 215, 64);
  rect(WEST_W / 2 - 320, WEST_H / 2 - 130, 640, 3);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("RECETTE DU GRAND GATEAU", WEST_W / 2, WEST_H / 2 - 80);
  fill(255, 240, 200);
  textSize(16);
  text("1) Ajoute les 3 ingredients au bol", WEST_W / 2, WEST_H / 2 - 20);
  text("2) Melange doucement la pate", WEST_W / 2, WEST_H / 2 + 10);
  text("3) Cuis au four en gardant la temperature elevee", WEST_W / 2, WEST_H / 2 + 40);
  fill(255, 215, 64);
  textSize(14);
  text("Clique ou appuie [ESPACE] pour commencer", WEST_W / 2, WEST_H / 2 + 90);
}

function westDrawIngredientsStep() {
  westDrawBowl(westCuisine.bowl.x, westCuisine.bowl.y, westCuisine.bowl.filled);
  for (const ing of westCuisine.ingredients) {
    if (ing.got) continue;
    westDrawIngredientIcon(ing);
  }
  if (westCuisine.dragging) {
    const p = westPointer();
    westDrawIngredientIcon({ ...westCuisine.dragging, x: p.x, y: p.y });
  }
  noStroke();
  fill(20, 10, 25, 200);
  rect(WEST_W - 240, 220, 220, 50, 4);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(14);
  text("Ingredients : " + westCuisine.bowl.filled + "/3", WEST_W - 230, 245);
}

function westDrawIngredientIcon(ing) {
  const x = ing.x, y = ing.y;
  noStroke();
  fill(0, 0, 0, 60); rect(x - 24, y + 28, 48, 8);
  if (ing.id === "flour") {
    fill(250, 240, 210); rect(x - 24, y - 28, 48, 56, 3);
    fill(200, 180, 140); rect(x - 24, y - 30, 48, 8, 2);
    fill(120, 80, 50); textSize(12); textAlign(CENTER, CENTER);
    text("FARINE", x, y + 2);
  } else if (ing.id === "egg") {
    fill(255, 244, 220); rect(x - 18, y - 24, 36, 48, 18);
    fill(255, 220, 160); rect(x - 10, y - 16, 8, 5);
    fill(120, 80, 50); textSize(11); textAlign(CENTER, CENTER);
    text("OEUF", x, y + 4);
  } else if (ing.id === "sugar") {
    fill(240, 240, 255); rect(x - 24, y - 24, 48, 48, 4);
    fill(200, 200, 230); rect(x - 24, y - 26, 48, 8);
    fill(120, 100, 140); textSize(12); textAlign(CENTER, CENTER);
    text("SUCRE", x, y + 2);
  }
}

function westDrawBowl(cx, cy, filled) {
  noStroke();
  fill(0, 0, 0, 60); rect(cx - 90, cy + 60, 180, 10);
  fill(220, 220, 230); rect(cx - 90, cy - 30, 180, 80, 4);
  fill(190, 190, 210); rect(cx - 90, cy + 40, 180, 10);
  fill(180, 170, 190); rect(cx - 82, cy - 22, 164, 14, 2);
  if (filled > 0) {
    fill(245, 230, 190);
    rect(cx - 78, cy - 18, 156, 30 + filled * 4, 2);
  }
  if (filled >= 3) {
    for (let i = 0; i < 10; i++) {
      fill(255, 255, 255, 180);
      rect(cx - 70 + (i * 16 + westState.tFrame * 0.4) % 150, cy - 16 + (i % 3) * 6, 4, 4);
    }
  }
}

function westDrawMixStep() {
  westDrawBowl(westCuisine.bowl.x, westCuisine.bowl.y, 3);
  const cx = westCuisine.bowl.x, cy = westCuisine.bowl.y;
  const p = constrain(westCuisine.mix.progress, 0, 1);
  noFill();
  stroke(255, 180, 60, 180);
  strokeWeight(6);
  arc(cx, cy, 220, 220, -HALF_PI, -HALF_PI + TWO_PI * p);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text("Melange : " + floor(p * 100) + "%", cx, cy + 160);

  fill(20, 10, 25, 210);
  rect(40, 220, 320, 30, 3);
  let sp = westCuisine.mix.speed;
  let col = color(100, 220, 120);
  if (sp > 9) col = color(255, 200, 80);
  if (sp > 16) col = color(255, 80, 100);
  fill(col);
  rect(44, 224, min(312, sp * 10), 22, 2);
  fill(255);
  textSize(12);
  textAlign(LEFT, CENTER);
  text("Vitesse", 48, 235);

  if (westCuisine.mix.warning > 0) {
    fill(255, 80, 80, westCuisine.mix.warning * 30);
    rect(0, 0, WEST_W, WEST_H);
    westCuisine.mix.warning = max(0, westCuisine.mix.warning - 1);
  }
  if (westCuisine.mix.spilled > 3) {
    fill(20, 10, 25, 220);
    rect(WEST_W / 2 - 280, WEST_H / 2 - 60, 560, 120, 4);
    fill(255, 80, 100);
    textSize(22);
    textAlign(CENTER, CENTER);
    text("Trop renverse ! On recommence le melange.", WEST_W / 2, WEST_H / 2 - 16);
    fill(255);
    textSize(14);
    text("(clique pour retenter)", WEST_W / 2, WEST_H / 2 + 24);
  }

  const pt = westPointer();
  if (dist(pt.x, pt.y, cx, cy) < 120 && dist(pt.x, pt.y, cx, cy) > 20) {
    const ang = atan2(pt.y - cy, pt.x - cx);
    if (westCuisine.mix.lastAngle !== null) {
      let d = ang - westCuisine.mix.lastAngle;
      if (d > PI) d -= TWO_PI;
      if (d < -PI) d += TWO_PI;
      const step = abs(d);
      westCuisine.mix.speed = lerp(westCuisine.mix.speed, step * 30, 0.2);
      if (step > 0.02 && westCuisine.mix.speed < 16) {
        westCuisine.mix.progress += step / (TWO_PI * 5);
      }
      if (westCuisine.mix.speed > 16) {
        westCuisine.mix.warning = min(8, westCuisine.mix.warning + 2);
        if (random() < 0.05) {
          const prevSpill = westCuisine.mix.spilled;
          westCuisine.mix.spilled++;
          if (prevSpill <= 3 && westCuisine.mix.spilled > 3 && typeof GameSounds !== "undefined") {
            GameSounds.play("lose");
          }
        }
      }
    }
    westCuisine.mix.lastAngle = ang;
  } else {
    westCuisine.mix.speed = lerp(westCuisine.mix.speed, 0, 0.1);
    westCuisine.mix.lastAngle = null;
  }

  westCuisine.mix.progress = constrain(westCuisine.mix.progress, 0, 1);
  if (westCuisine.mix.progress >= 1) westCuisine.step = "BAKE"; // POUR retire : on enchaine direct sur la cuisson
}

function westDrawPourStep() {
  const cx = westCuisine.bowl.x, cy = westCuisine.bowl.y - 40;
  const mx = WEST_W / 2 + 200, my = 550;
  noStroke();
  fill(0, 0, 0, 60); rect(mx - 80, my + 24, 160, 12);
  fill(90, 40, 30); rect(mx - 80, my - 12, 160, 40, 3);
  fill(130, 60, 40); rect(mx - 76, my - 8, 152, 6);

  const pp = constrain(westCuisine.pour.progress, 0, 1);
  fill(245, 230, 190);
  rect(mx - 72, my + 24 - pp * 32, 144, pp * 32);

  push();
  translate(cx, cy);
  rotate(westCuisine.pour.tilt);
  westDrawBowl(0, 0, 3);
  pop();

  if (westCuisine.pour.tilt > 0.2 && pp < 1) {
    fill(245, 230, 190);
    for (let y = cy + 30; y < my - 10; y += 8) rect(cx - 4, y, 8, 6);
    westCuisine.pour.progress += 0.012;
  }

  // Bouton Verser
  fill(20, 10, 25, 210);
  rect(60, WEST_H - 130, 220, 70, 4);
  fill(255, 215, 64);
  rect(60, WEST_H - 130, 220, 3);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("VERSER", 170, WEST_H - 95);

  if (!mouseIsPressed) {
    westCuisine.pour.tilt = lerp(westCuisine.pour.tilt, 0, 0.1);
  }
  if (westCuisine.pour.progress >= 1) westCuisine.step = "BAKE";
}

function westDrawBakeStep() {
  const tf = westState.tFrame;
  for (let y = 200; y < WEST_H - 30; y += 4) {
    const t = (y - 200) / (WEST_H - 230);
    fill(lerp(80, 30, t), lerp(30, 10, t), lerp(20, 10, t));
    rect(0, y, WEST_W, 4);
  }
  const flick = 150 + sin(tf * 0.4) * 50;
  fill(255, flick, 30, 60);
  rect(0, 200, WEST_W, WEST_H - 230);

  if (!westCuisine.bake.done) {
    westCuisine.bake.temperature -= 0.3;
    westCuisine.bake.temperature = constrain(westCuisine.bake.temperature, 0, 100);

    fill(90); rect(WEST_W / 2 - 180, WEST_H - 150, 360, 44, 5);
    fill(255, 100, 50);
    rect(WEST_W / 2 - 180, WEST_H - 150, westCuisine.bake.temperature * 3.6, 44, 5);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("Temperature : " + floor(westCuisine.bake.temperature) + "%", WEST_W / 2, WEST_H - 128);

    fill(255);
    textSize(14);
    text("Clique super vite (ou crie dans le micro) pour chauffer le four !", WEST_W / 2, WEST_H - 80);

    // Micro reuse (script.js mic if available)
    if (typeof mic !== "undefined" && typeof audioReady !== "undefined" && audioReady) {
      const ml = mic.getLevel();
      if (ml > 0.05) westCuisine.bake.temperature += ml * 12;
    }

    if (westCuisine.bake.temperature >= 100) {
      westCuisine.bake.done = true;
      if (typeof GameSounds !== "undefined") GameSounds.play("bakeDone");
    }
    westCuisine.bake.color = floor(map(westCuisine.bake.temperature, 0, 100, 0, 2));
    westDrawCakeInOven(WEST_W / 2, WEST_H / 2 - 10);
  } else {
    westCuisine.bake.color = 2;
    westDrawCakeInOven(WEST_W / 2, WEST_H / 2 - 10);
    fill(255, 215, 64);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("★ CUISSON REUSSIE ★", WEST_W / 2, 240);
    westCuisine.bake.timer++;
    if (westCuisine.bake.timer > 90) westCuisine.step = "DONE";
  }
}

function westDrawCakeInOven(cx, cy) {
  const stage = westCuisine.bake.color;
  const safeStage = constrain(stage, 0, 3);
  const baseCol = [[250, 230, 180], [230, 190, 120], [200, 150, 80], [70, 40, 30]][safeStage];
  const cream = safeStage >= 2 ? [255, 240, 220] : [255, 250, 230];

  noStroke();
  fill(0, 0, 0, 80); rect(cx - 90, cy + 60, 180, 12);
  fill(60, 30, 20); rect(cx - 80, cy + 30, 160, 28, 3);
  fill(baseCol[0], baseCol[1], baseCol[2]);

  const rise = min(40, westCuisine.bake.temperature * 0.4);
  rect(cx - 70, cy + 20 - rise, 140, 40 + rise, 3);
  if (safeStage >= 1) {
    fill(baseCol[0], baseCol[1], baseCol[2]);
    rect(cx - 60, cy + 6 - rise, 120, 16);
    rect(cx - 50, cy - 6 - rise, 100, 16);
  }
  if (westCuisine.bake.done) {
    fill(cream[0], cream[1], cream[2]);
    rect(cx - 70, cy - 28, 140, 18);
    rect(cx - 60, cy - 40, 120, 16);
    fill(220, 40, 80); rect(cx - 6, cy - 56, 12, 14);
    fill(120, 180, 80); rect(cx + 4, cy - 60, 6, 6);
  }
  fill(255, 240, 220, 150 + sin(westState.tFrame * 0.3) * 60);
  for (let i = 0; i < 4; i++) {
    rect(cx - 30 + i * 20, cy - 70 - ((westState.tFrame + i * 15) % 40), 6, 12);
  }
}

function westDrawDoneStep() {
  noStroke();
  fill(255, 200, 220);
  rect(0, 0, WEST_W, WEST_H);
  westDrawCakeInOven(WEST_W / 2, WEST_H / 2 + 50);
  for (let i = 0; i < 120; i++) {
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#ffffff", "#ff66a3"]));
    rect((i * 83 + westState.tFrame * 2) % WEST_W, (i * 47 + westState.tFrame * 4) % WEST_H, 8, 4);
  }
  fill(20, 10, 25, 210);
  rect(WEST_W / 2 - 320, 200, 640, 160, 6);
  fill(255, 215, 64);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("★ GATEAU PARFAIT ★", WEST_W / 2, 250);
  fill(255);
  textSize(16);
  text("Le Chef Marshmallow est ravi ! Clique pour rentrer a Saccharia.", WEST_W / 2, 310);
}

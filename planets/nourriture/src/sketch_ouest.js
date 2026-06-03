/* =======================================================================
   SWEET ISLAND — Pixel RPG inspired by Whole Cake Island
   p5.js + ml5.js (handPose) + p5.sound (mic)
   ======================================================================= */

const W = 5760, H = 1200;
const PX = 4;                 
const TILE = 32;              
let inputMode = "classic";    

// ---------- STATE ----------
let scene = "MAP";            
let currentDialog = null;
const QUEST_INGREDIENTS = ["Farine", "Œuf", "Sucre"];
let quest = { obtained: [], cakeBaked: false, finished: false };

function hasAllIngredients() { return quest.obtained.length >= QUEST_INGREDIENTS.length; }
function nextIngredientToWin() { return QUEST_INGREDIENTS[quest.obtained.length]; }

// Player
const player = { x: 1920, y: 475, w: 22, h: 28, speed: 2.6, dir: "down", anim: 0, moving: false };
let tFrame = 0;

// NPCs / landmarks
const landmarks = {
  chef:      { x: 680, y: 400, w: 40, h: 46, label: "Chef Marshmallow" },
  distrib:   { x: 3160, y: 587, w: 50, h: 70, label: "Distributeur à Bonbons" },
  oven:      { x: 3160, y: 400, w: 60, h: 60, label: "Four Géant" },
  signpost:  { x: 1880, y: 675, w: 20, h: 32, label: "Pancarte" }
};

// ---------- CUISINE ----------
const cuisine = {
  step: "INTRO",   
  ingredients: [
    { id:"flour", name:"Farine", color:"#f3e9c7", got:false, x: 640, y: 225 },
    { id:"egg",   name:"Œuf",    color:"#fff4c2", got:false, x: 1120, y: 225 },
    { id:"sugar", name:"Sucre",  color:"#ffffff", got:false, x: 1600, y: 225 }
  ],
  dragging: null,
  bowl: { x: 2400, y: 450, r: 90, filled: 0, dough:"#f5e6b3" },
  mix: { progress: 0, lastAngle: null, speed: 0, warning: 0, spilled: 0, lastPinch: 0, handWasOpen: true },
  pour: { progress: 0, tilt: 0 },
  bake: {
    temperature: 0, done: false, color: 0, timer: 0
  }
};

// ---------- MEMOIRE ----------
const memo = {
  state: "INTRO", 
  sequence: [], player: [], showIdx: 0, timer: 0,
  level: 3, buttonRadius: 60, hoverIdx: -1, lastPressedIdx: -1, 
  cursorLeftSince: true, wonIngredient: null 
};
const MEMO_BUTTONS = [
  { name:"Fraise",  color:[255,105,180] },
  { name:"Citron",  color:[255,215, 64] },
  { name:"Myrtille",color:[ 86,130,240] }
];

// ---------- ML5 & MIC ----------
let video = null, handPose = null, hands = [];
let mic = null, micLevel = 0, micActive = false;
let ml5Ready = false, camReady = false;

function pointer() {
  if (inputMode === "ml5" && hands.length > 0) {
    const kp = hands[0].index_finger_tip || hands[0].keypoints[8];
    const vx = 320 - kp.x;
    const vy = kp.y;
    return { x: (vx / 320) * W, y: (vy / 240) * H, fromHand: true };
  }
  return { x: mouseX, y: mouseY, fromHand: false };
}

function handClosed() {
  if (!hands.length) return false;
  const h = hands[0];
  const wrist = h.keypoints[0];
  const midTip = h.keypoints[12];
  const indexTip = h.keypoints[8];
  const d1 = dist(wrist.x, wrist.y, midTip.x, midTip.y);
  const d2 = dist(wrist.x, wrist.y, indexTip.x, indexTip.y);
  return (d1 + d2) / 2 < 110;
}

function handPinch() {
  if (!hands.length) return false;
  const h = hands[0];
  const tIdx = h.keypoints[8], tThu = h.keypoints[4];
  return dist(tIdx.x, tIdx.y, tThu.x, tThu.y) < 35;
}

// ---------- SETUP ----------
function setup() {
  const cnv = createCanvas(W, H);
  cnv.parent("stage");
  noSmooth();
  pixelDensity(1);
  textFont("Courier New");
  rectMode(CORNER);

  document.getElementById("mode-classic").addEventListener("click", () => setMode("classic"));
  document.getElementById("mode-ml5").addEventListener("click", () => setMode("ml5"));
  
  setMode("ml5");
}

function setMode(m) {
  inputMode = m;
  document.getElementById("mode-classic").classList.toggle("active", m === "classic");
  document.getElementById("mode-ml5").classList.toggle("active", m === "ml5");
  document.getElementById("videoWrap").style.display = m === "ml5" ? "block" : "none";
  const st = document.getElementById("status");
  if (m === "classic") { st.innerText = "Mode : clavier + souris"; stopML5(); }
  else { st.innerText = "ML5 : démarrage…"; startML5(); }
}

function startML5() {
  if (video) { document.getElementById("status").innerText = "ML5 : actif (main + voix)"; return; }
  video = createCapture(VIDEO, () => {
    video.size(320, 240);
    camReady = true;
    document.getElementById("videoWrap").appendChild(video.elt);
    video.elt.setAttribute("playsinline", "");
    try {
      handPose = ml5.handPose({ flipped: false, maxHands: 1 }, () => {
        handPose.detectStart(video, (results) => { hands = results; });
        ml5Ready = true;
        document.getElementById("status").innerText = "ML5 : caméra OK !";
      });
    } catch(e) {
      document.getElementById("status").innerText = "Erreur caméra: " + e.message;
    }
  });
  
  try {
    mic = new p5.AudioIn();
    mic.start(() => {
      micActive = true;
      document.getElementById("status").innerText = "ML5 : main + 🎤 micro prêt";
    }, () => {});
  } catch(e) {}
}

function stopML5() {
  document.getElementById("videoWrap").style.display = "none";
}

// ---------- MAIN DRAW ----------
function draw() {
  tFrame++;
  if (mic && micActive) { micLevel = mic.getLevel(); }

  if (scene === "MAP") {
    drawMap();
    updatePlayer();
    drawPlayer();
    drawInteractionHint();
  } else if (scene === "DIALOGUE") {
    drawMap();
    drawPlayer();
    drawDialogue();
  } else if (scene === "CUISINE") {
    drawCuisine();
  } else if (scene === "MEMOIRE") {
    drawMemoire();
  }

  if (scene === "MAP" || scene === "DIALOGUE") drawHud();
}

// ======================================================================
// PIXEL MAP
// ======================================================================
function drawMap() {
  for (let y = 0; y < H; y += 4) {
    const t = y / H;
    fill(lerp(255, 255, t), lerp(180, 220, t), lerp(210, 200, t)); 
    noStroke();
    rect(0, y, W, 4);
  }

  drawCandyMountains();
  drawChocolateRiver(0, 537, W, 50);

  for (let y = 300; y < H; y += TILE) {
    for (let x = 0; x < W; x += TILE) {
      const c = ((x/TILE + y/TILE) % 2 === 0) ? [255, 210, 225] : [255, 190, 210];
      fill(c[0], c[1], c[2]);
      rect(x, y, TILE, TILE);
    }
  }

  randomSeed(42);
  for (let i = 0; i < 280; i++) {
    const x = random(W), y = random(300, H);
    fill(random(["#ff4d7a","#ffd864","#86d1ff","#fff","#c2f0ff"]));
    rect(floor(x/PX)*PX, floor(y/PX)*PX, PX*2, PX);
  }

  drawCakeHouse(240, 137, "strawberry");
  drawCakeHouse(1280, 112, "vanilla");
  drawCakeHouse(2240, 150, "chocolate");
  drawCakeHouse(3200, 125, "strawberry");

  drawCandyTree(160, 400); drawCandyTree(540, 412); drawCandyTree(1040, 425); 
  drawCandyTree(1540, 412); drawCandyTree(2040, 437); drawCandyTree(2540, 418);
  drawCandyTree(2960, 412); drawCandyTree(3360, 424); drawCandyTree(3660, 400);

  drawCupcakeTower(1760, 200);
  drawCupcakeTower(3000, 220);
  drawChef(landmarks.chef.x, landmarks.chef.y);
  drawGiantOven(landmarks.oven.x, landmarks.oven.y);
  drawDistributor(landmarks.distrib.x, landmarks.distrib.y);
  drawSignpost(landmarks.signpost.x, landmarks.signpost.y);

  noStroke(); fill(80, 20, 60, 30); rect(0, 0, W, H);
}

function drawCandyMountains() {
  noStroke(); fill(180, 120, 170);
  for (let i = 0; i < 32; i++) triangle(i * 130 + 160, 287, i * 130 + 440, 175, i * 130 + 720, 287);
  fill(255, 245, 255);
  for (let i = 0; i < 32; i++) triangle(i * 130 + 360, 212, i * 130 + 440, 175, i * 130 + 520, 212);
}

function drawChocolateRiver(x, y, w, h) {
  fill(90, 42, 22); rect(x, y, w, h);
  for (let i = 0; i < 40; i++) {
    fill(140, 70, 40); rect((i * 28 + (tFrame * 0.5) % 28) % w, y + 8 + (i % 2)*18, 14, PX);
  }
  fill(255, 235, 210);
  for (let i = 0; i < 30; i++) rect((i*33 + tFrame*0.3) % w, y + 4 + (i%3)*12, PX, PX);
}

function drawCakeHouse(x, y, flavor) {
  fill(0, 0, 0, 40); rect(x - 6, y + 140, 190, 14);
  let base = color(240, 220, 180), cream = color(255, 245, 230), berry = color(220, 40, 90);
  if (flavor === "strawberry") { base = color(255, 170, 195); berry = color(200, 30, 80); }
  if (flavor === "chocolate")  { base = color(110, 60, 35); cream = color(245, 220, 195); berry = color(220, 40, 80); }

  fill(base); rect(x, y + 50, 180, 90);
  fill(cream); rect(x - 5, y + 38, 190, 23);
  for (let i = 0; i < 10; i++) rect(x + i * 18 - 2, y + 54, 16, 10 + (i%3)*5);
  fill(base); rect(x + 25, y, 130, 50);
  fill(cream); rect(x + 20, y - 8, 140, 18);
  fill(135, 206, 235); rect(x + 70, y + 75, 36, 28); fill(255); rect(x + 75, y + 78, 8, 8);
  fill(90, 50, 30); rect(x + 20, y + 94, 34, 46); fill(255, 215, 0); rect(x + 45, y + 118, 5, 5);
  fill(berry); rect(x + 80, y - 23, 16, 16); fill(120, 180, 80); rect(x + 92, y - 28, 8, 8);
  for (let i = 0; i < 14; i++) {
    fill(random(["#ff4d7a","#ffd864","#86d1ff","#fff"])); rect(x + 8 + i*13, y + 42, 6, 6);
  }
}

function drawCupcakeTower(x, y) {
  push(); noStroke(); fill(200, 60, 100); rect(x, y + 38, 104, 65);
  for (let i = 0; i < 10; i++) { fill(i%2===0 ? color(160, 30, 70) : color(220, 80, 120)); rect(x + i*10.4, y + 38, 8, 65); }
  fill(255, 245, 230); rect(x + 10, y + 12, 84, 32); rect(x + 20, y - 8, 64, 26); rect(x + 30, y - 26, 44, 24);
  fill(220, 40, 80); rect(x + 46, y - 39, 16, 16); fill(120, 180, 80); rect(x + 56, y - 44, 8, 8);
  for (let i = 0; i < 12; i++) { fill(random(["#ff4d7a","#ffd864","#86d1ff"])); rect(x + 12 + i*8, y + 18 + (i%2)*8, 6, 6); }
  pop();
}

function drawCandyTree(x, y) {
  fill(130, 70, 40); rect(x + 18, y + 38, 14, 52);
  fill(255, 180, 210); rect(x, y, 52, 47);
  fill(255, 120, 170); rect(x + 8, y + 8, 36, 31);
  fill(255, 245, 230); rect(x + 18, y + 13, 14, 13);
}

function drawChef(x, y) {
  const by = y + (tFrame % 60 < 30 ? 0 : -2);
  noStroke(); fill(0,0,0,50); rect(x - 22, by + 54, 52, 8);
  fill(255, 250, 250); rect(x - 18, by + 5, 42, 54);
  fill(255); rect(x - 21, by - 18, 46, 23); rect(x - 15, by - 28, 36, 13); rect(x - 8, by - 35, 24, 10);
  fill(0); rect(x - 10, by + 18, 5, 5); rect(x + 8, by + 18, 5, 5);
  fill(255, 170, 190); rect(x - 15, by + 26, 5, 4); rect(x + 13, by + 26, 5, 4);
  fill(200, 80, 100); rect(x - 5, by + 31, 13, 4);
  fill(255, 180, 210); rect(x - 15, by + 35, 36, 21);
  fill(220, 40, 80); rect(x - 5, by + 41, 13, 10);

  fill(255, 255, 255, 230); stroke(200, 150, 100); strokeWeight(2);
  rect(x - 38, by - 108, 130, 40, 10);
  noStroke(); fill(255, 255, 255, 230);
  triangle(x + 6, by - 68, x + 20, by - 55, x + 34, by - 68);
  fill(120, 60, 30); textSize(12); textAlign(CENTER, CENTER);
  text(hasAllIngredients() ? "Au four !" : "3 ingrédients !", x + 25, by - 88);
}

function drawGiantOven(x, y) {
  noStroke(); fill(0,0,0,60); rect(x - 39, y + 68, 118, 10);
  fill(120, 90, 70); rect(x - 44, y - 26, 122, 102);
  fill(90, 60, 50);
  for (let j = 0; j < 6; j++) {
    rect(x - 44, y - 26 + j*17, 122, 6);
    for (let i = 0; i < 10; i++) rect(x - 44 + ((j%2)?10:0) + i*12, y - 26 + j*17, 8, 17);
  }
  fill(40, 20, 10); rect(x - 28, y + 8, 91, 57); fill(50, 28, 18); rect(x - 23, y + 5, 81, 47);
  const fb = 150 + sin(tFrame*0.3)*50;
  fill(255, fb, 30); rect(x - 15, y + 26, 60, 18); fill(255, 230, 120); rect(x - 5, y + 31, 36, 10);
  fill(100, 70, 60); rect(x + 26, y - 52, 26, 31); fill(230, 210, 210, 180); rect(x + 28, y - 60 - (tFrame%30), 16, 10);
}

function drawDistributor(x, y) {
  noStroke(); fill(0,0,0,60); rect(x - 33, y + 75, 78, 10);
  fill(180, 40, 70); rect(x - 33, y + 12, 68, 70); fill(220, 60, 90); rect(x - 28, y + 18, 58, 10);
  fill(60, 20, 30); rect(x - 5, y + 46, 16, 6);
  fill(180, 220, 255, 220); rect(x - 39, y - 52, 78, 63); fill(220, 240, 255, 220); rect(x - 33, y - 57, 68, 10);
  randomSeed(7);
  for (let i = 0; i < 16; i++) { fill(random(["#ff4d7a","#ffd864","#86d1ff","#aaffaa","#ffffff"])); rect(x - 31 + (i%8)*8, y - 44 + floor(i/8)*10, 8, 8); }
  if (!hasAllIngredients()) {
    const g = 150 + sin(tFrame*0.15)*80; noFill(); stroke(255, 240, 100, g); strokeWeight(2); rect(x - 41, y - 60, 84, 140); noStroke();
  }
}

function drawSignpost(x, y) {
  fill(0,0,0,50); rect(x - 18, y + 38, 52, 8);
  fill(120, 70, 40); rect(x + 5, y, 10, 47);
  fill(200, 150, 90); rect(x - 18, y - 5, 52, 26);
  fill(80, 40, 20); textSize(10); textAlign(CENTER, CENTER); text("SWEET", x + 7, y + 2); text("ISLAND", x + 7, y + 14);
}

function updatePlayer() {
  if (scene !== "MAP") return;
  const s = player.speed;
  let dx = 0, dy = 0;
  if (keyIsDown(LEFT_ARROW) || keyIsDown(81) || keyIsDown(65)) dx -= 1;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) dx += 1;
  if (keyIsDown(UP_ARROW) || keyIsDown(90) || keyIsDown(87)) dy -= 1;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) dy += 1;
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  player.x += dx * s; player.y += dy * s;
  
  player.x = constrain(player.x, 40, W - 40); 
  player.y = constrain(player.y, 375, H - 37);
  
  player.moving = (dx !== 0 || dy !== 0);
  if (dx < 0) player.dir = "left"; else if (dx > 0) player.dir = "right"; else if (dy < 0) player.dir = "up"; else if (dy > 0) player.dir = "down";
  if (player.moving) player.anim += 0.25;
}

function drawPlayer() {
  const x = player.x, y = player.y, bob = player.moving ? floor(sin(player.anim)*2) : 0;
  noStroke();
  fill(0,0,0,70); rect(x - 10, y + 14, 20, 4);
  fill(70, 40, 90); rect(x - 8, y + 8 + bob, 6, 8); rect(x + 2, y + 8 - bob, 6, 8);
  fill(0, 180, 210); rect(x - 10, y - 10 + bob, 20, 22); fill(0, 140, 170); rect(x - 10, y - 2 + bob, 20, 2);
  fill(255, 215, 64); rect(x - 10, y + 6 + bob, 20, 2);
  fill(255, 220, 185); rect(x - 8, y - 22 + bob, 16, 14); fill(180, 60, 100); rect(x - 10, y - 26 + bob, 20, 6);
  fill(0); 
  if (player.dir === "left") { rect(x - 6, y - 14 + bob, 2, 2); } else if (player.dir === "right") { rect(x + 4, y - 14 + bob, 2, 2); }
  else if (player.dir === "up") { fill(0); rect(x - 6, y - 18 + bob, 2, 2); rect(x + 4, y - 18 + bob, 2, 2); }
  else { rect(x - 6, y - 14 + bob, 2, 2); rect(x + 4, y - 14 + bob, 2, 2); }
}

function nearLandmark(key, thresh = 80) { return dist(player.x, player.y, landmarks[key].x, landmarks[key].y) < thresh; }

function drawInteractionHint() {
  let msg = "";
  if (nearLandmark("chef")) msg = "[E] Parler au Chef";
  else if (nearLandmark("distrib")) msg = hasAllIngredients() ? "Tous les ingrédients obtenus !" : "[E] Tenter le distributeur";
  else if (nearLandmark("oven")) msg = hasAllIngredients() ? "[E] Cuisiner" : "[E] Il manque des ingrédients…";
  else if (nearLandmark("signpost")) msg = "[E] Lire la pancarte";
  if (!msg) return;
  noStroke(); fill(20, 10, 25, 220); rect(player.x - 90, player.y - 50 - 18, 180, 30, 4);
  fill(255, 215, 64); textAlign(CENTER, CENTER); textSize(12); text(msg, player.x, player.y - 50 - 3);
}

function drawDialogue() {
  noStroke(); fill(20, 10, 25, 230); rect(60, H - 200, W - 120, 160, 6);
  fill(255, 215, 64); rect(60, H - 200, W - 120, 4); rect(60, H - 40, W - 120, 4);
  fill(255); textAlign(LEFT, TOP); textSize(16); text(currentDialog?.speaker || "", 80, H - 190);
  fill(255, 240, 210); textSize(14); text(currentDialog?.text || "", 80, H - 155, W - 160, 100);
  fill(255, 215, 64); textSize(10); textAlign(RIGHT, BOTTOM); text("[ESPACE] continuer", W - 80, H - 50);
}

function drawHud() {
  noStroke(); fill(20, 10, 25, 210); rect(12, 12, 350, 68, 4);
  fill(255, 215, 64); rect(12, 12, 350, 3);
  fill(255); textAlign(LEFT, TOP); textSize(13); text("QUÊTE : Le Grand Gâteau", 22, 20);
  textSize(11); fill(255, 230, 200);
  text("• Ingrédients : " + quest.obtained.length + "/" + QUEST_INGREDIENTS.length + (quest.obtained.length ? "  (" + quest.obtained.join(", ") + ")" : ""), 22, 38);
  text("• Gâteau cuit :     " + (quest.cakeBaked ? "OK ✓" : "à faire"), 22, 54);
  fill(20, 10, 25, 210); rect(W - 200, 12, 188, 28, 3);
  fill(255, 215, 64); textAlign(LEFT, CENTER); textSize(11);
  text(inputMode === "ml5" ? "ENTRÉE : ML5 (main+voix)" : "ENTRÉE : Souris/Clavier", W - 194, 26);
}

function keyPressed() {
  if (scene === "MAP" && (key === "e" || key === "E")) {
    if (nearLandmark("chef")) {
      pushDialog("Chef Marshmallow", "Bienvenue sur Sweet Island !\nPour la recette il me faut 3 ingrédients : FARINE, ŒUF, SUCRE.\nGagne-les au Distributeur Magique (3 puis 4 puis 5 couleurs à mémoriser !)\nPuis viens cuisiner au Four Géant.");
    } else if (nearLandmark("signpost")) {
      pushDialog("Pancarte", "→ Chef : apprends la recette\n→ Distributeur : 3 manches = 3 ingrédients\n→ Four : Cooking Mama\nDéplace-toi : Flèches / ZQSD");
    } else if (nearLandmark("distrib")) {
      if (hasAllIngredients()) pushDialog("Distributeur", "Tous les ingrédients sont déjà obtenus ! Va au Four Géant.");
      else { resetMemoire(); scene = "MEMOIRE"; }
    } else if (nearLandmark("oven")) {
      if (!hasAllIngredients()) {
        const manquants = QUEST_INGREDIENTS.filter(i => !quest.obtained.includes(i));
        pushDialog("Four Géant", "Il me manque encore : " + manquants.join(", ") + " !");
      }
      else { resetCuisine(); scene = "CUISINE"; }
    }
    return;
  }
  if (scene === "DIALOGUE" && (key === " " || keyCode === 32 || keyCode === ENTER)) { scene = "MAP"; currentDialog = null; return; }
  if ((scene === "CUISINE" || scene === "MEMOIRE") && (keyCode === ESCAPE || key === "a" || key === "A")) { scene = "MAP"; return; }
  if (scene === "CUISINE" && (key === " " || keyCode === 32)) advanceCuisineIntro();
  if (scene === "MEMOIRE" && (key === " " || keyCode === 32) && memo.state === "INTRO") memo.state = "SHOW";
}

function pushDialog(speaker, text) { currentDialog = { speaker, text }; scene = "DIALOGUE"; }

function mousePressed() { handlePressAt(mouseX, mouseY); }

function handlePressAt(mx, my) {
  if (scene === "DIALOGUE") { scene = "MAP"; currentDialog = null; return; }
  if (scene === "MEMOIRE" && memo.state === "INTRO") { memo.state = "SHOW"; return; }
  
  // Nouveau clic classique pour le four (Bourrinage)
  if (scene === "CUISINE" && cuisine.step === "BAKE" && inputMode === "classic") {
    if (!cuisine.bake.done) {
      cuisine.bake.temperature += 8; // Chaque clic rajoute de la chaleur
    }
  }

  if (scene === "CUISINE") {
    if (cuisine.step === "INTRO") { cuisine.step = "INGREDIENTS"; return; }
    if (cuisine.step === "INGREDIENTS") {
      for (const ing of cuisine.ingredients) {
        if (!ing.got && dist(mx, my, ing.x, ing.y) < 40) { cuisine.dragging = ing; return; }
      }
    }
    if (cuisine.step === "POUR" && mx > 60 && mx < 220 && my > H - 90 && my < H - 40) startPour();
    if (cuisine.step === "DONE") { quest.cakeBaked = true; quest.finished = true; scene = "MAP"; }
  }
}

function mouseReleased() {
  if (scene === "CUISINE" && cuisine.dragging) {
    const ing = cuisine.dragging;
    if (dist(mouseX, mouseY, cuisine.bowl.x, cuisine.bowl.y) < cuisine.bowl.r) {
      ing.got = true; cuisine.bowl.filled++;
      if (cuisine.ingredients.every(i => i.got)) cuisine.step = "MIX";
    }
    cuisine.dragging = null;
  }
}

function resetMemoire() {
  memo.state = "INTRO"; memo.sequence = []; memo.player = []; memo.showIdx = 0; memo.timer = 0;
  memo.level = 3 + quest.obtained.length; memo.hoverIdx = -1; memo.lastPressedIdx = -1; memo.cursorLeftSince = true; memo.wonIngredient = null;
}

function genRandomSequence(len) {
  const out = []; for (let i = 0; i < len; i++) out.push(Math.floor(Math.random() * 3)); return out;
}

function drawMemoire() {
  background(38, 18, 52);
  for (let i = 0; i < 60; i++) {
    fill(255, 220, 255, 60 + (i%3)*40); rect((i*71 + tFrame*0.4) % W, (i*59 + tFrame*0.2) % H, PX, PX);
  }
  noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(26); text("DISTRIBUTEUR MAGIQUE", W/2, 62);
  fill(255, 215, 64); textSize(14);
  text("Passe la souris/ta main sur les couleurs (sors pour re-sélectionner)", W/2, 100);
  fill(255, 220, 180); textSize(11);
  text("[ESC] / [A] pour quitter   •   [ESPACE] pour démarrer   •   Manche " + (quest.obtained.length + 1) + "/3  (mémorise " + memo.level + " couleurs)", W/2, H - 35);

  if (memo.state === "SHOW" && memo.sequence.length === 0) {
    memo.sequence = genRandomSequence(memo.level); memo.timer = tFrame; memo.showIdx = 0;
  }

  if (memo.state === "INTRO") {
    fill(255); textSize(21); text("Manche " + (quest.obtained.length + 1) + " — gagne : " + nextIngredientToWin(), W/2, 150);
    textSize(16); fill(255, 215, 64); text("Survole un bouton ou appuie sur [ESPACE] pour commencer", W/2, 187);
  } else if (memo.state === "SHOW") {
    fill(255); textSize(18); text("Mémorise la séquence (" + memo.sequence.length + " couleurs)…", W/2, 150);
    if (tFrame - memo.timer > 45) {
      memo.showIdx++; memo.timer = tFrame;
      if (memo.showIdx >= memo.sequence.length) { memo.state = "PLAY"; memo.player = []; }
    }
  } else if (memo.state === "PLAY") {
    fill(120, 255, 160); textSize(18); text("À toi ! (" + memo.player.length + "/" + memo.sequence.length + ")", W/2, 150);
  } else if (memo.state === "LOSE") {
    fill(255, 100, 120); textSize(24); text("Raté ! Nouvelle séquence…", W/2, 150);
    if (tFrame - memo.timer > 80) {
      memo.sequence = genRandomSequence(memo.level); memo.player = []; memo.state = "SHOW"; memo.showIdx = 0; memo.timer = tFrame;
      memo.lastPressedIdx = -1; memo.cursorLeftSince = true;
    }
  } else if (memo.state === "WIN") {
    fill(255, 220, 80); textSize(30); text("★ INGRÉDIENT OBTENU : " + (memo.wonIngredient || "") + " ★", W/2, 187);
    
    if (hasAllIngredients()) {
      fill(255); textSize(16);
      text("Génial ! Tu as tous les ingrédients. Appuie sur [ÉCHAP] pour aller au Four.", W/2, 225);
    } else {
      fill(255); textSize(16);
      text("Prépare-toi pour la prochaine manche...", W/2, 225);
      if (tFrame - memo.timer > 120) { 
        memo.level = 3 + quest.obtained.length;
        memo.sequence = genRandomSequence(memo.level);
        memo.player = []; memo.state = "SHOW"; memo.showIdx = 0; memo.timer = tFrame;
        memo.lastPressedIdx = -1; memo.cursorLeftSince = true;
      }
    }
  }

  memo.hoverIdx = -1;
  const p = pointer();
  for (let i = 0; i < 3; i++) {
    const bx = 800 + i * 1120, by = H/2 + 37;
    const lit = (memo.state === "SHOW" && memo.showIdx < memo.sequence.length && memo.sequence[memo.showIdx] === i && (tFrame - memo.timer) < 35);
    const c = MEMO_BUTTONS[i].color;
    noStroke(); fill(0,0,0,80); rect(bx - 70, by - 75, 140, 175, 6);
    const factor = lit ? 1.0 : 0.55;
    fill(c[0]*factor, c[1]*factor, c[2]*factor); rect(bx - 60, by - 75, 120, 150, 6);
    fill(255, 255, 255, lit ? 220 : 80); rect(bx - 46, by - 60, 20, 12, 3);
    fill(40, 20, 30); textSize(14); textAlign(CENTER, CENTER); text(MEMO_BUTTONS[i].name, bx, by + 100);
    
    if (dist(p.x, p.y, bx, by) < memo.buttonRadius) {
      memo.hoverIdx = i; noFill(); stroke(255, 230, 120); strokeWeight(3); rect(bx - 64, by - 80, 128, 160, 6); noStroke();
    }
  }

  if (inputMode === "ml5") drawML5Cursor(p);

  if (memo.hoverIdx === -1 || memo.hoverIdx !== memo.lastPressedIdx) {
    memo.cursorLeftSince = true;
  }

  if (memo.hoverIdx >= 0 && memo.cursorLeftSince) {
    if (memo.state === "INTRO") {
      memo.state = "SHOW";
      memo.cursorLeftSince = false;
    } 
    else if (memo.state === "PLAY") {
      memoPress(memo.hoverIdx); 
      memo.lastPressedIdx = memo.hoverIdx; 
      memo.cursorLeftSince = false;
    }
  }
}

function memoPress(i) {
  if (memo.state !== "PLAY") return;
  memo.player.push(i);
  const idx = memo.player.length - 1;
  if (memo.player[idx] !== memo.sequence[idx]) { 
    memo.state = "LOSE"; memo.timer = tFrame; 
  } 
  else if (memo.player.length === memo.sequence.length) {
    const ing = nextIngredientToWin();
    if (ing) quest.obtained.push(ing);
    memo.wonIngredient = ing; memo.state = "WIN"; memo.timer = tFrame;
  }
}

function drawML5Cursor(p) {
  if (!hands.length) {
    fill(255, 215, 64); textAlign(CENTER, CENTER); textSize(12); text("Montre ta main à la caméra…", W/2, H/2 + 200); return;
  }
  noStroke(); fill(color(255, 255, 120, 200)); rect(p.x - 10, p.y - 10, 20, 20, 4);
  fill(255); rect(p.x - 2, p.y - 2, 4, 4);
  fill(255, 255, 255, 180); textSize(12); textAlign(CENTER); text("✋", p.x, p.y - 20);
}

function resetCuisine() {
  cuisine.step = "INTRO";
  for (const ing of cuisine.ingredients) ing.got = false;
  cuisine.bowl.filled = 0;
  cuisine.mix = { progress: 0, lastAngle: null, speed: 0, warning: 0, spilled: 0, lastPinch: 0, handWasOpen: true, openCloseCount: 0 };
  cuisine.pour = { progress: 0, tilt: 0 };
  
  // RESET DU NOUVEAU FOUR
  cuisine.bake = { temperature: 0, done: false, color: 0, timer: 0 };
}

function advanceCuisineIntro() { if (cuisine.step === "INTRO") cuisine.step = "INGREDIENTS"; }

function drawCuisine() {
  for (let y = 0; y < H; y += 4) {
    const t = y / H; fill(lerp(255, 210, t), lerp(220, 170, t), lerp(240, 200, t)); rect(0, y, W, 4);
  }
  for (let x = 0; x < W; x += 40) {
    for (let y = 525; y < H; y += 40) {
      fill((x/40+y/40)%2 ? color(230,200,180) : color(210,180,160)); rect(x, y, 40, 40);
    }
  }
  fill(160, 110, 80); rect(0, 500, W, 25); fill(200, 150, 110); rect(0, 497, W, 5);
  noStroke(); fill(20,10,25,210); rect(10, 10, W - 20, 52, 4);
  fill(255, 215, 64); textAlign(LEFT, CENTER); textSize(14); text("CUISINE — " + stepLabel(cuisine.step), 24, 27);
  fill(255); textSize(11); text(stepHint(), 24, 50);
  fill(255, 215, 64); textAlign(RIGHT, CENTER); text("[ESC] quitter", W - 24, 37);

  if (cuisine.step === "INTRO") drawCuisineIntro();
  else if (cuisine.step === "INGREDIENTS") drawIngredientsStep();
  else if (cuisine.step === "MIX") drawMixStep();
  else if (cuisine.step === "POUR") drawPourStep();
  else if (cuisine.step === "BAKE") drawBakeStep();
  else if (cuisine.step === "DONE") drawDoneStep();

  if (inputMode === "ml5" && cuisine.step !== "BAKE") drawML5Cursor(pointer());
}

function stepLabel(s) { return ({ INTRO:"Intro", INGREDIENTS:"Étape 1 : Ingrédients", MIX:"Étape 2 : Mélanger", POUR:"Étape 3 : Verser", BAKE:"Étape 4 : Cuire", DONE:"Succès !" })[s]; }
function stepHint() {
  if (cuisine.step === "INTRO") return "Clique / [ESPACE] pour commencer";
  if (cuisine.step === "INGREDIENTS") return inputMode === "ml5" ? "Pointe un ingrédient, ✊ pour saisir, relâche ✋ au-dessus du bol" : "Clique-glisse chaque ingrédient dans le bol (4 à ajouter)";
  if (cuisine.step === "MIX") return inputMode === "ml5" ? "Ouvre/ferme ta main RÉGULIÈREMENT (✋✊) pour mélanger — pas trop vite !" : "Fais des cercles dans le bol avec la souris — pas trop vite !";
  if (cuisine.step === "POUR") return "Clique le bouton pour verser dans le moule";
  
  // MISE A JOUR DU HINT POUR LE NOUVEAU FOUR
  if (cuisine.step === "BAKE") return inputMode === "ml5" ? "🎤 Fais un bruit continu dans le micro pour faire monter la température !" : "Clique super vite pour faire monter la température !";
  
  if (cuisine.step === "DONE") return "Gâteau parfait ! Clique pour revenir à la carte";
  return "";
}

function drawCuisineIntro() {
  fill(20, 10, 25, 210); rect(W/2 - 280, H/2 - 112, 560, 225, 6);
  fill(255, 215, 64); rect(W/2 - 280, H/2 - 112, 560, 3);
  fill(255); textAlign(CENTER, CENTER); textSize(22); text("RECETTE DU GRAND GÂTEAU", W/2, H/2 - 72);
  fill(255, 240, 200); textSize(14);
  text("1) Ajoute les 4 ingrédients au bol", W/2, H/2 - 32); text("2) Mélange doucement la pâte", W/2, H/2 - 3);
  text("3) Verse dans le moule", W/2, H/2 + 28); text("4) Cuis au four en gardant la température élevée", W/2, H/2 + 59);
  fill(255, 215, 64); textSize(13); text("Clique ou appuie [ESPACE] pour commencer", W/2, H/2 + 102);
}

function drawIngredientsStep() {
  drawBowl(cuisine.bowl.x, cuisine.bowl.y, cuisine.bowl.filled);
  for (const ing of cuisine.ingredients) { if (ing.got) continue; drawIngredientIcon(ing); }
  if (cuisine.dragging) { const p = pointer(); drawIngredientIcon({ ...cuisine.dragging, x: p.x, y: p.y }); }
  fill(20,10,25,200); rect(W - 220, 70, 210, 45, 4);
  fill(255); textAlign(LEFT, CENTER); textSize(13); text("Ingrédients : " + cuisine.bowl.filled + "/3", W - 210, 92);

  if (inputMode === "ml5") {
    const p = pointer(); const pinched = handClosed() || handPinch();
    if (pinched && !cuisine.dragging) {
      for (const ing of cuisine.ingredients) {
        if (!ing.got && dist(p.x, p.y, ing.x, ing.y) < 40) { cuisine.dragging = ing; break; }
      }
    } else if (!pinched && cuisine.dragging) {
      const ing = cuisine.dragging;
      if (dist(p.x, p.y, cuisine.bowl.x, cuisine.bowl.y) < cuisine.bowl.r) {
        ing.got = true; cuisine.bowl.filled++;
        if (cuisine.ingredients.every(i => i.got)) cuisine.step = "MIX";
      }
      cuisine.dragging = null;
    }
  }
}

function drawIngredientIcon(ing) {
  const x = ing.x, y = ing.y;
  noStroke(); fill(0,0,0,60); rect(x - 18, y + 22, 36, 6);
  if (ing.id === "flour") {
    fill(250, 240, 210); rect(x - 18, y - 20, 36, 40, 3); fill(200, 180, 140); rect(x - 18, y - 22, 36, 6, 2);
    fill(120, 80, 50); textSize(10); textAlign(CENTER, CENTER); text("FARINE", x, y + 2);
  } else if (ing.id === "egg") {
    fill(255, 244, 220); rect(x - 14, y - 18, 28, 36, 14); fill(255, 220, 160); rect(x - 8, y - 12, 6, 4);
  } else if (ing.id === "sugar") {
    fill(240, 240, 255); rect(x - 18, y - 18, 36, 36, 4); fill(200, 200, 230); rect(x - 18, y - 20, 36, 6);
    fill(120, 100, 140); textSize(10); textAlign(CENTER); text("SUCRE", x, y + 2);
  }
}

function drawBowl(cx, cy, filled) {
  noStroke(); fill(0,0,0,60); rect(cx - 90, cy + 60, 180, 10);
  fill(220, 220, 230); rect(cx - 90, cy - 30, 180, 80, 4);
  fill(190, 190, 210); rect(cx - 90, cy + 40, 180, 10);
  fill(180, 170, 190); rect(cx - 82, cy - 22, 164, 14, 2);
  if (filled > 0) { fill(245, 230, 190); rect(cx - 78, cy - 18, 156, 30 + filled*4, 2); }
  if (filled >= 3) {
    for (let i = 0; i < 10; i++) {
      fill(255, 255, 255, 180); rect(cx - 70 + (i*16 + tFrame*0.4)%150, cy - 16 + (i%3)*6, PX, PX);
    }
  }
}

function drawMixStep() {
  drawBowl(cuisine.bowl.x, cuisine.bowl.y, 3);
  const cx = cuisine.bowl.x, cy = cuisine.bowl.y;
  const p = constrain(cuisine.mix.progress, 0, 1);
  noFill(); stroke(255, 180, 60, 180); strokeWeight(6); arc(cx, cy, 210, 210, -HALF_PI, -HALF_PI + TWO_PI * p);
  noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(14); text("Mélange : " + floor(p*100) + "%", cx, cy + 150);

  fill(20,10,25,210); rect(20, 100, 280, 22, 3);
  let sp = cuisine.mix.speed;
  let col = color(100, 220, 120);
  if (sp > 9) col = color(255, 200, 80); if (sp > 16) col = color(255, 80, 100);
  fill(col); rect(22, 102, min(276, sp * 10), 18, 2);
  fill(255); textSize(11); textAlign(LEFT, CENTER); text("Vitesse", 24, 111);

  if (cuisine.mix.warning > 0) {
    fill(255, 80, 80, cuisine.mix.warning * 30); rect(0, 0, W, H); cuisine.mix.warning = max(0, cuisine.mix.warning - 1);
  }
  if (cuisine.mix.spilled > 3) {
    fill(20,10,25,220); rect(W/2 - 220, H/2 - 50, 440, 100, 4);
    fill(255, 80, 100); textSize(18); textAlign(CENTER, CENTER); text("Trop renversé ! On recommence le mélange.", W/2, H/2 - 10);
    fill(255); textSize(11); text("(clique pour retenter)", W/2, H/2 + 20);
  }

  const pt = pointer();
  if (inputMode === "classic") {
    if (dist(pt.x, pt.y, cx, cy) < 110 && dist(pt.x, pt.y, cx, cy) > 20) {
      const ang = atan2(pt.y - cy, pt.x - cx);
      if (cuisine.mix.lastAngle !== null) {
        let d = ang - cuisine.mix.lastAngle;
        if (d > PI) d -= TWO_PI; if (d < -PI) d += TWO_PI;
        const step = abs(d);
        cuisine.mix.speed = lerp(cuisine.mix.speed, step * 30, 0.2);
        if (step > 0.02 && cuisine.mix.speed < 16) cuisine.mix.progress += step / (TWO_PI * 5); 
        if (cuisine.mix.speed > 16) {
          cuisine.mix.warning = min(8, cuisine.mix.warning + 2);
          if (random() < 0.05) cuisine.mix.spilled++;
        }
      }
      cuisine.mix.lastAngle = ang;
    } else {
      cuisine.mix.speed = lerp(cuisine.mix.speed, 0, 0.1); cuisine.mix.lastAngle = null;
    }
  } else {
    const closed = handClosed(); const nowOpen = !closed;
    if (nowOpen !== cuisine.mix.handWasOpen) {
      const dt = tFrame - cuisine.mix.lastPinch; cuisine.mix.lastPinch = tFrame;
      if (dt > 0) {
        const rate = 60 / dt; 
        cuisine.mix.speed = lerp(cuisine.mix.speed, rate * 4, 0.5);
        if (rate < 4 && rate > 0.3) cuisine.mix.progress += 0.07;
        if (rate > 6) { cuisine.mix.warning = min(8, cuisine.mix.warning + 3); if (random() < 0.3) cuisine.mix.spilled++; }
      }
      cuisine.mix.handWasOpen = nowOpen;
    }
    cuisine.mix.speed = lerp(cuisine.mix.speed, 0, 0.03);
  }

  cuisine.mix.progress = constrain(cuisine.mix.progress, 0, 1);
  if (cuisine.mix.progress >= 1) cuisine.step = "POUR";
}

function drawPourStep() {
  const cx = cuisine.bowl.x, cy = cuisine.bowl.y - 40;
  const mx = 1040, my = 550;
  noStroke(); fill(0,0,0,60); rect(mx - 70, my + 20, 140, 10);
  fill(90, 40, 30); rect(mx - 70, my - 10, 140, 34, 3);
  fill(130, 60, 40); rect(mx - 66, my - 6, 132, 6);

  const pp = constrain(cuisine.pour.progress, 0, 1);
  fill(245, 230, 190); rect(mx - 62, my + 20 - pp * 28, 124, pp * 28);

  push(); translate(cx, cy); rotate(cuisine.pour.tilt); drawBowl(0, 0, 3); pop();

  if (cuisine.pour.tilt > 0.2 && pp < 1) {
    fill(245, 230, 190);
    for (let y = cy + 30; y < my - 10; y += 8) rect(cx - 4, y, 8, 6);
    cuisine.pour.progress += 0.01;
  }

  fill(20,10,25,210); rect(60, H - 112, 200, 62, 4);
  fill(255, 215, 64); rect(60, H - 112, 200, 3);
  fill(255); textAlign(CENTER, CENTER); textSize(16); text("VERSER", 160, H - 81);

  if (!mouseIsPressed && !(inputMode === "ml5" && handClosed())) cuisine.pour.tilt = lerp(cuisine.pour.tilt, 0, 0.1);
  if (cuisine.pour.progress >= 1) cuisine.step = "BAKE";
}

function startPour() { cuisine.pour.tilt = 0.7; }

function drawBakeStep() {
  for (let y = 80; y < H - 30; y += 4) {
    const t = (y - 80) / (H - 110);
    fill(lerp(80,30,t), lerp(30,10,t), lerp(20,10,t)); rect(0, y, W, 4);
  }
  const flick = 150 + sin(tFrame*0.4)*50;
  fill(255, flick, 30, 60); rect(0, 80, W, H - 110);

  if (!cuisine.bake.done) {
    cuisine.bake.temperature -= 0.3;
    cuisine.bake.temperature = constrain(cuisine.bake.temperature, 0, 100);

    fill(90); rect(W/2 - 150, H - 125, 300, 37, 5);
    fill(255, 100, 50); rect(W/2 - 150, H - 125, cuisine.bake.temperature * 3, 37, 5);
    fill(255); textAlign(CENTER, CENTER); textSize(16);
    text("Température : " + floor(cuisine.bake.temperature) + "%", W/2, H - 107);

    if (inputMode === "ml5") {
      const mL = micLevel;
      fill(255); textSize(12);
      text("🎤 Crie ou souffle dans le micro pour faire chauffer le four !", W/2, H - 50);
      
      if (mL > 0.05) {
        cuisine.bake.temperature += mL * 15; 
      }
    } else {
      fill(255); textSize(12); text("Clique super vite sur l'écran pour faire chauffer le four !", W/2, H - 50);
    }

    if (cuisine.bake.temperature >= 100) {
      cuisine.bake.done = true;
    }

    cuisine.bake.color = floor(map(cuisine.bake.temperature, 0, 100, 0, 2));
    drawCakeInOven(W/2, H/2 - 10);

  } else {
    cuisine.bake.color = 2;
    drawCakeInOven(W/2, H/2 - 10);
    
    fill(255, 215, 64); textAlign(CENTER, CENTER); textSize(28); text("★ CUISSON RÉUSSIE ★", W/2, 160);
    cuisine.bake.timer++; if (cuisine.bake.timer > 90) cuisine.step = "DONE"; 
  }
}

function drawCakeInOven(cx, cy) {
  const stage = cuisine.bake.color;
  // Par sécurité si ça dépasse
  const safeStage = constrain(stage, 0, 3);
  const baseCol = [[250, 230, 180], [230, 190, 120], [200, 150, 80], [70, 40, 30]][safeStage];
  const cream = safeStage >= 2 ? [255,240,220] : [255,250,230];

  noStroke(); fill(0,0,0,80); rect(cx - 90, cy + 60, 180, 10);
  fill(60, 30, 20); rect(cx - 80, cy + 30, 160, 24, 3);
  fill(baseCol[0], baseCol[1], baseCol[2]);
  
  // Le gâteau monte en fonction de la température !
  const rise = min(30, cuisine.bake.temperature * 0.3);
  rect(cx - 70, cy + 20 - rise, 140, 32 + rise, 3);
  if (safeStage >= 1) {
    fill(baseCol[0], baseCol[1], baseCol[2]);
    rect(cx - 60, cy + 6 - rise, 120, 14); rect(cx - 50, cy - 6 - rise, 100, 14);
  }
  if (cuisine.bake.done) {
    fill(cream[0], cream[1], cream[2]);
    rect(cx - 70, cy - 22, 140, 16); rect(cx - 60, cy - 32, 120, 14);
    for (let i = 0; i < 10; i++) rect(cx - 68 + i*14, cy - 6, 10, 6 + (i%3)*3);
    fill(220, 40, 80); rect(cx - 6, cy - 44, 12, 12); fill(120, 180, 80); rect(cx + 4, cy - 48, 6, 4);
    for (let i = 0; i < 16; i++) {
      fill(random(["#ff4d7a","#ffd864","#86d1ff","#ffffff"])); rect(cx - 60 + (i*9), cy - 22 + (i%3)*4, PX, PX);
    }
  }
  fill(255, 240, 220, 150 + sin(tFrame*0.3)*60);
  for (let i = 0; i < 4; i++) rect(cx - 30 + i*20, cy - 60 - ((tFrame + i*15) % 40), 6, 10);
  if (safeStage === 3) {
    fill(30,30,30, 180); for (let i = 0; i < 6; i++) rect(cx - 40 + i*14, cy - 80 - (tFrame + i*10)%60, 10, 12);
  }
}

function drawDoneStep() {
  background(255, 200, 220); drawCakeInOven(W/2, H/2 + 25);
  for (let i = 0; i < 120; i++) {
    fill(random(["#ff4d7a","#ffd864","#86d1ff","#ffffff","#ff66a3"]));
    rect((i * 83 + tFrame * 2) % W, (i * 47 + tFrame * 4) % H, PX*2, PX);
  }
  fill(20,10,25,210); rect(W/2 - 260, 100, 520, 112, 4);
  fill(255, 215, 64); textAlign(CENTER, CENTER); textSize(32); text("★ GÂTEAU PARFAIT ★", W/2, 135);
  fill(255); textSize(14); text("Le Chef Marshmallow est ravi ! Clique pour revenir sur la carte.", W/2, 175);
}
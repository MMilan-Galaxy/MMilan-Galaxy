/* =========================================================
   SACCHARIA : LE CŒUR DE RÉGLISSE PURE — Top-Down
   p5.js + ml5.js
   ========================================================= */

// ---------- Canvas / World (ecran CAVE 3 panneaux) ----------
// Canvas planetaire fixe 5760x1200 = 3 ecrans de 1920x1200 colles en U.
// Disposition : ECRAN GAUCHE [0..1920] / ECRAN CENTRE [1920..3840] / ECRAN DROITE [3840..5760]
// La scene principale (Saccharia) s'affiche sur l'ecran CENTRE. Les ecrans lateraux
// affichent un panorama de la zone Ouest (a gauche) et Est (a droite), separes par
// des frontieres de NUAGES DE SUCRE qui s'ouvrent quand la quete les debloque.
const PLANET_W = 5760;
const PLANET_H = 1200;
const SCREEN_W = 1920;                 // un panneau du CAVE
const CENTER_X0 = 1920;                 // debut bande centrale
const CENTER_X1 = 3840;                 // fin bande centrale
let VIEW_W = PLANET_W;
let VIEW_H = PLANET_H;
// Monde logique (mis a l'echelle vers la bande CENTRALE 1920x1200 au rendu).
const WORLD_W = 3200;
const WORLD_H = 1800;
const WORLD_TO_PLANET_SX = SCREEN_W / WORLD_W;     // ~0.6 — mappe le monde dans la bande centrale
const WORLD_TO_PLANET_SY = PLANET_H / WORLD_H;     // ~0.667
const WORLD_CENTER_OFFSET_X = CENTER_X0;            // translate du monde vers la bande centrale

// Helper : retourne le triplet (scale, offsetX, offsetY) pour caser une scene
// (mini-jeu, salle, etc.) dans la BANDE CENTRALE 1920x1200. Le reste du canvas
// est libre pour le decor lateral.
function getCenterFit(sceneW, sceneH) {
  const sx = SCREEN_W / sceneW;
  const sy = PLANET_H / sceneH;
  const s = Math.min(sx, sy);
  const ox = CENTER_X0 + (SCREEN_W - sceneW * s) / 2;
  const oy = (PLANET_H - sceneH * s) / 2;
  return { s, sx: s, sy: s, ox, oy, sceneW, sceneH };
}

// Geographic threshold separating candy land (south) and bitter zone (north)
const BITTER_LINE_Y = 800;

// ---------- Globals ----------
let video, faceapi;
let detections = [];
let faceReady = false;
let webcamFailed = false;

// Audio for Bush blowing detection
let mic, fft;
let bushes = [];
let eastBushes = [];
const BLOW_THRESHOLD = 0.05;
let voiceFilterEnabled = true;
let breathRatioThreshold = 0.55;
let audioReady = false;

// Microphone (for Trial 1 — Miroir de l'Amertume)
let audioCtx, analyser, micDataArray;
let micReady = false;
let micFailed = false;
let micLevel = 0;

let emotionHappy = 0;
let emotionDetected = "neutre";

let gameState = "LIVRAISON";
let score = 0;

// Camera
const cam = { x: 0, y: 0 };

// Player
const player = {
  x: 400, y: 1500,
  vx: 0, vy: 0,
  baseSpeed: 5.2,    // augmente : trajets entre zones moins penibles
  speed: 5.2,
  radius: 14,
  facing: 0, // 0=down, 1=left, 2=right, 3=up
  inventory: [],
  walkPhase: 0
};

// World map zones (rectangles for biome / collision-free decoration)
const forestZones = [
  { x: 80,  y: 900, w: 700, h: 700 },
  { x: 1300, y: 1050, w: 800, h: 600 }
];

// Buildings (AABB collisions, with a door gap)
const buildings = [
  { id: "kitchen", x: 850, y: 1050, w: 280, h: 220, color: [255,240,235], roof: [220,140,160], door: { x: 970, y: 1268, w: 60 } }
];

// NPCs
const confiturio = { x: 990, y: 1180, talked: false };
const king       = { x: 1040, y: 530, mood: "joyful" };

// ---- Scene system: "world" | "kitchen" | "throne" | "west" | "south" ----
let scene = "world";
const INTERIOR_LOGICAL_W = 800;
const INTERIOR_LOGICAL_H = 560;
const INTERIOR_W = INTERIOR_LOGICAL_W;
const INTERIOR_H = INTERIOR_LOGICAL_H;
const interiors = {
  kitchen: {
    title: "Cuisine Royale",
    floor: [245, 220, 195],
    door: { x: INTERIOR_W/2 - 30, y: INTERIOR_H - 40, w: 60 },
    npc: { id: "Confiturio", x: INTERIOR_W/2, y: INTERIOR_H/2 - 20 }
  },
  throne: {
    title: "Salle du Trône",
    floor: [255, 230, 240],
    door: { x: INTERIOR_W/2 - 30, y: INTERIOR_H - 40, w: 60 },
    npc: { id: "Roi", x: INTERIOR_W/2, y: 200 }
  }
};
const playerIn = { x: INTERIOR_W/2, y: INTERIOR_H - 60 };

/** Etire la scene dans la BANDE CENTRALE du CAVE (1920x1200). Les ecrans
 *  gauche et droit restent libres pour le decor ambiant. */
function fitSceneFill(sceneW, sceneH, viewW, viewH) {
  // Cible : SCREEN_W x PLANET_H, centre sur la bande centrale
  const vw = SCREEN_W;
  const vh = PLANET_H;
  const sx = vw / sceneW;
  const sy = vh / sceneH;
  const s = Math.min(sx, sy);
  const ox = CENTER_X0 + (vw - sceneW * s) / 2;
  const oy = (vh - sceneH * s) / 2;
  return { sx: s, sy: s, s, ox, oy, sceneW, sceneH };
}

function getInteriorSceneFit() {
  return fitSceneFill(INTERIOR_LOGICAL_W, INTERIOR_LOGICAL_H);
}

function interiorSceneToScreen(x, y) {
  const fit = getInteriorSceneFit();
  return { x: x * fit.sx, y: y * fit.sy };
}

// West area integrated from the separate "ouest" prototype
const WEST_SCENE_W = 960;
const WEST_SCENE_H = 640;
const westPlayer = {
  x: 120,
  y: 520,
  baseSpeed: 5.2,
  facing: 0,
  walkPhase: 0
};
const westGate = {
  xTrigger: 90,
  minY: BITTER_LINE_Y + 40,
  maxY: WORLD_H - 80
};
const westLandmarks = {
  chef: {
    x: 170,
    y: 320,
    threshold: 84,
    prompt: "[E] Parler au Chef Marshmallow"
  },
  distributor: {
    x: 790,
    y: 470,
    threshold: 82,
    prompt: "[E] Inspecter le distributeur"
  },
  oven: {
    x: 790,
    y: 320,
    threshold: 86,
    prompt: "[E] Regarder le four geant"
  },
  signpost: {
    x: 470,
    y: 540,
    threshold: 80,
    prompt: "[E] Retourner a Saccharia"
  }
};
let westReturnWorldY = 1180;

// South royal zone
const SOUTH_SCENE_W = 1400;
const SOUTH_SCENE_H = 800;
const southPlayer = {
  x: 180,
  y: 670,
  baseSpeed: 5.2,
  facing: 0,
  walkPhase: 0
};
const southGate = {
  minX: 1400,
  maxX: 1800,
  centerX: 1600,
  yTrigger: WORLD_H - player.radius - 4
};
const southLandmarks = {
  returnSign: {
    x: 150,
    y: 680,
    threshold: 88,
    prompt: "[E] Retourner a Saccharia"
  },
  castleDoor: {
    x: 700,
    y: 560,
    threshold: 92,
    prompt: "[E] Entrer dans le chateau"
  }
  // Le Roi est uniquement dans la Salle du Trone (interieur).
};
let southReturnWorldX = southGate.centerX;

const eastGate = {
  xTrigger: WORLD_W - 90,
  minY: BITTER_LINE_Y + 40,
  maxY: WORLD_H - 80
};
let eastReturnWorldX = WORLD_W - 150;

// Dialogue history log
let dialogueHistory = [];
let logOpen = false;

// Mixing mini-game (kitchen)
let mixingActive = false;
let mixProgress = 0;
const MIX_GOAL = 220;
let mixingDone = false;
let prevMotionPixels = null;
let lastMixActivity = 0;
let mixKeyCounter = 0;
let lastMixProgress = 0;

const baron = { x: 1600, y: 250, dir: 1 };

// Spaceship landmark
const ship = { x: 240, y: 1500 };

// Ingredients (positions raccourcies pour le monde 3200px)
const ingredients = [
  { id: "Fraise Stellaire",      x: 380,  y: 1180, color: [255,90,140],  collected: false },
  { id: "Citron de Lune",        x: 700,  y: 1380, color: [255,235,110], collected: false },
  { id: "Eclat de Truffe Noire", x: 1900, y: 1450, color: [140,80,160],  collected: false }
];

// Lollipop trees (procedurally generated once)
let lollipops = [];

// Decorative kingdom houses and NPCs (positions raccourcies pour monde 3200px)
const decorHouses = [
  { x: 380,  y: 1160, w: 180, h: 98, color:[255,235,220], roof:[220,140,160], door:{x:420,w:40} },
  { x: 660,  y: 1110, w: 130, h: 78, color:[255,245,215], roof:[210,120,150], door:{x:690,w:32} },
  { x: 1320, y: 1080, w: 210, h: 107, color:[255,220,210], roof:[230,160,100], door:{x:1390,w:50} },
  { x: 1700, y: 1230, w: 160, h: 88, color:[255,240,230], roof:[205,140,165], door:{x:1740,w:36} },
  { x: 2200, y: 1140, w: 180, h: 96, color:[255,225,205], roof:[220,150,170], door:{x:2245,w:42} },
  { x: 2700, y: 1190, w: 150, h: 82, color:[255,245,220], roof:[215,135,155], door:{x:2735,w:38} }
];

const decorNPCs = [
  { x: 400,  y: 1230, type: 'baker', color:[240,180,120] },
  { x: 660,  y: 1140, type: 'guard', color:[120,100,190] },
  { x: 1320, y: 1040, type: 'villager', color:[200,160,210] },
  { x: 1700, y: 1290, type: 'merchant', color:[250,170,90] },
  { x: 2200, y: 1200, type: 'baker', color:[240,190,130] },
  { x: 2700, y: 1250, type: 'guard', color:[130,110,200] }
];

// Bitter zone decorations
let twistedTrees = [];
let aniseCrystals = [];

// Trials state
let trials = [false, false, false];
let currentTrial = -1;
let trialState = {};
let heartCollected = false;

// Altar of Coeur de Reglisse
const altar = { x: 1600, y: 350 };

// Baron drain
let timeOnBitterZone = 0;
let baronDrainLevel = 0;

// Palettes
const PALETTES = {
  pastel: { sky:[255,210,235], grass:[210,240,200], path:[230,200,170], tint:[255,255,255], text:[70,30,90] },
  angry:  { sky:[120,25,35],   grass:[110,55,60],   path:[80,30,30],    tint:[230,160,170], text:[255,210,220] },
  baron:  { sky:[40,30,55],    grass:[50,50,55],    path:[40,40,40],    tint:[180,180,200], text:[230,230,240] }
};
let targetPaletteName = "pastel";
let _prevPaletteName = "pastel";
const currentPalette = JSON.parse(JSON.stringify(PALETTES.pastel));

// Effects
let shakeAmount = 0, shakeDuration = 0;
let particles = [];
let confettiActive = false;
let baronRain = [];

// Dialogue
let dialogueQueue = [];
let currentDialogue = null;
let dialogueStartFrame = 0;
let dialogueCharIndex = 0;

// Story flags
const flags = {
  livraisonStartShown: false,
  confituriArrivedShown: false,
  recolteStartShown: false,
  ingredientsDoneShown: false,
  degustationStartShown: false,
  kingTastedShown: false,
  confituriWhisperShown: false,
  baronEntryShown: false,
  baronAfterTrialsShown: false,
  finalVictoryShown: false,
  bushesUnlocked: false,          // Débloqué quand on parle au roi
  westIntroShown: false,
  eastIntroShown: false,
  victorySustainTimer: 0,
  ending: null,

  // ───── Menu Cosmique : 3 plats a apporter au Roi pour obtenir le Cristal ─────
  menuAnnounced: false,           // Le Roi a expose les 3 plats
  westCakeDelivered: false,       // Plat 1 : Entree sucree (Gateau de Marshmallow)
  eastSaltDelivered: false,       // Plat 2 : Sel d'Umami (Chef Sali)
  heartDelivered: false,          // Plat 3 : Coeur de Reglisse (Baron)
  crystalObtained: false          // Recompense finale
};

// Trois plats que le Roi attend pour rendre son cristal
const menu = {
  cake: {
    label: "Entree sucree : Le Grand Gateau",
    zone: "Ouest (Sweet Island)",
    color: [255, 180, 210]
  },
  salt: {
    label: "Plat principal : Sel d'Umami",
    zone: "Est (Cuisine de Sali)",
    color: [240, 220, 180]
  },
  heart: {
    label: "Dessert amer : Coeur de Reglisse",
    zone: "Nord (Zone du Baron)",
    color: [180, 80, 220]
  }
};

function menuPlatsLivres() {
  let n = 0;
  if (flags.westCakeDelivered) n++;
  if (flags.eastSaltDelivered) n++;
  if (flags.heartDelivered) n++;
  return n;
}
function menuComplet() {
  return flags.westCakeDelivered && flags.eastSaltDelivered && flags.heartDelivered;
}

const SPEAKER_COLORS = {
  "Zyx":              [80, 220, 230],
  "Confiturio":       [255, 165, 70],
  "Roi":              [240, 200, 80],
  "Roi Dulcis":       [240, 200, 80],
  "Baron":            [180, 180, 200],
  "Chef Marshmallow": [255, 180, 210],
  "Chef Sali":        [230, 140, 70],
  "Narrateur":        [180, 160, 220],
  "Pancarte":         [200, 170, 130],
  "Distributeur":     [180, 220, 255],
  "Four Geant":       [255, 130, 90],
  "Système":          [220, 200, 255],
  "Systeme":          [220, 200, 255]
};

// Vitesse typing uniformisee (frames par caractere). Plus c'est petit, plus c'est rapide.
const DIALOGUE_TYPING_SPEED = 1.5;

// Interaction prompt
let interactPrompt = null;


// ========== BUSH SYSTEM ==========
class Bush {
  constructor(baseX, baseY, side) {
    this.baseX = baseX;
    this.baseY = baseY;
    this.x = baseX;
    this.side = side;          // -1 left, +1 right
    this.r = random(50, 65);   // Larger radius for better visibility
    this.openAmount = 0;       // cumulative opening
    this.shakeSeed = random(1000);
  }

  update(amp) {
    if (amp > BLOW_THRESHOLD) {
      const speed = map(amp, BLOW_THRESHOLD, 1, 0.4, 4.5, true);
      this.openAmount = min(this.openAmount + speed, 260);
    }
    const targetX = this.baseX + this.side * this.openAmount;
    this.x = lerp(this.x, targetX, 0.18);
  }

  draw(amp) {
    const trembling = amp > BLOW_THRESHOLD ? map(amp, BLOW_THRESHOLD, 1, 1, 6, true) : 0;
    const sx = this.x + (noise(this.shakeSeed + frameCount * 0.3) - 0.5) * trembling;
    const sy = this.baseY + (noise(this.shakeSeed + 100 + frameCount * 0.3) - 0.5) * trembling;
    
    // Apply camera transform
    const screenX = sx - cam.x;
    const screenY = sy - cam.y;
    
    // Only draw if on screen
    if (screenX < -150 || screenX > VIEW_W + 150 || screenY < -150 || screenY > VIEW_H + 150) return;
    
    push(); 
    translate(screenX, screenY);
    
    // Shadow
    fill(0, 50);
    ellipse(0, this.r * 0.8, this.r * 2.5, this.r * 0.6);
    
    // Main whipped cream bush - fluffy layers
    fill(255, 252, 248);  // Slightly off-white for cream
    stroke(240, 245, 242);
    strokeWeight(1);
    
    // Large base sphere
    circle(0, 0, this.r * 2.3);
    
    // Top bulges (whipped cream peaks)
    circle(-this.r * 0.5, -this.r * 0.8, this.r * 1.4);
    circle(this.r * 0.5, -this.r * 0.8, this.r * 1.4);
    circle(-this.r * 0.8, -this.r * 0.2, this.r * 1.2);
    circle(this.r * 0.8, -this.r * 0.2, this.r * 1.2);
    circle(0, -this.r * 1.1, this.r * 1.3);
    
    // Subtle shading
    noStroke();
    fill(255, 255, 255, 30);
    circle(-this.r * 0.4, -this.r * 0.5, this.r * 1.6);
    
    // Highlights on top
    fill(255, 255, 255, 60);
    circle(-this.r * 0.2, -this.r * 1.2, this.r * 0.5);
    circle(this.r * 0.3, -this.r * 0.9, this.r * 0.4);
    
    noStroke();
    pop();
  }

  getBounds() {
    const size = this.r * 2.5;
    return { 
      left: this.x - size / 2, 
      right: this.x + size / 2,
      top: this.baseY - size / 2, 
      bottom: this.baseY + size / 2 
    };
  }
  
  isFullyOpen() {
    return this.openAmount >= 260;
  }
}

// ========== ANNONCES AUDIO DES MINI-JEUX ==========
// Lit les règles d'un mini-jeu à voix haute dès son démarrage.
// lines : [{ speaker, text }, ...] ou une simple string (Narrateur).
function speakGameRules(lines) {
  if (typeof GameSounds === "undefined") return;
  if (typeof lines === "string") lines = [{ speaker: "Narrateur", text: lines }];
  GameSounds.speakSequence(lines);
}

// Audio initialization function
function initAudioOnButton() {
  const startBtn = document.getElementById("startBtn");
  if (!startBtn) return;

  startBtn.addEventListener("click", async () => {
    try {
      await userStartAudio();
      if (typeof GameSounds !== "undefined") GameSounds.init();
      mic = new p5.AudioIn();
      mic.start(() => {
        fft = new p5.FFT(0.8, 1024);
        fft.setInput(mic);
        audioReady = true;
      });
      document.getElementById('startBtn').textContent = '✓ Audio activé';
      startBtn.disabled = true;
      startBtn.textContent = "Micro active";
    } catch (e) {
      console.warn("Audio init failed:", e);
    }
  });
}

// Function to detect blow vs voice (avec alternative clavier F)
function getAmplitude() {
  if (!flags.bushesUnlocked) return 0; // Only active after talking to king

  // ── Alternative clavier ── : maintenir F simule un souffle constant.
  // Permet de jouer sans micro / sans avoir clique sur "Activer le micro".
  if (keyIsDown(70)) return 0.45;

  if (!mic || !audioReady) return 0;
  const level = constrain(mic.getLevel() * 2.2, 0, 1);
  if (level < BLOW_THRESHOLD || !fft) return 0;

  fft.analyze();
  const lowE  = fft.getEnergy(80, 500);    // voice
  const highE = fft.getEnergy(1500, 8000); // blow
  const ratio = highE / (lowE + 1);

  if (voiceFilterEnabled && ratio < breathRatioThreshold) return 0; // reject voice
  return level;
}

// Check collision with bushes - circle collision for accurate blocking
function collidesWithBushes(nextX, nextY, w, h) {
  const playerRadius = w / 2;
  for (const b of bushes) {
    // Only collide if bush is not fully open
    if (!b.isFullyOpen()) {
      const openRatio = constrain(b.openAmount / 260, 0, 1);
      const bushRadius = lerp(b.r * 1.5, b.r * 0.45, openRatio);
      const dx = nextX - b.x;
      const dy = nextY - b.baseY;
      const d = Math.sqrt(dx * dx + dy * dy);
      
      // Circle collision detection (player circle vs bush circle)
      // More generous collision to ensure blocking
      if (d < playerRadius + bushRadius) {
        return true;
      }
    }
  }
  return false;
}

function getWestSceneFit() {
  const w = (typeof WEST_W !== "undefined") ? WEST_W : 1920;
  const h = (typeof WEST_H !== "undefined") ? WEST_H : 1200;
  return fitSceneFill(w, h);
}
function getWestScale()   { return getWestSceneFit().s; }
function getWestScaleX()  { return getWestScale(); }
function getWestScaleY()  { return getWestScale(); }
function getWestOffsetX() { return getWestSceneFit().ox; }
function getWestOffsetY() { return getWestSceneFit().oy; }

function isEastGateOpen() {
  return eastBushes.length > 0 && eastBushes.every(b => b.isFullyOpen());
}

function collidesWithEastBushes(nextX, nextY, w, h) {
  const playerRadius = w / 2;
  for (const b of eastBushes) {
    if (b.isFullyOpen()) continue;
    const bounds = b.getBounds();
    const cx = constrain(nextX, bounds.left, bounds.right);
    const cy = constrain(nextY, bounds.top, bounds.bottom);
    const dx = nextX - cx, dy = nextY - cy;
    if (dx * dx + dy * dy < playerRadius * playerRadius) return true;
  }
  return false;
}

function getNearbyWestLandmark() {
  for (const [key, landmark] of Object.entries(westLandmarks)) {
    if (dist(westPlayer.x, westPlayer.y, landmark.x, landmark.y) < landmark.threshold) {
      return key;
    }
  }
  return null;
}

function enterWestArea() {
  westReturnWorldY = constrain(player.y, westGate.minY, westGate.maxY);
  // Le rendu/gameplay ouest est gere par ouest.js (Sweet Island integre).
  if (typeof enterWestZone === "function") {
    westState.returnWorldY = westReturnWorldY;
    enterWestZone();
  } else {
    westPlayer.x = 110;
    westPlayer.y = 520;
    westPlayer.facing = 2;
    scene = "west";
  }

  if (!flags.westIntroShown) {
    pushDialogue("Confiturio", "Sweet Island ! Le Chef Marshmallow y prepare un GATEAU pour le Menu Cosmique du Roi. Va le voir et rapporte-lui le gateau !", 280);
    flags.westIntroShown = true;
  }
}

function leaveWestArea() {
  scene = "world";
  player.x = 116;
  player.y = westReturnWorldY;
}

function getSouthSceneFit() {
  return fitSceneFill(SOUTH_SCENE_W, SOUTH_SCENE_H);
}
function getSouthScale()   { return getSouthSceneFit().s; }
function getSouthOffsetX() { return getSouthSceneFit().ox; }
function getSouthOffsetY() { return getSouthSceneFit().oy; }
function getSouthScaleX()  { return getSouthSceneFit().sx; }
function getSouthScaleY()  { return getSouthSceneFit().sy; }


function enterSouthArea() {
  southReturnWorldX = constrain(player.x, southGate.minX, southGate.maxX);
  southPlayer.x = 180;
  southPlayer.y = 670;
  southPlayer.facing = 2;
  scene = "south";
}

function leaveSouthArea() {
  scene = "world";
  player.x = southReturnWorldX;
  player.y = WORLD_H - player.radius - 18;
}

function getNearbySouthLandmark() {
  for (const [key, landmark] of Object.entries(southLandmarks)) {
    if (dist(southPlayer.x, southPlayer.y, landmark.x, landmark.y) < landmark.threshold) {
      return key;
    }
  }
  return null;
}

// p5 preload : chargement bloquant des assets (images memes notamment)
function preload() {
  if (typeof preloadMemeImages === "function") preloadMemeImages();
}

// ---------- p5 setup ----------
function setup() {
  VIEW_W = PLANET_W;
  VIEW_H = PLANET_H;
  const cnv = createCanvas(VIEW_W, VIEW_H);
  cnv.parent("game-wrapper");
  textFont("Georgia");
  noSmooth();
  pixelDensity(1);

  // Generate lollipop trees
  randomSeed(42);
  const treeColors = [[230,80,90],[120,200,120],[100,160,230],[240,150,200],[250,220,90],[250,160,90]];
  for (const z of forestZones) {
    const count = Math.floor((z.w * z.h) / 16000);
    for (let i = 0; i < count; i++) {
      const tx = z.x + random(z.w);
      const ty = z.y + random(z.h);
      if (overlapsBuilding(tx, ty, 24)) continue;
      lollipops.push({ x: tx, y: ty, c: random(treeColors), s: random(0.85, 1.2) });
    }
  }

  // Twisted trees + crystals in bitter zone
  for (let i = 0; i < 70; i++) {
    twistedTrees.push({ x: random(WORLD_W), y: random(40, BITTER_LINE_Y - 20), s: random(0.8, 1.4) });
  }
  for (let i = 0; i < 44; i++) {
    aniseCrystals.push({ x: random(WORLD_W), y: random(60, BITTER_LINE_Y - 60) });
  }

  // Webcam + ml5
  try {
    video = createCapture(VIDEO, () => {
      const opts = { withLandmarks:false, withExpressions:true, withDescriptors:false, minConfidence:0.5 };
      try { faceapi = ml5.faceApi(video, opts, faceModelReady); }
      catch (e) { console.warn("ml5 init failed:", e); webcamFailed = true; }
    });
    video.size(160, 120);
    video.hide();
  } catch (e) {
    console.warn("Webcam unavailable:", e);
    webcamFailed = true;
  }

  // Microphone for trial 1
  (async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      micDataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      micReady = true;
    } catch (e) {
      console.warn("Mic unavailable:", e);
      micFailed = true;
    }
  })();

  // West gate only: the player must blow on these bushes to access the west side.
  bushes = [];
  for (let i = 0; i < 11; i++) {
    const baseY = BITTER_LINE_Y + 70 + i * 88;
    bushes.push(new Bush(82, baseY, -1));
  }

  eastBushes = [];
  for (let i = 0; i < 11; i++) {
    const baseY = BITTER_LINE_Y + 70 + i * 88;
    eastBushes.push(new Bush(WORLD_W - 82, baseY, 1));
  }

  initEastZone();
  // preloadMemeImages() est appele dans preload() (bloquant, plus fiable).
  if (typeof initWestZone === "function") initWestZone();

  // Initialize audio button
  initAudioOnButton();

  pushDialogue("Zyx", "Livraison standard. Atterrir, déposer, repartir.", 200);
  flags.livraisonStartShown = true;
}

// Redimensionne le canvas quand la fenetre change (vrai plein ecran via window).
function windowResized() {
  // Dimensions logiques fixes 5760x1200 ; le CSS adapte l'affichage a la fenetre.
}

function faceModelReady() { faceReady = true; if (faceapi) faceapi.detect(gotFaces); }
function gotFaces(err, result) {
  if (err) { console.warn(err); return; }
  detections = result || [];
  if (faceapi) faceapi.detect(gotFaces);
}

function overlapsBuilding(x, y, pad) {
  for (const b of buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return true;
  }
  return false;
}

// ---------- Input / Player ----------
function updatePlayer() {
  if (logOpen) return;

  let dx = 0, dy = 0;
  // ZQSD (FR) + WASD (QWERTY) + fleches
  if (keyIsDown(LEFT_ARROW)  || keyIsDown(81) || keyIsDown(65)) dx -= 1;  // Q ou A
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) dx += 1;                    // D
  if (keyIsDown(UP_ARROW)    || keyIsDown(90) || keyIsDown(87)) dy -= 1;  // Z ou W
  if (keyIsDown(DOWN_ARROW)  || keyIsDown(83)) dy += 1;                    // S
  const running = keyIsDown(SHIFT);
  const speedMult = running ? 2.2 : 1.0;   // SHIFT = sprint nettement plus rapide
  if (dx !== 0 && dy !== 0) { const inv = 1/Math.sqrt(2); dx *= inv; dy *= inv; }
  let s = player.baseSpeed * speedMult * (1 - baronDrainLevel * 0.6);
  if (emotionHappy > 0.8) s *= 1.3;
  player.speed = s;

  if (scene === "world") {
    let nx = player.x + dx * s;
    let ny = player.y + dy * s;
    nx = constrain(nx, player.radius, WORLD_W - player.radius);
    ny = constrain(ny, player.radius, WORLD_H - player.radius);

    const WALL_T = 8;
    for (const b of buildings) {
      const dxL = b.door.x, dxR = b.door.x + b.door.w;
      const walls = [
        { x: b.x, y: b.y, w: b.w, h: WALL_T },
        { x: b.x, y: b.y + b.h - WALL_T, w: dxL - b.x, h: WALL_T },
        { x: dxR, y: b.y + b.h - WALL_T, w: b.x + b.w - dxR, h: WALL_T },
        { x: b.x, y: b.y, w: WALL_T, h: b.h },
        { x: b.x + b.w - WALL_T, y: b.y, w: WALL_T, h: b.h }
      ];
      for (const w of walls) {
        const cx = constrain(nx, w.x, w.x + w.w);
        const cy = constrain(ny, w.y, w.y + w.h);
        const ddx = nx - cx, ddy = ny - cy;
        const d2 = ddx*ddx + ddy*ddy;
        const r = player.radius;
        if (d2 < r*r) {
          if (d2 === 0) {
            const dL = nx - w.x, dR = w.x + w.w - nx, dT = ny - w.y, dB = w.y + w.h - ny;
            const m = Math.min(dL, dR, dT, dB);
            if (m === dL) nx = w.x - r; else if (m === dR) nx = w.x + w.w + r;
            else if (m === dT) ny = w.y - r; else ny = w.y + w.h + r;
          } else {
            const d = Math.sqrt(d2), overlap = r - d;
            nx += (ddx/d) * overlap; ny += (ddy/d) * overlap;
          }
        }
      }
    }

    // Collision with bushes (only if not fully open)
    // Test multiple steps to prevent fast movement through bushes
    const steps = Math.max(1, Math.ceil(Math.hypot(nx - player.x, ny - player.y) / 5));
    let canMove = true;
    
    for (let step = 0; step <= steps; step++) {
      const stepNx = player.x + (nx - player.x) * (step / steps);
      const stepNy = player.y + (ny - player.y) * (step / steps);
      
      if (collidesWithBushes(stepNx, stepNy, player.radius * 2, player.radius * 2) ||
          collidesWithEastBushes(stepNx, stepNy, player.radius * 2, player.radius * 2)) {
        canMove = false;
        break;
      }
    }
    
    if (!canMove) {
      // Don't allow movement into bush
      nx = player.x;
      ny = player.y;
    }

    if (dx !== 0 || dy !== 0) {
      player.walkPhase += 0.2 * speedMult;
      if (Math.abs(dx) > Math.abs(dy)) player.facing = dx < 0 ? 1 : 2;
      else player.facing = dy < 0 ? 3 : 0;
    }
    player.x = nx; player.y = ny;
    if (player.y < BITTER_LINE_Y) timeOnBitterZone++;

    for (const b of buildings) {
      if (player.x > b.door.x && player.x < b.door.x + b.door.w &&
          player.y < b.y + b.h - 4 && player.y > b.y + b.h - 60) {
        scene = b.id;
        playerIn.x = interiors[b.id].door.x + interiors[b.id].door.w / 2;
        playerIn.y = interiors[b.id].door.y - 30;
        return;
      }
    }

    if (flags.bushesUnlocked &&
        player.x <= westGate.xTrigger &&
        player.y >= westGate.minY &&
        player.y <= westGate.maxY) {
      enterWestArea();
      return;
    }
    if (flags.bushesUnlocked && isEastGateOpen() &&
        player.x >= eastGate.xTrigger &&
        player.y >= eastGate.minY &&
        player.y <= eastGate.maxY) {
      enterEastZone();
      return;
    }
    if (player.y >= southGate.yTrigger &&
        player.x >= southGate.minX &&
        player.x <= southGate.maxX) {
      enterSouthArea();
      return;
    }
  } else if (scene === "west") {
    // La zone ouest gere son propre joueur dans ouest.js (updateWest()).
    // On ne fait rien ici pour eviter le double mouvement.
    if (typeof westState === "undefined" || !westState.active) {
      // Fallback ancien systeme uniquement si ouest.js absent
      const westSpeed = westPlayer.baseSpeed * speedMult;
      let nx = westPlayer.x + dx * westSpeed;
      let ny = westPlayer.y + dy * westSpeed;
      nx = constrain(nx, 40, WEST_SCENE_W - 40);
      ny = constrain(ny, 300, WEST_SCENE_H - 30);
      if (dx !== 0 || dy !== 0) {
        westPlayer.walkPhase += 0.2 * speedMult;
        if (Math.abs(dx) > Math.abs(dy)) westPlayer.facing = dx < 0 ? 1 : 2;
        else westPlayer.facing = dy < 0 ? 3 : 0;
      }
      westPlayer.x = nx;
      westPlayer.y = ny;
    }
  } else if (scene === "south") {
    const southSpeed = southPlayer.baseSpeed * speedMult;
    let nx = southPlayer.x + dx * southSpeed;
    let ny = southPlayer.y + dy * southSpeed;

    nx = constrain(nx, 50, SOUTH_SCENE_W - 50);
    ny = constrain(ny, 330, SOUTH_SCENE_H - 28);

    if (dx !== 0 || dy !== 0) {
      southPlayer.walkPhase += 0.2 * speedMult;
      if (Math.abs(dx) > Math.abs(dy)) southPlayer.facing = dx < 0 ? 1 : 2;
      else southPlayer.facing = dy < 0 ? 3 : 0;
    }

    southPlayer.x = nx;
    southPlayer.y = ny;
  } else {
    const it = interiors[scene];
    let nx = playerIn.x + dx * s, ny = playerIn.y + dy * s;
    nx = constrain(nx, 50, INTERIOR_W - 50);
    ny = constrain(ny, 70, INTERIOR_H - 30);

    if (dx !== 0 || dy !== 0) {
      player.walkPhase += 0.2 * speedMult;
      if (Math.abs(dx) > Math.abs(dy)) player.facing = dx < 0 ? 1 : 2;
      else player.facing = dy < 0 ? 3 : 0;
    }
    playerIn.x = nx; playerIn.y = ny;

    if (playerIn.x > it.door.x && playerIn.x < it.door.x + it.door.w &&
        playerIn.y > it.door.y + 6 && dy > 0) {
      if (scene === "kitchen") {
        const b = buildings.find(bb => bb.id === scene);
        player.x = b.door.x + b.door.w / 2;
        player.y = b.y + b.h + 18;
        scene = "world";
      } else if (scene === "throne") {
        southPlayer.x = southLandmarks.castleDoor.x;
        southPlayer.y = southLandmarks.castleDoor.y + 70;
        scene = "south";
      }
    }
  }
}

function keyPressed() {
  if (typeof GameSounds !== "undefined") GameSounds.init();
  // Debug shortcut ~ (tilde/backtick) — bypass all prerequisites, enter east zone
  if (key === "p" || key === "P") {
    flags.bushesUnlocked = true;
    audioReady = true;
    for (const b of bushes) b.openAmount = 260;
    for (const b of eastBushes) b.openAmount = 260;
    if (scene !== "east") enterEastZone();
    if (typeof eastState !== "undefined") {
      eastState.saliDialogue = null;
      eastState.saliQueue = [];
    }
    return;
  }
  if (key === "l" || key === "L") { logOpen = !logOpen; return; }
  if (logOpen) { logOpen = false; return; }
  if (scene === "east") {
    keyPressedEast();
    return;
  }
  if (scene === "west" && typeof keyPressedWest === "function" && westState && westState.active) {
    const consumed = keyPressedWest();
    if (consumed) return;
  }
  if (mixingActive) {
    mixKeyCounter++;
    mixProgress = Math.min(MIX_GOAL, mixProgress + 14);
    lastMixActivity = frameCount;
    return;
  }
  if (key === "e" || key === "E" || key === " ") {
    if (currentDialogue) finishCurrentDialogue();
    else tryInteract();
  }
}

// Souris : route vers la zone ouest si active (mini-jeux Memory + Cooking Mama)
function mousePressed() {
  if (scene === "west" && typeof mousePressedWest === "function" && westState && westState.active) {
    mousePressedWest();
  }
}
function mouseReleased() {
  if (scene === "west" && typeof mouseReleasedWest === "function" && westState && westState.active) {
    mouseReleasedWest();
  }
}

// Mixing mini-game update
function updateMixing() {
  if (!mixingActive) return;
  if (!webcamFailed && video && video.loadedmetadata !== false) {
    try {
      video.loadPixels();
      if (video.pixels && video.pixels.length > 0) {
        const px = video.pixels;
        if (prevMotionPixels && prevMotionPixels.length === px.length) {
          let diff = 0, count = 0;
          for (let i = 0; i < px.length; i += 800) {
            diff += Math.abs(px[i] - prevMotionPixels[i]);
            count++;
          }
          const avgDiff = diff / count;
          if (avgDiff > 8) {
            mixProgress = Math.min(MIX_GOAL, mixProgress + 4);
            lastMixActivity = frameCount;
          }
        }
        prevMotionPixels = new Uint8ClampedArray(px);
      }
    } catch (e) {}
  }
  if (frameCount - lastMixActivity > 45 && mixProgress < MIX_GOAL - 5) {
    mixProgress = Math.max(0, mixProgress - 0.2);
  }
  if (mixProgress >= MIX_GOAL) {
    mixingActive = false;
    mixingDone = true;
    flags.ingredientsDoneShown = true;
    spawnParticles(INTERIOR_W/2, INTERIOR_H/2 + 20, [255, 200, 220], 30);
    if (typeof GameSounds !== "undefined") {
      GameSounds.setActionLoop("mixSoup", false);
      GameSounds.play("win");
    }
    pushDialogue("Confiturio", "Magnifique ! Le Soufflé aux Étoiles est prêt. Direction le Trône !", 200);
  }
  lastMixProgress = mixProgress;
}

function drawMixingOverlay() {
  if (!mixingActive) return;
  // Voile sombre sur tout le canvas pour focaliser l'attention
  fill(0, 160);
  rect(0, 0, VIEW_W, VIEW_H);
  const cx = VIEW_W / 2, cy = VIEW_H / 2 + 60;

  // ── Plat & bol ──
  push();
  scale(2.4);
  translate(-cx / 2.4 + cx, -cy / 2.4 + cy);
  fill(190, 140, 90); ellipse(cx, cy + 50, 200, 50);
  fill(220, 170, 110); ellipse(cx, cy + 30, 220, 80);
  fill(255, 200, 220);
  ellipse(cx, cy + 30, 180, 60);
  fill(255, 130, 180);
  const a = frameCount * 0.2;
  for (let i = 0; i < 6; i++) {
    const ang = a + i * (TWO_PI / 6);
    ellipse(cx + Math.cos(ang) * 40, cy + 30 + Math.sin(ang) * 14, 24, 14);
  }
  // Fouet
  push();
  translate(cx + Math.cos(a) * 40, cy + 30 + Math.sin(a) * 14);
  rotate(a);
  fill(180, 180, 200); rect(-3, -50, 6, 50);
  fill(220, 220, 230);
  for (let i = 0; i < 5; i++) ellipse(0, -12 + i * 6, 18 - i * 2, 8);
  pop();
  pop();

  // ── Banner titre centre sur l'ecran central ──
  const titleY = 120;
  fill(0, 220); rect(CENTER_X0 + 80, titleY - 40, SCREEN_W - 160, 90, 12);
  stroke(255, 200, 120, 220); strokeWeight(3); noFill();
  rect(CENTER_X0 + 80, titleY - 40, SCREEN_W - 160, 90, 12); noStroke();
  fill(255, 230, 200);
  textFont("Georgia"); textStyle(BOLD); textAlign(CENTER, CENTER); textSize(44);
  text("Melange le Souffle aux Etoiles !", VIEW_W / 2, titleY - 6);
  textStyle(NORMAL); textSize(22);
  fill(220, 200, 255);
  text(webcamFailed ? "Martele ESPACE pour melanger !" : "Bouge devant la camera OU martele ESPACE pour melanger !", VIEW_W / 2, titleY + 28);

  // ── Barre de progression bas centre ──
  const bw = 800, bx = (VIEW_W - bw) / 2, by = VIEW_H - 120;
  fill(0, 200); rect(bx - 12, by - 16, bw + 24, 60, 10);
  stroke(255, 220, 120, 200); strokeWeight(2); noFill();
  rect(bx - 12, by - 16, bw + 24, 60, 10); noStroke();
  fill(60, 30, 80); rect(bx, by, bw, 26, 8);
  fill(255, 120, 180); rect(bx, by, bw * (mixProgress / MIX_GOAL), 26, 8);
  fill(255, 240, 220); textSize(20); textAlign(CENTER, CENTER); textStyle(BOLD);
  text(`${Math.min(100, Math.round((mixProgress / MIX_GOAL) * 100))}%`, VIEW_W / 2, by + 13);
  textStyle(NORMAL);
}

function tryInteract() {
  if (interactPrompt && typeof GameSounds !== "undefined") GameSounds.play("interact");
  if (scene === "south") {
    const nearbyLandmark = getNearbySouthLandmark();
    if (nearbyLandmark === "returnSign") {
      leaveSouthArea();
    } else if (nearbyLandmark === "castleDoor") {
      scene = "throne";
      playerIn.x = interiors.throne.door.x + interiors.throne.door.w / 2;
      playerIn.y = interiors.throne.door.y - 30;
    }
    return;
  }

  if (scene === "west") {
    // La zone ouest est entierement geree par ouest.js (Chef Marshmallow + Distributeur + Four).
    // Les interactions sont consommees dans keyPressedWest(); on ne fait rien ici.
    return;
  }

  if (scene === "kitchen") {
    const it = interiors.kitchen;
    if (dist(playerIn.x, playerIn.y, it.npc.x, it.npc.y) < 70) {
      if (gameState === "LIVRAISON" && !flags.confituriArrivedShown) {
        pushDialogue("Confiturio", "Mon dieu ! La Poudre de Sucre Cosmique ! Tu es mon sauveur ! J'ai besoin de toi pour une mission...", 240);
        flags.confituriArrivedShown = true;
      } else if (gameState === "RECOLTE" && ingredients.every(i => i.collected) && !mixingDone && !mixingActive) {
        mixingActive = true;
        mixProgress = 0;
        mixKeyCounter = 0;
        lastMixProgress = 0;
        if (typeof GameSounds !== "undefined") GameSounds.play("mixStart");
        speakGameRules([
          { speaker: "Narrateur", text: "Mélange le Soufflé aux Étoiles !" },
          { speaker: "Narrateur", text: "Bouge devant la caméra, ou martèle la touche ESPACE, pour remplir la barre de progression. Atteins cent pour cent pour terminer." }
        ]);
        pushDialogue("Confiturio", "Parfait ! Maintenant MÉLANGE le Soufflé aux Étoiles ! Bouge devant la caméra ou martèle ESPACE !", 220);
      }
    }
    return;
  }
  if (scene === "throne") {
    const it = interiors.throne;
    if (dist(playerIn.x, playerIn.y, it.npc.x, it.npc.y) < 90) {
      // Les livraisons de plats sont detectees automatiquement par updateStory().
      // On utilise cette interaction pour donner un rappel du menu si rien a livrer.
      if (flags.menuAnnounced && !flags.crystalObtained) {
        const plats = [];
        if (flags.westCakeDelivered) plats.push("✓ Gateau");
        else plats.push("• Gateau (Ouest)");
        if (flags.eastSaltDelivered) plats.push("✓ Umami");
        else plats.push("• Umami (Est)");
        if (flags.heartDelivered) plats.push("✓ Reglisse");
        else plats.push("• Reglisse (Nord)");
        pushDialogue("Roi", "Mon Menu Cosmique attend : " + plats.join("  ") + ".", 260);
      } else if (!flags.menuAnnounced && flags.confituriArrivedShown) {
        pushDialogue("Roi", "Apporte-moi d'abord le Souffle aux Etoiles de Confiturio. Apres, je parlerai du vrai menu.", 220);
      }
    }
    return;
  }
  for (const ing of ingredients) {
    if (!ing.collected && dist(player.x, player.y, ing.x, ing.y) < 36) {
      ing.collected = true;
      player.inventory.push(ing.id);
      spawnParticles(ing.x, ing.y, ing.color, 18);
      if (typeof GameSounds !== "undefined") GameSounds.play("pickup");
      score += 10;
      return;
    }
  }
  if (gameState === "SURVIE" && trials[0] && trials[1] && trials[2] && !heartCollected) {
    if (dist(player.x, player.y, altar.x, altar.y) < 50) {
      heartCollected = true;
      player.inventory.push("Cœur de Réglisse");
      spawnParticles(altar.x, altar.y, [180,80,220], 35);
      if (typeof GameSounds !== "undefined") GameSounds.play("pickup");
    }
  }
}

function updateInteractPrompt() {
  interactPrompt = null;
  if (scene === "south") {
    const nearbyLandmark = getNearbySouthLandmark();
    if (nearbyLandmark) {
      const landmark = southLandmarks[nearbyLandmark];
      interactPrompt = {
        x: landmark.x,
        y: landmark.y - 55,
        label: landmark.prompt,
        south: true
      };
    }
    return;
  }
  if (scene === "west") {
    // Les prompts d'interaction sont gerees par ouest.js (westDrawInteractionHint).
    return;
  }
  if (scene === "east") {
    if (!eastState.miniGame && dist(eastPlayer.x, eastPlayer.y, chefSali.x, chefSali.y) < chefSali.threshold) {
      interactPrompt = { x: chefSali.x, y: chefSali.y - 80, label: chefSali.prompt, east: true };
      return;
    }
    if (!eastState.miniGame && dist(eastPlayer.x, eastPlayer.y, EAST_W / 2, EAST_H - 30) < 46) {
      interactPrompt = { x: EAST_W / 2, y: EAST_H - 70, label: "[E] Sortir", east: true };
      return;
    }
    return;
  }
  if (scene === "kitchen") {
    const it = interiors.kitchen;
    if (dist(playerIn.x, playerIn.y, it.npc.x, it.npc.y) < 80) {
      interactPrompt = { x: it.npc.x, y: it.npc.y - 50, label: "[E] Parler à Confiturio", interior: true };
    }
    return;
  }
  if (scene === "throne") {
    const it = interiors.throne;
    if (dist(playerIn.x, playerIn.y, it.npc.x, it.npc.y) < 100) {
      interactPrompt = { x: it.npc.x, y: it.npc.y - 60, label: "[E] Parler au Roi Dulcis", interior: true };
    }
    return;
  }
  for (const ing of ingredients) {
    if (!ing.collected && dist(player.x, player.y, ing.x, ing.y) < 50) {
      interactPrompt = { x: ing.x, y: ing.y - 30, label: "[E] Ramasser " + ing.id }; return;
    }
  }
  if (player.y > WORLD_H - 120 && player.x >= southGate.minX - 120 && player.x <= southGate.maxX + 120) {
    interactPrompt = { x: southGate.centerX, y: WORLD_H - 70, label: "Vers le chateau royal du Sud" };
    return;
  }
  if (gameState === "SURVIE" && trials[0] && trials[1] && trials[2] && !heartCollected &&
      dist(player.x, player.y, altar.x, altar.y) < 60) {
    interactPrompt = { x: altar.x, y: altar.y - 50, label: "[E] Saisir le Cœur de Réglisse" };
  }
}

// ---------- Story ----------
// Fil conducteur unifie (Menu Cosmique) :
//   1. Zyx livre la Poudre de Sucre a Confiturio.
//   2. Confiturio demande les 3 ingredients de la foret (amuse-bouche : Souffle aux Etoiles).
//   3. Le Roi gouste, est ravi, puis annonce qu'il veut un MENU COMPLET en 3 plats.
//   4. Le joueur visite les 3 zones :
//        - Ouest : Chef Marshmallow → Le Grand Gateau (entree sucree)
//        - Est   : Chef Sali → Sel d'Umami (plat principal)
//        - Nord  : Baron → Coeur de Reglisse (dessert amer)
//   5. Chaque plat est apporte au Roi (scene throne). Quand les trois sont livres → cristal.
function updateStory() {
  // Etape 1 : Confiturio donne la mission d'amuse-bouche
  if (gameState === "LIVRAISON" && flags.confituriArrivedShown && !currentDialogue && dialogueQueue.length === 0 && !flags.recolteStartShown) {
    pushDialogue("Confiturio", "Il me faut trois ingredients dans la Foret. Une Fraise Stellaire, un Citron de Lune, un Eclat de Truffe Noire. Vite !", 240);
    flags.recolteStartShown = true;
    gameState = "RECOLTE";
  }
  if (gameState === "RECOLTE" && ingredients.every(i => i.collected) && !flags.ingredientsDoneShown && mixingDone) {
    flags.ingredientsDoneShown = true;
  }

  // Etape 2 : le Roi gouste l'amuse-bouche et reclame un MENU COMPLET en 3 plats
  if (flags.ingredientsDoneShown && !flags.degustationStartShown &&
      scene === "throne" && dist(playerIn.x, playerIn.y, interiors.throne.npc.x, interiors.throne.npc.y) < 140) {
    pushDialogue("Roi", "Ah ! Un visiteur ! Tu apportes le Souffle aux Etoiles ? EXCELLENT !", 200);
    pushDialogue("Roi", "Mmh... DELICIEUX ! Mais un Roi a faim ! Je veux un MENU COSMIQUE COMPLET en trois plats !", 240);
    pushDialogue("Roi", "Plat 1 : une ENTREE SUCREE — Sweet Island a l'ouest. Plat 2 : un PLAT D'UMAMI — la Cuisine de Sali a l'est. Plat 3 : un DESSERT AMER — le Coeur de Reglisse du Baron au nord.", 320);
    pushDialogue("Roi", "Apporte-moi ces trois plats et je libererai le CRISTAL SACRE qui scelle ma cuisine !", 240);
    flags.degustationStartShown = true;
    flags.menuAnnounced = true;
    flags.bushesUnlocked = true;  // Debloque les 2 portes (ouest et est)
    gameState = "MENU";
    king.mood = "ecstatic";
  }

  // Confiturio aiguille apres l'annonce du menu
  if (flags.menuAnnounced && !flags.confituriWhisperShown && !currentDialogue && dialogueQueue.length === 0) {
    pushDialogue("Confiturio", "Trois plats, trois zones, trois cuisiniers. Souffle (ou maintiens F) sur les NUAGES DE SUCRE pour ouvrir les portes ouest et est. Le nord du Baron, lui, ne s'ouvre qu'en passant par sa Zone d'Amertume.", 280);
    flags.confituriWhisperShown = true;
  }

  // Etape 3 : Livraison automatique des plats quand on parle au Roi dans la salle du trone
  if (flags.menuAnnounced && scene === "throne" &&
      dist(playerIn.x, playerIn.y, interiors.throne.npc.x, interiors.throne.npc.y) < 140 &&
      !currentDialogue && dialogueQueue.length === 0) {

    // Livraison du gateau (Ouest)
    if (typeof westState !== "undefined" && westState.cakeBaked && !westState.cakeDelivered && !flags.westCakeDelivered) {
      pushDialogue("Roi", "★ Le Grand Gateau de Marshmallow ! L'entree sucree est SUBLIME !", 260);
      flags.westCakeDelivered = true;
      westState.cakeDelivered = true;
      spawnParticles(interiors.throne.npc.x, interiors.throne.npc.y, menu.cake.color, 24);
      score += 50;
    }

    // Livraison du Sel d'Umami (Est)
    if (typeof eastState !== "undefined" && eastState.complete && !eastState.saltDelivered && !flags.eastSaltDelivered) {
      pushDialogue("Roi", "★ Le Sel d'Umami de Chef Sali ! Le plat principal est PUISSANT !", 260);
      flags.eastSaltDelivered = true;
      eastState.saltDelivered = true;
      spawnParticles(interiors.throne.npc.x, interiors.throne.npc.y, menu.salt.color, 24);
      score += 50;
    }

    // Livraison du Coeur de Reglisse (Baron)
    if (heartCollected && !flags.heartDelivered) {
      pushDialogue("Roi", "★ Le Coeur de Reglisse Pure ! Le dessert amer arrache enfin une larme a ce Roi !", 260);
      flags.heartDelivered = true;
      spawnParticles(interiors.throne.npc.x, interiors.throne.npc.y, menu.heart.color, 24);
      score += 50;
    }

    // Quand le menu est complet → CRISTAL
    if (menuComplet() && !flags.crystalObtained) {
      pushDialogue("Roi", "Les trois plats... reunis. Sucre, umami, amertume. La vie dans une bouchee !", 240);
      pushDialogue("Roi", "Je te nomme Chevalier de la Fourchette d'Or, et je te confie le CRISTAL SACRE de Saccharia.", 280);
      pushDialogue("Système", "★ CRISTAL OBTENU ★", 200);
      flags.crystalObtained = true;
      flags.finalVictoryShown = true;
      flags.ending = "victory";
      confettiActive = true;
      spawnConfetti();
      player.inventory.push("Cristal Sacre");
    }
  }

  // Acces au Nord (Baron) : reste declenche par passage de la ligne d'amertume
  if (flags.menuAnnounced && player.y < BITTER_LINE_Y && !flags.baronEntryShown) {
    pushDialogue("Baron", "Un livreur intergalactique. Comme c'est pittoresque. Prouve que tu merites le Coeur de Reglisse.", 240);
    flags.baronEntryShown = true;
    gameState = "SURVIE";
    king.mood = "angry";
    currentTrial = 0;
    initTrial(0);
  }
  if (heartCollected && !flags.baronAfterTrialsShown && !currentDialogue && dialogueQueue.length === 0) {
    pushDialogue("Baron", "Tu l'as merite. Le Coeur est a toi. Apporte-le au Roi : sans amertume, le sucre n'a aucun sens.", 240);
    flags.baronAfterTrialsShown = true;
  }
}

// ---------- Trials ----------
function initTrial(idx) {
  if (idx === 0) {
    trialState.barriers = [];
    for (let i = 0; i < 5; i++) {
      const wy = BITTER_LINE_Y - 80 - i * 110;
      const gapX = 1300 + (i % 2) * 200;
      trialState.barriers.push({ y: wy, gapX, gapW: 110, passed: false, touched: false });
    }
    trialState.passedCount = 0;
    speakGameRules([
      { speaker: "Baron", text: "Épreuve un : les Barrières d'Amertume." },
      { speaker: "Narrateur", text: "Avance vers le nord en passant uniquement par l'espace libre dans chaque barrière. Toucher un mur te ralentit." }
    ]);
  } else if (idx === 1) {
    trialState.smileTimer = 0;
    speakGameRules([
      { speaker: "Baron", text: "Épreuve deux : le Cri du Baron." },
      { speaker: "Narrateur", text: "Maintiens la touche F enfoncée, ou crie dans le microphone, pendant trois secondes pour remplir la jauge et passer l'épreuve." }
    ]);
  } else if (idx === 2) {
    trialState.guards = [];
    for (let i = 0; i < 3; i++) {
      trialState.guards.push({
        x: 1300 + i * 200, y: 280 + i * 50,
        vx: (1 + i * 0.4) * (i % 2 === 0 ? 1 : -1)
      });
    }
    speakGameRules([
      { speaker: "Baron", text: "Épreuve trois : l'Autel de Réglisse." },
      { speaker: "Narrateur", text: "Rejoins l'autel sans te faire toucher par les gardes en mouvement. Chaque contact réduit ta vitesse." }
    ]);
  }
}

function updateTrials() {
  if (gameState !== "SURVIE") return;
  if (currentTrial === 0 && !trials[0] && trialState.barriers) {
    for (const b of trialState.barriers) {
      if (Math.abs(player.y - b.y) < 8) {
        if (player.x < b.gapX || player.x > b.gapX + b.gapW) {
          if (!b.touched) {
            b.touched = true;
            baronDrainLevel = Math.min(1, baronDrainLevel + 0.1);
            triggerShake(4, 18);
            if (typeof GameSounds !== "undefined") GameSounds.play("hurt");
          }
        } else {
          if (!b.passed) { b.passed = true; trialState.passedCount++; }
        }
      }
    }
    if (trialState.passedCount >= trialState.barriers.length) {
      trials[0] = true; currentTrial = 1; initTrial(1);
      spawnParticles(player.x, player.y, [200,200,210], 22);
    }
  } else if (currentTrial === 1 && !trials[1]) {
    // Cri micro OU touche F maintenue (alternative clavier)
    if (micLevel > 0.08 || keyIsDown(70)) trialState.smileTimer++;
    else trialState.smileTimer = Math.max(0, trialState.smileTimer - 1);
    if (trialState.smileTimer >= 180) {
      trials[1] = true; currentTrial = 2; initTrial(2);
      spawnParticles(player.x, player.y, [255,200,220], 22);
    }
  } else if (currentTrial === 2 && !trials[2] && trialState.guards) {
    for (const g of trialState.guards) {
      g.x += g.vx;
      if (g.x < 1200 || g.x > 1900) g.vx *= -1;
      if (dist(player.x, player.y, g.x, g.y) < 28) {
        if (!g.hit) {
          g.hit = true;
          baronDrainLevel = Math.min(1, baronDrainLevel + 0.15);
          triggerShake(6, 25);
          if (typeof GameSounds !== "undefined") GameSounds.play("hurt");
          setTimeout(() => { g.hit = false; }, 800);
        }
      }
    }
    if (dist(player.x, player.y, altar.x, altar.y) < 80) {
      trials[2] = true;
    }
  }
}

// ---------- Baron drain ----------
function updateBaronDrain() {
  if (player.y < BITTER_LINE_Y) {
    baronDrainLevel = Math.min(1.0, timeOnBitterZone / 1800);
  } else {
    baronDrainLevel = Math.max(0, baronDrainLevel - 0.005);
  }
}

// ---------- Emotion ----------
function checkEmotion() {
  if (micReady && analyser) {
    analyser.getByteTimeDomainData(micDataArray);
    let sum = 0;
    for (let i = 0; i < micDataArray.length; i++) {
      const v = (micDataArray[i] - 128) / 128;
      sum += v * v;
    }
    micLevel = Math.sqrt(sum / micDataArray.length);
  }
  if (webcamFailed) {
    emotionHappy = lerp(emotionHappy, 0, 0.05);
    emotionDetected = "indispo";
    return;
  }
  if (detections && detections.length > 0 && detections[0].expressions) {
    const exp = detections[0].expressions;
    emotionHappy = exp.happy || 0;
    let best = "neutre", bestVal = 0;
    for (const k in exp) { if (exp[k] > bestVal) { bestVal = exp[k]; best = k; } }
    emotionDetected = best;
  }
  if (emotionHappy > 0.8) score += 1;
}

// ---------- Palette ----------
function updateTargetPalette() {
  if (gameState === "DEGUSTATION" && flags.kingTastedShown) targetPaletteName = "angry";
  else if (gameState === "SURVIE") targetPaletteName = "angry";
  else targetPaletteName = "pastel";

  if (targetPaletteName !== _prevPaletteName) {
    if (targetPaletteName === "angry") {
      king.mood = "angry";
      if (typeof GameSounds !== "undefined") GameSounds.play("kingAngry");
    } else if (king.mood === "angry") {
      king.mood = flags.menuAnnounced ? "ecstatic" : "joyful";
    }
    _prevPaletteName = targetPaletteName;
  }
}
function lerpPalette() {
  const t = PALETTES[targetPaletteName];
  for (const k in t) for (let i = 0; i < 3; i++) currentPalette[k][i] = lerp(currentPalette[k][i], t[k][i], 0.04);
}

// ---------- Effects ----------
function triggerShake(a, d) { shakeAmount = a; shakeDuration = d; }
function spawnParticles(x, y, c, n) {
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI), s = random(2, 5);
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1, color: c, size: random(3,7), life: 60, gravity: 0.18 });
  }
}
function spawnConfetti() {
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: cam.x + random(VIEW_W), y: cam.y + random(-100, 0),
      vx: random(-1,1), vy: random(1,3),
      color: [random(120,255), random(120,255), random(120,255)],
      size: random(4,8), life: 280, gravity: 0.04
    });
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0.18; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  noStroke();
  for (const p of particles) {
    fill(p.color[0], p.color[1], p.color[2], Math.min(255, p.life * 4));
    rect(p.x - cam.x, p.y - cam.y, p.size, p.size, 1);
  }
}
function drawBaronRain() {
  if (baronRain.length < 50) for (let i = 0; i < 2; i++)
    baronRain.push({ x: cam.x + random(VIEW_W), y: cam.y + random(-50,0), vy: random(1.5, 3) });
  noStroke();
  fill(170,170,190,150);
  for (let i = baronRain.length - 1; i >= 0; i--) {
    const r = baronRain[i];
    r.y += r.vy;
    rect(r.x - cam.x, r.y - cam.y, 2, 6);
    if (r.y > cam.y + VIEW_H + 10 || r.x < cam.x - 30 || r.x > cam.x + VIEW_W + 30) baronRain.splice(i, 1);
  }
}

// ---------- Dialogue ----------
function pushDialogue(speaker, text, duration) {
  dialogueQueue.push({ speaker, text, duration });
  dialogueHistory.push({ speaker, text });
  if (dialogueHistory.length > 50) dialogueHistory.shift();
}
function updateDialogue() {
  if (!currentDialogue && dialogueQueue.length > 0) {
    currentDialogue = dialogueQueue.shift();
    dialogueStartFrame = frameCount;
    dialogueCharIndex = 0;
    if (typeof GameSounds !== "undefined") {
      GameSounds.speakLine(currentDialogue.speaker, currentDialogue.text);
    }
  }
  if (currentDialogue) {
    const e = frameCount - dialogueStartFrame;
    dialogueCharIndex = Math.min(currentDialogue.text.length, Math.floor(e / DIALOGUE_TYPING_SPEED));
    if (e >= currentDialogue.duration) currentDialogue = null;
  }
}
function finishCurrentDialogue() {
  if (!currentDialogue) return;
  if (dialogueCharIndex < currentDialogue.text.length) {
    dialogueCharIndex = currentDialogue.text.length;
    dialogueStartFrame = frameCount - currentDialogue.duration + 60;
  } else {
    if (typeof GameSounds !== "undefined") GameSounds.cancelVoice();
    currentDialogue = null;
  }
}

// ---------- Main draw ----------
function draw() {
  updateTargetPalette();
  lerpPalette();
  checkEmotion();
  if (scene === "east") updateEast();
  else updatePlayer();
  
  // Get blow amplitude for bushes and east clouds
  const blowAmp = getAmplitude();
  for (const b of bushes) b.update(blowAmp);
  for (const b of eastBushes) b.update(blowAmp);
  
  if (scene === "world") {
    // Monde entier visible sur le canvas planetaire (pas de camera centree sur le joueur).
    cam.x = 0;
    cam.y = 0;
  }
  updateStory();
  updateBaronDrain();
  updateTrials();
  updateMixing();
  updateInteractPrompt();
  updateDialogue();
  updateParticles();

  if (typeof GameSounds !== "undefined") {
    GameSounds.updateScene({
      scene,
      gameState,
      targetPaletteName,
      mixingActive,
      mixRecent: mixingActive && frameCount - lastMixActivity < 12,
      mixIntensity: mixingActive ? min(1, mixProgress / MIX_GOAL) : 0,
      mixProgressDelta: mixingActive ? mixProgress - lastMixProgress : 0,
      westPhase: typeof westState !== "undefined" ? westState.phase : null,
      westCuisineStep: typeof westCuisine !== "undefined" ? westCuisine.step : null,
      westMixSpeed: typeof westCuisine !== "undefined" ? westCuisine.mix.speed : 0,
      westBakeDone: typeof westCuisine !== "undefined" ? westCuisine.bake.done : true,
      westBakeTemp: typeof westCuisine !== "undefined" ? westCuisine.bake.temperature : 0,
      westPourTilt: typeof westCuisine !== "undefined" ? westCuisine.pour.tilt : 0,
      blowAmp: getAmplitude(),
    });
  }

  push();
  if (shakeDuration > 0) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeDuration--;
    if (shakeDuration <= 0) shakeAmount = 0;
  }

  if (scene === "world") {
    // Fond complet du canvas (bandes laterales = panoramas zone ouest/est)
    drawWorldSidePanoramas(blowAmp);

    // Bande centrale : la map principale (Saccharia)
    push();
    translate(WORLD_CENTER_OFFSET_X, 0);
    // Clip pour ne pas deborder hors de la bande centrale
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(0, 0, SCREEN_W, PLANET_H);
    drawingContext.clip();
    scale(WORLD_TO_PLANET_SX, WORLD_TO_PLANET_SY);
    drawGround();
    drawBitterDecor();
    drawCandyDecor();
    drawDecorHouses();
    drawDecorNPCs();
    drawRoyalDecor();
    drawBuildings();
    drawIngredients();
    drawNPCs();
    drawAltar();
    drawTrialVisuals();
    for (const b of eastBushes) b.draw(blowAmp);
    // Draw bushes blocking zones
    for (const b of bushes) b.draw(blowAmp);

    drawZonePortals();
    drawPlayer();
    drawObjectiveArrow(getCurrentObjective());
    drawParticles();
    if (baronDrainLevel > 0.7) drawBaronRain();
    if (baronDrainLevel > 0) {
      noStroke(); fill(40, 40, 50, baronDrainLevel * 180);
      rect(0, 0, WORLD_W, WORLD_H);
    }
    drawingContext.restore();
    pop();

    // Cadres et indications CAVE par-dessus
    drawCaveScreenSeparators();
    if (targetPaletteName === "angry") drawAngryVignette();
  } else if (scene === "west") {
    drawWestScene();
  } else if (scene === "south") {
    drawSouthScene();
  } else if (scene === "east") {
    drawEastScene();
  } else {
    drawInterior(scene);
  }

  drawInteractPrompt();
  drawBushHint();
  drawHUD();
  drawWebcamPreview();
  drawTrialIntroBanner();
  drawDialogueBox();
  drawTrialOverlays();
  drawMixingOverlay();
  drawEndingBanner();
  if (logOpen) drawDialogueLog();
  pop();
}

// ---------- Interior scenes ----------
function drawInterior(name) {
  const it = interiors[name];
  // Decor lateral CAVE pour les salles interieures (cuisine, trone)
  drawSideDecorForInterior(name);
  const floor = it.floor;
  // Fond de la bande centrale uniquement
  noStroke();
  fill(floor[0], floor[1], floor[2]);
  rect(CENTER_X0, 0, SCREEN_W, PLANET_H);

  const fit = getInteriorSceneFit();
  push();
  translate(fit.ox, fit.oy);
  scale(fit.sx, fit.sy);

  noStroke();
  fill(it.floor[0], it.floor[1], it.floor[2]);
  rect(40, 60, INTERIOR_W - 80, INTERIOR_H - 80, 8);

  if (name === "kitchen") {
    stroke(210, 180, 150); strokeWeight(1);
    for (let yy = 60; yy < INTERIOR_H - 20; yy += 36) line(40, yy, INTERIOR_W - 40, yy);
    for (let xx = 40; xx < INTERIOR_W - 40; xx += 48) line(xx, 60, xx, INTERIOR_H - 20);
    noStroke();
    for (let i = 0; i < (INTERIOR_W - 80) / 16; i++) {
      fill(i % 2 === 0 ? color(255, 200, 220) : color(255, 230, 240));
      rect(40 + i * 16, 60, 16, 24);
    }
    fill(140, 80, 50);
    rect(110, 90, 110, 90, 6); rect(INTERIOR_W - 220, 90, 110, 90, 6);
    fill(80, 40, 25);
    rect(124, 110, 82, 60, 4); rect(INTERIOR_W - 206, 110, 82, 60, 4);
    if (frameCount % 80 < 40) {
      fill(255, 200, 90);
      ellipse(165, 140, 50, 36); ellipse(INTERIOR_W - 165, 140, 50, 36);
    }
    fill(220, 180, 120);
    ellipse(140, 100, 4, 4); ellipse(190, 100, 4, 4);
    ellipse(INTERIOR_W - 190, 100, 4, 4); ellipse(INTERIOR_W - 140, 100, 4, 4);
    for (let s = 0; s < 5; s++) {
      const sy = 90 - ((frameCount * 0.8 + s * 26) % 80);
      fill(220, 220, 240, 130);
      ellipse(165 + Math.sin(frameCount * 0.05 + s) * 6, sy, 14, 18);
      ellipse(INTERIOR_W - 165 + Math.sin(frameCount * 0.05 + s + 1) * 6, sy, 14, 18);
    }
    fill(220, 230, 240); rect(50, 100, 50, 110, 4);
    fill(180, 200, 220); rect(50, 158, 50, 4);
    fill(120, 80, 60); ellipse(94, 130, 4, 16); ellipse(94, 184, 4, 16);
    fill(190, 200, 210); rect(INTERIOR_W - 100, 100, 50, 60, 4);
    fill(120, 140, 160); rect(INTERIOR_W - 92, 110, 34, 40, 3);
    fill(220, 220, 230); rect(INTERIOR_W - 78, 90, 4, 24);
    if (frameCount % 60 < 30) { fill(120, 200, 230, 200); rect(INTERIOR_W - 78, 110, 4, 30); }
    fill(150, 100, 70); rect(40, 220, 60, 6);
    for (let i = 0; i < 3; i++) {
      const jx = 50 + i * 16, jy = 210;
      const jc = [[255,180,180],[255,230,160],[180,160,255]][i];
      fill(jc[0], jc[1], jc[2]); rect(jx, jy, 12, 12, 2);
      fill(120, 80, 60); rect(jx + 1, jy - 2, 10, 3);
    }
    for (let i = 0; i < 5; i++) {
      const ux = INTERIOR_W/2 - 60 + i * 30;
      stroke(120, 120, 130); strokeWeight(1);
      line(ux, 60, ux, 80); noStroke();
      fill(180, 180, 190);
      if (i % 3 === 0) ellipse(ux, 88, 14, 8);
      else if (i % 3 === 1) { rect(ux - 2, 80, 4, 16); ellipse(ux, 96, 12, 6); }
      else { rect(ux - 5, 78, 10, 10, 1); }
    }
    fill(180, 60, 60); rect(180, 300, 28, 22, 2);
    fill(255, 240, 220); rect(184, 304, 20, 14);
    stroke(180, 60, 60); strokeWeight(1);
    line(184, 308, 204, 308); line(184, 312, 204, 312); noStroke();
    fill(255, 240, 200); rect(INTERIOR_W - 220, 300, 24, 24, 3);
    fill(180, 60, 60); rect(INTERIOR_W - 220, 300, 24, 4);
    stroke(150, 130, 90); strokeWeight(1);
    line(INTERIOR_W - 80, 60, INTERIOR_W - 80, 100); noStroke();
    for (let i = 0; i < 3; i++) { fill(255, 240, 220); ellipse(INTERIOR_W - 80, 80 + i * 8, 8, 10); }
    fill(180, 130, 80);
    rect(INTERIOR_W/2 - 90, INTERIOR_H/2 + 40, 180, 50, 6);
    fill(140, 90, 50);
    rect(INTERIOR_W/2 - 90, INTERIOR_H/2 + 40, 180, 6);
    fill(255, 220, 230); rect(INTERIOR_W/2 - 30, INTERIOR_H/2 + 14, 60, 28, 3);
    fill(255, 180, 210); rect(INTERIOR_W/2 - 24, INTERIOR_H/2 + 4, 48, 14, 3);
    fill(255, 90, 140); ellipse(INTERIOR_W/2, INTERIOR_H/2, 14, 8);
    fill(255, 240, 200); rect(INTERIOR_W/2 - 1, INTERIOR_H/2 - 8, 2, 6);
    fill(255, 180, 60); ellipse(INTERIOR_W/2, INTERIOR_H/2 - 12, 4, 6);
    fill(40, 40, 50); ellipse(INTERIOR_W/2 + 70, INTERIOR_H/2 + 40, 32, 14);
    fill(60, 60, 70); rect(INTERIOR_W/2 + 54, INTERIOR_H/2 + 24, 32, 18, 3);
    if (frameCount % 80 < 40) {
      fill(220, 220, 240, 150);
      ellipse(INTERIOR_W/2 + 70, INTERIOR_H/2 + 18 - Math.sin(frameCount * 0.1) * 4, 14, 8);
    }
    fill(180, 130, 80); ellipse(INTERIOR_W/2 - 70, INTERIOR_H/2 + 40, 26, 10);
    fill(255, 90, 100); ellipse(INTERIOR_W/2 - 76, INTERIOR_H/2 + 34, 8, 8);
    fill(255, 200, 90); ellipse(INTERIOR_W/2 - 64, INTERIOR_H/2 + 32, 8, 8);
    fill(140, 200, 120); ellipse(INTERIOR_W/2 - 70, INTERIOR_H/2 + 30, 8, 8);
    fill(180, 130, 70); rect(INTERIOR_W - 80, 230, 40, 50, 3);
    fill(255, 230, 240); rect(INTERIOR_W - 76, 234, 32, 42);
    fill(255, 220, 200); ellipse(INTERIOR_W - 60, 246, 12, 12);
    fill(255); ellipse(INTERIOR_W - 60, 240, 14, 8);
    fill(220, 170, 200, 120);
    rect(INTERIOR_W/2 - 110, INTERIOR_H - 130, 220, 60, 8);
    drawNpcConfiturio(it.npc.x, it.npc.y);

  } else {
    // Throne room
    for (let yy = 0; yy < (INTERIOR_H - 80) / 30; yy++) {
      for (let xx = 0; xx < (INTERIOR_W - 80) / 30; xx++) {
        fill((xx + yy) % 2 === 0 ? color(255, 200, 220) : color(255, 245, 240));
        rect(40 + xx * 30, 60 + yy * 30, 30, 30);
      }
    }
    for (let i = 0; i < 4; i++) {
      const tx = 80 + i * (INTERIOR_W - 200) / 3;
      fill(180, 60, 90); rect(tx - 16, 60, 32, 90);
      fill(240, 200, 100); rect(tx - 14, 62, 28, 6);
      fill(255, 230, 100);
      triangle(tx - 8, 100, tx, 90, tx + 8, 100);
      rect(tx - 8, 100, 16, 4);
      fill(220, 180, 80);
      ellipse(tx - 10, 152, 4, 6); ellipse(tx, 152, 4, 6); ellipse(tx + 10, 152, 4, 6);
    }
    for (let i = 0; i < 2; i++) {
      const cx = 100 + i * (INTERIOR_W - 200);
      fill(255, 220, 200); rect(cx - 12, 80, 24, INTERIOR_H - 140);
      fill(220, 180, 160); rect(cx - 16, 76, 32, 8); rect(cx - 16, INTERIOR_H - 70, 32, 8);
      stroke(200, 160, 140); strokeWeight(1);
      for (let yy = 90; yy < INTERIOR_H - 80; yy += 16) line(cx - 6, yy, cx + 6, yy);
      noStroke();
      fill(220, 180, 80); rect(cx - 4, INTERIOR_H - 80, 8, 12);
      fill(80, 40, 20); rect(cx - 10, INTERIOR_H - 92, 20, 4);
      for (let c = 0; c < 3; c++) {
        const cdx = cx - 8 + c * 8;
        fill(220, 180, 80); rect(cdx - 1, INTERIOR_H - 100, 2, 8);
        fill(255, 220, 130); ellipse(cdx, INTERIOR_H - 102, 4, 8);
        fill(255, 180, 60); ellipse(cdx, INTERIOR_H - 104 - Math.sin(frameCount * 0.2 + c) * 1, 3, 6);
      }
    }
    fill(220, 60, 90); rect(INTERIOR_W/2 - 40, 200, 80, INTERIOR_H - 240);
    fill(240, 200, 100, 200);
    for (let yy = 220; yy < INTERIOR_H - 60; yy += 40) {
      ellipse(INTERIOR_W/2, yy, 12, 6);
      rect(INTERIOR_W/2 - 30, yy - 1, 60, 2);
    }
    fill(180, 140, 60); rect(INTERIOR_W/2 - 100, 220, 200, 20, 4);
    fill(200, 160, 70); rect(INTERIOR_W/2 - 90, 200, 180, 20, 4);
    fill(220, 180, 80); rect(INTERIOR_W/2 - 80, 140, 160, 90, 8);
    fill(240, 200, 100); rect(INTERIOR_W/2 - 70, 130, 140, 16, 4);
    fill(220, 180, 80); rect(INTERIOR_W/2 - 95, 160, 18, 70, 4); rect(INTERIOR_W/2 + 77, 160, 18, 70, 4);
    for (let i = 0; i < 2; i++) {
      const gx = INTERIOR_W/2 - 130 + i * 260;
      fill(80, 80, 100); rect(gx - 10, 170, 20, 40, 3);
      fill(255, 220, 200); ellipse(gx, 160, 18, 18);
      fill(140, 100, 60); rect(gx - 10, 142, 20, 8);
      fill(180, 180, 200); rect(gx - 1, 130, 2, 70);
      fill(220, 180, 80); triangle(gx - 5, 130, gx + 5, 130, gx, 122);
    }
    fill(120, 80, 40); rect(INTERIOR_W - 140, 320, 50, 30, 3);
    fill(80, 50, 25); rect(INTERIOR_W - 140, 314, 50, 8, 2);
    fill(220, 180, 80); ellipse(INTERIOR_W - 115, 332, 6, 6);
    fill(240, 200, 100); ellipse(INTERIOR_W - 130, 340, 6, 4); ellipse(INTERIOR_W - 100, 342, 6, 4);
    fill(255, 230, 130); ellipse(INTERIOR_W - 115, 340, 4, 3);
    fill(180, 60, 90); ellipse(140, 340, 30, 14);
    fill(160, 50, 80); ellipse(140, 332, 28, 12);
    fill(220, 180, 80); ellipse(140, 326, 6, 4);
    fill(180, 60, 90); rect(INTERIOR_W/2 - 4, 60, 8, 30);
    fill(220, 60, 90); rect(INTERIOR_W/2 - 30, 80, 60, 50);
    fill(240, 200, 100);
    triangle(INTERIOR_W/2 - 30, 130, INTERIOR_W/2, 142, INTERIOR_W/2 + 30, 130);
    fill(240, 200, 100);
    triangle(INTERIOR_W/2 - 14, 110, INTERIOR_W/2 - 8, 100, INTERIOR_W/2 - 2, 110);
    triangle(INTERIOR_W/2 - 4, 110, INTERIOR_W/2, 96, INTERIOR_W/2 + 4, 110);
    triangle(INTERIOR_W/2 + 2, 110, INTERIOR_W/2 + 8, 100, INTERIOR_W/2 + 14, 110);
    rect(INTERIOR_W/2 - 14, 110, 28, 4);
    fill(255, 240, 180, 220); ellipse(INTERIOR_W/2, 78, 100, 20);
    fill(220, 180, 80); rect(INTERIOR_W/2 - 4, 60, 8, 14);
    for (let i = 0; i < 6; i++) {
      const cx = INTERIOR_W/2 - 50 + i * 20;
      fill(255, 220, 140, 230); ellipse(cx, 86, 8, 8);
      fill(255, 180, 60); ellipse(cx, 82 - Math.sin(frameCount * 0.2 + i) * 1, 4, 6);
    }
    for (let i = 0; i < 2; i++) {
      const wx = i === 0 ? 50 : INTERIOR_W - 50;
      fill(180, 140, 60); rect(wx - 4, 240, 8, 14);
      fill(255, 200, 90, 220); ellipse(wx, 240 - Math.sin(frameCount * 0.2 + i) * 2, 16, 14);
      fill(255, 240, 180, 80); ellipse(wx, 240, 30, 24);
    }
    drawNpcKing(it.npc.x, it.npc.y);
  }

  // South door
  const d = it.door;
  fill(80, 45, 35); rect(d.x, d.y, d.w, 30, 4);
  fill(180, 60, 60); rect(d.x + 4, d.y + 24, d.w - 8, 6, 2);
  fill(255, 240, 180);
  textFont("monospace"); textSize(10); textAlign(CENTER, CENTER); textStyle(BOLD);
  text("▼ SORTIE ▼", d.x + d.w/2, d.y + 14);
  textStyle(NORMAL);

  // Title banner
  fill(0, 200); rect(INTERIOR_W/2 - 100, 16, 200, 26, 6);
  fill(255, 220, 180);
  textFont("Georgia"); textStyle(BOLD); textSize(15); textAlign(CENTER, CENTER);
  text(it.title, INTERIOR_W/2, 30);
  textStyle(NORMAL);

  drawPlayerInterior();
  drawParticles();
  pop();
}

function drawPlayerInterior() {
  drawHeroSprite(playerIn.x, playerIn.y, player.facing, player.walkPhase);
}

// Trial intro banner
let trialBannerStart = 0;
let trialBannerIdx = -1;
function drawTrialIntroBanner() {
  if (currentTrial !== trialBannerIdx && currentTrial >= 0 && !trials[currentTrial]) {
    trialBannerIdx = currentTrial;
    trialBannerStart = frameCount;
  }
  if (trialBannerIdx < 0 || trials[trialBannerIdx]) return;
  const elapsed = frameCount - trialBannerStart;
  if (elapsed > 360) return;
  const alpha = elapsed < 30 ? elapsed / 30 : (elapsed > 330 ? (360 - elapsed) / 30 : 1);
  const titles = [
    "Épreuve 1 : Le Labyrinthe d'Anis",
    "Épreuve 2 : Le Miroir de l'Amertume",
    "Épreuve 3 : La Garde Noire"
  ];
  const hints = [
    "Traverse les 5 barrières grises en passant uniquement par les ouvertures. Évite de toucher les murs !",
    "Les ténèbres s'épaississent. CRIE ou fais du bruit dans le micro pendant 3 secondes pour résister à l'amertume !",
    "Trois gardes patrouillent. Esquive-les et atteins l'autel violet au nord-est pour saisir le Cœur."
  ];
  // Banner centre sur l'ecran central CAVE
  const bw = SCREEN_W - 80;
  const bx = CENTER_X0 + 40;
  fill(0, 230 * alpha); rect(bx, 220, bw, 160, 12);
  noFill(); stroke(180, 80, 220, 240 * alpha); strokeWeight(3);
  rect(bx, 220, bw, 160, 12); noStroke();
  fill(255, 200, 240, 255 * alpha);
  textFont("Georgia"); textStyle(BOLD); textSize(34); textAlign(CENTER, CENTER);
  text(titles[trialBannerIdx], VIEW_W/2, 260);
  fill(240, 220, 255, 255 * alpha);
  textStyle(NORMAL); textSize(20);
  text(hints[trialBannerIdx], VIEW_W/2, 320, SCREEN_W - 160, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// PANORAMA CAVE — bandes laterales (zones ouest et est visibles depuis Saccharia)
// ─────────────────────────────────────────────────────────────────────────────

/** Dessine les panoramas qui occupent les ecrans gauche et droite quand on est
 *  sur la map principale (scene world). Quand les nuages-frontieres sont
 *  ouverts, on voit la zone clairement ; sinon, elle est tamisee/embrumee. */
function drawWorldSidePanoramas(blowAmp) {
  // Fond global sombre derriere tout (au cas ou)
  noStroke();
  fill(10, 5, 20);
  rect(0, 0, PLANET_W, PLANET_H);

  // ECRAN GAUCHE = zone ouest (Sweet Island)
  drawPanoramaWest(0, 0, SCREEN_W, PLANET_H, flags.bushesUnlocked, flags.westCakeDelivered);

  // ECRAN DROITE = zone est (Cuisine salee)
  drawPanoramaEast(CENTER_X1, 0, SCREEN_W, PLANET_H, flags.bushesUnlocked, flags.eastSaltDelivered);
}

/** Panorama : Sweet Island vue depuis Saccharia (zone Ouest). */
function drawPanoramaWest(ox, oy, w, h, unlocked, done) {
  push();
  translate(ox, oy);
  // Ciel rose-lavande
  for (let y = 0; y < h * 0.55; y += 4) {
    const t = y / (h * 0.55);
    fill(lerp(255, 240, t), lerp(200, 180, t), lerp(230, 240, t));
    rect(0, y, w, 4);
  }
  // Soleil pastel
  fill(255, 230, 150, 220);
  ellipse(w * 0.7, h * 0.18, 110, 110);
  fill(255, 245, 200, 130);
  ellipse(w * 0.7, h * 0.18, 170, 170);
  // Nuages cotonneux
  noStroke();
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 360 + frameCount * 0.15) % (w + 200)) - 100;
    const cy = 110 + (i % 2) * 50;
    fill(255, 255, 255, 230);
    ellipse(cx,      cy,    140, 50);
    ellipse(cx + 50, cy - 14, 100, 44);
    ellipse(cx - 50, cy + 8,  100, 38);
  }
  // Montagnes en bonbons (silhouettes)
  fill(180, 120, 170);
  for (let i = 0; i < 7; i++) {
    triangle(i * 280 + 30, h * 0.58, i * 280 + 170, h * 0.32, i * 280 + 310, h * 0.58);
  }
  fill(255, 245, 255);
  for (let i = 0; i < 7; i++) {
    triangle(i * 280 + 140, h * 0.36, i * 280 + 170, h * 0.32, i * 280 + 200, h * 0.36);
  }
  // Sol carrele rose
  for (let y = h * 0.56; y < h; y += 32) {
    for (let x = 0; x < w; x += 32) {
      const c = ((x / 32 + y / 32) % 2 === 0) ? [255, 215, 230] : [255, 195, 215];
      fill(c[0], c[1], c[2]);
      rect(x, y, 32, 32);
    }
  }
  // Bâtiments gateau a l'horizon
  drawMiniCakeHouse(w * 0.15, h * 0.62, "strawberry");
  drawMiniCakeHouse(w * 0.42, h * 0.66, "vanilla");
  drawMiniCakeHouse(w * 0.72, h * 0.64, "chocolate");
  // Chef Marshmallow silhouette
  drawMiniChef(w * 0.3, h * 0.78);
  // Riviere de chocolat
  fill(90, 42, 22);
  rect(0, h * 0.86, w, 36);
  for (let i = 0; i < 30; i++) {
    fill(140, 70, 40);
    rect((i * 60 + frameCount * 0.6) % w, h * 0.88 + (i % 2) * 14, 18, 4);
  }

  // Halo + label de la zone
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.06);
  fill(255, 180, 210, unlocked ? (80 + pulse * 60) : 30);
  ellipse(w / 2, h * 0.5, w * 0.9, h * 0.7);

  // Tag de la zone
  fill(0, 200);
  rect(w / 2 - 200, 20, 400, 56, 10);
  stroke(255, 180, 210, 200); strokeWeight(2); noFill();
  rect(w / 2 - 200, 20, 400, 56, 10);
  noStroke();
  fill(255, 200, 230);
  textFont("Georgia"); textStyle(BOLD); textSize(28); textAlign(CENTER, CENTER);
  text("🍰  OUEST — SWEET ISLAND", w / 2, 48);
  textStyle(NORMAL);

  // Statut (verrou / debloque / livre)
  fill(0, 180); rect(w / 2 - 140, 86, 280, 28, 8);
  textFont("monospace"); textSize(14); textAlign(CENTER, CENTER);
  if (done) { fill(120, 220, 140); text("✓ Plat livre au Roi", w / 2, 100); }
  else if (unlocked) { fill(255, 220, 120); text("Acces autorise → souffle sur les nuages", w / 2, 100); }
  else { fill(220, 100, 100); text("🔒 Verrouille — parle au Roi d'abord", w / 2, 100); }

  // Si les nuages ne sont pas encore traverses → voile tamise
  if (!unlocked) {
    fill(40, 20, 50, 130);
    rect(0, 0, w, h);
  }

  pop();
}

/** Panorama : Cuisine de Sali vue depuis Saccharia (zone Est). */
function drawPanoramaEast(ox, oy, w, h, unlocked, done) {
  push();
  translate(ox, oy);
  // Ciel coucher de soleil
  for (let y = 0; y < h * 0.55; y += 4) {
    const t = y / (h * 0.55);
    fill(lerp(225, 250, t), lerp(160, 232, t), lerp(140, 205, t));
    rect(0, y, w, 4);
  }
  // Soleil bas
  fill(255, 200, 130, 230);
  ellipse(w * 0.3, h * 0.46, 130, 130);
  fill(255, 230, 170, 140);
  ellipse(w * 0.3, h * 0.46, 200, 200);

  // Mer animee
  fill(120, 150, 175, 180);
  rect(0, h * 0.5, w, 18);
  for (let i = 0; i < 24; i++) {
    fill(255, 240, 210, 100);
    rect((i * 88 + frameCount * 0.4) % w, h * 0.52 + (i % 2) * 4, 30, 2, 1);
  }

  // Salines (plaine de sel)
  fill(232, 226, 212);
  rect(0, h * 0.56, w, h - h * 0.56);
  fill(246, 240, 228, 220);
  rect(0, h * 0.56, w, 14);
  // Texture craquelee
  stroke(195, 188, 173, 80); strokeWeight(0.8);
  for (let x = 0; x < w; x += 60) {
    for (let y = h * 0.6; y < h; y += 42) {
      const off = (y / 42) % 2 ? 30 : 0;
      noFill();
      beginShape();
      vertex(x + off, y); vertex(x + off + 30, y - 8);
      vertex(x + off + 60, y); vertex(x + off + 60, y + 16);
      vertex(x + off + 30, y + 24); vertex(x + off, y + 16);
      endShape(CLOSE);
    }
  }
  noStroke();

  // Bâtiments de la Cuisine de Sali (silhouettes)
  drawMiniSaliBuilding(w * 0.12, h * 0.62, "Atelier", [144, 102, 84], [158, 88, 54]);
  drawMiniSaliBuilding(w * 0.38, h * 0.58, "Sali",    [215, 178, 136], [130, 80, 50]);
  drawMiniSaliBuilding(w * 0.66, h * 0.62, "Salle Sel", [94, 84, 124], [100, 70, 110]);
  drawMiniSaliBuilding(w * 0.88, h * 0.62, "Memes",   [128, 92, 108], [120, 75, 95]);

  // Halo
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.06 + 1);
  fill(240, 220, 180, unlocked ? (80 + pulse * 60) : 30);
  ellipse(w / 2, h * 0.5, w * 0.9, h * 0.7);

  // Tag
  fill(0, 200);
  rect(w / 2 - 200, 20, 400, 56, 10);
  stroke(240, 220, 180, 200); strokeWeight(2); noFill();
  rect(w / 2 - 200, 20, 400, 56, 10);
  noStroke();
  fill(255, 220, 150);
  textFont("Georgia"); textStyle(BOLD); textSize(28); textAlign(CENTER, CENTER);
  text("🧂  EST — CUISINE DE SALI", w / 2, 48);
  textStyle(NORMAL);

  fill(0, 180); rect(w / 2 - 140, 86, 280, 28, 8);
  textFont("monospace"); textSize(14); textAlign(CENTER, CENTER);
  if (done) { fill(120, 220, 140); text("✓ Plat livre au Roi", w / 2, 100); }
  else if (unlocked) { fill(255, 220, 120); text("Acces autorise → souffle sur les nuages", w / 2, 100); }
  else { fill(220, 100, 100); text("🔒 Verrouille — parle au Roi d'abord", w / 2, 100); }

  if (!unlocked) {
    fill(40, 20, 50, 130);
    rect(0, 0, w, h);
  }

  pop();
}

/** Mini maison-gateau pour le panorama ouest. */
function drawMiniCakeHouse(x, y, flavor) {
  let base = color(240, 220, 180), cream = color(255, 245, 230);
  if (flavor === "strawberry") base = color(255, 170, 195);
  if (flavor === "chocolate")  { base = color(110, 60, 35); cream = color(245, 220, 195); }
  noStroke();
  fill(0, 60); rect(x - 60, y + 90, 130, 8);
  fill(base); rect(x - 60, y + 30, 130, 70);
  fill(cream); rect(x - 65, y + 22, 140, 14);
  fill(base); rect(x - 40, y - 6, 90, 36);
  fill(cream); rect(x - 45, y - 14, 100, 14);
  fill(220, 40, 80); rect(x + 5, y - 28, 12, 14);
}

/** Mini Chef Marshmallow pour le panorama ouest. */
function drawMiniChef(x, y) {
  const bob = Math.sin(frameCount * 0.06) * 3;
  noStroke();
  fill(0, 80); ellipse(x, y + 50, 60, 10);
  fill(255, 250, 250); rect(x - 26, y - 12 + bob, 52, 64, 6);
  fill(255, 245, 245); ellipse(x, y - 36 + bob, 56, 54);
  fill(255, 180, 200, 200); ellipse(x - 12, y - 30 + bob, 9, 5);
  fill(60, 40, 80); ellipse(x - 7, y - 38 + bob, 5, 6); ellipse(x + 7, y - 38 + bob, 5, 6);
  noFill(); stroke(200, 80, 120); strokeWeight(2);
  arc(x, y - 30 + bob, 14, 8, 0, PI);
  noStroke();
  fill(255, 250, 250); rect(x - 20, y - 62 + bob, 40, 14, 3);
  ellipse(x - 8, y - 72 + bob, 20, 18);
  ellipse(x + 8, y - 72 + bob, 20, 18);
  ellipse(x,     y - 78 + bob, 22, 20);
}

/** Mini bâtiment Sali pour le panorama est. */
function drawMiniSaliBuilding(x, y, label, wallC, roofC) {
  noStroke();
  fill(0, 60); rect(x - 50, y + 110, 110, 10);
  // toit
  fill(roofC[0], roofC[1], roofC[2]);
  triangle(x - 60, y + 20, x + 60, y + 20, x, y - 30);
  // facade
  fill(wallC[0], wallC[1], wallC[2]);
  rect(x - 50, y + 20, 100, 90, 6);
  // porte
  fill(78, 50, 30);
  rect(x - 12, y + 70, 24, 38, 3);
  // fenetres
  fill(255, 220, 160, 220);
  rect(x - 36, y + 36, 22, 24, 3);
  rect(x + 14, y + 36, 22, 24, 3);
  // label
  fill(0, 200);
  rect(x - 44, y - 6, 88, 18, 4);
  fill(255, 220, 150);
  textFont("monospace"); textStyle(BOLD); textSize(11); textAlign(CENTER, CENTER);
  text(label, x, y + 3);
  textStyle(NORMAL);
}

// ─────────────────────────────────────────────────────────────────────────────
// DECOR LATERAL CAVE — bandes [0..1920] et [3840..5760] pendant les mini-jeux
// ─────────────────────────────────────────────────────────────────────────────

/** Decor lateral generique : voile colore + motifs flous + tag de zone. */
function drawSideBand(ox, w, themeName) {
  push();
  translate(ox, 0);
  const themes = {
    sweet:    { bg1: [255, 200, 230], bg2: [255, 160, 200], accent: [255, 180, 210], icon: "🍰", label: "Sweet Island" },
    salt:     { bg1: [225, 200, 175], bg2: [185, 160, 140], accent: [240, 220, 180], icon: "🧂", label: "Cuisine salee" },
    royal:    { bg1: [255, 230, 195], bg2: [220, 170, 100], accent: [240, 200, 100], icon: "👑", label: "Domaine royal" },
    kitchen:  { bg1: [255, 220, 200], bg2: [245, 180, 160], accent: [255, 200, 150], icon: "🍳", label: "Cuisine" },
    throne:   { bg1: [220, 100, 150], bg2: [150, 50, 100],  accent: [255, 220, 130], icon: "👑", label: "Salle du Trone" }
  };
  const t = themes[themeName] || themes.kitchen;
  // Degrade vertical
  noStroke();
  for (let y = 0; y < PLANET_H; y += 4) {
    const tt = y / PLANET_H;
    fill(lerp(t.bg1[0], t.bg2[0], tt), lerp(t.bg1[1], t.bg2[1], tt), lerp(t.bg1[2], t.bg2[2], tt));
    rect(0, y, w, 4);
  }
  // Motifs flous flottants (cercles doux)
  for (let i = 0; i < 22; i++) {
    const cx = ((i * 211 + frameCount * 0.3) % (w + 200)) - 100;
    const cy = ((i * 137 + frameCount * 0.2) % (PLANET_H + 100));
    fill(t.accent[0], t.accent[1], t.accent[2], 60 + (i % 5) * 12);
    ellipse(cx, cy, 80 + (i % 3) * 30, 80 + (i % 3) * 30);
  }
  // Pixels-confettis
  for (let i = 0; i < 60; i++) {
    fill(t.accent[0], t.accent[1], t.accent[2], 200);
    const px = (i * 41 + frameCount * 0.5) % w;
    const py = (i * 73 + frameCount * 0.3) % PLANET_H;
    rect(px, py, 6, 6);
  }
  // Tag
  fill(0, 200);
  rect(w / 2 - 220, 30, 440, 70, 12);
  stroke(t.accent[0], t.accent[1], t.accent[2], 220); strokeWeight(3); noFill();
  rect(w / 2 - 220, 30, 440, 70, 12);
  noStroke();
  fill(t.accent[0], t.accent[1], t.accent[2]);
  textFont("Georgia"); textStyle(BOLD); textSize(34); textAlign(CENTER, CENTER);
  text(t.icon + "  " + t.label, w / 2, 65);
  textStyle(NORMAL);
  pop();
}

/** Decor pendant un mini-jeu de cuisine / trone (interieur). */
function drawSideDecorForInterior(name) {
  const theme = name === "throne" ? "throne" : "kitchen";
  drawSideBand(0, SCREEN_W, theme);
  drawSideBand(CENTER_X1, SCREEN_W, theme);
}

/** Decor lateral pour la scene south (jardins royaux). */
function drawSideDecorForSouth() {
  drawSideBand(0, SCREEN_W, "royal");
  drawSideBand(CENTER_X1, SCREEN_W, "royal");
}

/** Decor lateral pour la scene west (Sweet Island). */
function drawSideDecorForWest() {
  drawSideBand(0, SCREEN_W, "sweet");
  drawSideBand(CENTER_X1, SCREEN_W, "sweet");
}

/** Decor lateral pour la scene east (Cuisine de Sali). */
function drawSideDecorForEast() {
  drawSideBand(0, SCREEN_W, "salt");
  drawSideBand(CENTER_X1, SCREEN_W, "salt");
}

/** Fins separateurs verticaux entre les 3 ecrans (jonctions du CAVE). */
function drawCaveScreenSeparators() {
  // Lignes de jonction tres discretes — utiles pour les developpeurs
  noStroke();
  fill(0, 90);
  rect(SCREEN_W - 2, 0, 4, PLANET_H);
  rect(CENTER_X1 - 2, 0, 4, PLANET_H);
}

function drawDialogueLog() {
  fill(0, 235); rect(0, 0, VIEW_W, VIEW_H);
  fill(255, 220, 180);
  textFont("Georgia"); textStyle(BOLD); textSize(20); textAlign(CENTER, TOP);
  text("Journal des dialogues", VIEW_W/2, 16);
  textStyle(NORMAL); textSize(11);
  fill(200, 200, 230); textFont("monospace"); textAlign(CENTER, TOP);
  text("(L pour fermer)", VIEW_W/2, 44);
  textFont("Georgia"); textAlign(LEFT, TOP);
  let y = 70;
  const start = Math.max(0, dialogueHistory.length - 14);
  for (let i = start; i < dialogueHistory.length; i++) {
    const d = dialogueHistory[i];
    const sc = SPEAKER_COLORS[d.speaker] || [255, 255, 255];
    fill(sc[0], sc[1], sc[2]);
    textStyle(BOLD); textSize(13);
    text(d.speaker + " :", 30, y);
    fill(245, 235, 255); textStyle(NORMAL); textSize(12);
    text(d.text, 130, y, VIEW_W - 160, 60);
    y += 38;
  }
  if (dialogueHistory.length === 0) {
    fill(200); textAlign(CENTER, CENTER); textSize(13);
    text("Aucun dialogue pour le moment.", VIEW_W/2, VIEW_H/2);
  }
}

// ---------- World drawing ----------
function drawGround() {
  noStroke();
  // Zone d'amertume au nord (degrade sombre)
  for (let yy = 0; yy < BITTER_LINE_Y; yy += 8) {
    const sy = yy - cam.y;
    if (sy < -10 || sy > WORLD_H + 8) continue;
    const t = yy / BITTER_LINE_Y;
    fill(lerp(20, 70, t), lerp(15, 65, t), lerp(40, 80, t));
    rect(-cam.x, sy, WORLD_W, 8);
  }
  // Ligne de transition coloree
  const bandTop = BITTER_LINE_Y - 30;
  for (let yy = bandTop; yy < BITTER_LINE_Y + 30; yy += 4) {
    const sy = yy - cam.y;
    if (sy < -10 || sy > WORLD_H + 8) continue;
    const t = (yy - bandTop) / 60;
    fill(lerp(60, 200, t), lerp(50, 220, t), lerp(70, 200, t));
    rect(-cam.x, sy, WORLD_W, 4);
  }

  // Pelouse sucree (vert pastel)
  const grass = currentPalette.grass;
  fill(grass[0], grass[1], grass[2]);
  rect(-cam.x, BITTER_LINE_Y - cam.y, WORLD_W, WORLD_H - BITTER_LINE_Y);
  // Touffes d'herbe
  for (let i = 0; i < 220; i++) {
    const tx = (i * 173.3) % WORLD_W;
    const ty = BITTER_LINE_Y + ((i * 91.7) % (WORLD_H - BITTER_LINE_Y));
    fill(grass[0] - 25, grass[1] - 25, grass[2] - 25, 90);
    ellipse(tx - cam.x, ty - cam.y, 6, 3);
  }

  // ──────── ROUTES CLAIRES ────────
  // Route principale est-ouest a y=1330, et embranchement vers le sud au centre.
  // Couleur : crème sablée bordée.
  const ROAD_Y = 1330, ROAD_T = 56;

  // Ombre
  fill(0, 60);
  rect(-cam.x, ROAD_Y + ROAD_T + 2 - cam.y, WORLD_W, 6);

  // Base de route
  fill(238, 220, 188);
  rect(-cam.x, ROAD_Y - cam.y, WORLD_W, ROAD_T);
  // Bordures sombres
  fill(180, 140, 90);
  rect(-cam.x, ROAD_Y - cam.y, WORLD_W, 4);
  rect(-cam.x, ROAD_Y + ROAD_T - 4 - cam.y, WORLD_W, 4);
  // Texture paves
  stroke(190, 165, 130, 180); strokeWeight(1);
  for (let x = 0; x < WORLD_W; x += 40) {
    const off = ((x / 40) % 2 === 0) ? 0 : 20;
    line(x + off - cam.x, ROAD_Y + 6 - cam.y, x + off - cam.x, ROAD_Y + ROAD_T - 6 - cam.y);
  }
  for (let y = ROAD_Y + 14; y < ROAD_Y + ROAD_T; y += 14) {
    line(-cam.x, y - cam.y, WORLD_W - cam.x, y - cam.y);
  }
  noStroke();

  // Embranchement vers le sud (centre, vers le chateau)
  const branchX = southGate.centerX;
  const branchW = 84;
  fill(238, 220, 188);
  rect(branchX - branchW / 2 - cam.x, ROAD_Y + ROAD_T - cam.y, branchW, WORLD_H - (ROAD_Y + ROAD_T));
  // bordures verticales
  fill(180, 140, 90);
  rect(branchX - branchW / 2 - cam.x, ROAD_Y + ROAD_T - cam.y, 4, WORLD_H - (ROAD_Y + ROAD_T));
  rect(branchX + branchW / 2 - 4 - cam.x, ROAD_Y + ROAD_T - cam.y, 4, WORLD_H - (ROAD_Y + ROAD_T));
  // paves transversaux
  stroke(190, 165, 130, 180); strokeWeight(1);
  for (let y = ROAD_Y + ROAD_T + 10; y < WORLD_H; y += 16) {
    line(branchX - branchW / 2 + 4 - cam.x, y - cam.y, branchX + branchW / 2 - 4 - cam.x, y - cam.y);
  }
  noStroke();

  // Petites allees secondaires vers chaque ingredient et vers la cuisine
  function alley(fromX, fromY, toX, toY) {
    fill(232, 212, 178);
    const dx = toX - fromX, dy = toY - fromY;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    push();
    translate(fromX - cam.x, fromY - cam.y);
    rotate(ang);
    rect(0, -10, len, 20, 4);
    fill(190, 165, 130, 140);
    rect(0, -10, len, 2);
    rect(0, 8, len, 2);
    pop();
  }
  // Cuisine (porte) ← route
  alley(990, 1268, 990, ROAD_Y);
  // Vers ingredients (chemins courts depuis la route)
  for (const ing of ingredients) {
    if (Math.abs(ing.y - ROAD_Y) < 200) {
      const startY = (ing.y > ROAD_Y + ROAD_T) ? ROAD_Y + ROAD_T : ROAD_Y;
      alley(ing.x, startY, ing.x, ing.y);
    }
  }

  // Halo lumineux sur la porte sud
  fill(255, 220, 180, 140);
  ellipse(branchX - cam.x, WORLD_H - 24 - cam.y, 190, 60);

  // Bandes d'avertissement entre route et zone d'amertume
  fill(220, 170, 110, 90);
  rect(-cam.x, BITTER_LINE_Y - cam.y, WORLD_W, 6);

  // Lampadaires-sucettes le long de la route principale (balisage)
  const lampSpacing = 200;
  for (let x = lampSpacing; x < WORLD_W; x += lampSpacing) {
    // Eviter de mettre un lampadaire pile sur l'embranchement sud
    if (Math.abs(x - branchX) < branchW) continue;
    // au-dessus de la route
    drawSugarLamp(x, ROAD_Y - 6);
    // en-dessous de la route
    drawSugarLamp(x, ROAD_Y + ROAD_T + 6);
  }
  // Lampadaires le long de l'embranchement sud
  for (let y = ROAD_Y + ROAD_T + 40; y < WORLD_H - 60; y += 110) {
    drawSugarLamp(branchX - branchW / 2 - 14, y);
    drawSugarLamp(branchX + branchW / 2 + 14, y);
  }
}

// Lampadaire en sucre d'orge — petit decor qui balise les routes.
function drawSugarLamp(wx, wy) {
  const sx = wx - cam.x, sy = wy - cam.y;
  if (sx < -20 || sx > WORLD_W + 20 || sy < -40 || sy > WORLD_H + 20) return;
  noStroke();
  fill(0, 80); ellipse(sx, sy + 4, 12, 4);
  // poteau spirale rose-blanc
  fill(220, 80, 130);
  rect(sx - 2, sy - 32, 4, 32);
  fill(255, 255, 255, 220);
  for (let i = 0; i < 4; i++) ellipse(sx, sy - 28 + i * 8, 5, 2);
  // boule lumineuse
  const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.05 + wx * 0.01);
  fill(255, 230, 150, 100 + pulse * 80);
  ellipse(sx, sy - 38, 22, 22);
  fill(255, 240, 200);
  ellipse(sx, sy - 38, 10, 10);
}

function drawCandyDecor() {
  push();
  translate(ship.x - cam.x, ship.y - cam.y);
  fill(0, 90); ellipse(0, 14, 80, 18);
  fill(150,150,170); ellipse(0, 0, 100, 36);
  fill(180,180,200); ellipse(0, -6, 70, 22);
  fill(120,220,230);
  ellipse(-20, -4, 10, 10); ellipse(0, -4, 10, 10); ellipse(20, -4, 10, 10);
  fill(frameCount % 60 < 30 ? 255 : 120, 80, 80); ellipse(46, -10, 8, 8);
  fill(255, 230, 150, 120); ellipse(-30, 18, 12, 4); ellipse(30, 18, 12, 4);
  pop();
  for (const t of lollipops) {
    const sx = t.x - cam.x, sy = t.y - cam.y;
    if (sx < -40 || sx > WORLD_W + 40 || sy < -40 || sy > WORLD_H + 40) continue;
    noStroke(); fill(0, 70); ellipse(sx, sy + 6, 28 * t.s, 8 * t.s);
    stroke(120,110,110); strokeWeight(3); line(sx, sy, sx, sy - 40 * t.s); noStroke();
    fill(t.c[0], t.c[1], t.c[2]); ellipse(sx, sy - 44 * t.s, 30 * t.s, 30 * t.s);
    fill(255,255,255,90); ellipse(sx - 5 * t.s, sy - 50 * t.s, 8 * t.s, 5 * t.s);
  }
  for (let i = 0; i < 18; i++) {
    const bx = (i * 211 + 130) % WORLD_W;
    const by = BITTER_LINE_Y + 60 + ((i * 137) % (WORLD_H - BITTER_LINE_Y - 100));
    if (overlapsBuilding(bx, by, 30)) continue;
    const sx = bx - cam.x, sy = by - cam.y;
    if (sx < -30 || sx > WORLD_W + 30 || sy < -30 || sy > WORLD_H + 30) continue;
    fill(255, 180, 220); ellipse(sx, sy, 22, 14);
    fill(255, 240, 250); ellipse(sx - 5, sy - 3, 10, 8);
  }
}

function drawBitterDecor() {
  stroke(80, 80, 95); strokeWeight(2);
  for (const t of twistedTrees) {
    const sx = t.x - cam.x, sy = t.y - cam.y;
    if (sx < -30 || sx > WORLD_W + 30 || sy < -40 || sy > WORLD_H + 30) continue;
    line(sx, sy, sx + 4, sy - 30 * t.s);
    line(sx + 4, sy - 30 * t.s, sx - 8, sy - 50 * t.s);
    line(sx + 4, sy - 30 * t.s, sx + 16, sy - 42 * t.s);
    line(sx - 8, sy - 50 * t.s, sx - 14, sy - 60 * t.s);
  }
  noStroke();
  for (const c of aniseCrystals) {
    const sx = c.x - cam.x, sy = c.y - cam.y;
    if (sx < -20 || sx > WORLD_W + 20 || sy < -20 || sy > WORLD_H + 20) continue;
    fill(120,120,140); quad(sx, sy - 12, sx + 8, sy, sx, sy + 12, sx - 8, sy);
    fill(220,220,240,90); ellipse(sx - 2, sy - 2, 4, 4);
  }
  fill(8, 5, 14);
  rect(1600 - cam.x, 60 - cam.y, 100, 180);
  rect(1820 - cam.x, 30 - cam.y, 130, 220);
  for (let i = 0; i < 5; i++) triangle(1600 + i*20 - cam.x, 60 - cam.y, 1610 + i*20 - cam.x, 45 - cam.y, 1620 + i*20 - cam.x, 60 - cam.y);
  for (let i = 0; i < 6; i++) triangle(1820 + i*22 - cam.x, 30 - cam.y, 1831 + i*22 - cam.x, 14 - cam.y, 1842 + i*22 - cam.x, 30 - cam.y);
  for (let i = 0; i < 5; i++) {
    const fy = (frameCount * 0.3 + i * 130) % BITTER_LINE_Y;
    fill(180, 180, 210, 28);
    rect(-cam.x, fy - cam.y, WORLD_W, 26);
  }
}

function drawDecorHouses() {
  for (const h of decorHouses) {
    const sx = h.x - cam.x;
    const sy = h.y - cam.y;
    if (sx + h.w < -40 || sx > WORLD_W + 40 || sy + h.h < -40 || sy > WORLD_H + 40) continue;

    noStroke();
    fill(h.color[0], h.color[1], h.color[2]);
    rect(sx, sy, h.w, h.h, 10);
    fill(h.roof[0], h.roof[1], h.roof[2]);
    triangle(sx - 10, sy, sx + h.w + 10, sy, sx + h.w / 2, sy - 40);
    fill(255, 240, 220);
    rect(h.door.x - cam.x, sy + h.h - 28, h.door.w, 28, 4);
    fill(255, 220, 200);
    ellipse(sx + h.w * 0.25, sy + h.h * 0.45, 16, 16);
    ellipse(sx + h.w * 0.75, sy + h.h * 0.45, 16, 16);
    fill(255, 255, 255, 120);
    rect(sx + h.w * 0.25 - 6, sy + h.h * 0.55, 12, 16, 3);
    rect(sx + h.w * 0.75 - 6, sy + h.h * 0.55, 12, 16, 3);
  }
}

function drawDecorNPCs() {
  for (const npc of decorNPCs) {
    const sx = npc.x - cam.x;
    const sy = npc.y - cam.y;
    if (sx < -30 || sx > WORLD_W + 30 || sy < -40 || sy > WORLD_H + 40) continue;
    noStroke();
    fill(0, 90); ellipse(sx, sy + 12, 28, 8);
    fill(npc.color[0], npc.color[1], npc.color[2]);
    rect(sx - 10, sy - 14, 20, 24, 4);
    fill(255, 235, 205);
    ellipse(sx, sy - 24, 18, 18);
    fill(0); ellipse(sx - 4, sy - 26, 3, 3); ellipse(sx + 4, sy - 26, 3, 3);
    fill(255, 160, 120);
    rect(sx - 6, sy + 2, 12, 6, 2);
    fill(255, 120, 120);
    if (npc.type === 'guard') fill(120, 100, 190);
    else if (npc.type === 'merchant') fill(250, 180, 80);
    else if (npc.type === 'baker') fill(240, 200, 170);
    else fill(200, 160, 210);
    rect(sx - 10, sy - 2, 20, 10, 3);
    fill(255);
    textFont('monospace'); textSize(9); textAlign(CENTER, CENTER);
    text(npc.type[0].toUpperCase(), sx, sy - 28);
  }
}

function drawRoyalDecor() {
  const screenX = southGate.centerX - cam.x;
  const screenY = WORLD_H - 110 - cam.y;

  fill(255, 230, 210, 190);
  ellipse(screenX, screenY + 40, 260, 80);
  fill(255, 215, 185);
  rect(screenX - 90, screenY - 30, 180, 60, 10);
  fill(255, 240, 220);
  rect(screenX - 70, screenY - 70, 140, 22, 6);
  fill(240, 180, 120);
  triangle(screenX - 110, screenY - 70, screenX + 110, screenY - 70, screenX, screenY - 135);
  fill(200, 90, 140);
  rect(screenX - 18, screenY - 20, 36, 50, 4);
  fill(255, 230, 160);
  ellipse(screenX, screenY - 88, 20, 20);
  for (let i = -1; i <= 1; i++) {
    fill(255, 255, 255, 160);
    rect(screenX + i * 42 - 10, screenY - 10, 20, 20, 4);
  }
  if (flags.ingredientsDoneShown && !flags.degustationStartShown) {
    drawMarker(screenX, screenY - 150, "!");
  }
}

function drawSouthScene() {
  // Decor lateral (jardins royaux)
  drawSideDecorForSouth();
  const fit = getSouthSceneFit();
  // Fond bande centrale
  noStroke();
  fill(10, 5, 18);
  rect(CENTER_X0, 0, SCREEN_W, PLANET_H);
  push();
  translate(fit.ox, fit.oy);
  scale(fit.sx, fit.sy);
  drawSouthBackdrop();
  drawSouthCastle();
  drawSouthReturnSign();
  // Le Roi n'est plus dehors : il est UNIQUEMENT dans la Salle du Trone.
  drawSouthPlayer();
  pop();
}

function drawSouthBackdrop() {
  noStroke();

  for (let y = 0; y < SOUTH_SCENE_H; y += 4) {
    const t = y / SOUTH_SCENE_H;
    fill(lerp(255, 255, t), lerp(188, 230, t), lerp(200, 210, t));
    rect(0, y, SOUTH_SCENE_W, 4);
  }

  fill(185, 136, 183, 190);
  for (let i = 0; i < 7; i++) {
    const mx = 80 + i * 210;
    triangle(mx, 330, mx + 90, 190, mx + 180, 330);
    fill(255, 244, 255, 210);
    triangle(mx + 58, 238, mx + 90, 190, mx + 122, 238);
    fill(185, 136, 183, 190);
  }

  fill(226, 176, 204);
  rect(0, 330, SOUTH_SCENE_W, SOUTH_SCENE_H - 330);

  for (let y = 330; y < SOUTH_SCENE_H; y += 34) {
    for (let x = 0; x < SOUTH_SCENE_W; x += 34) {
      fill(((x + y) / 34) % 2 === 0 ? color(232, 182, 209) : color(223, 170, 198));
      rect(x, y, 34, 34);
    }
  }

  randomSeed(99);
  for (let i = 0; i < 260; i++) {
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#ffffff"]));
    rect(random(SOUTH_SCENE_W), random(350, SOUTH_SCENE_H - 12), 8, 5);
  }

  fill(210, 150, 185);
  rect(0, 630, SOUTH_SCENE_W, 170);

  fill(235, 210, 190);
  rect(250, 620, 900, 58, 14);
  fill(240, 226, 170, 120);
  ellipse(700, 650, 260, 74);
}

function drawSouthCastle() {
  const baseX = 700;
  const baseY = 485;

  noStroke();
  fill(0, 0, 0, 45);
  rect(baseX - 260, baseY + 145, 520, 30, 12);

  fill(255, 222, 205);
  rect(baseX - 250, baseY - 40, 500, 180, 14);
  fill(245, 202, 176);
  rect(baseX - 290, baseY - 78, 580, 42, 10);
  fill(255, 240, 225);
  for (let i = 0; i < 18; i++) {
    rect(baseX - 274 + i * 32, baseY - 38, 18, 22, 4);
  }

  const towers = [-250, -140, 140, 250];
  for (const offset of towers) {
    fill(255, 228, 212);
    rect(baseX + offset - 42, baseY - 180, 84, 220, 12);
    fill(240, 180, 120);
    triangle(baseX + offset - 58, baseY - 180, baseX + offset + 58, baseY - 180, baseX + offset, baseY - 244);
    fill(255, 235, 220);
    rect(baseX + offset - 20, baseY - 120, 40, 72, 6);
    fill(120, 185, 225);
    rect(baseX + offset - 14, baseY - 108, 28, 42, 4);
  }

  fill(150, 64, 74);
  rect(baseX - 54, baseY + 16, 108, 124, 12);
  fill(255, 216, 92);
  rect(baseX - 30, baseY + 56, 60, 48, 4);
  fill(255, 240, 160, 180);
  ellipse(baseX, baseY + 80, 82, 44);

  fill(216, 92, 138);
  for (let i = -2; i <= 2; i++) {
    rect(baseX + i * 88 - 38, baseY - 132, 76, 12, 6);
  }

  fill(255, 246, 236);
  rect(baseX - 116, baseY + 4, 72, 78, 8);
  rect(baseX + 44, baseY + 4, 72, 78, 8);
  fill(130, 192, 225);
  rect(baseX - 98, baseY + 20, 36, 44, 4);
  rect(baseX + 62, baseY + 20, 36, 44, 4);
}

function drawSouthReturnSign() {
  const x = southLandmarks.returnSign.x;
  const y = southLandmarks.returnSign.y;
  fill(0, 0, 0, 50);
  rect(x - 18, y + 28, 48, 8);
  fill(130, 78, 40);
  rect(x + 4, y - 6, 10, 48);
  fill(214, 168, 102);
  rect(x - 24, y - 18, 60, 24, 4);
  fill(92, 52, 24);
  textFont("monospace");
  textSize(10);
  textAlign(CENTER, CENTER);
  text("RETOUR", x + 6, y - 6);
}

function drawSouthPlayer() {
  drawHeroSprite(southPlayer.x, southPlayer.y, southPlayer.facing, southPlayer.walkPhase);
}

function drawWestScene() {
  // Decor lateral (sucreries flottantes)
  drawSideDecorForWest();
  // La zone ouest est entierement geree par ouest.js (Sweet Island).
  if (typeof drawWestZone === "function" && typeof westState !== "undefined" && westState.active) {
    if (typeof updateWest === "function") updateWest();
    drawWestZone();
    return;
  }
  // Fallback (au cas ou ouest.js n'a pas pu charger) : ancien decor.
  drawWestViewportBackground();
  push();
  translate(getWestOffsetX(), getWestOffsetY());
  scale(getWestScaleX(), getWestScaleY());
  translate(-westPlayer.x + WEST_SCENE_W / 2, -westPlayer.y + WEST_SCENE_H / 2);
  drawWestBackdrop();
  drawWestChef(westLandmarks.chef.x, westLandmarks.chef.y);
  drawWestGiantOven(westLandmarks.oven.x, westLandmarks.oven.y);
  drawWestDistributor(westLandmarks.distributor.x, westLandmarks.distributor.y);
  drawWestSignpost(westLandmarks.signpost.x, westLandmarks.signpost.y);
  drawWestPlayer();
  pop();
}

function drawWestViewportBackground() {
  noStroke();

  for (let y = 0; y < VIEW_H; y += 8) {
    const t = y / VIEW_H;
    fill(lerp(86, 224, t), lerp(24, 170, t), lerp(78, 188, t));
    rect(0, y, VIEW_W, 8);
  }

  const groundY = VIEW_H * 0.5;
  for (let y = groundY; y < VIEW_H; y += 24) {
    const row = Math.floor((y - groundY) / 24);
    for (let x = 0; x < VIEW_W; x += 24) {
      const evenTile = ((Math.floor(x / 24) + row) % 2 === 0);
      fill(evenTile ? color(229, 153, 191) : color(214, 138, 181));
      rect(x, y, 24, 24);
    }
  }

  fill(131, 78, 124, 180);
  for (let i = 0; i < 10; i++) {
    const baseX = i * (VIEW_W / 9);
    triangle(baseX - 120, groundY, baseX + 20, 220, baseX + 160, groundY);
  }

  randomSeed(84);
  for (let i = 0; i < 220; i++) {
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#ffffff"]));
    rect(random(VIEW_W), random(groundY + 10, VIEW_H - 10), 10, 6);
  }
}

function drawWestBackdrop() {
  noStroke();

  for (let y = 0; y < WEST_SCENE_H; y += 4) {
    const t = y / WEST_SCENE_H;
    fill(lerp(255, 255, t), lerp(184, 220, t), lerp(210, 200, t));
    rect(0, y, WEST_SCENE_W, 4);
  }

  drawWestCandyMountains();
  drawWestChocolateRiver(0, 430, WEST_SCENE_W, 40);

  for (let y = 300; y < WEST_SCENE_H; y += 32) {
    for (let x = 0; x < WEST_SCENE_W; x += 32) {
      const evenTile = ((x / 32) + (y / 32)) % 2 === 0;
      fill(evenTile ? color(255, 210, 225) : color(255, 190, 210));
      rect(x, y, 32, 32);
    }
  }

  randomSeed(42);
  for (let i = 0; i < 140; i++) {
    const x = random(WEST_SCENE_W);
    const y = random(300, WEST_SCENE_H);
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#ffffff", "#c2f0ff"]));
    rect(floor(x / 4) * 4, floor(y / 4) * 4, 8, 4);
  }

  drawWestCakeHouse(60, 110, "strawberry");
  drawWestCakeHouse(320, 90, "vanilla");
  drawWestCakeHouse(560, 120, "chocolate");

  drawWestCandyTree(40, 320);
  drawWestCandyTree(260, 330);
  drawWestCandyTree(520, 340);
  drawWestCandyTree(740, 330);
  drawWestCandyTree(890, 320);

  drawWestCupcakeTower(440, 160);

  fill(20, 10, 25, 34);
  rect(0, 0, WEST_SCENE_W, WEST_SCENE_H);
}

function drawWestCandyMountains() {
  noStroke();
  fill(180, 120, 170);
  for (let i = 0; i < 8; i++) {
    triangle(i * 130 + 40, 230, i * 130 + 110, 140, i * 130 + 180, 230);
  }
  fill(255, 245, 255);
  for (let i = 0; i < 8; i++) {
    triangle(i * 130 + 90, 170, i * 130 + 110, 140, i * 130 + 130, 170);
  }
}

function drawWestChocolateRiver(x, y, w, h) {
  fill(90, 42, 22);
  rect(x, y, w, h);
  for (let i = 0; i < 40; i++) {
    fill(140, 70, 40);
    rect((i * 28 + (frameCount * 0.5) % 28) % w, y + 8 + (i % 2) * 18, 14, 4);
  }
  fill(255, 235, 210);
  for (let i = 0; i < 30; i++) {
    rect((i * 33 + frameCount * 0.3) % w, y + 4 + (i % 3) * 12, 4, 4);
  }
}

function drawWestCakeHouse(x, y, flavor) {
  fill(0, 0, 0, 40);
  rect(x - 4, y + 110, 150, 10);

  let base = color(240, 220, 180);
  let cream = color(255, 245, 230);
  let berry = color(220, 40, 90);

  if (flavor === "strawberry") {
    base = color(255, 170, 195);
    berry = color(200, 30, 80);
  }

  if (flavor === "chocolate") {
    base = color(110, 60, 35);
    cream = color(245, 220, 195);
    berry = color(220, 40, 80);
  }

  fill(base);
  rect(x, y + 40, 140, 70);
  fill(cream);
  rect(x - 4, y + 30, 148, 18);
  for (let i = 0; i < 8; i++) rect(x + i * 18 - 2, y + 44, 12, 8 + (i % 3) * 4);

  fill(base);
  rect(x + 20, y, 100, 40);
  fill(cream);
  rect(x + 16, y - 6, 108, 14);
  fill(135, 206, 235);
  rect(x + 56, y + 60, 28, 22);
  fill(255);
  rect(x + 60, y + 62, 6, 6);
  fill(90, 50, 30);
  rect(x + 16, y + 74, 26, 36);
  fill(255, 215, 0);
  rect(x + 36, y + 92, 4, 4);
  fill(berry);
  rect(x + 64, y - 18, 12, 12);
  fill(120, 180, 80);
  rect(x + 74, y - 22, 6, 6);

  for (let i = 0; i < 12; i++) {
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#ffffff"]));
    rect(x + 6 + i * 11, y + 34, 4, 4);
  }
}

function drawWestCupcakeTower(x, y) {
  noStroke();
  fill(200, 60, 100);
  rect(x, y + 30, 80, 50);
  for (let i = 0; i < 8; i++) {
    fill(i % 2 === 0 ? color(160, 30, 70) : color(220, 80, 120));
    rect(x + i * 10, y + 30, 6, 50);
  }
  fill(255, 245, 230);
  rect(x + 8, y + 10, 64, 24);
  rect(x + 16, y - 6, 48, 20);
  rect(x + 24, y - 20, 32, 18);
  fill(220, 40, 80);
  rect(x + 36, y - 30, 12, 12);
  fill(120, 180, 80);
  rect(x + 44, y - 34, 6, 6);
}

function drawWestCandyTree(x, y) {
  fill(130, 70, 40);
  rect(x + 14, y + 30, 10, 40);
  fill(255, 180, 210);
  rect(x, y, 40, 36);
  fill(255, 120, 170);
  rect(x + 6, y + 6, 28, 24);
  fill(255, 245, 230);
  rect(x + 14, y + 10, 10, 10);
}

function drawWestChef(x, y) {
  const by = y + (frameCount % 60 < 30 ? 0 : -2);
  noStroke();
  fill(0, 0, 0, 50);
  rect(x - 16, by + 44, 40, 6);
  fill(255, 250, 250);
  rect(x - 14, by + 4, 32, 42);
  fill(255);
  rect(x - 16, by - 14, 36, 18);
  rect(x - 12, by - 22, 28, 10);
  rect(x - 6, by - 28, 18, 8);
  fill(0);
  rect(x - 8, by + 14, 4, 4);
  rect(x + 6, by + 14, 4, 4);
  fill(255, 170, 190);
  rect(x - 12, by + 20, 4, 3);
  rect(x + 10, by + 20, 4, 3);
  fill(200, 80, 100);
  rect(x - 4, by + 24, 10, 3);
  fill(255, 180, 210);
  rect(x - 12, by + 28, 28, 16);
  fill(220, 40, 80);
  rect(x - 4, by + 32, 10, 8);

  fill(255, 255, 255, 230);
  stroke(200, 150, 100);
  strokeWeight(2);
  rect(x - 30, by - 85, 110, 30, 8);
  noStroke();
  fill(255, 255, 255, 230);
  triangle(x + 5, by - 55, x + 15, by - 45, x + 25, by - 55);
  fill(120, 60, 30);
  textSize(10);
  textAlign(CENTER, CENTER);
  text("Zone ouest", x + 25, by - 70);
}

function drawWestGiantOven(x, y) {
  noStroke();
  fill(0, 0, 0, 60);
  rect(x - 30, y + 54, 90, 8);
  fill(120, 90, 70);
  rect(x - 34, y - 20, 94, 78);
  fill(90, 60, 50);
  for (let j = 0; j < 5; j++) {
    rect(x - 34, y - 20 + j * 16, 94, 4);
    for (let i = 0; i < 8; i++) rect(x - 34 + ((j % 2) ? 8 : 0) + i * 12, y - 20 + j * 16, 4, 16);
  }
  fill(40, 20, 10);
  rect(x - 22, y, 70, 44);
  fill(50, 28, 18);
  rect(x - 18, y + 4, 62, 36);
  const flameGlow = 150 + sin(frameCount * 0.3) * 50;
  fill(255, flameGlow, 30);
  rect(x - 12, y + 20, 46, 14);
  fill(255, 230, 120);
  rect(x - 4, y + 24, 28, 8);
}

function drawWestDistributor(x, y) {
  noStroke();
  fill(0, 0, 0, 60);
  rect(x - 26, y + 60, 60, 8);
  fill(180, 40, 70);
  rect(x - 26, y + 10, 52, 54);
  fill(220, 60, 90);
  rect(x - 22, y + 14, 44, 8);
  fill(60, 20, 30);
  rect(x - 4, y + 36, 12, 4);
  fill(180, 220, 255, 220);
  rect(x - 30, y - 40, 60, 48);
  fill(220, 240, 255, 220);
  rect(x - 26, y - 44, 52, 8);

  randomSeed(7);
  for (let i = 0; i < 14; i++) {
    fill(random(["#ff4d7a", "#ffd864", "#86d1ff", "#aaffaa", "#ffffff"]));
    rect(x - 24 + (i % 7) * 8, y - 34 + floor(i / 7) * 8, 6, 6);
  }
}

function drawWestSignpost(x, y) {
  fill(0, 0, 0, 50);
  rect(x - 14, y + 30, 40, 6);
  fill(120, 70, 40);
  rect(x + 4, y, 8, 36);
  fill(200, 150, 90);
  rect(x - 14, y - 4, 40, 20);
  fill(80, 40, 20);
  textSize(8);
  textAlign(CENTER, CENTER);
  text("RETOUR", x + 6, y + 6);
}

function drawWestPlayer() {
  const x = westPlayer.x;
  const y = westPlayer.y;
  const bob = Math.sin(westPlayer.walkPhase) * 1.5;

  noStroke();
  fill(0, 0, 0, 70);
  rect(x - 10, y + 14, 20, 4);
  fill(70, 40, 90);
  rect(x - 8, y + 8 + bob, 6, 8);
  rect(x + 2, y + 8 - bob, 6, 8);
  fill(0, 180, 210);
  rect(x - 10, y - 10 + bob, 20, 22);
  fill(0, 140, 170);
  rect(x - 10, y - 2 + bob, 20, 2);
  fill(255, 215, 64);
  rect(x - 10, y + 6 + bob, 20, 2);
  fill(255, 220, 185);
  rect(x - 8, y - 22 + bob, 16, 14);
  fill(180, 60, 100);
  rect(x - 10, y - 26 + bob, 20, 6);
  fill(0);
  if (westPlayer.facing === 1) rect(x - 6, y - 14 + bob, 2, 2);
  else if (westPlayer.facing === 2) rect(x + 4, y - 14 + bob, 2, 2);
  else if (westPlayer.facing === 3) {
    rect(x - 6, y - 18 + bob, 2, 2);
    rect(x + 4, y - 18 + bob, 2, 2);
  } else {
    rect(x - 6, y - 14 + bob, 2, 2);
    rect(x + 4, y - 14 + bob, 2, 2);
  }
}

function drawBuildings() {
  for (const b of buildings) {
    const sx = b.x - cam.x, sy = b.y - cam.y;
    if (sx + b.w < -30 || sx > WORLD_W + 30 || sy + b.h < -30 || sy > WORLD_H + 30) continue;
    const WALL_T = 8;
    noStroke(); fill(0, 90); rect(sx + 6, sy + 10, b.w, b.h, 8);
    if (b.id === "kitchen") {
      fill(245, 220, 195); rect(sx, sy, b.w, b.h, 6);
      stroke(210, 180, 150); strokeWeight(1);
      for (let yy = 0; yy < b.h; yy += 24) line(sx, sy + yy, sx + b.w, sy + yy);
      for (let xx = 0; xx < b.w; xx += 32) line(sx + xx, sy, sx + xx, sy + b.h);
      noStroke();
      fill(140, 80, 50);
      rect(sx + 24, sy + 18, 56, 46, 4); rect(sx + b.w - 80, sy + 18, 56, 46, 4);
      fill(80, 40, 25);
      rect(sx + 32, sy + 30, 40, 26, 3); rect(sx + b.w - 72, sy + 30, 40, 26, 3);
      if (frameCount % 80 < 40) { fill(255, 200, 90); ellipse(sx + 52, sy + 43, 26, 18); ellipse(sx + b.w - 52, sy + 43, 26, 18); }
      for (let s = 0; s < 3; s++) {
        const ssx = sx + 52 + Math.sin(frameCount * 0.05 + s) * 4;
        const ssy = sy + 18 - ((frameCount * 0.6 + s * 24) % 40);
        fill(220, 220, 240, 110);
        ellipse(ssx, ssy, 8, 12); ellipse(sx + b.w - 52 + Math.sin(frameCount * 0.05 + s + 1) * 4, ssy, 8, 12);
      }
      fill(180, 130, 80); rect(sx + b.w / 2 - 50, sy + b.h / 2 - 12, 100, 30, 4);
      fill(140, 90, 50); rect(sx + b.w / 2 - 50, sy + b.h / 2 - 12, 100, 4);
      fill(255, 180, 200); ellipse(sx + b.w / 2 - 18, sy + b.h / 2 - 4, 18, 14);
      fill(255, 90, 140); ellipse(sx + b.w / 2 + 12, sy + b.h / 2 - 8, 14, 10);
    } else {
      for (let yy = 0; yy < Math.ceil(b.h / 30); yy++) {
        for (let xx = 0; xx < Math.ceil(b.w / 30); xx++) {
          fill((xx + yy) % 2 === 0 ? color(255, 210, 225) : color(255, 245, 240));
          const tx = sx + xx * 30, ty = sy + yy * 30;
          rect(tx, ty, Math.min(30, b.w - xx * 30), Math.min(30, b.h - yy * 30));
        }
      }
      fill(220, 60, 90); rect(sx + b.w / 2 - 24, sy + 60, 48, b.h - 70);
      fill(200, 160, 70); rect(sx + b.w / 2 - 50, sy + 50, 100, 60, 6);
      fill(240, 200, 100); rect(sx + b.w / 2 - 42, sy + 42, 84, 14, 4);
      for (let i = 0; i < 2; i++) {
        const cx = sx + 30 + i * (b.w - 60);
        fill(255, 220, 200); rect(cx - 6, sy + 24, 12, b.h - 48);
        fill(220, 180, 160); rect(cx - 10, sy + 20, 20, 6); rect(cx - 10, sy + b.h - 30, 20, 6);
      }
      fill(255, 240, 180, 180); ellipse(sx + b.w / 2, sy + 24, 50, 12);
      for (let i = 0; i < 4; i++) { fill(255, 220, 140, 200); ellipse(sx + b.w / 2 - 24 + i * 16, sy + 30, 6, 6); }
    }
    fill(b.roof[0], b.roof[1], b.roof[2]); rect(sx, sy, b.w, WALL_T, 4);
    const wallC = [b.color[0]-20, b.color[1]-20, b.color[2]-20];
    fill(wallC[0], wallC[1], wallC[2]);
    rect(sx, sy, WALL_T, b.h); rect(sx + b.w - WALL_T, sy, WALL_T, b.h);
    const dxL = b.door.x - b.x, dxR = b.door.x + b.door.w - b.x;
    rect(sx, sy + b.h - WALL_T, dxL, WALL_T);
    rect(sx + dxR, sy + b.h - WALL_T, b.w - dxR, WALL_T);
    fill(255, 255, 255, 220);
    for (let i = 0; i < Math.floor(b.w / 24); i++) ellipse(sx + 12 + i * 24, sy + WALL_T, 22, 10);
    fill(80, 45, 35); rect(sx + dxL - 2, sy + b.h - WALL_T, b.door.w + 4, WALL_T);
    fill(180, 60, 60); rect(sx + dxL + 4, sy + b.h - 2, b.door.w - 8, 6, 2);
    fill(0, 160); rect(sx + b.w / 2 - 50, sy - 16, 100, 14, 3);
    fill(255, 240, 180);
    textFont("Georgia"); textStyle(BOLD); textSize(11); textAlign(CENTER, CENTER);
    text(b.id === "kitchen" ? "Cuisine Royale" : "Salle du Trône", sx + b.w / 2, sy - 9);
    textStyle(NORMAL);
    fill(120, 200, 220);
    rect(sx - 1, sy + 80, 6, 24, 2); rect(sx + b.w - 5, sy + 80, 6, 24, 2);
    stroke(80, 30, 20); strokeWeight(1);
    line(sx + 2, sy + 80, sx + 2, sy + 104); line(sx + b.w - 2, sy + 80, sx + b.w - 2, sy + 104);
    noStroke();
  }
}

function drawIngredients() {
  for (const ing of ingredients) {
    if (ing.collected) continue;
    const sx = ing.x - cam.x, sy = ing.y - cam.y;
    // BUG fix : on est DANS le push() scale(0.6, 0.667), donc les coords sont
    // en monde [0..WORLD_W] x [0..WORLD_H], pas en canvas [0..VIEW_W]x[0..VIEW_H].
    if (sx < -60 || sx > WORLD_W + 60 || sy < -60 || sy > WORLD_H + 60) continue;
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.08);
    const bob = Math.sin(frameCount * 0.06) * 6;

    push();
    translate(sx, sy + bob);

    // ── HALO TRES voyant (rayon multiple) ──
    noStroke();
    for (let r = 0; r < 4; r++) {
      const a = (60 - r * 12) * (0.6 + pulse * 0.4);
      fill(ing.color[0], ing.color[1], ing.color[2], a);
      ellipse(0, 0, 90 + r * 30 + pulse * 14, 90 + r * 30 + pulse * 14);
    }

    // ── Ombre au sol ──
    fill(0, 100);
    ellipse(0, 22 - bob, 36, 8);

    // ── Etoile principale (plus grosse) ──
    fill(ing.color[0], ing.color[1], ing.color[2]);
    drawStar(0, 0, 11, 26, 5);

    // ── Coeur lumineux interieur ──
    fill(255, 255, 255, 180);
    drawStar(0, 0, 5, 12, 5);

    // ── Petites etincelles tournantes ──
    for (let i = 0; i < 4; i++) {
      const a = frameCount * 0.04 + i * (TWO_PI / 4);
      const r = 38 + pulse * 6;
      const ex = Math.cos(a) * r;
      const ey = Math.sin(a) * r;
      fill(255, 255, 255, 200);
      ellipse(ex, ey, 5, 5);
    }

    // ── Fleche flottante au-dessus ──
    const arrowY = -52 - pulse * 6;
    fill(ing.color[0], ing.color[1], ing.color[2]);
    triangle(-10, arrowY, 10, arrowY, 0, arrowY + 16);
    fill(255);
    triangle(-6, arrowY + 2, 6, arrowY + 2, 0, arrowY + 12);

    // ── Label encadre — on compense le scale parent (0.6, 0.667) pour
    //    avoir un texte non deforme et lisible meme dans la bande centrale.
    push();
    scale(1 / WORLD_TO_PLANET_SX, 1 / WORLD_TO_PLANET_SY);
    const label = ing.id;
    textFont("Georgia"); textStyle(BOLD); textSize(22); textAlign(CENTER, TOP);
    const lw = textWidth(label) + 30;
    fill(0, 215);
    rect(-lw / 2, 28, lw, 34, 8);
    stroke(ing.color[0], ing.color[1], ing.color[2], 230); strokeWeight(2); noFill();
    rect(-lw / 2, 28, lw, 34, 8);
    noStroke();
    fill(255, 240, 220);
    text(label, 0, 34);

    // ── Texte d'invitation ──
    textSize(14); textStyle(NORMAL);
    fill(255, 255, 255, 200 + pulse * 55);
    text("[E] Ramasser", 0, 66);
    textStyle(NORMAL);
    pop();

    pop();
  }
}

function drawStar(x, y, r1, r2, n) {
  beginShape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TWO_PI - HALF_PI;
    const r = i % 2 === 0 ? r2 : r1;
    vertex(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  endShape(CLOSE);
}

function drawNPCs() {
  drawNpcConfiturio(confiturio.x - cam.x, confiturio.y - cam.y);
  baron.x += 0.3 * baron.dir;
  if (baron.x > 1750 || baron.x < 1450) baron.dir *= -1;
  drawNpcBaron(baron.x - cam.x, baron.y - cam.y);
}

function drawNpcConfiturio(sx, sy) {
  noStroke();
  fill(0, 90); ellipse(sx, sy + 16, 30, 8);
  fill(230, 130, 60); rect(sx - 14, sy - 14, 28, 30, 4);
  fill(255, 220, 200); ellipse(sx, sy - 22, 24, 24);
  fill(255); ellipse(sx, sy - 36, 22, 14); rect(sx - 9, sy - 32, 18, 6);
  fill(90, 50, 30); ellipse(sx - 4, sy - 17, 7, 3); ellipse(sx + 4, sy - 17, 7, 3);
  fill(0); ellipse(sx - 4, sy - 24, 2, 2); ellipse(sx + 4, sy - 24, 2, 2);
  if (gameState === "LIVRAISON" && !flags.confituriArrivedShown) drawMarker(sx, sy - 50, "!");
  if (gameState === "RECOLTE") drawMarker(sx, sy - 50, "?");
}

function drawNpcKing(sx, sy) {
  noStroke();
  const bob = Math.sin(frameCount * 0.04) * 1.2;

  // Ombre
  fill(0, 110);
  ellipse(sx, sy + 26, 64, 12);

  // Cape royale (derriere le corps)
  fill(170, 40, 60);
  beginShape();
  vertex(sx - 28, sy - 8);
  vertex(sx + 28, sy - 8);
  vertex(sx + 36, sy + 26);
  vertex(sx - 36, sy + 26);
  endShape(CLOSE);
  // doublure dore
  fill(255, 220, 130, 180);
  rect(sx - 24, sy - 6, 48, 4);

  // Corps : tunique royale doree
  fill(232, 192, 88);
  rect(sx - 22, sy - 14 + bob, 44, 38, 6);
  // motifs
  fill(160, 110, 30, 160);
  rect(sx - 22, sy - 4 + bob, 44, 2);
  fill(200, 60, 90);
  ellipse(sx, sy + 6 + bob, 8, 8);
  // ceinture
  fill(120, 60, 30);
  rect(sx - 22, sy + 12 + bob, 44, 5);
  fill(255, 215, 110);
  rect(sx - 3, sy + 12 + bob, 6, 5);

  // Col en hermine
  fill(255);
  rect(sx - 22, sy - 14 + bob, 44, 6, 3);
  fill(40, 30, 20);
  for (let i = 0; i < 5; i++) ellipse(sx - 16 + i * 8, sy - 11 + bob, 2.5, 2);

  // Tete
  fill(255, 222, 200);
  ellipse(sx, sy - 28 + bob, 34, 36);
  // Barbe
  fill(245, 240, 230);
  beginShape();
  vertex(sx - 14, sy - 22 + bob);
  vertex(sx - 10, sy - 6 + bob);
  vertex(sx, sy - 2 + bob);
  vertex(sx + 10, sy - 6 + bob);
  vertex(sx + 14, sy - 22 + bob);
  vertex(sx + 8, sy - 26 + bob);
  vertex(sx - 8, sy - 26 + bob);
  endShape(CLOSE);
  // Moustache
  fill(245, 240, 230);
  ellipse(sx - 6, sy - 19 + bob, 9, 4);
  ellipse(sx + 6, sy - 19 + bob, 9, 4);

  // Yeux
  fill(0);
  ellipse(sx - 6, sy - 30 + bob, 3, 3.5);
  ellipse(sx + 6, sy - 30 + bob, 3, 3.5);
  fill(255);
  ellipse(sx - 5, sy - 31 + bob, 1, 1);
  ellipse(sx + 7, sy - 31 + bob, 1, 1);

  // Sourcils selon humeur
  stroke(80, 50, 30); strokeWeight(2);
  if (king.mood === "angry") {
    line(sx - 10, sy - 35 + bob, sx - 3, sy - 33 + bob);
    line(sx + 3, sy - 33 + bob, sx + 10, sy - 35 + bob);
  } else {
    line(sx - 10, sy - 35 + bob, sx - 3, sy - 36 + bob);
    line(sx + 3, sy - 36 + bob, sx + 10, sy - 35 + bob);
  }
  noStroke();

  // Bouche selon humeur
  noFill(); stroke(120, 50, 30); strokeWeight(2);
  if (king.mood === "joyful")      arc(sx, sy - 16 + bob, 12, 6, 0, PI);
  else if (king.mood === "ecstatic") { noStroke(); fill(140, 40, 50); ellipse(sx, sy - 15 + bob, 8, 10); }
  else if (king.mood === "angry")  arc(sx, sy - 14 + bob, 12, 8, PI, TWO_PI);
  else                              arc(sx, sy - 16 + bob, 10, 4, 0, PI);
  noStroke();

  // Couronne ─ design plus riche
  const cy = sy - 46 + bob;
  fill(255, 195, 70);                     // base or
  rect(sx - 18, cy, 36, 8, 2);
  fill(220, 160, 40);                     // ombre sous-bande
  rect(sx - 18, cy + 6, 36, 2);
  // Pointes
  fill(255, 215, 90);
  triangle(sx - 18, cy, sx - 12, cy - 12, sx - 6, cy);
  triangle(sx - 6,  cy, sx,      cy - 16, sx + 6,  cy);
  triangle(sx + 6,  cy, sx + 12, cy - 12, sx + 18, cy);
  // Joyaux sur la couronne
  fill(220, 50, 80);  ellipse(sx - 12, cy - 10, 4, 5);
  fill(80, 180, 230); ellipse(sx,      cy - 13, 4.5, 6);
  fill(80, 200, 120); ellipse(sx + 12, cy - 10, 4, 5);
  // Eclat dore
  fill(255, 240, 180, 180);
  ellipse(sx, cy + 3, 36, 3);

  // Marqueur "!" si l'amuse-bouche est pret a etre apporte
  if (gameState === "RECOLTE" && ingredients.every(i => i.collected) && mixingDone && !flags.degustationStartShown) drawMarker(sx, sy - 66 + bob, "!");
  // Marqueur "!" si un plat du menu peut etre livre
  const platALivrer = flags.menuAnnounced && !flags.crystalObtained && (
    (typeof westState !== "undefined" && westState.cakeBaked && !flags.westCakeDelivered) ||
    (typeof eastState !== "undefined" && eastState.complete && !flags.eastSaltDelivered) ||
    (heartCollected && !flags.heartDelivered)
  );
  if (platALivrer) drawMarker(sx, sy - 66 + bob, "!");
}

function drawNpcBaron(sx, sy) {
  noStroke();
  fill(0, 100); ellipse(sx, sy + 18, 30, 8);
  fill(15, 10, 22);
  beginShape();
  vertex(sx - 16, sy - 14); vertex(sx + 16, sy - 14);
  vertex(sx + 22, sy + 18); vertex(sx - 22, sy + 18);
  endShape(CLOSE);
  fill(28, 22, 32); rect(sx - 8, sy - 14, 16, 32, 2);
  fill(180, 180, 190); ellipse(sx, sy - 22, 20, 20);
  fill(0); ellipse(sx - 4, sy - 22, 3, 3); ellipse(sx + 4, sy - 22, 3, 3);
}

function drawMarker(sx, sy, glyph) {
  const float = Math.sin(frameCount * 0.1) * 4;
  fill(255, 230, 100); ellipse(sx, sy + float, 16, 16);
  fill(60, 40, 10);
  textFont("Georgia"); textStyle(BOLD); textSize(14); textAlign(CENTER, CENTER);
  text(glyph, sx, sy + float - 1); textStyle(NORMAL);
}

function drawAltar() {
  const sx = altar.x - cam.x, sy = altar.y - cam.y;
  if (sx < -60 || sx > WORLD_W + 60 || sy < -60 || sy > WORLD_H + 60) return;
  fill(0, 120); ellipse(sx, sy + 24, 70, 14);
  fill(10, 5, 15); rect(sx - 28, sy - 6, 56, 30, 4);
  fill(20, 10, 30); rect(sx - 32, sy + 18, 64, 8, 3);
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.05);
  noStroke();
  fill(160, 60, 220, 100 + pulse * 100);
  ellipse(sx, sy - 16, 60 + pulse * 14, 36 + pulse * 10);
  if (!heartCollected && trials[0] && trials[1] && trials[2]) {
    fill(0); ellipse(sx, sy - 18, 22, 22);
    fill(160, 60, 220, 140 + pulse * 80); ellipse(sx, sy - 18, 32 + pulse * 6, 32 + pulse * 6);
    fill(255, 200, 255, 200); ellipse(sx - 4, sy - 22, 5, 3);
  } else if (!heartCollected) {
    fill(40, 30, 40); ellipse(sx, sy - 18, 16, 16);
  }
}

function drawTrialVisuals() {
  if (gameState !== "SURVIE") return;
  if (currentTrial === 0 && !trials[0] && trialState.barriers) {
    for (const b of trialState.barriers) {
      const sy = b.y - cam.y;
      fill(120, 120, 130, 200);
      rect(-cam.x, sy - 6, b.gapX, 12);
      rect(b.gapX + b.gapW - cam.x, sy - 6, WORLD_W - (b.gapX + b.gapW), 12);
    }
  }
  if (currentTrial === 2 && !trials[2] && trialState.guards) {
    for (const g of trialState.guards) {
      const sx = g.x - cam.x, sy = g.y - cam.y;
      fill(0, 100); ellipse(sx, sy + 14, 26, 7);
      fill(10, 10, 12); rect(sx - 12, sy - 12, 24, 28, 3);
      fill(220, 30, 30); ellipse(sx - 5, sy - 4, 4, 4); ellipse(sx + 5, sy - 4, 4, 4);
    }
  }
}

// Sprite heros (Zyx) unifie — appele depuis toutes les zones pour garder un design coherent.
function drawHeroSprite(sx, sy, facing, walkPhase) {
  noStroke();
  fill(0, 110); ellipse(sx, sy + 12, 24, 7);
  push();
  translate(sx, sy + Math.sin(walkPhase) * 1.5);
  fill(180, 90, 130); rect(-9, -6, 18, 18, 3);              // torse mauve
  fill(255, 220, 90); rect(-9, 6, 18, 3);                   // ceinture
  fill(255, 220, 200); ellipse(0, -14, 18, 18);              // tete
  fill(70, 30, 100); arc(0, -16, 20, 18, PI, TWO_PI);        // cheveux
  fill(80, 220, 230);                                        // foulard / regard
  if (facing === 2)      rect(0, -17, 7, 4, 1);
  else if (facing === 1) rect(-7, -17, 7, 4, 1);
  else if (facing === 3) rect(-6, -19, 12, 3, 1);
  else                   rect(-6, -15, 12, 4, 1);
  if (facing === 3) { fill(120, 50, 80); rect(-7, -8, 14, 6, 2); } // sac de dos vu de dos
  pop();
}

function drawPlayer() {
  drawHeroSprite(player.x - cam.x, player.y - cam.y, player.facing, player.walkPhase);
}

function drawAngryVignette() {
  for (let i = 0; i < 30; i++) {
    fill(180, 30, 50, 4);
    rect(i, i, VIEW_W - i * 2, VIEW_H - i * 2);
  }
}

// ---------- HUD ----------
function drawInteractPrompt() {
  if (!interactPrompt) return;
  let sx;
  let sy;

  if (interactPrompt.interior) {
    const p = interiorSceneToScreen(interactPrompt.x, interactPrompt.y);
    sx = p.x;
    sy = p.y;
  } else if (interactPrompt.south) {
    const fit = getSouthSceneFit();
    sx = interactPrompt.x * fit.sx;
    sy = interactPrompt.y * fit.sy;
  } else if (interactPrompt.west) {
    const fit = getWestSceneFit();
    sx = interactPrompt.x * fit.sx;
    sy = interactPrompt.y * fit.sy;
  } else if (interactPrompt.east) {
    const fit = fitSceneFill(EAST_W, EAST_H);
    sx = interactPrompt.x * fit.sx;
    sy = interactPrompt.y * fit.sy;
  } else {
    sx = (interactPrompt.x - cam.x) * WORLD_TO_PLANET_SX;
    sy = (interactPrompt.y - cam.y) * WORLD_TO_PLANET_SY;
  }
  textFont("monospace"); textSize(11); textStyle(BOLD); textAlign(CENTER, CENTER);
  const w = textWidth(interactPrompt.label) + 16;
  fill(0, 200); rect(sx - w / 2, sy - 10, w, 20, 4);
  fill(255, 240, 200); text(interactPrompt.label, sx, sy); textStyle(NORMAL);
}

// Legacy bush hint kept for reference; overridden below by the integrated west version.
function drawBushHintLegacy() {
  if (scene !== "world" || !bushes || !flags.bushesUnlocked) return;
  for (const b of bushes) {
    if (!b.isFullyOpen()) {
      const distToBush = dist(player.x, player.y, b.baseX, b.baseY);
      if (distToBush < 200) {
        const openPercent = map(b.openAmount, 0, 260, 0, 100);
        const sx = b.baseX - cam.x;
        const sy = b.baseY - cam.y - 50;
        textFont("monospace"); textSize(10); textAlign(CENTER, BOTTOM);
        if (openPercent < 100) {
          fill(255, 200, 100);
          text("💨 Soufflez! (" + Math.floor(openPercent) + "%)", sx, sy);
        }
        break;
      }
    }
  }
}

// ───── Objectif courant (guide le joueur) ─────
// Retourne { text, target: {x, y} | null }. La target est en coords monde quand on est en scene "world".
function getCurrentObjective() {
  if (flags.crystalObtained) {
    return { text: "Felicitations ! Le Cristal Sacre est a toi.", target: null };
  }
  if (flags.menuAnnounced) {
    // Priorite : aller livrer un plat pret au Roi
    const platPret = (typeof westState !== "undefined" && westState.cakeBaked && !flags.westCakeDelivered) ||
                     (typeof eastState !== "undefined" && eastState.complete && !flags.eastSaltDelivered) ||
                     (heartCollected && !flags.heartDelivered);
    if (platPret) {
      return { text: "Apporte le plat au Roi (sud → chateau)", target: { x: southGate.centerX, y: WORLD_H - 30 } };
    }
    if (!flags.westCakeDelivered) {
      return { text: "Plat 1 : Va voir Chef Marshmallow (ouest)", target: { x: 50, y: (BITTER_LINE_Y + WORLD_H) / 2 } };
    }
    if (!flags.eastSaltDelivered) {
      return { text: "Plat 2 : Va voir Chef Sali (est)", target: { x: WORLD_W - 50, y: (BITTER_LINE_Y + WORLD_H) / 2 } };
    }
    if (!flags.heartDelivered) {
      if (!heartCollected) return { text: "Plat 3 : Va affronter le Baron (nord)", target: { x: altar.x, y: altar.y } };
      return { text: "Apporte le Coeur de Reglisse au Roi !", target: { x: southGate.centerX, y: WORLD_H - 30 } };
    }
  }
  // Phase pre-menu
  if (gameState === "LIVRAISON") {
    if (!flags.confituriArrivedShown) {
      return { text: "Va voir Confiturio dans la cuisine", target: { x: 990, y: 1180 } };
    }
  }
  if (gameState === "RECOLTE") {
    const restants = ingredients.filter(i => !i.collected);
    if (restants.length > 0) {
      return { text: "Recolte les " + restants.length + " ingredient(s) restant(s)", target: { x: restants[0].x, y: restants[0].y } };
    }
    if (!mixingDone) return { text: "Retourne en cuisine pour melanger", target: { x: 990, y: 1180 } };
    return { text: "Apporte le Souffle au Roi (sud → chateau)", target: { x: southGate.centerX, y: WORLD_H - 30 } };
  }
  return { text: "", target: null };
}

// Petite fleche en HUD pointant vers la target (en monde) depuis le joueur.
function drawObjectiveArrow(obj) {
  if (!obj || !obj.target || scene !== "world") return;
  const dx = obj.target.x - player.x;
  const dy = obj.target.y - player.y;
  const d = Math.hypot(dx, dy);
  if (d < 80) return; // proche : pas besoin de fleche
  const angle = Math.atan2(dy, dx);
  const sx = player.x - cam.x;
  const sy = player.y - cam.y - 60;
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.12);

  push();
  translate(sx, sy);
  // Anneau pulsant autour du joueur
  noFill();
  stroke(255, 220, 120, 80 + pulse * 100);
  strokeWeight(2);
  ellipse(0, 0, 70 + pulse * 12, 70 + pulse * 12);
  noStroke();

  // Fleche dirigee — plus grosse
  push();
  rotate(angle);
  fill(0, 200);
  triangle(48, 0, 12, -22, 12, 22);
  fill(255, 220, 120, 240);
  triangle(40, 0, 16, -18, 16, 18);
  fill(255, 250, 220);
  rect(-12, -7, 28, 14, 3);
  pop();

  // Distance — compense le scale pour rester lisible
  push();
  scale(1 / WORLD_TO_PLANET_SX, 1 / WORLD_TO_PLANET_SY);
  fill(0, 200);
  rect(-44, -56, 88, 28, 6);
  fill(255, 230, 150);
  textFont("monospace"); textSize(18); textAlign(CENTER, CENTER); textStyle(BOLD);
  text(Math.floor(d / 60) + " m", 0, -42);
  textStyle(NORMAL);
  pop();
  pop();
}

function drawHUD() {
  // En dehors du monde principal (mini-jeux), on n'affiche que le bandeau du
  // haut (etat / score). Le reste (inventaire, menu, objectif, drain) cacherait
  // le mini-jeu, donc on le masque.
  const isWorld = (scene === "world");

  // ── BANDEAU SUPERIEUR : etat / score / emotion (centre sur ecran central) ──
  noStroke(); fill(0, 200); rect(CENTER_X0, 0, SCREEN_W, 42);
  stroke(255, 200, 120, 120); strokeWeight(1); line(CENTER_X0, 42, CENTER_X0 + SCREEN_W, 42); noStroke();
  let stateColor = [255, 120, 180];
  if (gameState === "RECOLTE") stateColor = [120, 220, 140];
  else if (gameState === "DEGUSTATION") stateColor = [240, 200, 90];
  else if (gameState === "MENU") stateColor = [255, 200, 120];
  else if (gameState === "SURVIE") stateColor = [200, 180, 200];
  textFont("monospace"); textStyle(BOLD); textSize(16); textAlign(LEFT, CENTER);
  fill(stateColor[0], stateColor[1], stateColor[2]);
  text(gameState, CENTER_X0 + 18, 21);
  fill(255); textAlign(CENTER, CENTER); textStyle(NORMAL); textSize(15);
  text("SCORE  " + Math.floor(score), VIEW_W / 2, 21);
  textAlign(RIGHT, CENTER); fill(200, 230, 255);
  text(`${emotionDetected.toUpperCase()}  ${(emotionHappy * 100).toFixed(0)}%`, CENTER_X1 - 18, 21);

  // Hors du monde : on s'arrete ici (les mini-jeux ont leurs propres HUD).
  if (!isWorld) {
    if (scene === "west") drawWestZoneBadge();
    else if (scene === "south") drawSouthZoneBadge();
    return;
  }

  // ── INVENTAIRE (sous bandeau, en haut a gauche de l'ecran CENTRAL) ──
  const invX = CENTER_X0 + 12;
  const invY = 116;  // sous le panneau OBJECTIF (qui est en y=44-104)
  const invW = 360;
  fill(0, 170); rect(invX, invY, invW, 38, 8);
  stroke(255, 220, 120, 150); strokeWeight(1.5); noFill();
  rect(invX, invY, invW, 38, 8);
  noStroke();
  fill(255, 240); textFont("monospace"); textSize(13); textAlign(LEFT, CENTER); textStyle(BOLD);
  text("INVENTAIRE", invX + 12, invY + 19);
  textStyle(NORMAL);
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    const cx = invX + 140 + i * 28, cy = invY + 19;
    if (ing.collected) {
      fill(ing.color[0], ing.color[1], ing.color[2]); ellipse(cx, cy, 20, 20);
      stroke(255); strokeWeight(2.5); noFill();
      line(cx - 5, cy, cx - 1, cy + 5); line(cx - 1, cy + 5, cx + 6, cy - 4); noStroke();
    } else {
      noFill(); stroke(ing.color[0], ing.color[1], ing.color[2], 200); strokeWeight(2);
      ellipse(cx, cy, 20, 20); noStroke();
    }
  }
  if (heartCollected) {
    const cx = invX + 140 + ingredients.length * 28;
    fill(50, 20, 70); ellipse(cx, invY + 19, 22, 22);
    fill(180, 80, 220); ellipse(cx, invY + 19, 12, 12);
  }

  // ─── Tracker Menu Cosmique (en dessous de l'inventaire) ───
  if (flags.menuAnnounced) {
    const mx = CENTER_X0 + 12;
    const my = invY + 48;
    const mw = 600;
    fill(0, 180); rect(mx, my, mw, 40, 8);
    stroke(255, 220, 120, 200); strokeWeight(2); noFill();
    rect(mx, my, mw, 40, 8);
    noStroke();
    fill(255, 220, 130); textFont("monospace"); textSize(13); textAlign(LEFT, CENTER); textStyle(BOLD);
    text("MENU DU ROI", mx + 12, my + 20);
    textStyle(NORMAL);
    const slots = [
      { label: "Gateau",    done: flags.westCakeDelivered, color: menu.cake.color },
      { label: "Umami",     done: flags.eastSaltDelivered, color: menu.salt.color },
      { label: "Reglisse",  done: flags.heartDelivered,    color: menu.heart.color }
    ];
    for (let i = 0; i < slots.length; i++) {
      const sx = mx + 150 + i * 140;
      const s = slots[i];
      if (s.done) {
        fill(s.color[0], s.color[1], s.color[2]); ellipse(sx, my + 20, 16, 16);
        fill(120, 220, 140); textSize(13); textAlign(LEFT, CENTER); textStyle(BOLD);
        text("✓ " + s.label, sx + 12, my + 20);
        textStyle(NORMAL);
      } else {
        noFill(); stroke(s.color[0], s.color[1], s.color[2], 220); strokeWeight(2);
        ellipse(sx, my + 20, 16, 16); noStroke();
        fill(220, 200, 180); textSize(13); textAlign(LEFT, CENTER);
        text(s.label, sx + 12, my + 20);
      }
    }
  }

  // ─── DRAIN BARON (en dessous de l'inventaire, alligne a droite) ──
  if (gameState === "SURVIE") {
    const bx = CENTER_X1 - 280;
    const by = invY;
    fill(0, 180); rect(bx, by, 268, 38, 8);
    stroke(180, 80, 220, 200); strokeWeight(2); noFill();
    rect(bx, by, 268, 38, 8);
    noStroke();
    fill(255, 240); textAlign(LEFT, CENTER); textFont("monospace"); textSize(12); textStyle(BOLD);
    text("DRAIN BARON", bx + 12, by + 12);
    textStyle(NORMAL);
    fill(60, 30, 80); rect(bx + 12, by + 22, 180, 10, 3);
    fill(180, 80, 220); rect(bx + 12, by + 22, 180 * baronDrainLevel, 10, 3);
    for (let i = 0; i < 3; i++) {
      const tx = bx + 220 + i * 16, ty = by + 19;
      if (trials[i]) fill(120, 220, 140);
      else if (currentTrial === i) fill(240, 200, 90);
      else fill(80, 80, 90);
      ellipse(tx, ty, 12, 12);
    }
  }
  if (scene === "world") {
    drawMiniMap();
    drawEdgeTransitionArrows();
  }
  else if (scene === "west") drawWestZoneBadge();
  else if (scene === "south") drawSouthZoneBadge();

  // ─── Panneau "Objectif courant" (gros, centre sur l'ecran central CAVE,
  //     sous le bandeau du haut, au-dessus de l'inventaire) ───
  const obj = getCurrentObjective();
  if (obj && obj.text) {
    const pw = 1200;
    const px = CENTER_X0 + (SCREEN_W - pw) / 2;
    const py = 52;
    const ph = 60;
    fill(0, 210); rect(px, py, pw, ph, 12);
    stroke(255, 220, 120, 230); strokeWeight(3); noFill();
    rect(px, py, pw, ph, 12); noStroke();
    fill(255, 220, 120); textFont("Georgia"); textStyle(BOLD); textSize(22); textAlign(LEFT, CENTER);
    text("OBJECTIF :", px + 22, py + ph / 2);
    textStyle(NORMAL); fill(255, 245, 220); textSize(22);
    text(obj.text, px + 180, py + ph / 2);
  }
}

// Grosses fleches clignotantes en bord d'ecran quand on est proche d'une transition.
// "Traverse l'ecran pour changer de monde !"
function drawEdgeTransitionArrows() {
  if (scene !== "world") return;
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.12);
  const PROX = 360; // distance d'apparition

  const arrows = [
    {
      dir: "left",  label: "OUEST", color: [255, 180, 210],
      visible: flags.bushesUnlocked && player.x < PROX && player.y >= westGate.minY && player.y <= westGate.maxY
    },
    {
      dir: "right", label: "EST",   color: [240, 220, 180],
      visible: flags.bushesUnlocked && isEastGateOpen() && player.x > WORLD_W - PROX && player.y >= eastGate.minY && player.y <= eastGate.maxY
    },
    {
      dir: "down",  label: "SUD (Roi)", color: [255, 230, 130],
      visible: player.y > WORLD_H - PROX && player.x >= southGate.minX - 100 && player.x <= southGate.maxX + 100
    },
    {
      dir: "up",    label: "NORD (Baron)", color: [180, 80, 220],
      visible: flags.menuAnnounced && !flags.heartDelivered && player.y < BITTER_LINE_Y + PROX
    }
  ];

  for (const a of arrows) {
    if (!a.visible) continue;
    push();
    if (a.dir === "left")  translate(40, VIEW_H / 2);
    if (a.dir === "right") translate(VIEW_W - 40, VIEW_H / 2);
    if (a.dir === "down")  translate(VIEW_W / 2, VIEW_H - 70);
    if (a.dir === "up")    translate(VIEW_W / 2, 90);
    // Anim
    const off = pulse * 12;
    if (a.dir === "left")  translate(-off, 0);
    if (a.dir === "right") translate(off, 0);
    if (a.dir === "down")  translate(0, off);
    if (a.dir === "up")    translate(0, -off);

    // Rotation pour orienter la fleche
    if (a.dir === "right") rotate(0);
    if (a.dir === "down")  rotate(HALF_PI);
    if (a.dir === "left")  rotate(PI);
    if (a.dir === "up")    rotate(-HALF_PI);

    // Fleche
    noStroke();
    fill(0, 200);
    rect(-50, -22, 100, 44, 8);
    fill(a.color[0], a.color[1], a.color[2], 200 + pulse * 55);
    beginShape();
    vertex(40, 0); vertex(10, -22); vertex(10, -10); vertex(-40, -10);
    vertex(-40, 10); vertex(10, 10); vertex(10, 22);
    endShape(CLOSE);
    pop();

    // Label (non rotate)
    push();
    if (a.dir === "left")  translate(120, VIEW_H / 2);
    if (a.dir === "right") translate(VIEW_W - 120, VIEW_H / 2);
    if (a.dir === "down")  translate(VIEW_W / 2, VIEW_H - 130);
    if (a.dir === "up")    translate(VIEW_W / 2, 150);
    fill(0, 180);
    rectMode(CENTER);
    rect(0, 0, 140, 24, 5);
    rectMode(CORNER);
    fill(a.color[0], a.color[1], a.color[2]);
    textFont("monospace"); textStyle(BOLD); textSize(12); textAlign(CENTER, CENTER);
    text("→ " + a.label, 0, 0);
    textStyle(NORMAL);
    pop();
  }
}

// Grands panneaux indicateurs aux portes des 3 zones, visibles en monde.
// Aide a se reperer : icone + nom de zone + statut (verrou / pret / livre).
function drawZonePortals() {
  if (scene !== "world") return;

  const portals = [
    {
      label: "OUEST",
      sub: "Sweet Island",
      icon: "🍰",
      worldX: westGate.xTrigger + 60,
      worldY: (westGate.minY + westGate.maxY) / 2,
      unlocked: flags.bushesUnlocked,
      done: flags.westCakeDelivered,
      color: [255, 180, 210]
    },
    {
      label: "EST",
      sub: "Cuisine de Sali",
      icon: "🧂",
      worldX: eastGate.xTrigger - 60,
      worldY: (eastGate.minY + eastGate.maxY) / 2,
      unlocked: flags.bushesUnlocked,
      done: flags.eastSaltDelivered,
      color: [240, 220, 180]
    },
    {
      label: "SUD",
      sub: "Chateau du Roi",
      icon: "👑",
      worldX: southGate.centerX,
      worldY: WORLD_H - 70,
      unlocked: true,
      done: flags.crystalObtained,
      color: [255, 230, 130]
    },
    {
      label: "NORD",
      sub: "Zone du Baron",
      icon: "🌑",
      worldX: WORLD_W / 2,
      worldY: BITTER_LINE_Y - 40,
      unlocked: flags.menuAnnounced,
      done: flags.heartDelivered,
      color: [180, 80, 220]
    }
  ];

  for (const p of portals) {
    const sx = p.worldX - cam.x;
    const sy = p.worldY - cam.y;
    if (sx < -120 || sx > WORLD_W + 120 || sy < -80 || sy > WORLD_H + 80) continue;

    const pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.05);
    // Pied (poteau)
    fill(80, 50, 30);
    rect(sx - 3, sy - 4, 6, 50);

    // Panneau — compense le scale parent pour rester lisible
    push();
    translate(sx, sy - 60);
    scale(1 / WORLD_TO_PLANET_SX, 1 / WORLD_TO_PLANET_SY);

    // Halo si non-livre et debloque
    if (p.unlocked && !p.done) {
      noStroke();
      fill(p.color[0], p.color[1], p.color[2], 60 + pulse * 80);
      ellipse(0, 6, 200, 110);
    }
    // Plaque (plus large pour 2 lignes)
    fill(p.done ? color(80, 50, 90) : (p.unlocked ? color(40, 20, 40) : color(30, 20, 30)));
    stroke(p.color[0], p.color[1], p.color[2], p.unlocked ? 230 : 120);
    strokeWeight(3);
    rect(-86, -24, 172, 58, 8);
    noStroke();
    // Icone
    textFont("Georgia"); textStyle(BOLD); textSize(24); textAlign(LEFT, CENTER);
    fill(p.unlocked ? 255 : 120);
    text(p.icon, -78, 6);
    // Label + sous-titre
    fill(p.color[0], p.color[1], p.color[2], p.unlocked ? 255 : 120);
    textFont("monospace"); textStyle(BOLD); textSize(16); textAlign(LEFT, TOP);
    text(p.label, -44, -18);
    textStyle(NORMAL); textSize(12);
    fill(p.unlocked ? 230 : 130);
    text(p.sub, -44, 4);
    // Statut
    if (p.done) {
      fill(120, 220, 140);
      textFont("monospace"); textStyle(BOLD); textSize(15); textAlign(RIGHT, BOTTOM);
      text("LIVRE ✓", 78, 28);
    } else if (!p.unlocked) {
      fill(220, 100, 100);
      textFont("monospace"); textStyle(BOLD); textSize(14); textAlign(RIGHT, BOTTOM);
      text("VERROU", 78, 28);
    }
    textStyle(NORMAL);
    pop();
  }
}

function drawMiniMap() {
  // Mini-map en bas-droite de l'ECRAN CENTRAL CAVE
  const radius = 70;
  const cx = CENTER_X1 - radius - 24;
  const cy = VIEW_H - radius - 30;

  noStroke();
  fill(0, 165);
  ellipse(cx, cy, radius * 2 + 20, radius * 2 + 20);

  for (let py = -radius; py <= radius; py += 2) {
    const yRatio = py / radius;
    const halfWidth = Math.sqrt(Math.max(0, 1 - yRatio * yRatio)) * radius;
    const worldY = map(yRatio, -1, 1, 0, WORLD_H);
    if (worldY < BITTER_LINE_Y) fill(48, 42, 78, 230);
    else fill(currentPalette.grass[0], currentPalette.grass[1], currentPalette.grass[2], 230);
    rect(cx - halfWidth, cy + py, halfWidth * 2, 2);
  }

  fill(currentPalette.path[0], currentPalette.path[1], currentPalette.path[2], 170);
  for (let i = 0; i < 5; i++) {
    const pathPoint = mapWorldToMiniPlanet(1800 + i * 220, 1420 + i * 70, cx, cy, radius);
    ellipse(pathPoint.x, pathPoint.y, 5, 3);
  }

  for (const b of buildings) {
    const marker = mapWorldToMiniPlanet(b.x + b.w / 2, b.y + b.h / 2, cx, cy, radius);
    fill(b.color[0], b.color[1], b.color[2]);
    ellipse(marker.x, marker.y, 7, 7);
  }

  const southMarker = mapWorldToMiniPlanet(southGate.centerX, WORLD_H - 30, cx, cy, radius);
  fill(255, 220, 120);
  ellipse(southMarker.x, southMarker.y, 8, 8);

  for (const ing of ingredients) {
    if (ing.collected) continue;
    const marker = mapWorldToMiniPlanet(ing.x, ing.y, cx, cy, radius);
    fill(ing.color[0], ing.color[1], ing.color[2]);
    ellipse(marker.x, marker.y, 5, 5);
  }

  const altarMarker = mapWorldToMiniPlanet(altar.x, altar.y, cx, cy, radius);
  fill(180, 80, 220);
  ellipse(altarMarker.x, altarMarker.y, 7, 7);

  const playerMarker = mapWorldToMiniPlanet(player.x, player.y, cx, cy, radius);
  fill(80, 220, 230);
  ellipse(playerMarker.x, playerMarker.y, 9, 9);

  fill(255, 255, 255, 35);
  ellipse(cx - radius * 0.28, cy - radius * 0.38, radius * 0.7, radius * 0.42);

  noFill();
  stroke(255, 95);
  strokeWeight(2);
  ellipse(cx, cy, radius * 2, radius * 2);
  stroke(255, 35);
  strokeWeight(1);
  ellipse(cx, cy, radius * 1.76, radius * 1.76);
  noStroke();

  fill(220, 200, 255);
  textFont("monospace");
  textSize(9);
  textAlign(CENTER, BOTTOM);
  textStyle(BOLD);
  text("PLANETE", cx, cy - radius - 6);
  textStyle(NORMAL);
}

function drawWestZoneBadge() {
  const bw = 220, bh = 70;
  const bx = CENTER_X1 - bw - 16, by = VIEW_H - bh - 16;
  fill(0, 200);
  rect(bx, by, bw, bh, 8);
  stroke(255, 180, 210, 220); strokeWeight(2); noFill();
  rect(bx, by, bw, bh, 8); noStroke();
  fill(255, 200, 230);
  textFont("monospace"); textSize(15); textStyle(BOLD); textAlign(LEFT, TOP);
  text("ZONE OUEST", bx + 12, by + 10);
  textStyle(NORMAL);
  fill(220, 200, 255);
  textSize(12);
  text("Sweet Island", bx + 12, by + 32);
  text("Pancarte = retour", bx + 12, by + 50);
}

function drawSouthZoneBadge() {
  const bw = 220, bh = 70;
  const bx = CENTER_X1 - bw - 16, by = VIEW_H - bh - 16;
  fill(0, 200);
  rect(bx, by, bw, bh, 8);
  stroke(255, 220, 130, 220); strokeWeight(2); noFill();
  rect(bx, by, bw, bh, 8); noStroke();
  fill(255, 230, 150);
  textFont("monospace"); textSize(15); textStyle(BOLD); textAlign(LEFT, TOP);
  text("ZONE SUD", bx + 12, by + 10);
  textStyle(NORMAL);
  fill(220, 200, 255);
  textSize(12);
  text("Chateau du Roi", bx + 12, by + 32);
  text("Retour = pancarte", bx + 12, by + 50);
}

function mapWorldToMiniPlanet(worldX, worldY, centerX, centerY, radius) {
  const normalizedY = map(worldY, 0, WORLD_H, -1, 1);
  const horizontalRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY)) * radius * 0.94;
  const normalizedX = map(worldX, 0, WORLD_W, -1, 1);
  return {
    x: centerX + normalizedX * horizontalRadius,
    y: centerY + normalizedY * radius * 0.94
  };
}

function drawBushHint() {
  if (scene !== "world" || !flags.bushesUnlocked) return;
  const showHint = (b, fallbackText) => {
    if (b.isFullyOpen()) return false;
    const distToBush = dist(player.x, player.y, b.baseX, b.baseY);
    if (distToBush >= 200) return false;
    const openPercent = map(b.openAmount, 0, 260, 0, 100);
    const sx = b.baseX - cam.x;
    const sy = b.baseY - cam.y - 50;
    textFont("monospace"); textSize(12); textAlign(CENTER, BOTTOM); textStyle(BOLD);
    fill(255, 200, 100);
    text("Souffle ou maintiens [F] sur les nuages de sucre (" + Math.floor(openPercent) + "%)", sx, sy);
    textStyle(NORMAL);
    return true;
  };
  for (const b of bushes) if (showHint(b)) break;
  for (const b of eastBushes) if (showHint(b)) break;
}

function drawWebcamPreview() {
  const w = 120, h = 90;
  const x = 10, y = VIEW_H - h - 10;
  fill(0, 180); rect(x, y - 16, w, 14, 3);
  fill(220, 200, 255); textFont("monospace"); textSize(10); textAlign(LEFT, CENTER);
  text("Webcam", x + 6, y - 9);
  noFill(); stroke(255, 80); strokeWeight(1); rect(x, y, w, h); noStroke();
  if (webcamFailed || !video) {
    fill(20); rect(x + 1, y + 1, w - 2, h - 2);
    fill(180, 60, 80); textAlign(CENTER, CENTER); textSize(10);
    text("Webcam indispo", x + w / 2, y + h / 2);
    return;
  }
  push();
  translate(x + w, y); scale(-1, 1); image(video, 0, 0, w, h);
  pop();
  if (emotionHappy > 0.8) {
    noFill(); stroke(120, 230, 140); strokeWeight(2); rect(x, y, w, h); noStroke();
  }
}

function drawDialogueBox() {
  if (!currentDialogue) return;
  // Centre sur l'ecran du milieu uniquement (le CAVE a 3 ecrans, le dialogue
  // n'a pas a s'etaler sur les bandes laterales).
  const boxW = SCREEN_W - 80;
  const boxH = 140;
  const boxX = CENTER_X0 + (SCREEN_W - boxW) / 2;
  const boxY = VIEW_H - boxH - 20;
  noStroke(); fill(0, 220); rect(boxX, boxY, boxW, boxH, 14);
  stroke(255, 100); strokeWeight(2); noFill(); rect(boxX, boxY, boxW, boxH, 14); noStroke();
  const sc = SPEAKER_COLORS[currentDialogue.speaker] || [255, 255, 255];
  fill(sc[0], sc[1], sc[2]);
  textFont("Georgia"); textStyle(BOLD); textSize(22); textAlign(LEFT, TOP);
  text(currentDialogue.speaker, boxX + 20, boxY + 12);
  textStyle(NORMAL); textSize(20); fill(245, 235, 255);
  text(currentDialogue.text.substring(0, dialogueCharIndex), boxX + 20, boxY + 50, boxW - 40, boxH - 60);
  if (frameCount % 60 < 30) {
    fill(255);
    triangle(boxX + boxW - 28, boxY + boxH - 22, boxX + boxW - 14, boxY + boxH - 22, boxX + boxW - 21, boxY + boxH - 10);
  }
  fill(255, 200); textFont("monospace"); textSize(13); textAlign(RIGHT, TOP);
  text("[E / ESPACE]", boxX + boxW - 18, boxY + 12);
}

function drawTrialOverlays() {
  if (gameState === "SURVIE" && currentTrial === 1 && !trials[1]) {
    // Voile + panneau centre sur l'ecran central CAVE
    fill(0, 230); rect(0, 0, VIEW_W, VIEW_H);
    fill(20, 5, 30, 240);
    rect(CENTER_X0 + 60, VIEW_H / 2 - 200, SCREEN_W - 120, 400, 16);
    stroke(180, 80, 220, 220); strokeWeight(3); noFill();
    rect(CENTER_X0 + 60, VIEW_H / 2 - 200, SCREEN_W - 120, 400, 16); noStroke();
    fill(255, 230, 240); textFont("Georgia"); textStyle(BOLD); textSize(46); textAlign(CENTER, CENTER);
    text("Resiste a l'Amertume", VIEW_W / 2, VIEW_H / 2 - 110);
    textStyle(NORMAL); textSize(22); fill(240, 220, 255);
    text("Crie dans le micro OU maintiens [F] pendant 3 secondes !", VIEW_W / 2, VIEW_H / 2 - 50);
    const w = 600, x = (VIEW_W - w) / 2, y = VIEW_H / 2;
    fill(60, 30, 80); rect(x, y, w, 32, 8);
    fill(255, 120, 200); rect(x, y, w * (trialState.smileTimer / 180), 32, 8);
    textSize(20); fill(220, 200, 255);
    const kbActif = keyIsDown(70) ? "[F maintenue]" : "";
    text(`Niveau sonore : ${(micLevel * 100).toFixed(0)}%  ${kbActif}  ${micFailed ? "(micro indispo)" : ""}`, VIEW_W / 2, y + 70);
    textSize(18); fill(200, 200, 230);
    text("La barre doit se remplir jusqu'au bout pour reussir.", VIEW_W / 2, y + 110);
  }
}

function drawEndingBanner() {
  if (!flags.crystalObtained || flags.ending !== "victory") return;
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const t = frameCount * 0.01;
  const pulse = 1 + 0.15 * Math.sin(frameCount * 0.08);

  // ── Voile cosmique anime sur tout l'ecran ──
  noStroke();
  for (let y = 0; y < VIEW_H; y += 8) {
    const tt = y / VIEW_H;
    fill(lerp(10, 40, tt), lerp(5, 10, tt), lerp(20, 50, tt), 200);
    rect(0, y, VIEW_W, 8);
  }

  // ── Etoiles scintillantes dans tout le canvas ──
  randomSeed(7);
  for (let i = 0; i < 200; i++) {
    const sx = random(VIEW_W), sy = random(VIEW_H);
    const tw = 0.5 + 0.5 * Math.sin(frameCount * 0.04 + i);
    fill(255, 240, 200, 60 + tw * 180);
    ellipse(sx, sy, 2 + tw * 3, 2 + tw * 3);
  }

  // ── Rayons lumineux qui tournent autour du cristal ──
  push();
  translate(cx, cy);
  rotate(t);
  for (let i = 0; i < 12; i++) {
    const ang = i * (TWO_PI / 12);
    push();
    rotate(ang);
    fill(255, 220, 120, 30 + Math.sin(t * 3 + i) * 20);
    triangle(0, 0, 600, -16, 600, 16);
    pop();
  }
  pop();

  // ── Aureole pulsante autour du cristal ──
  for (let r = 5; r > 0; r--) {
    fill(180, 80, 220, 20 + Math.sin(frameCount * 0.06 + r) * 15);
    ellipse(cx, cy, (180 + r * 50) * pulse, (180 + r * 50) * pulse);
  }
  fill(255, 230, 255, 100 + Math.sin(frameCount * 0.1) * 50);
  ellipse(cx, cy, 220 * pulse, 220 * pulse);

  // ── Cristal central (gros, anime) ──
  push();
  translate(cx, cy);
  rotate(Math.sin(t * 0.5) * 0.08);
  scale(pulse * 3.2);

  // Reflets exterieurs
  fill(160, 60, 200);
  beginShape();
  vertex(0, -28); vertex(20, -8); vertex(14, 18); vertex(-14, 18); vertex(-20, -8);
  endShape(CLOSE);
  // Couleur principale
  fill(190, 90, 230);
  beginShape();
  vertex(0, -25); vertex(17, -7); vertex(12, 15); vertex(-12, 15); vertex(-17, -7);
  endShape(CLOSE);
  // Eclats lumineux internes
  fill(230, 170, 255);
  beginShape();
  vertex(0, -22); vertex(13, -5); vertex(9, 11); vertex(-9, 11); vertex(-13, -5);
  endShape(CLOSE);
  // Coeur brillant
  fill(255, 240, 255, 200 + Math.sin(frameCount * 0.15) * 55);
  beginShape();
  vertex(0, -14); vertex(7, -3); vertex(5, 7); vertex(-5, 7); vertex(-7, -3);
  endShape(CLOSE);
  // Reflets brillants tournants
  fill(255, 255, 255, 220);
  ellipse(-5, -10, 5, 12);
  fill(255, 255, 255, 100);
  ellipse(7, 4, 3, 6);
  pop();

  // ── Particules dorees qui montent ──
  for (let i = 0; i < 30; i++) {
    const ang = (frameCount * 0.02 + i) % TWO_PI;
    const dist = 150 + Math.sin(frameCount * 0.03 + i) * 80;
    const px = cx + Math.cos(ang) * dist;
    const py = cy + Math.sin(ang) * dist - ((frameCount * 1.5 + i * 20) % 400);
    const a = 200 + Math.sin(frameCount * 0.1 + i) * 55;
    fill(255, 220, 130, a);
    ellipse(px, py, 6, 6);
    fill(255, 250, 200, a);
    ellipse(px, py, 3, 3);
  }

  // ── Cadre du panneau principal ──
  const bw = 1400, bh = 240;
  const bx = cx - bw / 2;
  const by = cy + 140;
  fill(0, 220); rect(bx, by, bw, bh, 16);
  stroke(255, 215, 90, 220); strokeWeight(4); noFill();
  rect(bx, by, bw, bh, 16);
  noStroke();

  // ── Texte ★ CRISTAL SACRE OBTENU ★ ──
  fill(255, 215, 90);
  textFont("Georgia"); textStyle(BOLD); textAlign(CENTER, CENTER);
  textSize(54);
  text("★ CRISTAL SACRE OBTENU ★", cx, by + 60);
  textSize(28); fill(255, 240, 230); textStyle(NORMAL);
  text("Chevalier de la Fourchette d'Or", cx, by + 115);
  textSize(20); fill(220, 200, 255);
  text("Le Menu Cosmique est complet.", cx, by + 155);
  textSize(18); fill(200, 180, 235);
  text("Saccharia te confie son cristal pour la suite du voyage cosmique.", cx, by + 188);

  // ── Confettis qui tombent en continu ──
  if (frameCount % 8 === 0 && particles.length < 200) {
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: random(VIEW_W),
        y: -20,
        vx: random(-1, 1),
        vy: random(2, 4.5),
        color: [random(180, 255), random(150, 230), random(100, 255)],
        size: random(5, 10),
        life: 600,
        gravity: 0.02
      });
    }
  }
}

// ==========================================
// VUE 3/4 DÉSERT — MONDE EXPLORABLE
// ==========================================

const DESERT_WIDTH  = 5760;
const DESERT_HEIGHT = 1200;

const DESERT_SKY_TOP   = [244, 201, 107];
const DESERT_SKY_BOT   = [232, 132,  58];
const DESERT_SAND_COL  = [226, 188, 138];
const DESERT_SAND_DARK = [201, 160,  96];
const OASIS_WATER_COL  = [ 58, 181, 200];
const OASIS_GRASS_COL  = [ 74, 140,  63];
const PALM_TRUNK_COL   = [139,  94,  60];
const PALM_LEAF_COL    = [ 45, 106,  45];

let desertPNJs        = [];
let desertDromadaires = [];
let desertOasis       = [];
let desertCoffres     = [];
let desertScorpions   = [];
let desertSerpents    = [];
let desertLezards     = [];
let desertFennecs     = [];
let desertAigles      = [];
let desertParticules  = [];

let sonVent           = null;
let desertStamina     = 100;
let desertOr          = 30;
let desertInventaire  = {};

let desertInteractKey = false;
let desertBoireKey    = false;
let desertTameKey     = false;

let desertMic         = null;
let desertMicVol      = 0;
let desertTempete     = 0;
let desertTempeteTimer = 0;
let desertMicActif    = false;

let desertTradeOuvert = false;
let desertTradePNJ    = null;
let desertTradeTab    = 0;
let desertTradeQte    = {};

let desertSpeechActif = true;
let desertVoix        = null;

let desertCamX = 0;
let desertCamY = 0;

let desertHorizonY = 0;
let desertSolY     = 0;
let desertSolMidY  = 0;
let desertSolFgY   = 0;

let desertInitDone = false;

// ==========================================
// VOIX D'ACCUEIL DÉSERT
// ==========================================
let desertVoixAccueilJouee = false;

const VOIX_ACCUEIL_DESERT =
    "Bienvenue dans le Grand Désert ! " +
    "Déplacez-vous avec Z Q S D. " +
    "Approchez les habitants et appuyez sur E pour leur parler ou faire du commerce. " +
    "Appuyez sur F pour boire à une oasis et récupérer de l'énergie. " +
    "Appuyez sur T pour apprivoiser un dromadaire si vous avez des dattes. " +
    "Ouvrez les coffres avec E pour trouver de l'or et des objets. " +
    "Attention à votre hydratation ! Elle baisse en dehors des oasis. ";

// Fonction qui joue la voix d'accueil du désert (réutilise parlerVoix si elle existe,
// sinon utilise directement speechSynthesis)
function _jouerVoixAccueilDesert() {
    if (desertVoixAccueilJouee) return;
    desertVoixAccueilJouee = true;

    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();

    let u = new SpeechSynthesisUtterance(VOIX_ACCUEIL_DESERT);
    u.lang   = 'fr-FR';
    u.rate   = 0.86;
    u.pitch  = 1.05;
    u.volume = 1.0;

    // Utiliser une voix française si disponible
    let voixDispo = speechSynthesis.getVoices();
    let voixFR = voixDispo.find(v => v.lang.startsWith('fr'));
    if (voixFR) u.voice = voixFR;

    speechSynthesis.speak(u);
}

const D_HORIZON = 0.42;
const D_SOL     = 0.78;
const D_SOL_MID = 0.72;
const D_SOL_FG  = 0.85;

// ==========================================
// PROFONDEUR
// ==========================================
function _depthScale(y) {
  let yMin = height * D_HORIZON;
  let yMax = height * 0.95;
  return map(y, yMin, yMax, 0.35, 1.0, true);
}

function _dessinerJoueurProfondeur() {
  if (typeof user === 'undefined') return;
  let ds = _depthScale(user.y);

  push(); noStroke();
  fill(0, 0, 0, 35 * ds);
  ellipse(user.x, user.y + 4 * ds, 36 * ds, 10 * ds);
  pop();

  user.sc    = ds;
  user.scale = ds;
  if (typeof user.setScale === 'function') user.setScale(ds);
}

// ==========================================
// DIALOGUES
// ==========================================
const DESERT_DIALOGUES = {
  "Marchand Hassan": [
    { texte: "Salam ! Bienvenue, étranger. J'ai de l'eau, des dattes, et quelques reliques... pour le bon prix.", voix: "marchand" },
    { texte: "Tu cherches des trésors ? Les coffres anciens cachent parfois plus que de l'or... méfie-toi.", voix: "marchand" },
    { texte: "Le désert prend tout, mais il rend aussi. Si tu trouves des joyaux, je t'en donne bon prix.", voix: "marchand" },
  ],
  "Nomade Tariq": [
    { texte: "Quarante ans que je traverse ces sables. Le désert a une mémoire... et il se souvient de tout.", voix: "nomade" },
    { texte: "L'oasis des Trois Palmes ? Deux jours vers l'est. Mais évite les sables mouvants près des ruines.", voix: "nomade" },
    { texte: "Mon dromadaire sent l'eau à trois lieues. Un animal précieux, plus fiable que tout compas.", voix: "nomade" },
  ],
  "Sage Fatima": [
    { texte: "Cette oasis existe depuis que le monde est monde. Elle a vu des empires naître et mourir.", voix: "sage" },
    { texte: "Bois avec sagesse, voyageur. L'eau du désert est plus précieuse que tout l'or du monde.", voix: "sage" },
    { texte: "Les étoiles te guideront mieux que toute carte. Apprends à les lire.", voix: "sage" },
  ],
  "Garde Karim": [
    { texte: "Halte ! Cette oasis est sacrée. Qui es-tu pour l'approcher ainsi ?", voix: "garde" },
    { texte: "Hmm. Tu as l'air inoffensif. Passe, mais ne touche pas aux palmiers sacrés.", voix: "garde" },
    { texte: "J'ai vu des hommes mourir de soif à dix pas de cette eau. Ne t'éloigne pas.", voix: "garde" },
  ],
  "Dr. Leila": [
    { texte: "Le temple est juste derrière ces dunes ! Des inscriptions vieilles de trois mille ans !", voix: "archeo" },
    { texte: "J'ai trouvé un mécanisme étrange dans le couloir... je crois que les coffres sont piégés.", voix: "archeo" },
    { texte: "Ce scorpion est endémique à cette région. Fascinant spécimen... de loin.", voix: "archeo" },
  ],
};

const DESERT_CATALOGUE = [
  { nom: "Eau fraîche",     prix: 8,  effet: "stamina+40", icone: "💧", desc: "Restaure 40 pts d'hydratation" },
  { nom: "Dattes",          prix: 5,  effet: "stamina+15", icone: "🌴", desc: "Léger regain d'énergie" },
  { nom: "Antidote",        prix: 20, effet: "soin",       icone: "🧪", desc: "Guérit les morsures de scorpion" },
  { nom: "Lampe à huile",   prix: 25, effet: "lampe",      icone: "🪔", desc: "Éclaire dans les ténèbres — indispensable pour la bibliothèque" },
  { nom: "Carte du désert", prix: 35, effet: "carte",      icone: "🗺️", desc: "Révèle les coffres cachés" },
];

// ==========================================
// SETUP
// ==========================================
function setupDesertViews(views) {

  if (!fullscreen()) fullscreen(true);
  _initMicro();
  _initVoix();

  views["entree"] = new View("Le Grand Désert", _bgDesert, { type: "TOP" });
  views["entree"].displayContent = function () {

    if (!desertInitDone) _initDesertElements();

    // ---- VOIX D'ACCUEIL DÉSERT (une seule fois au premier geste) ----
    if (!desertVoixAccueilJouee) {
      // voixAutorisee est définie dans ville_finale.js — si elle est true, on joue
      if (typeof voixAutorisee !== 'undefined' && voixAutorisee) {
        _jouerVoixAccueilDesert();
      }
    }

    if (typeof user !== 'undefined') {
      desertCamX = lerp(desertCamX, user.x - width * 0.5, 0.10);
    }
    desertCamX = constrain(desertCamX, 0, max(0, DESERT_WIDTH - width));
    desertCamY = 0;

    push();
    translate(-desertCamX, -desertCamY);

    _dessinerDecor();
    _dessinerVillageArrierePlan();
    _dessinerTempleArrierePlan();

    for (let o of desertOasis)   _dessinerOasis(o.x, o.y, o.r);
    for (let c of desertCoffres) { c.update(); c.display(); }

    let entites = [
      ...desertScorpions,
      ...desertSerpents,
      ...desertLezards,
      ...desertFennecs,
      ...desertDromadaires,
      ...desertPNJs
    ];
    entites.sort((a, b) => a.y - b.y);
    for (let e of entites) { if(e.update) e.update(); e.display(); }

    _dessinerJoueurProfondeur();

    pop();

    for (let a of desertAigles) { a.update(); a.displayScreen(desertCamX); }

    _majParticules();
    _gererClavier();
    _appliquerCollisions();
    _gererOasis();
    _gererSonVent();
    _gererMicro();

    if (typeof user !== 'undefined') {
      if (user.x < 150) {
        if (typeof currentView !== 'undefined') {
          _ensureVillageView(views);
          currentView = "entree_ville";
          user.x = 500;
          desertCamX = 0;
          if ('speechSynthesis' in window) speechSynthesis.cancel();
        }
      }
      if (user.x > DESERT_WIDTH - 200) {
        if (typeof currentView !== 'undefined') {
          currentView = "entree_temple";
          user.x = 350;
          desertCamX = max(0, DESERT_WIDTH - width);
          if ('speechSynthesis' in window) speechSynthesis.cancel();
        }
      }
    }

    if (desertTradeOuvert && desertTradePNJ) _dessinerTrade();
    _dessinerHUD();
    _dessinerBordTransition();
  };

  views["couloir"] = new View("Couloir des Piques", {
    type: 'pattern_lines', baseColor: color(60, 50, 40),
    lineColor: color(80, 70, 60), spacing: 30, angle: 45
  });
  views["couloir"].displayContent = function () {
    mur(960,  64,  640, 160);
    mur(960,  576, 640, 160);
    pique(1440, 544, 48);
    pique(1920, 544, 48);
    pique(2400, 544, 48);
    porte(300, height - 40, 200, 80, "entree", 300, 100, {
      customDraw: function (x, y, w, h, options) {
        push();
        fill(194, 154, 108, options.alpha); noStroke(); rectMode(CENTER);
        rect(x, y, w, h * 0.8);
        arc(x, y - h * 0.4, w, h * 0.6, PI, TWO_PI);
        fill(238, 203, 173, options.alpha * 0.5);
        for (let i = 0; i < 5; i++) circle(x - w/3 + i*w/4, y, 5);
        pop();
      }
    });
  };
}

// ==========================================
// INIT DYNAMIQUE
// ==========================================
function _initDesertElements() {
  desertInitDone = true;

  desertHorizonY = height * D_HORIZON;
  desertSolY     = height * D_SOL;
  desertSolMidY  = height * D_SOL_MID;
  desertSolFgY   = height * D_SOL_FG;

  let sol    = desertSolY;
  let solMid = desertSolMidY;
  let solFg  = desertSolFgY;

  let rBase = height * 0.163;
  desertOasis = [
    { x:  950, y: solMid,        r: rBase * 1.1, nom: "Oasis d'Al-Qasr"       },
    { x: 2800, y: solMid * 0.97, r: rBase * 0.9, nom: "Oasis des Trois Palmes"},
    { x: 4500, y: solMid,        r: rBase * 1.2, nom: "Grande Oasis"          },
  ];

  desertPNJs = [
    new DesertPNJ( 750, sol, [180, 80,  30], "Marchand Hassan", DESERT_DIALOGUES["Marchand Hassan"], true),
    new DesertPNJ(1180, sol, [120, 80,  20], "Nomade Tariq",    DESERT_DIALOGUES["Nomade Tariq"],    false),
    new DesertPNJ(2650, sol, [200, 130, 60], "Sage Fatima",     DESERT_DIALOGUES["Sage Fatima"],     false),
    new DesertPNJ(2950, sol, [ 60, 100,160], "Garde Karim",     DESERT_DIALOGUES["Garde Karim"],     false),
    new DesertPNJ(4300, sol, [160,  40, 40], "Dr. Leila",       DESERT_DIALOGUES["Dr. Leila"],       false),
  ];

  desertDromadaires = [
    new Dromadaire(1280, sol,  1),
    new Dromadaire(1450, sol, -1),
    new Dromadaire(2550, sol,  1),
    new Dromadaire(3600, sol, -1),
    new Dromadaire(3800, sol,  1),
    new Dromadaire(4700, sol, -1),
    new Dromadaire(5300, sol,  1),
  ];

  desertCoffres = [
    new DesertCoffre( 480, solFg, "commun",  { or: 15, item: "Dattes",         qte: 2 }),
    new DesertCoffre(1750, solFg, "rare",    { or: 40, item: "Antidote",        qte: 1 }),
    new DesertCoffre(2250, solFg, "commun",  { or: 10, item: "Torche",          qte: 1 }),
    new DesertCoffre(3200, solFg, "epique",  { or: 80, item: "Carte du désert", qte: 1 }),
    new DesertCoffre(3900, solFg, "commun",  { or: 12, item: "Eau fraîche",     qte: 3 }),
    new DesertCoffre(4950, solFg, "rare",    { or: 45, item: "Antidote",        qte: 2 }),
    new DesertCoffre(5450, solFg, "epique",  { or:100, item: "Torche",          qte: 2 }),
  ];

  desertScorpions = [];
  for (let i = 0; i < 6; i++) {
    let sy = height * (0.72 + random(0.20));
    desertScorpions.push(new Scorpion(300 + i * 520 + random(-100, 100), sy));
  }

  desertSerpents = [];
  for (let i = 0; i < 4; i++) {
    let sy = height * (0.73 + random(0.18));
    desertSerpents.push(new Serpent(500 + i * 740 + random(-120, 120), sy));
  }

  desertLezards = [];
  for (let i = 0; i < 4; i++) {
    let ly = height * (0.75 + random(0.16));
    desertLezards.push(new Lezard(400 + i * 620 + random(-80, 80), ly));
  }

  desertFennecs = [];
  for (let i = 0; i < 3; i++) {
    let fy = height * (0.76 + random(0.14));
    desertFennecs.push(new Fennec(800 + i * 900 + random(-150, 150), fy));
  }

  desertAigles = [];
  for (let i = 0; i < 2; i++) {
    desertAigles.push(new Aigle(600 + i * 1400 + random(-200, 200)));
  }
}

// ==========================================
// FOND DÉSERT
// ==========================================
function _bgDesert() {
  let hz = height * D_HORIZON;

  for (let y = 0; y < hz; y++) {
    let t = y / hz;
    stroke(
      lerp(DESERT_SKY_TOP[0], DESERT_SKY_BOT[0], t),
      lerp(DESERT_SKY_TOP[1], DESERT_SKY_BOT[1], t),
      lerp(DESERT_SKY_TOP[2], DESERT_SKY_BOT[2], t)
    );
    line(0, y, width, y);
  }
  noStroke();

  fill(...DESERT_SAND_COL);
  rect(0, hz, width, height - hz);

  for (let i = 0; i < 12; i++) {
    let yy = hz + (i / 12) * (height - hz) * 0.75;
    stroke(DESERT_SAND_DARK[0], DESERT_SAND_DARK[1], DESERT_SAND_DARK[2],
           map(i, 0, 12, 55, 6));
    strokeWeight(0.7 + i * 0.22);
    line(0, yy, width, yy);
  }
  noStroke();

  let duneH = height * 0.14;
  fill(...DESERT_SAND_DARK);
  let dunePositions = [0, 600, 1200, 1700, 2200, 2750, 3300, 3800, 4300];
  for (let i = 0; i < dunePositions.length; i++) {
    let worldX   = dunePositions[i];
    let screenX  = worldX - desertCamX * 0.25;
    let screenX2 = ((screenX % (width + 600)) + width + 600) % (width + 600) - 300;
    ellipse(screenX2, hz + 8, 560 + i * 40, duneH + i * 6);
  }

  if (!desertTempeteTimer) desertTempeteTimer = floor(random(600, 1200));
  desertTempeteTimer--;
  if (desertTempeteTimer <= 0) {
    desertTempete = min(100, desertTempete + 1.5);
    if (desertTempete >= 99) desertTempeteTimer = floor(random(800, 1400));
  } else if (desertTempete > 0 && desertTempeteTimer > 50) {
    desertTempete = max(0, desertTempete - 0.4);
  }

  fill(245, 210, 155, 55 + desertTempete * 1.2);
  let seed = frameCount * 0.35;
  let nb   = 14 + floor(desertTempete * 0.5);
  for (let i = 0; i < nb; i++) {
    let px  = (noise(seed + i * 9.1) * width * 1.3) - width * 0.15;
    let py  = hz + noise(seed + i * 6.7) * (height - hz) * 0.65;
    let len = 4 + desertTempete * 0.06;
    stroke(245, 210, 155, 60 + desertTempete);
    strokeWeight(0.8);
    line(px, py, px + len, py);
    noStroke();
    ellipse(px, py, 2.5 + desertTempete * 0.03, 1.2);
  }
  noStroke();

  if (desertTempete > 10) {
    fill(210, 172, 108, desertTempete * 1.6);
    rect(0, 0, width, height);
    fill(255, 225, 160, desertTempete * 0.8);
    for (let i = 0; i < floor(desertTempete * 0.8); i++) {
      let gx = (frameCount * (2 + i * 0.3) + i * 137) % (width + 40) - 20;
      let gy = hz + random(height - hz);
      ellipse(gx, gy, random(1, 4), 1);
    }
  }
}

// ==========================================
// DÉCOR
// ==========================================
function _dessinerDecor() {
  if (!desertInitDone) return;
  let hz  = desertHorizonY;
  let sol = desertSolY;

  noStroke();

  fill(210, 178, 112, 50);
  ellipse( 650, sol + 25, 388, 88);
  ellipse(2150, sol + 31, 488, 100);
  ellipse(3650, sol + 23, 413, 85);
  ellipse(5150, sol + 28, 350, 81);

  fill(155, 125, 85);
  for (let i = 0; i < 55; i++) {
    let cx = (i * 107 + 60) % DESERT_WIDTH;
    let cy = hz + (i * 67) % (height - hz - 10);
    let ds = _depthScale(cy);
    ellipse(cx, cy, (8.75 + (i%5)*3.75)*ds, (5 + (i%4)*2.5)*ds);
  }

  for (let i = 0; i < 45; i++) {
    let hx = (i * 131 + 70) % (DESERT_WIDTH - 100);
    let hy = hz + (i * 43) % (height - hz - 30);
    _herbeSec(hx, hy, _depthScale(hy));
  }

  _buissonEpines( 700, sol-10); _buissonEpines(1650, sol-6);
  _buissonEpines(2400, sol-13); _buissonEpines(3300, sol-9);
  _buissonEpines(4200, sol-11); _buissonEpines(5100, sol-8);

  _cactus( 850, sol, height*0.0875); _cactus(1400, sol, height*0.069);
  _cactus(2700, sol, height*0.100);  _cactus(3500, sol, height*0.081);
  _cactus(4600, sol, height*0.0875); _cactus(5200, sol, height*0.075);

  _colonneBrisee( 380, sol, height*0.125);
  _colonneBrisee(1900, sol, height*0.106);
  _colonneBrisee(3050, sol, height*0.119);
  _colonneBrisee(4450, sol, height*0.110);

  let rH = height * 0.075;
  _rocher( 520,  sol + rH * 0.5, height * 0.094, rH);
  _rocher(1520,  sol + rH * 0.4, height * 0.075, rH * 0.85);
  _rocher(2080,  sol + rH * 0.5, height * 0.113, rH * 1.1);
  _rocher(3150,  sol + rH * 0.45,height * 0.090, rH * 0.92);
  _rocher(3880,  sol + rH * 0.5, height * 0.104, rH);
  _rocher(4800,  sol + rH * 0.42,height * 0.079, rH * 0.82);
  _rocher(5080,  sol + rH * 0.48,height * 0.096, rH * 0.96);
  _rocher(5520,  sol + rH * 0.5, height * 0.085, rH * 0.88);

  _fossil(1100, sol + height*0.05);
  _fossil(2900, sol + height*0.038);
  _fossil(4700, sol + height*0.05);

  _crane(1920, sol + height * 0.044);
  _crane(4100, sol + height * 0.031);
  _crane(3400, sol + height * 0.038);
}

function _herbeSec(x, y, ds=1) {
  stroke(175, 150, 88, 152);
  strokeWeight(1.5*ds);
  let t = (11 + (x % 9)) * ds;
  for (let i = -1; i <= 1; i++) line(x, y, x + i*5*ds, y - t + i*3*ds);
  noStroke();
}

function _rocher(x, y, w, h) {
  push(); noStroke();
  fill(0, 0, 0, 22); ellipse(x+8, y+h*.25, w*1.1, h*.4);
  fill(148, 118, 82);
  beginShape();
  vertex(x-w*.5, y+h*.3);  vertex(x-w*.35, y-h*.5);
  vertex(x+w*.1, y-h*.55); vertex(x+w*.45, y-h*.3);
  vertex(x+w*.5, y+h*.35);
  endShape(CLOSE);
  fill(178, 152, 108, 172);
  beginShape();
  vertex(x-w*.1, y-h*.5);  vertex(x+w*.1, y-h*.55);
  vertex(x+w*.2, y-h*.1);  vertex(x-w*.05, y-h*.15);
  endShape(CLOSE);
  pop();
}

function _crane(x, y) {
  push(); noStroke();
  fill(228, 212, 178); ellipse(x, y, 28, 22);
  fill(38, 28, 18);
  ellipse(x-6, y-3, 7, 6); ellipse(x+6, y-3, 7, 6);
  fill(212, 198, 162); rect(x-8, y+6, 16, 8, 2);
  fill(238, 228, 198);
  for (let i = 0; i < 4; i++) rect(x-7+i*5, y+13, 3, 4);
  pop();
}

function _cactus(x, y, h) {
  push(); noStroke();
  let w = h * 0.22;
  fill(0,0,0,18); ellipse(x, y+4, w*2.5, 10);
  fill(80, 130, 60);
  rect(x-w/2, y-h, w, h, w*.4);
  rect(x-w/2-w*1.2, y-h*.6,  w*.85, h*.3, w*.3);
  rect(x-w/2-w*1.2, y-h*.85, w*.85, h*.3, w*.3);
  rect(x+w/2+w*.35, y-h*.5,  w*.85, h*.3, w*.3);
  rect(x+w/2+w*.35, y-h*.72, w*.85, h*.3, w*.3);
  stroke(120,170,90); strokeWeight(1.2);
  for(let i=0;i<5;i++){
    let ey=y-h*.2-i*h*.15;
    line(x-w/2,ey, x-w/2-6,ey-4);
    line(x+w/2,ey, x+w/2+6,ey-4);
  }
  pop();
}

function _colonneBrisee(x, y, h) {
  push(); noStroke();
  let w = h * 0.28;
  fill(0,0,0,15); ellipse(x, y+4, w*2, 10);
  fill(195, 175, 140);
  rect(x-w*.6, y-h*.25, w*1.2, h*.25, 3);
  fill(185, 165, 130);
  rect(x-w/2, y-h, w, h*.75, 4);
  fill(175, 155, 120);
  beginShape();
  vertex(x-w/2, y-h); vertex(x-w*.3, y-h-h*.12); vertex(x, y-h-h*.08);
  vertex(x+w*.25, y-h-h*.15); vertex(x+w/2, y-h);
  endShape(CLOSE);
  stroke(155,135,100,100); strokeWeight(1);
  for(let i=1;i<4;i++) line(x-w/2, y-h*.2*i, x+w/2, y-h*.2*i);
  pop();
}

function _fossil(x, y) {
  push(); noStroke();
  fill(200, 175, 130, 160);
  for(let r=18; r>2; r-=3){
    stroke(170,145,100,100); strokeWeight(1.5); noFill();
    arc(x, y, r*2, r*1.3, 0, PI*2);
  }
  noStroke(); fill(180,155,110,120);
  ellipse(x, y, 36, 24);
  fill(160,135,90,100); ellipse(x, y, 22, 15);
  pop();
}

function _buissonEpines(x, y) {
  push(); noStroke();
  fill(0,0,0,12); ellipse(x, y+5, 55, 12);
  fill(100, 82, 40);
  ellipse(x, y, 48, 22); ellipse(x-15, y-5, 28, 20); ellipse(x+12, y-4, 26, 18);
  stroke(130,100,50); strokeWeight(1);
  for(let i=0;i<8;i++){
    let a=random(TWO_PI);
    let r=18+random(8);
    line(x+cos(a)*r*.5, y+sin(a)*r*.4, x+cos(a)*r, y+sin(a)*r*.7);
  }
  pop();
}

// ==========================================
// OASIS
// ==========================================
function _dessinerOasis(x, y, r) {
  push(); noStroke();
  fill(0, 0, 0, 20); ellipse(x, y + r*.2, r*2.3, r*.5);
  fill(...OASIS_GRASS_COL); ellipse(x, y, r*2.1, r*1.3);

  let w = sin(frameCount * 0.04) * (r * 0.04);
  fill(...OASIS_WATER_COL); ellipse(x, y + w, r*1.15, r*.7);

  fill(255, 255, 255, 52);
  ellipse(x - r*.2, y - r*.1 + w, r*.3, r*.1);
  ellipse(x + r*.24, y + r*.04 + w, r*.2, r*.08);

  let nb = max(3, floor(r / 28));
  for (let i = 0; i < nb; i++) {
    let ang = TWO_PI/nb * i + 0.5;
    _palmier(x + cos(ang)*r*.82, y + sin(ang)*r*.5, r * 0.9);
  }
  pop();
}

function _palmier(x, y, h) {
  push();
  let inc = sin(x * 0.012) * 9;
  stroke(...PALM_TRUNK_COL); strokeWeight(max(4, h * 0.1)); noFill();
  beginShape();
  vertex(x, y);
  quadraticVertex(x+inc, y-h*.5, x+inc*1.6, y-h);
  endShape();
  let tx = x + inc*1.6, ty = y - h;
  noStroke(); fill(...PALM_LEAF_COL);
  for (let a = 0; a < 7; a++) {
    let ang = a * PI/3.5 + frameCount * 0.004;
    let lf  = h * 0.5;
    push(); translate(tx, ty); rotate(ang);
    beginShape();
    vertex(0, 0);
    quadraticVertex(lf*.5, -h*.12, lf, 0);
    quadraticVertex(lf*.5,  h*.12, 0, 0);
    endShape(CLOSE);
    pop();
  }
  fill(92, 55, 16);
  circle(tx-h*.06, ty+h*.1, h*.13);
  circle(tx+h*.1,  ty+h*.13, h*.11);
  pop();
}

// ==========================================
// COFFRE
// ==========================================
class DesertCoffre {
  constructor(x, y, rarete, contenu) {
    this.x       = x;
    this.y       = y;
    this.rarete  = rarete;
    this.contenu = contenu;
    this.ouvert  = false;
    this.anim    = 0;
    this.brille  = 0;
    this.taille  = height * 0.055;
  }

  update() {
    this.taille = height * 0.055;
    if (this.ouvert && this.anim < 1) this.anim = min(1, this.anim + 0.06);
    this.brille = (sin(frameCount * 0.08) + 1) * 0.5;
  }

  _ouvrir() {
    if (this.ouvert) return;
    this.ouvert = true;
    desertOr += this.contenu.or;
    if (this.contenu.item) {
      desertInventaire[this.contenu.item] = (desertInventaire[this.contenu.item] || 0) + this.contenu.qte;
    }
    let col = this.rarete === "epique" ? [255,180,30] :
              this.rarete === "rare"   ? [80,180,255] : [200,200,200];
    for (let i = 0; i < 18; i++) {
      desertParticules.push({
        x: this.x, y: this.y,
        vx: random(-3,3), vy: random(-5,-1),
        vie: 60, maxVie: 60, col
      });
    }
    _notif("+" + this.contenu.or + " 🪙  " + (this.contenu.item ? "+" + this.contenu.qte + " " + this.contenu.item : ""));
  }

  display() {
    push();
    let t  = this.taille;
    let cx = this.x, cy = this.y;
    noStroke();

    if (!this.ouvert) {
      let g = this.rarete==="epique" ? [255,200,50] :
              this.rarete==="rare"   ? [80,160,255] : [180,165,130];
      fill(g[0],g[1],g[2], 35 + this.brille*55);
      ellipse(cx, cy+t*.2, t*2.8, t*.8);
    }

    let bc = this.ouvert ? [90,65,35] :
             this.rarete==="epique" ? [180,120,20] :
             this.rarete==="rare"   ? [60,100,160] : [120,85,45];
    fill(...bc); rectMode(CENTER);
    rect(cx, cy+t*.15, t*2, t*1.3, t*.18);

    let lidA = this.anim * -PI * 0.65;
    push(); translate(cx, cy - t*.45); rotate(lidA);
    fill(bc[0]*1.2, bc[1]*1.2, bc[2]*1.2);
    rect(0, -t*.22, t*2, t*.55, t*.1);
    pop();

    fill(200,175,90);
    rect(cx, cy+t*.15, t*.28, t*1.3, t*.07);
    rect(cx, cy-t*.35, t*2, t*.18, t*.04);
    circle(cx, cy+t*.15, t*.35);
    fill(220,190,60); rect(cx, cy+t*.15, t*.35, t*.32, t*.07);
    fill(180,150,30); circle(cx, cy+t*.08, t*.18);

    if (!this.ouvert && typeof user!=='undefined') {
      if (abs(user.x - cx) < 120) {
        _bulleTexte(cx, cy-t*1.8, "[E] Ouvrir le coffre", [255,230,130],[140,100,20]);
      }
    }
    pop();
  }
}

// ==========================================
// SCORPION
// ==========================================
class Scorpion {
  constructor(x, y) {
    this.x        = x;
    this.y        = y;
    this.dir      = random()>.5 ? 1:-1;
    this.speed    = 0.4 + random(0.3);
    this.fuite    = false;
    this.fuiteTimer = 0;
    this.legPhase = random(TWO_PI);
    this.sc       = height * 0.004;
    this.vx       = random(-0.3, 0.3);
    this.vy       = random(-0.2, 0.2);
    this.changeDirectionTimer = floor(random(80, 180));
  }

  update() {
    this.sc = height * 0.004;
    if (this.fuiteTimer > 0) {
      this.fuite = true; this.fuiteTimer--;
      this.vx = this.dir * this.speed * 4;
      this.vy = random(-0.8, 0.8);
    } else {
      this.fuite = false;
      this.changeDirectionTimer--;
      if (this.changeDirectionTimer <= 0) {
        let angle = random(TWO_PI);
        this.vx = cos(angle) * this.speed * 0.4;
        this.vy = sin(angle) * this.speed * 0.25;
        this.changeDirectionTimer = floor(random(80, 180));
      }
    }
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 100) {
      this.x = 100;
      this.vx = abs(this.vx) + 0.2;
      this.dir = 1;
      this.changeDirectionTimer = floor(random(60, 120));
    }
    if (this.x > DESERT_WIDTH - 100) {
      this.x = DESERT_WIDTH - 100;
      this.vx = -(abs(this.vx) + 0.2);
      this.dir = -1;
      this.changeDirectionTimer = floor(random(60, 120));
    }
    this.y = constrain(this.y, height*0.72, height*0.94);
    this.legPhase += 0.04;
  }

  fuir() { this.fuiteTimer=90; this.dir=random()>.5?1:-1; }

  display() {
    push();
    let s = this.sc;
    translate(this.x, this.y);
    scale(this.dir, 1);
    noStroke();
    let col = this.fuite ? [255,80,20] : [60,40,20];
    fill(...col); ellipse(0,0, s*8,s*5);
    fill(col[0]*1.1,col[1]*1.1,col[2]*1.1); ellipse(s*4,0, s*4.5,s*3.5);
    stroke(...col); strokeWeight(s*.6); noFill();
    line(s*5,-s, s*8,-s*3); line(s*8,-s*3,s*9.5,-s*1.5);
    line(s*5, s, s*8, s*3); line(s*8, s*3,s*9.5, s*1.5);
    noStroke();
    stroke(col[0]-15,col[1]-15,col[2]-15); strokeWeight(s*.5);
    let lp=sin(this.legPhase);
    for(let i=0;i<4;i++){
      let lx=-s*3+i*s*2;
      line(lx,-s*2, lx-s, -s*5+lp*(i%2==0?s:-s));
      line(lx, s*2, lx-s,  s*5+lp*(i%2==0?-s:s));
    }
    noStroke(); fill(...col);
    noFill(); stroke(...col); strokeWeight(s*.9);
    beginShape();
    vertex(-s*3.5,0); quadraticVertex(-s*6.5,-s*6.5, -s*3.5,-s*9.5);
    endShape();
    fill(255,50,50); noStroke();
    triangle(-s*3.5,-s*9.5, -s*2,-s*12, -s*5,-s*12);
    noStroke(); fill(255,50,0);
    circle(s*5,-s, s); circle(s*5,s, s);
    pop();
  }
}

// ==========================================
// DROMADAIRE
// ==========================================
class Dromadaire {
  constructor(x, y, dir) {
    this.x        = x;
    this.y        = y;
    this.baseY    = y;
    this.dir      = dir;
    this.speed    = 0.5 + random(0.3);
    this.legOff   = 0;
    this.targetX  = x;
    this.targetY  = y;
    this.vx       = 0;
    this.vy       = 0;
    this.wanderAngle = random(TWO_PI);
    this.changeTargetTimer = floor(random(180, 400));
    this.apprivoise   = false;
    this.suivreJoueur = false;
    this.coeurAnim    = 0;
  }

  update() {
    this.legOff = sin(frameCount * 0.09) * 8;

    if (this.suivreJoueur && typeof user !== 'undefined') {
      let dx = user.x - this.x;
      let targetX = user.x - sign(dx) * 110;
      this.x = lerp(this.x, targetX, 0.04);
      this.y = lerp(this.y, user.y, 0.03);
      this.dir = dx > 0 ? 1 : -1;
      this.coeurAnim = (this.coeurAnim + 0.06) % TWO_PI;
    } else {
      this.changeTargetTimer--;
      if (this.changeTargetTimer <= 0) {
        this.wanderAngle = random(TWO_PI);
        this.targetX = this.x + cos(this.wanderAngle) * random(200, 500);
        this.targetY = this.y + sin(this.wanderAngle) * random(-150, 150);
        this.changeTargetTimer = floor(random(180, 400));
      }
      let dx   = this.targetX - this.x;
      let dy   = this.targetY - this.y;
      let d    = sqrt(dx*dx + dy*dy);
      if (d > 5) {
        this.vx = lerp(this.vx, (dx/d) * this.speed, 0.08);
        this.vy = lerp(this.vy, (dy/d) * this.speed * 0.5, 0.06);
      } else {
        this.vx *= 0.95;
        this.vy *= 0.95;
      }
      this.x += this.vx;
      this.y += this.vy;
      if (this.vx > 0.1) this.dir = 1;
      else if (this.vx < -0.1) this.dir = -1;
      this.x = constrain(this.x, 100, DESERT_WIDTH - 100);
      this.y = constrain(this.y, height * 0.65, height * 0.92);
    }
  }

  display() {
    let ds = _depthScale(this.y);
    let s  = height * 0.08 * ds;
    push(); translate(this.x, this.y); scale(this.dir, 1); noStroke();
    fill(0,0,0, 20*ds); ellipse(0, s*.5, s*1.4, s*.28);
    stroke(126,86,46); strokeWeight(s*.07);
    line(-s*.32,s*.22,-s*.4,s*.7); line(-s*.17,s*.22,-s*.1,s*.7);
    line( s*.27,s*.15, s*.2,s*.7); line( s*.4, s*.15, s*.47,s*.7);
    noStroke();
    fill(196,150,86); ellipse(0,0, s*1.25,s*.58);
    fill(180,136,70); ellipse(s*.07,-s*.3, s*.5,s*.42);
    fill(206,166,96); ellipse(s*.07,-s*.37, s*.27,s*.2);
    fill(196,150,86);
    beginShape();
    vertex(s*.49,-s*.07); vertex(s*.62,-s*.4);
    vertex(s*.79,-s*.42); vertex(s*.77,-s*.11);
    endShape(CLOSE);
    fill(190,143,80); ellipse(s*.74,-s*.5, s*.42,s*.3);
    fill(176,130,70); ellipse(s*.92,-s*.46, s*.27,s*.2);
    fill(36); circle(s*.79,-s*.55, s*.08); fill(255); circle(s*.8,-s*.56, s*.03);
    fill(136,96,50); ellipse(s*.99,-s*.43, s*.08,s*.05);
    fill(180,136,70); triangle(s*.67,-s*.6, s*.62,-s*.73, s*.72,-s*.71);

    if (this.apprivoise) {
      textSize(s*.8); textAlign(CENTER,CENTER);
      text("❤️", 0, -s*1.6 - sin(this.coeurAnim)*s*.2);
    }
    pop();

    if (!this.apprivoise && typeof user !== 'undefined') {
      if (abs(user.x - this.x) < 140) {
        let hasDattes = (desertInventaire["Dattes"]||0) >= 1;
        let msg = hasDattes ? "[T] Donner des dattes 🌴" : "[T] Apprivoiser (besoin de dattes)";
        let ds2 = _depthScale(this.y);
        let s2  = height * 0.08 * ds2;
        _bulleTexte(this.x, this.y - s2*1.2, msg, [255,240,200],[140,100,20]);
      }
    }
  }
}

// ==========================================
// SERPENT
// ==========================================
class Serpent {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.phase  = random(TWO_PI);
    this.speed  = 0.3 + random(0.2);
    this.vx     = (random() > 0.5 ? 1 : -1) * this.speed;
    this.vy     = random(-0.2, 0.2);
    this.changeTimer = floor(random(120, 240));
  }
  update() {
    this.phase += 0.07;
    this.changeTimer--;
    if (this.changeTimer <= 0) {
      let angle = random(TWO_PI);
      this.vx = cos(angle) * this.speed * 0.5;
      this.vy = sin(angle) * this.speed * 0.3;
      this.changeTimer = floor(random(120, 240));
    }
    this.x += this.vx;
    this.y += this.vy;
    this.y = constrain(this.y, height*0.68, height*0.92);

    if (this.x < 100) {
      this.x = 100;
      this.vx = abs(this.vx) + 0.1;
      this.changeTimer = floor(random(80, 160));
    }
    if (this.x > DESERT_WIDTH - 100) {
      this.x = DESERT_WIDTH - 100;
      this.vx = -(abs(this.vx) + 0.1);
      this.changeTimer = floor(random(80, 160));
    }
  }
  display() {
    let ds = _depthScale(this.y);
    let s  = 18 * ds;
    push(); translate(this.x, this.y); scale(this.dir, 1); noStroke();
    let col = [50,120,40];
    stroke(...col); strokeWeight(s*.35); noFill();
    beginShape();
    for(let i=0;i<8;i++){
      let sx = -i*s*.9;
      let sy = sin(this.phase - i*0.7)*s*0.7;
      curveVertex(sx, sy);
    }
    endShape();
    noStroke(); fill(...col);
    ellipse(0, 0, s*.9, s*.55);
    fill(30,80,20); ellipse(-s*.15, 0, s*.35, s*.3);
    fill(255,200,0); circle(s*.1, -s*.1, s*.18);
    fill(10); circle(s*.1, -s*.1, s*.09);
    stroke(200,20,20); strokeWeight(1);
    line(s*.4, 0, s*.7, 0);
    line(s*.7, 0, s*.85, -s*.2);
    line(s*.7, 0, s*.85,  s*.2);
    noStroke();
    pop();
  }
}

// ==========================================
// LÉZARD
// ==========================================
class Lezard {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.vx     = (random() > 0.5 ? 1 : -1) * (0.8 + random(0.5));
    this.vy     = random(-0.2, 0.2);
    this.legPh  = random(TWO_PI);
    this.pauseT = 0;
    this.changeTimer = floor(random(100, 200));
  }
  update() {
    if(this.pauseT>0){this.pauseT--;return;}
    this.legPh+=0.18;
    this.changeTimer--;
    if (this.changeTimer <= 0) {
      let angle = random(TWO_PI);
      this.vx = cos(angle) * (0.8 + random(0.5));
      this.vy = sin(angle) * (0.8 + random(0.5)) * 0.4;
      this.changeTimer = floor(random(100, 200));
      if (random() < 0.1) this.pauseT = floor(random(30, 80));
    }
    this.x += this.vx;
    this.y += this.vy;
    this.y=constrain(this.y,height*0.70,height*0.92);

    if (this.x < 100) {
      this.x = 100;
      this.vx = abs(this.vx) + 0.3;
      this.changeTimer = floor(random(60, 120));
    }
    if (this.x > DESERT_WIDTH - 100) {
      this.x = DESERT_WIDTH - 100;
      this.vx = -(abs(this.vx) + 0.3);
      this.changeTimer = floor(random(60, 120));
    }
  }
  display() {
    let ds = _depthScale(this.y);
    let s  = 12 * ds;
    let lp = sin(this.legPh);
    push(); translate(this.x, this.y); scale(this.dir, 1); noStroke();
    fill(0,0,0,18*ds); ellipse(0, s*.4, s*2.8, s*.5);
    fill(100,160,60); ellipse(0, 0, s*2.2, s*.7);
    fill(90,150,50); ellipse(s*1.2, -s*.05, s*.8, s*.55);
    fill(60,110,30); circle(s*1.5, -s*.05, s*.3);
    fill(80,140,45);
    beginShape();
    vertex(-s, 0); vertex(-s*1.4, -s*.1); vertex(-s*2.2, s*.05); vertex(-s, s*.1);
    endShape(CLOSE);
    stroke(70,130,40); strokeWeight(s*.25);
    line(-s*.4,-s*.3, -s*.7+lp*s*.4,-s*.7);
    line( s*.3,-s*.3,  s*.6-lp*s*.4,-s*.7);
    line(-s*.4, s*.3, -s*.7-lp*s*.4, s*.7);
    line( s*.3, s*.3,  s*.6+lp*s*.4, s*.7);
    noStroke(); fill(255,220,0); circle(s*1.3,-s*.12,s*.22);
    fill(10); circle(s*1.3,-s*.12,s*.1);
    pop();
  }
}

// ==========================================
// FENNEC
// ==========================================
class Fennec {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.vx     = (random() > 0.5 ? 1 : -1) * (1.2 + random(0.6));
    this.vy     = random(-0.3, 0.3);
    this.legPh  = random(TWO_PI);
    this.pauseT = 0;
    this.changeTimer = floor(random(120, 280));
  }
  update() {
    if(this.pauseT>0){this.pauseT--;return;}
    this.legPh+=0.22;
    this.changeTimer--;
    if (this.changeTimer <= 0) {
      let angle = random(TWO_PI);
      this.vx = cos(angle) * (1.2 + random(0.6));
      this.vy = sin(angle) * (1.2 + random(0.6)) * 0.35;
      this.changeTimer = floor(random(120, 280));
      if (random() < 0.12) this.pauseT = floor(random(40, 100));
    }
    this.x += this.vx;
    this.y += this.vy;
    this.y=constrain(this.y,height*0.66,height*0.92);

    if (this.x < 100) {
      this.x = 100;
      this.vx = abs(this.vx) + 0.4;
      this.changeTimer = floor(random(80, 160));
    }
    if (this.x > DESERT_WIDTH - 100) {
      this.x = DESERT_WIDTH - 100;
      this.vx = -(abs(this.vx) + 0.4);
      this.changeTimer = floor(random(80, 160));
    }
  }
  display() {
    let ds = _depthScale(this.y);
    let s  = 20 * ds;
    let lp = this.pauseT>0 ? 0 : sin(this.legPh);
    push(); translate(this.x, this.y); scale(this.dir, 1); noStroke();
    fill(0,0,0,20*ds); ellipse(0, s*.6, s*1.6, s*.35);
    fill(235,195,130); ellipse(0, 0, s*1.4, s*.8);
    fill(240,200,135); circle(s*.7, -s*.2, s*.85);
    fill(235,195,130); triangle(s*.5,-s*.5, s*.35,-s*1.4, s*.65,-s*1.35);
    triangle(s*.9,-s*.5, s*.75,-s*1.3, s*1.05,-s*1.25);
    fill(255,180,150,160); triangle(s*.5,-s*.55, s*.38,-s*1.3, s*.62,-s*1.25);
    triangle(s*.9,-s*.55, s*.78,-s*1.2, s*1.0,-s*1.15);
    fill(210,160,100); ellipse(s*1.05, -s*.15, s*.4, s*.28);
    fill(60,30,10); circle(s*1.18, -s*.18, s*.14);
    fill(40,20,5); circle(s*.75, -s*.3, s*.22);
    fill(255); circle(s*.79,-s*.33, s*.07);
    stroke(210,170,110); strokeWeight(s*.18);
    line(-s*.3, s*.35, -s*.4+lp*s*.3, s*.75);
    line( s*.1, s*.35,  s*.2-lp*s*.3, s*.75);
    noStroke(); fill(240,205,140);
    beginShape();
    vertex(-s*.5,s*.1); vertex(-s*.9,-s*.1); vertex(-s*1.3,s*.3); vertex(-s*.9,s*.5);
    endShape(CLOSE);
    fill(255);
    circle(-s*1.0, s*.2, s*.35);
    pop();
  }
}

// ==========================================
// AIGLE
// ==========================================
class Aigle {
  constructor(x) {
    this.x      = x;
    this.y      = height * (0.20 + random(0.18));
    this.speed  = 0.6 + random(0.4);
    this.dir    = random()>.5?1:-1;
    this.wing   = 0;
    this.startX = x;
    this.range  = 1000 + random(500);
  }
  update() {
    this.wing += 0.08;
    this.x += this.speed * this.dir;
    if(this.x > this.startX+this.range) this.dir=-1;
    if(this.x < this.startX-this.range) this.dir=1;
    this.x = constrain(this.x, 100, DESERT_WIDTH-100);
    this.y += sin(this.wing*0.3)*0.2;
    this.y = constrain(this.y, height*0.10, height*0.40);
  }
  display() {
    let s  = 22;
    let wf = sin(this.wing)*s*0.6;
    push(); translate(this.x, this.y); scale(this.dir, 1); noStroke();
    fill(60,40,10); ellipse(0, 0, s*1.4, s*.45);
    fill(180,130,60); ellipse(s*.35, -s*.05, s*.5, s*.35);
    fill(50,30,5); circle(s*.55, -s*.12, s*.25);
    fill(255,200,20); ellipse(s*.65, -s*.1, s*.22, s*.12);
    fill(50,35,8);
    beginShape();
    vertex(0,0); vertex(-s*.8, -wf); vertex(-s*1.8, -wf*0.5); vertex(-s, s*.15);
    endShape(CLOSE);
    beginShape();
    vertex(0,0); vertex(-s*.7, wf*0.3); vertex(-s*1.6, wf*0.6); vertex(-s*.9, s*.2);
    endShape(CLOSE);
    fill(60,40,10);
    triangle(-s*.4,s*.1, -s*.9,s*.4, -s*.5,s*.4);
    pop();
  }

  displayScreen(camX) {
    let sx = this.x - camX;
    if (sx < -60 || sx > width + 60) return;
    let s  = 22;
    let wf = sin(this.wing)*s*0.6;
    push(); translate(sx, this.y); scale(this.dir, 1); noStroke();
    fill(60,40,10); ellipse(0, 0, s*1.4, s*.45);
    fill(180,130,60); ellipse(s*.35, -s*.05, s*.5, s*.35);
    fill(50,30,5); circle(s*.55, -s*.12, s*.25);
    fill(255,200,20); ellipse(s*.65, -s*.1, s*.22, s*.12);
    fill(50,35,8);
    beginShape();
    vertex(0,0); vertex(-s*.8, -wf); vertex(-s*1.8, -wf*0.5); vertex(-s, s*.15);
    endShape(CLOSE);
    beginShape();
    vertex(0,0); vertex(-s*.7, wf*0.3); vertex(-s*1.6, wf*0.6); vertex(-s*.9, s*.2);
    endShape(CLOSE);
    fill(60,40,10);
    triangle(-s*.4,s*.1, -s*.9,s*.4, -s*.5,s*.4);
    pop();
  }
}

// ==========================================
// BORD TRANSITION
// ==========================================
function _dessinerBordTransition() {
  if(typeof user==='undefined') return;
  push(); resetMatrix();

  let dxL = user.x;
  if(dxL < 600) {
    let a = map(dxL, 0, 600, 240, 60);
    fill(255,220,100, a); noStroke();
    textSize(20); textAlign(LEFT, CENTER);
    text("◀ VILLAGE", 14, height*0.5);
    fill(255,220,100, a*0.25); rect(0, 0, 10, height);
  }

  let dxR = DESERT_WIDTH - user.x;
  if(dxR < 600) {
    let a = map(dxR, 0, 600, 240, 60);
    fill(220,185,80, a); noStroke();
    textSize(20); textAlign(RIGHT, CENTER);
    text("TEMPLE ▶", width-14, height*0.5);
    fill(220,185,80, a*0.25); rect(width-10, 0, 10, height);
  }
  pop();
}

// ==========================================
// PNJ
// ==========================================
class DesertPNJ {
  constructor(x, y, col, nom, dialogues, estMarchand) {
    this.x           = x;
    this.y           = y;
    this.col         = col;
    this.nom         = nom;
    this.dialogues   = dialogues;
    this.estMarchand = estMarchand;
    this.dialogIdx   = 0;
    this.parle       = false;
    this.cooldown    = 0;
  }

  display() {
    let ds = _depthScale(this.y);
    let s  = height * 0.11 * ds;
    push(); noStroke();

    fill(0,0,0,26); ellipse(this.x, this.y+s*.1, s*.85,s*.2);
    fill(...this.col); rectMode(CENTER);
    rect(this.x, this.y-s*.35, s*.62,s*.92, s*.1);
    fill(196,150,106); circle(this.x, this.y-s*1.05, s*.52);
    fill(this.col[0]*.62, this.col[1]*.62, this.col[2]*.62);
    arc(this.x, this.y-s*1.08, s*.56,s*.42, PI, TWO_PI);
    rect(this.x, this.y-s*1.25, s*.58,s*.12, s*.04);
    fill(36); circle(this.x-s*.1, this.y-s*1.05, s*.07);
    circle(this.x+s*.1, this.y-s*1.05, s*.07);

    if (this.estMarchand) {
      textSize(s*.5); textAlign(CENTER,CENTER);
      text("🛒", this.x, this.y-s*1.7);
    }

    if (typeof user !== 'undefined') {
      let d = abs(user.x - this.x);
      if (d < 150) {
        if (this.parle) this._bulle(this.dialogues[this.dialogIdx > 0 ? this.dialogIdx - 1 : this.dialogues.length - 1].texte, s);
        else {
          let lbl = this.estMarchand ? "[E] Parler / Trader" : "[E] Parler";
          _bulleTexte(this.x, this.y-s*1.65, lbl, [255,240,200],[140,100,20]);
        }
      } else {
        this.parle = false;
      }
    }
    if (this.cooldown > 0) this.cooldown--;
    pop();
  }

  parlerAvec() {
    if (this.cooldown > 0) return;
    this.parle = true;
    _parlerVoix(this.dialogues[this.dialogIdx]);
    this.dialogIdx = (this.dialogIdx + 1) % this.dialogues.length;
    this.cooldown = 30;
    if (this.estMarchand) {
      desertTradeOuvert = !desertTradeOuvert;
      desertTradePNJ    = this;
    }
  }

  _bulle(texte, s) {
    push();
    let bx=this.x, by=this.y-s*2;
    let bw=max(180, min(320, texte.length*6.5+24)), bh=44;
    fill(255,248,220,238); stroke(200,160,80); strokeWeight(1.5);
    rectMode(CENTER); rect(bx,by,bw,bh,11);
    noStroke(); fill(255,248,220,238);
    triangle(bx-9,by+bh/2, bx+9,by+bh/2, bx,by+bh/2+11);
    noStroke(); fill(52,28,6);
    textAlign(CENTER,CENTER); textSize(11);
    let mots=texte.split(' '), ligne='', lignes=[];
    for(let m of mots){
      if((ligne+m).length>38){lignes.push(ligne.trim());ligne='';}
      ligne+=m+' ';
    }
    lignes.push(ligne.trim());
    for(let i=0;i<lignes.length;i++) text(lignes[i],bx,by-(lignes.length-1)*7+i*14);
    pop();
  }
}

// ==========================================
// VOIX
// ==========================================
function _initVoix() {
  if (!('speechSynthesis' in window)) { desertSpeechActif=false; return; }
  speechSynthesis.onvoiceschanged = () => {
    let v = speechSynthesis.getVoices();
    desertVoix = v.find(x=>x.lang.startsWith('fr')) ||
                 v.find(x=>x.lang.startsWith('ar')) || v[0] || null;
  };
  speechSynthesis.getVoices();
}

function _parlerVoix(dialogue) {
  if (!desertSpeechActif || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  let u = new SpeechSynthesisUtterance(dialogue.texte);
  u.lang = 'fr-FR';
  if (desertVoix) u.voice = desertVoix;
  switch(dialogue.voix) {
    case 'marchand': u.pitch=0.55; u.rate=0.95; break;
    case 'nomade':   u.pitch=0.45; u.rate=0.85; break;
    case 'sage':     u.pitch=0.40; u.rate=0.78; break;
    case 'garde':    u.pitch=0.38; u.rate=1.00; break;
    case 'archeo':   u.pitch=0.65; u.rate=1.05; break;
    default:         u.pitch=0.50; u.rate=0.95;
  }
  speechSynthesis.speak(u);
}

// ==========================================
// TRADE
// ==========================================
function _dessinerTrade() {
  push(); resetMatrix();
  let pw=min(500, width*0.9), ph=min(400, height*0.85);
  let px=width/2-pw/2, py=height/2-ph/2;

  fill(40,28,14,232); stroke(220,180,80); strokeWeight(2);
  rectMode(CORNER); rect(px,py,pw,ph,12);

  noStroke(); fill(255,220,100);
  textAlign(CENTER,TOP); textSize(17);
  text("🛒 "+desertTradePNJ.nom, px+pw/2, py+14);

  let tabW=pw/2;
  fill(desertTradeTab===0?[210,160,60]:[80,55,25]);
  rect(px,py+42,tabW,28,4);
  fill(desertTradeTab===1?[210,160,60]:[80,55,25]);
  rect(px+tabW,py+42,tabW,28,4);
  fill(255,230,150); textSize(12); textAlign(CENTER,CENTER);
  text("Acheter",px+tabW/2,py+56); text("Vendre",px+tabW*1.5,py+56);
  fill(255,210,80); textSize(12); textAlign(RIGHT,TOP);
  text("🪙 "+desertOr, px+pw-12, py+14);

  let rowH = min(50, (ph-82) / max(DESERT_CATALOGUE.length, 1));

  if (desertTradeTab===0) {
    for(let i=0;i<DESERT_CATALOGUE.length;i++){
      let item=DESERT_CATALOGUE[i];
      let iy=py+78+i*rowH;
      fill(60,42,20,175); noStroke(); rect(px+10,iy,pw-20,rowH-6,6);
      fill(255,235,180); textSize(18); textAlign(LEFT,CENTER);
      text(item.icone,px+18,iy+rowH/2-3);
      fill(255,228,158); textSize(11);
      text(item.nom,px+46,iy+rowH/2-8);
      fill(190,190,190); textSize(9);
      text(item.desc,px+46,iy+rowH/2+6);
      fill(255,210,60); textSize(12); textAlign(RIGHT,CENTER);
      text("🪙"+item.prix, px+pw-55,iy+rowH/2-3);
      let bx=px+pw-34,by=iy+rowH/2-3;
      let ok=desertOr>=item.prix;
      fill(ok?[48,178,78]:[100,58,58]);
      rect(bx-16,by-11,32,22,5);
      fill(255); textSize(10); textAlign(CENTER,CENTER);
      text(ok?"OK":"✕",bx,by);
      if(ok&&mouseIsPressed&&mouseX>bx-16&&mouseX<bx+16&&mouseY>by-11&&mouseY<by+11){
        desertOr-=item.prix;
        desertInventaire[item.nom]=(desertInventaire[item.nom]||0)+1;
        if(item.effet==="stamina+40") desertStamina=min(100,desertStamina+40);
        if(item.effet==="stamina+15") desertStamina=min(100,desertStamina+15);
        if(item.effet==="lampe") {
          if(typeof joueurPossedeLampe !== 'undefined') joueurPossedeLampe = true;
        }
        _notif("Acheté : "+item.icone+" "+item.nom);
      }
    }
  } else {
    let items=Object.keys(desertInventaire);
    if(items.length===0){
      fill(178,158,118); textSize(12); textAlign(CENTER,CENTER);
      text("Inventaire vide",px+pw/2,py+ph/2);
    }
    for(let i=0;i<items.length;i++){
      let nom=items[i],qte=desertInventaire[nom];
      let ref=DESERT_CATALOGUE.find(c=>c.nom===nom);
      let pv=ref?floor(ref.prix*.55):5;
      let iy=py+78+i*rowH;
      fill(60,42,20,175); noStroke(); rect(px+10,iy,pw-20,rowH-6,6);
      let ico=ref?ref.icone:"📦";
      fill(255,235,180); textSize(18); textAlign(LEFT,CENTER);
      text(ico,px+18,iy+rowH/2-3);
      fill(255,228,158); textSize(11);
      text(nom+"  ×"+qte,px+46,iy+rowH/2-3);
      fill(255,210,60); textSize(10); textAlign(RIGHT,CENTER);
      text("🪙"+pv+" / u",px+pw-55,iy+rowH/2-3);
      let bx=px+pw-34,by=iy+rowH/2-3;
      fill([50,138,198]); rect(bx-16,by-11,32,22,5);
      fill(255); textSize(11); textAlign(CENTER,CENTER);
      text("↩",bx,by);
      if(mouseIsPressed&&mouseX>bx-16&&mouseX<bx+16&&mouseY>by-11&&mouseY<by+11){
        desertOr+=pv;
        desertInventaire[nom]--;
        if(desertInventaire[nom]<=0) delete desertInventaire[nom];
        _notif("Vendu : "+ico+" "+nom+" +"+pv+"🪙");
      }
    }
  }

  fill([178,48,48]); stroke(218,78,78); strokeWeight(1);
  rect(px+pw-34,py+5,26,26,5);
  noStroke(); fill(255); textSize(15); textAlign(CENTER,CENTER);
  text("✕",px+pw-21,py+18);
  if(mouseIsPressed&&mouseX>px+pw-34&&mouseX<px+pw-8&&mouseY>py+5&&mouseY<py+31){
    desertTradeOuvert=false;
  }

  if(mouseIsPressed&&mouseY>py+42&&mouseY<py+70){
    if(mouseX>px&&mouseX<px+tabW) desertTradeTab=0;
    if(mouseX>px+tabW&&mouseX<px+pw) desertTradeTab=1;
  }
  pop();
}

// ==========================================
// MICRO
// ==========================================
function _initMicro() {
  try {
    desertMic = new p5.AudioIn();
    desertMic.start();
    desertMicActif = true;
  } catch(e) {
    console.warn("Micro non disponible :", e);
    desertMicActif = false;
  }
}

function _gererMicro() {
  if (!desertMicActif || !desertMic) return;
  desertMicVol = lerp(desertMicVol, desertMic.getLevel(), 0.25);

  push(); resetMatrix();
  let mx=width-95, my=height-28, bw=72, bh=10;
  fill(0,0,0,100); noStroke(); rect(mx,my,bw,bh,3);
  let vc = desertMicVol>0.12 ? color(255,80,50) : color(78,198,118);
  fill(vc); rect(mx,my, bw*min(desertMicVol*6,1),bh,3);
  noStroke(); fill(215,215,215); textSize(10); textAlign(LEFT,CENTER);
  text("🎤 "+(desertMicVol>0.12?"CRIE!":"micro"), mx, my-12);
  pop();

  if(desertMicVol>0.12){
    desertTempete=min(100, desertTempete+4);
    for(let s of desertScorpions) if(random()<0.04) s.fuir();
    if(typeof user!=='undefined'&&frameCount%3===0){
      for(let i=0;i<4;i++){
        desertParticules.push({
          x:user.x+random(-60,60), y:user.y+random(-30,30),
          vx:random(-2,2), vy:random(-3,0),
          vie:45, maxVie:45, col:[218,182,118]
        });
      }
    }
  } else {
    desertTempete=max(0, desertTempete-1.2);
  }
}

// ==========================================
// PARTICULES
// ==========================================
function _majParticules() {
  for(let i=desertParticules.length-1;i>=0;i--){
    let p=desertParticules[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.07; p.vie--;
    if(p.vie<=0){desertParticules.splice(i,1);continue;}
    let a=map(p.vie,0,p.maxVie,0,200);
    noStroke(); fill(p.col[0],p.col[1],p.col[2],a);
    circle(p.x,p.y,6);
  }
}

// ==========================================
// CLAVIER
// ==========================================
function _gererClavier() {
  if(typeof user==='undefined') return;

  let spd = 3.5;
  if(keyIsDown(90)||keyIsDown(87)) user.y -= spd;
  if(keyIsDown(83))                user.y += spd;
  if(keyIsDown(81))                user.x -= spd;
  if(keyIsDown(68))                user.x += spd;
  user.x = constrain(user.x, 0, DESERT_WIDTH);
  user.y = constrain(user.y, height * 0.44, height * 0.95);

  let pressedE = keyIsPressed && (key === 'e' || key === 'E');
  if (pressedE && !desertInteractKey) {
    desertInteractKey = true;
    for (let p of desertPNJs) {
      if (abs(user.x - p.x) < 150) {
        p.parlerAvec();
        break;
      }
    }
    for (let c of desertCoffres) {
      if (!c.ouvert && abs(user.x - c.x) < 120) {
        c._ouvrir();
        break;
      }
    }
  }
  if (!keyIsPressed) desertInteractKey = false;

  let pressedT = keyIsPressed && (key === 't' || key === 'T');
  if (pressedT && !desertTameKey) {
    desertTameKey = true;
    for (let d of desertDromadaires) {
      if (!d.apprivoise && abs(user.x - d.x) < 140) {
        if ((desertInventaire["Dattes"] || 0) >= 1) {
          desertInventaire["Dattes"]--;
          if (desertInventaire["Dattes"] <= 0) delete desertInventaire["Dattes"];
          d.apprivoise = true;
          d.suivreJoueur = true;
          _notif("🐪 Dromadaire apprivoisé ! Il vous suit maintenant.");
        } else {
          _notif("🌴 Il vous faut des dattes pour apprivoiser ce dromadaire !");
        }
        break;
      }
    }
  }
  if (!(keyIsPressed && (key === 't' || key === 'T'))) desertTameKey = false;
}

// ==========================================
// OASIS [F]
// ==========================================
function _gererOasis() {
  if(typeof user==='undefined') return;
  let dansOasis=false;
  for(let o of desertOasis){
    if(dist(user.x,user.y,o.x,o.y)<100){
      dansOasis=true;
      _bulleTexte(user.x, user.y-height*.1, "[F] Boire – "+o.nom, [218,244,255],[28,118,158]);
      if(keyIsPressed&&(key==='f'||key==='F')&&!desertBoireKey){
        desertBoireKey=true;
        desertStamina=min(100,desertStamina+2);
        for(let i=0;i<6;i++){
          desertParticules.push({
            x:o.x+random(-30,30),y:o.y+random(-15,15),
            vx:random(-1.5,1.5),vy:random(-3,-.5),
            vie:50,maxVie:50,col:[78,188,228]
          });
        }
      }
      if(!(keyIsPressed&&(key==='f'||key==='F'))) desertBoireKey=false;
    }
  }
  if(!dansOasis){
    desertStamina=max(0,desertStamina-0.032);
    desertBoireKey=false;
  }
}

// ==========================================
// SON VENT
// ==========================================
function _gererSonVent() {
  if(typeof sonVent==='undefined'||!sonVent) return;
  if(typeof user==='undefined') return;
  let dMin=9999;
  for(let o of desertOasis){
    let d=dist(user.x,user.y,o.x,o.y);
    if(d<dMin) dMin=d;
  }
  let vol=map(dMin,0,900,0,1,true);
  vol=max(vol,map(desertTempete,0,100,0,0.8));
  if(!sonVent.isPlaying()) sonVent.loop();
  sonVent.setVolume(vol);
}

// ==========================================
// HUD
// ==========================================
let _notifMsg='', _notifTimer=0;
function _notif(msg){_notifMsg=msg;_notifTimer=160;}

function _dessinerHUD() {
  push(); resetMatrix();
  let bx=16,by=16;

  fill(255,212,58); textSize(14); textAlign(LEFT,TOP);
  text("🪙 "+desertOr, bx, by+4);

  let items=Object.keys(desertInventaire);
  if(items.length>0){
    let iy=by+26;
    fill(0,0,0,85); rect(bx,iy,min(190,width*.16), 14+items.length*17,5);
    fill(218,198,148); textSize(10); textAlign(LEFT,TOP);
    text("Inventaire :",bx+4,iy+3);
    for(let i=0;i<items.length;i++){
      let ref=DESERT_CATALOGUE.find(c=>c.nom===items[i]);
      let ico=ref?ref.icone:"📦";
      fill(255,232,178);
      text(ico+" "+items[i]+" ×"+desertInventaire[items[i]], bx+7,iy+15+i*16);
    }
  }

  if(desertTempete>15){
    fill(238,158,48,100+desertTempete);
    textSize(13); textAlign(CENTER,TOP);
    text("🌪 Tempête de sable !", width/2, 36);
  }

  if(_notifTimer>0){
    _notifTimer--;
    let a=min(255,_notifTimer*3);
    fill(255,228,98,a);
    textSize(15); textAlign(CENTER,CENTER);
    text(_notifMsg, width/2, height-52);
  }

  fill(0,0,0,68); rect(width-165,height-90,158,84,6);
  fill(198,188,158); textSize(10); textAlign(LEFT,TOP);
  text("[E] Parler/Coffre/Trader\n[F] Boire à l'oasis\n[T] Apprivoiser dromadaire\n[ZQSD] Se déplacer\n🎤 Crier → tempête", width-159,height-84);

  pop();
}

// ==========================================
// UTILITAIRES
// ==========================================
function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

// ==========================================
// COLLISIONS
// ==========================================
const DESERT_ROCHERS_COLL = [
  { x: 520,  r: 45 }, { x: 1520, r: 38 }, { x: 2080, r: 52 },
  { x: 3150, r: 42 }, { x: 3880, r: 48 }, { x: 4800, r: 38 },
  { x: 5080, r: 45 }, { x: 5520, r: 42 },
];
const DESERT_CACTUS_COLL = [
  { x: 850,  r: 25 }, { x: 1400, r: 22 }, { x: 2700, r: 28 },
  { x: 3500, r: 24 }, { x: 4600, r: 26 }, { x: 5200, r: 24 },
];
const DESERT_COLONNES_COLL = [
  { x: 380,  r: 30 }, { x: 1900, r: 28 }, { x: 3050, r: 32 }, { x: 4450, r: 29 },
];

function _appliquerCollisions() {
  if (typeof user === 'undefined' || !desertInitDone) return;
  let sol = desertSolY;

  for (let r of DESERT_ROCHERS_COLL) {
    let d = dist(user.x, user.y, r.x, sol);
    if (d < r.r + 20) {
      let ang = atan2(user.y - sol, user.x - r.x);
      user.x = r.x + cos(ang) * (r.r + 22);
    }
  }
  for (let c of DESERT_CACTUS_COLL) {
    let d = dist(user.x, user.y, c.x, sol);
    if (d < c.r + 18) {
      let ang = atan2(user.y - sol, user.x - c.x);
      user.x = c.x + cos(ang) * (c.r + 20);
    }
  }
  for (let col of DESERT_COLONNES_COLL) {
    let d = dist(user.x, user.y, col.x, sol);
    if (d < col.r + 18) {
      let ang = atan2(user.y - sol, user.x - col.x);
      user.x = col.x + cos(ang) * (col.r + 20);
    }
  }
}

// ==========================================
// VILLAGE ARRIÈRE-PLAN
// ==========================================
function _dessinerVillageArrierePlan() {
  let hz  = desertHorizonY;
  let sol = desertHorizonY + height * 0.08;
  let alpha = 180;

  push(); noStroke();
  _maisonDesertFond(80,  sol, 100, 70, alpha);
  _maisonDesertFond(220, sol, 120, 80, alpha);
  _maisonDesertFond(380, sol,  90, 60, alpha);
  _maisonDesertFond(520, sol, 110, 75, alpha);
  _maisonDesertFond(680, sol,  95, 65, alpha);

  let vzx = 300, vzy = height * 0.65;
  fill(210, 170, 100, 40);
  stroke(210, 170, 100, 120);
  strokeWeight(2);
  rectMode(CENTER);
  rect(vzx, vzy, 280, 140, 8);

  noStroke();
  fill(210,170,100,240);
  rectMode(CENTER);
  rect(vzx, vzy - 60, 120, 35, 6);
  fill(60,30,10);
  textSize(14); textAlign(CENTER,CENTER);
  text("← VILLAGE", vzx, vzy - 60);

  fill(210,170,100,180);
  textSize(20);
  text("◀ ◀ ◀", vzx - 100, vzy);
  fill(255,240,200,140);
  textSize(12);
  text("Bienvenue !", vzx, vzy + 50);
  pop();
}

function _maisonDesertFond(x, baseY, w, h, al) {
  push(); noStroke();
  fill(150,120,70, al*0.35);
  ellipse(x+w/2, baseY+4, w*0.9, 12);
  fill(210,175,120, al);
  rectMode(CORNER); rect(x, baseY-h, w, h, 3);
  fill(170,130,85, al);
  rect(x-4, baseY-h-8, w+8, 10, 2);
  fill(100,65,30, al);
  rect(x+w/2-10, baseY-30, 20, 30, 2);
  fill(255,220,140, al*0.7);
  rect(x+8, baseY-h+12, 16, 14, 2);
  if(w>80) rect(x+w-24, baseY-h+12, 16, 14, 2);
  pop();
}

// ==========================================
// TEMPLE ARRIÈRE-PLAN
// ==========================================
function _dessinerTempleArrierePlan() {
  let sol = desertHorizonY + height * 0.06;

  push(); noStroke();
  let tx = DESERT_WIDTH - 520;
  _pyramideFond(tx,       sol, 180, 150, 180);
  _pyramideFond(tx + 220, sol, 140, 120, 155);
  _pyramideFond(tx - 200, sol, 110,  95, 145);

  let tzx = DESERT_WIDTH - 300, tzy = height * 0.62;
  fill(220, 185, 80, 40);
  stroke(220, 185, 80, 120);
  strokeWeight(2);
  rectMode(CENTER);
  rect(tzx, tzy, 300, 140, 8);

  noStroke();
  fill(220,185,80,250);
  rectMode(CENTER);
  rect(tzx, tzy - 60, 130, 35, 6);
  fill(60,40,5);
  textSize(14); textAlign(CENTER,CENTER);
  text("TEMPLE →", tzx, tzy - 60);

  fill(220,185,80,180);
  textSize(20);
  text("▶ ▶ ▶", tzx + 110, tzy);
  fill(255,240,200,140);
  textSize(12);
  text("Mystérieux...", tzx, tzy + 50);
  pop();
}

function _pyramideFond(x, baseY, w, h, al) {
  push(); noStroke();
  fill(180,145,90, al);
  triangle(x, baseY, x+w, baseY, x+w/2, baseY-h);
  fill(155,120,65, al);
  triangle(x+w/2-8, baseY, x+w/2+8, baseY, x+w/2, baseY-h);
  fill(60,40,10, al);
  let ew=w*0.15, eh=h*0.25;
  rectMode(CORNER); rect(x+w/2-ew/2, baseY-eh, ew, eh, 2);
  pop();
}

function _bulleTexte(x,y,texte,bg,border){
  push();
  textSize(11);
  let bw=max(138,textWidth(texte)+22),bh=22;
  fill(bg[0],bg[1],bg[2],212);
  stroke(border[0],border[1],border[2],198); strokeWeight(1.2);
  rectMode(CENTER); rect(x,y,bw,bh,7);
  noStroke(); fill(border[0]*.38,border[1]*.38,border[2]*.38);
  textAlign(CENTER,CENTER); text(texte,x,y);
  pop();
}

// ==========================================
// VUE VILLAGE DE SECOURS
// ==========================================
function _ensureVillageView(views) {
  if (views["village"]) return;

  views["village"] = new View("Le Village", function() {
    for (let y = 0; y < height; y++) {
      let t = y / height;
      stroke(lerp(255, 240, t), lerp(236, 200, t), lerp(188, 140, t));
      line(0, y, width, y);
    }
    noStroke();
    fill(226, 188, 138);
    rect(0, height * 0.55, width, height * 0.45);
    fill(201, 160, 96);
    for (let i = 0; i < 5; i++) {
      ellipse(i * 800 + 300, height * 0.55 + 10, 900, 120);
    }
  });

  views["village"].displayContent = function() {
    let sol = height * 0.55;
    _maisonDesertFond(200, sol, 120, 80, 255);
    _maisonDesertFond(380, sol, 100, 70, 255);
    _maisonDesertFond(560, sol, 140, 90, 255);
    _maisonDesertFond(760, sol, 110, 75, 255);

    fill(180, 140, 80);
    rectMode(CORNER); noStroke();
    rect(width - 60, 0, 60, height);

    push();
    let px = width - 120, py = height * 0.45;
    fill(210, 170, 100, 220); noStroke();
    rectMode(CENTER); rect(px, py, 110, 28, 5);
    fill(60, 30, 10); textSize(12); textAlign(CENTER, CENTER); noStroke();
    text("DÉSERT →", px, py);
    pop();

    if (typeof user !== 'undefined' && user.x > width - 150) {
      currentView = "entree";
      user.x = 600;
      desertCamX = 0;
    }
  };
}
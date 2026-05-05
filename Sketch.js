// ── Systèmes globaux (persistent entre les planètes) ──
let interactions, quests, crystals;

// ── Navigation ──
let planeteActuelle;
let indexPlanete = 6;

const PLANETES = [
  // index 0 : Test1  →  index 1 : Test2  (via vaisseau)
  // Les autres planètes sont accessibles via N / B
  () => new Test1(interactions, quests, crystals),
  () => new Test2(interactions, quests, crystals),
  () => new BasePlanet(interactions, quests, crystals),
  () => new GraillePlanet(interactions, quests, crystals),
  () => new GamblingPlanet(interactions, quests, crystals),
  () => new MusiquePlanet(interactions, quests, crystals),
  () => new NebulionPlanet(interactions, quests, crystals),
  () => new DigitalPlanet(interactions, quests, crystals),
  () => new DesertPlanet(interactions, quests, crystals),
];
const NOMS = ["Test 1","Test 2","Base","Graille","Gambling","Musique","Nebulion","Digital","Désert"];

function allerPlanete(index) {
  planeteActuelle.unload();
  interactions.clearBindings();   // ← évite les doublons de bindings
  quests.clearAllQuests();
  indexPlanete    = ((index % PLANETES.length) + PLANETES.length) % PLANETES.length;
  planeteActuelle = PLANETES[indexPlanete]();
}

window.setup = function () {
  createCanvas(windowWidth, windowHeight);
  textFont("system-ui");

  interactions = new InteractionManager(); 
  interactions.init();

  quests       = new QuestSystem();
  crystals     = new CrystalSystem();  // ne se recrée JAMAIS → mémorise les cristaux

  planeteActuelle = PLANETES[6]();

  // Navigation clavier (N = suivante, B = précédente)
  interactions.bindAction("KeyN", () => allerPlanete(indexPlanete + 1));
  interactions.bindAction("KeyB", () => allerPlanete(indexPlanete - 1));
};

window.draw = function () {
  planeteActuelle.draw();

  // Sketch surveille readyToLaunch chaque frame
  // → déclenché par InteractionVaisseau (Test1) ou InteractionRetour (Test2)
  if (planeteActuelle.readyToLaunch) {
    const dest = indexPlanete === 0 ? 1 : 0; // Test1↔Test2, sinon retour
    allerPlanete(dest);
  }

  // HUD navigation
  noStroke(); fill(255,255,255,70); textAlign(CENTER,BOTTOM); textSize(11);
  text(`[B] ←  ${NOMS[indexPlanete]}  (${indexPlanete+1}/${PLANETES.length})  → [N]`, width/2, height-14);
};

window.windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
};

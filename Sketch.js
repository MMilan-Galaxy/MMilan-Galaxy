let planet
let crystalSystem
let questSystem

function setup() {
  createCanvas(windowWidth, windowHeight)
  
  // Systèmes globaux
  crystalSystem = new CrystalSystem()
  questSystem   = new QuestSystem()
  
  // Rend les systèmes accessibles globalement
  window.crystalSystem = crystalSystem
  window.questSystem   = questSystem
  
  // Planète active
  planet = new NebulionPlanet()
}

function draw() {
  planet.draw()
  // Les HUD sont déjà affichés via le DOM, pas besoin de .draw() ici
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}
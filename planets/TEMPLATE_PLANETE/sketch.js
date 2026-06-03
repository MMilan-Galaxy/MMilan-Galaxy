// ============================================================
//  TEMPLATE — sketch.js
//  Remplace ce fichier par la logique de ta planète.
// ============================================================

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  background(0, 10);

  // --- Ton code ici ---
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("🪐 Ma Planète", width / 2, height / 2);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

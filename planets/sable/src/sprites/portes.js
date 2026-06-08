// ==========================================
// DESIGNS DE PORTE - Fonctions personnalisées
// ==========================================

/**
 * Porte de temple style projet SAE4.2
 * Couleurs et style exacts du backgroundDesertTemple
 */
function porteTemple(x, y, w, h, options) {
  push();
  translate(x, y);
  rectMode(CENTER);
  
  // Couleurs exactes du projet
  let sandColor = color(214, 187, 158, options.alpha);    // Fond sable
  let stoneColor = color(222, 184, 135, options.alpha);   // Pierre principale
  let shadowColor = color(194, 154, 108, options.alpha);  // Ombres pierres
  let tunnelVoid = color(40, 35, 30, options.alpha);      // Intérieur tunnel

  // --- CADRE PRINCIPAL (style pierres du background) ---
  noStroke();
  // Ombre portée (comme dans le background)
  fill(0, 0, 0, 40);
  rect(2, 2, w, h, 3);
  // Pierre principale
  fill(stoneColor);
  rect(0, 0, w, h, 3);
  
  // --- OUVERTURE RECTANGULAIRE (style simple) ---
  fill(tunnelVoid);
  let ow = w * 0.6;  // Largeur ouverture
  let oh = h * 0.9;  // Hauteur ouverture
  rect(0, 0, ow, oh);
  
  // --- CONTOUR DE L'OUVERTURE ---
  noFill();
  stroke(shadowColor);
  strokeWeight(2);
  rect(0, 0, ow, oh);
  
  // --- DÉCORATION EN PIERRES AUTOUR ---
  noStroke();
  // Pierre supérieure (linteau)
  fill(stoneColor);
  rect(0, -h * 0.4, w * 0.8, h * 0.15, 2);
  // Ombre du linteau
  fill(0, 0, 0, 40);
  rect(2, -h * 0.4 + 2, w * 0.8, h * 0.15, 2);
  
  // Pierres latérales (piliers)
  fill(stoneColor);
  rect(-w * 0.35, 0, w * 0.12, h * 0.6, 2);
  rect(w * 0.35, 0, w * 0.12, h * 0.6, 2);
  // Ombres des piliers
  fill(0, 0, 0, 40);
  rect(-w * 0.35 + 2, 2, w * 0.12, h * 0.6, 2);
  rect(w * 0.35 + 2, 2, w * 0.12, h * 0.6, 2);
  
  // --- FISSURES FIXES (style du background) ---
  stroke(shadowColor);
  strokeWeight(1);
  // Fissure principale fixe
  line(-w * 0.2, -h * 0.1, -w * 0.1, h * 0.1);
  // Petite fissure secondaire
  line(w * 0.15, -h * 0.05, w * 0.25, h * 0.05);

  pop();
}

// Design de porte échelle en bois
function porteEchelleBois(x, y, w, h, options) {
  push();
  translate(x, y);
  
  // Montants verticaux de l'échelle (bois sombre)
  fill(101, 67, 33, options.alpha);
  noStroke();
  rectMode(CENTER);
  
  // Montant gauche
  rect(-w * 0.35, 0, w * 0.15, h);
  // Montant droit
  rect(w * 0.35, 0, w * 0.15, h);
  
  // Barreaux horizontaux de l'échelle
  fill(139, 90, 43, options.alpha);
  let nbBarreaux = 8;
  let espaceBarreaux = h / (nbBarreaux + 1);
  
  for (let i = 1; i <= nbBarreaux; i++) {
    let yPos = -h/2 + (i * espaceBarreaux);
    // Barreau principal
    rect(0, yPos, w * 0.7, h * 0.08);
    
    // Effet de texture bois (plus clair au centre)
    fill(160, 110, 60, options.alpha * 0.7);
    rect(0, yPos, w * 0.5, h * 0.04);
    fill(139, 90, 43, options.alpha);
  }
  
  // Noeuds et détails dans le bois
  fill(80, 50, 25, options.alpha * 0.5);
  // Quelques noeuds sur les montants
  circle(-w * 0.35, -h * 0.3, 4);
  circle(w * 0.35, h * 0.2, 3);
  circle(-w * 0.35, h * 0.4, 5);
  
  // Ombre pour effet de profondeur
  fill(0, 0, 0, options.alpha * 0.2);
  rect(2, 2, w * 0.8, h * 0.9);
  
  pop();
}

// Design de porte échelle en corde
function porteEchelleCorde(x, y, w, h, options) {
  push();
  translate(x, y);
  
  // Cordes verticales (brun foncé)
  stroke(101, 67, 33, options.alpha);
  strokeWeight(4);
  noFill();
  
  // Corde gauche avec effet de torsion
  beginShape();
  for (let i = -h/2; i <= h/2; i += 5) {
    let xOffset = sin(i * 0.1) * 2;
    vertex(-w * 0.35 + xOffset, i);
  }
  endShape();
  
  // Corde droite avec effet de torsion
  beginShape();
  for (let i = -h/2; i <= h/2; i += 5) {
    let xOffset = sin(i * 0.1 + PI) * 2;
    vertex(w * 0.35 + xOffset, i);
  }
  endShape();
  
  // Barreaux en bois
  noStroke();
  fill(139, 90, 43, options.alpha);
  let nbBarreaux = 8;
  let espaceBarreaux = h / (nbBarreaux + 1);
  
  for (let i = 1; i <= nbBarreaux; i++) {
    let yPos = -h/2 + (i * espaceBarreaux);
    let angle = sin(i * 0.3) * 0.05; // Légère inclinaison aléatoire
    
    push();
    translate(0, yPos);
    rotate(angle);
    
    // Barreau principal
    rect(0, 0, w * 0.75, h * 0.06);
    
    // Texture bois
    fill(160, 110, 60, options.alpha * 0.6);
    rect(0, 0, w * 0.6, h * 0.03);
    
    // Noeuds sur les barreaux
    fill(80, 50, 25, options.alpha * 0.7);
    circle(-w * 0.3, 0, 3);
    circle(w * 0.25, 0, 2);
    
    pop();
  }
  
  // Noeuds aux extrémités des cordes
  fill(101, 67, 33, options.alpha);
  noStroke();
  circle(-w * 0.35, -h/2, 6);
  circle(w * 0.35, -h/2, 6);
  circle(-w * 0.35, h/2, 6);
  circle(w * 0.35, h/2, 6);
  
  // Ombre pour effet de profondeur
  fill(0, 0, 0, options.alpha * 0.15);
  rect(2, 2, w * 0.8, h * 0.9);
  
  pop();
}
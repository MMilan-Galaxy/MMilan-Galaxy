// ==========================================
// SPRITES DE TORCHES - Torches décoratives animées
// ==========================================

// Variables globales pour l'animation des flammes
let torchAnimationTime = 0;

/**
 * Dessine une torche murale avec flamme animée
 * @param {number} x - Position X de la torche
 * @param {number} y - Position Y de la torche
 * @param {Object} options - Options de personnalisation
 * @param {number} options.scale - Échelle de la torche (défaut: 1.0)
 * @param {number} options.alpha - Transparence (défaut: 255)
 * @param {boolean} options.lit - Si la torche est allumée (défaut: true)
 */
function torcheMurale(x, y, options = {}) {
  // Valeurs par défaut
  const defaultOptions = {
    scale: 1.0,
    alpha: 255,
    lit: true
  };
  
  const opts = Object.assign(defaultOptions, options);
  
  push();
  translate(x, y);
  scale(opts.scale);
  
  // Support de torche en métal noir
  fill(40, 40, 40, opts.alpha);
  noStroke();
  rectMode(CENTER);
  
  // Montant principal
  rect(0, 15, 8, 40);
  
  // Support mural
  rect(0, -5, 16, 8);
  
  // Détails du support
  fill(60, 60, 60, opts.alpha);
  circle(-8, -5, 4);
  circle(8, -5, 4);
  
  // Manche en bois
  fill(101, 67, 33, opts.alpha);
  rect(0, 25, 6, 30);
  
  // Texture du bois
  fill(139, 90, 43, opts.alpha * 0.6);
  rect(0, 25, 4, 30);
  
  // Base de la flamme (tissu/chanvre)
  fill(180, 140, 90, opts.alpha);
  ellipse(0, 5, 12, 8);
  
  // Si la torche est allumée, dessiner la flamme animée
  if (opts.lit) {
    drawFlammeAnimee(0, -5, opts.alpha);
  }
  
  pop();
}

/**
 * Dessine une flamme animée avec plusieurs couches
 * @param {number} x - Position X de la flamme
 * @param {number} y - Position Y de la flamme  
 * @param {number} alpha - Transparence de la flamme
 */
function drawFlammeAnimee(x, y, alpha) {
  // Animation basée sur le temps global
  let time = torchAnimationTime * 0.1;
  
  // Couche extérieure (flamme orange)
  push();
  translate(x, y);
  
  // Flamme extérieure - orange vif
  fill(255, 140, 0, alpha * 0.8);
  noStroke();
  
  beginShape();
  let flameHeight = 25 + sin(time * 2) * 3;
  let flameWidth = 12 + cos(time * 3) * 2;
  
  vertex(-flameWidth/2, 0);
  bezierVertex(
    -flameWidth/2 - 2, -flameHeight * 0.3,
    -flameWidth/4, -flameHeight * 0.6,
    0, -flameHeight
  );
  bezierVertex(
    flameWidth/4, -flameHeight * 0.6,
    flameWidth/2 + 2, -flameHeight * 0.3,
    flameWidth/2, 0
  );
  endShape(CLOSE);
  
  // Flamme intérieure - jaune vif
  fill(255, 200, 0, alpha * 0.9);
  
  beginShape();
  let innerHeight = 18 + sin(time * 2.5) * 2;
  let innerWidth = 8 + cos(time * 4) * 1.5;
  
  vertex(-innerWidth/2, 0);
  bezierVertex(
    -innerWidth/2 - 1, -innerHeight * 0.3,
    -innerWidth/4, -innerHeight * 0.6,
    0, -innerHeight
  );
  bezierVertex(
    innerWidth/4, -innerHeight * 0.6,
    innerWidth/2 + 1, -innerHeight * 0.3,
    innerWidth/2, 0
  );
  endShape(CLOSE);
  
  // Cœur de la flamme - blanc/bluâtre
  fill(255, 255, 200, alpha);
  
  beginShape();
  let coreHeight = 10 + sin(time * 3) * 1;
  let coreWidth = 4 + cos(time * 5) * 0.5;
  
  vertex(-coreWidth/2, 0);
  bezierVertex(
    -coreWidth/2, -coreHeight * 0.3,
    -coreWidth/4, -coreHeight * 0.6,
    0, -coreHeight
  );
  bezierVertex(
    coreWidth/4, -coreHeight * 0.6,
    coreWidth/2, -coreHeight * 0.3,
    coreWidth/2, 0
  );
  endShape(CLOSE);
  
  // Étincelles
  fill(255, 200, 0, alpha * 0.7);
  for (let i = 0; i < 3; i++) {
    let sparkTime = time + i * 2;
    let sparkX = cos(sparkTime * 8) * (flameWidth * 0.8);
    let sparkY = -abs(sin(sparkTime * 6)) * flameHeight * 0.7;
    let sparkSize = 1 + abs(sin(sparkTime * 10)) * 1.5;
    
    circle(sparkX, sparkY, sparkSize);
  }
  
  pop();
}

/**
 * Torche de sol (version alternative)
 * @param {number} x - Position X de la torche
 * @param {number} y - Position Y de la torche
 * @param {Object} options - Options de personnalisation
 */
function torcheSol(x, y, options = {}) {
  const defaultOptions = {
    scale: 1.0,
    alpha: 255,
    lit: true
  };
  
  const opts = Object.assign(defaultOptions, options);
  
  push();
  translate(x, y);
  scale(opts.scale);
  
  // Pied de la torche
  fill(60, 60, 60, opts.alpha);
  noStroke();
  rectMode(CENTER);
  rect(0, 35, 20, 8);
  
  // Tige principale
  fill(40, 40, 40, opts.alpha);
  rect(0, 15, 6, 40);
  
  // Manche en bois
  fill(101, 67, 33, opts.alpha);
  rect(0, 0, 8, 35);
  
  // Texture bois
  fill(139, 90, 43, opts.alpha * 0.6);
  rect(0, 0, 6, 35);
  
  // Base de la flamme
  fill(180, 140, 90, opts.alpha);
  ellipse(0, -15, 14, 10);
  
  // Flamme animée si allumée
  if (opts.lit) {
    drawFlammeAnimee(0, -20, opts.alpha);
  }
  
  pop();
}

/**
 * Fonction à appeler dans la boucle draw() pour animer les torches
 */
function updateTorcheAnimation() {
  torchAnimationTime += 0.1;
}

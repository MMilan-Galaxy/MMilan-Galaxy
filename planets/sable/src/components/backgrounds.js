// ==========================================
// SYSTÈME DE BACKGROUNDS AVANCÉS
// ==========================================

// Gestionnaire d'images de fond
let backgroundImages = {};

// Précharger une image de fond
function preloadBackgroundImage(name, imagePath) {
  backgroundImages[name] = loadImage(imagePath);
}

// Background avec couleur hexadécimale
function backgroundHex(hexColor) {
  background(hexColor);
}

// Background avec couleur RVB
function backgroundRGB(r, g, b) {
  background(r, g, b);
}

// Background avec dégradé
function backgroundGradient(color1, color2, direction = "vertical") {
  for (let i = 0; i <= height; i++) {
    let inter = map(i, 0, height, 0, 1);
    let c = lerpColor(color1, color2, inter);
    stroke(c);
    line(0, i, width, i);
  }
}

// Background avec image
function backgroundImage(imageName, coverMode = "cover", opacity = 255) {
  let img = backgroundImages[imageName];
  if (img) {
    push();
    tint(255, opacity);
    
    if (coverMode === "cover") {
      // Étirer pour couvrir tout l'écran
      let scale = max(width / img.width, height / img.height);
      let scaledWidth = img.width * scale;
      let scaledHeight = img.height * scale;
      let x = (width - scaledWidth) / 2;
      let y = (height - scaledHeight) / 2;
      image(img, x, y, scaledWidth, scaledHeight);
    } else if (coverMode === "contain") {
      // Adapter sans déformer
      let scale = min(width / img.width, height / img.height);
      let scaledWidth = img.width * scale;
      let scaledHeight = img.height * scale;
      let x = (width - scaledWidth) / 2;
      let y = (height - scaledHeight) / 2;
      image(img, x, y, scaledWidth, scaledHeight);
    } else if (coverMode === "repeat") {
      // Tuiler l'image
      for (let x = 0; x < width; x += img.width) {
        for (let y = 0; y < height; y += img.height) {
          image(img, x, y);
        }
      }
    } else if (coverMode === "center") {
      // Centrer à taille originale
      image(img, (width - img.width) / 2, (height - img.height) / 2);
    } else {
      // Mode personnalisé avec dimensions spécifiées
      image(img, 0, 0, width, height);
    }
    pop();
  }
}

// Background avec plusieurs images en couches
function backgroundLayers(layers) {
  layers.forEach(layer => {
    if (layer.type === 'image') {
      backgroundImage(layer.name, layer.mode || 'cover', layer.opacity || 255);
    } else if (layer.type === 'color') {
      fill(layer.color);
      noStroke();
      rect(0, 0, width, height);
    }
  });
}

// Background avec fonction personnalisée
function backgroundCustom(customFunction, params = {}) {
  if (typeof customFunction === 'function') {
    push();
    customFunction(params);
    pop();
  }
}

// Background animé avec fonction
function backgroundAnimated(animationFunction, speed = 1) {
  if (typeof animationFunction === 'function') {
    push();
    let time = frameCount * speed;
    animationFunction(time);
    pop();
  }
}

// Background avec motif de cercles
function backgroundPatternCircles(baseColor, circleColor, spacing = 50) {
  background(baseColor);
  fill(circleColor);
  noStroke();
  for (let x = spacing/2; x < width; x += spacing) {
    for (let y = spacing/2; y < height; y += spacing) {
      ellipse(x, y, spacing * 0.3);
    }
  }
}

// Background avec motif de lignes
function backgroundPatternLines(baseColor, lineColor, spacing = 20, angle = 45) {
  background(baseColor);
  stroke(lineColor);
  strokeWeight(2);
  push();
  translate(width/2, height/2);
  rotate(radians(angle));
  for (let i = -width; i < width; i += spacing) {
    line(i, -height, i, height);
  }
  pop();
}

// Background avec motif de grille
function backgroundPatternGrid(baseColor, lineColor, spacing = 40) {
  background(baseColor);
  stroke(lineColor);
  strokeWeight(1);
  for (let x = 0; x < width; x += spacing) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += spacing) {
    line(0, y, width, y);
  }
}

// Background avec motif d'étoiles
function backgroundPatternStars(baseColor, starColor, density = 50) {
  background(baseColor);
  fill(starColor);
  noStroke();
  randomSeed(12345); // Graine fixe pour motif consistant
  for (let i = 0; i < density; i++) {
    let x = random(width);
    let y = random(height);
    let size = random(2, 8);
    star(x, y, size/2, size, 5);
  }
  randomSeed(); // Réinitialiser la graine
}

// Background avec motif de vagues
function backgroundPatternWaves(baseColor, waveColor, amplitude = 20, frequency = 0.02) {
  background(baseColor);
  stroke(waveColor);
  strokeWeight(3);
  noFill();
  for (let y = 0; y < height; y += 15) {
    beginShape();
    for (let x = 0; x <= width; x += 5) {
      let yOffset = sin(x * frequency + y * 0.1) * amplitude;
      vertex(x, y + yOffset);
    }
    endShape();
  }
}

// ==========================================
// MOTIFS DE BACKGROUNDS PERSONNALISÉS
// ==========================================

// Fonction: Ciel avec nuages animés
function backgroundSkyClouds(params = {}) {
  let baseColor = params.baseColor || color(135, 206, 235);
  let cloudColor = params.cloudColor || color(255, 255, 255, 180);
  let cloudCount = params.cloudCount || 5;
  
  background(baseColor);
  
  fill(cloudColor);
  noStroke();
  for (let i = 0; i < cloudCount; i++) {
    let x = (frameCount * 0.2 + i * 200) % (width + 200) - 100;
    let y = 50 + sin(i) * 30;
    
    // Dessiner un nuage
    ellipse(x, y, 80, 60);
    ellipse(x - 30, y, 60, 50);
    ellipse(x + 30, y, 60, 50);
    ellipse(x, y - 20, 70, 50);
  }
}

// Fonction: Forêt avec arbres
function backgroundForest(params = {}) {
  let skyColor = params.skyColor || color(135, 206, 235);
  let groundColor = params.groundColor || color(34, 139, 34);
  let treeColor = params.treeColor || color(101, 67, 33);
  let leafColor = params.leafColor || color(0, 100, 0);
  
  // Ciel
  background(skyColor);
  
  // Sol
  fill(groundColor);
  noStroke();
  rect(0, height * 0.7, width, height * 0.3);
  
  // Arbres
  randomSeed(12345);
  for (let i = 0; i < 8; i++) {
    let x = i * 150 + random(-30, 30);
    let treeHeight = random(150, 250);
    let trunkWidth = random(20, 40);
    
    // Tronc
    fill(treeColor);
    rect(x - trunkWidth/2, height * 0.7 - treeHeight, trunkWidth, treeHeight);
    
    // Feuilles
    fill(leafColor);
    for (let j = 0; j < 3; j++) {
      let leafY = height * 0.7 - treeHeight + j * 40;
      let leafSize = 80 - j * 15;
      ellipse(x, leafY, leafSize * 1.5, leafSize);
    }
  }
  randomSeed();
}

// Fonction: Effet néon/techno
function backgroundNeon(params = {}) {
  let bgColor = params.bgColor || color(10, 10, 30);
  let neonColor = params.neonColor || color(0, 255, 255);
  let gridSpacing = params.gridSpacing || 50;
  
  background(bgColor);
  
  stroke(neonColor);
  strokeWeight(1);
  
  // Grille perspective
  for (let i = 0; i < 20; i++) {
    let y = height - (i * gridSpacing);
    let h = map(i, 0, 20, 2, gridSpacing);
    
    strokeWeight(h / 10);
    line(0, y, width, y);
    
    // Lignes diagonales pour effet perspective
    if (i % 3 === 0) {
      line(0, y, width/2, height);
      line(width, y, width/2, height);
    }
  }
  
  // Points lumineux
  fill(neonColor);
  noStroke();
  for (let i = 0; i < 10; i++) {
    let x = (frameCount * 2 + i * 100) % (width + 100) - 50;
    let y = height - (i * gridSpacing * 2) % height;
    let size = 5 + sin(frameCount * 0.1 + i) * 3;
    ellipse(x, y, size);
  }
}

// Fonction: Espace avec étoiles et planètes
function backgroundSpace(params = {}) {
  let bgColor = params.bgColor || color(0, 0, 20);
  let starColor = params.starColor || color(255, 255, 255);
  let planetCount = params.planetCount || 3;
  
  background(bgColor);
  
  // Étoiles
  fill(starColor);
  noStroke();
  randomSeed(54321);
  for (let i = 0; i < 200; i++) {
    let x = random(width);
    let y = random(height);
    let size = random(1, 3);
    let brightness = random(100, 255);
    fill(starColor.levels[0], starColor.levels[1], starColor.levels[2], brightness);
    ellipse(x, y, size);
  }
  randomSeed();
  
  // Planètes
  for (let i = 0; i < planetCount; i++) {
    let x = width * (0.2 + i * 0.3);
    let y = height * (0.3 + sin(i) * 0.2);
    let size = 50 + i * 20;
    let planetColor = color(
      random(100, 255),
      random(100, 255),
      random(100, 255)
    );
    
    fill(planetColor);
    noStroke();
    ellipse(x, y, size);
    
    // Anneau pour certaines planètes
    if (i % 2 === 1) {
      stroke(planetColor);
      strokeWeight(3);
      noFill();
      ellipse(x, y, size * 1.5, size * 0.3);
    }
  }
}

// Fonction: Désert avec dunes
function backgroundDesert(params = {}) {
  let skyColor = params.skyColor || color(255, 220, 150);
  let sandColor = params.sandColor || color(238, 203, 173);
  let duneColor = params.duneColor || color(205, 170, 125);
  
  // Ciel dégradé
  for (let i = 0; i <= height; i++) {
    let inter = map(i, 0, height * 0.6, 0, 1);
    let c = lerpColor(color(255, 240, 200), skyColor, inter);
    stroke(c);
    line(0, i, width, i);
  }
  
  // Dunes de sable
  noStroke();
  for (let i = 0; i < 5; i++) {
    let duneY = height * 0.6 + i * 40;
    fill(duneColor);
    beginShape();
    vertex(0, height);
    for (let x = 0; x <= width; x += 20) {
      let y = duneY + sin(x * 0.005 + i) * 30;
      vertex(x, y);
    }
    vertex(width, height);
    endShape(CLOSE);
  }
  
  // Sol principal
  fill(sandColor);
  rect(0, height - 50, width, 50);
}

// Fonction: Temple antique
function backgroundTemple(params = {}) {
  let bgColor = params.bgColor || color(139, 90, 43);
  let pillarColor = params.pillarColor || color(160, 110, 60);
  let floorColor = params.floorColor || color(101, 67, 33);
  
  background(bgColor);
  
  // Sol
  fill(floorColor);
  noStroke();
  rect(0, height * 0.8, width, height * 0.2);
  
  // Piliers
  fill(pillarColor);
  for (let i = 0; i < 8; i++) {
    let x = i * 200 + 100;
    let pillarWidth = 40;
    let pillarHeight = height * 0.7;
    
    // Base du pilier
    rect(x - pillarWidth/2, height * 0.8 - 20, pillarWidth, 20);
    
    // Corps du pilier
    rect(x - pillarWidth/2, height * 0.8 - pillarHeight, pillarWidth, pillarHeight);
    
    // Chapiteau
    rect(x - pillarWidth/2 - 10, height * 0.8 - pillarHeight - 20, pillarWidth + 20, 20);
  }
  
  // Plafond
  fill(80, 50, 30);
  rect(0, 0, width, height * 0.1);
}

// Fonction : Mur de temple du désert (Sable, Piliers romains et Ruines)
function backgroundDesertTemple(params = {}) {
  let sandColor = color(214, 187, 158);
  let stoneColor = color(222, 184, 135);
  let shadowColor = color(194, 154, 108);
  
  // Fond principal (Mur de sable)
  background(sandColor);
  
  // 1. Dessiner les pierres apparentes (Style Ruine)
  randomSeed(42); // Graine fixe pour la consistance
  noStroke();
  for (let i = 0; i < 40; i++) {
    let x = random(width);
    let y = random(height);
    let stoneW = random(40, 100);
    let stoneH = random(20, 50);
    
    // Ombre de la pierre
    fill(shadowColor);
    rect(x + 2, y + 2, stoneW, stoneH, 3);
    // Pierre
    fill(stoneColor);
    rect(x, y, stoneW, stoneH, 3);
    
    // Détails de fissures sur certaines pierres
    if (random() > 0.7) {
      stroke(shadowColor);
      strokeWeight(1);
      line(x + 5, y + 5, x + 20, y + 15);
      noStroke();
    }
  }

  // 2. Dessiner les piliers (Style Romain)
  let pillarSpacing = 300;
  for (let x = 50; x < width + pillarSpacing; x += pillarSpacing) {
    let pWidth = 70;
    
    // Ombre portée du pilier sur le mur
    fill(0, 0, 0, 40);
    rect(x + 15, 0, pWidth, height);
    
    // Corps du pilier (Base)
    fill(stoneColor);
    rect(x, 0, pWidth, height);
    
    // Cannelures (Lignes verticales typiques du style romain)
    stroke(shadowColor);
    strokeWeight(2);
    for (let j = 1; j < 4; j++) {
      let lineX = x + (j * pWidth / 4);
      line(lineX, 0, lineX, height);
    }
    noStroke();
    
    // Chapiteau et Base (Détails horizontaux)
    fill(shadowColor);
    // Haut
    rect(x - 10, 20, pWidth + 20, 15);
    rect(x - 5, 45, pWidth + 10, 10);
    // Bas
    rect(x - 10, height - 40, pWidth + 20, 15);
    rect(x - 5, height - 65, pWidth + 10, 10);
  }
  
  // 3. Effet de grain/sable final
  for (let i = 0; i < 500; i++) {
    fill(255, 255, 255, 30);
    ellipse(random(width), random(height), 1, 1);
  }
  
  randomSeed(); // Réinitialiser la graine pour le reste du projet
}


// Fonction : Mur de temple du désert (Sable, Piliers romains et Ruines)
function backgroundSandstoneWall(params = {}) {
  let sandColor = color(214, 187, 158);
  let stoneColor = color(222, 184, 135);
  let shadowColor = color(194, 154, 108);
  
  // Fond principal (Mur de sable)
  background(sandColor);
  
  // 1. Dessiner les pierres apparentes (Style Ruine)
  randomSeed(42); // Graine fixe pour la consistance
  noStroke();
  for (let i = 0; i < 80; i++) {
    let x = random(width);
    let y = random(height);
    let stoneW = random(40, 100);
    let stoneH = random(20, 50);
    
    // Ombre de la pierre
    fill(shadowColor);
    rect(x + 2, y + 2, stoneW, stoneH, 3);
    // Pierre
    fill(stoneColor);
    rect(x, y, stoneW, stoneH, 3);
    
    // Détails de fissures sur certaines pierres
    if (random() > 0.7) {
      stroke(shadowColor);
      strokeWeight(1);
      line(x + 5, y + 5, x + 20, y + 15);
      noStroke();
    }
  }
  
  // 3. Effet de grain/sable final
  for (let i = 0; i < 500; i++) {
    fill(255, 255, 255, 30);
    ellipse(random(width), random(height), 1, 1);
  }
  
  randomSeed(); // Réinitialiser la graine pour le reste du projet
}

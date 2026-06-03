// ==========================================

// Crystal check
function _checkSableCrystal(){if(!window.SpaceCrystals||!window.puzzlesResolus)return;for(var p in window.puzzlesResolus){if(!window.puzzlesResolus[p].resolu)return;}SpaceCrystals.complete("sable");}
// BIBLIOTHÈQUE DE BLOCS (Murs, Piques, Portes)
// ==========================================

// Fonction pour parser les options simplifiées (hexa ou fonction)
function parsePorteOptions(options) {
  // Si c'est une chaîne hexa, créer une couleur
  if (typeof options === 'string' && options.startsWith('#')) {
    const hex = options.substring(1);
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return { color: color(r, g, b), alpha: 200 };
  }
  
  // Si c'est une fonction, l'utiliser comme customDraw
  if (typeof options === 'function') {
    return { customDraw: options, alpha: 255 };
  }
  
  // Sinon, retourner les options comme elles sont
  return options || {};
}

function mur(x, y, w, h, createEditable = true) {
  fill(80, 70, 60);
  noStroke();
  rectMode(CORNER);
  rect(x, y, w, h);
  
  // Créer un élément éditable si demandé
  if (createEditable && typeof createEditableMur === 'function') {
    createEditableMur(x, y, w, h);
  }

  // Définition des marges de collision (Hitbox du joueur)
  let playerLeft = user.x - 45;
  let playerRight = user.x + 45;
  let playerTop = user.y - 60;
  let playerBottom = user.y + 60;

  // Vérifier si le joueur est à l'intérieur du mur
  if (playerRight > x && playerLeft < x + w && 
      playerBottom > y && playerTop < y + h) {
    
    // Calculer de combien on a pénétré dans chaque côté
    let overlapLeft = playerRight - x;
    let overlapRight = (x + w) - playerLeft;
    let overlapTop = playerBottom - y;
    let overlapBottom = (y + h) - playerTop;

    // Trouver le chemin le plus court pour sortir le joueur du mur
    let minOverlap = min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) {
      user.x = x - 45; // Sortie par la gauche
    } else if (minOverlap === overlapRight) {
      user.x = x + w + 45; // Sortie par la droite
    } else if (minOverlap === overlapTop) {
      user.y = y - 60; // Sortie par le haut
    } else if (minOverlap === overlapBottom) {
      user.y = y + h + 60; // Sortie par le bas
    }
  }
}

/**
 * Pique mortel avec respawn personnalisable
 * @param {number} x - Position X du pique
 * @param {number} y - Position Y du pique (base)
 * @param {number} taille - Taille du pique
 * @param {number} respawnX - (Optionnel) X de respawn, défaut: 96
 * @param {number} respawnY - (Optionnel) Y de respawn, défaut: height/2
 * @param {string} respawnView - (Optionnel) Vue de respawn, défaut: currentView
 * @param {boolean} createEditable - Mode éditeur
 */

function pique(x, y, taille, respawnX = 96, respawnY = height / 2, respawnView = currentView, createEditable = false) {
  if (typeof respawnX === 'boolean') {
    createEditable = respawnX;
    respawnX = 96; respawnY = height / 2; respawnView = currentView;
  } else if (typeof respawnView === 'boolean') {
    createEditable = respawnView;
    respawnView = currentView;
  }
  
  fill(200, 50, 50);
  noStroke();
  triangle(x, y, x + taille/2, y - taille, x + taille, y);
  
  if (createEditable && typeof createEditablePique === 'function') {
    createEditablePique(x, y - taille, taille);
  }

  if (dist(user.x, user.y, x + taille/2, y - taille/2) < 60) {
    if (respawnView && respawnView !== currentView) currentView = respawnView;
    
    user.x = respawnX;
    user.y = respawnY;
    user.vy = 0;
    user.isGrounded = true;
    
    // 🔒 Verrouille la physique pendant 3 frames
    user._respawnCounter = 3;
  }
}
/**
 * Lave mortelle avec respawn personnalisable
 */
function lave(x, y, w, h, respawnX = 96, respawnY = height / 2, createEditable = false) {
  // Compatibilité
  if (typeof respawnX === 'boolean') {
    createEditable = respawnX;
    respawnX = 96;
    respawnY = height / 2;
  }
  
  // Dessin de la lave (rectangle)
  fill(200, 50, 50);
  noStroke();
  rectMode(CORNER);
  rect(x, y, w, h);
  
  if (createEditable && typeof createEditablePique === 'function') {
    createEditablePique(x, y - h, h);
  }

  // 🔹 COLLISION AABB (identique à mur())
  let playerLeft = user.x - 45;
  let playerRight = user.x + 45;
  let playerTop = user.y - 60;
  let playerBottom = user.y + 60;

  // Vérifier si le joueur est à l'intérieur de la lave
  if (playerRight > x && playerLeft < x + w && 
      playerBottom > y && playerTop < y + h) {
    
    // 🔄 TÉLÉPORTATION AUX COORDONNÉES DÉFINIES
    user.x = respawnX;
    user.y = respawnY;
    
    // Reset physique pour éviter la chute immédiate
    user.vy = 0;
    user.isGrounded = true;
    user._justRespawned = true; // Flag pour freeze 1 frame
  }
}

/**
 * Crée une zone de transition (porte) entre deux salles.
 * Dessine la porte et gère la téléportation du joueur.
 * @param {number} x - Position horizontale du centre de la porte.
 * @param {number} y - Position verticale du centre de la porte.
 * @param {number} w - Largeur de la porte (en pixels).
 * @param {number} h - Hauteur de la porte (en pixels).
 * @param {string} idDest - L'identifiant (clé) de la salle de destination dans l'objet 'views'.
 * @param {number} sX - Coordonnée X où le joueur doit apparaître dans la nouvelle salle (Point de Spawn).
 * @param {number} sY - Coordonnée Y où le joueur doit apparaître dans la nouvelle salle (Point de Spawn).
 * @param {Object} options - Options de personnalisation de la porte
 * @param {p5.Color} options.color - Couleur personnalisée de la porte
 * @param {p5.Image} options.sprite - Image personnalisée pour la porte
 * @param {Function} options.customDraw - Fonction de dessin personnalisée
 * @param {Function} options.onEnter - Fonction appelée quand le joueur entre dans la porte
 * @param {number} options.alpha - Transparence de la porte (0-255)
 * @param {boolean} createEditable - Si vrai, crée un élément éditable dans l'éditeur
 */
function porte(x, y, w, h, idDest, sX, sY, options = {}, createEditable = false) {
  // Gestion de la compatibilité avec l'ancienne signature
  if (typeof options === 'boolean') {
    createEditable = options;
    options = {};
  }
  
  // Parser les options simplifiées
  const parsedOptions = parsePorteOptions(options);
  
  // Valeurs par défaut
  const defaultOptions = {
    color: color(0, 200),
    sprite: null,
    customDraw: null,
    onEnter: null,
    alpha: 255
  };
  
  // Fusionner les options avec les valeurs par défaut
  const porteOptions = Object.assign(defaultOptions, parsedOptions);
  
  // Dessin de la porte
  push();
  rectMode(CENTER);
  
  if (porteOptions.customDraw && typeof porteOptions.customDraw === 'function') {
    // Utiliser la fonction de dessin personnalisée
    porteOptions.customDraw(x, y, w, h, porteOptions);
  } else if (porteOptions.sprite) {
    // Utiliser un sprite personnalisé
    tint(255, porteOptions.alpha);
    imageMode(CENTER);
    image(porteOptions.sprite, x, y, w, h);
  } else {
    // Dessin par défaut avec couleur personnalisée
    let porteColor = porteOptions.color;
    porteColor.setAlpha(porteOptions.alpha);
    fill(porteColor);
    noStroke();
    rect(x, y, w, h);
  }
  
  pop();
  
  // Créer un élément éditable si demandé
  if (createEditable && typeof createEditablePorte === 'function') {
    createEditablePorte(x - w/2, y - h/2, w, h, idDest, sX, sY, porteOptions);
  }

  // Détection de collision et téléportation
  if (abs(user.x - x) < w/2 + 16 && abs(user.y - y) < h/2 + 16) {
    // Appeler la fonction personnalisée si elle existe
    if (porteOptions.onEnter && typeof porteOptions.onEnter === 'function') {
      porteOptions.onEnter(idDest, sX, sY);
    }
    
    // Téléportation par défaut
    currentView = idDest;
    user.x = sX;
    user.y = sY;
  }
}

function plateforme(x, y, w, h, createEditable = false) {
  fill(222, 184, 135);
  noStroke();
  rectMode(CORNER);
  rect(x, y, w, h);
  
  // Créer un élément éditable si demandé
  if (createEditable && typeof createEditablePlateforme === 'function') {
    createEditablePlateforme(x, y, w, h);
  }

  // Collision uniquement pour les vues de face (SIDE)
  let currentViewObj = views[currentView];
  if (currentViewObj && currentViewObj.type === "SIDE") {
    let playerLeft = user.x - 45;
    let playerRight = user.x + 45;
    let playerTop = user.y - 60;
    let playerBottom = user.y + 60;

    // Vérifier si le joueur est dans la zone de la plateforme
    if (playerRight > x && playerLeft < x + w && 
        playerBottom > y && playerTop < y + h) {
      
      // Collision par le haut (atterrissage depuis le dessus)
      if (user.vy > 0 && playerBottom - user.vy <= y + 10) {
        user.y = y - 60;
        user.vy = 0;
        user.isGrounded = true;
      }
      // Si le joueur est déjà sur la plateforme et qu'il essaie de tomber
      else if (user.isGrounded && playerBottom > y + 5) {
        user.y = y - 60;
        user.vy = 0;
      }
    }
  }
}

function plafond(x, y, w, h) {
  // Couleur plus claire que les plateformes pour différencier le plafond
  fill(120, 100, 80);
  noStroke();
  rectMode(CORNER);
  rect(x, y, w, h);
  
  // Ajout d'ombres pour donner un effet de profondeur
  fill(80, 70, 60, 100);
  rect(x, y + h - 5, w, 5);
}

function lumiereExterieur(x, y, w, h) {
  // Crée un dégradé de blanc opaque à transparent
  for (let i = 0; i <= h; i++) {
    let alpha = map(i, 0, h, 255, 0); // Blanc opaque en haut, transparent en bas
    fill(255, 255, 255, alpha);
    noStroke();
    rectMode(CORNER);
    rect(x, y + i, w, 1);
  }
}

/**
 * Crée un bloc interactif composé d'une stèle avec puzzle et d'une porte qui s'ouvre.
 * @param {number} steleX - Position X de la stèle
 * @param {number} steleY - Position Y de la stèle
 * @param {number} porteX - Position X de la porte/pierre
 * @param {number} porteY - Position Y de la porte/pierre
 * @param {number} porteW - Largeur de la porte
 * @param {number} porteH - Hauteur de la porte
 * @param {string} puzzleId - Identifiant unique pour ce puzzle
 * @param {boolean} createEditable - Si vrai, crée des éléments éditables
 */
function murPuzzle(steleX, steleY, porteX, porteY, porteW, porteH, puzzleId = 'default', createEditable = false) {
  // Réduire l'écart entre la stèle et la porte de moitié
  const ecartReduit = (porteX - steleX) / 2;
  const nouvellePorteX = steleX + ecartReduit;
  
  // Initialiser le stockage de puzzles si nécessaire
  if (!window.puzzlesResolus) {
    window.puzzlesResolus = {};
  }
  
  // Initialiser l'état global de popup
  if (!window.puzzlePopupActive) {
    window.puzzlePopupActive = false;
  }
  
  // État du puzzle
  if (!window.puzzlesResolus[puzzleId]) {
    window.puzzlesResolus[puzzleId] = {
      resolu: false,
      sequence: [],
      sequenceCorrecte: [2, 2, 4, 1], // Séquence à deviner
      indexActuel: 0,
      symboles: ['△', '○', '□', '◇'],
      popupActive: false,
      symboleSelectionne: 0,
      porteY: porteY, // Position Y originale de la porte
      porteOuverte: false,
      animationPorte: 0
    };
  }
  
  let puzzle = window.puzzlesResolus[puzzleId];
  
  // Mettre à jour l'état global de popup
  window.puzzlePopupActive = puzzle.popupActive;
  
    
  // ===== POPUP DU PUZZLE =====
  if (puzzle.popupActive) {
    push();
    
    // Fond semi-transparent
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    
    // Popup de la stèle agrandie
    rectMode(CENTER);
    fill(194, 178, 128);
    rect(width/2, height/2, 800, 600, 20);
    
    // Bordure dorée
    stroke(200, 170, 100);
    strokeWeight(4);
    noFill();
    rect(width/2, height/2, 770, 570, 15);
    noStroke();
    
    // Titre
    fill(255, 255, 255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text("Stèle Mystérieuse", width/2, height/2 - 180);
    
    // Zone des symboles
    textSize(80);
    for (let i = 0; i < 4; i++) {
      let symX = width/2 - 90 + (i * 60);
      let symY = height/2 - 60;
      
      // Highlight du symbole actuel
      if (i === puzzle.indexActuel) {
        fill(255, 255, 200, 100);
        rect(symX, symY, 50, 50, 8);
      }
      
      // Couleur du symbole
      if (i < puzzle.sequence.length) {
        if (puzzle.sequence[i] === puzzle.sequenceCorrecte[i]) {
          fill(100, 200, 100); // Vert clair si correct
        } else {
          fill(200, 100, 100); // Rouge si incorrect
        }
      } else {
        fill(150, 150, 200); // Bleu gris si non sélectionné
      }
      
      text(puzzle.symboles[puzzle.sequence[i] - 1] || '?', symX, symY);
    }
    
    // Sélecteur de symboles
    textSize(55);
    for (let i = 0; i < 4; i++) {
      let selX = width/2 - 90 + (i * 60);
      let selY = height/2 + 80;
      
      // Highlight du sélecteur actuel
      if (i === puzzle.symboleSelectionne) {
        fill(255, 255, 200, 150);
        rect(selX, selY, 50, 50, 8);
      }
      
      fill(200, 200, 200);
      text(puzzle.symboles[i], selX, selY);
    }
    
    // Instructions
    fill(255, 255, 255);
    textSize(24);
    text("← → : Choisir un symbole | ESPACE : Valider | ÉCHAP : Quitter", width/2, height/2 + 160);
    
    pop();
  }
  
  // ===== DESSIN DE LA STÈLE (normal) =====
  if (!puzzle.popupActive) {
    push();
    rectMode(CENTER);
    
    // Base de la stèle (grès) - taille augmentée
    fill(194, 178, 128);
    rect(steleX, steleY, 100, 120, 8);
    
    // Face de la stèle (sable clair) - taille augmentée
    fill(238, 203, 173);
    rect(steleX, steleY - 15, 85, 95, 5);
    
    // Symboles sur la stèle (taille augmentée)
    textAlign(CENTER, CENTER);
    textSize(32);
    
    for (let i = 0; i < 4; i++) {
      let symX = steleX - 30 + (i * 20);
      let symY = steleY - 15;
      
      if (puzzle.resolu) {
        fill(50, 200, 50); // Vert si résolu
      } else {
        fill(100, 100, 150); // Bleu gris si non résolu
      }
      
      text(puzzle.symboles[i], symX, symY);
    }
    
    // Indicateur d'interaction
    if (!puzzle.resolu && dist(user.x, user.y, steleX, steleY) < 100) {
      fill(0);
      textSize(48);
      text("Clique sur E", steleX, steleY - 130);
    }
    
    pop();
  }
  
  // ===== ANIMATION DE LA PORTE =====
  if (puzzle.resolu && !puzzle.porteOuverte) {
    puzzle.porteOuverte = true;
  }
  
  if (puzzle.porteOuverte && puzzle.animationPorte < porteH) {
    puzzle.animationPorte += 2; // Vitesse d'animation
  }
  
  // ===== DESSIN DE LA PORTE/PIERRE =====
  push();
  rectMode(CORNER);
  
  let porteYActuelle = porteY;
  if (puzzle.porteOuverte) {
    porteYActuelle = porteY - puzzle.animationPorte;
  }
  
  if (!puzzle.resolu) {
    // Porte fermée (pierres apparentes)
    
    // Rectangle de fond pour combler les trous - taille augmentée
    fill(160, 140, 100);
    noStroke();
    rect(nouvellePorteX, porteYActuelle, 80, porteH);
    
    // Pierres individuelles
    let pierreColors = [
      [187, 155, 114],
      [195, 163, 122],
      [179, 147, 106],
      [203, 171, 130],
      [175, 143, 102]
    ];
    
    let pierreIndex = 0;
    for (let y = 0; y < porteH; y += 35) {
      for (let x = 0; x < 80; x += 35) {
        // Alternance pour effet de maçonnerie
        let offsetX = (y / 35) % 2 === 0 ? 0 : 17;
        let pierreX = nouvellePorteX + x + offsetX;
        let pierreY = porteYActuelle + y;
        
        // Ne pas dépasser les limites
        if (pierreX + 35 <= nouvellePorteX + 80) {
          // Pierre individuelle - taille augmentée
          fill(pierreColors[pierreIndex % pierreColors.length]);
          stroke(140, 120, 80);
          strokeWeight(3);
          rect(pierreX, pierreY, 35, 35, 5);
          
                    
                    
          pierreIndex++;
        }
      }
    }
    
    noStroke();
    
    // Ombre portée - taille augmentée
    fill(0, 0, 0, 30);
    rect(nouvellePorteX + 8, porteYActuelle + porteH, 64, 8);
    
  } else {
    // Porte ouverte (animation avec pierres)
    if (puzzle.animationPorte < porteH) {
      // Rectangle de fond pour combler les trous pendant l'animation - taille augmentée
      fill(160, 140, 100);
      noStroke();
      rect(nouvellePorteX, porteYActuelle, 80, porteH);
      
      // Pierres individuelles pendant l'animation
      let pierreColors = [
        [187, 155, 114],
        [195, 163, 122],
        [179, 147, 106],
        [203, 171, 130],
        [175, 143, 102]
      ];
      
      let pierreIndex = 0;
      for (let y = 0; y < porteH; y += 35) {
        for (let x = 0; x < 80; x += 35) {
          let offsetX = (y / 35) % 2 === 0 ? 0 : 17;
          let pierreX = nouvellePorteX + x + offsetX;
          let pierreY = porteYActuelle + y;
          
          if (pierreX + 35 <= nouvellePorteX + 80 && pierreY + 35 >= porteYActuelle) {
            // Pierre individuelle - taille augmentée
            fill(pierreColors[pierreIndex % pierreColors.length]);
            stroke(140, 120, 80);
            strokeWeight(3);
            rect(pierreX, pierreY, 35, 35, 5);
            
                        
            pierreIndex++;
          }
        }
      }
      
          }
    
    // Ombre au sol quand la porte est ouverte - taille augmentée
    if (puzzle.animationPorte >= porteH) {
      fill(0, 0, 0, 40);
      ellipse(nouvellePorteX + 40, porteY + porteH + 8, 64, 12);
    }
  }
  
  pop();
  
  // ===== COLLISIONS =====
  
  // Collision avec la porte si fermée
  if (!puzzle.resolu) {
    let playerLeft = user.x - 45;
    let playerRight = user.x + 45;
    let playerTop = user.y - 60;
    let playerBottom = user.y + 60;
    
    if (playerRight > nouvellePorteX && playerLeft < nouvellePorteX + porteW && 
        playerBottom > porteY && playerTop < porteY + porteH) {
      
      let overlapLeft = playerRight - nouvellePorteX;
      let overlapRight = (nouvellePorteX + porteW) - playerLeft;
      let overlapTop = playerBottom - porteY;
      let overlapBottom = (porteY + porteH) - playerTop;
      
      let minOverlap = min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      
      if (minOverlap === overlapLeft) {
        user.x = nouvellePorteX - 45;
      } else if (minOverlap === overlapRight) {
        user.x = nouvellePorteX + porteW + 45;
      } else if (minOverlap === overlapTop) {
        user.y = porteY - 60;
      } else if (minOverlap === overlapBottom) {
        user.y = porteY + porteH + 60;
      }
    }
  }
  
  // ===== INTERACTION AVEC LE PUZZLE =====
  
  // Ouverture/Fermeture du popup
  if (!puzzle.resolu && dist(user.x, user.y, steleX, steleY) < 80 && !puzzle.popupActive) {
    if (keyIsPressed && (key === 'e' || key === 'E')) {
      puzzle.popupActive = true;
      puzzle.symboleSelectionne = 0;
      keyIsPressed = false;
    }
  }
  
  // Contrôles dans le popup
  if (puzzle.popupActive) {
    if (keyIsPressed) {
      if (keyCode === LEFT_ARROW) {
        puzzle.symboleSelectionne = (puzzle.symboleSelectionne - 1 + 4) % 4;
        keyIsPressed = false;
      } else if (keyCode === RIGHT_ARROW) {
        puzzle.symboleSelectionne = (puzzle.symboleSelectionne + 1) % 4;
        keyIsPressed = false;
      } else if (key === ' ') {
        // Ajouter le symbole sélectionné
        puzzle.sequence[puzzle.indexActuel] = puzzle.symboleSelectionne + 1;
        puzzle.indexActuel++;
        
        // Vérifier si la séquence est complète
        if (puzzle.indexActuel >= puzzle.sequenceCorrecte.length) {
          let estCorrect = true;
          for (let i = 0; i < puzzle.sequenceCorrecte.length; i++) {
            if (puzzle.sequence[i] !== puzzle.sequenceCorrecte[i]) {
              estCorrect = false;
              break;
            }
          }
          
          if (estCorrect) {
            puzzle.resolu = true; _checkSableCrystal();
            puzzle.popupActive = false;
          } else {
            // Réinitialiser après 2 secondes
            setTimeout(() => {
              puzzle.sequence = [];
              puzzle.indexActuel = 0;
            }, 2000);
          }
        }
        keyIsPressed = false;
      } else if (keyCode === ESCAPE) {
        puzzle.popupActive = false;
        keyIsPressed = false;
      }
    }
  }
  
  // Créer des éléments éditables si demandé
  if (createEditable && typeof createEditableMurPuzzle === 'function') {
    createEditableMurPuzzle(steleX, steleY, porteX, porteY, porteW, porteH, puzzleId);
  }
}

/**
 * Crée une stèle de puzzle individuelle.
 * @param {number} x - Position X de la stèle
 * @param {number} y - Position Y de la stèle
 * @param {string} puzzleId - Identifiant unique pour ce puzzle
 * @param {boolean} createEditable - Si vrai, crée un élément éditable
 */
function stelePuzzle(x, y, puzzleId = 'default', createEditable = false) {
  // Initialiser le stockage de puzzles si nécessaire
  if (!window.puzzlesResolus) {
    window.puzzlesResolus = {};
  }
  
  // Initialiser l'état global de popup
  if (!window.puzzlePopupActive) {
    window.puzzlePopupActive = false;
  }
  
  // État du puzzle
  if (!window.puzzlesResolus[puzzleId]) {
    window.puzzlesResolus[puzzleId] = {
      resolu: false,
      sequence: [],
      sequenceCorrecte: [1, 2, 3, 4], // Séquence à deviner
      indexActuel: 0,
      symboles: ['△', '○', '□', '◇'],
      popupActive: false,
      symboleSelectionne: 0
    };
  }
  
  let puzzle = window.puzzlesResolus[puzzleId];
  
  // Mettre à jour l'état global de popup
  window.puzzlePopupActive = puzzle.popupActive;
  
  // ===== MESSAGE D'INCITATION =====
  if (!puzzle.resolu && !puzzle.popupActive && dist(user.x, user.y, x, y) < 100) {
    push();
    fill(255, 255, 255, 200);
    rectMode(CENTER);
    rect(x, y - 100, 200, 30, 5);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(14);
    text("Appuyez sur E pour activer la stèle", x, y - 100);
    pop();
  }
  
  // ===== POPUP DU PUZZLE =====
  if (puzzle.popupActive) {
    push();
    
    // Fond semi-transparent
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    
    // Popup de la stèle agrandie
    rectMode(CENTER);
    fill(194, 178, 128);
    rect(width/2, height/2, 800, 600, 20);
    
    // Bordure dorée
    stroke(200, 170, 100);
    strokeWeight(4);
    noFill();
    rect(width/2, height/2, 770, 570, 15);
    noStroke();
    
    // Titre
    fill(255, 255, 255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text("Stèle Mystérieuse", width/2, height/2 - 180);
    
    // Zone des symboles
    textSize(80);
    for (let i = 0; i < 4; i++) {
      let symX = width/2 - 90 + (i * 60);
      let symY = height/2 - 60;
      
      // Highlight du symbole actuel
      if (i === puzzle.indexActuel) {
        fill(255, 255, 200, 100);
        rect(symX, symY, 50, 50, 8);
      }
      
      // Couleur du symbole
      if (i < puzzle.sequence.length) {
        if (puzzle.sequence[i] === puzzle.sequenceCorrecte[i]) {
          fill(100, 200, 100); // Vert clair si correct
        } else {
          fill(200, 100, 100); // Rouge si incorrect
        }
      } else {
        fill(150, 150, 200); // Bleu gris si non sélectionné
      }
      
      text(puzzle.symboles[puzzle.sequence[i] - 1] || '?', symX, symY);
    }
    
    // Sélecteur de symboles
    textSize(55);
    for (let i = 0; i < 4; i++) {
      let selX = width/2 - 90 + (i * 60);
      let selY = height/2 + 80;
      
      // Highlight du sélecteur actuel
      if (i === puzzle.symboleSelectionne) {
        fill(255, 255, 200, 150);
        rect(selX, selY, 50, 50, 8);
      }
      
      fill(200, 200, 200);
      text(puzzle.symboles[i], selX, selY);
    }
    
    // Instructions
    fill(255, 255, 255);
    textSize(24);
    text("← → : Choisir un symbole | ESPACE : Valider | ÉCHAP : Quitter", width/2, height/2 + 160);
    
    pop();
  }
  
  // ===== DESSIN DE LA STÈLE (normal) =====
  if (!puzzle.popupActive) {
    push();
    rectMode(CENTER);
    
    // Base de la stèle (grès)
    fill(194, 178, 128);
    rect(x, y, 60, 80, 5);
    
    // Face de la stèle (sable clair)
    fill(238, 203, 173);
    rect(x, y - 10, 50, 60, 3);
    
    // Symboles sur la stèle (miniature)
    textAlign(CENTER, CENTER);
    textSize(16);
    
    for (let i = 0; i < 4; i++) {
      let symX = x - 15 + (i * 10);
      let symY = y - 10;
      
      if (puzzle.resolu) {
        fill(50, 200, 50); // Vert si résolu
      } else {
        fill(100, 100, 150); // Bleu gris si non résolu
      }
      
      text(puzzle.symboles[i], symX, symY);
    }
    
    // Indicateur d'interaction
    if (!puzzle.resolu && dist(user.x, user.y, x, y) < 100) {
      fill(255, 255, 255, 150);
      textSize(48);
      text("E", x, y + 35);
    }
    
    pop();
  }
  
  // ===== INTERACTION AVEC LE PUZZLE =====
  
  // Ouverture/Fermeture du popup
  if (!puzzle.resolu && dist(user.x, user.y, x, y) < 80 && !puzzle.popupActive) {
    if (keyIsPressed && (key === 'e' || key === 'E')) {
      puzzle.popupActive = true;
      puzzle.symboleSelectionne = 0;
      keyIsPressed = false;
    }
  }
  
  // Contrôles dans le popup
  if (puzzle.popupActive) {
    if (keyIsPressed) {
      if (keyCode === LEFT_ARROW) {
        puzzle.symboleSelectionne = (puzzle.symboleSelectionne - 1 + 4) % 4;
        keyIsPressed = false;
      } else if (keyCode === RIGHT_ARROW) {
        puzzle.symboleSelectionne = (puzzle.symboleSelectionne + 1) % 4;
        keyIsPressed = false;
      } else if (key === ' ') {
        // Ajouter le symbole sélectionné
        puzzle.sequence[puzzle.indexActuel] = puzzle.symboleSelectionne + 1;
        puzzle.indexActuel++;
        
        // Vérifier si la séquence est complète
        if (puzzle.indexActuel >= puzzle.sequenceCorrecte.length) {
          let estCorrect = true;
          for (let i = 0; i < puzzle.sequenceCorrecte.length; i++) {
            if (puzzle.sequence[i] !== puzzle.sequenceCorrecte[i]) {
              estCorrect = false;
              break;
            }
          }
          
          if (estCorrect) {
            puzzle.resolu = true; _checkSableCrystal();
            puzzle.popupActive = false;
          } else {
            // Réinitialiser après 2 secondes
            setTimeout(() => {
              puzzle.sequence = [];
              puzzle.indexActuel = 0;
            }, 2000);
          }
        }
        keyIsPressed = false;
      } else if (keyCode === ESCAPE) {
        puzzle.popupActive = false;
        keyIsPressed = false;
      }
    }
  }
  
  // Créer des éléments éditables si demandé
  if (createEditable && typeof createEditableStelePuzzle === 'function') {
    createEditableStelePuzzle(x, y, puzzleId);
  }
}

/**
 * Crée une porte coulissante contrôlée par puzzle.
 * @param {number} x - Position X de la porte
 * @param {number} y - Position Y de la porte
 * @param {number} w - Largeur de la porte
 * @param {number} h - Hauteur de la porte
 * @param {string} puzzleId - Identifiant du puzzle qui contrôle cette porte
 * @param {boolean} createEditable - Si vrai, crée un élément éditable
 */
function porteCoulissante(x, y, w, h, puzzleId = 'default', createEditable = false) {
  // Initialiser le stockage de puzzles si nécessaire
  if (!window.puzzlesResolus) {
    window.puzzlesResolus = {};
  }
  
  // État du puzzle
  if (!window.puzzlesResolus[puzzleId]) {
    window.puzzlesResolus[puzzleId] = {
      resolu: false,
      porteY: y, // Position Y originale de la porte
      porteOuverte: false,
      animationPorte: 0
    };
  }
  
  let puzzle = window.puzzlesResolus[puzzleId];
  
  // ===== ANIMATION DE LA PORTE =====
  if (puzzle.resolu && !puzzle.porteOuverte) {
    puzzle.porteOuverte = true;
  }
  
  if (puzzle.porteOuverte && puzzle.animationPorte < h) {
    puzzle.animationPorte += 2; // Vitesse d'animation
  }
  
  // ===== DESSIN DE LA PORTE COULISSANTE =====
  push();
  rectMode(CORNER);
  
  let porteYActuelle = y;
  if (puzzle.porteOuverte) {
    porteYActuelle = y - puzzle.animationPorte;
  }
  
  if (!puzzle.resolu) {
    // Porte fermée (pierres apparentes)
    
    // Rectangle de fond pour combler les trous
    fill(160, 140, 100);
    noStroke();
    rect(x, porteYActuelle, w, h);
    
    // Pierres individuelles
    let pierreColors = [
      [187, 155, 114],
      [195, 163, 122],
      [179, 147, 106],
      [203, 171, 130],
      [175, 143, 102]
    ];
    
    let pierreIndex = 0;
    for (let py = 0; py < h; py += 25) {
      for (let px = 0; px < w; px += 25) {
        // Alternance pour effet de maçonnerie
        let offsetX = (py / 25) % 2 === 0 ? 0 : 12;
        let pierreX = x + px + offsetX;
        let pierreY = porteYActuelle + py;
        
        // Ne pas dépasser les limites
        if (pierreX + 25 <= x + w) {
          // Pierre individuelle
          fill(pierreColors[pierreIndex % pierreColors.length]);
          stroke(140, 120, 80);
          strokeWeight(2);
          rect(pierreX, pierreY, 25, 25, 3);
          
          pierreIndex++;
        }
      }
    }
    
    noStroke();
    
    // Ombre portée
    fill(0, 0, 0, 30);
    rect(x + 5, porteYActuelle + h, w - 10, 5);
    
  } else {
    // Porte ouverte (animation avec pierres)
    if (puzzle.animationPorte < h) {
      // Rectangle de fond pour combler les trous pendant l'animation
      fill(160, 140, 100);
      noStroke();
      rect(x, porteYActuelle, w, h);
      
      // Pierres individuelles pendant l'animation
      let pierreColors = [
        [187, 155, 114],
        [195, 163, 122],
        [179, 147, 106],
        [203, 171, 130],
        [175, 143, 102]
      ];
      
      let pierreIndex = 0;
      for (let py = 0; py < h; py += 25) {
        for (let px = 0; px < w; px += 25) {
          let offsetX = (py / 25) % 2 === 0 ? 0 : 12;
          let pierreX = x + px + offsetX;
          let pierreY = porteYActuelle + py;
          
          if (pierreX + 25 <= x + w && pierreY + 25 >= porteYActuelle) {
            // Pierre individuelle
            fill(pierreColors[pierreIndex % pierreColors.length]);
            stroke(140, 120, 80);
            strokeWeight(2);
            rect(pierreX, pierreY, 25, 25, 3);
            
            pierreIndex++;
          }
        }
      }
    }
    
    // Ombre au sol quand la porte est ouverte
    if (puzzle.animationPorte >= h) {
      fill(0, 0, 0, 40);
      ellipse(x + w/2, y + h + 5, w * 0.8, 8);
    }
  }
  
  pop();
  
  // ===== COLLISIONS =====
  
  // Collision avec la porte si fermée
  if (!puzzle.resolu) {
    let playerLeft = user.x - 45;
    let playerRight = user.x + 45;
    let playerTop = user.y - 60;
    let playerBottom = user.y + 60;
    
    if (playerRight > x && playerLeft < x + w && 
        playerBottom > y && playerTop < y + h) {
      
      let overlapLeft = playerRight - x;
      let overlapRight = (x + w) - playerLeft;
      let overlapTop = playerBottom - y;
      let overlapBottom = (y + h) - playerTop;
      
      let minOverlap = min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      
      if (minOverlap === overlapLeft) {
        user.x = x - 45;
      } else if (minOverlap === overlapRight) {
        user.x = x + w + 45;
      } else if (minOverlap === overlapTop) {
        user.y = y - 60;
      } else if (minOverlap === overlapBottom) {
        user.y = y + h + 60;
      }
    }
  }
  
  // Créer des éléments éditables si demandé
  if (createEditable && typeof createEditablePorteCoulissante === 'function') {
    createEditablePorteCoulissante(x, y, w, h, puzzleId);
  }
}

function texte(str, x, y, fsize, orientation_en_degree, couleur) {
  push();
  
  // Appliquer la couleur si spécifiée
  if (couleur !== undefined) {
    if (Array.isArray(couleur)) {
      fill(couleur[0], couleur[1], couleur[2]);
    } else if (typeof couleur === 'string') {
      fill(couleur);
    }
  }
  
  // Appliquer la taille de police
  textSize(fsize);
  
  // Appliquer l'orientation si spécifiée
  if (orientation_en_degree !== undefined && orientation_en_degree !== 0) {
    translate(x, y);
    rotate(radians(orientation_en_degree));
    text(str, 0, 0);
  } else {
    text(str, x, y);
  }
  
  pop();
}


// ==========================================
// INPUT BUS — Couche d'abstraction des entrées
// ==========================================
// Usage minimal (clavier seul) :
//   inputBus.register('keyboard');
//
// Avec webcam en plus :
//   inputBus.register('keyboard');
//   inputBus.register('webcam');   // nécessite ml5.js chargé avant
//
// Dans draw() du jeu, remplacer keyIsDown(LEFT_ARROW) par :
//   inputBus.gauche
//   inputBus.droite
//   inputBus.haut   (saut en vue SIDE)
//   inputBus.bas
//   inputBus.action (touche E / geste "lève la main")
// ==========================================

// const inputBus = (() => {

//   // ------------------------------------------
//   // État public — ce que le jeu lit chaque frame
//   // ------------------------------------------
//   const state = {
//     gauche:  false,
//     droite:  false,
//     haut:    false,
//     bas:     false,
//     action:  false,   // interaction (E, geste main levée, son fort…)
//   };

//   // ------------------------------------------
//   // Sources actives
//   // ------------------------------------------
//   const sources = {};

//   // ------------------------------------------
//   // Fusion : une action est vraie si AU MOINS
//   // une source l'active (OR logique)
//   // ------------------------------------------
//   function merge() {
//     for (const k in state) state[k] = false;
//     for (const name in sources) {
//       const s = sources[name];
//       if (!s.enabled) continue;
//       for (const k in state) {
//         if (s.state[k]) state[k] = true;
//       }
//     }
//   }

//   // ------------------------------------------
//   // SOURCE : Clavier + Souris
//   // ------------------------------------------
//   function createKeyboardSource() {
//     const s = {
//       enabled: true,
//       state: { gauche: false, droite: false, haut: false, bas: false, action: false },
//     };

//     // p5.js keyPressed / keyReleased sont appelés automatiquement.
//     // On accroche aussi window pour être sûr.
//     function updateKeys() {
//       s.state.gauche  = !!(typeof keyIsDown === 'function' && (keyIsDown(LEFT_ARROW)  || keyIsDown(65))); // ← ou A
//       s.state.droite  = !!(typeof keyIsDown === 'function' && (keyIsDown(RIGHT_ARROW) || keyIsDown(68))); // → ou D
//       s.state.haut    = !!(typeof keyIsDown === 'function' && (keyIsDown(UP_ARROW)    || keyIsDown(87) || keyIsDown(32))); // ↑ W Espace
//       s.state.bas     = !!(typeof keyIsDown === 'function' && (keyIsDown(DOWN_ARROW)  || keyIsDown(83))); // ↓ ou S
//     }

//     // action (E) : pulsé, pas maintenu — on utilise un flag custom
//     let actionPulse = false;
//     window.addEventListener('keydown', (e) => {
//       if (e.key === 'e' || e.key === 'E') { actionPulse = true; }
//     });
//     // Reset de l'action après une frame (appelé dans tick())
//     s.consumeAction = () => { s.state.action = actionPulse; actionPulse = false; };
//     s.tick = () => { updateKeys(); s.consumeAction(); };

//     return s;
//   }

//   // ------------------------------------------
//   // SOURCE : Webcam + ml5 Handpose
//   // Détecte si une main est levée au-dessus
//   // de la ligne médiane de l'image.
//   // Interprétation des gestes :
//   //   main à gauche  → gauche
//   //   main à droite  → droite
//   //   main très haute (y < 30% hauteur) → haut / saut
//   //   poing fermé (peu de doigts détectés) → action
//   // ------------------------------------------
//   function createWebcamSource(options = {}) {
//     const opts = Object.assign({
//       miroir: true,          // miroir horizontal (comme une webcam normale)
//       seuilHauteur: 0.35,    // y/height < seuilHauteur → "main levée" = haut
//       seuilGauche:  0.40,    // x/width  < seuilGauche  → main côté gauche
//       seuilDroite:  0.60,    // x/width  > seuilDroite  → main côté droit
//       seuilAction:  3,       // nb de doigts levés < seuilAction → poing = action
//       debug: false,          // affiche un canvas de debug ml5
//     }, options);

//     const s = {
//       enabled: false,   // activé seulement quand ml5 est prêt
//       state: { gauche: false, droite: false, haut: false, bas: false, action: false },
//       handposeReady: false,
//       predictions: [],
//     };

//     // Création du flux vidéo
//     const video = document.createElement('video');
//     video.width  = 320;
//     video.height = 240;
//     video.autoplay = true;
//     video.style.cssText = opts.debug
//       ? 'position:fixed;bottom:8px;right:8px;width:160px;opacity:.7;border-radius:8px;z-index:9999'
//       : 'position:absolute;left:-9999px;visibility:hidden';
//     document.body.appendChild(video);

//     navigator.mediaDevices.getUserMedia({ video: true })
//       .then(stream => {
//         video.srcObject = stream;
//         video.onloadedmetadata = () => {
//           // ml5 doit être chargé dans le sketch (CDN ou local)
//           if (typeof ml5 === 'undefined') {
//             console.warn('[InputBus] ml5.js non trouvé. Chargez-le avant inputBus.js.');
//             return;
//           }
//           const handpose = ml5.handpose(video, () => {
//             s.handposeReady = true;
//             s.enabled = true;
//             console.log('[InputBus] Webcam + Handpose prêt');
//           });
//           handpose.on('predict', results => { s.predictions = results; });
//         };
//       })
//       .catch(err => console.warn('[InputBus] Webcam refusée :', err));

//     s.tick = () => {
//       if (!s.handposeReady || s.predictions.length === 0) {
//         // Pas de main détectée → tout à false
//         for (const k in s.state) s.state[k] = false;
//         return;
//       }

//       // On prend la première main détectée
//       const hand = s.predictions[0];
//       // Centre du poignet (landmark 0)
//       const wrist = hand.landmarks[0];
//       let nx = wrist[0] / video.width;   // normalisé 0-1
//       const ny = wrist[1] / video.height;

//       // Correction miroir
//       if (opts.miroir) nx = 1 - nx;

//       s.state.gauche = nx < opts.seuilGauche;
//       s.state.droite = nx > opts.seuilDroite;
//       s.state.haut   = ny < opts.seuilHauteur;
//       s.state.bas    = false; // rare en webcam, laisser au clavier

//       // Détection du poing : compte les doigts étendus
//       // (tip_y < pip_y signifie doigt tendu, en coords image)
//       // Indices des tips : 4 (pouce), 8, 12, 16, 20
//       const tips = [4, 8, 12, 16, 20];
//       const pips = [3, 6, 10, 14, 18];
//       let doigtsTendus = 0;
//       tips.forEach((tip, i) => {
//         const tipY = hand.landmarks[tip][1];
//         const pipY = hand.landmarks[pips[i]][1];
//         if (tipY < pipY) doigtsTendus++;
//       });
//       s.state.action = doigtsTendus < opts.seuilAction;
//     };

//     return s;
//   }

//   // ------------------------------------------
//   // API publique
//   // ------------------------------------------
//   return {
//     // Expose l'état (lecture seule en pratique)
//     get gauche()  { return state.gauche;  },
//     get droite()  { return state.droite;  },
//     get haut()    { return state.haut;    },
//     get bas()     { return state.bas;     },
//     get action()  { return state.action;  },

//     /**
//      * Enregistre une source d'input.
//      * @param {'keyboard'|'webcam'} type
//      * @param {Object} options  Options spécifiques à la source (webcam uniquement)
//      */
//     register(type, options = {}) {
//       if (type === 'keyboard') {
//         sources['keyboard'] = createKeyboardSource();
//         console.log('[InputBus] Source "keyboard" enregistrée');
//       } else if (type === 'webcam') {
//         sources['webcam'] = createWebcamSource(options);
//         console.log('[InputBus] Source "webcam" enregistrée (en attente caméra…)');
//       } else {
//         console.warn('[InputBus] Source inconnue :', type);
//       }
//     },

//     /**
//      * Enregistre une source entièrement custom.
//      * @param {string} name  Nom unique
//      * @param {Function} tickFn  Appelée chaque frame, doit mettre à jour source.state
//      * @example
//      *   inputBus.registerCustom('manette', (s) => {
//      *     const gp = navigator.getGamepads()[0];
//      *     if (!gp) return;
//      *     s.state.gauche = gp.axes[0] < -0.5;
//      *     s.state.droite = gp.axes[0] >  0.5;
//      *     s.state.haut   = gp.buttons[0].pressed;
//      *     s.state.action = gp.buttons[2].pressed;
//      *   });
//      */
//     registerCustom(name, tickFn) {
//       const s = {
//         enabled: true,
//         state: { gauche: false, droite: false, haut: false, bas: false, action: false },
//       };
//       s.tick = () => tickFn(s);
//       sources[name] = s;
//       console.log(`[InputBus] Source custom "${name}" enregistrée`);
//     },

//     /**
//      * Active ou désactive une source à la volée.
//      * Utile pour désactiver le clavier pendant une démo webcam en classe.
//      */
//     setEnabled(name, enabled) {
//       if (sources[name]) sources[name].enabled = enabled;
//     },

//     /**
//      * À appeler UNE FOIS dans draw() avant toute lecture d'état.
//      * Met à jour toutes les sources puis fusionne.
//      */
//     tick() {
//       for (const name in sources) {
//         if (sources[name].tick) sources[name].tick();
//       }
//       merge();
//     },
//   };
// })();


// ==========================================
// BLOC : Grille de prison + Chat noir avec clé
// ==========================================
//
// Usage :
//   grilleChat(
//     grilleX, grilleY, grilleW, grilleH,   // Position et taille de la grille
//     chatZone,                               // { x, y, w, h } zone de déplacement du chat
//     interactionDist,                        // Distance (px) pour proposer E
//     spawnX, spawnY                          // Position initiale du chat
//   )
//
// Exemple :
//   grilleChat(500, 200, 60, 300,
//     { x: 600, y: 200, w: 300, h: 250 },
//     80, 750, 300
//   );
//
// Dépendances :
//   - La variable globale `user` (Player)
//   - La variable globale `currentView` + `views`
//   - Le micro est initialisé automatiquement au premier appel
// ==========================================

// --- Initialisation micro (une seule fois, partagée par tous les blocs) ---
if (!window._grilleChat_audio) {
  window._grilleChat_audio = {
    ready: false,
    volume: 0,     // 0-1, mis à jour chaque frame
    analyser: null,
    dataArray: null
  };

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      window._grilleChat_audio.analyser = analyser;
      window._grilleChat_audio.dataArray = buf;
      window._grilleChat_audio.ready = true;
    })
    .catch(() => {
      // Micro refusé ou indisponible : le chat se comporte normalement
      window._grilleChat_audio.ready = false;
    });
}

// --- Mise à jour du volume micro (appelée dans draw via le bloc) ---
function _updateMicVolume() {
  const a = window._grilleChat_audio;
  if (!a.ready) return;
  a.analyser.getByteFrequencyData(a.dataArray);
  let sum = 0;
  for (let i = 0; i < a.dataArray.length; i++) sum += a.dataArray[i];
  // Normalise entre 0 et 1 (255 * N maximum théorique)
  a.volume = sum / (a.dataArray.length * 255);
}

/**
 * Bloc grille de prison + chat noir avec clé.
 *
 * @param {number}  grilleX        - Bord gauche de la grille
 * @param {number}  grilleY        - Bord haut de la grille
 * @param {number}  grilleW        - Largeur de la grille
 * @param {number}  grilleH        - Hauteur de la grille
 * @param {Object}  chatZone       - { x, y, w, h } rectangle de déplacement du chat
 * @param {number}  interactionDist- Distance pour afficher "Appuyez sur E"
 * @param {number}  spawnX         - X initial du chat
 * @param {number}  spawnY         - Y initial du chat
 * @param {string}  id             - Identifiant unique (si plusieurs blocs dans le même niveau)
 */
function grilleChat(
  grilleX, grilleY, grilleW, grilleH,
  chatZone,
  interactionDist,
  spawnX, spawnY,
  id = 'default'
) {
  // ---- ÉTAT PERSISTANT ----
  if (!window._grilleChatState) window._grilleChatState = {};
  if (!window._grilleChatState[id]) {
    window._grilleChatState[id] = {
      // Grille
      ouverte: false,
      angleOuverture: 0,   // 0 = fermée, 1 = ouverte (progression)

      // Chat
      cx: spawnX,
      cy: spawnY,
      cvy: 0,              // vitesse verticale du chat
      cGrounded: false,
      cFace: -1,           // -1 = gauche, 1 = droite
      cAnimFrame: 0,
      cAlerte: 0,          // 0-1, monte quand le joueur fait du bruit

      // Clé
      cleRamassee: false,
      cleProposee: false,

      // Son
      lastVol: 0,
      attireTimer: 0,

      // Résultat
      resolu: false
    };
  }

  const S = window._grilleChatState[id];
  const G = window._grilleChat_audio;

  // ---- MISE À JOUR MICRO ----
  _updateMicVolume();
  const micVol = G.volume || 0;

  // Lissage de l'alerte sonore
  const bruit = micVol > 0.08 ? micVol : 0; // seuil bruit ambiant
  S.cAlerte = lerp(S.cAlerte, bruit * 1.4, 0.08);
  S.cAlerte = constrain(S.cAlerte, 0, 1);

  // ---- PHYSIQUE DU CHAT ----
  if (!S.cleRamassee) {
    // Gravité (même paramètres que le joueur)
    const GRAVITY = 0.8;
    const catSpeed = 2 + S.cAlerte * 4; // plus vite si alarmé

    // Déplacement horizontal vers le joueur selon niveau d'alerte
    if (S.cAlerte > 0.05) {
      const dx = user.x - S.cx;
      // Se déplace vers le joueur proportionnellement à l'alerte
      const moveX = sign(dx) * catSpeed * S.cAlerte;
      S.cFace = sign(dx) !== 0 ? sign(dx) : S.cFace;

      // Rebond sur les bords de la zone
      let nx = S.cx + moveX;
      if (nx < chatZone.x) {
        nx = chatZone.x;
        S.cFace = 1;
      }
      if (nx > chatZone.x + chatZone.w) {
        nx = chatZone.x + chatZone.w;
        S.cFace = -1;
      }
      S.cx = nx;
    } else {
      // Déambulation aléatoire lente
      if (frameCount % 90 === 0) {
        S.cFace = random() > 0.5 ? 1 : -1;
      }
      let nx = S.cx + S.cFace * 0.8;
      if (nx < chatZone.x) { nx = chatZone.x; S.cFace = 1; }
      if (nx > chatZone.x + chatZone.w) { nx = chatZone.x + chatZone.w; S.cFace = -1; }
      S.cx = nx;
    }

    // Gravité verticale
    S.cGrounded = false;
    S.cvy += GRAVITY;
    S.cy += S.cvy;

    // Sol de la zone (bas du rectangle)
    const solY = chatZone.y + chatZone.h;
    if (S.cy >= solY) {
      S.cy = solY;
      S.cvy = 0;
      S.cGrounded = true;
    }

    // Contrainte verticale haute
    if (S.cy < chatZone.y) {
      S.cy = chatZone.y;
      S.cvy = 0;
    }

    S.cAnimFrame += 0.15 + S.cAlerte * 0.3;
  }

  // ---- INTERACTION TOUCHE E ----
  const distCat = dist(user.x, user.y, S.cx, S.cy);
  S.cleProposee = !S.cleRamassee && distCat < interactionDist;

  if (S.cleProposee && keyIsPressed && (key === 'e' || key === 'E')) {
    S.cleRamassee = true;
    S.ouverte = true;
    keyIsPressed = false;
  }

  // ---- ANIMATION GRILLE ----
  if (S.ouverte && S.angleOuverture < 1) {
    S.angleOuverture += 0.018; // vitesse d'ouverture
    S.angleOuverture = min(S.angleOuverture, 1);
  }

  // ---- COLLISION GRILLE ----
  // La grille bloque le joueur ET le chat si elle est fermée (ou en cours d'ouverture)
  const grilleFermee = S.angleOuverture < 0.92;

  if (grilleFermee) {
    // Joueur
    _grilleCollision(user, grilleX, grilleY, grilleW, grilleH);
    // Chat (approximation rectangle 30x30)
    const chatProxy = { x: S.cx, y: S.cy };
    const chatW = 30, chatH = 30;
    if (
      chatProxy.x + chatW/2 > grilleX &&
      chatProxy.x - chatW/2 < grilleX + grilleW &&
      chatProxy.y > grilleY &&
      chatProxy.y - chatH < grilleY + grilleH
    ) {
      const overlapLeft  = (chatProxy.x + chatW/2) - grilleX;
      const overlapRight = (grilleX + grilleW) - (chatProxy.x - chatW/2);
      if (overlapLeft < overlapRight) {
        S.cx = grilleX - chatW/2;
        S.cFace = -1;
      } else {
        S.cx = grilleX + grilleW + chatW/2;
        S.cFace = 1;
      }
    }
  }

  // ================================================================
  // DESSIN
  // ================================================================

  // ---- GRILLE ----
  _dessineGrille(grilleX, grilleY, grilleW, grilleH, S.angleOuverture);

  // ---- INDICATEUR BRUIT (optionnel, petit arc autour du chat) ----
  if (S.cAlerte > 0.05 && !S.cleRamassee) {
    push();
    noFill();
    stroke(255, 80, 80, S.cAlerte * 200);
    strokeWeight(2);
    arc(S.cx, S.cy - 40, 50 + S.cAlerte * 30, 50 + S.cAlerte * 30, PI, TWO_PI);
    pop();
  }

  // ---- CHAT NOIR ----
  if (!S.cleRamassee) {
    _dessineChatNoir(S.cx, S.cy, S.cFace, S.cAnimFrame, S.cAlerte);
  } else {
    // Le chat s'assoit là où il était quand la clé a été prise
    _dessineChatNoir(S.cx, S.cy, S.cFace, 0, 0);
    // Petits zzz si le chat est au repos après avoir donné la clé
    push();
    fill(200, 200, 255, 160);
    noStroke();
    textSize(14);
    textAlign(LEFT, CENTER);
    text('z', S.cx + 20, S.cy - 50 + sin(frameCount * 0.03) * 5);
    text('z', S.cx + 28, S.cy - 66 + sin(frameCount * 0.03 + 1) * 5);
    text('Z', S.cx + 37, S.cy - 84 + sin(frameCount * 0.03 + 2) * 5);
    pop();
  }

  // ---- CLÉ (flotte au-dessus du chat tant qu'elle n'est pas prise) ----
  if (!S.cleRamassee) {
    const keyY = S.cy - 55 + sin(frameCount * 0.06) * 5;
    _dessineCle(S.cx, keyY);
  }

  // ---- INVITE INTERACTION ----
  if (S.cleProposee) {
    push();
    fill(255, 255, 200, 220);
    stroke(180, 160, 0);
    strokeWeight(1);
    rectMode(CENTER);
    rect(S.cx, S.cy - 90, 180, 28, 6);
    fill(60, 50, 0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text("Appuyez sur E pour prendre la clé", S.cx, S.cy - 90);
    pop();
  }

  // ---- MESSAGE BRUIT ----
  if (!S.cleRamassee && !G.ready) {
    push();
    fill(255, 200, 100, 180);
    textAlign(CENTER, CENTER);
    textSize(12);
    noStroke();
    text("(micro non disponible — le chat ne réagit pas au son)", width / 2, 20);
    pop();
  }
}

// ================================================================
// HELPERS INTERNES
// ================================================================

/** Collision rectangle plein (même logique que mur()) */
function _grilleCollision(player, x, y, w, h) {
  const pL = player.x - 45;
  const pR = player.x + 45;
  const pT = player.y - 60;
  const pB = player.y + 60;

  if (pR > x && pL < x + w && pB > y && pT < y + h) {
    const oL = pR - x;
    const oR = (x + w) - pL;
    const oT = pB - y;
    const oB = (y + h) - pT;
    const m = min(oL, oR, oT, oB);
    if      (m === oL) player.x = x - 45;
    else if (m === oR) player.x = x + w + 45;
    else if (m === oT) player.y = y - 60;
    else               player.y = y + h + 60;
  }
}

/**
 * Dessine la grille de prison avec effet de rotation sur l'axe Y
 * Progression 0 = fermée, 1 = ouverte (disparue derrière le mur)
 */
function _dessineGrille(x, y, w, h, progression) {
  push();

  // Perspective : on compresse horizontalement (simule rotation axe Y)
  // La grille pivote sur son bord gauche (comme une porte)
  const scaleX = cos(progression * HALF_PI); // 1 -> 0

  // Ombre portée sous la grille
  if (progression < 0.95) {
    fill(0, 0, 0, 30 * (1 - progression));
    noStroke();
    rectMode(CORNER);
    rect(x, y + h, w * scaleX, 6);
  }

  translate(x, y);
  scale(scaleX, 1); // compression horizontale

  const barCount = max(2, floor(w / 18));
  const barW = 6;
  const barColor = color(60, 60, 70);
  const highlightColor = color(100, 100, 115);

  // Cadre extérieur
  fill(barColor);
  noStroke();
  rectMode(CORNER);
  rect(0, 0, w, barW);           // haut
  rect(0, h - barW, w, barW);    // bas
  rect(0, 0, barW, h);           // gauche
  rect(w - barW, 0, barW, h);    // droite

  // Barreaux verticaux
  for (let i = 1; i < barCount - 1; i++) {
    const bx = map(i, 0, barCount - 1, 0, w - barW);
    fill(barColor);
    rect(bx, 0, barW, h);
    // Reflet sur chaque barreau
    fill(highlightColor);
    rect(bx + 1, 0, 2, h);
  }

  // Traverse horizontale centrale
  fill(barColor);
  rect(0, h / 2 - barW / 2, w, barW);

  pop();
}

/**
 * Dessine le chat noir avec la clé dans la gueule
 * face : -1 = gauche, 1 = droite
 */
function _dessineChatNoir(cx, cy, face, animFrame, alerte) {
  push();
  translate(cx, cy);
  scale(face * 2, 2); // retournement horizontal selon direction + agrandissement

  const tailSwing = sin(animFrame * 0.7) * 25;
  const walkBounce = abs(sin(animFrame)) * 3;
  const eyeAlert = alerte > 0.2; // pupilles dilatées si alarmé

  // Corps
  fill(20, 18, 20);
  noStroke();
  ellipse(0, -18 - walkBounce, 36, 28); // torse

  // Pattes avant (animation marche)
  stroke(20, 18, 20);
  strokeWeight(5);
  strokeCap(ROUND);
  line(-8,  -8, -12 + sin(animFrame) * 5,  4);
  line( 4,  -8,   8 - sin(animFrame) * 5,  4);
  noStroke();

  // Pattes arrière
  stroke(20, 18, 20);
  strokeWeight(5);
  strokeCap(ROUND);
  line(-10, -4, -14 - sin(animFrame) * 4, 6);
  line(  6, -4,  10 + sin(animFrame) * 4, 6);
  noStroke();

  // Queue (courbe)
  noFill();
  stroke(20, 18, 20);
  strokeWeight(5);
  strokeCap(ROUND);
  beginShape();
  curveVertex(-14, -10);
  curveVertex(-14, -10);
  curveVertex(-26, 0);
  curveVertex(-30 + tailSwing * 0.3, -12 + tailSwing);
  curveVertex(-26 + tailSwing * 0.5, -22 + tailSwing * 0.7);
  endShape();
  noStroke();

  // Tête
  fill(20, 18, 20);
  ellipse(5, -34 - walkBounce, 28, 26);

  // Oreilles
  triangle(-3, -44 - walkBounce, -10, -54 - walkBounce, 0, -46 - walkBounce);
  triangle(14, -44 - walkBounce, 18, -54 - walkBounce,  8, -46 - walkBounce);

  // Intérieur oreilles
  fill(80, 40, 50);
  triangle(-4, -44 - walkBounce, -8, -51 - walkBounce, 0, -45 - walkBounce);
  triangle(14, -44 - walkBounce, 17, -51 - walkBounce, 9, -45 - walkBounce);

  // Yeux
  fill(eyeAlert ? color(220, 170, 0) : color(80, 200, 80));
  ellipse(1,  -35 - walkBounce, 7, eyeAlert ? 8 : 6);
  ellipse(12, -35 - walkBounce, 7, eyeAlert ? 8 : 6);
  // Pupilles
  fill(10);
  ellipse(1,  -35 - walkBounce, eyeAlert ? 2 : 3, eyeAlert ? 7 : 5);
  ellipse(12, -35 - walkBounce, eyeAlert ? 2 : 3, eyeAlert ? 7 : 5);

  // Moustaches
  stroke(200, 200, 200, 180);
  strokeWeight(1);
  line(18, -32 - walkBounce, 32, -30 - walkBounce);
  line(18, -31 - walkBounce, 32, -33 - walkBounce);
  line(-8, -32 - walkBounce, -20, -30 - walkBounce);
  line(-8, -31 - walkBounce, -20, -33 - walkBounce);
  noStroke();

  // Nez
  fill(160, 80, 100);
  triangle(5, -30 - walkBounce, 3, -28 - walkBounce, 7, -28 - walkBounce);

  pop();
}

/** Dessine une petite clé dorée */
function _dessineCle(x, y) {
  push();
  translate(x + 8, y);
  rotate(PI / 5);

  stroke(210, 170, 50);
  strokeWeight(3);
  noFill();

  // Anneau de la clé
  ellipse(0, 0, 14, 14);

  // Corps de la clé
  strokeCap(ROUND);
  line(7, 0, 22, 0);

  // Dents
  line(16, 0, 16, 5);
  line(20, 0, 20, 4);

  // Brillance
  stroke(255, 230, 120, 160);
  strokeWeight(1.5);
  arc(0, 0, 10, 10, PI + 0.3, TWO_PI - 0.3);

  pop();
}

/** Interpolation linéaire */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Signe d'un nombre */
function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }


// ==========================================
// BLOC : Statue de pose (bloque le passage)
// ==========================================
//
// La statue bloque le joueur comme un mur.
// Elle affiche une pose cible (bras, jambes).
// ml5 PoseNet lit la webcam en temps réel.
// Si le joueur adopte la même pose, la statue
// disparaît et le passage est libéré.
//
// Usage :
//   statuePosture(x, y, w, h, poseId)
//
// Paramètres :
//   x, y       — coin haut-gauche de la statue
//   w, h       — largeur / hauteur de la statue
//   poseId     — identifiant unique (string)
//               pour avoir plusieurs statues indépendantes
//               dans le même niveau
//
// Exemple :
//   statuePosture(500, 200, 80, 200, 'statue1');
//
// Dépendances :
//   - p5.js  (variables globales : user, width, height, …)
//   - ml5.js chargé AVANT ce script (CDN ou local)
//     <script src="https://unpkg.com/ml5@0.12.2/dist/ml5.min.js"></script>
//
// La webcam et PoseNet sont initialisés une seule fois,
// la première fois qu'une statue est dessinée.
// ==========================================

// ---- Initialisation webcam + PoseNet (partagée par toutes les statues) ----
if (!window._statuePosture_ml5) {
  window._statuePosture_ml5 = {
    ready: false,
    pose: null,       // dernière pose détectée { keypoints }
    video: null,
    net: null,
    erreur: false,
    // Poses cibles disponibles (nom → contraintes angulaires)
    // Chaque contrainte : { a, b, c, min, max }
    //   a,b,c = indices keypoints ml5 poseNet
    //   angle entre vecteurs BA et BC doit être dans [min,max] degrés
    posesDisponibles: {
      // Bras en croix : les deux bras horizontaux
      'bras_croix': [
        // bras gauche : épaule→coude→poignet alignés horizontalement
        { a: 7, b: 5, c: 11, min: 80, max: 100 },   // angle coude gauche ~90°
        { a: 6, b: 4, c: 10, min: 80, max: 100 },   // angle coude droit ~90°
      ],
      // Bras levés : les deux poignets au-dessus des épaules
      'bras_leves': [
        { a: 5, b: 7, c: 9,  min: 150, max: 180 },  // bras gauche tendu vers le haut
        { a: 6, b: 8, c: 10, min: 150, max: 180 },  // bras droit tendu vers le haut
      ],
      // Un bras levé (gauche)
      'bras_gauche_leve': [
        { a: 5, b: 7, c: 9,  min: 150, max: 180 },
      ],
      // Un bras levé (droit)
      'bras_droit_leve': [
        { a: 6, b: 8, c: 10, min: 150, max: 180 },
      ],
      // Mains sur les hanches
      'mains_hanches': [
        { a: 7, b: 5, c: 11, min: 50, max: 80 },
        { a: 8, b: 6, c: 12, min: 50, max: 80 },
      ],
      // Position T (bras parfaitement horizontaux)
      'position_T': [
        { a: 9, b: 7, c: 5,  min: 170, max: 180 },  // bras gauche tendu horizontalement
        { a: 10, b: 8, c: 6, min: 170, max: 180 },  // bras droit tendu horizontalement
      ],
    }
  };

  // Tentative d'accès à la webcam puis chargement de PoseNet
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      const vid = document.createElement('video');
      vid.width  = 320;
      vid.height = 240;
      vid.autoplay = true;
      vid.style.cssText = 'position:absolute;left:-9999px;visibility:hidden';
      document.body.appendChild(vid);
      vid.srcObject = stream;
      window._statuePosture_ml5.video = vid;

      vid.onloadedmetadata = () => {
        if (typeof ml5 === 'undefined') {
          console.warn('[statuePosture] ml5.js non trouvé. Chargez-le avant ce script.');
          window._statuePosture_ml5.erreur = true;
          return;
        }

        // PoseNet : mode single pose, assez rapide
        const net = ml5.poseNet(vid, { flipHorizontal: true }, () => {
          window._statuePosture_ml5.ready = true;
          console.log('[statuePosture] PoseNet prêt');
        });

        net.on('pose', results => {
          if (results && results.length > 0) {
            window._statuePosture_ml5.pose = results[0].pose;
          } else {
            window._statuePosture_ml5.pose = null;
          }
        });

        window._statuePosture_ml5.net = net;
      };
    })
    .catch(err => {
      console.warn('[statuePosture] Webcam refusée :', err);
      window._statuePosture_ml5.erreur = true;
    });
}

// ---- Calcul d'angle entre trois keypoints (en degrés) ----
function _statueAngle(pose, ia, ib, ic) {
  const kp = pose.keypoints;
  if (!kp[ia] || !kp[ib] || !kp[ic]) return null;
  // On préfère la position normalisée si disponible
  const get = i => ({ x: kp[i].position.x, y: kp[i].position.y });
  const A = get(ia), B = get(ib), C = get(ic);
  const BA = { x: A.x - B.x, y: A.y - B.y };
  const BC = { x: C.x - B.x, y: C.y - B.y };
  const dot  = BA.x * BC.x + BA.y * BC.y;
  const magA = Math.hypot(BA.x, BA.y);
  const magC = Math.hypot(BC.x, BC.y);
  if (magA === 0 || magC === 0) return null;
  const cos = Math.max(-1, Math.min(1, dot / (magA * magC)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// ---- Calcule le taux de réussite global de la pose (entre 0 et 1) ----
function _statueCalculScorePose(poseName) {
  const M = window._statuePosture_ml5;
  if (!M.ready || !M.pose) return 0;

  const contraintes = M.posesDisponibles[poseName];
  if (!contraintes) return 0;

  let scoreTotal = 0;
  let nbContraintesValides = 0;

  for (const c of contraintes) {
    const kp = M.pose.keypoints;
    if (!kp[c.a] || !kp[c.b] || !kp[c.c]) continue;
    if (kp[c.a].score < 0.3 || kp[c.b].score < 0.3 || kp[c.c].score < 0.3) continue;

    const angle = _statueAngle(M.pose, c.a, c.b, c.c);
    if (angle === null) continue;

    // Calcul de la proximité avec l'intervalle [min, max]
    let scoreContrainte = 0;
    
    if (angle >= c.min && angle <= c.max) {
      scoreContrainte = 1; // Parfait
    } else {
      // Calcule la distance par rapport à la borne la plus proche
      const milieu = (c.min + c.max) / 2;
      const ecartMax = 45; // Marge d'erreur max (en degrés) où l'on commence à détecter
      
      let distance = angle < c.min ? c.min - angle : angle - c.max;
      
      // Plus on est proche de l'intervalle, plus le score monte vers 1
      scoreContrainte = max(0, 1 - (distance / ecartMax));
    }

    scoreTotal += scoreContrainte;
    nbContraintesValides++;
  }

  // Retourne la moyenne des scores de chaque membre (entre 0 et 1)
  return nbContraintesValides > 0 ? (scoreTotal / nbContraintesValides) : 0;
}

// ---- Dessin de la statue en p5.js ----
function _dessineStatue(x, y, w, h, poseName, resolu, alpha) {
  push();

  // Transparence progressive pendant la disparition
  const a = constrain(alpha, 0, 255);
  const col = color(100, 80, 60, a);
  const colLight = color(140, 120, 90, a);
  const colDark  = color(60,  50, 40, a);

  // Socle
  fill(colDark);
  noStroke();
  rectMode(CORNER);
  rect(x, y + h - h * 0.12, w, h * 0.12, 4);

  // Corps principal (piédestal + silhouette)
  fill(col);
  rect(x + w * 0.15, y + h * 0.62, w * 0.70, h * 0.26);

  // Tête
  fill(colLight);
  ellipse(x + w / 2, y + h * 0.14, w * 0.36, w * 0.36);

  // Torse
  fill(col);
  rect(x + w * 0.20, y + h * 0.28, w * 0.60, h * 0.34, 4);

  // --- Pose des bras selon poseId ---
  stroke(colDark);
  strokeWeight(max(4, w * 0.12));
  strokeCap(ROUND);
  noFill();

  const cx = x + w / 2;
  const torsoTop = y + h * 0.28;
  const epauleY  = torsoTop + h * 0.05;
  const epauleEcart = w * 0.32;

  if (poseName === 'bras_croix' || poseName === 'position_T') {
    // Bras tendus horizontalement des deux côtés
    line(cx - epauleEcart, epauleY, cx - epauleEcart - w * 0.55, epauleY);
    line(cx + epauleEcart, epauleY, cx + epauleEcart + w * 0.55, epauleY);
  } else if (poseName === 'bras_leves') {
    // Bras levés vers le haut
    line(cx - epauleEcart, epauleY, cx - epauleEcart - w * 0.25, epauleY - h * 0.35);
    line(cx + epauleEcart, epauleY, cx + epauleEcart + w * 0.25, epauleY - h * 0.35);
  } else if (poseName === 'bras_gauche_leve') {
    line(cx - epauleEcart, epauleY, cx - epauleEcart - w * 0.25, epauleY - h * 0.35);
    line(cx + epauleEcart, epauleY, cx + epauleEcart + w * 0.35, epauleY + h * 0.10);
  } else if (poseName === 'bras_droit_leve') {
    line(cx - epauleEcart, epauleY, cx - epauleEcart - w * 0.35, epauleY + h * 0.10);
    line(cx + epauleEcart, epauleY, cx + epauleEcart + w * 0.25, epauleY - h * 0.35);
  } else if (poseName === 'mains_hanches') {
    // Bras fléchis sur les hanches
    line(cx - epauleEcart, epauleY, cx - epauleEcart - w * 0.20, epauleY + h * 0.18);
    line(cx - epauleEcart - w * 0.20, epauleY + h * 0.18, cx - epauleEcart - w * 0.05, epauleY + h * 0.30);
    line(cx + epauleEcart, epauleY, cx + epauleEcart + w * 0.20, epauleY + h * 0.18);
    line(cx + epauleEcart + w * 0.20, epauleY + h * 0.18, cx + epauleEcart + w * 0.05, epauleY + h * 0.30);
  } else {
    // Pose par défaut : bras le long du corps
    line(cx - epauleEcart, epauleY, cx - epauleEcart - w * 0.10, epauleY + h * 0.30);
    line(cx + epauleEcart, epauleY, cx + epauleEcart + w * 0.10, epauleY + h * 0.30);
  }
  noStroke();

  // Jambes
  fill(col);
  rect(x + w * 0.22, y + h * 0.60, w * 0.22, h * 0.27, 3);
  rect(x + w * 0.56, y + h * 0.60, w * 0.22, h * 0.27, 3);

  // Reflet/ombre sur la statue pour l'effet pierre
  fill(255, 255, 255, a * 0.12);
  rect(x + w * 0.20, y + h * 0.28, w * 0.18, h * 0.34, 2);

  // Effet de particules / poussière quand la statue disparaît
  if (resolu && alpha > 0 && alpha < 200) {
    noStroke();
    for (let i = 0; i < 8; i++) {
      const px = x + random(w);
      const py = y + random(h);
      const pr = random(2, 6);
      fill(180, 160, 120, alpha * random(0.3, 0.8));
      ellipse(px, py, pr, pr);
    }
  }

  pop();
}

// ---- Dessin de l'icône "webcam non disponible" ----
function _statueIconeNoWebcam(x, y, w) {
  push();
  fill(255, 80, 80, 180);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(min(w * 0.4, 22));
  text('📷✕', x + w / 2, y - 30);
  pop();
}

// ---- Dessin du retour visuel de la pose joueur (mini skeleton) ----
function _statueAffichePose(pose, canvasX, canvasY, canvasW, canvasH) {
  if (!pose || !pose.keypoints) return;

  push();

  // Connexions du squelette à afficher
  const connexions = [
    [5, 6],   // épaule gauche ↔ droite
    [5, 7],   [7, 9],    // bras gauche
    [6, 8],   [8, 10],   // bras droit
    [5, 11],  [6, 12],   // torse
    [11, 12],            // bassin
    [11, 13], [13, 15],  // jambe gauche
    [12, 14], [14, 16],  // jambe droite
  ];

  const vidW = 320, vidH = 240;
  // Mapping : coordonnées webcam → mini-fenêtre en bas à gauche du canvas
  const toX = nx => canvasX + (nx / vidW) * canvasW;
  const toY = ny => canvasY + (ny / vidH) * canvasH;

  // Fond semi-transparent de la fenêtre
  fill(0, 0, 0, 100);
  noStroke();
  rectMode(CORNER);
  rect(canvasX, canvasY, canvasW, canvasH, 6);

  // Connexions
  strokeWeight(2);
  noFill();
  for (const [ia, ib] of connexions) {
    const kpA = pose.keypoints[ia];
    const kpB = pose.keypoints[ib];
    if (!kpA || !kpB) continue;
    if (kpA.score < 0.3 || kpB.score < 0.3) continue;
    stroke(100, 220, 100, 200);
    line(toX(kpA.position.x), toY(kpA.position.y),
         toX(kpB.position.x), toY(kpB.position.y));
  }

  // Points clés
  noStroke();
  for (const kp of pose.keypoints) {
    if (kp.score < 0.3) continue;
    fill(80, 255, 120, 220);
    ellipse(toX(kp.position.x), toY(kp.position.y), 5, 5);
  }

  // Label
  fill(200, 255, 200, 200);
  noStroke();
  textSize(10);
  textAlign(LEFT, TOP);
  text('Ta pose', canvasX + 4, canvasY + 4);

  pop();
}

/**
 * Statue qui bloque le passage et disparaît si le joueur adopte la bonne pose.
 *
 * @param {number}  x          — Position X coin haut-gauche de la statue
 * @param {number}  y          — Position Y coin haut-gauche de la statue
 * @param {number}  w          — Largeur de la statue  (≥ 40 conseillé)
 * @param {number}  h          — Hauteur de la statue  (≥ 80 conseillé)
 * @param {string}  poseId     — Identifiant de la pose cible parmi :
 *                               'bras_croix', 'bras_leves', 'bras_gauche_leve',
 *                               'bras_droit_leve', 'mains_hanches', 'position_T'
 * @param {string}  id         — Identifiant unique du bloc (plusieurs statues possibles)
 */
function statuePosture(x, y, w, h, poseId = 'bras_croix', id = 'default') {
  // ---- ÉTAT PERSISTANT ----
  if (!window._statuePostureState) window._statuePostureState = {};
  if (!window._statuePostureState[id]) {
    window._statuePostureState[id] = {
      resolu: false,
      alpha: 255,         // opacité de la statue (255 = pleine, 0 = disparue)
      poseOk: false,      // true quand la pose est correctement maintenue
      poseTimer: 0,       // frames consécutives où la pose est correcte
      poseRequise: 45,    // frames à maintenir pour valider (~1.5s à 30fps)
      secoue: 0,          // animation de tremblement avant disparition
    };
  }

  const S = window._statuePostureState[id];
  const M = window._statuePosture_ml5;

  // ---- DÉTECTION DE POSE ----
  let scoreActuel = 0; // Stocke le taux de réussite actuel (0 à 1)

  if (!S.resolu && M.ready && M.pose) {
    scoreActuel = _statueCalculScorePose(poseId);

    // On ne valide la pose que si le joueur est très proche du but (ex: score > 0.85)
    if (scoreActuel > 0.85) {
      S.poseTimer++;
    } else {
      S.poseTimer = max(0, S.poseTimer - 1); // Descend doucement si on s'éloigne
    }
    
    S.poseOk = S.poseTimer >= S.poseRequise;

    if (S.poseOk && !S.resolu) {
      S.resolu = true;
    }
  }

  // ---- ANIMATION DE DISPARITION ----
  if (S.resolu && S.alpha > 0) {
    S.secoue = sin(frameCount * 0.8) * 4 * (S.alpha / 255);
    S.alpha = max(0, S.alpha - 4);
  } else {
    S.secoue = 0;
  }

  // ---- BARRE DE PROGRESSION DE LA POSE ----
  if (!S.resolu && M.ready) {
    // MODIFICATION : La jauge montre le score actuel (0 à 1) plutôt que le timer !
    const progressionJauge = scoreActuel; 
    
    const barW = w;
    const barH = 8;
    const barX = x;
    const barY = y - 20;

    push();
    // Fond de la barre
    fill(50, 50, 50, 180);
    noStroke();
    rectMode(CORNER);
    rect(barX, barY, barW, barH, 4);

    // Remplissage coloré en fonction du taux de réussite
    const couleurBarre = lerpColor(color(220, 80, 80), color(80, 200, 80), progressionJauge);
    fill(couleurBarre);
    rect(barX, barY, barW * progressionJauge, barH, 4);

    // Texte indicatif dynamique
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(11);
    
    if (progressionJauge === 0) {
      text('À côté de la plaque !', x + w / 2, barY - 2);
    } else if (progressionJauge < 0.5) {
      text('Tu chauffes…', x + w / 2, barY - 2);
    } else if (progressionJauge < 0.85) {
      text('Presque ! Maintiens la pose !', x + w / 2, barY - 2);
    } else {
      // Si la pose est bonne, on affiche le compte à rebours avant la disparition
      const pctValidation = constrain(S.poseTimer / S.poseRequise, 0, 1);
      text('Analyse en cours... ' + Math.round(pctValidation * 100) + '%', x + w / 2, barY - 2);
    }
    pop();
  }

  // ---- ANIMATION DE DISPARITION ----
  if (S.resolu && S.alpha > 0) {
    S.secoue = sin(frameCount * 0.8) * 4 * (S.alpha / 255);
    S.alpha = max(0, S.alpha - 4); // fondu en ~64 frames (~2s)
  } else {
    S.secoue = 0;
  }

  // ---- BARRE DE PROGRESSION DE LA POSE ----
  if (!S.resolu && M.ready) {
    const progression = constrain(S.poseTimer / S.poseRequise, 0, 1);
    const barW = w;
    const barH = 8;
    const barX = x;
    const barY = y - 20;

    push();
    // Fond de la barre
    fill(50, 50, 50, 180);
    noStroke();
    rectMode(CORNER);
    rect(barX, barY, barW, barH, 4);

    // Remplissage
    const couleurBarre = lerpColor(color(220, 80, 80), color(80, 200, 80), progression);
    fill(couleurBarre);
    rect(barX, barY, barW * progression, barH, 4);

    // Texte indicatif
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text('Adoptez la pose !', x + w / 2, barY - 2);
    pop();
  }

  // ---- DESSIN DE LA STATUE ----
  if (S.alpha > 0) {
    push();
    translate(S.secoue, 0); // tremblement avant disparition
    _dessineStatue(x, y, w, h, poseId, S.resolu, S.alpha);
    pop();
  }

  // ---- INDICE VISUEL "ADOPTE CETTE POSE" (flèche + texte) ----
  if (!S.resolu && S.alpha > 0) {
    // Afficher uniquement si le joueur est proche
    const distJoueur = dist(user.x, user.y, x + w / 2, y + h / 2);
    if (distJoueur < 200) {
      push();
      fill(255, 240, 180, 220);
      textAlign(CENTER, BOTTOM);
      textSize(13);
      noStroke();
      text('Imitez la statue devant la caméra', x + w / 2, y - 32);
      pop();
    }
  }

  // ---- MINI-FENÊTRE POSE DU JOUEUR (coin bas-gauche) ----
  // Affiche le squelette détecté pour aider le joueur à ajuster sa pose
  if (!S.resolu && M.ready && M.pose) {
    _statueAffichePose(M.pose, 10, height - 110, 110, 100);
  }

  // ---- AVERTISSEMENT SI WEBCAM INDISPONIBLE ----
  if (M.erreur && !S.resolu && S.alpha > 0) {
    _statueIconeNoWebcam(x, y, w);
    // Mode dégradé : une touche permet de débloquer manuellement
    push();
    fill(255, 160, 80, 200);
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text('Webcam non dispo — appuyez sur E', x + w / 2, y - 34);
    pop();
    if (keyIsPressed && (key === 'e' || key === 'E')) {
      S.resolu = true;
      keyIsPressed = false;
    }
  }

  // ---- INDICATEUR DE CHARGEMENT ----
  if (!M.ready && !M.erreur && !S.resolu && S.alpha > 0) {
    push();
    fill(200, 200, 255, 180);
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text('Chargement caméra…', x + w / 2, y - 34);
    pop();
  }

  // ---- COLLISION (uniquement si la statue n'est pas disparue) ----
  if (S.alpha > 10) {
    const playerLeft   = user.x - 45;
    const playerRight  = user.x + 45;
    const playerTop    = user.y - 60;
    const playerBottom = user.y + 60;

    if (
      playerRight  > x     && playerLeft < x + w &&
      playerBottom > y     && playerTop  < y + h
    ) {
      const overlapLeft   = playerRight  - x;
      const overlapRight  = (x + w)      - playerLeft;
      const overlapTop    = playerBottom - y;
      const overlapBottom = (y + h)      - playerTop;

      const minOverlap = min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if      (minOverlap === overlapLeft)   user.x = x - 45;
      else if (minOverlap === overlapRight)  user.x = x + w + 45;
      else if (minOverlap === overlapTop)    user.y = y - 60;
      else                                   user.y = y + h + 60;
    }
  }
}

// ==========================================
// BLOC : Porte en Or + Poulie cassée à réparer
// ==========================================
//
// Usage :
//   // 1. Placer la poulie cassée à un endroit (indépendamment de la porte)
//   poulieCassee(poulieX, poulieY, 'monId');
//
//   // 2. Placer la porte en or qui sera contrôlée par cette poulie
//   porteOr(porteX, porteY, porteW, porteH, 'monId');
//
// Exemple complet :
//   poulieCassee(300, 350, 'salle1');
//   porteOr(700, 100, 80, 300, 'salle1');
//
// Mécanique :
//   1. Le joueur s'approche de la poulie (< interactionDist px)
//   2. Un message "Appuyez sur E pour réparer la poulie" s'affiche
//   3. Le joueur appuie sur E → animation de réparation (~60 frames)
//   4. La poulie est réparée, un message "Appuyez sur E pour ouvrir" s'affiche
//   5. Le joueur appuie à nouveau sur E → la porte en or s'ouvre (monte)
//
// Dépendances :
//   - Variables globales p5.js : user, frameCount, keyIsPressed, key
// ==========================================

// ==========================================
// BLOC : Porte en Or + Poulie cassée à réparer
// ==========================================
//
// Usage :
//   poulieCassee(poulieX, poulieY, taille, 'monId');
//   porteOr(porteX, porteY, porteW, porteH, 'monId');
//
// Exemple :
//   poulieCassee(300, 350, 60, 'salle1');   // taille = diamètre de la roue
//   porteOr(700, 100, 80, 300, 'salle1');
//
// Mécanique :
//   1. Le joueur s'approche de la poulie → "Appuyez sur E pour réparer"
//   2. E pressé → animation de réparation (~2s)
//   3. Poulie réparée → "Appuyez sur E pour ouvrir la porte"
//   4. E pressé → la porte en or monte
//
// Paramètres poulieCassee :
//   x, y          — Centre de la poulie
//   taille        — Diamètre de la roue en pixels (défaut: 44)
//   id            — Identifiant partagé avec porteOr()
//   interactionDist — Distance d'interaction (défaut: taille * 2)
//
// Paramètres porteOr :
//   x, y, w, h   — Position et dimensions de la porte
//   id            — Identifiant partagé avec poulieCassee()
//
// Dépendances :
//   - Variables globales p5.js : user, frameCount, keyIsPressed, key
// ==========================================

if (!window._porteOrState) window._porteOrState = {};

/**
 * Poulie cassée à réparer.
 * @param {number} x              — Centre X
 * @param {number} y              — Centre Y
 * @param {number} taille         — Diamètre de la roue (défaut: 44)
 * @param {string} id             — Identifiant partagé avec porteOr()
 * @param {number} interactionDist — Distance d'interaction (défaut: taille * 2)
 */
function poulieCassee(x, y, taille = 44, id = 'default', interactionDist = null) {
  // Interaction par défaut = 2× la taille
  const dist_interaction = interactionDist !== null ? interactionDist : taille * 2;

  // Dimensions dérivées de la taille
  const r        = taille / 2;          // rayon extérieur
  const rInner   = r * 0.68;            // rayon rainure intérieure
  const rAxe     = r * 0.23;            // rayon de l'axe
  const rRayons  = r * 0.34;            // rayon extrémité des rayons
  const rRayonsI = r * 0.11;            // rayon intérieur des rayons
  const supportW = taille * 0.41;       // largeur du support mural
  const supportH = taille * 0.91;       // hauteur du support mural
  const strokeW  = max(2, taille * 0.11); // épaisseur des traits

  // ---- ÉTAT PERSISTANT ----
  if (!window._porteOrState[id]) {
    window._porteOrState[id] = {
      poulieReparee:     false,
      porteOuverte:      false,
      reparationEnCours: false,
      reparationTimer:   0,
      reparationDuree:   60,
      animationPorte:    0,
      poulieX:           x,
      poulieY:           y,
      poulieR:           r,
    };
  }

  const S = window._porteOrState[id];
  S.poulieX = x;
  S.poulieY = y;
  S.poulieR = r;

  const distJoueur = dist(user.x, user.y, x, y);
  const proche = distJoueur < dist_interaction;

  // ---- LOGIQUE ----
  if (!S.poulieReparee) {
    if (S.reparationEnCours) {
      S.reparationTimer++;
      if (S.reparationTimer >= S.reparationDuree) {
        S.poulieReparee    = true;
        S.reparationEnCours = false;
        S.reparationTimer  = 0;
      }
    } else if (proche && keyIsPressed && (key === 'e' || key === 'E')) {
      S.reparationEnCours = true;
      S.reparationTimer   = 0;
      keyIsPressed        = false;
    }
  } else if (!S.porteOuverte && proche && keyIsPressed && (key === 'e' || key === 'E')) {
    S.porteOuverte = true;
    keyIsPressed   = false;
  }

  // ---- DESSIN ----
  push();

  // Support mural
  fill(90, 70, 50);
  noStroke();
  rectMode(CENTER);
  rect(x, y - r - supportH * 0.3, supportW, supportH, 3);

  if (!S.poulieReparee && !S.reparationEnCours) {
    // === CASSÉE ===
    push();
    translate(x, y);
    rotate(0.35);

    stroke(120, 100, 60);
    strokeWeight(strokeW * 1.5);
    noFill();
    ellipse(0, 0, taille, taille);

    stroke(80, 65, 40);
    strokeWeight(strokeW);
    ellipse(0, 0, rInner * 2, rInner * 2);

    fill(100, 80, 50);
    noStroke();
    ellipse(r * 0.18, r * 0.14, rAxe * 2, rAxe * 2); // axe désaxé

    // Fissures (proportionnelles)
    stroke(60, 45, 25);
    strokeWeight(max(1, strokeW * 0.7));
    line(-r * 0.36, -r * 0.55, -r * 0.09, 0);
    line( r * 0.27, -r * 0.64,  r * 0.09, -r * 0.18);
    line(-r * 0.64,  r * 0.18, -r * 0.27,  r * 0.36);
    pop();

    // Corde emmêlée
    noFill();
    stroke(180, 150, 100);
    strokeWeight(max(2, strokeW));
    strokeCap(ROUND);
    beginShape();
    vertex(x + r * 0.18, y + r * 0.23);
    vertex(x + r * 0.41, y + r * 0.50);
    vertex(x + r * 0.23, y + r * 0.82);
    vertex(x + r * 0.55, y + taille);
    vertex(x + r * 0.32, y + taille * 1.32);
    endShape();

    beginShape();
    vertex(x - r * 0.18, y + r * 0.23);
    vertex(x - r * 0.36, y + r * 0.55);
    vertex(x - r * 0.18, y + r * 0.86);
    endShape();

    // Icône cassé
    fill(220, 80, 60);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(max(10, taille * 0.36));
    text('⚙', x - r * 0.41, y - r * 0.32);

  } else if (S.reparationEnCours) {
    // === RÉPARATION EN COURS ===
    const prog = S.reparationTimer / S.reparationDuree;

    push();
    translate(x, y);
    rotate(0.35 * (1 - prog));

    stroke(lerp_val(120, 210, prog), lerp_val(100, 170, prog), lerp_val(60, 50, prog));
    strokeWeight(strokeW * 1.5);
    noFill();
    ellipse(0, 0, taille, taille);

    stroke(lerp_val(80, 160, prog), lerp_val(65, 130, prog), 40);
    strokeWeight(strokeW);
    ellipse(0, 0, rInner * 2, rInner * 2);

    fill(lerp_val(100, 190, prog), lerp_val(80, 150, prog), 50);
    noStroke();
    ellipse(lerp_val(r * 0.18, 0, prog), lerp_val(r * 0.14, 0, prog), rAxe * 2, rAxe * 2);

    if (frameCount % 4 < 2) {
      for (let i = 0; i < 4; i++) {
        let angle = random(TWO_PI);
        let rad   = random(r * 0.45, r * 0.64);
        stroke(255, 220, lerp_val(80, 255, prog), 220);
        strokeWeight(2);
        point(cos(angle) * rad, sin(angle) * rad);
      }
    }
    pop();

    // Corde qui se réenroule
    noFill();
    stroke(180, 150, 100);
    strokeWeight(max(2, strokeW));
    strokeCap(ROUND);
    let cordeLen = lerp_val(taille * 1.32, taille * 0.23, prog);
    beginShape();
    vertex(x + r * 0.18, y + r * 0.23);
    curveVertex(x + r * 0.32, y + cordeLen * 0.5);
    vertex(x + r * 0.18, y + cordeLen);
    endShape();

    // Barre de progression
    const barW = taille * 1.4;
    push();
    fill(40, 40, 40, 180);
    noStroke();
    rectMode(CORNER);
    rect(x - barW / 2, y - r - supportH - 10, barW, max(6, taille * 0.18), 5);
    fill(255, 180, 50);
    rect(x - barW / 2, y - r - supportH - 10, barW * prog, max(6, taille * 0.18), 5);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(max(9, taille * 0.20));
    text('Réparation…', x, y - r - supportH - 22);
    pop();

  } else {
    // === RÉPARÉE ===
    push();
    translate(x, y);

    if (S.porteOuverte) rotate(frameCount * 0.12);

    stroke(210, 170, 50);
    strokeWeight(strokeW * 1.5);
    noFill();
    ellipse(0, 0, taille, taille);

    stroke(160, 130, 40);
    strokeWeight(strokeW);
    ellipse(0, 0, rInner * 2, rInner * 2);

    fill(190, 150, 45);
    noStroke();
    ellipse(0, 0, rAxe * 2, rAxe * 2);

    // Rayons
    stroke(190, 150, 45);
    strokeWeight(max(1, strokeW * 0.7));
    for (let i = 0; i < 6; i++) {
      let angle = (TWO_PI / 6) * i;
      line(cos(angle) * rRayonsI, sin(angle) * rRayonsI, cos(angle) * rRayons, sin(angle) * rRayons);
    }

    pop();

    // Cordes tendues
    stroke(180, 150, 100);
    strokeWeight(max(2, strokeW));
    strokeCap(ROUND);
    line(x - r * 0.18, y + r * 0.18, x - r * 0.18, y + r);
    line(x + r * 0.18, y + r * 0.18, x + r * 0.18, y + r);

    // Brillance
    stroke(255, 240, 150, 120);
    strokeWeight(max(1, strokeW * 0.5));
    noFill();
    arc(x, y, taille * 0.86, taille * 0.86, PI + 0.4, TWO_PI - 0.4);
  }

  // ---- MESSAGE D'INTERACTION ----
  if (proche && !S.reparationEnCours) {
    push();
    fill(255, 250, 200, 230);
    stroke(180, 150, 40);
    strokeWeight(1);
    rectMode(CENTER);
    let msg = S.poulieReparee
      ? (S.porteOuverte ? 'Porte activée !' : 'Appuyez sur E pour ouvrir la porte')
      : 'Appuyez sur E pour réparer la poulie';
    textSize(13);
    let msgW = textWidth(msg) + 24;
    rect(x, y - r - supportH - 32, msgW, 26, 6);
    fill(60, 45, 10);
    noStroke();
    textAlign(CENTER, CENTER);
    text(msg, x, y - r - supportH - 32);
    pop();
  }

  pop();
}


/**
 * Porte en or contrôlée par une poulie.
 * @param {number} x   — Bord gauche
 * @param {number} y   — Bord haut (position fermée)
 * @param {number} w   — Largeur
 * @param {number} h   — Hauteur
 * @param {string} id  — Identifiant partagé avec poulieCassee()
 */
function porteOr(x, y, w, h, id = 'default') {
  if (!window._porteOrState[id]) {
    window._porteOrState[id] = {
      poulieReparee:     false,
      porteOuverte:      false,
      reparationEnCours: false,
      reparationTimer:   0,
      reparationDuree:   60,
      animationPorte:    0,
      poulieX:           0,
      poulieY:           0,
      poulieR:           22,
    };
  }

  const S = window._porteOrState[id];

  // Vitesse d'ouverture proportionnelle à la hauteur
  const vitesse = max(1.5, h * 0.008 * 30 / 60); // ~8% de h par seconde à 30fps

  if (S.porteOuverte && S.animationPorte < h) {
    S.animationPorte = min(S.animationPorte + vitesse, h);
  }

  const porteYActuelle       = y - S.animationPorte;
  const portePleinementOuverte = S.animationPorte >= h;

  // Dimensions dérivées
  const marge     = max(3, w * 0.05);  // marge intérieure
  const panMargeX = max(8, w * 0.125); // marge horizontale des panneaux
  const losange   = max(10, w * 0.22); // taille du losange décoratif
  const anneau    = max(10, w * 0.22); // diamètre de l'anneau heurtoir
  const eclat     = max(4, w * 0.075); // taille de l'éclat de brillance

  push();

  if (!portePleinementOuverte) {
    // Ombre au sol
    fill(0, 0, 0, 25);
    noStroke();
    rectMode(CORNER);
    rect(x + marge, y + h, w - marge * 2, max(5, h * 0.025), 4);

    // Corde vers la poulie
    if (S.poulieX !== 0 || S.poulieY !== 0) {
      stroke(180, 150, 100);
      strokeWeight(max(2, w * 0.035));
      strokeCap(ROUND);
      noFill();
      let pX = S.poulieX + S.poulieR * 0.18;
      let pY = S.poulieY + S.poulieR;
      let dX = x + w / 2;
      let dY = porteYActuelle;
      beginShape();
      curveVertex(pX, pY);
      curveVertex(pX, pY);
      curveVertex((pX + dX) / 2, (pY + dY) / 2 + max(15, h * 0.06));
      curveVertex(dX, dY);
      curveVertex(dX, dY);
      endShape();
    }

    // Corps (or foncé)
    rectMode(CORNER);
    noStroke();
    fill(180, 130, 20);
    rect(x, porteYActuelle, w, h, max(2, w * 0.04));

    // Placage or brillant
    fill(220, 180, 40);
    rect(x + marge, porteYActuelle + marge, w - marge * 2, h - marge * 2, max(1, w * 0.025));

    // Panneaux décoratifs (nombre adapté à la hauteur)
    const nbPanneaux = h > 200 ? 3 : 2;
    const panH = (h - marge * 2 - 6 * (nbPanneaux - 1)) / nbPanneaux - 6;

    for (let i = 0; i < nbPanneaux; i++) {
      let panY = porteYActuelle + marge + i * (panH + 6);

      fill(160, 110, 15);
      rect(x + panMargeX, panY, w - panMargeX * 2, panH, max(2, w * 0.03));

      fill(235, 195, 55);
      rect(x + panMargeX + marge, panY + marge * 0.7, w - (panMargeX + marge) * 2, panH - marge * 1.4, max(1, w * 0.02));

      // Losange central
      let cx2 = x + w / 2;
      let cy2 = panY + panH / 2;
      fill(200, 155, 30);
      noStroke();
      push();
      translate(cx2, cy2);
      rotate(PI / 4);
      rect(0, 0, losange, losange, max(1, losange * 0.1));
      pop();

      // Reflet sur le losange
      fill(255, 240, 130, 160);
      push();
      translate(cx2 - losange * 0.11, cy2 - losange * 0.17);
      rotate(PI / 4);
      rect(0, 0, losange * 0.44, losange * 0.44, 1);
      pop();
    }

    // Renfort horizontal central
    fill(200, 155, 30);
    noStroke();
    rect(x + marge, porteYActuelle + h / 2 - max(4, h * 0.016), w - marge * 2, max(8, h * 0.033));

    // Reflet diagonal
    fill(255, 245, 160, 60);
    noStroke();
    beginShape();
    vertex(x + marge, porteYActuelle + marge);
    vertex(x + w * 0.45, porteYActuelle + marge);
    vertex(x + w * 0.25, porteYActuelle + h * 0.4);
    vertex(x + marge, porteYActuelle + h * 0.4);
    endShape(CLOSE);

    // Encadrement doré
    stroke(255, 220, 80);
    strokeWeight(max(1, w * 0.025));
    noFill();
    rect(x + max(1, w * 0.025), porteYActuelle + max(1, w * 0.025), w - max(2, w * 0.05), h - max(2, w * 0.05), max(2, w * 0.04));

    // Heurtoir
    let heurX = x + w / 2;
    let heurY = porteYActuelle + h * 0.55;
    noFill();
    stroke(255, 220, 60);
    strokeWeight(max(2, w * 0.035));
    ellipse(heurX, heurY, anneau, anneau);
    fill(220, 180, 40);
    noStroke();
    ellipse(heurX, heurY + anneau / 2, anneau * 0.39, anneau * 0.39);

    // Éclat
    fill(255, 255, 200, 220);
    noStroke();
    ellipse(x + panMargeX, porteYActuelle + panMargeX, eclat, eclat);
    fill(255, 255, 200, 80);
    ellipse(x + panMargeX + eclat * 0.7, porteYActuelle + panMargeX + eclat, eclat * 1.7, eclat * 0.8);

    // Cadenas si non réparée
    if (!S.poulieReparee) {
      const cadW = max(14, w * 0.25);
      const cadH = max(10, h * 0.05);
      push();
      translate(x + w / 2, porteYActuelle - cadH - cadW * 0.3);
      fill(90, 70, 30);
      noStroke();
      rectMode(CENTER);
      rect(0, cadH * 0.5, cadW, cadH, max(2, cadW * 0.12));
      noFill();
      stroke(90, 70, 30);
      strokeWeight(max(2, cadW * 0.12));
      arc(0, 0, cadW * 0.9, cadW * 0.9, PI, TWO_PI);
      fill(50, 40, 15);
      noStroke();
      ellipse(0, cadH * 0.7, cadW * 0.18, cadW * 0.18);
      rect(0, cadH * 0.85, cadW * 0.14, cadH * 0.3);
      pop();
    }
  }

  // Ombre au sol si ouverte
  if (portePleinementOuverte) {
    fill(0, 0, 0, 30);
    noStroke();
    ellipse(x + w / 2, y + h + max(4, h * 0.02), w * 0.7, max(6, h * 0.03));
  }

  pop();

  // ---- COLLISION ----
  if (!portePleinementOuverte) {
    const playerLeft   = user.x - 45;
    const playerRight  = user.x + 45;
    const playerTop    = user.y - 60;
    const playerBottom = user.y + 60;

    const porteYCol = porteYActuelle;
    const porteHCol = h - S.animationPorte;

    if (
      playerRight  > x && playerLeft < x + w &&
      playerBottom > porteYCol && playerTop < porteYCol + porteHCol
    ) {
      const oL = playerRight  - x;
      const oR = (x + w)      - playerLeft;
      const oT = playerBottom - porteYCol;
      const oB = (porteYCol + porteHCol) - playerTop;
      const m  = min(oL, oR, oT, oB);

      if      (m === oL) user.x = x - 45;
      else if (m === oR) user.x = x + w + 45;
      else if (m === oT) user.y = porteYCol - 60;
      else               user.y = porteYCol + porteHCol + 60;
    }
  }
}

// ---- Utilitaire ----
function lerp_val(a, b, t) { return a + (b - a) * constrain(t, 0, 1); }
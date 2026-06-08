// ==========================================
// ÉDITEUR VISUEL - OUTIL DE DÉVELOPPEMENT
// ==========================================
// Ce fichier contient l'éditeur visuel pour placer facilement les éléments du jeu
// À supprimer pour la version finale du jeu

// Variables globales de l'éditeur
let editorMode = false;
let selectedElement = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let editableElements = [];
let showGrid = false;
let gridSize = 32;

// ==========================================
// CONFIGURATION DES TYPES DE BLOCS
// ==========================================
const BLOCK_TYPES = {
  mur: {
    name: 'mur',
    displayName: 'Mur',
    defaultSize: { w: 64, h: 64 },
    drawFunction: 'mur',
    parameters: ['x', 'y', 'w', 'h'],
    color: [80, 70, 60],
    hitbox: 'rectangle',
    coordSystem: 'corner', // Coin supérieur gauche
    defaultParams: {}
  },
  porte: {
    name: 'porte',
    displayName: 'Porte',
    defaultSize: { w: 80, h: 96 },
    drawFunction: 'porte',
    parameters: ['x', 'y', 'w', 'h', 'idDest', 'sX', 'sY', 'options'],
    color: [0, 200],
    hitbox: 'rectangle',
    coordSystem: 'center', // Centre
    defaultParams: {
      idDest: '',
      sX: 0,
      sY: 0,
      options: {}
    }
  },
  pique: {
    name: 'pique',
    displayName: 'Pique',
    defaultSize: { w: 48, h: 48 },
    drawFunction: 'pique',
    parameters: ['x', 'y', 'taille'],
    color: [200, 50, 50],
    hitbox: 'triangle',
    coordSystem: 'base', // Base du triangle
    defaultParams: {
      taille: 48
    }
  },
  plateforme: {
    name: 'plateforme',
    displayName: 'Plateforme',
    defaultSize: { w: 128, h: 24 },
    drawFunction: 'plateforme',
    parameters: ['x', 'y', 'w', 'h'],
    color: [100, 80, 60],
    hitbox: 'rectangle',
    coordSystem: 'corner', // Coin supérieur gauche
    defaultParams: {}
  },
  torche: {
    name: 'torche',
    displayName: 'Torche',
    defaultSize: { w: 40, h: 60 },
    drawFunction: 'torcheMurale',
    parameters: ['x', 'y', 'options'],
    color: [255, 140, 0],
    hitbox: 'rectangle',
    coordSystem: 'center', // Centre de la torche
    defaultParams: {
      scale: 1.0,
      lit: true
    }
  },
  murPuzzle: {
    name: 'murPuzzle',
    displayName: 'Mur Puzzle',
    defaultSize: { w: 300, h: 600 }, // Nouvelles dimensions avec écart/2 entre stèle et porte
    drawFunction: 'murPuzzle',
    parameters: ['steleX', 'steleY', 'porteX', 'porteY', 'porteW', 'porteH', 'puzzleId'],
    color: [187, 155, 114],
    hitbox: 'rectangle',
    coordSystem: 'corner', // Coin supérieur gauche
    defaultParams: {
      puzzleId: 'default'
    }
  },
  stelePuzzle: {
    name: 'stelePuzzle',
    displayName: 'Stèle Puzzle',
    defaultSize: { w: 60, h: 80 },
    drawFunction: 'stelePuzzle',
    parameters: ['x', 'y', 'puzzleId'],
    color: [194, 178, 128],
    hitbox: 'rectangle',
    coordSystem: 'center', // Centre de la stèle
    defaultParams: {
      puzzleId: 'default'
    }
  },
  porteCoulissante: {
    name: 'porteCoulissante',
    displayName: 'Porte Coulissante',
    defaultSize: { w: 50, h: 200 },
    drawFunction: 'porteCoulissante',
    parameters: ['x', 'y', 'w', 'h', 'puzzleId'],
    color: [187, 155, 114],
    hitbox: 'rectangle',
    coordSystem: 'corner', // Coin supérieur gauche
    defaultParams: {
      puzzleId: 'default'
    }
  },
  texte: {
    name: 'texte',
    displayName: 'Texte',
    defaultSize: { w: 200, h: 30 },
    drawFunction: 'texte',
    parameters: ['str', 'x', 'y', 'fsize', 'orientation_en_degree', 'couleur'],
    color: [255, 255, 255],
    hitbox: 'rectangle',
    coordSystem: 'corner', // Coin supérieur gauche
    defaultParams: {
      str: 'Texte',
      fsize: 20,
      orientation_en_degree: 0,
      couleur: [255, 255, 255]
    }
  }
};

// ==========================================
// CLASSE UNIVERSELLE POUR LES ÉLÉMENTS ÉDITABLES
// ==========================================
class EditableBlock {
  constructor(type, x, y, w, h, params = {}) {
    this.type = type;
    this.config = BLOCK_TYPES[type];
    if (!this.config) {
      throw new Error(`Type de bloc inconnu: ${type}`);
    }
    
    this.x = x;
    this.y = y;
    this.w = w || this.config.defaultSize.w;
    this.h = h || this.config.defaultSize.h;
    this.params = { ...this.config.defaultParams, ...params };
    this.selected = false;
  }

  // Dessine l'élément avec surbrillance si sélectionné
  draw() {
    this.drawElement();
    
    if (this.selected) {
      noFill();
      stroke(255, 255, 0);
      strokeWeight(3);
      rect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    }
  }

  // Dessine l'élément en fonction de sa configuration
  drawElement() {
    const config = this.config;
    
    if (config.customDraw && typeof config.customDraw === 'function') {
      // Utiliser la fonction de dessin personnalisée
      config.customDraw(this);
    } else if (this.type === 'torche') {
      // Dessin spécial pour les torches
      push();
      if (window[config.drawFunction] && typeof window[config.drawFunction] === 'function') {
        window[config.drawFunction](this.x, this.y, this.params);
      } else {
        // Dessin de secours si la fonction n'est pas disponible
        fill(config.color[0], config.color[1], config.color[2]);
        noStroke();
        rectMode(CENTER);
        rect(this.x, this.y, this.w, this.h);
      }
      pop();
    } else if (this.type === 'murPuzzle') {
      // Dessin spécial pour le mur puzzle
      push();
      if (window[config.drawFunction] && typeof window[config.drawFunction] === 'function') {
        window[config.drawFunction](
          this.params.steleX, 
          this.params.steleY, 
          this.params.porteX, 
          this.params.porteY, 
          this.params.porteW, 
          this.params.porteH, 
          this.params.puzzleId
        );
      } else {
        // Dessin de secours si la fonction n'est pas disponible
        fill(config.color[0], config.color[1], config.color[2]);
        noStroke();
        rectMode(CORNER);
        rect(this.x, this.y, this.w, this.h);
      }
      pop();
    } else if (this.type === 'texte') {
      // Dessin spécial pour le texte
      push();
      if (window[config.drawFunction] && typeof window[config.drawFunction] === 'function') {
        window[config.drawFunction](
          this.params.str || 'Texte',
          this.x,
          this.y,
          this.params.fsize || 20,
          this.params.orientation_en_degree || 0,
          this.params.couleur || [255, 255, 255]
        );
      } else {
        // Dessin de secours si la fonction n'est pas disponible
        const couleur = this.params.couleur || config.color;
        if (Array.isArray(couleur)) {
          fill(couleur[0], couleur[1], couleur[2]);
        } else {
          fill(couleur);
        }
        noStroke();
        textAlign(LEFT, TOP);
        textSize(this.params.fsize || 20);
        text(this.params.str || 'Texte', this.x, this.y);
      }
      pop();
    } else if (this.type === 'stelePuzzle') {
      // Dessin spécial pour la stèle puzzle
      push();
      if (window[config.drawFunction] && typeof window[config.drawFunction] === 'function') {
        window[config.drawFunction](this.x, this.y, this.params.puzzleId);
      } else {
        // Dessin de secours si la fonction n'est pas disponible
        fill(config.color[0], config.color[1], config.color[2]);
        noStroke();
        rectMode(CENTER);
        rect(this.x, this.y, this.w, this.h);
      }
      pop();
    } else if (this.type === 'porteCoulissante') {
      // Dessin spécial pour la porte coulissante
      push();
      if (window[config.drawFunction] && typeof window[config.drawFunction] === 'function') {
        window[config.drawFunction](this.x, this.y, this.w, this.h, this.params.puzzleId);
      } else {
        // Dessin de secours si la fonction n'est pas disponible
        fill(config.color[0], config.color[1], config.color[2]);
        noStroke();
        rectMode(CORNER);
        rect(this.x, this.y, this.w, this.h);
      }
      pop();
    } else {
      // Dessin par défaut basé sur la configuration et le système de coordonnées
      push(); // Sauvegarder le contexte pour ne pas affecter l'interface
      fill(config.color[0], config.color[1], config.color[2]);
      noStroke();
      
      if (config.coordSystem === 'center' && this.type === 'porte') {
        // Portes : système de coordonnées centre
        rectMode(CENTER);
        rect(this.x, this.y, this.w, this.h);
      } else if (config.coordSystem === 'base' && this.type === 'pique') {
        // Piques : système de coordonnées base du triangle
        triangle(this.x, this.y, this.x + this.w/2, this.y - this.h, this.x + this.w, this.y);
      } else {
        // Murs et plateformes : système de coordonnées coin supérieur gauche
        rectMode(CORNER);
        rect(this.x, this.y, this.w, this.h);
      }
      pop(); // Restaurer le contexte
    }
  }

  // Vérifie si un point est dans l'élément
  contains(px, py) {
    const config = this.config;
    
    if (config.coordSystem === 'center' && (this.type === 'porte' || this.type === 'torche')) {
      // Portes et torches : système centre - hitbox rectangulaire centrée
      return px >= this.x - this.w/2 && px <= this.x + this.w/2 &&
             py >= this.y - this.h/2 && py <= this.y + this.h/2;
    } else if (config.coordSystem === 'base' && this.type === 'pique') {
      // Piques : hitbox simplifiée (rectangle englobant du triangle)
      return px >= this.x && px <= this.x + this.w &&
             py >= this.y - this.h && py <= this.y;
    } else {
      // Murs et plateformes : système coin supérieur gauche
      return px >= this.x && px <= this.x + this.w &&
             py >= this.y && py <= this.y + this.h;
    }
  }

  // Déplace l'élément
  moveTo(x, y) {
    const config = this.config;
    
    if (config.coordSystem === 'center' && (this.type === 'porte' || this.type === 'torche')) {
      // Portes et torches : le point x,y est le centre
      this.x = x;
      this.y = y;
    } else if (config.coordSystem === 'base' && this.type === 'pique') {
      // Piques : le point x,y est la base du triangle
      this.x = x;
      this.y = y;
    } else if (this.type === 'murPuzzle') {
      // Mur puzzle : déplacer toutes les coordonnées en fonction du déplacement
      const deltaX = x - this.x;
      const deltaY = y - this.y;
      
      // Mettre à jour la position de référence
      this.x = x;
      this.y = y;
      
      // Mettre à jour tous les paramètres de coordonnées
      if (this.params.steleX !== undefined) this.params.steleX += deltaX;
      if (this.params.steleY !== undefined) this.params.steleY += deltaY;
      if (this.params.porteX !== undefined) this.params.porteX += deltaX;
      if (this.params.porteY !== undefined) this.params.porteY += deltaY;
    } else if (this.type === 'stelePuzzle') {
      // Stèle puzzle : système de coordonnées centre
      this.x = x;
      this.y = y;
    } else if (this.type === 'porteCoulissante') {
      // Porte coulissante : système de coordonnées coin supérieur gauche
      this.x = x - this.w / 2;
      this.y = y - this.h / 2;
    } else {
      // Murs et plateformes : le point x,y est le coin supérieur gauche
      this.x = x - this.w / 2;
      this.y = y - this.h / 2;
    }
    
    // Alignement sur la grille si activée
    if (showGrid) {
      if (config.coordSystem === 'center' && (this.type === 'porte' || this.type === 'torche')) {
        // Pour les portes et torches, aligner le centre
        this.x = Math.round(this.x / gridSize) * gridSize;
        this.y = Math.round(this.y / gridSize) * gridSize;
      } else if (this.type === 'murPuzzle') {
        // Pour le mur puzzle, aligner la position de référence
        const oldX = this.x;
        const oldY = this.y;
        this.x = Math.round(this.x / gridSize) * gridSize;
        this.y = Math.round(this.y / gridSize) * gridSize;
        
        // Ajuster les paramètres en conséquence
        const gridDeltaX = this.x - oldX;
        const gridDeltaY = this.y - oldY;
        if (this.params.steleX !== undefined) this.params.steleX += gridDeltaX;
        if (this.params.steleY !== undefined) this.params.steleY += gridDeltaY;
        if (this.params.porteX !== undefined) this.params.porteX += gridDeltaX;
        if (this.params.porteY !== undefined) this.params.porteY += gridDeltaY;
      } else if (this.type === 'stelePuzzle') {
        // Pour la stèle puzzle, aligner le centre
        this.x = Math.round(this.x / gridSize) * gridSize;
        this.y = Math.round(this.y / gridSize) * gridSize;
      } else if (this.type === 'porteCoulissante') {
        // Pour la porte coulissante, aligner le coin
        this.x = Math.round(this.x / gridSize) * gridSize;
        this.y = Math.round(this.y / gridSize) * gridSize;
      } else {
        // Pour les autres, aligner le coin
        this.x = Math.round(this.x / gridSize) * gridSize;
        this.y = Math.round(this.y / gridSize) * gridSize;
      }
    }
  }

  // Génère le code pour cet élément
  getCode() {
    const config = this.config;
    let params = [];
    
    // Ajouter les paramètres de base selon le type de bloc
    if (this.type === 'pique') {
      // Piques : x,y sont la base, taille = w
      params = [Math.round(this.x), Math.round(this.y), Math.round(this.w)];
    } else if (this.type === 'murPuzzle') {
      // Mur puzzle : utiliser les coordonnées stockées dans les paramètres
      params = [
        Math.round(this.params.steleX || this.x),
        Math.round(this.params.steleY || this.y),
        Math.round(this.params.porteX || this.x + 50),
        Math.round(this.params.porteY || this.y),
        Math.round(this.params.porteW || 50),
        Math.round(this.params.porteH || 200),
        `"${this.params.puzzleId || 'default'}"`
      ];
    } else if (this.type === 'stelePuzzle') {
      // Stèle puzzle : utiliser les coordonnées du centre
      params = [
        Math.round(this.x),
        Math.round(this.y),
        `"${this.params.puzzleId || 'default'}"`
      ];
    } else if (this.type === 'porteCoulissante') {
      // Porte coulissante : utiliser les coordonnées du coin supérieur gauche
      params = [
        Math.round(this.x),
        Math.round(this.y),
        Math.round(this.w),
        Math.round(this.h),
        `"${this.params.puzzleId || 'default'}"`
      ];
    } else if (this.type === 'torche') {
      // Torches : x,y sont le centre
      params = [
        Math.round(this.x), 
        Math.round(this.y)
      ];
      
      // Gérer les options de la torche
      let options = {};
      if (this.params.scale && this.params.scale !== 1.0) {
        options.scale = this.params.scale;
      }
      if (this.params.lit !== undefined && this.params.lit !== true) {
        options.lit = this.params.lit;
      }
      
      if (Object.keys(options).length > 0) {
        // Formater les options pour le code
        let optionsStr = '{ ';
        let optionPairs = [];
        for (let [key, value] of Object.entries(options)) {
          optionPairs.push(`${key}: ${typeof value === 'string' ? `"${value}"` : value}`);
        }
        optionsStr += optionPairs.join(', ') + ' }';
        params.push(optionsStr);
      } else {
        params.push('{}');
      }
    } else if (this.type === 'porte') {
      // Portes : x,y sont le centre
      params = [
        Math.round(this.x), 
        Math.round(this.y), 
        Math.round(this.w), 
        Math.round(this.h)
      ];
      
      // Ajouter les paramètres spécifiques pour les portes
      params.push(this.params.idDest || '""');
      params.push(this.params.sX || 0);
      params.push(this.params.sY || 0);
      
      // Gérer les options de la porte
      if (this.params.options && Object.keys(this.params.options).length > 0) {
        // Si c'est une fonction, la laisser telle quelle
        if (typeof this.params.options === 'function') {
          params.push(this.params.options.name || 'null');
        } else {
          params.push('{}');
        }
      } else {
        params.push('{}');
      }
    } else if (this.type === 'texte') {
      // Texte : utiliser les paramètres stockés
      const couleur = this.params.couleur || [255, 255, 255];
      let couleurStr;
      if (Array.isArray(couleur)) {
        couleurStr = `[${couleur.join(', ')}]`;
      } else {
        couleurStr = `"${couleur}"`;
      }
      
      params = [
        `"${this.params.str || 'Texte'}"`,
        Math.round(this.x),
        Math.round(this.y),
        Math.round(this.params.fsize || 20),
        Math.round(this.params.orientation_en_degree || 0),
        couleurStr
      ];
    } else {
      // Murs et plateformes : x,y sont le coin supérieur gauche
      params = [
        Math.round(this.x), 
        Math.round(this.y), 
        Math.round(this.w), 
        Math.round(this.h)
      ];
    }
    
    return `${config.drawFunction}(${params.join(', ')});`;
  }

  // Obtenir les propriétés éditables
  getEditableProperties() {
    const properties = [
      { name: 'x', value: Math.round(this.x), type: 'number' },
      { name: 'y', value: Math.round(this.y), type: 'number' },
      { name: 'w', value: Math.round(this.w), type: 'number' },
      { name: 'h', value: Math.round(this.h), type: 'number' }
    ];
    
    // Ajouter les propriétés spécifiques
    if (this.type === 'porte') {
      properties.push(
        { name: 'idDest', value: this.params.idDest, type: 'string' },
        { name: 'sX', value: this.params.sX, type: 'number' },
        { name: 'sY', value: this.params.sY, type: 'number' }
      );
    } else if (this.type === 'pique') {
      properties.push(
        { name: 'taille', value: Math.round(this.w), type: 'number' }
      );
    } else if (this.type === 'torche') {
      properties.push(
        { name: 'scale', value: this.params.scale || 1.0, type: 'number' },
        { name: 'lit', value: this.params.lit !== false, type: 'boolean' }
      );
    } else if (this.type === 'texte') {
      properties.push(
        { name: 'str', value: this.params.str || 'Texte', type: 'string' },
        { name: 'fsize', value: this.params.fsize || 20, type: 'number' },
        { name: 'orientation_en_degree', value: this.params.orientation_en_degree || 0, type: 'number' },
        { name: 'couleur', value: this.params.couleur || [255, 255, 255], type: 'color' }
      );
    }
    
    return properties;
  }

  // Mettre à jour une propriété
  updateProperty(name, value) {
    if (name === 'x' || name === 'y' || name === 'w' || name === 'h') {
      this[name] = parseFloat(value) || 0;
    } else if (this.type === 'porte') {
      if (name === 'idDest') {
        this.params.idDest = value;
      } else if (name === 'sX' || name === 'sY') {
        this.params[name] = parseFloat(value) || 0;
      }
    } else if (this.type === 'pique' && name === 'taille') {
      const taille = parseFloat(value) || 48;
      this.w = taille;
      this.h = taille;
      this.params.taille = taille;
    } else if (this.type === 'torche') {
      if (name === 'scale') {
        this.params.scale = parseFloat(value) || 1.0;
      } else if (name === 'lit') {
        this.params.lit = value === 'true' || value === true;
      }
    } else if (this.type === 'texte') {
      if (name === 'str') {
        this.params.str = value;
      } else if (name === 'fsize') {
        this.params.fsize = parseFloat(value) || 20;
      } else if (name === 'orientation_en_degree') {
        this.params.orientation_en_degree = parseFloat(value) || 0;
      } else if (name === 'couleur') {
        // Gérer différents formats de couleur
        if (Array.isArray(value)) {
          this.params.couleur = value;
        } else if (typeof value === 'string') {
          // Tenter de parser une chaîne de format [r, g, b]
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              this.params.couleur = parsed;
            } else {
              this.params.couleur = value;
            }
          } catch {
            this.params.couleur = value;
          }
        } else {
          this.params.couleur = [255, 255, 255];
        }
      }
    }
  }
}

// ==========================================
// GESTION DE L'ÉDITEUR
// ==========================================
function toggleEditorMode() {
  editorMode = !editorMode;
  
  if (editorMode) {
    // Activer le mode éditeur
    editableElements = [];
    interceptFunctions();
    
    // Exécuter la vue actuelle pour créer les éléments éditables
    let currentViewObj = views[currentView];
    if (currentViewObj && currentViewObj.displayContent) {
      currentViewObj.displayContent();
    }
    
    // Restaurer les fonctions originales
    restoreFunctions();
    
    console.log("Mode Éditeur activé - Touche P pour désactiver");
  } else {
    // Désactiver le mode éditeur
    selectedElement = null;
    isDragging = false;
    console.log("Mode Éditeur désactivé");
  }
}

// Intercepte les fonctions originales pour créer des éléments éditables
let originalFunctions = {};

function interceptFunctions() {
  console.log("Interception des fonctions...");
  
  // Sauvegarder les fonctions originales pour tous les types de blocs
  Object.keys(BLOCK_TYPES).forEach(type => {
    const config = BLOCK_TYPES[type];
    const funcName = config.drawFunction;
    
    if (window[funcName] && typeof window[funcName] === 'function') {
      originalFunctions[funcName] = window[funcName];
      
      // Remplacer par une version qui crée des éléments éditables
      window[funcName] = function(...args) {
        // Appeler la fonction originale
        let result;
        try {
          result = originalFunctions[funcName].apply(this, args);
        } catch (error) {
          console.error(`Erreur dans la fonction originale ${funcName}:`, error);
          return null;
        }
        
        // Créer l'élément éditable correspondant
        try {
          createEditableBlock(type, ...args);
        } catch (error) {
          console.error(`Erreur lors de la création du bloc éditable ${type}:`, error);
        }
        
        return result;
      };
      
      console.log(`Fonction ${funcName} interceptée pour le type ${type}`);
    } else {
      console.warn(`Fonction ${funcName} non trouvée pour le type ${type}`);
    }
  });
}

function restoreFunctions() {
  console.log("Restauration des fonctions originales...");
  
  // Restaurer toutes les fonctions originales
  Object.keys(originalFunctions).forEach(funcName => {
    if (originalFunctions[funcName]) {
      window[funcName] = originalFunctions[funcName];
      console.log(`Fonction ${funcName} restaurée`);
    }
  });
  originalFunctions = {};
}

// ==========================================
// FONCTIONS D'EXPORTATION
// ==========================================
function copySelectedElementCode() {
  if (selectedElement) {
    let code = selectedElement.getCode();
    navigator.clipboard.writeText(code).then(() => {
      console.log("Code copié: " + code);
      showNotification("Code copié: " + code);
    });
  }
}

function exportAllElements() {
  let code = "// Éléments de la vue: " + currentView + "\n";
  code += editableElements.map(el => el.getCode()).join("\n");
  
  navigator.clipboard.writeText(code).then(() => {
    console.log("Tous les éléments copiés!");
    showNotification("Tous les éléments copiés dans le presse-papiers");
  });
}

function exportViewCode() {
  // Générer le code complet de la fonction displayContent()
  let code = `views["${currentView}"].displayContent = function() {\n`;
  
  // Trier les éléments par type pour une meilleure lisibilité
  const sortedElements = [...editableElements].sort((a, b) => {
    // Ordre: plateformes, murs, torches, portes, piques
    const order = { 'plateforme': 0, 'mur': 1, 'torche': 2, 'porte': 3, 'pique': 4 };
    return (order[a.type] || 99) - (order[b.type] || 99);
  });
  
  sortedElements.forEach(element => {
    code += `    ${element.getCode()}\n`;
  });
  
  code += `};`;
  
  navigator.clipboard.writeText(code).then(() => {
    console.log("Code complet de la vue exporté!");
    showNotification("Code complet de la vue copié dans le presse-papiers");
  });
}

// ==========================================
// INTERFACE UTILISATEUR
// ==========================================
function drawEditorInterface() {
  if (!editorMode) return;
  
  push(); // Protéger le contexte de l'interface
  
  // Fond semi-transparent pour l'interface
  fill(0, 150);
  rect(10, 50, 400, 240);
  
  // Titre
  fill(255, 255, 0);
  textAlign(LEFT, TOP);
  textSize(20);
  text("MODE ÉDITEUR", 20, 60);
  
  // Instructions
  fill(255);
  textSize(14);
  text("P - Désactiver l'éditeur", 20, 90);
  text("Clic - Sélectionner/Déplacer un élément", 20, 110);
  text("E - Éditer les propriétés de l'élément", 20, 130);
  text("C - Copier le code de l'élément sélectionné", 20, 150);
  text("S - Copier tous les éléments", 20, 170);
  text("V - Exporter le code complet de la vue", 20, 190);
  text("G - Activer/Désactiver la grille", 20, 210);
  
  // Infos de l'élément sélectionné
  if (selectedElement) {
    fill(0, 200);
    rect(width - 320, 50, 300, 200);
    
    fill(255, 255, 0);
    textAlign(LEFT, TOP);
    textSize(16);
    text("Élément sélectionné:", width - 310, 60);
    
    fill(255);
    textSize(14);
    text("Type: " + selectedElement.config.displayName, width - 310, 85);
    text("X: " + Math.round(selectedElement.x), width - 310, 105);
    text("Y: " + Math.round(selectedElement.y), width - 310, 125);
    text("W: " + Math.round(selectedElement.w) + " H: " + Math.round(selectedElement.h), width - 310, 145);
    
    // Afficher les propriétés spécifiques
    const properties = selectedElement.getEditableProperties();
    let yOffset = 165;
    properties.forEach(prop => {
      if (!['x', 'y', 'w', 'h'].includes(prop.name)) {
        text(`${prop.name}: ${prop.value}`, width - 310, yOffset);
        yOffset += 20;
      }
    });
    
    // Instructions pour l'édition
    fill(200, 255, 200);
    text("Appuyez sur E pour éditer", width - 310, yOffset + 10);
  }
  
  pop(); // Restaurer le contexte
  
  // Panneau d'édition des propriétés (a son propre push/pop)
  if (editingProperties && selectedElement) {
    drawPropertyPanel();
  }
  
  // Grille si activée
  if (showGrid) {
    drawGrid();
  }
}

function drawGrid() {
  stroke(255, 50);
  strokeWeight(1);
  
  for (let x = 0; x < width; x += gridSize) {
    line(x, 0, x, height);
  }
  
  for (let y = 0; y < height; y += gridSize) {
    line(0, y, width, y);
  }
}

// ==========================================
// PANNEAU D'ÉDITION DES PROPRIÉTÉS
// ==========================================
let editingProperties = false;
let editingField = null;
let tempValue = '';

function drawPropertyPanel() {
  if (!selectedElement || !editingProperties) return;
  
  // Fond du panneau
  fill(40, 40, 40, 240);
  rect(width/2 - 200, height/2 - 150, 400, 300);
  
  // Titre
  fill(255, 255, 0);
  textAlign(CENTER, TOP);
  textSize(18);
  text("Éditer les propriétés", width/2, height/2 - 140);
  
  // Propriétés éditables
  const properties = selectedElement.getEditableProperties();
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(14);
  
  let yOffset = height/2 - 100;
  properties.forEach((prop, index) => {
    const y = yOffset + index * 30;
    
    // Nom de la propriété
    text(prop.name + ":", width/2 - 180, y);
    
    // Valeur (champ d'édition)
    fill(editingField === prop.name ? 255 : 200);
    rect(width/2 - 50, y - 10, 120, 20);
    
    fill(0);
    textAlign(CENTER, CENTER);
    text(editingField === prop.name ? tempValue : prop.value, width/2 + 10, y);
    
    textAlign(LEFT, CENTER);
  });
  
  // Instructions
  fill(200, 255, 200);
  textAlign(CENTER, TOP);
  textSize(12);
  text("Cliquez sur une valeur pour éditer - Entrée pour valider - Échap pour annuler", width/2, height/2 + 120);
}

function handlePropertyPanelClick() {
  if (!editingProperties || !selectedElement) return;
  
  const properties = selectedElement.getEditableProperties();
  let yOffset = height/2 - 100;
  
  properties.forEach((prop, index) => {
    const y = yOffset + index * 30;
    const fieldX = width/2 - 50;
    const fieldY = y - 10;
    const fieldW = 120;
    const fieldH = 20;
    
    if (mouseX >= fieldX && mouseX <= fieldX + fieldW &&
        mouseY >= fieldY && mouseY <= fieldY + fieldH) {
      editingField = prop.name;
      tempValue = String(prop.value);
    }
  });
}

function validatePropertyEdit() {
  if (editingField && selectedElement) {
    selectedElement.updateProperty(editingField, tempValue);
    editingField = null;
    tempValue = '';
  }
}

function cancelPropertyEdit() {
  editingProperties = false;
  editingField = null;
  tempValue = '';
}

// ==========================================
// GESTION DES ÉVÉNMENTS SOURIS
// ==========================================
function handleEditorMousePressed() {
  if (!editorMode) return;
  
  // Si on est en mode édition de propriétés
  if (editingProperties) {
    handlePropertyPanelClick();
    return;
  }
  
  // Rechercher l'élément cliqué
  selectedElement = null;
  
  // Parcourir les éléments du dernier au premier (ordre Z)
  for (let i = editableElements.length - 1; i >= 0; i--) {
    if (editableElements[i].contains(mouseX, mouseY)) {
      selectedElement = editableElements[i];
      
      // Désélectionner les autres
      editableElements.forEach(el => el.selected = false);
      selectedElement.selected = true;
      
      // Préparer le drag
      isDragging = true;
      dragOffset.x = mouseX - selectedElement.x;
      dragOffset.y = mouseY - selectedElement.y;
      
      break;
    }
  }
  
  // Si aucun élément n'est sélectionné, désélectionner tout
  if (!selectedElement) {
    editableElements.forEach(el => el.selected = false);
  }
}

function handleEditorMouseDragged() {
  if (!editorMode || !isDragging || !selectedElement) return;
  
  selectedElement.moveTo(mouseX - dragOffset.x, mouseY - dragOffset.y);
}

function handleEditorMouseReleased() {
  if (!editorMode) return;
  
  isDragging = false;
}

// ==========================================
// GESTION DES ÉVÉNENTS CLAVIER
// ==========================================
function handleEditorKeyPressed() {
  if (key === 'p' || key === 'P') {
    toggleEditorMode();
  }
  
  if (!editorMode) return;
  
  if (key === 'e' || key === 'E') {
    if (selectedElement) {
      editingProperties = !editingProperties;
      if (!editingProperties) {
        editingField = null;
        tempValue = '';
      }
    }
  }
  
  if (key === 'c' || key === 'C') {
    copySelectedElementCode();
  }
  
  if (key === 's' || key === 'S') {
    exportAllElements();
  }
  
  if (key === 'v' || key === 'V') {
    exportViewCode();
  }
  
  if (key === 'g' || key === 'G') {
    showGrid = !showGrid;
  }
  
  // Gestion de l'édition des propriétés
  if (editingProperties && editingField) {
    if (keyCode === ENTER) {
      validatePropertyEdit();
    } else if (keyCode === ESCAPE) {
      cancelPropertyEdit();
    } else if (keyCode === BACKSPACE) {
      tempValue = tempValue.slice(0, -1);
    }
  }
}

function handleEditorKeyTyped() {
  if (editingProperties && editingField) {
    // Ajouter le caractère tapé à la valeur temporaire
    if (key.length === 1) {
      tempValue += key;
    }
  }
}

// ==========================================
// FONCTIONS DE CRÉATION D'ÉLÉMENTS
// ==========================================

// Fonction spécifique pour créer un mur puzzle éditable
function createEditableMurPuzzle(steleX, steleY, porteX, porteY, porteW, porteH, puzzleId) {
  return createEditableBlock('murPuzzle', steleX, steleY, porteX, porteY, porteW, porteH, puzzleId);
}

// Fonction spécifique pour créer une stèle puzzle éditable
function createEditableStelePuzzle(x, y, puzzleId) {
  return createEditableBlock('stelePuzzle', x, y, puzzleId);
}

// Fonction spécifique pour créer une porte coulissante éditable
function createEditablePorteCoulissante(x, y, w, h, puzzleId) {
  return createEditableBlock('porteCoulissante', x, y, w, h, puzzleId);
}
function createEditableBlock(type, ...args) {
  let element;
  const config = BLOCK_TYPES[type];
  
  if (!config) {
    console.error(`Type de bloc inconnu: ${type}`);
    return null;
  }
  
  try {
    // Extraire les paramètres en fonction du type de bloc
    if (type === 'pique') {
      const [x, y, taille] = args;
      // Les piques utilisent x,y comme base du triangle
      element = new EditableBlock(type, x, y, taille, taille, { taille });
    } else if (type === 'torche') {
      const [x, y, options] = args;
      // Les torches utilisent x,y comme centre
      const torcheOptions = options || {};
      element = new EditableBlock(type, x, y, config.defaultSize.w, config.defaultSize.h, {
        scale: torcheOptions.scale || 1.0,
        lit: torcheOptions.lit !== false
      });
    } else if (type === 'porte') {
      const [x, y, w, h, idDest, sX, sY, options] = args;
      // Les portes utilisent x,y comme centre
      element = new EditableBlock(type, x, y, w, h, { 
        idDest: idDest || '', 
        sX: sX || 0, 
        sY: sY || 0, 
        options: options || {} 
      });
    } else if (type === 'murPuzzle') {
      const [steleX, steleY, porteX, porteY, porteW, porteH, puzzleId] = args;
      // Le mur puzzle utilise le coin supérieur gauche comme référence
      // Réduire l'écart entre stèle et porte de moitié
      const ecartReduit = (porteX - steleX) / 2;
      const nouvellePorteX = steleX + ecartReduit;
      
      element = new EditableBlock(type, steleX, steleY, config.defaultSize.w, config.defaultSize.h, {
        steleX: steleX,
        steleY: steleY,
        porteX: nouvellePorteX,
        porteY: porteY,
        porteW: porteW,
        porteH: porteH,
        puzzleId: puzzleId || 'default'
      });
    } else if (type === 'stelePuzzle') {
      const [x, y, puzzleId] = args;
      // La stèle utilise x,y comme centre
      element = new EditableBlock(type, x, y, config.defaultSize.w, config.defaultSize.h, {
        puzzleId: puzzleId || 'default'
      });
    } else if (type === 'porteCoulissante') {
      const [x, y, w, h, puzzleId] = args;
      // La porte coulissante utilise le coin supérieur gauche
      element = new EditableBlock(type, x, y, w, h, {
        puzzleId: puzzleId || 'default'
      });
    } else if (type === 'texte') {
      const [str, x, y, fsize, orientation_en_degree, couleur] = args;
      // Le texte utilise le coin supérieur gauche
      element = new EditableBlock(type, x, y, config.defaultSize.w, config.defaultSize.h, {
        str: str || 'Texte',
        fsize: fsize || 20,
        orientation_en_degree: orientation_en_degree || 0,
        couleur: couleur || [255, 255, 255]
      });
    } else {
      // Pour mur et plateforme (positionnement avec coin supérieur gauche)
      const [x, y, w, h] = args;
      element = new EditableBlock(type, x, y, w, h);
    }
    
    editableElements.push(element);
    return element;
  } catch (error) {
    console.error(`Erreur lors de la création du bloc ${type}:`, error);
    return null;
  }
}

// ==========================================
// GESTION DYNAMIQUE DES TYPES DE BLOCS
// ==========================================
function addBlockType(typeName, config) {
  if (!config.name || !config.drawFunction || !config.defaultSize) {
    console.error('Configuration de bloc invalide: name, drawFunction et defaultSize sont requis');
    return false;
  }
  
  // Valeurs par défaut
  const defaultConfig = {
    displayName: config.name,
    parameters: ['x', 'y', 'w', 'h'],
    color: [128, 128, 128],
    hitbox: 'rectangle',
    defaultParams: {}
  };
  
  // Fusionner avec la configuration fournie
  BLOCK_TYPES[typeName] = { ...defaultConfig, ...config };
  
  console.log(`Type de bloc '${typeName}' ajouté avec succès`);
  return true;
}

function removeBlockType(typeName) {
  if (BLOCK_TYPES[typeName]) {
    delete BLOCK_TYPES[typeName];
    console.log(`Type de bloc '${typeName}' supprimé`);
    return true;
  }
  return false;
}

function getAvailableBlockTypes() {
  return Object.keys(BLOCK_TYPES).map(type => ({
    type,
    displayName: BLOCK_TYPES[type].displayName,
    defaultSize: BLOCK_TYPES[type].defaultSize
  }));
}

function showNotification(message) {
  // Notification temporaire dans la console
  console.log(message);
  
  // TODO: Implémenter une notification visuelle si nécessaire
  // Pour l'instant, on utilise la console
}

// ==========================================
// HOOKS POUR L'INTÉGRATION AVEC sketch.js
// ==========================================
function editorDraw() {
  if (!editorMode) return;
  
  // Dessiner tous les éléments éditables
  editableElements.forEach(element => {
    element.draw();
  });
  
  // Dessiner l'interface
  drawEditorInterface();
}

// Ces fonctions seront appelées depuis sketch.js
function editorSetup() {
  console.log("Éditeur universel initialisé - Appuyez sur P pour activer");
  console.log("Types de blocs disponibles:", getAvailableBlockTypes().map(t => t.displayName).join(", "));
}

// Surcharge de displayContent pour ne pas afficher les éléments originaux en mode éditeur
function editorDisplayContent() {
  if (!editorMode) return;
  
  // En mode éditeur, on ne dessine que les éléments éditables
  // Les éléments originaux ne sont pas dessinés pour éviter la duplication
}


// ==========================================
// EXTENSION ÉDITEUR — Grille + Chat
// ==========================================
// À charger APRÈS editor.js et grilleChat.js
//
// Ajoute deux types de blocs éditables :
//   • grilleChat_grille  — la grille de prison
//   • grilleChat_zone    — la zone de déplacement du chat (rectangle visible en édition)
//
// Le bloc "maître" est grilleChat_grille ; il stocke tous les paramètres communs
// (interactionDist, spawnX/Y, chatScale, id).
// Le bloc grilleChat_zone est lié à un id et permet de déplacer/redimensionner chatZone.
//
// Usage dans le sketch : appeler grilleChat() normalement avec createEditable = true
//   grilleChat(500, 150, 50, 300,
//              { x:600, y:50, w:400, h:350 },
//              80, 800, 350, 1, 'p1', true);   ← dernier arg = createEditable
// ==========================================

// ─────────────────────────────────────────
// 1. ENREGISTREMENT DES DEUX TYPES DE BLOCS
// ─────────────────────────────────────────

BLOCK_TYPES['grilleChat_grille'] = {
  name: 'grilleChat_grille',
  displayName: 'Grille Prison',
  defaultSize: { w: 50, h: 300 },
  drawFunction: 'grilleChat',
  // Paramètres dans l'ordre de getCode()
  parameters: ['grilleX', 'grilleY', 'grilleW', 'grilleH',
               'chatZone', 'interactionDist', 'spawnX', 'spawnY', 'chatScale', 'id'],
  color: [60, 60, 70],
  hitbox: 'rectangle',
  coordSystem: 'corner',
  defaultParams: {
    interactionDist: 80,
    spawnX: 0,
    spawnY: 0,
    chatScale: 1,
    id: 'default',
    // chatZone est stocké séparément dans le bloc grilleChat_zone lié
    chatZoneX: 0,
    chatZoneY: 0,
    chatZoneW: 300,
    chatZoneH: 250
  }
};

BLOCK_TYPES['grilleChat_zone'] = {
  name: 'grilleChat_zone',
  displayName: 'Zone Chat',
  defaultSize: { w: 300, h: 250 },
  drawFunction: null,          // pas de fonction autonome, lié à grilleChat_grille
  parameters: [],
  color: [255, 180, 50],
  hitbox: 'rectangle',
  coordSystem: 'corner',
  defaultParams: {
    linkedId: 'default'        // id du bloc grille associé
  }
};

// ─────────────────────────────────────────
// 2. RENDU DES DEUX TYPES DANS EditableBlock
// ─────────────────────────────────────────
// On patche drawElement() et contains() via spécialisation dans createEditableBlock.
// Les deux classes héritent d'EditableBlock mais on surcharge draw() localement.

// Classe étendue pour la grille (affichage + handles de redimensionnement)
class EditableGrilleChat extends EditableBlock {
  constructor(x, y, w, h, params) {
    super('grilleChat_grille', x, y, w, h, params);
  }

  draw() {
    // ── Grille (rectangle hachuré métal) ──
    push();
    rectMode(CORNER);
    // Corps de la grille
    fill(60, 60, 70, 160);
    stroke(255, 255, 0, this.selected ? 255 : 80);
    strokeWeight(this.selected ? 3 : 1);
    rect(this.x, this.y, this.w, this.h);

    // Barreaux verticaux indicatifs
    const barCount = max(2, floor(this.w / 18));
    stroke(100, 100, 115, 180);
    strokeWeight(2);
    for (let i = 1; i < barCount - 1; i++) {
      const bx = this.x + map(i, 0, barCount - 1, 0, this.w);
      line(bx, this.y, bx, this.y + this.h);
    }
    // Traverse centrale
    line(this.x, this.y + this.h / 2, this.x + this.w, this.y + this.h / 2);

    pop();

    // ── Spawn du chat (croix orange) ──
    const sx = this.params.spawnX;
    const sy = this.params.spawnY;
    push();
    stroke(255, 120, 0);
    strokeWeight(2);
    noFill();
    const cr = 10;
    line(sx - cr, sy, sx + cr, sy);
    line(sx, sy - cr, sx, sy + cr);
    ellipse(sx, sy, cr * 2, cr * 2);
    fill(255, 120, 0, 200);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text('spawn', sx, sy - cr - 2);
    pop();

    // ── Label ──
    push();
    fill(255, 255, 0, this.selected ? 230 : 140);
    noStroke();
    textAlign(LEFT, BOTTOM);
    textSize(11);
    text(`[grille] id="${this.params.id}"  scale=${this.params.chatScale}  dist=${this.params.interactionDist}`,
         this.x, this.y - 4);
    pop();

    // ── Handles si sélectionné ──
    if (this.selected) {
      this._drawHandles();
    }
  }

  _drawHandles() {
    const handles = this._getHandles();
    push();
    fill(255, 255, 0);
    noStroke();
    for (const h of handles) {
      rect(h.x - 5, h.y - 5, 10, 10);
    }
    pop();
  }

  _getHandles() {
    return [
      { id: 'br', x: this.x + this.w, y: this.y + this.h },  // bas-droite
      { id: 'r',  x: this.x + this.w, y: this.y + this.h / 2 }, // droite milieu
      { id: 'b',  x: this.x + this.w / 2, y: this.y + this.h }  // bas milieu
    ];
  }

  handleAt(px, py) {
    for (const h of this._getHandles()) {
      if (abs(px - h.x) < 8 && abs(py - h.y) < 8) return h.id;
    }
    return null;
  }

  contains(px, py) {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.y + this.h;
  }

  getEditableProperties() {
    return [
      { name: 'x',              value: Math.round(this.x),              type: 'number' },
      { name: 'y',              value: Math.round(this.y),              type: 'number' },
      { name: 'w',              value: Math.round(this.w),              type: 'number' },
      { name: 'h',              value: Math.round(this.h),              type: 'number' },
      { name: 'interactionDist',value: this.params.interactionDist,     type: 'number' },
      { name: 'spawnX',         value: Math.round(this.params.spawnX),  type: 'number' },
      { name: 'spawnY',         value: Math.round(this.params.spawnY),  type: 'number' },
      { name: 'chatScale',      value: this.params.chatScale,           type: 'number' },
      { name: 'id',             value: this.params.id,                  type: 'string' },
    ];
  }

  updateProperty(name, value) {
    const numProps = ['x','y','w','h','interactionDist','spawnX','spawnY','chatScale'];
    if (numProps.includes(name)) {
      const v = parseFloat(value) || 0;
      if (name === 'x' || name === 'y' || name === 'w' || name === 'h') {
        this[name] = v;
      } else {
        this.params[name] = v;
      }
    } else if (name === 'id') {
      this.params.id = value;
    }
  }

  getCode() {
    const cz = `{ x: ${Math.round(this.params.chatZoneX)}, y: ${Math.round(this.params.chatZoneY)}, w: ${Math.round(this.params.chatZoneW)}, h: ${Math.round(this.params.chatZoneH)} }`;
    return [
      'grilleChat(',
      `  ${Math.round(this.x)}, ${Math.round(this.y)}, ${Math.round(this.w)}, ${Math.round(this.h)},`,
      `  ${cz},`,
      `  ${this.params.interactionDist},`,
      `  ${Math.round(this.params.spawnX)}, ${Math.round(this.params.spawnY)},`,
      `  ${this.params.chatScale},`,
      `  '${this.params.id}'`,
      ');'
    ].join('\n');
  }
}

// Classe étendue pour la zone du chat
class EditableZoneChat extends EditableBlock {
  constructor(x, y, w, h, params) {
    super('grilleChat_zone', x, y, w, h, params);
  }

  draw() {
    push();
    rectMode(CORNER);

    // Fond très transparent teinté orange
    fill(255, 160, 30, this.selected ? 35 : 18);
    stroke(255, 160, 30, this.selected ? 220 : 130);
    strokeWeight(this.selected ? 2 : 1);
    // Tirets
    drawingContext.setLineDash([8, 5]);
    rect(this.x, this.y, this.w, this.h);
    drawingContext.setLineDash([]);

    // Icône patte en haut à gauche
    fill(255, 160, 30, this.selected ? 200 : 120);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(18);
    text('🐾', this.x + 4, this.y + 2);

    // Label
    textSize(11);
    text(`zone chat  id="${this.params.linkedId}"  ${Math.round(this.w)}×${Math.round(this.h)}`,
         this.x + 28, this.y + 5);

    pop();

    // Handles de redimensionnement si sélectionné
    if (this.selected) {
      push();
      fill(255, 160, 30);
      noStroke();
      const handles = this._getHandles();
      for (const h of handles) rect(h.x - 5, h.y - 5, 10, 10);
      // Surbrillance bord
      stroke(255, 255, 0);
      strokeWeight(2);
      noFill();
      drawingContext.setLineDash([6, 4]);
      rect(this.x, this.y, this.w, this.h);
      drawingContext.setLineDash([]);
      pop();
    }
  }

  _getHandles() {
    return [
      { id: 'tl', x: this.x,            y: this.y            },
      { id: 'tr', x: this.x + this.w,   y: this.y            },
      { id: 'bl', x: this.x,            y: this.y + this.h   },
      { id: 'br', x: this.x + this.w,   y: this.y + this.h   },
      { id: 'r',  x: this.x + this.w,   y: this.y + this.h/2 },
      { id: 'b',  x: this.x + this.w/2, y: this.y + this.h   },
      { id: 't',  x: this.x + this.w/2, y: this.y            },
      { id: 'l',  x: this.x,            y: this.y + this.h/2 },
    ];
  }

  handleAt(px, py) {
    for (const h of this._getHandles()) {
      if (abs(px - h.x) < 8 && abs(py - h.y) < 8) return h.id;
    }
    return null;
  }

  contains(px, py) {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.y + this.h;
  }

  getEditableProperties() {
    return [
      { name: 'x',        value: Math.round(this.x),        type: 'number' },
      { name: 'y',        value: Math.round(this.y),        type: 'number' },
      { name: 'w',        value: Math.round(this.w),        type: 'number' },
      { name: 'h',        value: Math.round(this.h),        type: 'number' },
      { name: 'linkedId', value: this.params.linkedId,      type: 'string' },
    ];
  }

  updateProperty(name, value) {
    if (['x','y','w','h'].includes(name)) {
      this[name] = parseFloat(value) || 0;
    } else if (name === 'linkedId') {
      this.params.linkedId = value;
    }
  }

  getCode() {
    // La zone seule ne génère pas de code autonome :
    // elle met à jour le bloc grille lié, puis c'est getCode() de la grille qui compte.
    // On renvoie un commentaire utile.
    return `// Zone chat '${this.params.linkedId}' : x=${Math.round(this.x)} y=${Math.round(this.y)} w=${Math.round(this.w)} h=${Math.round(this.h)}`;
  }
}

// ─────────────────────────────────────────
// 3. SYNCHRONISATION ZONE → GRILLE
// Chaque frame, si une zone est modifiée,
// on reporte ses coords dans le bloc grille lié.
// ─────────────────────────────────────────
function _syncGrilleZones() {
  for (const zone of editableElements) {
    if (!(zone instanceof EditableZoneChat)) continue;
    // Trouver le bloc grille avec le même id
    const grille = editableElements.find(
      el => el instanceof EditableGrilleChat && el.params.id === zone.params.linkedId
    );
    if (!grille) continue;
    grille.params.chatZoneX = zone.x;
    grille.params.chatZoneY = zone.y;
    grille.params.chatZoneW = zone.w;
    grille.params.chatZoneH = zone.h;
  }
}

// ─────────────────────────────────────────
// 4. REDIMENSIONNEMENT PAR HANDLES
// On étend la gestion souris de l'éditeur
// ─────────────────────────────────────────
let _gcResizing = null;   // { element, handle, startX, startY, origX, origY, origW, origH }

function _gcHandleMousePressed(mx, my) {
  if (!editorMode) return false;

  // Chercher un handle sur l'élément sélectionné
  if (!selectedElement) return false;

  if (selectedElement instanceof EditableGrilleChat ||
      selectedElement instanceof EditableZoneChat) {
    const h = selectedElement.handleAt(mx, my);
    if (h) {
      _gcResizing = {
        element: selectedElement,
        handle: h,
        startX: mx,
        startY: my,
        origX: selectedElement.x,
        origY: selectedElement.y,
        origW: selectedElement.w,
        origH: selectedElement.h
      };
      return true; // consommé, pas de drag normal
    }
  }
  return false;
}

function _gcHandleMouseDragged(mx, my) {
  if (!_gcResizing) return false;

  const R = _gcResizing;
  const dx = mx - R.startX;
  const dy = my - R.startY;
  const el = R.element;
  const snap = showGrid ? gridSize : 1;

  // Calculer nouvelles valeurs selon le handle tiré
  let nx = R.origX, ny = R.origY, nw = R.origW, nh = R.origH;

  if (R.handle.includes('r')) nw = max(20, R.origW + dx);
  if (R.handle.includes('b')) nh = max(20, R.origH + dy);
  if (R.handle.includes('l')) { nx = R.origX + dx; nw = max(20, R.origW - dx); }
  if (R.handle.includes('t')) { ny = R.origY + dy; nh = max(20, R.origH - dy); }

  // Snap grille
  el.x = Math.round(nx / snap) * snap;
  el.y = Math.round(ny / snap) * snap;
  el.w = Math.round(nw / snap) * snap;
  el.h = Math.round(nh / snap) * snap;

  return true;
}

function _gcHandleMouseReleased() {
  _gcResizing = null;
}

// ─────────────────────────────────────────
// 5. PATCH DES HANDLERS SOURIS DE L'ÉDITEUR
// On enveloppe les fonctions existantes pour
// injecter la logique handles sans les casser.
// ─────────────────────────────────────────
(function patchEditorMouse() {
  const origPressed  = handleEditorMousePressed;
  const origDragged  = handleEditorMouseDragged;
  const origReleased = handleEditorMouseReleased;

  handleEditorMousePressed = function() {
    // Essayer d'abord le handle GrilleChat
    if (_gcHandleMousePressed(mouseX, mouseY)) return;
    origPressed.apply(this, arguments);
  };

  handleEditorMouseDragged = function() {
    if (_gcHandleMouseDragged(mouseX, mouseY)) return;
    origDragged.apply(this, arguments);
  };

  handleEditorMouseReleased = function() {
    _gcHandleMouseReleased();
    origReleased.apply(this, arguments);
  };
})();

// ─────────────────────────────────────────
// 6. PATCH DE editorDraw POUR LA SYNCHRO
// ─────────────────────────────────────────
(function patchEditorDraw() {
  const origDraw = editorDraw;
  editorDraw = function() {
    _syncGrilleZones();   // synchro zone → grille avant le rendu
    origDraw.apply(this, arguments);
  };
})();

// ─────────────────────────────────────────
// 7. PATCH DE exportViewCode POUR GRILLE
// Quand on exporte, la zone n'émet qu'un
// commentaire, la grille émet l'appel complet.
// ─────────────────────────────────────────
(function patchExportViewCode() {
  const origExport = exportViewCode;
  exportViewCode = function() {
    // Générer séparément les blocs grilleChat
    const grilleBlocs = editableElements.filter(el => el instanceof EditableGrilleChat);
    const zoneBlocs   = editableElements.filter(el => el instanceof EditableZoneChat);
    const autres      = editableElements.filter(
      el => !(el instanceof EditableGrilleChat) && !(el instanceof EditableZoneChat)
    );

    if (grilleBlocs.length === 0) {
      origExport.apply(this, arguments);
      return;
    }

    let code = `views["${currentView}"].displayContent = function() {\n`;

    // Autres blocs classiques
    autres.forEach(el => { code += `  ${el.getCode()}\n`; });

    // Blocs grilleChat (avec zone à jour)
    grilleBlocs.forEach(grille => {
      code += '\n  ' + grille.getCode().split('\n').join('\n  ') + '\n';
    });

    code += `};`;

    navigator.clipboard.writeText(code).then(() => {
      showNotification("Code complet exporté (avec grilleChat)");
    });
  };
})();

// ─────────────────────────────────────────
// 8. PATCH DE createEditableBlock
// Pour que les deux nouveaux types soient
// instanciés avec les bonnes sous-classes.
// ─────────────────────────────────────────
(function patchCreateEditableBlock() {
  const orig = createEditableBlock;
  window.createEditableBlock = function(type, ...args) {
    if (type === 'grilleChat_grille') {
      const [grilleX, grilleY, grilleW, grilleH,
             chatZone, interactionDist, spawnX, spawnY, chatScale, id] = args;

      const el = new EditableGrilleChat(grilleX, grilleY, grilleW, grilleH, {
        interactionDist: interactionDist ?? 80,
        spawnX:  spawnX  ?? grilleX + 150,
        spawnY:  spawnY  ?? grilleY,
        chatScale: chatScale ?? 1,
        id: id ?? 'default',
        chatZoneX: chatZone?.x ?? grilleX + 100,
        chatZoneY: chatZone?.y ?? grilleY,
        chatZoneW: chatZone?.w ?? 300,
        chatZoneH: chatZone?.h ?? 250,
      });
      editableElements.push(el);

      // Créer automatiquement le bloc zone lié s'il n'existe pas encore
      const zoneExiste = editableElements.some(
        z => z instanceof EditableZoneChat && z.params.linkedId === (id ?? 'default')
      );
      if (!zoneExiste) {
        const zone = new EditableZoneChat(
          el.params.chatZoneX, el.params.chatZoneY,
          el.params.chatZoneW, el.params.chatZoneH,
          { linkedId: el.params.id }
        );
        editableElements.push(zone);
      }

      return el;
    }

    if (type === 'grilleChat_zone') {
      // Création manuelle d'une zone (rare, normalement auto-créée)
      const [x, y, w, h, linkedId] = args;
      const el = new EditableZoneChat(x, y, w, h, { linkedId: linkedId ?? 'default' });
      editableElements.push(el);
      return el;
    }

    return orig.call(this, type, ...args);
  };
})();

// ─────────────────────────────────────────
// 9. HOOK createEditable DANS grilleChat()
// Ajouter un dernier paramètre `createEditable`
// à la fonction principale.
// ─────────────────────────────────────────
(function patchGrilleChat() {
  const orig = grilleChat;
  grilleChat = function(
    grilleX, grilleY, grilleW, grilleH,
    chatZone, interactionDist,
    spawnX, spawnY,
    chatScale = 1,
    id = 'default',
    createEditable = false
  ) {
    // Appel original
    orig(grilleX, grilleY, grilleW, grilleH,
         chatZone, interactionDist,
         spawnX, spawnY, chatScale, id);

    // Création éditable si demandé et que l'éditeur est actif
    if (createEditable && typeof createEditableBlock === 'function') {
      // Vérifier si le bloc existe déjà (évite les doublons à chaque frame)
      const existe = editableElements.some(
        el => el instanceof EditableGrilleChat && el.params.id === id
      );
      if (!existe) {
        createEditableBlock('grilleChat_grille',
          grilleX, grilleY, grilleW, grilleH,
          chatZone, interactionDist,
          spawnX, spawnY, chatScale, id
        );
      }
    }
  };
})();

// ─────────────────────────────────────────
// 10. AFFICHAGE DE L'AIDE DANS L'ÉDITEUR
// ─────────────────────────────────────────
(function patchDrawEditorInterface() {
  const orig = drawEditorInterface;
  drawEditorInterface = function() {
    orig.apply(this, arguments);
    if (!editorMode) return;

    // Légende spécifique grilleChat
    const hasGC = editableElements.some(
      el => el instanceof EditableGrilleChat || el instanceof EditableZoneChat
    );
    if (!hasGC) return;

    push();
    fill(0, 150);
    noStroke();
    rectMode(CORNER);
    rect(10, 300, 320, 80);

    fill(255, 160, 30);
    textAlign(LEFT, TOP);
    textSize(13);
    noStroke();
    text("GrilleChat", 18, 308);

    fill(200);
    textSize(11);
    text("🔶 Zone orange = zone de déplacement du chat", 18, 326);
    text("✚ Croix orange = point de spawn du chat",     18, 341);
    text("Handles jaunes = redimensionner",             18, 356);
    text("Exporter (V) = code grilleChat() complet",   18, 371);
    pop();
  };
})();

console.log("[editor_grilleChat] Extension chargée — grilleChat éditable activé");
let user;
let currentView = "entree";
let views = {};

function setup() {
  createCanvas(5760, 1200);
  
  user = new Player(100, height / 2);
  
  // Initialiser l'éditeur si disponible
  if (typeof editorSetup === 'function') {
    editorSetup();
  }

  // ==========================================
  // CONFIGURATION DES SALLES (Chargement depuis fichiers séparés)
  // ==========================================

  // Charger les vues du désert
  if (typeof setupDesertViews === 'function') {
    setupDesertViews(views);
  }
  
  // Charger les vues du temple
  if (typeof setupTempleViews === 'function') {
    setupTempleViews(views);
  }
  
  // Charger les vues de la ville
  if (typeof setupVilleViews === 'function') {
    setupVilleViews(views);
  }
}

function draw() {
  let View = views[currentView];
  View.render();
  
  // Mettre à jour l'animation des torches
  if (typeof updateTorcheAnimation === 'function') {
    updateTorcheAnimation();
  }
  
  // N'afficher les blocs que si on n'est pas en mode éditeur
  if (typeof editorMode === 'undefined' || !editorMode) {
    View.displayContent(); // Affiche les blocs de la salle
  }

  // Dessiner l'éditeur si activé
  if (typeof editorDraw === 'function') {
    editorDraw();
  }

  // Ne mettre à jour le joueur que si on n'est pas en mode éditeur
  if (typeof editorMode === 'undefined' || !editorMode) {
    user.update();
    user.display();
  }
}



function star(x, y, r1, r2, n) {
  let angle = TWO_PI / n;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * r2;
    let sy = y + sin(a) * r2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * r1;
    sy = y + sin(a + halfAngle) * r1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// ==========================================
// GESTIONNAIRES D'ÉVÉNEMENTS POUR L'ÉDITEUR
// ==========================================
function mousePressed() {
  if (typeof handleEditorMousePressed === 'function') {
    handleEditorMousePressed();
  }
}

function mouseDragged() {
  if (typeof handleEditorMouseDragged === 'function') {
    handleEditorMouseDragged();
  }
}

function mouseReleased() {
  if (typeof handleEditorMouseReleased === 'function') {
    handleEditorMouseReleased();
  }
}

function keyPressed() {
  if (typeof handleEditorKeyPressed === 'function') {
    handleEditorKeyPressed();
  }
}

function keyTyped() {
  if (typeof handleEditorKeyTyped === 'function') {
    handleEditorKeyTyped();
  }
}
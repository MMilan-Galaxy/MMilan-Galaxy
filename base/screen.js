// =============================================
// screen.js
// Gestion des trois zones d'affichage triple écran
// LEFT (0→1920) | CENTER (1920→3840) | RIGHT (3840→5760)
// Dépend de : (aucune dépendance)
// =============================================

const SCREEN = {
    W:       1920,   // largeur d'un écran individuel
    H:       1200,
    TOTAL_W: 5760,

    LEFT:   { x: 0,    w: 1920 },
    CENTER: { x: 1920, w: 1920 },
    RIGHT:  { x: 3840, w: 1920 },
};


// =============================================
// Fonctions de dessin par zone (avec clipping)
// =============================================

// Dessine des éléments sur l'écran gauche (ambiance/décor)
// Le système de coordonnées local commence à x=0
function dessineEcranGauche(drawFn) {
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(SCREEN.LEFT.x, 0, SCREEN.LEFT.w, SCREEN.H);
    drawingContext.clip();
    translate(SCREEN.LEFT.x, 0);
    drawFn();
    drawingContext.restore();
    pop();
}

// Dessine le gameplay sur l'écran central uniquement
// Le système de coordonnées local commence à x=0 (equiv. canvas x=1920)
// Toutes les scènes et interactions doivent être dessinées ici
function dessineEcranCentre(drawFn) {
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(SCREEN.CENTER.x, 0, SCREEN.CENTER.w, SCREEN.H);
    drawingContext.clip();
    translate(SCREEN.CENTER.x, 0);
    drawFn();
    drawingContext.restore();
    pop();
}

// Dessine des éléments sur l'écran droit (continuité du décor)
// Le système de coordonnées local commence à x=0
function dessineEcranDroit(drawFn) {
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(SCREEN.RIGHT.x, 0, SCREEN.RIGHT.w, SCREEN.H);
    drawingContext.clip();
    translate(SCREEN.RIGHT.x, 0);
    drawFn();
    drawingContext.restore();
    pop();
}


// =============================================
// Utilitaires de coordonnées
// =============================================

// Convertit des coordonnées locales à la zone centrale
// en coordonnées canvas absolues (utile pour debug)
function centerToCanvas(localX, localY) {
    return {
        x: SCREEN.CENTER.x + localX,
        y: localY,
    };
}

// Convertit mouseX/mouseY en coordonnées locales de la zone centrale
// Retourne null si la souris est hors de la zone centrale
function mouseLocalCenter() {
    if (mouseX < SCREEN.CENTER.x || mouseX > SCREEN.CENTER.x + SCREEN.CENTER.w) {
        return null;
    }
    return {
        x: mouseX - SCREEN.CENTER.x,
        y: mouseY,
    };
}

// Indique si la souris est dans la zone centrale
function mouseEstDansZoneCentrale() {
    return mouseX >= SCREEN.CENTER.x && mouseX <= SCREEN.CENTER.x + SCREEN.CENTER.w;
}


// =============================================
// Outils de développement
// =============================================

// Trace les séparateurs visuels entre les trois zones (debug)
function dessineGuides() {
    push();
    // Ligne gauche/centre
    stroke(255, 80, 80, 120);
    strokeWeight(2);
    line(SCREEN.LEFT.w, 0, SCREEN.LEFT.w, SCREEN.H);

    // Ligne centre/droit
    line(SCREEN.CENTER.x + SCREEN.CENTER.w, 0, SCREEN.CENTER.x + SCREEN.CENTER.w, SCREEN.H);

    // Labels des zones
    noStroke();
    fill(255, 80, 80, 80);
    textSize(14);
    textAlign(CENTER, TOP);
    textFont("monospace");
    text("GAUCHE [0 → 1920]",           SCREEN.LEFT.w   / 2,           10);
    text("CENTRE [1920 → 3840]",         SCREEN.CENTER.x + SCREEN.CENTER.w / 2, 10);
    text("DROITE [3840 → 5760]",         SCREEN.RIGHT.x  + SCREEN.RIGHT.w  / 2, 10);
    pop();
}

// =============================================
// scene_isometrique.js  –  v7 Faux-ISO
// Vue top-down oblique (PAS de vraie iso 30°)
// Relief via ombres elliptiques + dessin en couches
// Caméra smooth lerp 0.18, collisions AABB axes séparés
// Dépend de : constants.js, config.js, screen.js
// =============================================

// ---- Obstacles / solides dans le monde ----
class Obstacle {
    constructor(x, y, w, h, couleur) {
        this.x = x; this.y = y;
        this.w = w; this.h = h;
        this.couleur = couleur || COULEURS.fondScene;
    }

    solid() {
        return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
    }

    draw() {
        push();
        translate(this.x, this.y);
        scale(2, 2);

        // Ombre aplatie
        noStroke();
        fill(0, 0, 0, 70);
        ellipse(0, this.h * 0.28, this.w * 0.9, this.h * 0.25);

        // Corps principal
        fill(this.couleur);
        stroke(COULEURS.texteSombre);
        strokeWeight(1);
        rectMode(CENTER);
        rect(0, 0, this.w, this.h * 0.7, 4);

        // Toit (effet de volume)
        fill(lerpColor(color(this.couleur), color('#ffffff'), 0.15));
        noStroke();
        rect(0, -this.h * 0.1, this.w * 0.92, this.h * 0.35, 3);

        pop();
    }
}

// ---- Particules de traîne ----
class TraineParticule {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.alpha = 120;
        this.r = random(3, 7);
    }
    update() { this.alpha -= 12; }
    dead()   { return this.alpha <= 0; }
    draw() {
        noStroke();
        fill(0, 229, 255, this.alpha);
        ellipse(this.x, this.y, this.r, this.r * 0.5);
    }
}

// ---- Joueur ----
class JoueurIso {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.hw  = 14;   // demi-largeur hitbox (avant scale)
        this.hh  = 10;   // demi-hauteur hitbox
        this.spd = Config.setting.vitesseDeplacementPersonnage || 3.5;
        this.dir = 2;    // 0=haut 1=droite 2=bas 3=gauche
        this.fr  = 0;
        this.moving = false;
        this.trail  = [];
        this.particules = [];
    }

    update(allSolids) {
        let dx = 0, dy = 0;
        this.spd = Config.setting.vitesseDeplacementPersonnage || this.spd;
        // Flèches ET ZQSD
        if (keyIsDown(LEFT_ARROW)  || keyIsDown(81))  { dx = -this.spd; this.dir = 3; }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68))  { dx =  this.spd; this.dir = 1; }
        if (keyIsDown(UP_ARROW)    || keyIsDown(90))  { dy = -this.spd; this.dir = 0; }
        if (keyIsDown(DOWN_ARROW)  || keyIsDown(83))  { dy =  this.spd; this.dir = 2; }

        this.moving = dx !== 0 || dy !== 0;
        if (this.moving) this.fr += 0.2;

        // Normalisation diagonale
        if (dx && dy) { dx *= 0.707; dy *= 0.707; }

        // Collisions axes séparés (sliding)
        if (dx !== 0 && !this._hits(this.x + dx, this.y, allSolids)) this.x += dx;
        if (dy !== 0 && !this._hits(this.x, this.y + dy, allSolids)) this.y += dy;

        // Particules de traîne
        if (this.moving && frameCount % 3 === 0) {
            this.particules.push(new TraineParticule(this.x, this.y));
        }
        for (let p of this.particules) p.update();
        this.particules = this.particules.filter(p => !p.dead());
    }

    _hits(nx, ny, allSolids) {
        for (let s of allSolids) {
            if (nx + this.hw > s.x && nx - this.hw < s.x + s.w &&
                ny + this.hh > s.y && ny - this.hh < s.y + s.h) {
                return true;
            }
        }
        return false;
    }

    draw() {
        // Traîne d'abord (derrière le sprite)
        for (let p of this.particules) p.draw();

        const bob = this.moving ? sin(this.fr * 3) * 2 : 0;
        const la  = this.moving ? sin(this.fr * 4) * 7 : 0;

        push();
        translate(this.x, this.y);
        scale(2, 2);

        // ---- Ombre aplatie ----
        noStroke();
        fill(0, 0, 0, 58);
        ellipse(0, 11, 28, 10);

        // ---- Jambes ----
        noStroke();
        fill(40, 80, 160);
        if (this.dir === 1 || this.dir === 3) {
            // Vue de profil : une jambe visible
            ellipse(0, 4 + bob + la * 0.5, 8, 10);
        } else {
            // Vue face/dos : deux jambes
            ellipse(-4, 4 + bob + la,  6, 9);
            ellipse( 4, 4 + bob - la,  6, 9);
        }

        // ---- Corps ----
        fill(0, 180, 220);
        stroke(0, 130, 180);
        strokeWeight(0.5);
        ellipse(0, -2 + bob, 18, 14);

        // ---- Bras ----
        noStroke();
        fill(0, 160, 200);
        if (this.dir === 1) {
            ellipse( 10, -1 + bob + la * 0.4, 6, 8);
        } else if (this.dir === 3) {
            ellipse(-10, -1 + bob - la * 0.4, 6, 8);
        } else {
            ellipse(-10, -1 + bob + la * 0.3, 6, 8);
            ellipse( 10, -1 + bob - la * 0.3, 6, 8);
        }

        // ---- Tête ----
        fill(255, 220, 160);
        stroke(200, 160, 100);
        strokeWeight(0.5);
        ellipse(0, -11 + bob, 14, 13);

        // ---- Casque ----
        fill(0, 100, 160);
        noStroke();
        arc(0, -13 + bob, 14, 12, PI, 0);

        // ---- Visière ----
        if (this.dir !== 0) {
            fill(0, 229, 255, 180);
            arc(0, -11 + bob, 10, 8, PI + 0.3, -0.3);
        }

        pop();
    }
}

// ============================================================
// NiveauIsometrique — Scène principale faux-ISO
// ============================================================
class NiveauIsometrique {

    constructor() {
        // Dimensions du monde en pixels
        this.WORLD_W = 1400;
        this.WORLD_H = 900;

        // Caméra
        this.cam = { x: 0, y: 0 };

        // Entités
        this.joueur    = null;
        this.obstacles = [];
        this.allSolids = [];

        // Étoiles de sol (grille décorative)
        this.sols = [];

        // Initialisation immédiate pour éviter les appels draw() avant setup()
        this.setup();
    }

    setup() {
        Config.selected.scene = SCENE.NIVEAU_ISOMETRIQUE;
        Config.mode.game      = MODE.JEU;

        // ---- Joueur au centre ----
        this.joueur = new JoueurIso(this.WORLD_W / 2, this.WORLD_H / 2);

        // ---- Obstacles / bâtiments ----
        this.obstacles = [
            // Bords invisibles (murs du monde)
            new Obstacle(this.WORLD_W / 2, -20,          this.WORLD_W, 40,  COULEURS.fondScene),
            new Obstacle(this.WORLD_W / 2, this.WORLD_H + 20, this.WORLD_W, 40, COULEURS.fondScene),
            new Obstacle(-20,              this.WORLD_H / 2,  40, this.WORLD_H, COULEURS.fondScene),
            new Obstacle(this.WORLD_W + 20, this.WORLD_H / 2, 40, this.WORLD_H, COULEURS.fondScene),

            // Bâtiments de la planète casino / entrepôt
            new Obstacle(200,  150, 120, 80,  '#0d2a3a'),
            new Obstacle(420,  200, 80,  60,  '#1a2a0d'),
            new Obstacle(700,  100, 150, 100, '#2a0d1a'),
            new Obstacle(950,  180, 100, 70,  '#0d1a2a'),
            new Obstacle(1200, 130, 90,  60,  '#1a0d2a'),

            new Obstacle(150,  500, 100, 80,  '#0d2a1a'),
            new Obstacle(380,  600, 130, 90,  '#2a1a0d'),
            new Obstacle(650,  700, 110, 75,  '#0a1a2a'),
            new Obstacle(900,  650, 95,  65,  '#1a2a0a'),
            new Obstacle(1150, 720, 120, 85,  '#2a0a1a'),

            new Obstacle(300,  350, 60,  60,  '#0d0d2a'),
            new Obstacle(800,  400, 80,  80,  '#2a1a00'),
            new Obstacle(1050, 500, 70,  55,  '#001a2a'),
        ];

        this._rebuildSolids();

        // ---- Dallage de sol ----
        this.sols = [];
        let taille = 80;
        for (let x = 0; x < this.WORLD_W; x += taille) {
            for (let y = 0; y < this.WORLD_H; y += taille) {
                this.sols.push({
                    x, y, w: taille, h: taille,
                    teinte: random(8, 18),
                    accent: random() < 0.05,
                });
            }
        }

        // PNJ et portes
        this.patron = { x: this.WORLD_W / 2, y: this.WORLD_H / 2 - 120 };
        this.portes = {
            gauche : { x: 60, y: this.WORLD_H / 2, scene: SCENE.JEU_RECHERCHE_COLIS },
            droite : { x: this.WORLD_W - 60, y: this.WORLD_H / 2, scene: SCENE.PREPARATION_VAISSEAU },
        };

        // Caméra initialisée sur le joueur
        this.cam.x = this.joueur.x - SCREEN.CENTER.w / 2;
        this.cam.y = this.joueur.y - SCREEN.H / 2;
        this._clampCam();
    }



    _drawHubElements() {
        push();

        // Patron dans le monde isométrique
        noStroke();
        fill(0, 255, 200, 45);
        ellipse(this.patron.x, this.patron.y + 12, 95, 32);
        fill("#ffaa00");
        ellipse(this.patron.x, this.patron.y, 40, 40);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(13);
        text("Patron", this.patron.x, this.patron.y - 34);

        // Portes aux extrémités du hub
        rectMode(CENTER);
        for (const [nom, porte] of Object.entries(this.portes)) {
            const ouverte = Config.progression.porteOuverte === porte.scene;
            const estMission = this._getMissionActuelle() === porte.scene;

            noStroke();
            fill(ouverte ? "#00ff88" : "#33384a");
            rect(porte.x, porte.y, 44, 86, 6);

            stroke(ouverte ? "#00ff88" : "#666a78");
            strokeWeight(2);
            noFill();
            rect(porte.x, porte.y, 54, 98, 8);

            noStroke();
            fill(ouverte ? COULEURS.vert : COULEURS.texteSombre);
            textAlign(CENTER, CENTER);
            textSize(11);
            text(ouverte ? "OUVERTE" : (estMission ? "À DÉBLOQUER" : "FERMÉE"), porte.x, porte.y - 62);
            textSize(10);
            text(porte.scene == SCENE.JEU_RECHERCHE_COLIS ? "Entrepôt" : "Vaisseau", porte.x, porte.y + 62);
        }

        pop();
    }

    _getMissionActuelle() {
        return Config.progression.missions[Config.progression.missionIndex] || null;
    }

    _getDialogueMission(mission) {
        if (mission == SCENE.JEU_RECHERCHE_COLIS) return Dialogue.intro;
        if (mission == SCENE.PREPARATION_VAISSEAU) return Dialogue.preparationVaisseau.debutMission;
        return null;
    }

    _estProche(a, b, distanceMax) {
        return pointsProches(a, b, distanceMax);
    }

    _getDistanceValidationPatron() {
        return Config.setting.distanceValidationPatron || 95;
    }

    _rebuildSolids() {
        this.allSolids = this.obstacles.map(o => o.solid());
    }

    _clampCam() {
        let maxX = Math.max(0, this.WORLD_W - SCREEN.CENTER.w);
        let maxY = Math.max(0, this.WORLD_H - SCREEN.H);
        this.cam.x = constrain(Math.round(this.cam.x), 0, maxX);
        this.cam.y = constrain(Math.round(this.cam.y), 0, maxY);
    }

    _updateCam() {
        let W = SCREEN.CENTER.w;
        let H = SCREEN.H;
        this.cam.x += (this.joueur.x - W / 2 - this.cam.x) * 0.18;
        this.cam.y += (this.joueur.y - H / 2 - this.cam.y) * 0.18;
        this._clampCam();
    }


    draw() {
        // Sécurité si la scène n'est pas encore initialisée
        if (!this.joueur) return;

        // Fond sombre
        background(COULEURS.fond);

        push();
        translate(-this.cam.x, -this.cam.y);

        // ---- Sol dallé ----
        this._dessineSol();

        // ---- Obstacles (tri Y pour pseudo-profondeur) ----
        // On filtre avant de trier : moins d'objets à traiter quand la caméra bouge.
        let visibles = this.obstacles.filter(o =>
            o.y > 0 && o.y < this.WORLD_H &&
            o.x + o.w > this.cam.x - 120 && o.x < this.cam.x + SCREEN.CENTER.w + 120 &&
            o.y + o.h > this.cam.y - 120 && o.y < this.cam.y + SCREEN.H + 120
        );
        visibles.sort((a, b) => a.y - b.y);
        for (let i = 0; i < visibles.length; i++) visibles[i].draw();

        // ---- Joueur ----
        if (Config.mode.game == MODE.JEU) {
            this.joueur.update(this.allSolids);
        } else {
            this.joueur.moving = false;
        }
        this.joueur.draw();
        this._drawHubElements();

        pop();

        // Mise à jour caméra APRÈS translate (coordonnées monde)
        this._updateCam();

        // ---- HUD ----
        this._dessineHUD();
        this._dessineAideInteraction();
        this._dessineDialoguePatron();
    }

    _dessineSol() {
        noStroke();
        for (let s of this.sols) {
            // Frustum culling simple
            if (s.x + s.w < this.cam.x - 20 || s.x > this.cam.x + SCREEN.CENTER.w + 20) continue;
            if (s.y + s.h < this.cam.y - 20 || s.y > this.cam.y + SCREEN.H + 20)        continue;

            fill(s.teinte, s.teinte + 5, s.teinte + 20);
            rect(s.x, s.y, s.w, s.h);

            // Lignes de grille subtiles
            stroke(30, 35, 55, 60);
            strokeWeight(0.5);
            line(s.x, s.y, s.x + s.w, s.y);
            line(s.x, s.y, s.x, s.y + s.h);
            noStroke();

            // Case accent (point lumineux aléatoire)
            if (s.accent) {
                fill(0, 229, 255, 18);
                ellipse(s.x + s.w / 2, s.y + s.h / 2, 30, 12);
            }
        }
    }

    _dessineHUD() {
        // Mini-carte
        let mx = 16, my = 16, mw = 110, mh = 70;
        fill(5, 12, 25, 200);
        stroke(0, 229, 255, 80);
        strokeWeight(1);
        rect(mx, my, mw, mh, 4);

        // Point joueur sur la mini-carte
        let px = map(this.joueur.x, 0, this.WORLD_W, mx, mx + mw);
        let py = map(this.joueur.y, 0, this.WORLD_H, my, my + mh);
        noStroke();
        fill(0, 229, 255);
        ellipse(px, py, 5, 3);

        // Obstacles sur la mini-carte
        fill(50, 80, 120, 120);
        for (let o of this.obstacles) {
            if (o.y <= 0 || o.y >= this.WORLD_H) continue;
            let ox = map(o.x, 0, this.WORLD_W, mx, mx + mw);
            let oy = map(o.y, 0, this.WORLD_H, my, my + mh);
            rect(ox - 2, oy - 1, 4, 2);
        }

        // Label
        fill(COULEURS.texte);
        noStroke();
        textSize(9);
        textAlign(LEFT, BOTTOM);
        text('RADAR', mx + 4, my + mh - 3);

        // Contrôles
        textSize(11);
        textAlign(LEFT, BOTTOM);
        fill(COULEURS.texteSombre);
        text('↑↓←→ / ZQSD', mx, my + mh + 18);
    }


    _dessineAideInteraction() {
        if (Config.mode.game != MODE.JEU) return;

        let message = null;
        if (this._estProche(this.joueur, this.patron, this._getDistanceValidationPatron())) {
            message = '[E] / dites "patron"';
        } else {
            for (const porte of Object.values(this.portes)) {
                if (Config.progression.porteOuverte === porte.scene && this._estProche(this.joueur, porte, Config.setting.distanceValidationPorte)) {
                    message = '[E] / dites "open"';
                    break;
                }
            }
        }

        if (!message) return;

        push();
        let w = 230;
        let h = 34;
        let x = SCREEN.CENTER.w / 2 - w / 2;
        let y = 26;
        noStroke();
        fill(0, 0, 0, 150);
        rect(x, y, w, h, 8);
        stroke(COULEURS.accent + "88");
        strokeWeight(1);
        noFill();
        rect(x, y, w, h, 8);
        noStroke();
        fill(COULEURS.accent);
        textAlign(CENTER, CENTER);
        textSize(14);
        text(message, x + w / 2, y + h / 2);
        pop();
    }

    _dessineDialoguePatron() {
        if (Config.mode.game != MODE.DIALOGUE) return;
        let dialogues = Config.progression.dialogueActif;
        if (!dialogues || Config.currentStep.Dialogue >= dialogues.length) return;

        Config.selected.dialogueLine = dialogues[Config.currentStep.Dialogue];
        AfficherPatron();
        Bulle(
            Config.selected.dialogueLine,
            Config.setting.bullPosition,
            SCREEN.CENTER.w - Config.setting.bullMargin * 2
        );
    }

    lancerDialoguePatron() {
        const mission = this._getMissionActuelle();
        const dialogues = this._getDialogueMission(mission);
        if (!dialogues || dialogues.length === 0) return false;

        // On reste dans le hub : seule l'interface de dialogue passe en MODE.DIALOGUE.
        Config.selected.scene               = SCENE.NIVEAU_ISOMETRIQUE;
        Config.selected.dialogueScene       = dialogues;
        Config.progression.dialogueActif    = dialogues;
        Config.progression.missionDialogue  = mission;
        Config.mode.game                    = MODE.DIALOGUE;
        Config.currentStep.Dialogue         = 0;
        Config.selected.reponse             = 0;
        Config.selected.question            = null;
        Config.selected.dialogueLine        = dialogues[0];
        jouerVoix(dialogues[0]);
        return true;
    }

    finDialoguePatron() {
        const mission = Config.progression.missionDialogue;
        if (!mission) return;

        // La porte est ouverte seulement quand le dialogue du patron est terminé.
        Config.progression.porteOuverte     = mission;
        Config.progression.dialogueActif    = null;
        Config.progression.missionDialogue  = null;
        Config.selected.dialogueLine        = null;
        Config.selected.question            = null;
    }

    _getPorteProcheOuverte() {
        const distanceValidation = Config.setting.distanceValidationPorte || 105;
        for (const porte of Object.values(this.portes)) {
            const ouverte = Config.progression.porteOuverte === porte.scene;
            if (ouverte && this._estProche(this.joueur, porte, distanceValidation)) {
                return porte;
            }
        }
        return null;
    }

    entrerPorteProche() {
        if (Config.mode.game != MODE.JEU) return false;

        const porte = this._getPorteProcheOuverte();
        if (!porte) return false;

        lancerTransition(() => {
            if (porte.scene == SCENE.JEU_RECHERCHE_COLIS) {
                Config.setting.listeScene.jeuRechercheColis.setup();
            } else if (porte.scene == SCENE.PREPARATION_VAISSEAU) {
                Config.setting.listeScene.preparationVaisseau.setup();
            }
        });
        return true;
    }

    interactionPatronProche() {
        if (Config.mode.game != MODE.JEU) return false;
        if (!this._estProche(this.joueur, this.patron, this._getDistanceValidationPatron())) return false;
        return this.lancerDialoguePatron();
    }

    interaction() {
        if (Config.mode.game != MODE.JEU) return false;

        if (this.interactionPatronProche()) return true;

        return this.entrerPorteProche();
    }

}

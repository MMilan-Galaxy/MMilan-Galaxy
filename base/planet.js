// =============================================
// planet.js
// Classe Planet : boucle principale p5.js
// Gère : fond, étoiles, timer, transitions, dispatch des scènes
// Dépend de : constants.js, config.js, utils.js, screen.js
// =============================================

class Planet {

    constructor() {
        this.etoiles        = [];
        this.etoilesGauche  = [];
        this.etoilesDroite  = [];
        this.nebuleuses     = [];
    }

    setup() {
        Config.setting.screenSizeX = width;
        Config.setting.screenSizeY = height;
        Config.setting.timerX      = SCREEN.CENTER.w - Config.setting.timerMargin - 10;
        Config.setting.timerY      = Config.setting.timerMargin;

        textFont("monospace");

        // ---- Étoiles zone centrale ----
        let qualiteDecor = constrain(Config.setting.facteurQualiteDecor || 1, 0.35, 1);
        for (let i = 0; i < Math.floor(120 * qualiteDecor); i++) {
            this.etoiles.push({
                x          : random(SCREEN.CENTER.w),
                y          : random(Config.setting.screenSizeY),
                taille     : random(0.5, 2.5),
                luminosite : random(80, 255),
                vitesse    : random(0.2, 0.8),
            });
        }

        // ---- Étoiles écrans latéraux (plus denses pour l'ambiance) ----
        for (let i = 0; i < Math.floor(180 * qualiteDecor); i++) {
            this.etoilesGauche.push({
                x          : random(SCREEN.LEFT.w),
                y          : random(Config.setting.screenSizeY),
                taille     : random(0.3, 2.0),
                luminosite : random(40, 180),
                vitesse    : random(0.1, 0.5),
            });
            this.etoilesDroite.push({
                x          : random(SCREEN.RIGHT.w),
                y          : random(Config.setting.screenSizeY),
                taille     : random(0.3, 2.0),
                luminosite : random(40, 180),
                vitesse    : random(0.1, 0.5),
            });
        }

        // ---- Nébuleuses décoratives pour les écrans latéraux ----
        for (let i = 0; i < 4; i++) {
            this.nebuleuses.push({
                x     : random(SCREEN.LEFT.w),
                y     : random(Config.setting.screenSizeY),
                r     : random(80, 200),
                r2    : random(0, 255),
                g     : random(0, 120),
                b     : random(100, 255),
                alpha : random(8, 25),
            });
        }

        // Instanciation des scènes
        let s = Config.setting.listeScene;
        s.intro               = new Intro();
        s.infoUtilisationJeu   = new InfoUtilisationJeu();
        s.jeuRechercheColis   = new JeuRechercheColis(3, Config.setting.listeColis);
        s.preparationVaisseau = new PreparationVaisseau();
        s.demarageVaisseau    = new DemarageVaisseau();
        s.niveauIsometrique   = new NiveauIsometrique();

        // Premiere scene : information d'utilisation.
        s.infoUtilisationJeu.setup();
        Config.selected.dialogueScene = null;
    }

    draw() {
        // bullPosition en coordonnées LOCALES à la zone centrale (0→1920).
        // On évite createVector() à chaque frame pour limiter les allocations.
        let bullH = tailleElement("bulle", "hauteur", Config.setting.bullSize);
        if (!Config.setting.bullPosition) Config.setting.bullPosition = { x: 0, y: 0 };
        Config.setting.bullPosition.x = Config.setting.bullMargin;
        Config.setting.bullPosition.y = SCREEN.H - Config.setting.bullMargin * 2 - bullH;

        // ---- FOND GLOBAL (couvre les 5760px) ----
        this._dessineFondGlobal();

        // ---- ÉCRAN GAUCHE : ambiance/décor ou cockpit ou zone entrepôt ----
        dessineEcranGauche(() => {
            if (Config.selected.scene == SCENE.PREPARATION_VAISSEAU || Config.selected.scene == SCENE.DEMARAGE_VAISSEAU) {
                this._dessineEcranCockpitGauche();
            } else if (Config.selected.scene == SCENE.JEU_RECHERCHE_COLIS) {
                let jeu = Config.setting.listeScene.jeuRechercheColis;
                if (jeu && jeu.pieceSelectionnee > 0) {
                    jeu.dessineZoneLaterale(jeu.pieceSelectionnee - 1, "gauche");
                } else {
                    this._dessineDecorLateral(this.etoilesGauche, "gauche");
                }
            } else {
                this._dessineDecorLateral(this.etoilesGauche, "gauche");
            }
        });

        // ---- ÉCRAN DROIT : continuité du décor ou cockpit ou zone entrepôt ----
        dessineEcranDroit(() => {
            if (Config.selected.scene == SCENE.PREPARATION_VAISSEAU || Config.selected.scene == SCENE.DEMARAGE_VAISSEAU) {
                this._dessineEcranCockpitDroit();
            } else if (Config.selected.scene == SCENE.JEU_RECHERCHE_COLIS) {
                let jeu = Config.setting.listeScene.jeuRechercheColis;
                if (jeu && jeu.pieceSelectionnee < jeu.nombrePiece - 1) {
                    jeu.dessineZoneLaterale(jeu.pieceSelectionnee + 1, "droit");
                } else {
                    this._dessineDecorLateral(this.etoilesDroite, "droit");
                }
            } else {
                this._dessineDecorLateral(this.etoilesDroite, "droit");
            }
        });

        // ---- ÉCRAN CENTRAL : gameplay complet ----
        dessineEcranCentre(() => {
            this._dessineEtoilesCentre();
            this._dessineGradientBasCentre();

            // Dispatch vers la scène active
            let s = Config.setting.listeScene;
            if      (Config.selected.scene == SCENE.INTRO)                s.intro.draw();
            else if (Config.selected.scene == SCENE.INFO_UTILISATION_JEU) s.infoUtilisationJeu.draw();
            else if (Config.selected.scene == SCENE.JEU_RECHERCHE_COLIS)  s.jeuRechercheColis.draw();
            else if (Config.selected.scene == SCENE.PREPARATION_VAISSEAU) s.preparationVaisseau.draw();
            else if (Config.selected.scene == SCENE.DEMARAGE_VAISSEAU)    s.demarageVaisseau.draw();
            else if (Config.selected.scene == SCENE.NIVEAU_ISOMETRIQUE)   s.niveauIsometrique.draw();

            // HUD vocal — micro actif sur toutes les scènes
            VoixColis.dessineHUD();

            // HUD timer (dans le coin haut droit de la zone centrale)
            this._dessineTimer();

            // Squelette des mains (confiné à la zone centrale).
            // Les connexions sont mises en cache au chargement du modèle pour éviter getConnections() à chaque frame.
            if (Config.setting.afficherSqueletteMain && Config.variable.connexionsMain && Config.variable.hands) {
                for (let i = 0; i < Config.variable.hands.length; i++) {
                    afficherMain(Config.variable.hands[i], Config.variable.connexionsMain);
                }
            }

            // ---- Aperçu caméra : désactivé par défaut pour réduire la latence sur 5760×1200 ----
            if (Config.setting.afficherApercuCamera) this._dessineApercuCamera();
        });

        // ---- TRANSITION (overlay global plein écran) ----
        this._dessineTransition();

        // ---- GUIDES DE DÉVELOPPEMENT (décommenter pour debug) ----
        // dessineGuides();
    }

    // ---- Fond spatial unifié sur toute la largeur 5760px ----
    _dessineFondGlobal() {
        background(COULEURS.fond);
    }

    // ---- Aperçu caméra en bas à gauche + pastille de statut détection ----
    _dessineApercuCamera() {
        let vid   = Config.variable.video;
        if (!vid) return;

        let pw    = 180;   // largeur de la preview
        let ph    = 135;   // hauteur (ratio 4:3)
        let px    = 12;
        let py    = SCREEN.H - ph - 12;
        let mainOk = Config.variable.hands && Config.variable.hands.length > 0;

        push();

        // Bordure colorée selon état détection
        let borderCol = mainOk ? COULEURS.vert : COULEURS.texteSombre + "88";
        stroke(borderCol);
        strokeWeight(mainOk ? 2.5 : 1.5);
        noFill();
        rect(px - 2, py - 2, pw + 4, ph + 4, 6);

        // Image caméra (miroir horizontal pour que l'utilisateur se voie naturellement)
        push();
        translate(px + pw, py); // on translate au coin droit
        scale(-1, 1);           // miroir
        image(vid, 0, 0, pw, ph);
        pop();

        // Overlay sombre léger
        noStroke();
        fill(0, 0, 0, 40);
        rect(px, py, pw, ph);

        // Pastille état
        let dotX = px + pw - 10;
        let dotY = py + 10;
        // Halo pulsant si main détectée
        if (mainOk) {
            fill(COULEURS.vert + "55");
            noStroke();
            ellipse(dotX, dotY, 18 + sin(frameCount * 0.15) * 4);
        }
        fill(mainOk ? COULEURS.vert : COULEURS.rouge);
        noStroke();
        ellipse(dotX, dotY, 10);

        // Label
        fill(mainOk ? COULEURS.vert : COULEURS.texteSombre);
        noStroke();
        textSize(9);
        textAlign(LEFT, BOTTOM);
        text(mainOk ? "✋ Main détectée" : "🖐 Montrez votre main", px + 4, py + ph - 4);

        pop();
    }

    // ---- Gradient bas uniquement sur la zone centrale ----
    _dessineGradientBasCentre() {
        noStroke();
        for (let i = 0; i < 6; i++) {
            fill(0, 30, 60, map(i, 0, 6, 0, 60));
            let h = map(i, 0, 6, SCREEN.H, SCREEN.H * 0.6);
            rect(0, h, SCREEN.CENTER.w, SCREEN.H - h);
        }
    }

    // ---- Étoiles scintillantes — zone centrale ----
    _dessineEtoilesCentre() {
        noStroke();
        for (let i = 0; i < this.etoiles.length; i++) {
            let e = this.etoiles[i];
            let lum = e.luminosite + sin(frameCount * e.vitesse) * 30;
            fill(255, 255, 255, lum);
            ellipse(e.x, e.y, e.taille);
        }
    }

    // ---- Décor latéral : étoiles + nébuleuses + planète décorative ----
    _dessineDecorLateral(listeEtoiles, cote) {
        // Gradient de fond latéral (légèrement plus sombre que le centre)
        noStroke();
        for (let i = 0; i < 6; i++) {
            fill(0, 20, 45, map(i, 0, 6, 0, 50));
            let h = map(i, 0, 6, SCREEN.H, SCREEN.H * 0.5);
            rect(0, h, SCREEN.LEFT.w, SCREEN.H - h);
        }

        // Nébuleuses (uniquement côté gauche, miroir côté droit pour la symétrie)
        this.nebuleuses.forEach(n => {
            let nx = cote === "droit" ? SCREEN.LEFT.w - n.x : n.x;
            noStroke();
            for (let r = n.r; r > 0; r -= 15) {
                fill(n.r2, n.g, n.b, map(r, 0, n.r, n.alpha * 2, 0));
                ellipse(nx, n.y, r * 2);
            }
        });

        // Étoiles latérales scintillantes (moins lumineuses = périphérie)
        noStroke();
        listeEtoiles.forEach(e => {
            let lum = e.luminosite + sin(frameCount * e.vitesse + e.x) * 20;
            fill(200, 210, 255, lum);
            ellipse(e.x, e.y, e.taille);
        });

        // Planète décorative (côté gauche uniquement, visible en périphérie)
        if (cote === "gauche") {
            this._dessinePlaneteDecor(SCREEN.LEFT.w * 0.75, SCREEN.H * 0.35, 140, [0, 80, 160]);
        } else {
            this._dessinePlaneteDecor(SCREEN.RIGHT.w * 0.25, SCREEN.H * 0.6, 100, [80, 30, 120]);
        }

        // Vignette sur les bords extérieurs (fondu vers le bord)
        let vignetteW = 200;
        let fromEdge  = cote === "gauche" ? 0 : SCREEN.RIGHT.w - vignetteW;
        for (let i = 0; i < vignetteW; i++) {
            fill(10, 10, 26, map(i, 0, vignetteW, 180, 0));
            rect(fromEdge + i, 0, 1, SCREEN.H);
        }
    }

    // ---- Planète décorative générique ----
    _dessinePlaneteDecor(cx, cy, rayon, couleurBase) {
        push();
        let [r, g, b] = couleurBase;
        noStroke();

        // Halo atmosphérique
        for (let rad = rayon * 1.6; rad > 0; rad -= 8) {
            fill(r, g, b, map(rad, 0, rayon * 1.6, 60, 0));
            ellipse(cx, cy, rad * 2);
        }

        // Corps
        fill(r, g, b);
        ellipse(cx, cy, rayon * 2);

        // Stries de surface
        stroke(r + 20, g + 30, b + 40);
        strokeWeight(2);
        noFill();
        for (let i = -2; i <= 2; i++) {
            arc(cx, cy + i * (rayon * 0.25), rayon * 2, rayon * 0.7, 0, PI);
        }
        pop();
    }

    // ---- HUD Timer (coin haut droit de la zone centrale) ----
    _dessineTimer() {
        if (Config.variable.timerEtat !== "on") return;

        Config.variable.temps = floor(frameCount / 60);
        if (Config.variable.tempsDebut == 0) Config.variable.tempsDebut = Config.variable.temps;

        let timerReverse = Config.setting.time - Config.variable.temps + Config.variable.tempsDebut;
        let seconde      = timerReverse % 60;
        let minute       = floor(timerReverse / 60);
        let urgence      = timerReverse < 60;

        push();
        let tw = 130, th = 44;
        let tx = Config.setting.timerX - tw;
        let ty = Config.setting.timerY - 30;

        fill(COULEURS.hud + "cc"); noStroke();
        rect(tx - 10, ty, tw + 20, th, 8);

        stroke(urgence ? COULEURS.rouge : COULEURS.accent);
        strokeWeight(1.5); noFill();
        rect(tx - 10, ty, tw + 20, th, 8);

        noStroke();
        fill(urgence ? COULEURS.rouge : COULEURS.accent);
        textSize(Config.setting.timerSize);
        textAlign(RIGHT, CENTER);
        text(nf(minute, 2) + " : " + nf(seconde, 2), Config.setting.timerX, ty + th / 2);
        pop();
    }

    // ---- Fondu de transition entre scènes (plein canvas = 5760px) ----
    _dessineTransition() {
        let t = Config.transition;
        if (!t.active) return;

        if (t.direction == "in") {
            t.alpha += t.vitesse;
            if (t.alpha >= 255) {
                t.alpha     = 255;
                t.direction = "out";
                if (t.callback) t.callback();
            }
        } else {
            t.alpha -= t.vitesse;
            if (t.alpha <= 0) {
                t.alpha  = 0;
                t.active = false;
            }
        }

        noStroke();
        fill(0, 0, 10, t.alpha);
        rect(0, 0, Config.setting.screenSizeX, Config.setting.screenSizeY);
    }

    // =========================================
    // ÉCRANS COCKPIT LATÉRAUX (scène vaisseau)
    // =========================================

    _fondCockpit(sw, sh) {
        noStroke();
        for (let y = 0; y < sh; y += 4) {
            fill(lerpColor(color(4, 7, 16), color(8, 14, 28), y / sh));
            rect(0, y, sw, 4);
        }
        stroke(15, 28, 55, 70);
        strokeWeight(1);
        for (let x = 0; x < sw; x += 60) line(x, 0, x, sh);
        for (let y = 0; y < sh; y += 60) line(0, y, sw, y);
        noStroke();
        for (let i = 0; i < 80; i++) {
            fill(4, 7, 16, map(i, 0, 80, 0, 160));
            rect(0, 0, i, sh);
            rect(sw - i, 0, i, sh);
        }
    }

    _panneauHUD(x, y, w, h, titre, couleur) {
        noStroke();
        fill(6, 12, 26, 220);
        rect(x, y, w, h, 8);
        stroke(couleur || COULEURS.accent);
        strokeWeight(1.5);
        noFill();
        rect(x, y, w, h, 8);
        if (titre) {
            noStroke();
            fill(couleur || COULEURS.accent);
            textSize(9);
            textAlign(LEFT, TOP);
            text(titre, x + 10, y + 7);
            stroke((couleur || COULEURS.accent) + "33");
            strokeWeight(1);
            line(x + 8, y + 20, x + w - 8, y + 20);
        }
    }

    _dessineEcranCockpitGauche() {
        let sw = SCREEN.LEFT.w;
        let sh = SCREEN.H;
        let v = Config.setting.listeScene.preparationVaisseau;
        if (!v) return;
        let t = v.telemetrie;

        this._fondCockpit(sw, sh);

        // ---- Radar tournant ----
        let rcx = sw * 0.5;
        let rcy = sh * 0.28;
        let rr  = 120;
        this._panneauHUD(rcx - rr - 20, rcy - rr - 30, (rr + 20) * 2, (rr + 20) * 2 + 20, "RADAR PROXIMITE", COULEURS.vert);

        push();
        translate(rcx, rcy);
        noFill();
        for (let i = 1; i <= 4; i++) {
            stroke(COULEURS.vert + (i == 4 ? "55" : "22"));
            strokeWeight(1);
            ellipse(0, 0, rr * (i / 4) * 2, rr * (i / 4) * 2);
        }
        stroke(COULEURS.vert + "33");
        strokeWeight(1);
        line(-rr, 0, rr, 0);
        line(0, -rr, 0, rr);
        let scanAngle = v.radarAngle;
        for (let i = 0; i < 30; i++) {
            let a = scanAngle - i * 0.04;
            fill(0, 220, 100, map(i, 0, 30, 80, 0));
            noStroke();
            arc(0, 0, rr * 2, rr * 2, a - 0.04, a);
        }
        stroke(COULEURS.vert); strokeWeight(1.5);
        line(0, 0, cos(scanAngle) * rr, sin(scanAngle) * rr);
        v.radarBlips.forEach(b => {
            let bx = cos(b.angle) * b.dist * rr;
            let by = sin(b.angle) * b.dist * rr;
            let diff = (v.radarAngle - b.angle) % TWO_PI;
            let age  = diff < 0 ? diff + TWO_PI : diff;
            let al   = max(0, 255 - age * 60);
            noStroke();
            fill(0, 255, 120, al);
            ellipse(bx, by, b.taille, b.taille);
            if (age < 0.3) { fill(0, 255, 120, 80); ellipse(bx, by, b.taille * 3, b.taille * 3); }
        });
        noStroke(); fill(0, 255, 255); ellipse(0, 0, 8, 8);
        fill(0, 255, 255, 40); ellipse(0, 0, 18, 18);
        pop();

        // ---- Graphique vitesse ----
        let gx = 30, gy = sh * 0.60, gw = sw - 60, gh = 100;
        this._panneauHUD(gx, gy, gw, gh, "VITESSE (km/h)", COULEURS.accent);
        let log = v.graphLog;
        if (log.length > 1) {
            noStroke(); fill(0, 180, 255, 20);
            beginShape();
            vertex(gx + 8, gy + gh - 12);
            for (let i = 0; i < log.length; i++) {
                vertex(map(i, 0, log.length - 1, gx + 8, gx + gw - 8), map(log[i], 80, 200, gy + gh - 12, gy + 26));
            }
            vertex(gx + gw - 8, gy + gh - 12);
            endShape(CLOSE);
            stroke(COULEURS.accent); strokeWeight(1.5); noFill();
            beginShape();
            for (let i = 0; i < log.length; i++) {
                vertex(map(i, 0, log.length - 1, gx + 8, gx + gw - 8), map(log[i], 80, 200, gy + gh - 12, gy + 26));
            }
            endShape();
            noStroke(); fill(COULEURS.accent); textSize(16); textAlign(RIGHT, TOP);
            text(floor(log[log.length - 1]) + " km/h", gx + gw - 8, gy + 26);
        }

        // ---- Jauge carburant ----
        let fx = 30, fy = sh * 0.80, fw = sw - 60;
        this._panneauHUD(fx, fy, fw, 70, "CARBURANT", COULEURS.accentChaud);
        let ess = v.essence;
        let barW = fw - 20, barX = fx + 10, barY = fy + 30;
        noStroke(); fill(12, 8, 3); rect(barX, barY, barW, 16, 4);
        for (let s = 0; s < 20; s++) {
            let sx = barX + (barW / 20) * s;
            let sw2 = barW / 20 - 2;
            if ((barW / 20) * s < map(ess, 0, 100, 0, barW)) {
                fill(lerpColor(color(255, 80, 0), color(255, 210, 0), s / 20));
            } else { fill(20, 14, 5); }
            rect(sx, barY, sw2, 16, 2);
        }
        stroke(COULEURS.accentChaud); strokeWeight(1); noFill(); rect(barX, barY, barW, 16, 4);
        noStroke(); fill(255); textSize(11); textAlign(CENTER, CENTER); text(floor(ess) + " %", fx + fw / 2, barY + 8);
    }

    _dessineEcranCockpitDroit() {
        let sw = SCREEN.RIGHT.w;
        let sh = SCREEN.H;
        let v = Config.setting.listeScene.preparationVaisseau;
        if (!v) return;
        let t = v.telemetrie;

        this._fondCockpit(sw, sh);

        // ---- Boussole cap ----
        let ccx = sw * 0.5, ccy = sh * 0.18;
        this._panneauHUD(ccx - 130, ccy - 18, 260, 62, "NAVIGATION - CAP", COULEURS.accent);
        let cap = floor(t.cap);
        let labels = ["N","NE","E","SE","S","SO","O","NO"];
        let degs   = [0, 45, 90, 135, 180, 225, 270, 315];
        for (let i = 0; i < labels.length; i++) {
            let dx = map(((degs[i] - cap + 360) % 360), 0, 360, -180, 180);
            if (abs(dx) < 120) {
                let al = map(abs(dx), 0, 120, 255, 0);
                noStroke();
                fill(0, 229, 255, al);
                textSize(i % 2 == 0 ? 14 : 11); textAlign(CENTER, CENTER);
                text(labels[i], ccx + dx, ccy + 20);
            }
        }
        fill(COULEURS.rouge); noStroke();
        triangle(ccx, ccy + 8, ccx - 6, ccy + 24, ccx + 6, ccy + 24);
        fill(255); textSize(11); textAlign(CENTER, TOP); text(nf(cap, 3) + "°", ccx, ccy + 30);

        // ---- Métriques ----
        let metriques = [
            { label: "ALTITUDE",    valeur: floor(t.altitude) + " m",         couleur: COULEURS.accent, y: sh * 0.32 },
            { label: "TEMPERATURE", valeur: nf(t.temperature, 2, 1) + " C",   couleur: "#00ffcc",       y: sh * 0.46 },
            { label: "PRESSION",    valeur: nf(t.pression, 1, 3) + " bar",    couleur: "#cc88ff",       y: sh * 0.60 },
        ];
        metriques.forEach(m => {
            let mw = sw - 60, mh = 72;
            this._panneauHUD(30, m.y, mw, mh, m.label, m.couleur);
            let bW = mw - 20, bX = 40, bY = m.y + 44;
            noStroke(); fill(8, 12, 24); rect(bX, bY, bW, 12, 4);
            let ratio = 0.5 + sin(frameCount * 0.02 + m.y) * 0.15;
            fill(m.couleur); rect(bX, bY, bW * ratio, 12, 4);
            stroke(m.couleur + "55"); strokeWeight(1); noFill(); rect(bX, bY, bW, 12, 4);
            noStroke(); fill(255); textSize(20); textAlign(CENTER, CENTER);
            text(m.valeur, 30 + mw / 2, m.y + 30);
        });

        // ---- Check-list systèmes ----
        let chy = sh * 0.77, chw = sw - 60;
        this._panneauHUD(30, chy, chw, 120, "SYSTEMES", COULEURS.vert);
        let systemes = [
            { label: "Propulsion", ok: true },
            { label: "Boucliers",  ok: true },
            { label: "Navigation", ok: true },
            { label: "Freins",     ok: v.tacheFaites.includes("Freins")  },
            { label: "Carburant",  ok: v.tacheFaites.includes("Essence") },
        ];
        systemes.forEach((s, i) => {
            let col2 = i % 2 === 0;
            let sx  = col2 ? 40 : sw / 2 + 10;
            let sy  = chy + 26 + floor(i / 2) * 22;
            noStroke(); fill(s.ok ? COULEURS.vert : COULEURS.rouge); ellipse(sx, sy + 7, 8, 8);
            fill(s.ok ? COULEURS.vert : COULEURS.texteSombre); textSize(11); textAlign(LEFT, CENTER);
            text(s.label, sx + 12, sy + 7);
        });
        let toutOk = v.tacheFaites.includes("Essence") && v.tacheFaites.includes("Freins");
        let sy2 = chy + 98;
        noStroke(); fill(toutOk ? COULEURS.vert + "22" : COULEURS.rouge + "11");
        rect(38, sy2 - 4, chw - 16, 18, 4);
        fill(toutOk ? COULEURS.vert : COULEURS.rouge);
        textSize(11); textAlign(CENTER, CENTER);
        text(toutOk ? "DECOLLAGE AUTORISE" : "EN ATTENTE DE VALIDATION", 30 + chw / 2, sy2 + 5);
    }
}

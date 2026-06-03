// =============================================
// scene_vaisseau.js  —  v2 COCKPIT STYLISÉ
// Scène préparation vaisseau : essence, freins, cockpit
// Décor : hangar industriel + vaisseau sci-fi vue de côté
// Dépend de : constants.js, config.js, dialogues.js, utils.js, ui.js, screen.js
// =============================================

class PreparationVaisseau {

    constructor() {
        this.essence      = 0;
        this.essenceMax   = 100;
        this.freinActif   = true;
        this.zone         = "cokpit";
        this.signaux      = [];
        this.tacheFaites  = [];
        this.debitEssence = 0.4;
        this.prixEssence  = 2.50;
        this.prixTotal    = 0;

        // Frein : 0 = haut/libéré, 1 = bas/engagé
        this.freinCurseurRatio = 0.78;
        this._freinMainActive  = false;
        this._freinMainMilieu  = null;
        this._freinMainAccroche = false;
        this._freinDistanceActuelle = 9999;
        this._freinPointPouce = null;
        this._freinPointMajeur = null;

        // Animation de fin de préparation : entrée dans le vaisseau
        this._animationEntreeActive = false;
        this._animationEntreeStart  = 0;
        this._transitionDemarageLancee = false;

        // SFX
        this._essenceFullJouee = false;

        // Paramètres du vaisseau (coords locales zone centrale 0→1920)
        this.vaisseau = {
            cx : SCREEN.CENTER.w * 0.5,
            cy : SCREEN.H * 0.52,
            w  : 780,
            h  : 180,
        };

        // Zone moteur/réservoir cliquable
        this.zoneMoteur = { x: 0, y: 0, w: 0, h: 0 };

        // Données radar animées pour les écrans latéraux (accédées depuis planet.js)
        this.radarAngle   = 0;
        this.radarBlips   = this._genererBlips(6);
        this.telemetrie   = {
            vitesse     : 0,
            altitude    : 8420,
            temperature : 22,
            pression    : 1.013,
            cap         : 237,
        };
        this.graphLog     = [];  // historique vitesse pour graph
        this.alertes      = [];
        this._frameAlerte = 0;
    }

    _genererBlips(n) {
        let blips = [];
        for (let i = 0; i < n; i++) {
            blips.push({
                angle  : random(TWO_PI),
                dist   : random(0.2, 0.9),
                label  : random(["OBJ-" + floor(random(100, 999)), "DEBRIS", "SONDE", "BALISE"]),
                taille : random(3, 7),
                flash  : random(30, 90),
            });
        }
        return blips;
    }

    // ---- Appelé lors du changement de scène vers le vaisseau ----
    setup() {
        Config.selected.scene         = SCENE.PREPARATION_VAISSEAU;
        Config.selected.dialogueScene = null;
        Config.mode.game              = MODE.JEU;
        Config.currentStep.Dialogue   = 0;
        Config.selected.dialogueLine  = null;
        Config.selected.question      = null;
        Config.selected.screen        = 0;
        this.zone                     = "cokpit";
        this.essence                  = 0;
        this.prixTotal                = 0;
        this.freinActif               = true;
        this.freinCurseurRatio        = 0.78;
        this._freinMainActive         = false;
        this._freinMainMilieu         = null;
        this._freinMainAccroche       = false;
        this._freinDistanceActuelle   = 9999;
        this._freinPointPouce         = null;
        this._freinPointMajeur        = null;
        this.tacheFaites              = [];
        Config.etat.essenceCoule      = false;
        this._missionFinie            = false;
        this._animationEntreeActive   = false;
        this._transitionDemarageLancee = false;
        // Les dialogues du patron se jouent maintenant dans la scène isométrique.
        // Ici, on lance directement le mini-jeu.
    }

    draw() {
        // Mise à jour des données live
        this._updateTelemetrie();

        // Le hangar et le vaisseau sont toujours visibles en fond
        this._dessineHangar();
        this._dessineVaisseau();

        if      (this.zone == "cokpit")  this._affichageCokpit();
        else if (this.zone == "essence") this._affichageEssence();
        else if (this.zone == "frein")   this._affichageFrein();

        // Toutes les tâches terminées → animation d'entrée dans le vaisseau,
        // puis passage à la scène "demarageVaisseau".
        if (this.tacheFaites.includes("Essence") && this.tacheFaites.includes("Freins") && !this._missionFinie) {
            this._demarrerAnimationEntreeVaisseau();
        }

        if (this._animationEntreeActive) {
            this._dessineAnimationEntreeVaisseau();
            this._updateAnimationEntreeVaisseau();
        }

        // Dialogue par-dessus
        if (Config.mode.game == MODE.DIALOGUE) {
            let dialogues = Config.selected.dialogueScene && Config.selected.dialogueScene.debutMission;
            if (dialogues && Config.currentStep.Dialogue < dialogues.length) {
                Config.selected.dialogueLine = dialogues[Config.currentStep.Dialogue];
                AfficherPatron();
                Bulle(
                    Config.selected.dialogueLine,
                    Config.setting.bullPosition,
                    SCREEN.CENTER.w - Config.setting.bullMargin * 2
                );
            }
        }
    }

    _demarrerAnimationEntreeVaisseau() {
        this._missionFinie = true;
        this.zone = "cokpit";
        Config.etat.essenceCoule = false;

        let sonPetrole = Config.BanqueAudio["petrole"];
        if (sonPetrole && sonPetrole.isPlaying()) sonPetrole.stop();

        this._animationEntreeActive = true;
        this._animationEntreeStart = millis();
        this._transitionDemarageLancee = false;
    }

    sortirVersCockpit() {
        this.zone = "cokpit";
        Config.etat.essenceCoule = false;

        let sonPetrole = Config.BanqueAudio["petrole"];
        if (sonPetrole && sonPetrole.isPlaying()) sonPetrole.stop();

        this._freinMainActive = false;
        this._freinMainMilieu = null;
        this._freinMainAccroche = false;
        this._freinDistanceActuelle = 9999;
        this._freinPointPouce = null;
        this._freinPointMajeur = null;
    }

    _updateAnimationEntreeVaisseau() {
        let duree = Config.setting.dureeAnimationEntreeVaisseauMs || 1800;
        let t = constrain((millis() - this._animationEntreeStart) / duree, 0, 1);

        if (t >= 1 && !this._transitionDemarageLancee) {
            this._transitionDemarageLancee = true;
            lancerTransition(() => {
                Config.progression.missionIndex = 2;
                Config.progression.porteOuverte = null;
                Config.setting.listeScene.demarageVaisseau.setup();
            });
        }
    }

    _dessineAnimationEntreeVaisseau() {
        let sw = SCREEN.CENTER.w;
        let sh = SCREEN.H;
        let duree = Config.setting.dureeAnimationEntreeVaisseauMs || 2600;
        let t = constrain((millis() - this._animationEntreeStart) / duree, 0, 1);
        let ease = t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2;

        push();

        // Cinématique : le hangar s'assombrit, le cockpit s'ouvre, puis zoom/fondu.
        noStroke();
        fill(0, 0, 0, map(ease, 0, 1, 80, 190));
        rect(0, 0, sw, sh);

        let start = { x: sw * 0.15, y: sh * 0.78 };
        let end   = {
            x: this.vaisseau.cx + this.vaisseau.w * 0.20,
            y: this.vaisseau.cy - this.vaisseau.h * 0.42,
        };

        // Halo cockpit + porte qui s'ouvre.
        let ouverture = constrain(ease * 1.25, 0, 1);
        let halo = 65 + sin(frameCount * 0.22) * 12 + ouverture * 120;
        noStroke();
        for (let r = 120; r > 0; r -= 16) {
            fill(0, 229, 255, map(r, 0, 120, 55 * ouverture, 0));
            ellipse(end.x, end.y, halo + r, halo * 0.66 + r * 0.35);
        }
        stroke(COULEURS.accent);
        strokeWeight(2.5);
        noFill();
        arc(end.x, end.y, 160 + ouverture * 60, 100 + ouverture * 35, PI + 0.14, TWO_PI - 0.14);
        line(end.x - 70 * ouverture, end.y + 18, end.x - 15, end.y - 34 * ouverture);
        line(end.x + 70 * ouverture, end.y + 18, end.x + 15, end.y - 34 * ouverture);

        // Personnage réutilisable.
        if (typeof PersonnageVisuel !== "undefined") {
            PersonnageVisuel.dessinerEntreeVaisseau(start, end, ease, {
                hauteurArc: 46,
                scaleStart: 1.05,
                scaleEnd: 0.46,
            });
        } else {
            // Fallback sécurité si le fichier personnage.js n'est pas chargé.
            let px = lerp(start.x, end.x, ease);
            let py = lerp(start.y, end.y, ease) - sin(ease * PI) * 46;
            noStroke();
            fill(COULEURS.vert + "33");
            ellipse(px, py + 18, 70, 70);
            fill(COULEURS.vert);
            ellipse(px, py - 10, 22, 22);
            stroke(COULEURS.vert);
            strokeWeight(4);
            line(px, py + 2, px, py + 42);
            line(px, py + 14, px - 20, py + 32);
            line(px, py + 14, px + 20, py + 32);
            line(px, py + 42, px - 18, py + 68);
            line(px, py + 42, px + 18, py + 68);
        }

        // Effet de fermeture/zoom final dans le cockpit.
        if (ease > 0.72) {
            let z = map(ease, 0.72, 1, 0, 1);
            noStroke();
            fill(0, 229, 255, 22 * z);
            rect(0, 0, sw, sh);
            fill(0, 0, 0, map(z, 0, 1, 0, 210));
            rect(0, 0, sw, sh);
            fill(COULEURS.accent);
            textAlign(CENTER, CENTER);
            textSize(18 + z * 8);
            text("FERMETURE DU SAS", sw / 2, sh * 0.48);
            stroke(COULEURS.accent);
            strokeWeight(2);
            noFill();
            rect(sw / 2 - 170, sh * 0.52, 340, 16, 8);
            noStroke();
            fill(COULEURS.vert);
            rect(sw / 2 - 166, sh * 0.52 + 4, 332 * z, 8, 5);
        }

        // Bandeau info.
        noStroke();
        fill(0, 0, 0, 185);
        rect(sw / 2 - 285, 34, 570, 52, 12);
        stroke(COULEURS.vert);
        strokeWeight(1.5);
        noFill();
        rect(sw / 2 - 285, 34, 570, 52, 12);
        noStroke();
        fill(COULEURS.vert);
        textAlign(CENTER, CENTER);
        textSize(18);
        text("✓ Préparation terminée — entrée dans le vaisseau", sw / 2, 60);

        pop();
    }

    _updateTelemetrie() {
        this.radarAngle += 0.012;
        let t = this.telemetrie;
        t.vitesse     = 120 + sin(frameCount * 0.03) * 18 + noise(frameCount * 0.01) * 30;
        t.altitude    = 8420 + sin(frameCount * 0.007) * 200;
        t.temperature = 22   + sin(frameCount * 0.04) * 3;
        t.pression    = 1.013 + sin(frameCount * 0.02) * 0.04;
        t.cap         = (t.cap + 0.05) % 360;

        // Log pour graphique glissant
        if (frameCount % 4 === 0) {
            this.graphLog.push(t.vitesse);
            if (this.graphLog.length > 80) this.graphLog.shift();
        }

        // Alertes pulsantes éventuelles
        this._frameAlerte++;
        if (!this.tacheFaites.includes("Essence") && this._frameAlerte % 180 === 0) {
            this.alertes = [{ msg: "⚠ RÉSERVOIR BAS", couleur: COULEURS.accentChaud }];
            setTimeout(() => { this.alertes = []; }, 3000);
        }
    }

    addEssence() {
        if (this.essence + this.debitEssence < this.essenceMax) {
            this.essence   += this.debitEssence;
            this.prixTotal += this.prixEssence * this.debitEssence;
        } else {
            this.essence = this.essenceMax;
            if (!this.tacheFaites.includes("Essence")) this.tacheFaites.push("Essence");
        }
    }

    updateEssence() {
        let pince   = this._isPincementDetecte();
        let posMain = this._getMainPos();
        if (pince && posMain) {
            let z = this.zoneMoteur;
            let proche = posMain.x > z.x - 80 && posMain.x < z.x + z.w + 80
                      && posMain.y > z.y - 80 && posMain.y < z.y + z.h + 120;
            Config.etat.essenceCoule = proche;
        } else {
            Config.etat.essenceCoule = false;
        }

        // Son pétrole : loop pendant le ravitaillement, stop sinon
        let sonPetrole = Config.BanqueAudio["petrole"];
        if (sonPetrole) {
            if (Config.etat.essenceCoule && !sonPetrole.isPlaying()) {
                sonPetrole.loop();
            } else if (!Config.etat.essenceCoule && sonPetrole.isPlaying()) {
                sonPetrole.stop();
            }
        }

        if (Config.etat.essenceCoule) this.addEssence();
    }

    // ---- Mode entrée actif : "main" si ml5 détecte une main, "souris" sinon ----
    _modeEntree() {
        let hands = Config.variable.hands;
        return (hands && hands.length > 0) ? "main" : "souris";
    }

    // Position du bout de l'index (kp8) si main détectée, sinon position souris locale
    _getMainPos() {
        if (this._modeEntree() === "main") {
            let kp = Config.variable.hands[0].keypoints[8];
            if (kp) return { x: kp.x, y: kp.y };
        }
        return mouseLocalCenter();
    }

    // Position du bout du pouce (kp4) si main détectée, sinon null (pas utilisé en mode souris)
    _getPouce() {
        if (this._modeEntree() === "main") {
            let kp = Config.variable.hands[0].keypoints[4];
            if (kp) return { x: kp.x, y: kp.y };
        }
        return null;
    }

    // Pincement détecté :
    //  • mode main  → distancePincement (calculée en pixels vidéo bruts AVANT remapping)
    //                 < Config.setting.pinchSeuilPx (seuil en px vidéo, typiquement 40-60 sur 640px)
    //  • mode souris → clic maintenu (mouseIsPressed) sur la zone réservoir
    _isPincementDetecte() {
        if (this._modeEntree() === "main") {
            let hand = Config.variable.hands[0];
            if (!hand) return false;
            // distancePincement est stocké en px vidéo brute (VIDEO_W×VIDEO_H) par gotHands()
            // → comparable directement à pinchSeuilPx sans besoin de remapping
            let d = hand.distancePincement != null ? hand.distancePincement : 9999;
            return d < Config.setting.pinchSeuilPx;
        } else {
            // Mode souris : clic maintenu
            return mouseIsPressed;
        }
    }


    // =========================================
    // DÉCOR : HANGAR COCKPIT SCI-FI
    // =========================================

    _dessineHangar() {
        let sw = SCREEN.CENTER.w;
        let sh = SCREEN.H;

        push();

        // Fond dégradé vertical — ambiance hangar profond
        for (let y = 0; y < sh; y += 4) {
            let c = lerpColor(color(5, 8, 18), color(12, 20, 38), y / sh);
            fill(c); noStroke();
            rect(0, y, sw, 4);
        }

        // ---- Structure hangar : arcs de plafond ----
        for (let i = 0; i < 4; i++) {
            let ax = (sw / 3) * i;
            stroke(25, 40, 70, 180 - i * 30);
            strokeWeight(3 - i * 0.5);
            noFill();
            arc(ax, 0, sw * 0.9, sh * 0.7, 0, PI);
        }

        // Grille de sol en perspective
        stroke(20, 35, 65, 90);
        strokeWeight(1);
        let horizY = sh * 0.72;
        // Lignes de fuite
        for (let i = 0; i <= 12; i++) {
            let x = (sw / 12) * i;
            line(x, horizY, sw * 0.5 + (x - sw * 0.5) * 0.1, sh * 0.5);
        }
        // Lignes transversales
        for (let i = 0; i <= 6; i++) {
            let y = map(i, 0, 6, horizY, sh);
            let xFactor = map(y, horizY, sh, 0.1, 1.0);
            let x0 = sw * 0.5 - (sw * 0.5) * xFactor;
            let x1 = sw * 0.5 + (sw * 0.5) * xFactor;
            line(x0, y, x1, y);
        }

        // Marquage sol lumineux
        noStroke();
        fill(0, 180, 255, 30);
        rect(0, horizY - 3, sw, 6);
        fill(0, 180, 255, 12);
        rect(0, horizY, sw, sh - horizY);

        // ---- Piliers latéraux renforcés ----
        this._dessinePilier(0, sw, sh);
        this._dessinePilier(sw - 32, sw, sh);

        // ---- Lumières plafond — halogènes industriels ----
        for (let i = 1; i <= 4; i++) {
            let lx = (sw / 5) * i;
            this._dessineLampe(lx, sh);
        }

        // ---- Tuyaux industriels ----
        this._dessineTuyaux(sw, sh);

        // Ombre sous le vaisseau
        noStroke();
        fill(0, 0, 0, 80);
        ellipse(sw * 0.5, sh * 0.73, 700, 22);

        pop();
    }

    _dessinePilier(px, sw, sh) {
        push();
        // Corps pilier
        noStroke();
        fill(15, 20, 38);
        rect(px, 0, 32, sh);
        // Liserés
        stroke(40, 65, 110);
        strokeWeight(1);
        line(px + 4,  0, px + 4,  sh);
        line(px + 28, 0, px + 28, sh);
        // Rivets
        noStroke();
        fill(50, 70, 110);
        for (let y = 30; y < sh; y += 60) {
            ellipse(px + 10, y, 7, 7);
            ellipse(px + 22, y, 7, 7);
        }
        // Bande lumineuse verticale
        for (let y = 0; y < sh; y += 2) {
            fill(0, 150, 255, map(sin(y * 0.05 + frameCount * 0.03), -1, 1, 5, 18));
            rect(px + 14, y, 4, 2);
        }
        pop();
    }

    _dessineLampe(lx, sh) {
        push();
        // Halo sol
        noStroke();
        for (let r = 200; r > 0; r -= 10) {
            fill(100, 160, 255, map(r, 0, 200, 8, 0));
            ellipse(lx, sh * 0.72, r * 2.5, r * 0.3);
        }
        // Halo plafond
        for (let r = 120; r > 0; r -= 8) {
            fill(150, 200, 255, map(r, 0, 120, 12, 0));
            ellipse(lx, 20, r * 1.5, r * 0.8);
        }
        // Boîtier lampe
        fill(30, 42, 70);
        stroke(55, 80, 120);
        strokeWeight(1);
        rect(lx - 24, 8, 48, 18, 4);
        // Tubes néon
        noStroke();
        fill(200, 220, 255, 220);
        rect(lx - 20, 12, 40, 6, 2);
        // Scintillement
        if (noise(lx, frameCount * 0.05) > 0.85) {
            fill(255, 255, 255, 30);
            rect(lx - 20, 12, 40, 6, 2);
        }
        pop();
    }

    _dessineTuyaux(sw, sh) {
        push();
        stroke(35, 50, 80);
        strokeWeight(10);
        // Tuyau gauche
        line(0, sh * 0.28, 90, sh * 0.28);
        line(90, sh * 0.28, 90, sh * 0.62);
        line(90, sh * 0.62, 0, sh * 0.62);
        // Tuyau droit
        line(sw, sh * 0.22, sw - 90, sh * 0.22);
        line(sw - 90, sh * 0.22, sw - 90, sh * 0.66);
        line(sw - 90, sh * 0.66, sw, sh * 0.66);
        // Raccords
        stroke(60, 80, 120);
        strokeWeight(20);
        point(90, sh * 0.28); point(90, sh * 0.62);
        point(sw - 90, sh * 0.22); point(sw - 90, sh * 0.66);
        // Bandes colorées sur tuyaux
        stroke(0, 200, 255, 60);
        strokeWeight(4);
        line(0, sh * 0.28, 90, sh * 0.28);
        pop();
    }


    // =========================================
    // DÉCOR : VAISSEAU SCI-FI VUE DE CÔTÉ
    // =========================================

    _dessineVaisseau() {
        // Recalculer la position dynamiquement (SCREEN peut changer après un redimensionnement)
        this.vaisseau.cx = SCREEN.CENTER.w * 0.5;
        this.vaisseau.cy = SCREEN.H * 0.52;
        let v  = this.vaisseau;
        let cx = v.cx;
        let cy = v.cy;
        let w  = v.w;
        let h  = v.h;

        let moteurX = cx - w * 0.5;
        let moteurY = cy - h * 0.1;
        let moteurW = 140;
        let moteurH = h * 0.65;
        this.zoneMoteur = { x: moteurX, y: moteurY, w: moteurW, h: moteurH };

        push();
        let flot = sin(frameCount * 0.018) * 5;
        translate(0, flot);

        // Traînées réacteurs
        noStroke();
        for (let r = 80; r > 0; r -= 5) {
            fill(0, 120, 255, map(r, 0, 80, 35, 0));
            ellipse(cx - w * 0.47, cy + h * 0.12, r * 0.35, r * 2.0);
        }
        for (let r = 40; r > 0; r -= 4) {
            fill(80, 200, 255, map(r, 0, 40, 60, 0));
            ellipse(cx - w * 0.47, cy + h * 0.12, r * 0.2, r * 1.4);
        }

        // Coque principale — dégradé simulé
        for (let i = 0; i < 8; i++) {
            fill(lerpColor(color(22, 32, 58), color(38, 55, 90), i / 8));
            stroke(50, 70, 110);
            strokeWeight(i == 7 ? 2 : 0);
            if (i == 7) {
                beginShape();
                vertex(cx + w * 0.5,  cy);
                vertex(cx + w * 0.38, cy - h * 0.45);
                vertex(cx + w * 0.1,  cy - h * 0.52);
                vertex(cx - w * 0.3,  cy - h * 0.48);
                vertex(cx - w * 0.42, cy - h * 0.38);
                vertex(cx - w * 0.5,  cy - h * 0.1);
                vertex(cx - w * 0.5,  cy + h * 0.35);
                vertex(cx - w * 0.38, cy + h * 0.48);
                vertex(cx + w * 0.3,  cy + h * 0.48);
                vertex(cx + w * 0.5,  cy);
                endShape(CLOSE);
            }
        }
        // Coque principale finale
        fill(28, 38, 62);
        stroke(55, 78, 125);
        strokeWeight(2);
        beginShape();
        vertex(cx + w * 0.5,  cy);
        vertex(cx + w * 0.38, cy - h * 0.45);
        vertex(cx + w * 0.1,  cy - h * 0.52);
        vertex(cx - w * 0.3,  cy - h * 0.48);
        vertex(cx - w * 0.42, cy - h * 0.38);
        vertex(cx - w * 0.5,  cy - h * 0.1);
        vertex(cx - w * 0.5,  cy + h * 0.35);
        vertex(cx - w * 0.38, cy + h * 0.48);
        vertex(cx + w * 0.3,  cy + h * 0.48);
        vertex(cx + w * 0.5,  cy);
        endShape(CLOSE);

        // Reflet sur la coque
        noStroke();
        fill(255, 255, 255, 8);
        beginShape();
        vertex(cx + w * 0.38, cy - h * 0.45);
        vertex(cx + w * 0.1,  cy - h * 0.52);
        vertex(cx - w * 0.1,  cy - h * 0.40);
        vertex(cx + w * 0.2,  cy - h * 0.28);
        endShape(CLOSE);

        // Aile inférieure
        fill(18, 26, 48);
        stroke(38, 55, 85);
        strokeWeight(1.5);
        beginShape();
        vertex(cx + w * 0.1,  cy + h * 0.48);
        vertex(cx - w * 0.05, cy + h * 0.48);
        vertex(cx - w * 0.15, cy + h * 0.82);
        vertex(cx + w * 0.25, cy + h * 0.82);
        endShape(CLOSE);

        // Dôme cockpit — vitré avec reflets
        fill(10, 22, 50);
        stroke(COULEURS.accent + "aa");
        strokeWeight(2);
        ellipse(cx + w * 0.2, cy - h * 0.44, w * 0.22, h * 0.32);
        // Vitre teintée
        noStroke();
        fill(0, 180, 255, 50);
        ellipse(cx + w * 0.2, cy - h * 0.44, w * 0.18, h * 0.26);
        // Reflets
        fill(255, 255, 255, 35);
        ellipse(cx + w * 0.16, cy - h * 0.50, w * 0.07, h * 0.09);
        fill(255, 255, 255, 20);
        ellipse(cx + w * 0.22, cy - h * 0.42, w * 0.04, h * 0.05);

        // Liserés lumineux
        stroke(COULEURS.accent + "77");
        strokeWeight(1.5);
        noFill();
        line(cx + w * 0.38, cy - h * 0.45, cx - w * 0.3, cy - h * 0.48);
        line(cx + w * 0.3,  cy + h * 0.48, cx - w * 0.3, cy + h * 0.48);
        stroke(COULEURS.accentChaud + "aa");
        strokeWeight(2);
        line(cx - w * 0.5, cy - h * 0.1, cx - w * 0.5, cy + h * 0.35);

        // Détails panneaux
        stroke(45, 65, 100);
        strokeWeight(1);
        noFill();
        rect(cx - w * 0.05, cy - h * 0.2, w * 0.18, h * 0.4, 4);
        rect(cx - w * 0.35, cy - h * 0.1, w * 0.08, h * 0.25, 2);
        // Petits indicateurs lumineux sur la coque
        noStroke();
        for (let i = 0; i < 4; i++) {
            let bx = cx - w * 0.1 + i * 22;
            let by = cy - h * 0.12;
            let col = [COULEURS.vert, COULEURS.accent, COULEURS.accent, COULEURS.accentChaud][i];
            fill(col);
            ellipse(bx, by, 6, 6);
            // Halo
            fill(col + "44");
            ellipse(bx, by, 12, 12);
        }

        // Zone moteur / réservoir — CLIQUABLE
        let hover = this._hoverZoneMoteur();
        fill(hover ? 50 : 22, hover ? 30 : 16, hover ? 12 : 8);
        stroke(hover ? COULEURS.accentChaud : COULEURS.accentChaud + "66");
        strokeWeight(hover ? 3 : 1.5);
        rect(moteurX, moteurY, moteurW, moteurH, 6);

        // Grille moteur
        stroke(hover ? COULEURS.accentChaud + "cc" : COULEURS.accentChaud + "44");
        strokeWeight(1);
        for (let i = 1; i < 5; i++) {
            line(moteurX, moteurY + (moteurH / 5) * i, moteurX + moteurW, moteurY + (moteurH / 5) * i);
        }
        for (let i = 1; i < 3; i++) {
            line(moteurX + (moteurW / 3) * i, moteurY, moteurX + (moteurW / 3) * i, moteurY + moteurH);
        }

        // Halo réacteur
        noStroke();
        for (let r = 60; r > 0; r -= 5) {
            fill(255, 110, 0, map(r, 0, 60, hover ? 60 : 28, 0));
            ellipse(moteurX + 10, cy + h * 0.12, r * 0.5, r * 1.6);
        }

        // Label interactif
        if (hover) {
            noStroke();
            fill(20, 12, 5, 220);
            rect(moteurX - 10, moteurY - 32, 170, 24, 5);
            stroke(COULEURS.accentChaud);
            strokeWeight(1);
            noFill();
            rect(moteurX - 10, moteurY - 32, 170, 24, 5);
            noStroke();
            fill(255);
            textSize(12);
            textAlign(LEFT, CENTER);
            text("⛽  Cliquer pour ravitailler", moteurX - 4, moteurY - 20);
        }

        // Jauge essence sur réservoir
        let niveauH = map(this.essence, 0, this.essenceMax, 0, moteurH - 10);
        noStroke();
        fill(COULEURS.essence + (this.essence > 0 ? "cc" : "00"));
        rect(moteurX + 5, moteurY + moteurH - 5 - niveauH, moteurW - 10, niveauH, 4);

        // Pastille statut
        let essenceFaite = this.tacheFaites.includes("Essence");
        noStroke();
        fill(essenceFaite ? COULEURS.vert : COULEURS.rouge);
        ellipse(moteurX + moteurW / 2, moteurY - 10, 12, 12);
        fill(essenceFaite ? COULEURS.vert + "44" : COULEURS.rouge + "44");
        ellipse(moteurX + moteurW / 2, moteurY - 10, 20, 20);

        pop();
    }

    _hoverZoneMoteur() {
        let m = mouseLocalCenter();
        if (!m) return false;
        let z = this.zoneMoteur;
        return m.x >= z.x && m.x <= z.x + z.w && m.y >= z.y && m.y <= z.y + z.h;
    }


    // =========================================
    // VUE COCKPIT : tableau de bord stylisé
    // =========================================

    _affichageCokpit() {
        let sw    = SCREEN.CENTER.w;
        let sh    = SCREEN.H;
        let fondH = 230;
        let fondY = sh - fondH;

        // Définition des voyants
        this.signaux = [
            {
                position : { x: sw / 2 - 100 - 60, y: sh - fondH / 2 - 5 - 30 },
                w        : 120, h: 60,
                centre   : { x: sw / 2 - 100, y: sh - fondH / 2 - 5 },
                symbole  : "Essence",
                name     : "essence",
                icone    : "⛽",
            },
            {
                position : { x: sw / 2 + 100 - 60, y: sh - fondH / 2 - 5 - 30 },
                w        : 120, h: 60,
                centre   : { x: sw / 2 + 100, y: sh - fondH / 2 - 5 },
                symbole  : "Freins",
                name     : "frein",
                icone    : "🔒",
            },
        ];

        push();

        // ---- Fond tableau de bord en biseau ----
        noStroke();
        // Ombre portée
        fill(0, 0, 0, 100);
        rect(4, fondY - 6, sw, fondH + 6);
        // Corps principal
        fill(6, 10, 20, 240);
        rect(0, fondY - 2, sw, fondH + 4);
        // Bord supérieur lumineux
        stroke(COULEURS.accent);
        strokeWeight(2);
        line(0, fondY, sw, fondY);
        // Bord intérieur
        stroke(COULEURS.accent + "22");
        strokeWeight(1);
        line(0, fondY + 10, sw, fondY + 10);

        // ---- Métriques rapides en bandeau haut ----
        this._dessineMetriquesRapides(sw, fondY);

        // ---- Zone centrale : voyants d'action ----
        this._dessineVoyants();

        // ---- Compte à rebours / check-list ----
        this._dessineChecklist(sw, fondY, fondH);

        // ---- Alertes actives ----
        this.alertes.forEach((alerte, i) => {
            let ax = sw / 2;
            let ay = fondY - 45 - i * 28;
            let pulse = sin(frameCount * 0.15) * 0.5 + 0.5;
            noStroke();
            fill(20, 10, 5, 200);
            rect(ax - 170, ay - 14, 340, 26, 5);
            stroke(alerte.couleur);
            strokeWeight(1.5);
            noFill();
            rect(ax - 170, ay - 14, 340, 26, 5);
            noStroke();
            fill(alerte.couleur);
            fill(red(color(alerte.couleur)), green(color(alerte.couleur)), blue(color(alerte.couleur)), 200 * pulse);
            textAlign(CENTER, CENTER);
            textSize(13);
            text(alerte.msg, ax, ay);
        });

        // Hint
        noStroke();
        fill(COULEURS.texteSombre);
        textAlign(CENTER, BOTTOM);
        textSize(11);
        text("Cliquer sur un voyant pour interagir", sw / 2, fondY - 16);

        pop();
    }

    _dessineMetriquesRapides(sw, fondY) {
        let t      = this.telemetrie;
        let metriques = [
            { label: "VITESSE",    valeur: floor(t.vitesse) + " km/h", x: sw * 0.15 },
            { label: "ALTITUDE",   valeur: floor(t.altitude) + " m",   x: sw * 0.30 },
            { label: "CAP",        valeur: floor(t.cap) + "°",         x: sw * 0.45 },
            { label: "TEMP",       valeur: nf(t.temperature, 2, 1) + " °C", x: sw * 0.60 },
            { label: "PRESSION",   valeur: nf(t.pression, 1, 3) + " bar",  x: sw * 0.75 },
            { label: "ESSENCE",    valeur: floor(this.essence) + " %",  x: sw * 0.88 },
        ];

        metriques.forEach(m => {
            let my = fondY + 20;
            // Fond pastille
            noStroke();
            fill(10, 18, 35);
            rect(m.x - 60, my - 4, 120, 36, 6);
            stroke(COULEURS.accent + "33");
            strokeWeight(1);
            noFill();
            rect(m.x - 60, my - 4, 120, 36, 6);
            // Label
            noStroke();
            fill(COULEURS.texteSombre);
            textAlign(CENTER, TOP);
            textSize(9);
            text(m.label, m.x, my);
            // Valeur
            fill(COULEURS.accent);
            textSize(14);
            textAlign(CENTER, TOP);
            text(m.valeur, m.x, my + 12);
        });
    }

    _dessineVoyants() {
        let sh = SCREEN.H;
        let sw = SCREEN.CENTER.w;

        this.signaux.forEach((signal) => {
            let fait  = this.tacheFaites.includes(signal.symbole);
            let hover = mouseInRectWH(signal.position, signal.w, signal.h);
            let pulse = sin(frameCount * 0.08) * 0.5 + 0.5;

            // Fond voyant
            noStroke();
            if (fait) {
                fill(0, 40, 25);
            } else {
                fill(hover ? 35 : 25, hover ? 5 : 2, hover ? 10 : 8);
            }
            rect(signal.position.x, signal.position.y, signal.w, signal.h, 12);

            // Bordure animée
            if (!fait) {
                strokeWeight(hover ? 2.5 : 1.5);
                stroke(COULEURS.rouge + (hover ? "ff" : hex(floor(pulse * 180 + 75), 2)));
            } else {
                stroke(COULEURS.vert);
                strokeWeight(2);
            }
            noFill();
            rect(signal.position.x, signal.position.y, signal.w, signal.h, 12);

            // Halo derrière le voyant si actif
            if (!fait) {
                noStroke();
                for (let r = 20; r > 0; r -= 4) {
                    fill(255, 50, 80, map(r, 0, 20, 20 * pulse, 0));
                    rect(signal.position.x - r/2, signal.position.y - r/2, signal.w + r, signal.h + r, 14);
                }
            }

            // Icône + LED
            noStroke();
            fill(fait ? COULEURS.vert : COULEURS.rouge);
            ellipse(signal.position.x + 18, signal.centre.y, 10, 10);
            fill(fait ? COULEURS.vert + "44" : COULEURS.rouge + "44");
            ellipse(signal.position.x + 18, signal.centre.y, 18, 18);

            // Icône emoji
            noStroke();
            fill(255, 255, 255, 180);
            textAlign(CENTER, CENTER);
            textSize(18);
            text(signal.icone, signal.position.x + 38, signal.centre.y);

            // Label
            fill(fait ? COULEURS.vert : (hover ? "#ffffff" : COULEURS.texte));
            textAlign(LEFT, CENTER);
            textSize(13);
            text(signal.symbole.toUpperCase(), signal.position.x + 55, signal.centre.y - 4);
            fill(fait ? COULEURS.vert + "aa" : COULEURS.texteSombre);
            textSize(10);
            text(fait ? "✓ COMPLÉTÉ" : "ACTION REQUISE", signal.position.x + 55, signal.centre.y + 10);

            if (hover) cursor(HAND);
        });
    }

    _dessineChecklist(sw, fondY, fondH) {
        let taches = [
            { label: "Essence",  fait: this.tacheFaites.includes("Essence") },
            { label: "Freins",   fait: this.tacheFaites.includes("Freins")  },
        ];
        let startX = sw - 220;
        let startY = fondY + 55;

        noStroke();
        fill(8, 14, 28);
        rect(startX - 12, startY - 20, 200, taches.length * 26 + 30, 6);
        stroke(COULEURS.accent + "33");
        strokeWeight(1);
        noFill();
        rect(startX - 12, startY - 20, 200, taches.length * 26 + 30, 6);

        noStroke();
        fill(COULEURS.texteSombre);
        textSize(9);
        textAlign(LEFT, TOP);
        text("LISTE DE CONTRÔLE", startX, startY - 14);

        taches.forEach((t, i) => {
            let ty = startY + 4 + i * 26;
            noStroke();
            fill(t.fait ? COULEURS.vert : COULEURS.rouge);
            ellipse(startX + 6, ty + 9, 8, 8);
            fill(t.fait ? COULEURS.vert : COULEURS.texteSombre);
            textSize(12);
            textAlign(LEFT, CENTER);
            text((t.fait ? "✓ " : "○ ") + t.label, startX + 18, ty + 9);
        });

        // Indicateur de prêt au décollage
        let toutFait = taches.every(t => t.fait);
        let my = startY + taches.length * 26 + 14;
        noStroke();
        fill(toutFait ? COULEURS.vert + "22" : COULEURS.rouge + "11");
        rect(startX - 12, my - 4, 200, 22, 5);
        stroke(toutFait ? COULEURS.vert : COULEURS.rouge + "66");
        strokeWeight(1);
        noFill();
        rect(startX - 12, my - 4, 200, 22, 5);
        noStroke();
        fill(toutFait ? COULEURS.vert : COULEURS.rouge);
        textSize(11);
        textAlign(CENTER, CENTER);
        text(toutFait ? "🚀  PRÊT AU DÉCOLLAGE" : "⚠  EN ATTENTE...", startX + 88, my + 7);
    }


    // =========================================
    // VUE ESSENCE
    // =========================================

    _affichageEssence() {
        let sw = SCREEN.CENTER.w;
        let sh = SCREEN.H;
        this.updateEssence();

        push();
        noStroke();
        fill(0, 0, 0, 110);
        rect(0, 0, sw, sh * 0.72);

        // Surbrillance zone moteur
        let z = this.zoneMoteur;
        stroke(COULEURS.accentChaud);
        strokeWeight(3);
        noFill();
        rect(z.x - 6, z.y - 6, z.w + 12, z.h + 12, 8);
        for (let r = 30; r > 0; r -= 5) {
            fill(255, 120, 0, map(r, 0, 30, sin(frameCount * 0.08) * 20 + 20, 0));
            noStroke();
            rect(z.x - r, z.y - r, z.w + r * 2, z.h + r * 2, 10);
        }

        // Position de la main (index tip ou souris en fallback)
        let posMain = this._getMainPos();
        let pince   = this._isPincementDetecte();

        // Tuyau main → réservoir
        if (posMain) {
            // Tuyau externe (gaine)
            stroke(COULEURS.accentChaud + "99");
            strokeWeight(10);
            line(posMain.x, posMain.y, z.x + z.w * 0.5, z.y);
            // Tuyau intérieur coloré
            stroke(pince ? "#ffcc00" : COULEURS.accentChaud + "55");
            strokeWeight(pince ? 5 : 3);
            line(posMain.x, posMain.y, z.x + z.w * 0.5, z.y);

            // Flux d'essence animé si pincement actif
            if (Config.etat.essenceCoule) {
                let nbGouttes = 8;
                for (let i = 0; i < nbGouttes; i++) {
                    let t2 = ((frameCount * 0.06 + i / nbGouttes) % 1.0);
                    let gx = lerp(posMain.x, z.x + z.w * 0.5, t2);
                    let gy = lerp(posMain.y, z.y, t2);
                    noStroke();
                    fill(255, 180 + sin(t2 * TWO_PI) * 60, 0, 200 * (1 - t2));
                    ellipse(gx, gy, map(t2, 0, 1, 8, 3));
                }
            }
        }

        // Curseur main : affiche la pompe + indicateur de pincement
        if (posMain) {
            let s = 52;
            noStroke();
            // Halo pincement
            if (pince) {
                for (let r = 30; r > 0; r -= 5) {
                    fill(255, 200, 0, map(r, 0, 30, 60, 0));
                    ellipse(posMain.x, posMain.y, s + r * 2, s + r * 2);
                }
            }
            // Corps pompe
            fill(pince ? 55 : 35, pince ? 28 : 18, 8);
            rect(posMain.x - s/2, posMain.y - s/2, s, s, 12);
            stroke(pince ? "#ffcc00" : COULEURS.accentChaud);
            strokeWeight(pince ? 3 : 2);
            noFill();
            rect(posMain.x - s/2, posMain.y - s/2, s, s, 12);
            noStroke();
            fill(pince ? "#ffcc00" : COULEURS.accentChaud);
            textAlign(CENTER, CENTER);
            textSize(24);
            text("⛽", posMain.x, posMain.y);

            // Visualisation pouce + index si main détectée
            let pouce = this._getPouce();
            if (pouce) {
                // Pouce
                noStroke();
                fill(pince ? "#ffcc00" : COULEURS.accent);
                ellipse(pouce.x, pouce.y, pince ? 18 : 12, pince ? 18 : 12);
                fill(pince ? "#ffcc00" : COULEURS.accent);
                textSize(10); textAlign(CENTER, BOTTOM);
                text("POUCE", pouce.x, pouce.y - 8);
                // Index
                fill(pince ? "#ffcc00" : COULEURS.accentChaud);
                ellipse(posMain.x, posMain.y - s/2 + 4, pince ? 18 : 12, pince ? 18 : 12);
                // Ligne entre eux si proches
                if (pince) {
                    stroke("#ffcc00");
                    strokeWeight(2);
                    line(pouce.x, pouce.y, posMain.x, posMain.y - s/2 + 4);
                }
            }
        }

        // Indicateur pincement / clic HUD
        let indY   = sh - 130;
        let estMain = this._modeEntree() === "main";

        // Distance pincement actuelle (en px vidéo) pour faciliter le calibrage
        let distActuelle = "";
        if (estMain && Config.variable.hands[0]) {
            let d = Config.variable.hands[0].distancePincement;
            if (d != null && d < 9999) {
                distActuelle = "  |  dist: " + floor(d) + " px";
            }
        }

        let msgActif  = estMain ? "✊  PINCEMENT ACTIF — RAVITAILLEMENT"   : "🖱  CLIC MAINTENU — RAVITAILLEMENT";
        let msgAttente = estMain
            ? "👌  Pincer pouce + index  (seuil : " + Config.setting.pinchSeuilPx + " px)" + distActuelle
            : "🖱  Maintenir le clic sur le réservoir";
        noStroke();
        fill(pince ? 30 : 10, pince ? 20 : 8, 5);
        rect(sw / 2 - 200, indY, 400, 30, 8);
        stroke(pince ? "#ffcc00" : COULEURS.texteSombre);
        strokeWeight(1.5);
        noFill();
        rect(sw / 2 - 200, indY, 400, 30, 8);
        noStroke();
        fill(pince ? "#ffcc00" : COULEURS.texteSombre);
        textAlign(CENTER, CENTER);
        textSize(12);
        text(pince ? msgActif : msgAttente, sw / 2, indY + 15);

        // Jauge HUD stylisée
        this._dessineJaugeEssence(sw, sh);

        noStroke();
        fill(COULEURS.texteSombre);
        textAlign(CENTER, BOTTOM);
        textSize(11);
        let hintBas = estMain
            ? 'Main détectée  •  Pincer au-dessus du réservoir  •  dites "sortir" = retour cockpit'
            : 'Souris active  •  Maintenir clic sur le réservoir  •  dites "sortir" = retour cockpit';
        text(hintBas, sw / 2, sh - 14);

        pop();
    }

    _dessineJaugeEssence(sw, sh) {
        let jx = sw / 2 - 140;
        let jy = sh - 95;
        let jw = 280;
        let jh = 30;
        let rempli = map(this.essence, 0, this.essenceMax, 0, jw);

        // Fond
        noStroke();
        fill(12, 8, 3);
        rect(jx - 2, jy - 2, jw + 4, jh + 4, 8);

        // Segmentation
        for (let s = 0; s < 20; s++) {
            let sx = jx + (jw / 20) * s;
            let sw2 = jw / 20 - 2;
            let filled = (jw / 20) * s < rempli;
            noStroke();
            if (filled) {
                let ratio = s / 20;
                fill(lerpColor(color(255, 80, 0), color(255, 200, 0), ratio));
            } else {
                fill(20, 15, 5);
            }
            rect(sx, jy, sw2, jh, 2);
        }

        // Bordure
        stroke(COULEURS.accentChaud);
        strokeWeight(1.5);
        noFill();
        rect(jx, jy, jw, jh, 6);

        // Texte
        noStroke();
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(13);
        text(floor(this.essence) + " %  —  " + nf(this.prixTotal, 1, 2) + " €", sw / 2, jy + jh / 2);

        // Label
        fill(COULEURS.accentChaud);
        textSize(10);
        textAlign(CENTER, BOTTOM);
        text("CARBURANT", sw / 2, jy - 5);
    }


    _validerEtatFreinDepuisRatio() {
        let ratioValidation = Config.setting.ratioValidationFrein || 0.28;

        if (this.freinCurseurRatio <= ratioValidation) {
            this.freinActif = false;
            this.freinCurseurRatio = min(this.freinCurseurRatio, 0.18);
            if (!this.tacheFaites.includes("Freins")) {
                this.tacheFaites.push("Freins");
                jouerSFX("frein_off");
            }
        } else if (!this.tacheFaites.includes("Freins")) {
            this.freinActif = true;
        }
    }

    _updateFreinAvecMain(couloir) {
        this._freinMainActive = false;
        this._freinMainMilieu = null;
        this._freinPointPouce = null;
        this._freinPointMajeur = null;

        if (this._modeEntree() !== "main") {
            this._freinMainAccroche = false;
            this._freinDistanceActuelle = 9999;
            return;
        }

        let hand = Config.variable.hands[0];
        if (!hand || !hand.keypoints) return;

        let pouce  = hand.keypoints[4];
        let majeur = hand.keypoints[12];
        if (!pouce || !majeur) return;

        // Distance brute caméra : plus stable pour comparer avec la config.
        // Fallback : distance remappée si keypointsRaw n'existe pas.
        let rawPouce  = hand.keypointsRaw && hand.keypointsRaw[4];
        let rawMajeur = hand.keypointsRaw && hand.keypointsRaw[12];
        let distance = 9999;
        if (rawPouce && rawMajeur) {
            distance = dist(rawPouce.x, rawPouce.y, rawMajeur.x, rawMajeur.y);
        } else if (hand.distancePouceMajeur != null) {
            distance = hand.distancePouceMajeur;
        } else {
            distance = dist(pouce.x, pouce.y, majeur.x, majeur.y);
        }
        this._freinDistanceActuelle = distance;
        this._freinPointPouce = { x: pouce.x, y: pouce.y };
        this._freinPointMajeur = { x: majeur.x, y: majeur.y };

        let seuilAccroche = Config.setting.distanceFreinPouceMajeurPx || 34;
        let seuilRelache  = Config.setting.distanceFreinPouceMajeurRelachePx || Math.max(10, seuilAccroche - 10);

        // Hystérésis : évite que le levier clignote on/off si la main tremble.
        if (!this._freinMainAccroche && distance >= seuilAccroche) this._freinMainAccroche = true;
        else if (this._freinMainAccroche && distance < seuilRelache) this._freinMainAccroche = false;

        if (!this._freinMainAccroche) return;

        // Le curseur suit le centre de l'espace pouce/majeur.
        let milieu = {
            x: (pouce.x + majeur.x) / 2,
            y: (pouce.y + majeur.y) / 2,
        };

        // Petite marge : inutile d'être précisément au-dessus du rail.
        let marge = Config.setting.margeZoneFreinMainPx || 180;
        let dansZoneY = milieu.y >= couloir.y - marge && milieu.y <= couloir.y + couloir.h + marge;
        if (!dansZoneY) return;

        this._freinMainActive = true;
        this._freinMainMilieu = milieu;

        let cibleRatio = constrain((milieu.y - couloir.y) / couloir.h, 0.08, 0.92);
        let lissage = constrain(Config.setting.lissageFreinMain ?? 0.35, 0.05, 1);
        this.freinCurseurRatio = lerp(this.freinCurseurRatio, cibleRatio, lissage);
        this._validerEtatFreinDepuisRatio();
    }

    // =========================================
    // VUE FREIN
    // =========================================

    _affichageFrein() {
        let sw = SCREEN.CENTER.w;
        let sh = SCREEN.H;
        let lx = sw / 2;
        let ly = sh / 2 + 10;

        push();

        noStroke();
        fill(0, 0, 0, 160);
        rect(0, 0, sw, sh);

        // Panneau central frein
        let pw = 260, ph = 340;
        let px = lx - pw / 2;
        let py = ly - ph / 2 - 20;

        noStroke();
        fill(6, 10, 22);
        rect(px, py, pw, ph, 16);
        stroke(COULEURS.accent + "55");
        strokeWeight(1.5);
        noFill();
        rect(px, py, pw, ph, 16);

        // Titre panneau
        noStroke();
        fill(COULEURS.accent);
        textSize(11);
        textAlign(CENTER, TOP);
        text("SYSTÈME DE FREINAGE", lx, py + 14);
        stroke(COULEURS.accent + "33");
        strokeWeight(1);
        line(px + 20, py + 30, px + pw - 20, py + 30);

        // Indicateur statut
        let couleurFrein = this.freinActif ? COULEURS.rouge : COULEURS.vert;
        noStroke();
        fill(this.freinActif ? 30 : 5, this.freinActif ? 5 : 25, this.freinActif ? 8 : 5);
        rect(px + 20, py + 40, pw - 40, 36, 8);
        stroke(couleurFrein);
        strokeWeight(1.5);
        noFill();
        rect(px + 20, py + 40, pw - 40, 36, 8);
        noStroke();
        fill(couleurFrein);
        textSize(16);
        textAlign(CENTER, CENTER);
        text(this.freinActif ? "⛔  FREIN ENGAGÉ" : "✅  FREIN LIBÉRÉ", lx, py + 58);

        // Levier stylisé
        let couloir = { x: lx - 18, y: py + 90, w: 36, h: 180 };
        this._updateFreinAvecMain(couloir);
        fill(12, 18, 32);
        stroke(COULEURS.texteSombre + "66");
        strokeWeight(1);
        rect(couloir.x, couloir.y, couloir.w, couloir.h, 18);

        // Rainures couloir
        stroke(COULEURS.texteSombre + "33");
        strokeWeight(1);
        for (let ry = 10; ry < couloir.h - 10; ry += 15) {
            line(couloir.x + 5, couloir.y + ry, couloir.x + couloir.w - 5, couloir.y + ry);
        }

        // Position levier : suit le milieu pouce/majeur si l'écart est suffisant.
        let levierY   = couloir.y + couloir.h * this.freinCurseurRatio;
        let levierCol = this.freinActif ? COULEURS.rouge : COULEURS.vert;

        // Tige
        stroke(couleurFrein + "88");
        strokeWeight(5);
        line(lx, couloir.y + 12, lx, couloir.y + couloir.h - 12);

        // Poignée
        noStroke();
        // Halo
        for (let r = 28; r > 0; r -= 4) {
            fill(red(color(levierCol)), green(color(levierCol)), blue(color(levierCol)), map(r, 0, 28, 35, 0));
            ellipse(lx, levierY, r * 1.6, r * 1.6);
        }
        // Corps
        fill(levierCol);
        ellipse(lx, levierY, 44, 44);
        // Reflet
        fill(255, 255, 255, 50);
        ellipse(lx - 7, levierY - 7, 14, 14);

        // Flèches directionnelles
        noStroke();
        fill(COULEURS.accent);
        textSize(18);
        textAlign(CENTER, CENTER);
        text("▲", lx, couloir.y - 16);
        text("▼", lx, couloir.y + couloir.h + 16);

        fill(COULEURS.texteSombre);
        textSize(10);
        textAlign(CENTER, CENTER);
        text("LIBÉRER", lx, couloir.y - 34);
        text("ENGAGER", lx, couloir.y + couloir.h + 34);

        // Visualisation main : pouce, majeur et centre de l'espace qui pilote le frein.
        if (this._freinPointPouce && this._freinPointMajeur) {
            stroke(this._freinMainAccroche ? COULEURS.vert : COULEURS.texteSombre);
            strokeWeight(3);
            line(this._freinPointPouce.x, this._freinPointPouce.y, this._freinPointMajeur.x, this._freinPointMajeur.y);
            noStroke();
            fill(COULEURS.accent);
            ellipse(this._freinPointPouce.x, this._freinPointPouce.y, 15, 15);
            fill(COULEURS.accentChaud);
            ellipse(this._freinPointMajeur.x, this._freinPointMajeur.y, 15, 15);
            fill(COULEURS.texte);
            textSize(9);
            textAlign(CENTER, BOTTOM);
            text("POUCE", this._freinPointPouce.x, this._freinPointPouce.y - 10);
            text("MAJEUR", this._freinPointMajeur.x, this._freinPointMajeur.y - 10);
        }

        if (this._freinMainMilieu) {
            let m = this._freinMainMilieu;
            noStroke();
            fill(COULEURS.vert + "55");
            ellipse(m.x, m.y, 62, 62);
            fill(COULEURS.vert);
            ellipse(m.x, m.y, 16, 16);
            stroke(COULEURS.vert + "aa");
            strokeWeight(2);
            line(m.x, m.y, lx, levierY);
        }

        // Instructions + calibration
        let d = this._freinDistanceActuelle;
        let distTexte = d != null && d < 9999 ? "  |  écart: " + floor(d) + " px" : "";
        let seuil = Config.setting.distanceFreinPouceMajeurPx || 34;
        let relache = Config.setting.distanceFreinPouceMajeurRelachePx || 24;
        fill(this._freinMainActive ? COULEURS.vert : (this._freinMainAccroche ? COULEURS.accent : COULEURS.texteSombre));
        textSize(11);
        textAlign(CENTER, TOP);
        text(this._freinMainActive
            ? "Le centre entre pouce et majeur contrôle le curseur"
            : this._freinMainAccroche
                ? "Geste détecté : place le centre des deux doigts dans la zone du frein" + distTexte
                : "Écarte pouce + majeur pour accrocher le frein  (seuil : " + seuil + " px / relâche : " + relache + " px)" + distTexte,
            lx, py + ph - 40);
        fill(COULEURS.texteSombre);
        text('Monte le curseur pour libérer le frein  •  dites "sortir" pour revenir au cockpit', lx, py + ph - 21);

        // Retour
        fill(COULEURS.accent);
        textSize(12);
        textAlign(LEFT, TOP);
        text('← Cockpit  [dites "sortir"]', px + 10, py - 24);

        pop();
    }
}

// =============================================
// scene_demarage_vaisseau.js
// Scène démarrage vaisseau : cockpit + bouton rouge maintenu par la main
// Après validation : décollage animé, puis vue lointaine fixe.
// Commande vocale "map" : tablette de navigation avec 5 planètes.
// Dépend de : constants.js, config.js, utils.js, screen.js
// =============================================

class DemarageVaisseau {

    constructor() {
        this.bouton = { x: 0, y: 0, r: 78 };
        this.holdStart = null;
        this.progressionMaintien = 0;
        this.demarrageActif = false;
        this._sonDemarageJoue = false;

        this._etoiles = [];
        this._trainees = [];
        this._nuages = [];
        this._planeteLointaine = null;

        this.decollageStart = null;
        this.progressionDecollage = 0;
        this.vueLointaineActive = false;

        this.mapOuverte = false;
        this.planeteSurvolee = null;
        this._planetesCarte = [];
        this._planetesCarteKey = "";
        this._frameCache = { frame: -1, mainPos: undefined, surBouton: undefined, planeteSousMain: undefined };
    }

    setup() {
        Config.selected.scene         = SCENE.DEMARAGE_VAISSEAU;
        Config.selected.dialogueScene = null;
        Config.mode.game              = MODE.JEU;
        Config.currentStep.Dialogue   = 0;
        Config.selected.dialogueLine  = null;
        Config.selected.question      = null;
        Config.selected.screen        = 0;

        this.holdStart = null;
        this.progressionMaintien = 0;
        this.demarrageActif = false;
        this._sonDemarageJoue = false;
        this.decollageStart = null;
        this.progressionDecollage = 0;
        this.vueLointaineActive = false;
        this.mapOuverte = false;
        this.planeteSurvolee = null;
        this._planetesCarteKey = "";
        this._frameCache = { frame: -1, mainPos: undefined, surBouton: undefined, planeteSousMain: undefined };
        this._etoiles = [];
        this._trainees = [];
        this._nuages = [];

        for (let i = 0; i < 150; i++) {
            this._etoiles.push({
                x: random(0.12, 0.88),
                y: random(0.02, 0.44),
                s: random(1, 3.2),
                v: random(0.4, 1.8),
                alpha: random(120, 230),
            });
        }

        for (let i = 0; i < 28; i++) {
            this._trainees.push({
                x: random(0.18, 0.82),
                y: random(0.03, 0.42),
                l: random(24, 90),
                v: random(2.5, 7.5),
                alpha: random(35, 120),
            });
        }

        for (let i = 0; i < 18; i++) {
            this._nuages.push({
                x: random(0.16, 0.84),
                y: random(0.03, 0.40),
                w: random(90, 220),
                h: random(22, 60),
                v: random(0.5, 1.8),
                alpha: random(18, 45),
            });
        }

        this._planeteLointaine = {
            x: random(0.62, 0.78),
            y: random(0.13, 0.24),
            r: random(32, 48),
            anneau: random() > 0.45,
        };
    }

    draw() {
        let sw = SCREEN.CENTER.w;
        let sh = SCREEN.H;
        this.bouton.x = sw / 2;
        this.bouton.y = sh * 0.68;
        this._frameCache.frame = -1;

        this._updateBoutonDemarage();
        this._dessineCockpit(sw, sh);
        this._dessineBouton(sw, sh);

        if (this.mapOuverte) {
            this._dessineMapTablette(sw, sh);
        }

        this._dessineCurseurMain();
        this._dessineInstructions(sw, sh);
    }

    toggleMap() {
        this.ouvrirMap();
    }

    ouvrirMap() {
        debugLog("[MAP] Navigation vers le cockpit 3D...");
        window.location.href = "cockpit/index.html";
    }

    fermerMap() {
        this.mapOuverte = false;
    }

    validerPlaneteSurvolee() {
        return false;
    }

    _modeEntree() {
        let hands = Config.variable.hands;
        return (hands && hands.length > 0) ? "main" : "souris";
    }

    _resetFrameCacheSiBesoin() {
        if (!this._frameCache || this._frameCache.frame !== frameCount) {
            this._frameCache = { frame: frameCount, mainPos: undefined, surBouton: undefined, planeteSousMain: undefined };
        }
    }

    _getMainPos() {
        this._resetFrameCacheSiBesoin();
        if (this._frameCache.mainPos !== undefined) return this._frameCache.mainPos;

        let pos = null;
        if (this._modeEntree() === "main") {
            let hand = Config.variable.hands[0];
            let kp = hand && hand.keypoints && hand.keypoints[8];
            if (kp) pos = { x: kp.x, y: kp.y };
        } else {
            pos = mouseLocalCenter();
        }
        this._frameCache.mainPos = pos;
        return pos;
    }

    _mainSurBouton() {
        this._resetFrameCacheSiBesoin();
        if (this._frameCache.surBouton !== undefined) return this._frameCache.surBouton;
        let pos = this._getMainPos();
        if (!pos) {
            this._frameCache.surBouton = false;
            return false;
        }
        let dx = pos.x - this.bouton.x;
        let dy = pos.y - this.bouton.y;
        this._frameCache.surBouton = (dx * dx + dy * dy) <= this.bouton.r * this.bouton.r;
        return this._frameCache.surBouton;
    }

    _updateBoutonDemarage() {
        let surBouton = this._mainSurBouton();
        let maintenant = millis();
        let tempsMaintien = Config.setting.tempsMaintienBoutonDemarageMs || 2200;

        if (surBouton && !this.demarrageActif) {
            if (this.holdStart == null) this.holdStart = maintenant;
            this.progressionMaintien = constrain((maintenant - this.holdStart) / tempsMaintien, 0, 1);

            if (this.progressionMaintien >= 1) {
                this.demarrageActif = true;
                this.decollageStart = maintenant;
                this.progressionMaintien = 1;
                this.vueLointaineActive = false;
                if (!this._sonDemarageJoue) {
                    jouerSFX("demarage");
                    this._sonDemarageJoue = true;
                }
            }
        } else if (!surBouton && !this.demarrageActif) {
            this.holdStart = null;
            this.progressionMaintien = 0;
        }

        if (this.demarrageActif && this.decollageStart != null) {
            let dureeAnimation = Config.setting.dureeAnimationDecollageMs || 5200;
            let delaiVueLointaine = Config.setting.delaiVueLointaineApresDecollageMs || dureeAnimation;
            let age = maintenant - this.decollageStart;
            this.progressionDecollage = constrain(age / dureeAnimation, 0, 1);
            this.vueLointaineActive = age >= delaiVueLointaine;
        }
    }

    _clignotementRougeActif() {
        // Remis : clignotement pendant le maintien et pendant toute la séquence de décollage.
        if (this.progressionMaintien > 0 && !this.demarrageActif) return true;
        if (!this.demarrageActif || this.decollageStart == null) return false;
        return !this.vueLointaineActive;
    }

    _secousse() {
        if (!this.demarrageActif || this.vueLointaineActive) return { x: 0, y: 0 };
        let forceBase = Config.setting.intensiteSecousseDecollage || 7;
        let force = forceBase * (1 - this.progressionDecollage * 0.72);
        return {
            x: sin(frameCount * 1.8) * force + random(-force * 0.35, force * 0.35),
            y: cos(frameCount * 1.35) * force * 0.65 + random(-force * 0.25, force * 0.25),
        };
    }

    _dessineCockpit(sw, sh) {
        let shake = this._secousse();
        push();
        translate(shake.x, shake.y);

        // Fond cockpit sombre
        for (let y = -20; y < sh + 20; y += 4) {
            let c = lerpColor(color(4, 6, 14), color(10, 18, 32), y / sh);
            fill(c);
            noStroke();
            rect(-20, y, sw + 40, 4);
        }

        // Vitre principale
        let vx = sw * 0.16;
        let vy = 42;
        let vw = sw * 0.68;
        let vh = sh * 0.42;

        noStroke();
        fill(2, 10, 24);
        rect(vx, vy, vw, vh, 28);
        stroke(COULEURS.accent + "aa");
        strokeWeight(3);
        noFill();
        rect(vx, vy, vw, vh, 28);

        this._dessineExterieurFenetre(vx, vy, vw, vh);

        // Reflets de vitre
        noFill();
        stroke(255, 255, 255, 25);
        strokeWeight(2);
        arc(vx + vw * 0.45, vy + vh * 0.15, vw * 0.62, vh * 0.8, PI + 0.2, TWO_PI - 0.3);
        line(vx + 70, vy + 50, vx + vw - 120, vy + 18);

        // Tableau de bord
        let dashY = sh * 0.54;
        noStroke();
        fill(5, 9, 20, 245);
        rect(0, dashY, sw, sh - dashY);
        stroke(COULEURS.accent + "66");
        strokeWeight(2);
        line(0, dashY, sw, dashY);

        let statutDepart = this.demarrageActif
            ? (this.vueLointaineActive ? "ORBITE" : (this.progressionDecollage >= 1 ? "STABILISATION" : "DÉCOLLAGE"))
            : "BLOQUÉ";

        let infos = [
            { label: "MOTEURS", valeur: this.demarrageActif ? "ACTIFS" : "EN ATTENTE", x: sw * 0.18 },
            { label: "SYSTÈME", valeur: "OK", x: sw * 0.34 },
            { label: "CARBURANT", valeur: "100%", x: sw * 0.50 },
            { label: "FREINS", valeur: "LIBÉRÉS", x: sw * 0.66 },
            { label: "DÉPART", valeur: statutDepart, x: sw * 0.82 },
        ];

        infos.forEach(info => {
            let y = dashY + 44;
            noStroke();
            fill(8, 18, 36);
            rect(info.x - 72, y - 16, 144, 48, 8);
            stroke(this._clignotementRougeActif() ? COULEURS.rouge : COULEURS.accent + "55");
            strokeWeight(1);
            noFill();
            rect(info.x - 72, y - 16, 144, 48, 8);
            noStroke();
            fill(COULEURS.texteSombre);
            textAlign(CENTER, TOP);
            textSize(10);
            text(info.label, info.x, y - 8);
            fill(this._clignotementRougeActif() ? COULEURS.rouge : COULEURS.vert);
            textSize(15);
            text(info.valeur, info.x, y + 10);
        });

        // Flash rouge remis pendant le maintien + toute la phase de décollage.
        if (this.progressionMaintien > 0 && !this.demarrageActif) {
            let intensite = map(this.progressionMaintien, 0, 1, 15, 90);
            noStroke();
            fill(255, 0, 20, intensite);
            rect(-20, -20, sw + 40, sh + 40);
        } else if (this._clignotementRougeActif()) {
            let pulsation = 45 + sin(frameCount * 0.55) * 35;
            noStroke();
            fill(255, 0, 20, pulsation);
            rect(-20, -20, sw + 40, sh + 40);
        }

        pop();
    }

    _dessineExterieurFenetre(vx, vy, vw, vh) {
        push();
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.rect(vx, vy, vw, vh);
        drawingContext.clip();

        if (this.vueLointaineActive) {
            this._dessineVueLointaine(vx, vy, vw, vh);
            drawingContext.restore();
            pop();
            return;
        }

        // Dégradé ciel/espace dans la vitre.
        for (let y = vy; y < vy + vh; y += 5) {
            let k = map(y, vy, vy + vh, 0, 1);
            let c1 = this.demarrageActif ? color(3, 8, 30) : color(6, 14, 34);
            let c2 = this.demarrageActif ? color(5, 2, 18) : color(2, 9, 22);
            fill(lerpColor(c1, c2, k));
            noStroke();
            rect(vx, y, vw, 5);
        }

        let p = this.progressionDecollage;
        let vitesse = this.demarrageActif ? 5 + p * 24 : 0.8;

        // Nuages / fumées qui descendent : donne l'impression que le vaisseau monte.
        this._nuages.forEach(n => {
            let x = vx + n.x * vw;
            let y = vy + n.y * vh;
            if (this.demarrageActif) {
                n.y += (n.v * vitesse * 0.0009);
                n.x += sin(frameCount * 0.01 + n.v) * 0.00045;
                if (n.y > 1.12) {
                    n.y = -0.15;
                    n.x = random(0.14, 0.86);
                }
            }
            noStroke();
            fill(180, 220, 255, n.alpha * (this.demarrageActif ? 1.35 : 0.55));
            ellipse(x, y, n.w * (1 + p * 0.65), n.h * (1 + p * 0.45));
        });

        // Traînées verticales très rapides pendant le décollage.
        if (this.demarrageActif) {
            this._trainees.forEach(tr => {
                tr.y += tr.v * vitesse * 0.0017;
                if (tr.y > 1.1) {
                    tr.y = -0.15;
                    tr.x = random(0.20, 0.80);
                    tr.l = random(30, 120);
                }
                let x = vx + tr.x * vw;
                let y = vy + tr.y * vh;
                stroke(0, 207, 255, tr.alpha * (0.4 + p));
                strokeWeight(2 + p * 3);
                line(x, y, x + sin(frameCount * 0.04) * 8, y + tr.l * (0.8 + p));
            });
        }

        // Étoiles : accélèrent vers le bas au décollage.
        noStroke();
        this._etoiles.forEach(e => {
            if (this.demarrageActif) {
                e.y += e.v * vitesse * 0.0014;
                e.x += sin(frameCount * 0.015 + e.v) * 0.00065;
                if (e.y > 1.04) {
                    e.y = -0.05;
                    e.x = random(0.18, 0.82);
                }
            } else {
                e.x -= e.v * 0.00035;
                if (e.x < 0.16) e.x = 0.84;
            }

            let x = vx + e.x * vw;
            let y = vy + e.y * vh;
            let taille = e.s * (this.demarrageActif ? 1 + p * 0.8 : 1);
            fill(255, 255, 255, e.alpha);
            ellipse(x, y, taille, taille);
        });

        // Horizon/hangar qui glisse au début, puis disparaît.
        if (this.demarrageActif && p < 0.72) {
            let hy = vy + vh * map(p, 0, 0.72, 0.74, 1.25);
            stroke(0, 255, 165, 120 * (1 - p / 0.72));
            strokeWeight(3);
            line(vx, hy, vx + vw, hy);
            for (let i = 0; i < 9; i++) {
                let gx = vx + vw * (i / 8);
                line(gx, hy, lerp(gx, vx + vw / 2, 0.55), vy + vh);
            }
        }

        // Lueur moteur au bas de la vitre pendant l'accélération.
        if (this.demarrageActif && p < 0.9) {
            noStroke();
            fill(255, 120, 20, map(p, 0, 0.9, 80, 15));
            ellipse(vx + vw / 2, vy + vh + 35, vw * (0.55 + p * 0.5), 120 + p * 140);
        }

        drawingContext.restore();
        pop();
    }

    _dessineVueLointaine(vx, vy, vw, vh) {
        // Vue fixe après le délai : l'animation de décollage est arrêtée.
        for (let y = vy; y < vy + vh; y += 5) {
            let k = map(y, vy, vy + vh, 0, 1);
            let c = lerpColor(color(2, 4, 16), color(7, 2, 22), k);
            noStroke();
            fill(c);
            rect(vx, y, vw, 5);
        }

        // Champ d'étoiles fixe.
        noStroke();
        this._etoiles.forEach(e => {
            let x = vx + e.x * vw;
            let y = vy + e.y * vh;
            fill(255, 255, 255, e.alpha * 0.75);
            ellipse(x, y, e.s, e.s);
        });

        // Planète / destination au loin.
        let p = this._planeteLointaine || { x: 0.68, y: 0.20, r: 42, anneau: true };
        let px = vx + p.x * vw;
        let py = vy + p.y * vh;
        let pr = p.r;

        noStroke();
        for (let r = pr * 3.2; r > pr; r -= 8) {
            fill(0, 207, 255, map(r, pr, pr * 3.2, 28, 0));
            ellipse(px, py, r * 2.1, r * 2.1);
        }
        fill(32, 100, 160);
        ellipse(px, py, pr * 2, pr * 2);
        fill(0, 255, 165, 90);
        arc(px - pr * 0.1, py - pr * 0.1, pr * 1.6, pr * 1.4, PI * 0.1, PI * 1.15);
        fill(255, 255, 255, 32);
        ellipse(px - pr * 0.28, py - pr * 0.30, pr * 0.45, pr * 0.24);

        if (p.anneau) {
            noFill();
            stroke(180, 220, 255, 90);
            strokeWeight(3);
            ellipse(px, py, pr * 3.1, pr * 0.74);
        }

        // Petit vaisseau éloigné / silhouette stationnaire.
        let sx = vx + vw * 0.38;
        let sy = vy + vh * 0.63;
        noStroke();
        fill(210, 235, 255, 150);
        triangle(sx, sy - 12, sx - 28, sy + 16, sx + 28, sy + 16);
        fill(0, 207, 255, 110);
        ellipse(sx, sy + 18, 36, 8);

        fill(COULEURS.accent + "cc");
        textAlign(LEFT, TOP);
        textSize(13);
        text("Vue lointaine stabilisée", vx + 24, vy + 20);
    }

    _dessineBouton(sw, sh) {
        let b = this.bouton;
        let blink = this._clignotementRougeActif() || !this.demarrageActif
            ? sin(frameCount * 0.16) * 0.5 + 0.5
            : 0.25;
        let press = this.progressionMaintien;
        let yOffset = press * 16;

        push();

        // Socle
        noStroke();
        fill(8, 10, 16);
        ellipse(b.x, b.y + 26, b.r * 2.4, b.r * 0.9);
        stroke(80, 90, 110);
        strokeWeight(2);
        noFill();
        ellipse(b.x, b.y + 26, b.r * 2.4, b.r * 0.9);

        // Halo rouge remis pendant le maintien + décollage.
        if (this._clignotementRougeActif() || !this.demarrageActif) {
            for (let r = 80; r > 0; r -= 10) {
                noStroke();
                fill(255, 0, 30, map(r, 0, 80, 40 + blink * 80, 0));
                ellipse(b.x, b.y + yOffset, b.r * 2 + r, b.r * 2 + r);
            }
        } else {
            noStroke();
            fill(0, 255, 165, 34);
            ellipse(b.x, b.y + yOffset, b.r * 2.7, b.r * 2.7);
        }

        // Bouton
        noStroke();
        if (this.vueLointaineActive) fill(25, 92, 72);
        else fill(180 + blink * 70, 0, 28);
        ellipse(b.x, b.y + yOffset, b.r * 2, b.r * 2);
        stroke(this.vueLointaineActive ? COULEURS.vert : "#ffb3b3");
        strokeWeight(3);
        noFill();
        ellipse(b.x, b.y + yOffset, b.r * 1.75, b.r * 1.75);

        // Reflet
        noStroke();
        fill(255, 255, 255, 70);
        ellipse(b.x - 24, b.y - 28 + yOffset, b.r * 0.55, b.r * 0.30);

        // Progression circulaire / décollage
        stroke(this.vueLointaineActive ? COULEURS.vert : COULEURS.rouge);
        strokeWeight(7);
        noFill();
        let arcProgress = this.demarrageActif ? this.progressionDecollage : this.progressionMaintien;
        arc(b.x, b.y + yOffset, b.r * 2.35, b.r * 2.35, -HALF_PI, -HALF_PI + TWO_PI * arcProgress);

        noStroke();
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(19);
        text(this.vueLointaineActive ? "VOL" : (this.demarrageActif ? "DÉCOLLAGE" : "START"), b.x, b.y + yOffset - 4);
        textSize(11);
        text(floor(arcProgress * 100) + "%", b.x, b.y + yOffset + 20);

        pop();
    }

    _getPlanetesCarte(sw, sh) {
        let noms = Config.setting.planetesCarte || ["Manger", "Musique", "Casino", "Glace", "Forge"];
        let r = Config.setting.rayonSelectionPlaneteCarte || 54;
        let key = sw + "x" + sh + "|" + r + "|" + noms.join(",");
        if (this._planetesCarteKey === key && this._planetesCarte.length) return this._planetesCarte;

        let tw = 560;
        let th = 450;
        let tx = sw - tw - 70;
        let ty = 82;
        let positions = [
            { x: tx + tw * 0.28, y: ty + th * 0.31 },
            { x: tx + tw * 0.50, y: ty + th * 0.22 },
            { x: tx + tw * 0.72, y: ty + th * 0.35 },
            { x: tx + tw * 0.36, y: ty + th * 0.68 },
            { x: tx + tw * 0.66, y: ty + th * 0.72 },
        ];
        this._planetesCarte = noms.slice(0, 5).map((nom, i) => ({
            nom,
            x: positions[i].x,
            y: positions[i].y,
            r,
            rSelect2: (r + 18) * (r + 18),
            index: i,
        }));
        this._planetesCarteKey = key;
        return this._planetesCarte;
    }

    _getPlaneteSousMain() {
        this._resetFrameCacheSiBesoin();
        if (this._frameCache.planeteSousMain !== undefined) return this._frameCache.planeteSousMain;
        let pos = this._getMainPos();
        if (!pos || !this.mapOuverte) {
            this._frameCache.planeteSousMain = null;
            return null;
        }
        let planetes = this._getPlanetesCarte(SCREEN.CENTER.w, SCREEN.H);
        for (let p of planetes) {
            let dx = pos.x - p.x;
            let dy = pos.y - p.y;
            if (dx * dx + dy * dy <= p.rSelect2) {
                this._frameCache.planeteSousMain = p;
                return p;
            }
        }
        this._frameCache.planeteSousMain = null;
        return null;
    }

    _dessineMapTablette(sw, sh) {
        let tw = 560;
        let th = 450;
        let tx = sw - tw - 70;
        let ty = 82;
        let planetes = this._getPlanetesCarte(sw, sh);
        let survolee = this._getPlaneteSousMain();
        this.planeteSurvolee = survolee ? survolee.nom : null;

        push();
        drawingContext.shadowColor = "rgba(0, 207, 255, 0.32)";
        drawingContext.shadowBlur = 22;
        noStroke();
        fill(3, 10, 22, 238);
        rect(tx, ty, tw, th, 26);
        drawingContext.shadowBlur = 0;

        stroke(COULEURS.accent + "dd");
        strokeWeight(2);
        noFill();
        rect(tx, ty, tw, th, 26);

        noStroke();
        fill(COULEURS.accent);
        textAlign(LEFT, TOP);
        textSize(22);
        text("TABLETTE MAP", tx + 28, ty + 24);
        fill(COULEURS.texteSombre);
        textSize(12);
        text('Place la main sur une planète puis dis "aller"', tx + 30, ty + 56);

        // Lignes de navigation
        stroke(COULEURS.accent + "33");
        strokeWeight(1.5);
        for (let i = 0; i < planetes.length; i++) {
            for (let j = i + 1; j < planetes.length; j++) {
                if ((i + j) % 2 === 0 || Math.abs(i - j) === 1) {
                    line(planetes[i].x, planetes[i].y, planetes[j].x, planetes[j].y);
                }
            }
        }

        const palettes = [
            { c1: [0, 255, 165], c2: [0, 207, 255] },
            { c1: [190, 80, 255], c2: [0, 207, 255] },
            { c1: [255, 90, 45], c2: [255, 205, 70] },
            { c1: [120, 220, 255], c2: [210, 255, 255] },
            { c1: [255, 80, 120], c2: [120, 60, 255] },
        ];

        planetes.forEach(p => {
            let actif = survolee && survolee.nom === p.nom;
            let pal = palettes[p.index % palettes.length];
            let pulse = actif ? 1 + sin(frameCount * 0.18) * 0.08 : 1;

            noStroke();
            for (let rr = p.r * 2.4; rr > p.r; rr -= 8) {
                let alpha = actif ? map(rr, p.r, p.r * 2.4, 70, 0) : map(rr, p.r, p.r * 2.4, 24, 0);
                fill(pal.c1[0], pal.c1[1], pal.c1[2], alpha);
                ellipse(p.x, p.y, rr * 2 * pulse, rr * 2 * pulse);
            }

            fill(pal.c1[0], pal.c1[1], pal.c1[2], 230);
            ellipse(p.x, p.y, p.r * 2 * pulse, p.r * 2 * pulse);
            fill(pal.c2[0], pal.c2[1], pal.c2[2], 115);
            arc(p.x - p.r * 0.12, p.y - p.r * 0.08, p.r * 1.55, p.r * 1.30, -0.2, PI + 0.7);

            stroke(actif ? COULEURS.vert : COULEURS.accent + "aa");
            strokeWeight(actif ? 4 : 2);
            noFill();
            ellipse(p.x, p.y, p.r * 2.25 * pulse, p.r * 2.25 * pulse);

            noStroke();
            fill(actif ? COULEURS.vert : COULEURS.texte);
            textAlign(CENTER, TOP);
            textSize(actif ? 15 : 13);
            text(p.nom, p.x, p.y + p.r + 16);
        });

        // Statut sélection
        let status = survolee
            ? 'Sélection : ' + survolee.nom + '  → dites "aller"'
            : 'Aucune planète survolée';
        noStroke();
        fill(survolee ? COULEURS.vert + "22" : "rgba(0,0,0,0.34)");
        rect(tx + 26, ty + th - 58, tw - 52, 34, 10);
        fill(survolee ? COULEURS.vert : COULEURS.texteSombre);
        textAlign(CENTER, CENTER);
        textSize(14);
        text(status, tx + tw / 2, ty + th - 41);

        pop();
    }

    _dessineCurseurMain() {
        let pos = this._getMainPos();
        if (!pos) return;
        let surBouton = this._mainSurBouton();
        let surPlanete = this.mapOuverte && this._getPlaneteSousMain();

        push();
        noStroke();
        fill(surPlanete ? COULEURS.vert + "55" : (surBouton ? COULEURS.rouge + "55" : COULEURS.accent + "33"));
        ellipse(pos.x, pos.y, surPlanete ? 84 : (surBouton ? 70 : 44), surPlanete ? 84 : (surBouton ? 70 : 44));
        fill(surPlanete ? COULEURS.vert : (surBouton ? COULEURS.rouge : COULEURS.accent));
        ellipse(pos.x, pos.y, 16, 16);
        fill(255);
        textAlign(CENTER, BOTTOM);
        textSize(10);
        text(this._modeEntree() === "main" ? "MAIN" : "SOURIS", pos.x, pos.y - 14);
        pop();
    }

    _dessineInstructions(sw, sh) {
        push();
        noStroke();
        fill(0, 0, 0, 170);
        rect(sw / 2 - 440, sh - 78, 880, 48, 12);
        stroke(this._clignotementRougeActif() ? COULEURS.rouge : COULEURS.accent);
        strokeWeight(1.5);
        noFill();
        rect(sw / 2 - 440, sh - 78, 880, 48, 12);
        noStroke();
        fill(this._clignotementRougeActif() ? COULEURS.rouge : COULEURS.texte);
        textAlign(CENTER, CENTER);
        textSize(15);
        let temps = ((Config.setting.tempsMaintienBoutonDemarageMs || 2200) / 1000).toFixed(1);
        let texte;
        if (!this.demarrageActif) {
            texte = 'Passez la main sur le bouton rouge et restez ' + temps + ' s pour l’activer';
        } else if (this.vueLointaineActive) {
            texte = 'Vue lointaine stabilisée — dites "map" pour ouvrir la carte';
        } else {
            texte = 'Décollage en cours — cockpit en alerte rouge';
        }
        if (this.mapOuverte) {
            texte = 'Carte ouverte — main sur une planète + dites "aller" pour afficher la destination en console';
        }
        text(texte, sw / 2, sh - 54);
        pop();
    }
}

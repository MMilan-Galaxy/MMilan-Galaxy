// =============================================
// scene_info_utilisation.js
// Ecran rapide d'information avant le hub isometrique.
// Explique les interactions principales : voix + mains.
// Depend de : constants.js, config.js, utils.js, screen.js
// =============================================

class InfoUtilisationJeu {

    constructor() {
        this.debut = 0;
        this.transitionLancee = false;
        this.voixCommencerAt = 0;
        this.bouton = { x: 0, y: 0, w: 360, h: 74 };
        this.mainSurBouton = false;
        this.microDemarreParMain = false;
    }

    setup() {
        Config.selected.scene       = SCENE.INFO_UTILISATION_JEU;
        Config.mode.game            = MODE.JEU;
        Config.selected.dialogueLine = null;
        Config.selected.question     = null;
        this.debut = millis();
        this.transitionLancee = false;
        this.voixCommencerAt = 0;
        this.mainSurBouton = false;
        this.microDemarreParMain = false;
    }

    passer() {
        if (this.transitionLancee) return;
        this.transitionLancee = true;
        lancerTransition(() => {
            Config.setting.listeScene.niveauIsometrique.setup();
        });
    }

    commandeCommencerVocale() {
        this.voixCommencerAt = millis();
        if (this.mainSurBouton) this.passer();
    }

    draw() {
        const sw = SCREEN.CENTER.w;
        const sh = SCREEN.H;
        const contenu = this._contenu();
        const voixOk = millis() - this.voixCommencerAt < 2500;

        push();
        this._fond(sw, sh);

        fill(COULEURS.accent);
        noStroke();
        textAlign(CENTER, TOP);
        textSize(tailleElement("infoUtilisationJeu", "titre", 34));
        text(contenu.titre, sw / 2, 70);

        fill(COULEURS.texte);
        textSize(tailleElement("infoUtilisationJeu", "sousTitre", 18));
        text(contenu.sousTitre, sw / 2, 120);

        if (contenu.popup.actif) {
            this._popup(sw / 2, 165, contenu.popup.texte);
        }

        const gap = 36;
        const cardW = min(440, (sw - 80 - gap * 2) / 3);
        const cardH = 430;
        const startX = sw / 2 - (cardW * 3 + gap * 2) / 2;
        const y = 250;

        this._carteVoix(startX, y, cardW, cardH, contenu.bulles.voix);
        this._carteMains(startX + cardW + gap, y, cardW, cardH, contenu.bulles.mains);
        this._carteClavier(startX + (cardW + gap) * 2, y, cardW, cardH, contenu.bulles.clavier);

        this.bouton = { x: sw / 2 - 180, y: sh - 185, w: 360, h: 74 };
        this.mainSurBouton = this._mainSurBouton(this.bouton);
        if (this.mainSurBouton && !this.microDemarreParMain) {
            this.microDemarreParMain = true;
            VoixColis._demarrerApresGeste();
        }
        if (this.mainSurBouton && voixOk) this.passer();

        this._boutonCommencer(this.bouton, contenu.bouton, this.mainSurBouton, voixOk);

        fill(COULEURS.texteSombre);
        textAlign(CENTER, CENTER);
        textSize(tailleElement("infoUtilisationJeu", "textePasser", 14));
        text(contenu.textePasser, sw / 2, sh - 105);

        pop();
    }

    _contenu() {
        const cfg = Config.setting.infoUtilisationJeu || {};
        const bulles = cfg.bulles || {};
        const voix = bulles.voix || {};
        const mains = bulles.mains || {};
        const clavier = bulles.clavier || {};

        return {
            titre: cfg.titre || "AVANT DE COMMENCER",
            sousTitre: cfg.sousTitre || "Le jeu se controle avec ta voix, tes mains et quelques touches.",
            popup: {
                actif: !(cfg.popup && cfg.popup.actif === false),
                texte: (cfg.popup && cfg.popup.texte) || "Utilisez votre main ou votre voix pour interagir avec le jeu.",
            },
            bouton: {
                texte: (cfg.bouton && cfg.bouton.texte) || "COMMENCER",
                statutAttente: (cfg.bouton && cfg.bouton.statutAttente) || 'Pose ta main sur le bouton et dis "commencer".',
                statutMainOk: (cfg.bouton && cfg.bouton.statutMainOk) || 'Main detectee. Dis "commencer".',
                statutVoixOk: (cfg.bouton && cfg.bouton.statutVoixOk) || "Commande vocale detectee. Pose ta main sur le bouton.",
            },
            textePasser: cfg.textePasser || 'Main sur le bouton + dites "commencer"',
            bulles: {
                voix: {
                    titre: voix.titre || "VOIX",
                    lignes: Array.isArray(voix.lignes) ? voix.lignes : [],
                },
                mains: {
                    titre: mains.titre || "MAINS",
                    lignes: Array.isArray(mains.lignes) ? mains.lignes : [],
                },
                clavier: {
                    titre: clavier.titre || "CLAVIER / SOURIS",
                    lignes: Array.isArray(clavier.lignes) ? clavier.lignes : [],
                },
            },
        };
    }

    _popup(cx, y, texte) {
        const w = 680;
        const h = 54;
        const x = cx - w / 2;
        const pulse = sin(frameCount * 0.08) * 0.5 + 0.5;

        noStroke();
        fill(0, 0, 0, 95);
        rect(x + 6, y + 6, w, h, 12);

        fill(10, 28, 42, 235);
        stroke(COULEURS.vert + "cc");
        strokeWeight(1.5);
        rect(x, y, w, h, 12);

        noStroke();
        fill(COULEURS.vert + "44");
        ellipse(x + 34, y + h / 2, 26 + pulse * 8);
        fill(COULEURS.vert);
        ellipse(x + 34, y + h / 2, 10);

        fill(COULEURS.texte);
        textAlign(CENTER, CENTER);
        textSize(tailleElement("infoUtilisationJeu", "popupTexte", 20));
        text(texte, cx + 18, y + h / 2, w - 90);
    }

    _mainSurBouton(bouton) {
        let hand = Config.variable.hands && Config.variable.hands[0];
        if (!hand || !hand.keypoints) return false;

        let points = [8, 9, 12, 0];
        return points.some(index => {
            let p = hand.keypoints[index];
            return p
                && p.x >= bouton.x
                && p.x <= bouton.x + bouton.w
                && p.y >= bouton.y
                && p.y <= bouton.y + bouton.h;
        });
    }

    clicSurBoutonCommencer() {
        let m = mouseLocalCenter();
        if (!m) return false;
        let b = this.bouton;
        let dedans = m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h;
        if (dedans) this.passer();
        return dedans;
    }

    _boutonCommencer(b, contenu, mainOk, voixOk) {
        const actif = mainOk && voixOk;
        const couleur = actif ? COULEURS.vert : (mainOk ? COULEURS.accent : COULEURS.texteSombre);
        const pulse = sin(frameCount * 0.09) * 0.5 + 0.5;

        noStroke();
        fill(0, 0, 0, 110);
        rect(b.x + 8, b.y + 8, b.w, b.h, 16);

        fill(actif ? 6 : 5, actif ? 36 : 16, actif ? 20 : 30, 235);
        stroke(couleur + (mainOk ? "ff" : "99"));
        strokeWeight(mainOk ? 3 : 1.5);
        rect(b.x, b.y, b.w, b.h, 16);

        if (mainOk || voixOk) {
            noFill();
            stroke(couleur + "66");
            strokeWeight(3);
            rect(b.x - 8 - pulse * 5, b.y - 8 - pulse * 5, b.w + 16 + pulse * 10, b.h + 16 + pulse * 10, 20);
        }

        noStroke();
        fill(couleur);
        textAlign(CENTER, CENTER);
        textSize(tailleElement("infoUtilisationJeu", "boutonTexte", 22));
        text(contenu.texte, b.x + b.w / 2, b.y + 28);

        fill(actif ? COULEURS.vert : COULEURS.texteSombre);
        textSize(tailleElement("infoUtilisationJeu", "boutonStatut", 14));
        let statut = mainOk ? contenu.statutMainOk : (voixOk ? contenu.statutVoixOk : contenu.statutAttente);
        text(statut, b.x + b.w / 2, b.y + 54);
    }

    _fond(sw, sh) {
        noStroke();
        for (let y = 0; y < sh; y += 4) {
            fill(lerpColor(color(5, 10, 24), color(9, 25, 45), y / sh));
            rect(0, y, sw, 4);
        }

        for (let i = 0; i < 80; i++) {
            const x = (i * 137 + frameCount * 0.25) % sw;
            const y = (i * 71) % sh;
            fill(255, 255, 255, 35 + sin(frameCount * 0.03 + i) * 25);
            ellipse(x, y, i % 3 + 1);
        }
    }

    _carte(x, y, w, h, titre, couleur) {
        noStroke();
        fill(0, 0, 0, 90);
        rect(x + 8, y + 8, w, h, 10);

        fill(6, 15, 30, 230);
        stroke(couleur);
        strokeWeight(1.5);
        rect(x, y, w, h, 10);

        noStroke();
        fill(couleur);
        textAlign(CENTER, TOP);
        textSize(tailleElement("infoUtilisationJeu", "titreBulle", 24));
        text(titre, x + w / 2, y + 26);
    }

    _carteVoix(x, y, w, h, contenu) {
        this._carte(x, y, w, h, contenu.titre, COULEURS.accent);

        const cx = x + w / 2;
        const cy = y + 115;
        const pulse = sin(frameCount * 0.08) * 0.5 + 0.5;

        noFill();
        stroke(COULEURS.accent + "55");
        strokeWeight(3);
        arc(cx - 58, cy, 42 + pulse * 18, 42 + pulse * 18, -0.65, 0.65);
        arc(cx + 58, cy, 42 + pulse * 18, 42 + pulse * 18, PI - 0.65, PI + 0.65);

        noStroke();
        fill(COULEURS.accent);
        rect(cx - 18, cy - 48, 36, 78, 18);
        rect(cx - 4, cy + 30, 8, 35, 4);
        rect(cx - 34, cy + 62, 68, 8, 4);

        fill(COULEURS.texte);
        textAlign(LEFT, TOP);
        const tailleTexte = tailleElement("infoUtilisationJeu", "texteBulle", 16);
        const interligne = max(42, tailleTexte * 1.9);
        textSize(tailleTexte);
        contenu.lignes.forEach((ligne, i) => {
            text(ligne, x + 38, y + 200 + i * interligne, w - 76, interligne);
        });
    }

    _carteMains(x, y, w, h, contenu) {
        this._carte(x, y, w, h, contenu.titre, COULEURS.vert);

        const cx = x + w / 2;
        const cy = y + 128;
        const pinch = sin(frameCount * 0.09) * 10;

        stroke(COULEURS.vert);
        strokeWeight(8);
        strokeCap(ROUND);
        line(cx - 50, cy + 45, cx - 25 + pinch, cy - 8);
        line(cx + 50, cy + 45, cx + 25 - pinch, cy - 8);
        line(cx - 18, cy + 48, cx - 8, cy - 40);
        line(cx + 18, cy + 48, cx + 8, cy - 40);

        noStroke();
        fill(COULEURS.vert + "55");
        ellipse(cx - 25 + pinch, cy - 8, 26);
        ellipse(cx + 25 - pinch, cy - 8, 26);
        fill(COULEURS.vert);
        ellipse(cx - 25 + pinch, cy - 8, 12);
        ellipse(cx + 25 - pinch, cy - 8, 12);

        fill(COULEURS.texte);
        textAlign(LEFT, TOP);
        const tailleTexte = tailleElement("infoUtilisationJeu", "texteBulle", 16);
        const interligne = max(42, tailleTexte * 1.9);
        textSize(tailleTexte);
        contenu.lignes.forEach((ligne, i) => {
            text(ligne, x + 38, y + 200 + i * interligne, w - 76, interligne);
        });
    }

    _carteClavier(x, y, w, h, contenu) {
        this._carte(x, y, w, h, contenu.titre, COULEURS.accentChaud);

        const cx = x + w / 2;
        const cy = y + 112;

        noStroke();
        fill(COULEURS.accentChaud + "33");
        rect(cx - 86, cy - 38, 172, 92, 10);

        const touches = [
            { t: "Z", x: cx,      y: cy - 24 },
            { t: "Q", x: cx - 38, y: cy + 14 },
            { t: "S", x: cx,      y: cy + 14 },
            { t: "D", x: cx + 38, y: cy + 14 },
            { t: "E", x: cx - 64, y: cy + 56 },
            { t: "F", x: cx + 64, y: cy + 56 },
        ];

        touches.forEach(k => {
            fill(20, 14, 8, 235);
            stroke(COULEURS.accentChaud);
            strokeWeight(1.5);
            rect(k.x - 16, k.y - 14, 32, 28, 6);
            noStroke();
            fill(COULEURS.accentChaud);
            textAlign(CENTER, CENTER);
            textSize(14);
            text(k.t, k.x, k.y);
        });

        fill(COULEURS.texte);
        textAlign(LEFT, TOP);
        const tailleTexte = tailleElement("infoUtilisationJeu", "texteBulle", 16);
        const interligne = max(42, tailleTexte * 1.9);
        textSize(tailleTexte);
        contenu.lignes.forEach((ligne, i) => {
            text(ligne, x + 38, y + 200 + i * interligne, w - 76, interligne);
        });
    }

    _barreProgression(x, y, w, h, progression) {
        noStroke();
        fill(0, 0, 0, 120);
        rect(x, y, w, h, h / 2);
        fill(COULEURS.accent);
        rect(x, y, w * progression, h, h / 2);
    }
}

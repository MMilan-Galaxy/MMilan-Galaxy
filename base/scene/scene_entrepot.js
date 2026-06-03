// =============================================
// scene_entrepot.js
// Scène entrepôt : recherche et récupération des colis
// Dépend de : constants.js, config.js, dialogues.js, utils.js, ui.js
// =============================================

class JeuRechercheColis {

    constructor(nombrePiece, listeColis) {
        this.nombrePiece         = nombrePiece;
        this.listeColis          = listeColis;
        this.listeColisCharger   = new Array(listeColis.length).fill(null);
        this.pieceSelectionnee   = Math.floor(nombrePiece / 2);
        this.architecture        = [];
        this.nombreColisMaxPiece = 8;
        this.etape               = 0;
        this.animColis           = {};
        this.animationsPince     = []; // animations de pince qui remontent vers le haut

        // Timer "prends ton temps" : déclenché toutes les 30s après fin du dialogue
        this._dialogueFini       = false;
        this._dernierPrendsTonTemps = 0; // millis() du dernier déclenchement

        for (let i = 0; i < nombrePiece; i++) this.architecture.push([]);
        this._construireSalle();
    }

    // ---- Répartit les colis au hasard dans les salles ----
    _construireSalle() {
        let tmpListeColis = [...this.listeColis];

        while (tmpListeColis.length > 0) {
            let indexSalle = Math.floor(Math.random() * this.nombrePiece);
            if (this.architecture[indexSalle].length < this.nombreColisMaxPiece) {
                let indexColis = Math.floor(Math.random() * tmpListeColis.length);
                Config.setting.ordreRemplissage.push(tmpListeColis[indexColis]);
                this.architecture[indexSalle].push(tmpListeColis[indexColis]);
                tmpListeColis.splice(indexColis, 1);
            }
        }

        this.architecture.forEach((tableau) => {
            // Complète avec des colis inconnus
            let nbAleatoire  = Math.floor(Math.random() * (this.nombreColisMaxPiece - 2)) + 2;
            let nbColisAjout = nbAleatoire - tableau.length;
            for (let i = 0; i < nbColisAjout; i++) {
                tableau.push({ ...Config.setting.colisInconnu });
            }
            melangerTableau(tableau);

            // Calcule les positions d'affichage en grille
            let size = tailleElement("colis", "taille", Config.setting.colis.size);
            let x    = Config.setting.colis.x;
            let y    = Config.setting.colis.y;
            tableau.forEach((colis, index) => {
                if (index % 4 == 0 && index > 0) {
                    y += size + 80;
                    x  = Config.setting.colis.x;
                }
                colis.position = createVector(x, y);
                x += size + 40;
            });
        });
    }

    // ---- Appelé lors du changement de scène vers l'entrepôt ----
    setup() {
        const dialoguesRechercheColis = Dialogue.jeuRechercheColis.explication;

        Config.selected.scene         = SCENE.JEU_RECHERCHE_COLIS;
        Config.selected.dialogueScene = Dialogue.jeuRechercheColis;
        Config.mode.game              = MODE.DIALOGUE;
        Config.currentStep.Dialogue   = 0;
        Config.selected.reponse       = 0;
        Config.selected.dialogueLine  = dialoguesRechercheColis[0] || null;
        Config.selected.question      = null;
        Config.selected.screen        = 1;
        Config.etat.tablette          = ETAT_TABLETTE.CLOSE;
        this.pieceSelectionnee        = 1;
        this._dialogueFini            = false;
        this._dernierPrendsTonTemps   = 0;

        // L'explication "recherche colis" se joue maintenant à l'arrivée
        // dans la scène jeuRechercheColis, par-dessus l'entrepôt.
        if (Config.selected.dialogueLine) jouerVoix(Config.selected.dialogueLine);
    }

    // ---- Bascule l'état de la tablette (ouvert / fermé) ----
    tablette() {
        Config.etat.tablette = Config.etat.tablette == ETAT_TABLETTE.OPEN
            ? ETAT_TABLETTE.CLOSE
            : ETAT_TABLETTE.OPEN;
    }

    draw() {
        if (this.etape == 0) {
            this._dessinePieceIndicateurs();
            this._affichagePiece();
            this._dessineAnimationsPince(); // pinces de récupération en cours

            // ---- Geste vocal : mise à jour (HUD géré globalement dans planet.js) ----
            if (Config.mode.game == MODE.JEU) {
                VoixColis.updateGeste();
            }
        }

        // ---- Dialogue fini → activer le timer "prends ton temps" ----
        if (Config.mode.game == MODE.JEU && !this._dialogueFini) {
            this._dialogueFini = true;
            this._dernierPrendsTonTemps = millis();
        }

        // ---- Timer "prends ton temps" toutes les 30s (seulement en mode JEU) ----
        if (this._dialogueFini && this.etape == 0 && Config.mode.game == MODE.JEU) {
            if (millis() - this._dernierPrendsTonTemps >= 30000) {
                jouerSonEntrepot("prends_ton_temps");
                this._dernierPrendsTonTemps = millis();
            }
        }

        // Tous les colis sont chargés → transition vers le vaisseau
        if (this.etape == 1) {
            // Retour au hub isométrique après le mini-jeu
            lancerTransition(() => {
                Config.progression.missionIndex = 1;
                Config.progression.porteOuverte = null;
                Config.setting.listeScene.niveauIsometrique.setup();
            });
            this.etape = 2;
        }

        // Tablette au premier plan
        if (Config.etat.tablette == ETAT_TABLETTE.OPEN) {
            this._affichageTablette();
        }

        // Dialogue par-dessus l'entrepôt, uniquement pendant l'explication rechercheColis
        if (Config.mode.game == MODE.DIALOGUE) {
            let dialogues = _getDialoguesActifs();
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

    // ---- Affiche les colis de la pièce active ----
    _affichagePiece() {
        this.pieceSelectionnee = Config.selected.screen;
        let size = tailleElement("colis", "taille", Config.setting.colis.size);

        this.architecture[this.pieceSelectionnee].forEach((colis) => {
            if (!this.listeColisCharger.includes(colis)) {
                this._affichageColis(colis.position.x, colis.position.y, size, colis.colis, colis);
            }
        });
    }

    // ---- Dessine un colis individuel ----
    _affichageColis(x, y, size, nom, colis) {
        let estVrai = Config.setting.listeColis.includes(colis);

        // Hover souris (désactivé si main présente) ou hover main (index tip kp8)
        let hover = mouseInRect(colis.position, size);
        if (!hover && mainDetectee()) {
            let hand = Config.variable.hands[0];
            if (hand && hand.keypoints && hand.keypoints[8]) {
                let kp = hand.keypoints[8];
                hover = kp.x >= colis.position.x && kp.x <= colis.position.x + size
                     && kp.y >= colis.position.y && kp.y <= colis.position.y + size;
            }
        }

        // Highlight spécial si geste pouce+majeur actif sur ce colis
        let gesteActif = false;
        if (hover && mainDetectee()) {
            let hand = Config.variable.hands[0];
            if (hand && hand.distancePouceMajeur != null) {
                gesteActif = hand.distancePouceMajeur < VoixColis.SEUIL_GESTE_PX;
            }
        }

        let sc = hover ? 1.04 : 1.0;

        push();
        translate(x + size / 2, y + size / 2);
        scale(sc);
        translate(-(size / 2), -(size / 2));

        // Ombre
        noStroke();
        fill(0, 0, 0, 60);
        rect(4, 6, size, size, 12);

        // Corps
        if (estVrai) {
            fill(20, 60, 110);
            stroke(gesteActif ? "#ffcc00" : COULEURS.accent);
        } else {
            fill(30, 30, 50);
            stroke(gesteActif ? "#ffcc00" : COULEURS.texteSombre);
        }
        strokeWeight(gesteActif ? 3 : 1.5);
        rect(0, 0, size, size, 10);

        // Halo jaune si geste actif
        if (gesteActif) {
            noFill();
            stroke("#ffcc0066");
            strokeWeight(8 + sin(frameCount * 0.15) * 3);
            rect(-4, -4, size + 8, size + 8, 14);
        }

        // Ruban en croix
        stroke(estVrai ? COULEURS.accent : "#334");
        strokeWeight(1);
        line(size * 0.5, 10, size * 0.5, size - 10);
        line(10, size * 0.5, size - 10, size * 0.5);

        // Nom
        noStroke();
        fill(estVrai ? COULEURS.accent : COULEURS.texteSombre);
        textSize(tailleElement("colis", "texte", 14));
        textAlign(CENTER, CENTER);
        text(nom.toUpperCase(), size / 2, size / 2);

        pop();
    }

    // ---- Charge un bon colis : son succès + animation pince ----
    declencherSuccesColis(colis, indexOrder) {
        // Son succès
        let sonSucces = Config.BanqueAudio["succes"];
        if (sonSucces && !sonSucces.isPlaying()) sonSucces.play();

        // Charger le colis
        this.listeColisCharger[indexOrder] = colis;
        if (!this.listeColisCharger.includes(null)) this.etape = 1;

        // Lancer l'animation pince depuis la position du colis
        let size = tailleElement("colis", "taille", Config.setting.colis.size);
        this.animationsPince.push({
            nom    : colis.colis,
            x      : colis.position.x + size / 2,
            y      : colis.position.y + size / 2,
            vy     : -6,        // vitesse verticale vers le haut
            vx     : 0,
            opacite: 255,
            scale  : 1.0,
            phase  : 0,         // 0 = fermeture pince, 1 = montée, 2 = sortie
            tick   : 0,
        });
    }

    // ---- Anime et dessine les pinces de récupération ----
    _dessineAnimationsPince() {
        let size = tailleElement("colis", "taille", Config.setting.colis.size);
        this.animationsPince = this.animationsPince.filter(a => a.opacite > 0);
        this.animationsPince.forEach(a => {
            a.tick++;
            if (a.phase === 0) {
                if (a.tick >= 30) { a.phase = 1; a.tick = 0; }
            }
            if (a.phase === 1) {
                a.y      += a.vy;
                a.vy     -= 0.15;
                a.scale   = max(0.1, a.scale - 0.012);
                a.opacite = max(0, a.opacite - 3.5);
            }
            push();
            translate(a.x, a.y);
            scale(a.scale);
            let pinceOuverture = a.phase === 0 ? map(a.tick, 0, 30, 40, 0) : 0;
            let al = a.opacite;
            // Boite colis
            noStroke();
            fill(20, 60, 110, al);
            rect(-size / 2, -size / 2, size, size, 10);
            stroke(0, 220, 100, al);
            strokeWeight(2);
            noFill();
            rect(-size / 2, -size / 2, size, size, 10);
            // Nom du colis
            noStroke();
            fill(0, 220, 100, al);
            textSize(tailleElement("colis", "animationTexte", 14)); textAlign(CENTER, CENTER);
            text(a.nom.toUpperCase(), 0, 0);
            // Bras gauche de la pince
            stroke(255, 140, 0, al);
            strokeWeight(5);
            noFill();
            let bx = size / 2 + 10;
            line(-bx - pinceOuverture, -size / 2 - 20, -bx - pinceOuverture, size / 2 + 10);
            line(-bx - pinceOuverture, size / 2 + 10, -size / 2, size / 2 + 10);
            // Bras droit de la pince
            line(bx + pinceOuverture, -size / 2 - 20, bx + pinceOuverture, size / 2 + 10);
            line(bx + pinceOuverture, size / 2 + 10, size / 2, size / 2 + 10);
            // Cable vers le haut
            stroke(255, 140, 0, al * 0.67);
            strokeWeight(3);
            line(0, -size / 2 - 20, 0, -size / 2 - 80);
            // Halo vert (phase 0)
            if (a.phase === 0) {
                let pulse = sin(a.tick * 0.3) * 0.5 + 0.5;
                noStroke();
                fill(0, 255, 100, pulse * 60);
                ellipse(0, 0, size * 1.6, size * 1.6);
            }
            pop();
        });
    }

    // ---- Indicateurs de navigation entre les pièces ----
    _dessinePieceIndicateurs() {
        let cx    = SCREEN.CENTER.w / 2;
        let cy    = 32;
        let ecart = 24;

        push();
        noStroke();
        for (let i = 0; i < this.nombrePiece; i++) {
            let x = cx + (i - Math.floor(this.nombrePiece / 2)) * ecart;
            fill(i == this.pieceSelectionnee ? COULEURS.accent : COULEURS.texteSombre + "88");
            ellipse(x, cy, i == this.pieceSelectionnee ? 12 : 8);
        }

        // Flèches de navigation
        fill(COULEURS.accent + "99");
        textSize(tailleElement("tablette", "titre", 20));
        textAlign(CENTER, CENTER);
        if (this.pieceSelectionnee > 0)                    text("◄", cx - 60, cy);
        if (this.pieceSelectionnee < this.nombrePiece - 1) text("►", cx + 60, cy);
        pop();
    }

    // ---- Affiche un aperçu des colis d'une pièce adjacente (écrans latéraux) ----
    dessineZoneLaterale(indexPiece, cote) {
        if (indexPiece < 0 || indexPiece >= this.nombrePiece) return;
        let piece = this.architecture[indexPiece];
        let sw    = SCREEN.LEFT.w;
        let sh    = SCREEN.H;

        push();

        // Fond semi-transparent
        noStroke();
        fill(8, 20, 40, 200);
        rect(0, 0, sw, sh);

        // Titre de la zone
        fill(COULEURS.accent + "cc");
        textSize(22);
        textAlign(CENTER, TOP);
        noStroke();
        text("ZONE " + (indexPiece + 1), sw / 2, 30);

        // Ligne séparatrice
        stroke(COULEURS.accent + "44");
        strokeWeight(1);
        line(sw * 0.1, 64, sw * 0.9, 64);

        // Aperçu des colis en grille (version réduite)
        let colisSize = tailleElement("colis", "apercuTaille", 110);
        let colPar4   = 4;
        let marginX   = (sw - (colPar4 * colisSize + (colPar4 - 1) * 20)) / 2;
        let startY    = 90;
        let cx        = marginX;
        let cy        = startY;

        piece.forEach((colis, index) => {
            if (index % colPar4 == 0 && index > 0) {
                cy += colisSize + 20;
                cx  = marginX;
            }

            let estVrai   = Config.setting.listeColis.includes(colis);
            let estCharge = this.listeColisCharger.includes(colis);

            push();
            noStroke();

            if (estCharge) {
                // Colis déjà chargé → grisé
                fill(20, 20, 30, 120);
                rect(cx, cy, colisSize, colisSize, 8);
                fill(COULEURS.texteSombre + "66");
                textSize(tailleElement("colis", "cocheApercu", 11));
                textAlign(CENTER, CENTER);
                text("✓", cx + colisSize / 2, cy + colisSize / 2);
            } else {
                // Ombre
                fill(0, 0, 0, 50);
                rect(cx + 3, cy + 4, colisSize, colisSize, 8);

                // Corps
                if (estVrai) {
                    fill(20, 60, 110);
                    stroke(COULEURS.accent);
                } else {
                    fill(25, 25, 45);
                    stroke(COULEURS.texteSombre + "66");
                }
                strokeWeight(1.5);
                rect(cx, cy, colisSize, colisSize, 8);

                // Ruban
                stroke(estVrai ? COULEURS.accent + "88" : "#33466688");
                strokeWeight(1);
                line(cx + colisSize * 0.5, cy + 8, cx + colisSize * 0.5, cy + colisSize - 8);
                line(cx + 8, cy + colisSize * 0.5, cx + colisSize - 8, cy + colisSize * 0.5);

                // Nom
                noStroke();
                fill(estVrai ? COULEURS.accent : COULEURS.texteSombre + "aa");
                textSize(tailleElement("colis", "apercuTexte", 11));
                textAlign(CENTER, CENTER);
                text(colis.colis.toUpperCase(), cx + colisSize / 2, cy + colisSize / 2);
            }
            pop();
            cx += colisSize + 20;
        });

        // Flèche de navigation indiquant le sens
        fill(COULEURS.accent + "bb");
        textSize(36);
        textAlign(CENTER, CENTER);
        noStroke();
        if (cote === "gauche") {
            text("◄", sw / 2, sh - 50);
            fill(COULEURS.texteSombre);
            textSize(14);
            text("← Flèche gauche", sw / 2, sh - 20);
        } else {
            text("►", sw / 2, sh - 50);
            fill(COULEURS.texteSombre);
            textSize(14);
            text("Flèche droite →", sw / 2, sh - 20);
        }

        pop();
    }

    // ---- Tablette : affiche le manifeste de chargement ----
    _affichageTablette() {
        let sX  = Config.setting.tablette.sizeX;
        let sY  = Config.setting.tablette.sizeY;
        let tX  = SCREEN.CENTER.w - sX - 40;
        let tY  = SCREEN.H - sY - 20;
        let esp = Config.setting.tablette.spaceTextColis;

        push();

        // Ombre
        noStroke();
        fill(0, 0, 0, 80);
        rect(tX + 8, tY + 8, sX, sY, 30);

        // Corps tablette
        fill(COULEURS.tablette);
        stroke(COULEURS.accent);
        strokeWeight(1.5);
        rect(tX, tY, sX, sY, 25);

        // Écran intérieur
        fill(8, 20, 35);
        noStroke();
        rect(tX + 20, tY + 20, sX - 40, sY - 40, 15);

        // Titre
        fill(COULEURS.accent);
        textAlign(CENTER, TOP);
        textSize(20);
        text(Config.setting.nomJeu.toUpperCase(), tX + sX / 2, tY + 40);

        // Séparateur
        stroke(COULEURS.accent + "55");
        strokeWeight(1);
        line(tX + 40, tY + 75, tX + sX - 40, tY + 75);

        // Sous-titre
        noStroke();
        fill(COULEURS.texteSombre);
        textSize(tailleElement("tablette", "sousTitre", 12));
        textAlign(LEFT, TOP);
        text("ORDRE DE LIVRAISON :", tX + 40, tY + 88);

        // Liste des colis avec statut
        textSize(tailleElement("tablette", "ligneColis", 16));
        this.listeColis.forEach((colis, index) => {
            let charger = this.listeColisCharger[index] != null;
            let yPos    = tY + 125 + esp * index;

            // Pastille statut
            fill(charger ? COULEURS.vert : COULEURS.rouge);
            noStroke();
            ellipse(tX + 55, yPos + 8, 10);

            fill(charger ? COULEURS.vert : COULEURS.texte);
            textAlign(LEFT, TOP);
            text(
                (index + 1) + ".  " + colis.colis.toUpperCase() + "  →  " + colis.planet.toUpperCase(),
                tX + 70, yPos
            );
        });

        // Bouton fermer
        fill(COULEURS.accentChaud + "aa");
        noStroke();
        rect(tX + sX / 2 - 40, tY + sY - 55, 80, 28, 8);
        fill(COULEURS.texte);
        textAlign(CENTER, CENTER);
        textSize(tailleElement("tablette", "bouton", 13));
        text("[F]  Fermer", tX + sX / 2, tY + sY - 41);

        pop();
    }
}

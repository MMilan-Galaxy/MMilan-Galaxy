
// ---- Déverrouille l'audio + le micro au premier geste utilisateur ----
// p5.sound et SpeechRecognition nécessitent tous les deux un geste avant de fonctionner.
function _activerAudioApresGeste() {
    if (!Config.variable.voixIntroJouee) {
        Config.variable.voixIntroJouee = true;
        // Déverrouille l'AudioContext p5.sound (obligatoire sur Chrome)
        if (typeof getAudioContext === "function") {
            getAudioContext().resume();
        }
        // La voix du patron est lancée uniquement quand on interagit avec lui.
    }
    VoixColis._demarrerApresGeste();
}

// =============================================
// input.js
// Gestion des entrées clavier et souris (fonctions p5.js)
// Dépend de : constants.js, config.js, utils.js, screen.js
// =============================================


function keyPressed() {

    // ---- Premier geste : audio + micro ----
    _activerAudioApresGeste();

    // ---- TOUCHE E : avancer le dialogue ----
    if (key == 'e' || key == 'E') {
        if (Config.mode.game == MODE.DIALOGUE) {

            if (Config.selected.dialogueLine && Config.selected.dialogueLine.type == "question") {
                Config.selected.dialogueLine.reponse[Config.selected.reponse].action();
            }

            let dialogues = _getDialoguesActifs();
            if (!dialogues) return;

            Config.currentStep.Dialogue++;
            Config.selected.reponse = 0;

            if (Config.currentStep.Dialogue < dialogues.length) {
                let prochaineLigne = dialogues[Config.currentStep.Dialogue];
                jouerVoix(prochaineLigne);
            } else {
                Config.mode.game            = MODE.JEU;
                Config.currentStep.Dialogue = dialogues.length;
                if (Config.variable.sonActuel && Config.variable.sonActuel.isPlaying()) {
                    Config.variable.sonActuel.stop();
                }

                // Si le dialogue vient du hub isométrique, on reste dans la scène
                // isométrique et on ouvre seulement la porte liée à la mission.
                if (Config.selected.scene == SCENE.NIVEAU_ISOMETRIQUE
                    && Config.setting.listeScene.niveauIsometrique) {
                    Config.setting.listeScene.niveauIsometrique.finDialoguePatron();
                }
            }
            return false;
        }

    }

    // ---- FLÈCHE BAS : réponse suivante ----
    if (keyCode == DOWN_ARROW && Config.mode.game == MODE.DIALOGUE) {
        if (Config.selected.question && Config.selected.reponse < Config.selected.question.length - 1) {
            Config.selected.reponse++;
        }
    }

    // ---- FLÈCHE HAUT : réponse précédente ----
    if (keyCode == UP_ARROW && Config.mode.game == MODE.DIALOGUE) {
        if (Config.selected.reponse > 0) Config.selected.reponse--;
    }

    // ---- FLÈCHE GAUCHE : pièce précédente ----
    if (keyCode == LEFT_ARROW && Config.mode.game == MODE.JEU
        && Config.selected.scene == SCENE.JEU_RECHERCHE_COLIS) {
        if (Config.selected.screen > 0) Config.selected.screen--;
    }

    // ---- FLÈCHE DROITE : pièce suivante ----
    if (keyCode == RIGHT_ARROW && Config.mode.game == MODE.JEU
        && Config.selected.scene == SCENE.JEU_RECHERCHE_COLIS) {
        let jeu = Config.setting.listeScene.jeuRechercheColis;
        if (Config.selected.screen < jeu.architecture.length - 1) Config.selected.screen++;
    }

    // ---- TOUCHE F : ouvrir / fermer la tablette ----
    if ((key == 'f' || key == 'F') && Config.mode.game == MODE.JEU
        && Config.selected.scene == SCENE.JEU_RECHERCHE_COLIS) {
        Config.setting.listeScene.jeuRechercheColis.tablette();
    }

    // Interactions du hub isométrique
    if ((key == 'e' || key == 'E') && Config.mode.game == MODE.JEU && Config.selected.scene == SCENE.NIVEAU_ISOMETRIQUE) {
        Config.setting.listeScene.niveauIsometrique.interaction();
    }

    // DÉPLACEMENTS ISOMÉTRIQUES : gérés en continu via keyIsDown() dans JoueurIso.update()
    if (Config.mode.game == MODE.JEU && Config.selected.scene == SCENE.NIVEAU_ISOMETRIQUE) {
        if ([UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW].includes(keyCode)) return false;
    }
}


function mousePressed() {
    // Premier geste : audio + micro
    _activerAudioApresGeste();
}


function mouseReleased() {
    // Plus besoin de gérer l'essence par clic — le pincement main le fait
}


function mouseDragged() {
    if (Config.selected.scene == SCENE.PREPARATION_VAISSEAU) {
        let pv    = Config.setting.listeScene.preparationVaisseau;
        let delta = mouseY - pmouseY;

        // ---- Frein : fallback souris, si aucune main n'est détectée ----
        if (pv.zone == "frein" && !mainDetectee()) {
            pv.freinCurseurRatio = constrain(pv.freinCurseurRatio + delta / 180, 0.08, 0.92);
            pv._validerEtatFreinDepuisRatio();
        }
    }
}


function mouseClicked() {
    if (Config.selected.scene == SCENE.INFO_UTILISATION_JEU
        && Config.setting.listeScene.infoUtilisationJeu
        && Config.setting.listeScene.infoUtilisationJeu.clicSurBoutonCommencer()) {
        return false;
    }
    // ---- Entrepôt : clic sur un colis ----
    if (Config.selected.scene == SCENE.JEU_RECHERCHE_COLIS && Config.mode.game == MODE.JEU) {
        let jeu   = Config.setting.listeScene.jeuRechercheColis;
        let piece = jeu.architecture[jeu.pieceSelectionnee];

        piece.forEach((colis) => {
            if (mouseInRect(colis.position)) {
                if (Config.setting.listeColis.includes(colis)) {
                    let indexOrder       = Config.setting.listeColis.indexOf(colis);
                    let precedentCharger = jeu.listeColisCharger[indexOrder - 1] != null || indexOrder == 0;

                    if (jeu.listeColisCharger[indexOrder] != null) {
                        // Déjà chargé, rien à faire
                    } else if (!precedentCharger) {
                        jouerSonEntrepot("respecte_ordre");
                    } else {
                        jeu.declencherSuccesColis(colis, indexOrder);
                    }
                } else if (colis.colis !== "?") {
                    jouerSonEntrepot("pas_bon_colis");
                }
            }
        });
    }

    // ---- Vaisseau : navigation entre les zones ----
    if (Config.selected.scene == SCENE.PREPARATION_VAISSEAU && Config.mode.game == MODE.JEU) {
        let pv = Config.setting.listeScene.preparationVaisseau;

        // ---- Cockpit : voyants via mouseInRect (coords locales zone centrale) ----
        if (pv.zone == "cokpit") {
            pv.signaux.forEach((signal) => {
                // signal.position = coin haut-gauche du bouton, signal.w = largeur
                if (mouseInRectWH(signal.position, signal.w, signal.h)) {
                    pv.zone = signal.name;
                }
            });
        }

        // ---- Essence : clic sur la zone moteur du vaisseau → entre en mode essence ----
        else if (pv.zone == "cokpit_vers_essence") {
            // (géré par le bloc cockpit ci-dessus)
        }

        // ---- Vue essence : clic sur zone moteur = couler, clic ailleurs = retour cockpit ----
        else if (pv.zone == "essence") {
            if (!pv._hoverZoneMoteur()) {
                // Clic hors du réservoir → retour cockpit
                pv.zone = "cokpit";
                Config.etat.essenceCoule = false;
            }
            // Si clic sur le moteur → géré par mousePressed (maintien du clic)
        }

        // ---- Frein : géré par mouseDragged ----
    }
}

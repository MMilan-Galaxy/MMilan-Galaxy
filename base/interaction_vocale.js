// =============================================
// interaction_vocale.js — version optimisée
// Reconnaissance vocale globale + commandes rapides + geste colis
// =============================================

const VoixColis = {

    // ---- État interne ----
    actif           : false,
    reconnaissance  : null,
    _motDetecteAt   : 0,
    _gestureAt      : 0,
    _restartTimeout : null,
    _enErreurReseau : false,
    _demandeInit    : false,
    _gesteDisponible: false,
    FENETRE_MS      : 1500,

    // Transcription affichée à l'écran
    _transcriptActuel  : "",
    _transcriptFinal   : "",
    _transcriptFinalAt : 0,
    TRANSCRIPT_DUREE_MS: 2400,

    // Seuil pincement pouce/majeur en px vidéo brute
    SEUIL_GESTE_PX: 60,

    // Anti-doublon commandes vocales
    _cooldowns: {},
    _verrousCommandes: {},
    _utterancesTraitees: {},
    _lastCleanupCommandesAt: 0,
    _sessionReconnaissanceId: 0,
    _lastNavTranscript: "",
    _lastNavTimeout: null,
    _phrasesCommandesBloquees: {},

    // Regex précompilées : évite de recréer des tableaux/regex à chaque résultat micro
    RE_MOTS_COLIS     : /\b(prends|prendre|prend|prends-le|prends-la|take|take this)\b|prends ça|prends cela|prends ca|je prends/i,
    RE_VALIDATION     : /\b(ok|oui|ouais|aller|allez|continuer|continue|suivant|next|go)\b/i,
    RE_OPEN           : /\b(open)\b/i,
    RE_PATRON         : /\b(patron)\b/i,
    RE_SORTIR         : /\b(sortir|sors|quitter|retour|cockpit|cokpit)\b/i,
    RE_COMMENCER      : /\b(commencer|commence|demarrer|demarre|start)\b/i,
    RE_TABLETTE       : /\b(tablette|tablet)\b/i,
    RE_MAP            : /\b(map|carte|navigation)\b/i,
    RE_ALLER          : /\b(aller|allez|go|vas-y|destination)\b/i,
    RE_GAUCHE_GLOBAL  : /\b(gauche|left)\b/gi,
    RE_DROITE_GLOBAL  : /\b(droite|right)\b/gi,

    // ---- init() : appelé au setup(), en attente du premier geste ----
    init() {
        if (this.actif && this.reconnaissance) {
            debugLog("[VoixColis] Déjà actif.");
            return;
        }
        let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            console.warn("[VoixColis] Web Speech API non supportée. Chrome + localhost requis.");
            return;
        }
        if (this._gesteDisponible) {
            this._gesteDisponible = false;
            this._creerReconnaissance(SR);
        } else {
            this._demandeInit = true;
            debugLog("[VoixColis] En attente du premier geste utilisateur.");
        }
    },

    // ---- Appelé par input.js à chaque clic / touche ----
    _demarrerApresGeste() {
        if (this.actif && this.reconnaissance) return;
        let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        if (this._demandeInit) {
            this._demandeInit     = false;
            this._gesteDisponible = false;
            this._creerReconnaissance(SR);
        } else {
            this._gesteDisponible = true;
        }
    },

    _normaliserTranscript(txt) {
        return (txt || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    },

    _empreinteTranscript(txt) {
        let mots = this._normaliserTranscript(txt).split(/\s+/).filter(Boolean);
        // Supprime les répétitions immédiates : "ok ok" devient "ok",
        // "a gauche a gauche" devient "a gauche" côté blocage.
        let compact = [];
        for (let mot of mots) {
            if (compact[compact.length - 1] !== mot) compact.push(mot);
        }
        return compact.join(" ");
    },

    _commandeCritiqueFinalOnly() {
        return Config.setting.commandesCritiquesFinalUniquement !== false;
    },

    _phraseCommandeAutorisee(cle, signature, transcript, delaiMs) {
        let now = performance.now();
        let phrase = this._empreinteTranscript(transcript);
        let key = cle + "::" + (signature || "") + "::" + phrase;
        let delai = delaiMs || Config.setting.delaiBlocageMemePhraseVocaleMs || 2400;
        let dernier = this._phrasesCommandesBloquees[key] || 0;
        if (now - dernier < delai) return false;
        this._phrasesCommandesBloquees[key] = now;

        if (now - this._lastCleanupCommandesAt > 10000) {
            for (let k in this._phrasesCommandesBloquees) {
                if (now - this._phrasesCommandesBloquees[k] > 12000) delete this._phrasesCommandesBloquees[k];
            }
        }
        return true;
    },

    _commandeAutorisee(cle, delaiMs) {
        let now = performance.now();
        let dernier = this._cooldowns[cle] || 0;
        if (now - dernier < delaiMs) return false;
        this._cooldowns[cle] = now;
        return true;
    },

    // Autorise une commande une seule fois par morceau de phrase reconnu.
    // Cela évite le double déclenchement interim → final de Web Speech API.
    _commandeVocaleAutorisee(cle, signature, delaiMs, sourceId = "") {
        let now       = performance.now();
        let sig       = signature || cle;
        let verrouKey = cle + "::" + sig;
        let verrouMs  = Math.max(delaiMs || 0, Config.setting.delaiBlocageMemeCommandeVocaleMs || 1200);

        if (sourceId) {
            let utteranceKey = verrouKey + "::" + sourceId;
            if (this._utterancesTraitees[utteranceKey]) return false;
        }

        let dernierVerrou = this._verrousCommandes[verrouKey] || 0;
        if (now - dernierVerrou < verrouMs) return false;
        if (!this._commandeAutorisee(cle, delaiMs || verrouMs)) return false;

        this._verrousCommandes[verrouKey] = now;
        if (sourceId) {
            this._utterancesTraitees[verrouKey + "::" + sourceId] = now;
        }

        // Nettoyage léger pour éviter que les dictionnaires grossissent pendant une longue session.
        if (now - this._lastCleanupCommandesAt > 10000) {
            this._lastCleanupCommandesAt = now;
            for (let k in this._verrousCommandes) {
                if (now - this._verrousCommandes[k] > 8000) delete this._verrousCommandes[k];
            }
            for (let k in this._utterancesTraitees) {
                if (now - this._utterancesTraitees[k] > 12000) delete this._utterancesTraitees[k];
            }
        }
        return true;
    },

    // ---- Crée et configure SpeechRecognition ----
    _creerReconnaissance(SR) {
        if (this.reconnaissance) {
            try { this.reconnaissance.abort(); } catch(e) {}
            this.reconnaissance = null;
        }
        clearTimeout(this._restartTimeout);
        this._enErreurReseau = false;
        this._sessionReconnaissanceId++;

        this.reconnaissance                = new SR();
        this.reconnaissance.lang           = "fr-FR";
        this.reconnaissance.continuous     = true;
        this.reconnaissance.interimResults = true;

        this.reconnaissance.onresult = (event) => {
            let commandesInterim = Config.setting.commandesVocalesInterimRapide !== false;
            let dialogueInterim  = Config.setting.dialogueVocalInterimRapide !== false;
            let now = performance.now();

            for (let i = event.resultIndex; i < event.results.length; i++) {
                let transcript = this._normaliserTranscript(event.results[i][0].transcript);
                if (!transcript) continue;

                let estFinal = event.results[i].isFinal;
                let sourceId = this._sessionReconnaissanceId + ":" + i;

                if (estFinal) {
                    debugLog("[🎤 FINAL]", transcript);
                    this._transcriptActuel  = "";
                    this._transcriptFinal   = transcript;
                    this._transcriptFinalAt = now;
                } else {
                    // Pas de console.log ici : les logs interim saturent vite le navigateur.
                    this._transcriptActuel = transcript;
                }

                // Commandes rapides : sur interim + final pour réduire la latence.
                if (estFinal || commandesInterim) {
                    this._traiterNavigationVocale(transcript, estFinal, sourceId);
                }

                if (estFinal || dialogueInterim) {
                    this._traiterDialogueVocal(transcript, estFinal, sourceId);
                }

                // Mots-clés colis : seulement dans la scène concernée.
                if (Config.selected.scene === SCENE.JEU_RECHERCHE_COLIS
                    && Config.mode.game === MODE.JEU
                    && this.RE_MOTS_COLIS.test(transcript)) {
                    this._motDetecteAt = now;
                    this._tenteDeclenchement();
                }
            }
        };

        this.reconnaissance.onerror = (event) => {
            if (event.error === "no-speech" || event.error === "aborted") return;
            console.warn("[VoixColis] Erreur :", event.error);
            if (["network", "audio-capture", "service-not-allowed"].includes(event.error)) {
                this._enErreurReseau = true;
            }
        };

        this.reconnaissance.onend = () => {
            if (!this.actif) return;
            let delai = this._enErreurReseau ? 700 : (Config.setting.delaiRedemarrageMicroMs || 80);
            this._enErreurReseau = false;
            this._restartTimeout = setTimeout(() => {
                if (!this.actif) return;
                try {
                    this.reconnaissance.start();
                } catch(e) {
                    debugLog("[VoixColis] Recréation instance :", e.message);
                    let S = window.SpeechRecognition || window.webkitSpeechRecognition;
                    if (S) this._creerReconnaissance(S);
                }
            }, delai);
        };

        this.actif = true;
        try {
            this.reconnaissance.start();
            debugLog("[VoixColis] Micro démarré.");
        } catch(e) {
            console.warn("[VoixColis] Impossible de démarrer :", e);
        }
    },

    // ---- stop() : usage manuel si besoin ----
    stop() {
        this.actif = false;
        clearTimeout(this._restartTimeout);
        if (this.reconnaissance) {
            try { this.reconnaissance.abort(); } catch(e) {}
            this.reconnaissance = null;
        }
        debugLog("[VoixColis] Micro arrêté.");
    },

    // ---- Geste pouce+majeur (colis entrepôt) ----
    updateGeste() {
        if (Config.selected.scene !== SCENE.JEU_RECHERCHE_COLIS || Config.mode.game !== MODE.JEU) return;
        let hand = Config.variable.hands && Config.variable.hands[0];
        if (!hand) return;
        let dist = hand.distancePouceMajeur != null ? hand.distancePouceMajeur : 9999;
        if (dist < this.SEUIL_GESTE_PX) {
            this._gestureAt = performance.now();
            this._tenteDeclenchement();
        }
    },

    // =========================================================
    // DIALOGUE VOCAL — toutes scènes, types discussion + question
    // =========================================================
    _traiterDialogueVocal(transcript, estFinal = true, sourceId = "") {
        if (Config.mode.game !== MODE.DIALOGUE) return;
        // Les validations de dialogue changent immédiatement d'étape.
        // On les garde donc sur le résultat final uniquement pour empêcher
        // le cas classique : interim "ok" puis final "ok" = deux lignes sautées.
        if (!estFinal && (Config.setting.dialogueVocalInterimRapide === false || this._commandeCritiqueFinalOnly())) return;

        let dialogues = _getDialoguesActifs();
        if (!dialogues) return;

        let step = Config.currentStep.Dialogue;
        if (step >= dialogues.length) return;

        let ligne = dialogues[step];
        if (!ligne) return;
        Config.selected.dialogueLine = ligne;

        let estValidation = this.RE_VALIDATION.test(transcript);

        if (ligne.type === "discussion") {
            if (!estValidation) return;
            let delaiDialogue = Config.setting.delaiAntiDoubleDialogueMs || Config.setting.delaiAntiDoubleCommandeVocaleMs || 1200;
            if (!this._phraseCommandeAutorisee("dialogue-validation", "validation", transcript, Config.setting.delaiBlocageMemePhraseVocaleMs)) return;
            if (!this._commandeVocaleAutorisee("dialogue-validation", "validation", delaiDialogue, sourceId)) return;
            debugLog("[🎤 Dialogue] Validation discussion →", transcript);
            this._avancerDialogue(dialogues);
            return;
        }

        if (ligne.type === "question") {
            let reponses = ligne.reponse;
            if (!reponses || reponses.length === 0) return;

            let indexDetecte = this._detecterIndexReponse(transcript, reponses);
            if (indexDetecte >= 0 && indexDetecte < reponses.length) {
                Config.selected.reponse = indexDetecte;
                debugLog("[🎤 Dialogue] Réponse sélectionnée :", indexDetecte + 1);
            }

            if (estValidation) {
                let delaiDialogue = Config.setting.delaiAntiDoubleDialogueMs || Config.setting.delaiAntiDoubleCommandeVocaleMs || 1200;
                if (!this._phraseCommandeAutorisee("dialogue-question", "validation", transcript, Config.setting.delaiBlocageMemePhraseVocaleMs)) return;
                if (!this._commandeVocaleAutorisee("dialogue-question", "validation", delaiDialogue, sourceId)) return;
                let choix = Config.selected.reponse;
                if (choix >= 0 && choix < reponses.length) {
                    debugLog("[🎤 Dialogue] Confirmation réponse", choix + 1);
                    reponses[choix].action();
                    this._avancerDialogue(dialogues);
                }
            }
        }
    },

    _detecterIndexReponse(transcript, reponses) {
        let matchChiffre = transcript.match(/\b([1-9])\b/);
        if (matchChiffre) return parseInt(matchChiffre[1], 10) - 1;

        const motsNombres = ["zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
        for (let i = 1; i < motsNombres.length; i++) {
            if (transcript.includes(motsNombres[i])) return i - 1;
        }

        for (let i = 0; i < reponses.length; i++) {
            let phrase = this._normaliserTranscript(reponses[i].phrase);
            let motsSignificatifs = phrase.split(/\s+/).filter(m => m.length > 3);
            if (motsSignificatifs.length === 0) continue;
            let matches = 0;
            for (let m of motsSignificatifs) {
                if (transcript.includes(m)) matches++;
            }
            if (matches >= Math.max(1, Math.floor(motsSignificatifs.length * 0.4))) return i;
        }
        return -1;
    },

    _avancerDialogue(dialogues) {
        Config.currentStep.Dialogue++;
        Config.selected.reponse = 0;

        if (Config.currentStep.Dialogue < dialogues.length) {
            let prochaineLigne = dialogues[Config.currentStep.Dialogue];
            Config.selected.dialogueLine = prochaineLigne;
            jouerVoix(prochaineLigne);
        } else {
            Config.mode.game            = MODE.JEU;
            Config.currentStep.Dialogue = dialogues.length;
            if (Config.variable.sonActuel && Config.variable.sonActuel.isPlaying()) {
                Config.variable.sonActuel.stop();
            }

            if (Config.selected.scene == SCENE.NIVEAU_ISOMETRIQUE
                && Config.setting.listeScene.niveauIsometrique) {
                Config.setting.listeScene.niveauIsometrique.finDialoguePatron();
            }
        }
    },

    // =========================================================
    // NAVIGATION VOCALE
    // =========================================================
    _traiterNavigationVocale(transcript, estFinal = true, sourceId = "") {
        let delai = Config.setting.delaiAntiDoubleNavigationMs || Config.setting.delaiAntiDoubleCommandeVocaleMs || 700;

        if (Config.selected.scene === SCENE.INFO_UTILISATION_JEU
            && Config.mode.game === MODE.JEU) {

            let info = Config.setting.listeScene.infoUtilisationJeu;
            if (!info || !this.RE_COMMENCER.test(transcript)) return;
            if (!this._commandeVocaleAutorisee("info-commencer", "commencer", delai, sourceId)) return;
            info.commandeCommencerVocale();
            debugLog("[Info] Commande commencer");
            return;
        }

        // ---- Hub isométrique : parler au patron ou entrer dans la porte proche ----
        if (Config.selected.scene === SCENE.NIVEAU_ISOMETRIQUE
            && Config.mode.game === MODE.JEU) {

            let hub = Config.setting.listeScene.niveauIsometrique;
            if (!hub) return;

            if (this.RE_PATRON.test(transcript)) {
                if (!this._commandeVocaleAutorisee("patron", "patron", delai, sourceId)) return;
                if (hub.interactionPatronProche()) debugLog("[🎤 Nav] Dialogue patron");
                return;
            }

            if (this.RE_OPEN.test(transcript)) {
                if (!this._commandeVocaleAutorisee("open", "open", delai, sourceId)) return;
                if (hub.entrerPorteProche()) debugLog("[🎤 Nav] Entrée porte proche");
                return;
            }
        }

        // ---- Préparation vaisseau : cockpit / essence / frein ----
        if (Config.selected.scene === SCENE.PREPARATION_VAISSEAU
            && Config.mode.game === MODE.JEU) {

            let sceneVaisseau = Config.setting.listeScene.preparationVaisseau;
            if (!sceneVaisseau) return;

            if ((sceneVaisseau.zone === "essence" || sceneVaisseau.zone === "frein")
                && this.RE_SORTIR.test(transcript)) {
                if (!this._commandeVocaleAutorisee("sortir-vaisseau", "sortir", delai, sourceId)) return;
                sceneVaisseau.sortirVersCockpit();
                debugLog("[🎤 Nav] Sortie sous-vue → cockpit");
                return;
            }

            if (/\bessence\b/i.test(transcript)) {
                if (!this._commandeVocaleAutorisee("zone-essence", "essence", delai, sourceId)) return;
                sceneVaisseau.zone = "essence";
                debugLog("[🎤 Nav] Zone essence");
                return;
            }

            if (/\bfrein\b/i.test(transcript)) {
                if (!this._commandeVocaleAutorisee("zone-frein", "frein", delai, sourceId)) return;
                sceneVaisseau.zone = "frein";
                debugLog("[🎤 Nav] Zone frein");
                return;
            }
        }

        // ---- Démarrage vaisseau : map + aller ----
        if (Config.selected.scene === SCENE.DEMARAGE_VAISSEAU
            && Config.mode.game === MODE.JEU) {

            let dem = Config.setting.listeScene.demarageVaisseau;
            if (!dem) return;

            if (this.RE_MAP.test(transcript)) {
                if (!this._commandeVocaleAutorisee("map", "map", delai, sourceId)) return;
                dem.ouvrirMap();
                debugLog("[🎤 Nav] Map ouverte");
                return;
            }

            if (this.RE_ALLER.test(transcript)) {
                if (!this._commandeVocaleAutorisee("aller-map", "aller", delai, sourceId)) return;
                dem.validerPlaneteSurvolee();
                return;
            }
        }

        // ---- Entrepôt : tablette + gauche / droite ----
        if (Config.selected.scene !== SCENE.JEU_RECHERCHE_COLIS) return;
        if (Config.mode.game !== MODE.JEU) return;

        let jeu = Config.setting.listeScene.jeuRechercheColis;
        if (!jeu) return;

        if (this.RE_TABLETTE.test(transcript)) {
            if (!estFinal && this._commandeCritiqueFinalOnly()) return;
            if (!this._phraseCommandeAutorisee("tablette", "tablette", transcript, Config.setting.delaiBlocageMemePhraseVocaleMs)) return;
            if (!this._commandeVocaleAutorisee("tablette", "tablette", delai, sourceId)) return;
            jeu.tablette();
            debugLog("[🎤 Nav] Tablette →", Config.etat.tablette);
            return;
        }

        let matchGauche = transcript.match(this.RE_GAUCHE_GLOBAL);
        let matchDroite = transcript.match(this.RE_DROITE_GLOBAL);
        let nbGauche    = matchGauche ? matchGauche.length : 0;
        let nbDroite    = matchDroite ? matchDroite.length : 0;

        if (nbGauche === 0 && nbDroite === 0) return;
        if (!estFinal && this._commandeCritiqueFinalOnly()) return;

        // Une phrase vocale ne doit changer qu'une seule zone, même si le micro renvoie
        // "à gauche", puis "à gauche" en final, ou "à gauche à gauche".
        let direction = null;
        if (nbGauche > 0 && nbDroite > 0) {
            direction = nbGauche >= nbDroite ? "gauche" : "droite";
        } else {
            direction = nbGauche > 0 ? "gauche" : "droite";
        }

        let delaiZone = Config.setting.delaiAntiDoubleChangementZoneMs || Math.max(900, delai);
        if (!this._phraseCommandeAutorisee("zone-colis-" + direction, direction, transcript, Config.setting.delaiBlocageMemePhraseVocaleMs)) return;
        if (!this._commandeVocaleAutorisee("zone-colis-" + direction, direction, delaiZone, sourceId)) return;

        if (direction === "gauche") {
            if (Config.selected.screen > 0) Config.selected.screen--;
        } else if (direction === "droite") {
            if (Config.selected.screen < jeu.architecture.length - 1) Config.selected.screen++;
        }
    },

    // ---- Coïncidence voix + geste → sélection colis ----
    _tenteDeclenchement() {
        let now    = performance.now();
        let voixOk = (now - this._motDetecteAt) < this.FENETRE_MS;
        let gestOk = (now - this._gestureAt)    < this.FENETRE_MS;
        if (voixOk && gestOk) {
            this._motDetecteAt = 0;
            this._gestureAt    = 0;
            this._selectionnerColisUnderHand();
        }
    },

    _selectionnerColisUnderHand() {
        if (Config.selected.scene !== SCENE.JEU_RECHERCHE_COLIS) return;
        if (Config.mode.game !== MODE.JEU) return;
        let jeu = Config.setting.listeScene.jeuRechercheColis;
        if (!jeu) return;
        let hand = Config.variable.hands && Config.variable.hands[0];
        if (!hand || !hand.keypoints) return;
        let kpIndex = hand.keypoints[8];
        if (!kpIndex) return;

        let size  = tailleElement("colis", "taille", Config.setting.colis.size);
        let piece = jeu.architecture[jeu.pieceSelectionnee];
        if (!piece) return;

        for (let colis of piece) {
            if (!colis.position) continue;
            let inX = kpIndex.x >= colis.position.x && kpIndex.x <= colis.position.x + size;
            let inY = kpIndex.y >= colis.position.y && kpIndex.y <= colis.position.y + size;
            if (!inX || !inY) continue;

            if (Config.setting.listeColis.includes(colis)) {
                let indexOrder       = Config.setting.listeColis.indexOf(colis);
                let precedentCharger = jeu.listeColisCharger[indexOrder - 1] != null || indexOrder == 0;
                if (jeu.listeColisCharger[indexOrder] != null) {
                    // déjà chargé
                } else if (!precedentCharger) {
                    jouerSonEntrepot("respecte_ordre");
                } else {
                    debugLog("[VoixColis] Colis chargé :", colis.colis);
                    jeu.declencherSuccesColis(colis, indexOrder);
                }
            } else {
                jouerSonEntrepot("pas_bon_colis");
            }
            return; // un seul colis par déclenchement
        }
    },

    // =========================================================
    // HUD : pastille micro + bulle transcription
    // =========================================================
    dessineHUD() {
        let sw  = SCREEN.CENTER.w;
        let sh  = SCREEN.H;
        let now = performance.now();

        let voixRec   = (now - this._motDetecteAt)      < 800;
        let gestRec   = (now - this._gestureAt)         < 800;
        let finalVisi = (now - this._transcriptFinalAt) < this.TRANSCRIPT_DUREE_MS;

        let texteAffiche = this._transcriptActuel || (finalVisi ? this._transcriptFinal : "");
        let estInterim   = !!this._transcriptActuel;

        push();

        // Pastille micro
        let ix = sw - 44;
        let iy = 22;
        let colMicro = !this.actif          ? "#555555"
                     : voixRec && gestRec   ? COULEURS.vert
                     : voixRec              ? "#ffcc00"
                     : gestRec              ? COULEURS.accent
                     : texteAffiche         ? "#ffffff"
                     : COULEURS.texteSombre + "88";

        if (this.actif && (voixRec || gestRec)) {
            noStroke();
            fill(colMicro + "44");
            ellipse(ix, iy, 38 + sin(frameCount * 0.3) * 5);
        }
        noStroke();
        fill(colMicro);
        ellipse(ix, iy, 24);
        fill(this.actif ? "#000" : "#333");
        textSize(12);
        textAlign(CENTER, CENTER);
        text("🎤", ix, iy);

        // Bulle transcription — textWidth seulement quand le texte change.
        if (texteAffiche) {
            let padX   = 20;
            let bulleY = sh - 58;
            let tw = getCachedTextWidth(texteAffiche, 18, 700) + padX * 2;
            let th = 42;
            let bx = sw / 2 - tw / 2;

            noStroke();
            fill(0, 0, 0, 160);
            rect(bx, bulleY - 12, tw, th, 10);
            stroke(voixRec ? "#ffcc00" : (estInterim ? COULEURS.texteSombre + "88" : COULEURS.vert + "cc"));
            strokeWeight(estInterim ? 1 : 2);
            noFill();
            rect(bx, bulleY - 12, tw, th, 10);
            noStroke();
            fill(voixRec ? "#ffcc00" : (estInterim ? COULEURS.texteSombre : COULEURS.texte));
            textSize(18);
            textAlign(CENTER, CENTER);
            text(texteAffiche, sw / 2, bulleY + th / 2 - 12);
        }

        let hint = "";
        if (!this.actif) {
            hint = "Micro inactif";
        } else if (Config.mode.game === MODE.DIALOGUE) {
            let ligne = Config.selected.dialogueLine;
            hint = ligne && ligne.type === "question"
                ? '🎤  dites "un" ou "deux" + "ok" pour répondre'
                : '🎤  dites "ok" / "suivant" pour continuer';
        } else if (Config.selected.scene === SCENE.INFO_UTILISATION_JEU) {
            hint = 'Pose ta main sur COMMENCER + dites "commencer"';
        } else if (Config.selected.scene === SCENE.NIVEAU_ISOMETRIQUE) {
            hint = '🎤  dites "patron" près de lui ou "open" près d’une porte ouverte';
        } else if (Config.selected.scene === SCENE.PREPARATION_VAISSEAU) {
            let pv = Config.setting.listeScene.preparationVaisseau;
            hint = pv && (pv.zone === "essence" || pv.zone === "frein")
                ? '🎤  dites "sortir" pour revenir au cockpit'
                : '🎤  dites "essence" ou "frein"';
        } else if (Config.selected.scene === SCENE.DEMARAGE_VAISSEAU) {
            let dem = Config.setting.listeScene.demarageVaisseau;
            hint = dem && dem.mapOuverte
                ? '🎤  main sur une planète + dites "aller"'
                : (dem && dem.vueLointaineActive ? '🎤  dites "map" pour ouvrir la carte' : '✋  restez sur le bouton rouge pour démarrer');
        } else if (Config.selected.scene === SCENE.JEU_RECHERCHE_COLIS) {
            hint = voixRec && gestRec ? "✓ Sélection !"
                 : voixRec           ? "Mot-clé reconnu — faites le geste"
                 : gestRec           ? 'Geste détecté — dites "prends ça"'
                 : '🎤  "prends ça" + geste  •  "gauche" / "droite" pour naviguer';
        }

        if (hint) {
            noStroke();
            fill(COULEURS.texteSombre + "99");
            textSize(10);
            textAlign(CENTER, BOTTOM);
            text(hint, sw / 2, sh - 10);
        }

        pop();
    },
};

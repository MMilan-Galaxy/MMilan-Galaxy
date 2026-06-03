// =============================================
// config.js
// État global et configuration du jeu
// Dépend de : constants.js
// =============================================

const Config = {

    setting: {
        planet       : null,
        // screenSizeX  : 1280, // simple screen
        screenSizeX  : 5760, // triple screen
        screenSizeY  : 1200,
        // Si true, le canvas utilise les dimensions ci-dessus au lieu de windowWidth/windowHeight.
        // Le .bat lance Chrome en 5760x1200 donc pas besoin de forcer ici.
        forcerResolutionAffichage: false,
        nomJeu       : "Space Delivery",

        // ---- Tailles centralisees ----
        // Les valeurs a 1 gardent le rendu actuel. Augmenter une valeur agrandit
        // les elements concernes, la diminuer les reduit.
        // Exemples :
        // - textes.global = 1.2 agrandit tous les textes de 20%.
        // - graphiques.rect = 0.9 reduit uniquement les rectangles.
        // - graphiques.images = 1.15 agrandit les images dessinees avec image().
        tailles: {
            actif: true,
            textes: {
                global: 1,
                min: 1,
                max: 300,
                // Pour des cas precis, utiliser tailleTexte(base, "cle") dans le code
                // puis definir ici : elements: { "timer": 32 }.
                elements: {},
            },
            graphiques: {
                global: 1,
                formes: 1,
                contours: 1,
                rect: 1,
                ellipse: 1,
                circle: 1,
                square: 1,
                arc: 1,
                line: 1,
                triangle: 1,
                quad: 1,
                point: 1,
                images: 1,
                // Pour des cas precis, utiliser tailleGraphique(base, "rect", "cle") dans le code
                // puis definir ici : elements: { "nomElement": 1.3 }.
                elements: {},
            },
            // Reglages directs par type d'element du jeu.
            // Ici les valeurs sont des tailles finales en pixels.
            elements: {
                bulle: {
                    hauteur: 220,
                    nom: 20,
                    texte: 25,
                    reponse: 25,
                    continuer: 20,
                },
                colis: {
                    taille: 250,
                    texte: 35,
                    animationTexte: 36,
                    apercuTaille: 110,
                    apercuTexte: 30,
                    cocheApercu: 11,
                },
                tablette: {
                    titre: 30,
                    sousTitre: 25,
                    ligneColis: 30,
                    bouton: 13,
                },
                infoUtilisationJeu: {
                    titre: 40,
                    sousTitre: 32,
                    titreBulle: 30,
                    texteBulle: 25,
                    popupTexte: 20,
                    boutonTexte: 22,
                    boutonStatut: 14,
                    textePasser: 20,
                },
            },
        },

        bullSize     : 220,
        bullMargin   : 40,
        bullPadding  : 35,
        bullPosition : null,

        colis: { x: 160, y: 80, size: 180 },

        pompeEssence: { x: 400, y: 200, size: 460 },

        tablette: {
            sizeX         : 550,
            sizeY         : 760,
            margin        : 50,
            spaceTextColis: 40,
            textX         : 20,
            textY         : 120,
        },

        timerX      : 0,   // calculé au setup()
        timerY      : 0,
        timerMargin : 60,
        timerSize   : 28,

        time: null,

        listeColis: [
            { planet: "Manger",  colis: "Fraise", position: null },
            { planet: "Manger",  colis: "Pomme",  position: null },
            { planet: "Musique", colis: "Disque", position: null },
        ],
        colisInconnu: { planet: "inconnu", colis: "?", position: null },

        ordreRemplissage: [],

        listeScene: {
            intro               : null,
            infoUtilisationJeu   : null,
            jeuRechercheColis   : null,
            preparationVaisseau : null,
            demarageVaisseau    : null,
            niveauIsometrique   : null,
        },

        rythmeEssence: 5,

        // ---- Hub isométrique ----
        // Textes affiches dans la scene d'information avant le hub isometrique.
        // Modifier ces valeurs permet de changer les bulles sans toucher au code.
        infoUtilisationJeu: {
            titre: "AVANT DE COMMENCER",
            sousTitre: "Le jeu se controle avec ta voix, tes mains et quelques touches.",
            popup: {
                actif: true,
                texte: "Utilisez votre main ou votre voix pour interagir avec le jeu.",
            },
            bouton: {
                texte: "COMMENCER",
                statutAttente: 'Pose ta main + dis "commencer", ou clique sur le bouton.',
                statutMainOk: 'Main detectee. Dis "commencer".',
                statutVoixOk: "Commande vocale detectee. Pose ta main sur le bouton.",
            },
            textePasser: 'Main + voix, ou clic souris sur COMMENCER',
            bulles: {
                voix: {
                    titre: "VOIX",
                    lignes: [
                        'Dis "patron" pour parler au patron.',
                        'Dis "open" devant une porte ouverte.',
                        'Dis "essence", "frein" ou "sortir" dans le vaisseau.',
                        'Apres le decollage, dis "map" pour la carte.',
                    ],
                },
                mains: {
                    titre: "MAINS",
                    lignes: [
                        "Montre ta main a la camera.",
                        "Pince au-dessus d'un colis pour le prendre.",
                        "Pince pour faire couler l'essence.",
                        "Ecarte pouce + majeur pour controler le frein.",
                    ],
                },
                clavier: {
                    titre: "CLAVIER / SOURIS",
                    lignes: [
                        "Clique sur COMMENCER pour passer.",
                        "Utilise les fleches ou ZQSD pour te deplacer.",
                        "Appuie sur E pour interagir.",
                        "Appuie sur F pour ouvrir la tablette.",
                    ],
                },
            },
        },
        // Vitesse de déplacement du personnage dans la scène isométrique.
        vitesseDeplacementPersonnage: 3.5,
        // Distance max entre le joueur et le patron pour lancer son dialogue.
        distanceValidationPatron: 95,
        // Distance max entre le joueur et une porte ouverte pour valider l'entrée
        // avec la touche E ou la commande vocale "open".
        distanceValidationPorte: 105,

        // ---- Ravitaillement ----
        // Seuil de pincement en PIXELS VIDÉO (espace 640×480, AVANT remapping).
        // La distance est mesurée entre le bout du pouce (kp4) et l'index (kp8)
        // dans les coordonnées brutes de la webcam (0→640px).
        // Valeurs typiques : doigts joints ≈ 10-20 px, bien écartés ≈ 80-150 px.
        // Augmenter si trop dur à déclencher, diminuer si trop sensible.
        pinchSeuilPx: 50,

        // ---- Frein ----
        // Le curseur du frein suit le milieu entre le pouce (kp4) et le majeur (kp12).
        // La distance est mesurée dans l'image caméra brute 320×240.
        // Seuil conseillé : 28→45 px selon la caméra et la distance de la main.
        distanceFreinPouceMajeurPx: 34,
        // Hystérésis : une fois accroché, le frein reste contrôlé jusqu'à ce seuil plus bas.
        distanceFreinPouceMajeurRelachePx: 24,
        // Lissage du levier : 0 = très lent, 1 = suit instantanément la main.
        lissageFreinMain: 0.35,
        // Marge visuelle autour du rail : l'utilisateur n'a pas besoin d'être exactement sur le rail.
        margeZoneFreinMainPx: 80,
        // Le frein est validé quand le curseur est assez haut dans le rail.
        ratioValidationFrein: 0.28,

        // ---- Transition vers le vaisseau ----
        dureeAnimationEntreeVaisseauMs: 2600,

        // ---- Démarrage vaisseau ----
        // Temps pendant lequel la main doit rester sur le bouton rouge.
        tempsMaintienBoutonDemarageMs: 2200,
        // Le cockpit / bouton clignote en rouge pendant toute la séquence de décollage.
        dureeClignotementDecollageMs: 1600,
        // Durée de l'illusion de décollage derrière la vitre.
        dureeAnimationDecollageMs: 5200,
        // Délai total avant arrêt de l'animation de décollage et passage à la vue lointaine fixe.
        delaiVueLointaineApresDecollageMs: 6500,
        // Force de la secousse visuelle pendant le décollage.
        intensiteSecousseDecollage: 7,

        // ---- Carte / navigation spatiale ----
        planetesCarte: ["Manger", "Musique", "Casino", "Glace", "Forge"],
        rayonSelectionPlaneteCarte: 54,


        // ---- Performance / latence ----
        // Coupe les logs non indispensables. Les destinations de la map restent loggées.
        debugLogs: false,
        // Les commandes vocales sont exécutées dès les résultats intermédiaires du micro
        // pour éviter d'attendre la validation finale de SpeechRecognition.
        commandesVocalesInterimRapide: true,
        dialogueVocalInterimRapide: false,
        // Les commandes qui font avancer un état ne sont traitées que sur le résultat final
        // pour éviter le double déclenchement interim → final.
        commandesCritiquesFinalUniquement: true,
        delaiAntiDoubleCommandeVocaleMs: 650,
        // Les commandes vocales passent par interim + final. Ces délais évitent
        // qu'une même phrase déclenche deux actions d'affilée.
        delaiAntiDoubleDialogueMs: 2200,
        delaiAntiDoubleNavigationMs: 950,
        delaiAntiDoubleChangementZoneMs: 2200,
        delaiBlocageMemeCommandeVocaleMs: 2200,
        // Bloque temporairement une même phrase reconnue par le micro, même si Web Speech
        // la renvoie sous plusieurs formes successives.
        delaiBlocageMemePhraseVocaleMs: 2600,
        delaiRedemarrageMicroMs: 70,
        // Réduire le coût du rendu sur 5760×1200. Active ces options si tu veux debugger.
        afficherApercuCamera: false,
        afficherSqueletteMain: true,
        afficherDebugMain: false,
        limiterFrameRate: true,
        frameRateCible: 50,
        // Réduit la quantité d'étoiles/particules décoratives sans changer le gameplay.
        facteurQualiteDecor: 0.75,
    },

    currentStep: { Dialogue: 0 },

    selected: {
        dialogueScene : null,   // initialisé au setup
        dialogueLine  : null,
        question      : null,
        reponse       : 0,
        scene         : SCENE.INFO_UTILISATION_JEU,
        screen        : 1,
    },

    mode: { game: MODE.DIALOGUE },

    variable: {
        temps      : 0,
        tempsDebut : 0,
        timerEtat  : "off",
        handpose   : null,
        voixIntroJouee : false,   // true dès le premier geste → AudioContext déverrouillé
        video      : null,
        hands      : [],
        connexionsMain: null,
        sonActuel  : null,
    },

    etat: {
        tablette     : ETAT_TABLETTE.CLOSE,
        essenceCoule : false,
    },


    progression: {
        missionIndex      : 0,
        missions          : [SCENE.JEU_RECHERCHE_COLIS, SCENE.PREPARATION_VAISSEAU],
        porteOuverte      : null,
        dialogueActif     : null,
        missionDialogue   : null,
    },

    transition: {
        active    : false,
        alpha     : 0,      // 0 = transparent, 255 = opaque
        direction : "in",   // "in" = fondu au noir, "out" = fondu depuis le noir
        vitesse   : 6,
        callback  : null,   // fonction appelée au milieu de la transition
    },

    BanqueAudio : {},

}

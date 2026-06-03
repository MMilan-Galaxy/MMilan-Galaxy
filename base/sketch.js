// =============================================
// sketch.js
// Point d'entrée p5.js — setup() et draw() uniquement
// =============================================

// Résolution de la vidéo de détection — 320×240 est le sweet spot :
// assez grand pour que ml5 voie bien la main, assez petit pour tourner vite.
const VIDEO_W = 320;
const VIDEO_H = 240;

function dimensionsCanvasCible() {
    if (Config.setting.forcerResolutionAffichage) {
        return {
            w: Config.setting.screenSizeX || 5760,
            h: Config.setting.screenSizeY || 1200,
        };
    }
    return { w: windowWidth, h: windowHeight };
}

function recalculerZonesAffichage(canvasW, canvasH) {
    // 5760 × 1200 = 3 écrans de 1920 × 1200.
    // On garde le découpage en 3 zones égales pour que les scènes restent centrées.
    let sw = Math.floor(canvasW / 3);
    SCREEN.W         = sw;
    SCREEN.H         = canvasH;
    SCREEN.TOTAL_W   = canvasW;
    SCREEN.LEFT.x    = 0;
    SCREEN.LEFT.w    = sw;
    SCREEN.CENTER.x  = sw;
    SCREEN.CENTER.w  = sw;
    SCREEN.RIGHT.x   = sw * 2;
    SCREEN.RIGHT.w   = canvasW - sw * 2;

    Config.setting.screenSizeX = canvasW;
    Config.setting.screenSizeY = canvasH;
    Config.setting.timerX      = SCREEN.CENTER.w - Config.setting.timerMargin - 10;
    Config.setting.timerY      = Config.setting.timerMargin;
}

function windowResized() {
    let d = dimensionsCanvasCible();
    resizeCanvas(d.w, d.h);
    recalculerZonesAffichage(d.w, d.h);
}

function preload() {
    Config.variable.hands = [];
    // Préchargement des voix MP3 uniquement — handPose dans setup()
    prechargerVoix();
}

function setup() {
    let d = dimensionsCanvasCible();
    createCanvas(d.w, d.h);
    appliquerConfigTaillesP5();
    if (Config.setting.limiterFrameRate) frameRate(Config.setting.frameRateCible || 50);

    // ── Initialise les zones SCREEN selon la résolution configurée ───────
    // Nouveau format cible : 5760 × 1200 px, soit 3 zones de 1920 × 1200.
    recalculerZonesAffichage(d.w, d.h);

    // ── Vidéo petite et carrée pour ml5 ──────────────────────────────────
    // On demande explicitement 320×240 via contraintes getUserMedia pour forcer
    // la résolution réelle (pas juste le CSS de l'élément).
    Config.variable.video = createCapture({
        video: { width: VIDEO_W, height: VIDEO_H, facingMode: "user" },
        audio: false,
    });
    Config.variable.video.size(VIDEO_W, VIDEO_H);
    // On cache visuellement mais on laisse l'élément dans le DOM :
    // ml5 a besoin que la vidéo soit "jouée" — hide() suffit, pas remove().
    Config.variable.video.hide();

    // ── Initialisation handPose APRÈS setup() ─────────────────────────────
    // ml5 v1.x doit être initialisé quand le contexte WebGL est disponible.
    // runtime:"tfjs" évite le backend WebGL instable et utilise CPU/WASM → plus fiable.
    Config.variable.handPose = ml5.handPose(
        { maxHands: 1, flipped: false },
        () => {
            // Callback "modèle prêt" : on démarre la détection ici, pas avant
            Config.variable.connexionsMain = Config.variable.handPose.getConnections();
            Config.variable.handPose.detectStart(Config.variable.video, gotHands);
            debugLog("[HandPose] Modèle prêt, détection démarrée.");
        }
    );

    Config.setting.planet = new Planet();
    Config.setting.planet.setup();

    // Prépare la reconnaissance vocale dès le lancement — active pour tous les dialogues.
    // Le démarrage réel du micro attend le premier geste utilisateur (voir input.js).
    VoixColis.init();

    // jouerVoix() ici échouerait : AudioContext bloqué avant un geste utilisateur.
    // On pose un flag ; le premier clic/touche (input.js) lancera la voix + le micro.
    Config.variable.voixIntroJouee = false;
}

function draw() {
    Config.setting.planet.draw();
}

// =============================================
// CALLBACK ml5 handPose
// =============================================

function gotHands(results) {
    for (let i = 0; i < results.length; i++) {
        let hand = results[i];

        // ── Coords RAW (avant remapping) pour les calculs de distance ─────
        hand.keypointsRaw = hand.keypoints.map(kp => ({ x: kp.x, y: kp.y }));

        let pouce  = hand.keypointsRaw[4];   // bout du pouce
        let index  = hand.keypointsRaw[8];   // bout de l'index
        let majeur = hand.keypointsRaw[12];  // bout du majeur

        // Distance pouce/index (pincement essence)
        hand.distancePincement = (pouce && index)
            ? Math.hypot(pouce.x - index.x, pouce.y - index.y)
            : 9999;

        // Distance pouce/majeur (geste frein / saisie)
        hand.distancePouceMajeur = (pouce && majeur)
            ? Math.hypot(pouce.x - majeur.x, pouce.y - majeur.y)
            : 9999;

        // ── Remapping → espace local zone centrale avec miroir ──────────
        // On utilise les dimensions réelles du canvas (width, height) plutôt
        // que les constantes SCREEN fixes, pour que la main reste correcte
        // quelle que soit la résolution d'affichage (triple écran ou mono écran).
        let ecranLargeur = width / 3;   // largeur réelle d'un écran = 1/3 du canvas
        let ecranHauteur = height;       // hauteur = hauteur totale du canvas

        for (let j = 0; j < hand.keypoints.length; j++) {
            let kp = hand.keypoints[j];
            kp.x = map(kp.x, 0, VIDEO_W, ecranLargeur, 0);   // miroir horizontal
            kp.y = map(kp.y, 0, VIDEO_H, 0, ecranHauteur);
        }
    }

    Config.variable.hands = results;
}

/* ══════════════════════════════════════════════════════════
   shared/tracking.js
   Module partagé d'initialisation webcam + modèles ml5.js
   Utilisable par toutes les planètes et le jeu de base.
   
   Dépend de : p5.js, ml5.js (chargés en CDN)
   
   Usage :
     // Dans setup() :
     Tracking.init({ hand: true, body: false, face: false });
     
     // Dans draw() :
     let mains = Tracking.hands;       // tableau de résultats HandPose
     let corps = Tracking.bodies;      // tableau de résultats BodyPose
     let visages = Tracking.faces;     // tableau de résultats FaceMesh
     let video = Tracking.video;       // élément vidéo HTML5
   ══════════════════════════════════════════════════════════ */

const Tracking = {

    // ── Résultats (mis à jour en continu) ──
    hands:   [],
    bodies:  [],
    faces:   [],

    // ── Internals ──
    video:      null,
    _handModel: null,
    _bodyModel: null,
    _faceModel: null,
    _ready:     false,
    _config:    {},

    /**
     * Initialise la webcam + les modèles ml5 demandés.
     * @param {Object} opts
     * @param {boolean} opts.hand   - Activer HandPose (défaut: true)
     * @param {boolean} opts.body   - Activer BodyPose/MoveNet (défaut: false)
     * @param {boolean} opts.face   - Activer FaceMesh (défaut: false)
     * @param {number}  opts.maxHands - Nombre max de mains (défaut: 2)
     * @param {boolean} opts.flipped  - Miroir horizontal (défaut: true)
     * @param {number}  opts.videoW   - Largeur vidéo (défaut: 320)
     * @param {number}  opts.videoH   - Hauteur vidéo (défaut: 240)
     */
    init(opts = {}) {
        this._config = Object.assign({
            hand: true,
            body: false,
            face: false,
            maxHands: 2,
            flipped: true,
            videoW: 320,
            videoH: 240,
        }, opts);

        // Créer la capture vidéo (p5.js)
        if (typeof createCapture === 'function') {
            this.video = createCapture(VIDEO);
            this.video.size(this._config.videoW, this._config.videoH);
            this.video.hide();
        } else {
            console.warn('[Tracking] p5.js createCapture non disponible');
            return;
        }

        // Lancer les modèles demandés
        if (this._config.hand)  this._initHand();
        if (this._config.body)  this._initBody();
        if (this._config.face)  this._initFace();

        this._ready = true;
        console.log('[Tracking] Init OK —',
            this._config.hand ? 'HandPose' : '',
            this._config.body ? 'BodyPose' : '',
            this._config.face ? 'FaceMesh' : ''
        );
    },

    /** @returns {boolean} true si au moins un modèle tourne */
    isReady() {
        return this._ready;
    },

    // ── HandPose ──
    _initHand() {
        try {
            const opts = {
                maxHands: this._config.maxHands,
                flipped: this._config.flipped,
            };
            this._handModel = ml5.handPose(opts);
            this._handModel.detectStart(this.video, (results) => {
                this.hands = results || [];
            });
            console.log('[Tracking] HandPose démarré');
        } catch (e) {
            console.error('[Tracking] HandPose erreur:', e);
        }
    },

    // ── BodyPose (MoveNet) ──
    _initBody() {
        try {
            this._bodyModel = ml5.bodyPose('MoveNet', { flipped: this._config.flipped });
            this._bodyModel.detectStart(this.video, (results) => {
                this.bodies = results || [];
            });
            console.log('[Tracking] BodyPose démarré');
        } catch (e) {
            console.error('[Tracking] BodyPose erreur:', e);
        }
    },

    // ── FaceMesh ──
    _initFace() {
        try {
            this._faceModel = ml5.faceMesh({ maxFaces: 1, flipped: this._config.flipped });
            this._faceModel.detectStart(this.video, (results) => {
                this.faces = results || [];
            });
            console.log('[Tracking] FaceMesh démarré');
        } catch (e) {
            console.error('[Tracking] FaceMesh erreur:', e);
        }
    },

    // ── Helpers ──

    /**
     * Retourne le keypoint nommé de la première main détectée.
     * @param {number} index - Index du keypoint (8 = bout index, 4 = bout pouce, etc.)
     * @param {number} handIdx - Quelle main (0 = première)
     * @returns {{x, y, z}|null}
     */
    handPoint(index, handIdx = 0) {
        if (!this.hands[handIdx] || !this.hands[handIdx].keypoints) return null;
        return this.hands[handIdx].keypoints[index] || null;
    },

    /** Bout de l'index de la main handIdx */
    indexTip(handIdx = 0) {
        return this.handPoint(8, handIdx);
    },

    /** Bout du pouce de la main handIdx */
    thumbTip(handIdx = 0) {
        return this.handPoint(4, handIdx);
    },

    /** Distance entre index et pouce (pinch) */
    pinchDist(handIdx = 0) {
        const idx = this.indexTip(handIdx);
        const thb = this.thumbTip(handIdx);
        if (!idx || !thb) return Infinity;
        return dist(idx.x, idx.y, thb.x, thb.y);
    },

    /** true si les doigts pincent (distance < seuil) */
    isPinching(handIdx = 0, threshold = 30) {
        return this.pinchDist(handIdx) < threshold;
    },

    /** Position du nez (bodyPose) */
    nosePos() {
        if (!this.bodies[0] || !this.bodies[0].keypoints) return null;
        return this.bodies[0].keypoints[0] || null;
    },

    /** Arrête tous les modèles proprement */
    stop() {
        try { if (this._handModel) this._handModel.detectStop(); } catch(e) {}
        try { if (this._bodyModel) this._bodyModel.detectStop(); } catch(e) {}
        try { if (this._faceModel) this._faceModel.detectStop(); } catch(e) {}
        if (this.video) this.video.remove();
        this.hands = [];
        this.bodies = [];
        this.faces = [];
        this._ready = false;
        console.log('[Tracking] Arrêté');
    }
};

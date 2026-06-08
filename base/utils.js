// =============================================
// utils.js
// Fonctions utilitaires partagées
// Dépend de : config.js, screen.js
// =============================================


// Mélange un tableau en place (algorithme Fisher-Yates)
function melangerTableau(tableau) {
    for (let i = tableau.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tableau[i], tableau[j]] = [tableau[j], tableau[i]];
    }
    return tableau;
}


// Démarre le timer avec un nombre de minutes donné
function setTimer(minutes) {
    Config.setting.time        = minutes * 60;
    Config.variable.timerEtat  = "on";
    Config.variable.tempsDebut = 0;
}


// Retourne true si au moins une main est détectée par la caméra
function mainDetectee() {
    return Config.variable.hands && Config.variable.hands.length > 0;
}


// Vérifie si la souris est dans un carré (position = {x, y}, taille = côté)
// Les coordonnées de position sont LOCALES à la zone centrale (0→1920)
// La souris est désactivée si une main est détectée.
function mouseInRect(position, taille = tailleElement("colis", "taille", Config.setting.colis.size)) {
    if (mainDetectee()) return false; // main détectée → souris ignorée

    // On récupère les coordonnées souris en espace local centre
    let m = mouseLocalCenter();
    if (!m) return false; // souris hors de la zone centrale → aucune interaction

    return (
        m.x >= position.x &&
        m.x <= position.x + taille &&
        m.y >= position.y &&
        m.y <= position.y + taille
    );
}


// Vérifie si la souris est dans un rectangle quelconque (largeur ≠ hauteur)
// Les coordonnées sont LOCALES à la zone centrale (0→1920)
// La souris est désactivée si une main est détectée.
function mouseInRectWH(position, w, h) {
    if (mainDetectee()) return false; // main détectée → souris ignorée

    let m = mouseLocalCenter();
    if (!m) return false;
    return (
        m.x >= position.x &&
        m.x <= position.x + w &&
        m.y >= position.y &&
        m.y <= position.y + h
    );
}


// Démarre une transition fondu-au-noir → appelle callback() au milieu
function lancerTransition(callback) {
    if (Config.transition.active) return;
    Config.transition.active    = true;
    Config.transition.alpha     = 0;
    Config.transition.direction = "in";
    Config.transition.vitesse   = 5;
    Config.transition.callback  = callback;
}


// Renvoie la liste de dialogues correspondant à la scène active
function _getDialoguesActifs() {
    let scene = Config.selected.scene;
    if (scene == SCENE.INTRO)                return Dialogue.intro;
    if (scene == SCENE.INFO_UTILISATION_JEU) return null;
    if (scene == SCENE.JEU_RECHERCHE_COLIS)  return Dialogue.jeuRechercheColis.explication;
    if (scene == SCENE.PREPARATION_VAISSEAU) return Dialogue.preparationVaisseau.debutMission;
    if (scene == SCENE.DEMARAGE_VAISSEAU)    return null;
    if (scene == SCENE.NIVEAU_ISOMETRIQUE)   return Config.progression.dialogueActif;
    return null;
}

// Affiche la main squelettique (coordonnées déjà en espace local centre)
function afficherMain(main, connexions) {
  // 1. Dessiner les os (lignes du squelette)
  stroke(0, 255, 0);
  strokeWeight(4);

  for (let i = 0; i < connexions.length; i++) {
    let indexA = connexions[i][0];
    let indexB = connexions[i][1];
    let pointA = main.keypoints[indexA];
    let pointB = main.keypoints[indexB];
    line(pointA.x, pointA.y, pointB.x, pointB.y);
  }

  // 2. Dessiner les articulations (points)
  fill(255, 0, 0);
  noStroke();
  for (let i = 0; i < main.keypoints.length; i++) {
    let articulation = main.keypoints[i];
    circle(articulation.x, articulation.y, 10);
  }
}




// Logs désactivables pour éviter de ralentir le navigateur pendant les interactions.
function debugLog(...args) {
    if (Config && Config.setting && Config.setting.debugLogs) console.log(...args);
}

// =============================================
// Tailles centralisees depuis Config.setting.tailles
// =============================================

function _nombreConfig(valeur, fallback = 1) {
    return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : fallback;
}

function _configTailles() {
    return Config && Config.setting ? Config.setting.tailles : null;
}

function tailleTexte(tailleBase, cle = null) {
    let cfg = _configTailles();
    if (!cfg || cfg.actif === false) return tailleBase;

    let textes = cfg.textes || {};
    let taille = tailleBase;
    if (cle && textes.elements && typeof textes.elements[cle] === "number") {
        taille = textes.elements[cle];
    }

    taille *= _nombreConfig(textes.global, 1);
    return constrain(
        taille,
        _nombreConfig(textes.min, 1),
        _nombreConfig(textes.max, 300)
    );
}

function facteurGraphique(type = null, cle = null) {
    let cfg = _configTailles();
    if (!cfg || cfg.actif === false) return 1;

    let g = cfg.graphiques || {};
    let facteur = _nombreConfig(g.global, 1);

    if (type === "contours") {
        facteur *= _nombreConfig(g.contours, 1);
    } else if (type === "images") {
        facteur *= _nombreConfig(g.images, 1);
    } else {
        facteur *= _nombreConfig(g.formes, 1);
        if (type) facteur *= _nombreConfig(g[type], 1);
    }

    if (cle && g.elements && typeof g.elements[cle] === "number") {
        facteur *= g.elements[cle];
    }

    return facteur;
}

function tailleGraphique(tailleBase, type = null, cle = null) {
    return tailleBase * facteurGraphique(type, cle);
}

function tailleElement(groupe, cle, fallback) {
    let cfg = _configTailles();
    if (!cfg || !cfg.elements || !cfg.elements[groupe]) return fallback;

    let valeur = cfg.elements[groupe][cle];
    return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : fallback;
}

function _scaleIfNumber(args, index, facteur) {
    if (typeof args[index] === "number") args[index] *= facteur;
}

function _scalePointsDepuisCentre(args, facteur) {
    let points = [];
    for (let i = 0; i < args.length - 1; i += 2) {
        if (typeof args[i] !== "number" || typeof args[i + 1] !== "number") return args;
        points.push({ x: args[i], y: args[i + 1] });
    }

    let cx = points.reduce((total, p) => total + p.x, 0) / points.length;
    let cy = points.reduce((total, p) => total + p.y, 0) / points.length;
    let scaled = args.slice();

    points.forEach((p, index) => {
        scaled[index * 2] = cx + (p.x - cx) * facteur;
        scaled[index * 2 + 1] = cy + (p.y - cy) * facteur;
    });

    return scaled;
}

function appliquerConfigTaillesP5() {
    if (window.__configTaillesP5Appliquees) return;
    window.__configTaillesP5Appliquees = true;

    function wrap(nom, callback) {
        let original = window[nom];
        if (typeof original !== "function") return;
        window[nom] = function(...args) {
            return callback.call(this, original, args);
        };
    }

    wrap("textSize", function(original, args) {
        if (typeof args[0] === "number") args[0] = tailleTexte(args[0]);
        return original.apply(this, args);
    });

    wrap("strokeWeight", function(original, args) {
        if (typeof args[0] === "number") args[0] *= facteurGraphique("contours");
        return original.apply(this, args);
    });

    wrap("rect", function(original, args) {
        let facteur = facteurGraphique("rect");
        _scaleIfNumber(args, 2, facteur);
        _scaleIfNumber(args, 3, facteur);
        for (let i = 4; i < args.length; i++) _scaleIfNumber(args, i, facteur);
        return original.apply(this, args);
    });

    wrap("square", function(original, args) {
        let facteur = facteurGraphique("square");
        _scaleIfNumber(args, 2, facteur);
        for (let i = 3; i < args.length; i++) _scaleIfNumber(args, i, facteur);
        return original.apply(this, args);
    });

    wrap("ellipse", function(original, args) {
        let facteur = facteurGraphique("ellipse");
        _scaleIfNumber(args, 2, facteur);
        _scaleIfNumber(args, 3, facteur);
        return original.apply(this, args);
    });

    wrap("circle", function(original, args) {
        _scaleIfNumber(args, 2, facteurGraphique("circle"));
        return original.apply(this, args);
    });

    wrap("arc", function(original, args) {
        let facteur = facteurGraphique("arc");
        _scaleIfNumber(args, 2, facteur);
        _scaleIfNumber(args, 3, facteur);
        return original.apply(this, args);
    });

    wrap("line", function(original, args) {
        let facteur = facteurGraphique("line");
        if (args.length >= 4 && facteur !== 1) args = _scalePointsDepuisCentre(args.slice(0, 4), facteur).concat(args.slice(4));
        return original.apply(this, args);
    });

    wrap("triangle", function(original, args) {
        return original.apply(this, _scalePointsDepuisCentre(args, facteurGraphique("triangle")));
    });

    wrap("quad", function(original, args) {
        return original.apply(this, _scalePointsDepuisCentre(args, facteurGraphique("quad")));
    });

    wrap("point", function(original, args) {
        let facteur = facteurGraphique("point");
        if (facteur === 1 || !window.drawingContext) return original.apply(this, args);

        let ancienPoids = drawingContext.lineWidth;
        drawingContext.lineWidth = ancienPoids * facteur;
        let resultat = original.apply(this, args);
        drawingContext.lineWidth = ancienPoids;
        return resultat;
    });

    wrap("image", function(original, args) {
        let facteur = facteurGraphique("images");
        _scaleIfNumber(args, 3, facteur);
        _scaleIfNumber(args, 4, facteur);
        return original.apply(this, args);
    });
}

// Cache textWidth : utile pour les bulles de transcription mises à jour à chaque frame.
const __textWidthCache = new Map();
function getCachedTextWidth(txt, size = 18, maxWidth = Infinity) {
    let key = size + "|" + txt;
    if (__textWidthCache.has(key)) return __textWidthCache.get(key);
    textSize(size);
    let w = textWidth(txt);
    if (Number.isFinite(maxWidth)) w = Math.min(w, maxWidth);
    if (__textWidthCache.size > 120) __textWidthCache.clear();
    __textWidthCache.set(key, w);
    return w;
}

// Distance au carré : évite Math.sqrt/dist() dans les boucles d'interaction.
function distanceCarree(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return dx * dx + dy * dy;
}
function pointsProches(a, b, distanceMax) {
    return distanceCarree(a, b) <= distanceMax * distanceMax;
}


// =============================================
// Gestion audio : lecture des voix MP3
// =============================================

// Précharge tous les fichiers MP3 (à appeler dans preload())
function prechargerVoix() {
    for (let [nom, chemin] of Object.entries(VOIX_CHEMINS)) {
        try {
            Config.BanqueAudio[nom] = loadSound(chemin,
                () => {},
                (err) => { console.warn("[Audio] Echec chargement " + nom + ": " + chemin); }
            );
        } catch(e) {
            console.warn("[Audio] Exception chargement " + nom);
        }
    }
}

// Joue un son de feedback dans la scène entrepôt (sans couper le son actuel si en cours)
function jouerSonEntrepot(nomSon) {
    let son = Config.BanqueAudio[nomSon];
    if (!son) return;
    if (son.isPlaying()) return; // ne pas interrompre si déjà en cours
    // Stoppe uniquement si le son actuel est un autre son de feedback (pas une voix de dialogue)
    if (Config.variable.sonActuel && Config.variable.sonActuel.isPlaying()) {
        Config.variable.sonActuel.stop();
    }
    Config.variable.sonActuel = son;
    son.play();
}

function jouerVoix(dialogue) {
    if (!dialogue || !dialogue.fichier) return;

    let son = Config.BanqueAudio[dialogue.fichier];
    if (!son) return;

    // Stoppe le son précédent s'il est encore en lecture
    if (Config.variable.sonActuel && Config.variable.sonActuel.isPlaying()) {
        Config.variable.sonActuel.stop();
    }

    Config.variable.sonActuel = son;
    son.play();
}


// Joue un SFX simple sans couper les voix/dialogues
function jouerSFX(nomSon) {
    let son = Config.BanqueAudio[nomSon];
    if (!son) return;

    try {
        son.stop();
    } catch(e) {}

    son.play();
}

// =============================================
// constants.js
// Toutes les constantes globales du jeu
// =============================================

// ---- CONSTANTES DE SCÈNE ----
const SCENE = {
    INTRO                : "intro",
    INFO_UTILISATION_JEU : "infoUtilisationJeu",
    JEU_RECHERCHE_COLIS  : "jeuRechercheColis",
    PREPARATION_VAISSEAU : "preparationVaisseau",
    DEMARAGE_VAISSEAU    : "demarageVaisseau",
    NIVEAU_ISOMETRIQUE   : "niveauIsometrique",
}

const MODE = {
    DIALOGUE : "dialogue",
    JEU      : "jeu",
}

const ETAT_TABLETTE = {
    OPEN  : "open",
    CLOSE : "close",
}

// Mapping : nom de fichier → chemin complet dans assets/voix
const VOIX_CHEMINS = {
    // Intro
    "super_t_la"          : "base/assets/voix/patron/intro/super_t_la.mp3",
    "temps_necessaire"    : "base/assets/voix/patron/intro/temps_necessaire.mp3",
    "tres_bien_au_boulot" : "base/assets/voix/patron/intro/tres_bien_au_boulot.mp3",
    "trouve_colis"        : "base/assets/voix/patron/intro/trouve_colis.mp3",
    // Entrepôt
    "ouvre_tablette"      : "base/assets/voix/patron/entrepot/ouvre_tablette.mp3",
    "pas_bon_colis"       : "base/assets/voix/patron/entrepot/pas_bon_colis.mp3",
    "prends_ton_temps"    : "base/assets/voix/patron/entrepot/prends_ton_temps.mp3",
    "rande_colis_ordre"   : "base/assets/voix/patron/entrepot/rande_colis_ordre.mp3",
    "respecte_ordre"      : "base/assets/voix/patron/entrepot/respecte_ordre.mp3",
    // Vaisseau
    "ordre_pas_important" : "base/assets/voix/patron/vaisseau/ordre_pas_important.mp3",
    "vaisseau_preparation": "base/assets/voix/patron/vaisseau/vaisseau_preparation.mp3",

    // ---- SFX ----
    "petrole" : "base/assets/sfx/petrole.mp3",
    "succes"  : "base/assets/sfx/succes.mp3",
    "demarage": "base/assets/sfx/demarage.mp3",
};

// ---- PALETTE DE COULEURS ----
const COULEURS = {
    fond         : "#0a0a1a",
    fondScene    : "#0d1b2a",
    etoile       : "#ffffff",
    accent       : "#00e5ff",
    accentChaud  : "#ff6b35",
    vert         : "#00ff88",
    rouge        : "#ff3366",
    texte        : "#e0e8ff",
    texteSombre  : "#7090b0",
    bulle        : "#0f2035",
    bulleBord    : "#00e5ff",
    colis        : "#1a3a5c",
    colisBord    : "#00e5ff",
    colisCharger : "#0a2a1a",
    tablette     : "#050d18",
    hud          : "#061020",
    essence      : "#ff9900",
}

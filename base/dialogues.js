// =============================================
// dialogues.js
// Tous les textes et dialogues du jeu
// =============================================

const Dialogue = {

    intro: [
        {
            personne : "Patron",
            phrase   : "Super, t'es là !",
            type     : "discussion",
            reponse  : null,
            fichier : "super_t_la",
        },
        {
            personne : "Patron",
            phrase   : "J'ai une livraison urgente. Trouve les colis dans l'entrepôt et charge le vaisseau.",
            type     : "discussion",
            reponse  : null,
            fichier : "trouve_colis",
        },
        {
            personne : "Patron",
            phrase   : "De combien de temps t'as besoin ?",
            type     : "question",
            reponse  : [
                { phrase: "Facile, dans la journée (30 min)",      action: () => setTimer(30) },
                { phrase: "Je vous fais ça en deux temps (15 min)", action: () => setTimer(15) },
            ],
            fichier : "temps_necessaire",
        },
        {
            personne : "Patron",
            phrase   : "Très bien. Ne me déçois pas. Au boulot !",
            type     : "discussion",
            reponse  : null,
            fichier : "tres_bien_au_boulot",
        },
    ],

    jeuRechercheColis: {
        explication: [
            {
                personne : "Patron",
                phrase   : "Range les colis dans l'ordre indiqué.",
                type     : "discussion",
                reponse  : null,
                fichier  : "rande_colis_ordre",
            },
            {
                personne : "Patron",
                phrase   : "Ouvre la tablette, (touche F) pour voir l'ordre de livraison.",
                type     : "discussion",
                reponse  : null,
                fichier  : "ouvre_tablette",
            },
        ],
        plusVite     : [{ personne: "Patron", phrase: "Tu prends ton temps là !",             type: "pression", reponse: null, fichier: "prends_ton_temps"  }],
        mauvaisColis : [{ personne: "Patron", phrase: "Attention, c'est pas le bon colis !",  type: "pression", reponse: null, fichier: "pas_bon_colis"     }],
        mauvaiseOrdre: [{ personne: "Patron", phrase: "Respecte l'ordre, sois plus attentif !", type: "pression", reponse: null, fichier: "respecte_ordre" }],
    },

    preparationVaisseau: {
        debutMission: [
            {
                personne : "Patron",
                phrase   : "Bon... en fait l'ordre des colis n'avait pas d'importance. Autant pour moi.",
                type     : "discussion",
                reponse  : null,
                fichier  : "ordre_pas_important",
            },
            {
                personne : "Patron",
                phrase   : "Maintenant prépare le vaisseau au départ : fais le plein et libère les freins.",
                type     : "discussion",
                reponse  : null,
                fichier  : "vaisseau_preparation",
            },
        ],
    },

    transitionEntrepot: [
        {
            personne : "Patron",
            phrase   : "Bien. Direction l'entrepôt. Trouve les bons colis.",
            type     : "discussion",
            reponse  : null,
            fichier  : "respecte_ordre",
        },
    ],

    transitionVaisseau: [
        {
            personne : "Patron",
            phrase   : "Parfait. Maintenant prépare le vaisseau pour le départ.",
            type     : "discussion",
            reponse  : null,
            fichier  : "vaisseau_preparation",
        },
    ]

};
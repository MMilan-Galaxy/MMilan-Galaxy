# Space Delivery

Space Delivery est un jeu interactif realise avec p5.js, p5.sound et ml5.js. Le joueur suit une mission de livraison spatiale en plusieurs scenes : dialogue d'introduction, recherche de colis dans un entrepot, preparation du vaisseau, demarrage, puis navigation sur une carte spatiale.

Le projet est prevu pour une installation immersive en triple ecran, avec un canvas par defaut en `5760 x 1200`. Il peut aussi etre force en simple fenetre en modifiant `config.js`.

## Fonctionnalites

- Affichage p5.js en trois zones : gauche, centre et droite.
- Dialogues avec voix prechargees depuis `assets/voix`.
- Reconnaissance vocale avec commandes rapides selon la scene.
- Detection de main avec ml5 handPose pour les interactions gestuelles.
- Ecran rapide d'information avant le hub pour expliquer voix et mains.
- Recherche et validation de colis dans l'ordre de livraison.
- Preparation du vaisseau : essence, frein, cockpit et checklist.
- Demarrage du vaisseau avec animation de decollage.
- Hub isometrique avec deplacements clavier.

## Lancer le projet

1. Placer le dossier dans un serveur local, par exemple Wamp.
2. Ouvrir `index.html` depuis le serveur local :

```text
http://localhost/cours/p5/SAE/v8/
```

Le micro, la camera et l'audio du navigateur demandent un premier geste utilisateur. Clique dans la page ou appuie sur une touche au lancement pour les debloquer.

## Structure

```text
assets/
  sfx/                    Effets sonores
  voix/                   Voix du patron
scene/
  scene_intro.js          Introduction
  scene_info_utilisation.js
                          Informations rapides voix + mains
  scene_entrepot.js       Recherche de colis
  scene_vaisseau.js       Preparation du vaisseau
  scene_demarage_vaisseau.js
  scene_isometrique.js    Hub de navigation
config.js                 Configuration globale du jeu
constants.js              Scenes, modes, couleurs, chemins audio
dialogues.js              Dialogues et actions
index.html                Page HTML et chargement des scripts
input.js                  Clavier, souris, premier geste utilisateur
interaction_vocale.js     Micro, commandes vocales, HUD vocal
planet.js                 Boucle principale et rendu global
screen.js                 Gestion triple ecran
sketch.js                 setup(), draw(), handPose
ui.js                     Composants UI reutilisables
utils.js                  Fonctions communes
```

## Configuration principale

La plupart des reglages sont dans `config.js`, dans `Config.setting`.

Parametres utiles :

- `screenSizeX` et `screenSizeY` : taille cible du canvas.
- `forcerResolutionAffichage` : si `true`, utilise la resolution definie dans la config.
- `nomJeu` : nom affiche dans certaines interfaces.
- `bullSize`, `bullMargin`, `bullPadding` : taille et marges des bulles de dialogue.
- `colis`, `pompeEssence`, `tablette` : dimensions des elements principaux.
- `timerSize`, `timerMargin` : affichage du timer.
- `pinchSeuilPx` : sensibilite du pincement pouce-index.
- `distanceFreinPouceMajeurPx` : sensibilite du geste de frein.
- `vitesseDeplacementPersonnage` : vitesse du personnage dans le hub isometrique.
- `infoUtilisationJeu` : titres et textes des bulles d'information voix + mains.
- `planetesCarte` : planetes disponibles sur la carte.
- `debugLogs` : active ou coupe les logs de debug.

## Modifier la taille des textes et graphismes

Les tailles sont centralisees dans `Config.setting.tailles`.

Exemple :

```js
tailles: {
    actif: true,
    textes: {
        global: 1.2,
        min: 1,
        max: 300,
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
        elements: {},
    },
    elements: {
        bulle: {
            hauteur: 220,
            nom: 14,
            texte: 18,
            reponse: 15,
            continuer: 13,
        },
        colis: {
            taille: 180,
            texte: 14,
            animationTexte: 14,
            apercuTaille: 110,
            apercuTexte: 11,
            cocheApercu: 11,
        },
        tablette: {
            titre: 20,
            sousTitre: 12,
            ligneColis: 16,
            bouton: 13,
        },
        infoUtilisationJeu: {
            titre: 34,
            sousTitre: 18,
            titreBulle: 24,
            texteBulle: 16,
            popupTexte: 20,
            boutonTexte: 22,
            boutonStatut: 14,
            textePasser: 14,
        },
    },
}
```

Reglages courants :

- `textes.global = 1.2` agrandit tous les textes de 20%.
- `textes.global = 0.85` reduit tous les textes.
- `graphiques.global = 1.1` agrandit les elements graphiques.
- `graphiques.rect = 0.9` reduit seulement les rectangles.
- `graphiques.ellipse = 1.3` agrandit seulement les ellipses.
- `graphiques.images = 1.15` agrandit les images dessinees avec `image()`.
- `graphiques.contours = 2` double les epaisseurs de traits.
- `graphiques.point = 1.5` agrandit les points dessines avec `point()`.
- `elements.colis.taille = 220` agrandit les colis de l'entrepot.
- `elements.colis.texte = 18` agrandit le texte au centre des colis.
- `elements.colis.apercuTaille = 130` agrandit les colis des ecrans lateraux.
- `elements.bulle.texte = 22` agrandit le texte principal des bulles.
- `elements.bulle.nom = 16` agrandit le nom du personnage dans les bulles.
- `elements.tablette.ligneColis = 18` agrandit les lignes de colis dans la tablette.
- `elements.infoUtilisationJeu.texteBulle = 20` agrandit le texte des bulles d'information.

Les textes de l'ecran d'information se modifient aussi dans `config.js` :

```js
infoUtilisationJeu: {
    titre: "AVANT DE COMMENCER",
    sousTitre: "Le jeu se controle avec ta voix, tes mains et quelques touches.",
    popup: {
        actif: true,
        texte: "Utilisez votre main ou votre voix pour interagir avec le jeu.",
    },
    bouton: {
        texte: "COMMENCER",
        statutAttente: 'Pose ta main sur le bouton et dis "commencer".',
        statutMainOk: 'Main detectee. Dis "commencer".',
        statutVoixOk: "Commande vocale detectee. Pose ta main sur le bouton.",
    },
    textePasser: 'Main sur le bouton + dites "commencer"',
    bulles: {
        voix: {
            titre: "VOIX",
            lignes: [
                'Dis "patron" pour parler au patron.',
                'Dis "open" devant une porte ouverte.',
            ],
        },
        mains: {
            titre: "MAINS",
            lignes: [
                "Montre ta main a la camera.",
                "Pince au-dessus d'un colis pour le prendre.",
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
}
```

Le systeme intercepte les appels p5 principaux : `textSize`, `strokeWeight`, `rect`, `square`, `ellipse`, `circle`, `arc`, `line`, `triangle`, `quad`, `point` et `image`.

Pour raccorder un nouveau type d'element a la config, utilise dans le code :

```js
let tailleBouton = tailleElement("boutonStart", "taille", 120);
let texteBouton = tailleElement("boutonStart", "texte", 18);
```

Puis ajoute le groupe correspondant dans `Config.setting.tailles.elements`.

## Controles

- `E` : avancer dans les dialogues ou interagir dans le hub.
- Fleches haut/bas : choisir une reponse pendant un dialogue.
- Fleches gauche/droite : changer de zone dans l'entrepot.
- `F` : ouvrir ou fermer la tablette dans l'entrepot.
- Fleches ou `ZQSD` : deplacement dans le hub isometrique.
- Souris : fallback pour certaines interactions si aucune main n'est detectee.
- Scene d'information : cliquer sur `COMMENCER` permet aussi de passer a la suite.

Commandes vocales principales :

- `"patron"` : parler au patron dans le hub.
- `"open"` : ouvrir une porte disponible dans le hub.
- `"essence"` : aller vers la zone essence du vaisseau.
- `"frein"` : aller vers la zone frein du vaisseau.
- `"sortir"` : revenir au cockpit.
- `"map"` : ouvrir la carte apres le decollage.

## Notes techniques

- Les coordonnees des scenes sont dessinees localement dans l'ecran central.
- `screen.js` decoupe le canvas global en trois zones.
- `sketch.js` initialise la webcam en `320 x 240` pour garder la detection de main fluide.
- `planet.js` gere le rendu global, les transitions et le dispatch vers la scene active.
- Les options de performance sont dans `config.js` : frame rate, debug main, apercu camera et qualite du decor.

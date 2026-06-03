# Modifications du 31 mai 2026

Ce document resume les modifications ajoutees aujourd'hui au jeu Space Delivery.

## Configuration centralisee

- Ajout d'un systeme de tailles dans `config.js`.
- Les textes et elements graphiques peuvent etre ajustes depuis `Config.setting.tailles`.
- Ajout de tailles specifiques par type d'element :
  - bulles de dialogue
  - colis
  - texte des colis
  - apercus de colis
  - tablette
  - scene d'information
  - bouton de demarrage

## Colis et tablette

- La taille des colis est maintenant configurable avec `tailles.elements.colis.taille`.
- Le texte affiche sur les colis est configurable avec `tailles.elements.colis.texte`.
- Les textes de la tablette sont configurables avec `tailles.elements.tablette`.

## Bulles de dialogue

- La hauteur des bulles est configurable.
- Les tailles du nom, du texte principal, des reponses et de l'indication continuer sont configurables.

## Vitesse du personnage

- Ajout de `vitesseDeplacementPersonnage` dans `config.js`.
- Cette valeur controle la vitesse du joueur dans la scene isometrique.

## Scene d'information au lancement

- Ajout d'une scene `infoUtilisationJeu` lancee en premier.
- Elle explique l'utilisation de la voix et des mains.
- Les textes de cette scene sont modifiables dans `Config.setting.infoUtilisationJeu`.
- Une popup affiche : `Utilisez votre main ou votre voix pour interagir avec le jeu.`
- La scene ne passe plus automatiquement.
- Pour commencer, il faut poser la main sur le bouton `COMMENCER` et dire `commencer`.
- Il est aussi possible de cliquer avec la souris sur `COMMENCER` pour passer.
- Ajout d'une bulle `CLAVIER / SOURIS` pour expliquer les touches principales.

## Commandes vocales

- Ajout de la commande vocale `commencer` sur l'ecran d'information.
- La commande `sortir` permet de revenir au cockpit depuis les sous-vues du vaisseau.
- La sortie depuis la zone frein est maintenant centralisee dans `sortirVersCockpit()`.

## Fichiers principaux modifies

- `config.js`
- `constants.js`
- `index.html`
- `input.js`
- `interaction_vocale.js`
- `planet.js`
- `scene/scene_info_utilisation.js`
- `scene/scene_intro.js`
- `scene/scene_entrepot.js`
- `scene/scene_isometrique.js`
- `scene/scene_vaisseau.js`
- `ui.js`
- `utils.js`

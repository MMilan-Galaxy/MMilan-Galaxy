# Space Delivery

Jeu spatial multi-scènes avec détection de mains (ml5 handpose) et commandes vocales.

## Structure du projet

```
space_delivery/
├── index.html              # Point d'entrée — scène de démarrage (p5.js)
├── base/                   # Moteur de jeu (p5.js, ml5 handpose, voix)
│   ├── config.js           # Configuration globale
│   ├── constants.js        # Constantes (SCENE, MODE, etc.)
│   ├── input.js            # Gestion entrées (main, souris, clavier)
│   ├── interaction_vocale.js # Commandes vocales
│   ├── sketch.js           # Boucle principale p5.js
│   └── scene/              # Scènes du jeu de base
│       ├── scene_intro.js
│       ├── scene_entrepot.js
│       ├── scene_vaisseau.js
│       ├── scene_demarage_vaisseau.js
│       └── scene_isometrique.js
├── cockpit/                # Carte 3D du système solaire (Three.js)
│   └── index.html          # Sélection de planète par dwell (curseur/main)
├── planets/                # Jeux de chaque planète
│   ├── gambling/           # Planète Casino
│   ├── musique/            # Planète Musique
│   ├── nourriture/         # Planète Nourriture (Saccharia)
│   ├── tron/               # Planète Tron
│   ├── danse/              # Planète Danse
│   └── sable/              # Planète Sable (Désert)
└── shared/                 # Code partagé entre planètes
    └── tracking.js
```

## Flux de navigation

1. `index.html` → Scène intro → Entrepôt → Vaisseau → Décollage
2. Commande vocale "map" → Redirige vers `cockpit/index.html`
3. Cockpit 3D → Sélection planète par dwell → Bouton "Atterrir" (dwell) → Jeu planète (iframe)
4. Bouton "Retour vaisseau" → Retour à `index.html`

## Planètes disponibles

| Planète     | Dossier        | Status |
|-------------|----------------|--------|
| Gambling    | planets/gambling    | ✓ |
| Musique     | planets/musique     | ✓ |
| Nourriture  | planets/nourriture  | ✓ |
| Tron        | planets/tron        | ✓ |
| Danse       | planets/danse       | ✓ |
| Sable       | planets/sable       | ✓ |
| Manga       | —                   | Pas encore de jeu |

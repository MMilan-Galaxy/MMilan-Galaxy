# JAXX — SAE 4.02

Jeu d'aventure p5.js / ml5.js. Le joueur déambule dans la ville **3D isométrique de JAXX**, entre dans le bureau de poste pour rencontrer le **facteur Eugène**, livre 6 colis et reçoit un cristal à la fin.

Format final : **5760 × 1200** (3 vidéoprojecteurs côte-à-côte sur toile).

## Lancer le projet

Servir en HTTP — **pas en `file://`** (ml5 et p5.sound se cassent).

- **Live Server** (extension VS Code, Ritwick Dey) : clic droit sur `index.html` → *Open with Live Server*.

Si tu ouvres en `file://`, un écran d'erreur rose apparaît et la console explique.

## Boucle de jeu

1. **Accueil — ville 3D isométrique** (Jaxx contrôlé avec **Z Q S D**). Tu marches dans la ville en passant devant les maisons, les arbres, les fontaines, les enceintes, le studio, les montagnes.
2. Tu t'approches du **bureau de poste** → prompt **"Appuyer sur E pour entrer"** dans le coin bas (style context-menu du design system).
3. **Intérieur du bureau de poste** — scène 3D 1ère personne avec le facteur Eugène derrière son comptoir + colis-cadeau flottant + étagères de colis multicolores. Le briefing de la quête courante s'affiche dans la **dialog-box** du design system.
4. Tu acceptes (**E** ou clic) → quête lancée (en mode WEBGL, dessin selon les besoins).
5. `this.complete()` → **fondu noir** avec le `successText` → retour à la ville.
6. Après Q6 → Eugène te remet un cristal (animation HUD).

## Arborescence

```
.
├── index.html              # canvas WEBGL + overlays HTML (HUD, prompt, dialog, progress, fade)
├── README.md
├── consigne.txt
├── src/
│   ├── main.js             # bootstrap p5 instance + WEBGL
│   ├── styles/
│   │   └── design-system.css   # variables CSS + composants (dialog, prompt, gauge, toast)
│   ├── core/
│   │   ├── Game.js         # state machine OVERWORLD/HUB/BRIEFING/QUEST/DELIVERY_FADE/ENDING
│   │   ├── HUD.js          # façade qui pilote tous les overlays HTML
│   │   ├── Quest.js        # classe abstraite
│   │   ├── QuestManager.js
│   │   ├── Player.js
│   │   ├── Transition.js   # wrapper du fondu HTML/CSS
│   │   └── ProgressBar.js  # wrapper de la gauge HTML/CSS
│   ├── shared/
│   │   ├── Jaxx.js         # personnage 3D (port de personnage_3D.html)
│   │   └── QuestStub.js    # helper de rendu pour les stubs de quêtes
│   ├── world/
│   │   ├── IsoUtils.js     # collisions cercle/rect
│   │   ├── CityBuilder.js  # liste des bâtiments/features (factory statique)
│   │   ├── CityRenderer.js # dessin 3D de chaque feature (house, building, tree, postoffice, …)
│   │   └── WorldMap.js     # joueur, caméra iso, mouvement, collision, proximité poste
│   ├── hub/
│   │   ├── Postman.js      # Eugène (3D)
│   │   └── PostOffice.js   # intérieur 3D + briefing HTML
│   └── quests/
│       ├── quete0/Quete0.js   # Evan
│       ├── quete1/Quete1.js   # Limpia (mains)
│       ├── quete2/Quete2.js   # Siwar (souris)
│       ├── quete3/Quete3.js   # Evan (mains)
│       ├── quete4/Quete4.js   # Siwar (mains)
│       ├── quete5/Quete5.js   # Evan (clic)
│       └── quete6/Quete6.js   # Limpia (voix)
├── assets/                 # à venir
└── old/                    # prototypes archivés (accueil.html, design-system.html, personnage_3D.html, code Limpia/Siwar)
```

## Conventions

- **POO** : une classe = un fichier. Pas de variables globales sauf les classes.
- **p5 instance mode** : tout passe par `p` (`p.fill`, `p.box`, `p.width`, `p.frameCount`, …).
- **WEBGL** : canvas en `p.WEBGL`. Origine au centre de l'écran. Lumières + matériaux nécessaires (`fill`, `emissiveMaterial`, `ambientLight`, `pointLight`, …).
- **UI via HUD** : ne dessine **jamais** d'UI dans le canvas. Passe par `game.hud.showPrompt(...)`, `game.hud.showDialog(...)`, `game.hud.toast(...)`, `game.hud.setLocation(...)`. Le design système CSS s'occupe du look.
- **Couleurs UI** : variables CSS de `design-system.css` (`--accent-current`, `--surface-glass`, etc.). Pour la 3D, utilise les couleurs hex directement (palette du brief : `#ff7ad1`, `#cb6ce6`, `#06d6a0` pour le bureau de poste, etc.).
- **Pas de redirection de page**. Toute la nav passe par `Game`.

## Comment ajouter du code à ma quête

1. Ouvre `src/quests/queteN/QueteN.js`.
2. Hérite de `Quest`. Override les hooks selon les besoins :
   - `setup(p)` — init (caméra ml5, micro, état)
   - `update(p)` — logique par frame
   - `draw(p)` — rendu WEBGL (utiliser `p.box`, `p.sphere`, `p.fill`, `p.emissiveMaterial`, `p.text`, …)
   - `cleanup(p)` — libérer caméra/micro proprement
   - `onMousePressed/Dragged/Released`, `onKeyPressed/Released`, `onWindowResized`
3. Appelle `this.complete()` quand le mini-jeu est gagné — le `Game` enchaîne automatiquement fondu + retour overworld.
4. Pour afficher des PNJ ou des dialogues custom pendant la quête : `this.game.hud.showDialog({...})` puis `hideDialog()` après.

Squelette minimal :

```js
class QueteN extends Quest {
  constructor() {
    super({
      id: 'qN',
      title: 'Quête N — …',
      author: 'Toi',
      progressPercent: 40,
      parcelName: '…',
      npcName: '…',
      briefing: '…',
      successText: '…'
    });
  }

  setup(p) {
    super.setup(p);
    // init perso : caméra, micro, positions
  }

  update(p) {
    if (/* condition de réussite */ false) {
      this.complete();
    }
  }

  draw(p) {
    p.background(15, 12, 25);
    p.ambientLight(80, 80, 110);
    // ... rendu WEBGL de la quête
  }

  cleanup(p) {
    super.cleanup(p);
    // libérer caméra/mic
  }
}
```

## État d'avancement

- [x] Architecture POO (state machine, HUD overlays, transitions)
- [x] Design system CSS appliqué partout (dialog, prompt, gauge, toast)
- [x] Personnage Jaxx 3D
- [x] Ville 3D isométrique (maisons, immeubles, arbres, fontaines, enceintes, studio, montagnes, lampes, bancs, chemin lumineux vers la poste)
- [x] Bureau de poste 3D intérieur (facteur Eugène, étagères de colis, comptoir, lampe, tampon, lettres)
- [x] Barre de progression + cristal HUD + fondu noir transitionnel
- [ ] Q0–Q6 (en stubs) — *à brancher par chaque contributeur*
- [ ] Interaction indirecte (décor réactif sur un projecteur dédié)

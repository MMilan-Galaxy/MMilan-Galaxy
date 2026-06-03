```markdown
# Guide Développeur — MMilan Galaxy

---

## Git : Workflow

### 1. Cloner le projet (une seule fois)
```bash
git clone https://github.com/MMilan-Galaxy/MMilan-Galaxy.git
cd MMilan-Galaxy
```

### 2. AVANT DE CODER — Se mettre à jour
```bash
git fetch origin
git checkout planet/ta-planete
git pull --rebase origin planet/ta-planete
```
**TOUJOURS faire ça avant de commencer à coder.**

### 3. Créer ta branche personnelle
```bash
git checkout -b feat/ta-planete-ton-prenom
```
Exemple : `feat/nebulion-yousra`, `feat/musique-siwar`

### 4. Coder, committer, pusher
```bash
git status                    # voir ce qui a changé
git diff                      # voir les modifications
git add planets/ta-planete/   # ajouter tes fichiers
git commit -m "feat: description de ce que tu as fait"
git push origin feat/ta-planete-ton-prenom
```

### 5. Créer une Pull Request
Sur GitHub : de `feat/ta-planete-ton-prenom` → `planet/ta-planete`

---

## Structure du Projet

```
MMilan-Galaxy/
├── index.html          ← NE PAS TOUCHER (géré par Yousra/Julien)
├── Sketch.js           ← NE PAS TOUCHER (géré par Yousra/Julien)
├── style.css           ← NE PAS TOUCHER (géré par Yousra/Julien)
├── .gitignore          ← NE PAS TOUCHER
├── .gitattributes      ← NE PAS TOUCHER
├── core/               ← NE PAS TOUCHER
│   ├── Planet.js
│   ├── Interaction.js
│   ├── Fallback.js
│   ├── QuestSystem.js
│   ├── CrystalSystem.js
│   └── ...
├── intro/              ← NE PAS TOUCHER
├── assets/             ← Assets globaux (coordonné avec Yousra/Julien)
└── planets/
    └── ta-planete/
        ├── TaPlanet.js           ← Ton fichier principal
        ├── interactions/
        │   ├── Interaction1.js   ← Une interaction par personne
        │   ├── Interaction2.js
        │   └── Interaction3.js
        └── fallbacks/
            ├── Fallback1.js
            └── Fallback2.js
```

---

## Architecture POO — Classes du Core

Le dossier `core/` contient les classes de base que tu **hérites** dans ton code. Ne jamais modifier ces fichiers.

### 1. `Planet` — Classe de base pour toutes les planètes

Chaque planète hérite de `Planet` et surcharge la méthode `draw()`.

```js
// planets/ta-planete/TaPlanet.js
class TaPlanet extends Planet {
    constructor() {
        super('Nom de ta planète', '#couleur-hex')
        
        // Initialisation de tes interactions ici
    }

    draw() {
        // Ton rendu p5.js ici (appelé à chaque frame)
        background(0)
    }
}
```

**Méthodes disponibles :**
- `constructor(name, color)` — appeler avec `super()`
- `draw()` — à surcharger, appelée chaque frame par `sketch.js`

---

### 2. `Interaction` — Classe de base pour les interactions

Chaque interaction hérite de `Interaction` et définit un trigger + un callback de succès.

```js
// planets/ta-planete/interactions/Interaction1.js
class TonInteraction1 extends Interaction {
    constructor() {
        super({
            name:      'Le Seuil des Ninjas',
            input:     'handpose',  // 'handpose' | 'posenet' | 'mic' | 'keyboard'
            triggerFn: () => this._checkTrigger(),
            onSuccess: () => this._onSuccess(),
            fallback:  new KeyboardFallback(['z', 'x', 'c'])
        })
        
        // Ton initialisation ici (caméra, MediaPipe, etc.)
    }

    _checkTrigger() {
        // Retourne true quand l'interaction est réussie
        return false
    }

    _onSuccess() {
        // Appelé une seule fois quand l'interaction réussit
        console.log('Interaction réussie !')
        window.questSystem.completeQuest('ninja')
        window.crystalSystem.addCrystal()
    }
}
```

**Paramètres du constructor :**
- `name` : Nom affiché de l'interaction
- `input` : Type d'entrée (`'handpose'`, `'posenet'`, `'mic'`, `'keyboard'`, `'mouse'`)
- `triggerFn` : Fonction qui retourne `true` quand l'interaction est réussie
- `onSuccess` : Callback appelé une seule fois au succès
- `fallback` : Instance de `KeyboardFallback` ou `ClickZoneFallback` (optionnel)

**Méthodes disponibles :**
- `start()` — démarre l'interaction
- `check()` — à appeler dans `draw()` ou dans ton loop pour vérifier le trigger
- `stop()` — arrête l'interaction proprement

**Workflow type :**
1. Dans `TaPlanet.js` : `this.interaction1 = new TonInteraction1()` puis `this.interaction1.start()`
2. L'interaction appelle `check()` en interne ou tu l'appelles dans ton loop
3. Quand `triggerFn()` retourne `true`, `onSuccess()` est appelé automatiquement

---

### 3. `Fallback` — Classe de base pour les contrôles alternatifs

Deux types de fallbacks prêts à l'emploi :

#### `KeyboardFallback` — séquence de touches

```js
new KeyboardFallback(['z', 'x', 'c'])
```

L'utilisateur doit taper `z` puis `x` puis `c` dans l'ordre pour déclencher le succès.

#### `ClickZoneFallback` — cliquer sur des zones

```js
new ClickZoneFallback(3, 3000)  // 3 zones à cliquer en 3000ms chacune
```

L'utilisateur doit cliquer sur 3 zones avant qu'elles disparaissent.

**Utilisation :**
Le fallback est automatiquement affiché si l'utilisateur ne réussit pas l'interaction principale. Il suffit de le passer dans le `constructor` de ton `Interaction`.

---

### 4. `QuestSystem` — Système d'objectifs

Gère l'affichage des objectifs en haut à gauche de l'écran.

**Instance globale :** `window.questSystem`

**Méthodes disponibles :**

```js
// Ajouter une quête
window.questSystem.addQuest('id-unique', 'Texte de la quête')

// Compléter une quête (ajoute une coche)
window.questSystem.completeQuest('id-unique')

// Supprimer une quête
window.questSystem.removeQuest('id-unique')

// Supprimer toutes les quêtes
window.questSystem.clearAllQuests()
```

**Exemple d'utilisation :**

```js
// Dans TaPlanet constructor
window.questSystem.addQuest('ninja', 'Effectuer le signe ninja')
window.questSystem.addQuest('mirror', 'Refléter ton âme')

// Dans Interaction1 _onSuccess()
window.questSystem.completeQuest('ninja')

// Dans Interaction2 _onSuccess()
window.questSystem.completeQuest('mirror')
```

---

### 5. `CrystalSystem` — Système de cristaux

Gère le compteur de cristaux en haut à droite de l'écran.

**Instance globale :** `window.crystalSystem`

**Méthodes disponibles :**

```js
// Ajouter un cristal
window.crystalSystem.addCrystal()

// Collecter un cristal unique par planète (retourne true si première collecte)
const isFirstCollect = window.crystalSystem.collectCrystal('nom-planete')
```

**Exemple d'utilisation :**

```js
// Dans Interaction _onSuccess()
_onSuccess() {
    window.crystalSystem.addCrystal()
    console.log('Cristal obtenu !')
}
```

---

## Créer ta Planète — Guide Complet

### Étape 1 : Créer le fichier principal

**`planets/ta-planete/TaPlanet.js`** :

```js
class TaPlanet extends Planet {
    constructor() {
        super('Nom de ta planète', '#7ec8ff')
        
        // Ajouter les quêtes
        window.questSystem.addQuest('quest1', 'Objectif 1')
        window.questSystem.addQuest('quest2', 'Objectif 2')
        window.questSystem.addQuest('quest3', 'Objectif 3')
        
        // Initialiser les interactions
        this.interaction1 = new TonInteraction1()
        this.interaction1.start()
        
        this.interaction2 = new TonInteraction2()
        this.interaction2.start()
        
        this.interaction3 = new TonInteraction3()
        this.interaction3.start()
    }

    draw() {
        background(0)
        // Ton rendu p5 ici (particules, effets, etc.)
    }
}
```

---

### Étape 2 : Créer une interaction

**`planets/ta-planete/interactions/Interaction1.js`** :

```js
class TonInteraction1 extends Interaction {
    constructor() {
        super({
            name:      'Le Seuil des Ninjas',
            input:     'handpose',
            triggerFn: () => this._checkTrigger(),
            onSuccess: () => this._onSuccess(),
            fallback:  new KeyboardFallback(['z', 'x', 'c'])
        })
        
        // Variables d'état
        this._timer = 0
        this._DUREE = 60  // frames
        
        // Initialise ta caméra, MediaPipe, etc.
        this._initCamera()
    }

    _initCamera() {
        // Code MediaPipe / ml5 / micro ici
    }

    _checkTrigger() {
        // Exemple : 2 mains ouvertes pendant 2 secondes
        if (this._deuxMainsOuvertes()) {
            this._timer++
        } else {
            this._timer = 0
        }
        return this._timer >= this._DUREE
    }

    _deuxMainsOuvertes() {
        // Ta logique de détection ici
        return false
    }

    _onSuccess() {
        console.log('Interaction 1 réussie !')
        window.questSystem.completeQuest('quest1')
        window.crystalSystem.addCrystal()
    }
}
```

---

## Assets : Images / Sons / Vidéos

### Où mettre tes assets

Tes assets vont dans le dossier **`assets/`** à la racine du projet :

```
assets/
├── fonts/
├── images/
├── sounds/
└── videos/
    ├── naruto.gif
    └── sasuke.gif
```

### Procédure pour ajouter des assets

1. **Prépare tes fichiers** en local (compresse si possible)
2. **Envoie-les à Yousra ou Julien** via Discord/Drive
3. Ils les ajouteront dans `assets/` et te donneront les chemins

**Ne push JAMAIS directement dans le dossier `assets/`** — c'est géré centralement pour éviter les conflits.

### Utiliser tes assets dans ton code

```html
<!-- Dans index.html, Yousra/Julien ajouteront : -->
<img id="ton-image" src="assets/images/ton-fichier.gif">
<video id="ta-video" src="assets/videos/ton-fichier.mp4"></video>
```

```js
// Dans ton code JS :
const img = document.getElementById('ton-image')
img.style.display = 'block'
img.style.left = '100px'
img.style.top = '200px'
```

---

## Push de gros fichiers (pour Yousra/Julien uniquement)

Git LFS est configuré pour gérer automatiquement les fichiers volumineux dans le dossier `assets/`.

### Pour les contributeurs principaux (Yousra/Julien)

```bash
# S'assurer que Git LFS est installé
git lfs install

# Les fichiers suivants sont automatiquement trackés par LFS :
# - assets/videos/*.mp4
# - assets/videos/*.gif

# Ajouter et commiter normalement
git add assets/
git commit -m "feat: ajout assets interaction X"
git push origin develop
```

### Pour les autres développeurs

Rien à faire de spécial ! Git LFS télécharge automatiquement les fichiers lors du `git clone` ou `git pull`.

**En cas de problème** (assets manquants ou non téléchargés) :

```bash
git lfs install
git lfs pull
```

### Installation de Git LFS

**macOS :**
```bash
brew install git-lfs
```

**Linux (Ubuntu/Debian) :**
```bash
sudo apt-get install git-lfs
```

**Windows :**
Télécharger depuis [git-lfs.github.com](https://git-lfs.github.com/)

---

## Règles ABSOLUES

### ❌ NE JAMAIS
- Toucher au dossier `core/`
- Pusher `index.html`, `Sketch.js`, `style.css`
- Pusher dans le dossier `assets/`
- Toucher à `.gitignore` ou `.gitattributes`
- Travailler dans le dossier d'une autre planète
- Pusher directement sur `develop` ou `main`
- Travailler sur la même branche qu'un autre développeur

### ✅ TOUJOURS
- Travailler uniquement dans `planets/ta-planete/`
- Créer une branche personnelle par fonctionnalité
- Pull rebase **AVANT** de commencer à coder
- Committer souvent (pas tout à la fin)
- Faire une PR vers `planet/ta-planete` quand tu as fini
- Envoyer tes assets à Yousra/Julien plutôt que de les pusher

---

## Conflits Git

Si tu as un conflit lors du pull :

```bash
git status  # voir les fichiers en conflit
# Ouvrir les fichiers, résoudre manuellement
git add .
git rebase --continue
```

Si c'est trop compliqué → appelle Yousra ou Julien.

---

## En cas de problème

**Yousra** — lead dev, architecture, assets  
**Julien** — lead dev, intégration, index.html

Avant de demander de l'aide :
1. `git status` — comprendre l'état de ton repo
2. Lire les messages d'erreur en entier
3. Vérifier que tu es sur la bonne branche

---

# ✅ Checklist — Créer ta Planète

---

## 📋 Préparation

- [ ] Git installé sur mon ordinateur
- [ ] Repo cloné en local : `git clone https://github.com/MMilan-Galaxy/MMilan-Galaxy.git`
- [ ] Je suis sur la branche de ma planète : `git checkout planet/nom-planete`
- [ ] Je me suis mis à jour : `git pull --rebase origin planet/nom-planete`
- [ ] J'ai créé ma branche perso : `git checkout -b feat/nom-planete-mon-prenom`

---

## 🎨 Conception

- [ ] J'ai défini le scénario de ma planète (ambiance, référence animé)
- [ ] J'ai défini mes 3 interactions minimum :
  - [ ] Interaction 1 : input (handpose/posenet/mic), trigger, effet
  - [ ] Interaction 2 : input, trigger, effet
  - [ ] Interaction 3 : input, trigger, effet
- [ ] J'ai préparé mes assets (images/sons/vidéos) et les ai envoyés à Yousra/Julien
- [ ] J'ai noté les chemins de mes assets dans `assets/` (fournis par Yousra/Julien)

---

## 💻 Code — Fichier Principal

### Créer `TaPlanet.js`

- [ ] Créer le fichier `planets/ta-planete/TaPlanet.js`
- [ ] Déclarer la classe qui étend `Planet` :
  ```js
  class TaPlanet extends Planet {
      constructor() {
          super('Nom Planète', '#couleur')
      }
      draw() {
          background(0)
      }
  }
  ```
- [ ] Ajouter les quêtes dans le `constructor` :
  ```js
  window.questSystem.addQuest('id1', 'Texte objectif 1')
  window.questSystem.addQuest('id2', 'Texte objectif 2')
  window.questSystem.addQuest('id3', 'Texte objectif 3')
  ```
- [ ] Instancier les interactions :
  ```js
  this.interaction1 = new TonInteraction1()
  this.interaction1.start()
  ```

---

## 🎯 Code — Interaction 1

### Créer `Interaction1.js`

- [ ] Créer le fichier `planets/ta-planete/interactions/Interaction1.js`
- [ ] Déclarer la classe qui étend `Interaction` :
  ```js
  class TonInteraction1 extends Interaction {
      constructor() {
          super({
              name: 'Nom interaction',
              input: 'handpose',
              triggerFn: () => this._checkTrigger(),
              onSuccess: () => this._onSuccess(),
              fallback: new KeyboardFallback(['a','b','c'])
          })
      }
  }
  ```
- [ ] Implémenter `_checkTrigger()` qui retourne `true` quand réussi
- [ ] Implémenter `_onSuccess()` :
  ```js
  _onSuccess() {
      window.questSystem.completeQuest('id1')
      window.crystalSystem.addCrystal()
  }
  ```
- [ ] Tester l'interaction en local

---

## 🎯 Code — Interaction 2

- [ ] Créer `planets/ta-planete/interactions/Interaction2.js`
- [ ] Déclarer la classe `TonInteraction2 extends Interaction`
- [ ] Implémenter `_checkTrigger()` et `_onSuccess()`
- [ ] Ajouter dans `TaPlanet.js` :
  ```js
  this.interaction2 = new TonInteraction2()
  this.interaction2.start()
  ```
- [ ] Tester l'interaction en local

---

## 🎯 Code — Interaction 3

- [ ] Créer `planets/ta-planete/interactions/Interaction3.js`
- [ ] Déclarer la classe `TonInteraction3 extends Interaction`
- [ ] Implémenter `_checkTrigger()` et `_onSuccess()`
- [ ] Ajouter dans `TaPlanet.js` :
  ```js
  this.interaction3 = new TonInteraction3()
  this.interaction3.start()
  ```
- [ ] Tester l'interaction en local

---

## 🔄 Fallbacks (recommandé)

- [ ] Utiliser `KeyboardFallback` ou `ClickZoneFallback` dans tes interactions
- [ ] Tester les fallbacks en local

---

## 🧪 Tests Locaux

- [ ] Lancer le serveur : `php -S localhost:8000` ou `npx serve`
- [ ] Ouvrir `http://localhost:8000`
- [ ] Vérifier que la planète s'affiche
- [ ] Tester chaque interaction une par une
- [ ] Vérifier que les quêtes se complètent
- [ ] Vérifier que les cristaux s'ajoutent
- [ ] Tester les fallbacks clavier/souris
- [ ] Vérifier la console pour les erreurs

---

## 📝 Documentation

- [ ] Remplir `planets/ta-planete/README.md` avec :
  - [ ] Scénario de la planète
  - [ ] Description des 3 interactions
  - [ ] Tableau recap (input, trigger, effet, référence)
- [ ] Ajouter des commentaires dans le code si nécessaire

---

## 🚀 Git — Push

- [ ] Vérifier les fichiers modifiés : `git status`
- [ ] Vérifier le contenu : `git diff`
- [ ] Ajouter les fichiers : `git add planets/ta-planete/`
- [ ] Committer : `git commit -m "feat(ta-planete): implémentation des 3 interactions"`
- [ ] Pusher : `git push origin feat/ta-planete-ton-prenom`

---

## 🔀 Pull Request

- [ ] Aller sur GitHub
- [ ] Créer une Pull Request de `feat/ta-planete-ton-prenom` → `planet/ta-planete`
- [ ] Ajouter une description claire de ce qui a été fait
- [ ] Assigner Yousra ou Julien comme reviewer
- [ ] Attendre la review et les retours
- [ ] Corriger si nécessaire

---

## 🎉 Finalisation

- [ ] PR mergée dans `planet/ta-planete`
- [ ] Prévenir Yousra/Julien que ta planète est terminée
- [ ] Attendre l'intégration finale dans `develop` puis `main`
- [ ] Tester la version finale une fois intégrée

---

**🎯 Objectif :** Chaque personne = minimum 3 interactions fonctionnelles avec trigger ml5/p5/audio + fallback clavier/souris.

**❓ Problème ?** → Appelle Yousra ou Julien immédiatement, ne reste pas bloqué.
```

# 🛠 Level Editor — Time Jump

> **Activer / désactiver l'éditeur : touche `E`**
> L'éditeur fonctionne en superposition sur le jeu. Le jeu continue de tourner derrière.

---

## Où se trouve l'éditeur

Un panneau semi-transparent apparaît en **haut à gauche** de l'écran dès que l'éditeur est actif. Il affiche :
- Les **onglets de niveaux** (clic pour changer de niveau)
- La liste des **raccourcis clavier**
- Les **propriétés de l'objet sélectionné**

---

## Contrôles globaux (toujours disponibles)

| Touche | Action |
|--------|--------|
| `E` | Activer / désactiver l'éditeur |
| `V` | Basculer entre vue fenêtre et vue niveau complet 5760×1200 *(mode debug multi-écrans uniquement)* |

---

## Raccourcis de l'éditeur (éditeur actif)

### Fichier & niveaux

| Touche | Action |
|--------|--------|
| `S` | **Sauvegarder** — génère le texte `LEVELS_DATA` et l'écrit dans le fichier lié (ou l'affiche si pas de fichier) |
| `F` | **Lier un fichier** — ouvre un sélecteur pour pointer vers `level_data.js` (obligatoire pour la sauvegarde directe) |
| `PageUp` | Niveau précédent |
| `PageDown` | Niveau suivant |

> ⚠️ Après avoir cliqué sur `S`, si aucun fichier n'est lié (`F`), le texte généré s'affiche dans la console. Il faut le copier manuellement dans `level_data.js`.

---

### Créer des objets

Chaque objet est créé **au centre de l'écran visible** et est immédiatement sélectionné.

| Touche | Objet créé |
|--------|-----------|
| `N` | **Obstacle** (plateforme, mur, sol — 150×30 par défaut) |
| `B` | **Push Box** (caisse poussable — 90×90) |
| `T` | **Terminal** (mini-jeu Helldivers — 60×90) |
| `J` | **Ennemi** (patrouille de ±100 px autour du centre) |
| `D` | **Data Box** (boîte de données à ramasser — 60×60) |
| `G` | **Goal Zone** (zone cible pour déposer une data box — 110×110) |

---

### Sélection & manipulation à la souris

| Action | Effet |
|--------|-------|
| **Clic gauche** sur un objet | Sélectionner |
| **Clic dans le vide** | Désélectionner |
| **Glisser** un objet sélectionné | Déplacer |
| **Glisser une poignée** (carré jaune en coin/bord) | Redimensionner en largeur / hauteur |
| **Clic sur un onglet** de niveau (panneau HUD) | Changer de niveau |

> Les poignées de redimensionnement apparaissent sur l'objet sélectionné. Deux poignées : coin **SE** (resize W+H) et bord **E** (resize W uniquement).

---

### Supprimer

| Touche | Action |
|--------|--------|
| `Suppr` ou `Backspace` | Supprimer l'objet sélectionné |

---

## Raccourcis contextuels (selon l'objet sélectionné)

### 🟦 Obstacle (`N`)

| Touche | Action |
|--------|--------|
| `1` | Toggle **pOnly** — visible/solide uniquement dans l'ère *Présent* |
| `2` | Toggle **paOnly** — visible/solide uniquement dans l'ère *Passé* |
| `3` | Toggle **low** — marque comme passage bas (le joueur peut passer accroupi) |
| `4` | Toggle **destroyable** — peut être détruit |
| `L` | Renommer le label (nom interne affiché dans l'éditeur) |

> `pOnly` et `paOnly` sont mutuellement exclusifs — activer l'un désactive l'autre.

---

### 🟧 Push Box (`B`)

| Touche | Action |
|--------|--------|
| `C` | Changer la couleur — ouvre 3 prompts R / G / B (valeurs 0–255) |

---

### 🔴 Ennemi (`J`)

| Touche / Action | Effet |
|-----------------|-------|
| `K` | Modifier la **vitesse** de patrouille (prompt numérique) |
| **Glisser le corps** de l'ennemi | Déplacer l'ennemi ET sa zone de patrouille ensemble |
| **Glisser le ♦ gauche** | Ajuster la borne gauche de la patrouille |
| **Glisser le ♦ droit** | Ajuster la borne droite de la patrouille |

> Les deux diamants ♦ rouges indiquent les extrémités de la zone de patrouille. Ils apparaissent au sol quand l'ennemi est sélectionné.

---

### 🟦 Terminal (`T`)

| Touche | Action |
|--------|--------|
| `K` | Modifier le nombre de **touches** à presser et le **temps** imparti par touche (deux prompts successifs) |
| `L` | Modifier l'**unlock label** — nom de l'obstacle déverrouillé quand le mini-jeu est réussi |

> L'`unlockLabel` doit correspondre exactement au `lbl` de l'obstacle ciblé (ex : `'Mur Bêta'`).

---

### 🟡 Data Box (`D`)

| Touche | Action |
|--------|--------|
| `I` | Modifier l'**ID** de la data box (prompt) |

> L'ID doit correspondre à celui de la Goal Zone où la boîte doit être déposée (ex : `"data-1"`).

---

### 🔵 Goal Zone (`G`)

| Touche | Action |
|--------|--------|
| `I` | Modifier l'**ID** de la zone cible (prompt) |

> L'ID doit correspondre à celui de la Data Box associée. Même ID = même paire.

---

## Panneau HUD (haut gauche)

```
🛠 LEVEL EDITOR  [E=quitter]
[ Niv 1 ] [ Niv 2 ] [ Niv 3 ] [ Niv 4 ] [ Niv 5 ]

N=obs  B=boîte  T=terminal  J=ennemi
D=dbox  G=zone  Del=supp  S=save  F=fichier
PageUp/Down=niveau  Clic=sel  Drag=déplacer

■ Légende couleurs :
  ⬜ Obstacle (gris)    🟥 Destroyable (rouge)
  🟩 Low (vert)         🟧 Box (orange)
  🔴 Enemy (rouge foncé) 🟦 Terminal (cyan)
  🟡 DBox (jaune)       🔷 Zone (bleu clair)
  🟣 Door (violet)

► [Type sélectionné] [index]
   x:…  y:…  w:…  h:…
   (propriétés spécifiques selon le type)
```

---

## Ordre de priorité des clics

Quand plusieurs objets se superposent, la sélection privilégie dans cet ordre :

1. Onglets du HUD (canvas)
2. Poignées de redimensionnement de l'objet déjà sélectionné
3. Poignées ♦ de patrouille (si un ennemi est déjà sélectionné)
4. Porte de sortie
5. **Terminaux**
6. **Goal Zones (data zones)**
7. **Data Boxes**
8. **Corps des ennemis**
9. **Push Boxes**
10. **Obstacles**

---

## Workflow type

```
1. Ouvrir le jeu dans le navigateur
2. Appuyer sur E  →  éditeur actif
3. F  →  lier level_data.js (une seule fois par session)
4. Se déplacer dans le niveau (touches jeu normales)
5. Créer / sélectionner / déplacer des objets
6. S  →  sauvegarder
7. PageDown / PageUp  →  changer de niveau
8. E  →  retour au jeu normal
```

---

## Débogage — console navigateur (F12)

Après l'activation de l'éditeur, chaque clic dans le monde affiche :

```
[ED] click mx=1280 my=433 → wx=1950 wy=975 | terms=1 zones=1 enems=2
[ED] terminal[0] x=1950 y=975 w=60 h=90 | hit=true
[ED] enemy[0] x=4650 | Yhit: wy=1029 in [1029..1119]? true
```

Si `terms=0` → les tableaux éditeur ne sont pas chargés (recharger la page avec `Ctrl+Shift+R`).
Si `hit=false` → problème de coordonnées (signaler avec les valeurs affichées).

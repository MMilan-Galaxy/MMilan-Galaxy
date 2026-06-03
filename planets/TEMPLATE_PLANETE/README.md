# Nom de ta planète

> Courte description de l'expérience proposée sur cette planète.

## Auteur

- **Prénom Nom** — @pseudo_github

## Lancer la planète

Ouvrir `index.html` depuis un serveur local :

```
http://localhost/space_delivery/planets/<nom-planete>/index.html
```

## Contrôles

| Action | Contrôle |
|--------|----------|
| ... | ... |

## Structure

```
<nom-planete>/
├── index.html       # Point d'entrée
├── sketch.js        # Logique principale
└── assets/          # Sons, images, etc.
```

## Intégration dans Space Delivery

Ta planète est chargée en <iframe> depuis cockpit/index.html.  
Pour retourner au vaisseau, déclenche :

```js
window.parent.postMessage({ type: "returnToShip" }, "*");
```

## Notes

_Ajoute ici toute info utile : dépendances spéciales, bugs connus, idées…_

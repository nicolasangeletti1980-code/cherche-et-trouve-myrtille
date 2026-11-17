# Les Cherche et Trouve de Myrtille

Un jeu de cherche-et-trouve pour Myrtille (4 ans), à jouer téléphone couché.
Il s'installe comme une appli et marche sans internet.

## Une partie

- Une grande scène très chargée. À droite, **12 objets à trouver**, tous différents,
  tirés au hasard parmi tous les objets repérés dans la scène.
- On touche l'objet dans l'image : rond vert, petite note, la voix dit son nom,
  la vignette est cochée. Toucher une vignette fait dire « Trouve le … ! ».
- Toucher à côté : un petit « bloup » neutre, sans punition. Pas de chrono.
- **Indice** : après **1 minute** sans rien trouver, un objet se met à briller
  et sa vignette se dandine.
- Zoom à deux doigts, glisser à un doigt, bouton loupe pour revoir toute l'image.
- Victoire : **feu d'artifice + fanfare** (mélodie originale), puis « Bravo Myrtille ! ».

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `jeu.js` | La page et le moteur du jeu |
| `sons.js` | Carillon, « bloup », fanfare (fabriqués par le navigateur) |
| `feu.js` | Le feu d'artifice |
| `donnees.js`, `fichiers.js` | **Fabriqués** par `outils/generer_donnees.py`, ne pas modifier à la main |
| `scenes/<id>.webp`, `vignettes/<id>/*.webp` | **Fabriqués** par `outils/preparer_scene.py` |
| `voix/liste.js` | Les enregistrements de la voix de papa (voir ce fichier) |
| `sw.js` | La copie hors ligne |
| `outils/` | Images sources, positions des objets, thèmes, scripts |

## Ajouter une scène

1. Mettre l'image dans `outils/<id>-source.png`.
2. Écrire `outils/<id>.json` : pour chaque objet, son nom avec l'article et ses zones
   `[x, y, largeur, hauteur]` en pixels de l'image source. Chaque objet doit être
   **unique** dans l'image.
3. Ajouter la scène (avec sa largeur et sa hauteur) dans `outils/themes.json`.
4. `python3 outils/preparer_scene.py <id>` puis `python3 outils/generer_donnees.py`.

## Essayer en local

```
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000.

## État actuel

Thème Dinosaures : 2 scènes en paysage, `dino1` « jungle et volcan » (1500 × 844,
30 objets) et `dino2` « bord du lac » (1671 × 941, 29 objets), images fournies par
papa (faites avec ChatGPT), positions vérifiées en dessinant les cadres.

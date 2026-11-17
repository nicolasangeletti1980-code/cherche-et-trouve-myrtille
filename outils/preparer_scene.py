# Prépare une scène pour le jeu :
#  - l'image de la scène en WebP (plus légère),
#  - une vignette carrée par objet (pour la liste "à trouver").
# Utilisation : python3 outils/preparer_scene.py dino1
import json, sys
from PIL import Image

nom = sys.argv[1]
source = Image.open(f"outils/{nom}-source.png").convert("RGB")
source.save(f"scenes/{nom}.webp", "WEBP", quality=88, method=6)

objets = json.load(open(f"outils/{nom}.json", encoding="utf-8"))
for cle, objet in objets.items():
    x, y, l, h = objet["zones"][0]           # la vignette montre la 1re zone
    cote = max(l, h) + 10                     # un carré un peu plus grand
    cote = min(cote, source.width, source.height)
    cx, cy = x + l / 2, y + h / 2
    # on garde le carré dans l'image (sinon une bande noire apparaît au bord)
    gauche = min(max(0, cx - cote / 2), source.width - cote)
    haut = min(max(0, cy - cote / 2), source.height - cote)
    boite = (int(gauche), int(haut), int(gauche + cote), int(haut + cote))
    source.crop(boite).resize((160, 160), Image.LANCZOS).save(
        f"vignettes/{nom}/{cle}.webp", "WEBP", quality=85, method=6)
print(len(objets), "vignettes")

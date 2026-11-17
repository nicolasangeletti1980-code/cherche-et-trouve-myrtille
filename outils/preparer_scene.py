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
    cx, cy = x + l / 2, y + h / 2
    boite = (int(cx - cote / 2), int(cy - cote / 2), int(cx + cote / 2), int(cy + cote / 2))
    source.crop(boite).resize((160, 160), Image.LANCZOS).save(
        f"vignettes/{nom}/{cle}.webp", "WEBP", quality=85, method=6)
print(len(objets), "vignettes")

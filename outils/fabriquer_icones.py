# Fabrique les icônes de l'appli à partir du tricératops de la scène dino1.
from PIL import Image
source = Image.open("outils/dino1-source.png").convert("RGB")
carre = source.crop((345, 285, 545, 485))         # la tête du tricératops
for taille in (180, 192, 512):
    carre.resize((taille, taille), Image.LANCZOS).save(f"icone-{taille}.png", optimize=True)

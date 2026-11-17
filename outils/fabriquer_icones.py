# Fabrique les icônes de l'appli à partir du tricératops violet (outils/icone-source.png).
from PIL import Image
source = Image.open("outils/icone-source.png").convert("RGB")
carre = source.crop((345, 285, 545, 485))         # la tête du tricératops
for taille in (180, 192, 512):
    carre.resize((taille, taille), Image.LANCZOS).save(f"icone-{taille}.png", optimize=True)

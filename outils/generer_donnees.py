# Fabrique donnees.js (lu par le jeu) à partir de themes.json
# et des fichiers de positions outils/<scene>.json.
# Utilisation : python3 outils/generer_donnees.py
import json

themes = json.load(open("outils/themes.json", encoding="utf-8"))
for theme in themes:
    for scene in theme["scenes"]:
        objets = json.load(open(f"outils/{scene['id']}.json", encoding="utf-8"))
        scene["objets"] = [{"id": cle, **valeur} for cle, valeur in objets.items()]

with open("donnees.js", "w", encoding="utf-8") as f:
    f.write("// Fichier fabriqué par outils/generer_donnees.py : ne pas modifier à la main.\n")
    f.write("const THEMES = ")
    json.dump(themes, f, ensure_ascii=False, indent=1)
    f.write(";\n")
print("donnees.js :", sum(len(s["objets"]) for t in themes for s in t["scenes"]), "objets")

# ----- La liste des fichiers à garder hors ligne (lue par sw.js) -----
# Le nom de la copie contient une empreinte de tous les fichiers :
# il change tout seul dès qu'un fichier change, et le téléphone se met à jour.
import hashlib, os

fichiers = ["index.html", "style.css", "jeu.js", "sons.js", "feu.js", "donnees.js",
            "voix/liste.js", "manifest.webmanifest",
            "icone-180.png", "icone-192.png", "icone-512.png"]
for theme in themes:
    for scene in theme["scenes"]:
        fichiers.append(f"scenes/{scene['id']}.webp")
        fichiers += [f"vignettes/{scene['id']}/{o['id']}.webp" for o in scene["objets"]]
voix = open("voix/liste.js", encoding="utf-8").read()
for nom in sorted(os.listdir("voix")):
    if nom.endswith(".mp3") and f'"{nom[:-4]}"' in voix:
        fichiers.append(f"voix/{nom}")

empreinte = hashlib.sha256()
for chemin in fichiers + ["sw.js"]:
    empreinte.update(open(chemin, "rb").read())

with open("fichiers.js", "w", encoding="utf-8") as f:
    f.write("// Fichier fabriqué par outils/generer_donnees.py : ne pas modifier à la main.\n")
    f.write(f'const NOM_COPIE = "cherche-trouve-{empreinte.hexdigest()[:10]}";\n')
    f.write("const FICHIERS = " + json.dumps(["./"] + ["./" + c for c in fichiers], indent=1) + ";\n")
print("fichiers.js :", len(fichiers), "fichiers")

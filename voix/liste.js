// ===================================================================
// Les enregistrements de la voix de papa.
//
// Tant qu'un mot n'est pas enregistré, c'est la voix du téléphone qui parle.
// Pour remplacer un mot par un enregistrement :
//   1. Mettre le fichier dans ce dossier, au format MP3, avec le nom de l'objet :
//        voix/perroquet.mp3   (« Le perroquet ! »)
//        voix/bravo.mp3       (« Bravo Myrtille ! »)
//        voix/trouve.mp3      (« Trouve… », dit avant le nom de l'objet)
//      Les noms des objets sont ceux de donnees.js (le champ "id").
//   2. Ajouter ce nom dans la liste ci-dessous.
//   3. Ajouter le fichier dans sw.js (pour le hors ligne) et changer NOM_COPIE.
// ===================================================================

const VOIX_ENREGISTREES = [
  // "perroquet",
  // "bravo",
];

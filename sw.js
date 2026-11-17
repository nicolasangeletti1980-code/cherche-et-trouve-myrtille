// ===================================================================
// Le "service worker" : il garde une copie du jeu dans le téléphone,
// pour pouvoir jouer sans internet.
// La liste des fichiers et le nom de la copie sont dans fichiers.js
// (fabriqué par outils/generer_donnees.py).
// ===================================================================

importScripts("fichiers.js");

// 1. Installation : on copie tous les fichiers
self.addEventListener("install", function (evenement) {
  evenement.waitUntil(
    caches.open(NOM_COPIE).then(function (copie) { return copie.addAll(FICHIERS); })
  );
  self.skipWaiting();
});

// 2. Activation : on efface les vieilles copies
self.addEventListener("activate", function (evenement) {
  evenement.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.map(function (nom) {
        if (nom !== NOM_COPIE) return caches.delete(nom);
      }));
    })
  );
  self.clients.claim();
});

// 3. À chaque fichier demandé : la copie du téléphone d'abord (rapide,
//    marche sans internet) ; sinon on va le chercher en ligne.
self.addEventListener("fetch", function (evenement) {
  if (evenement.request.method !== "GET") return;
  evenement.respondWith(
    caches.match(evenement.request, { ignoreSearch: true }).then(function (copie) {
      return copie || fetch(evenement.request);
    })
  );
});

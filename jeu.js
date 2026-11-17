// ===================================================================
// Les Cherche et Trouve de Myrtille : le moteur du jeu
//
// Une partie : une scène, 12 objets tous différents tirés au hasard
// parmi ceux repérés dans la scène (donnees.js). On touche un objet de
// la liste dans l'image : il est entouré en vert et coché dans la liste.
// Après 1 minute sans rien trouver, un objet se met à briller (l'indice).
// Quand les 12 sont trouvés : feu d'artifice, fanfare, « Bravo Myrtille ! ».
// ===================================================================

(function () {
  "use strict";

  // ----- Les réglages -----
  const NOMBRE_A_TROUVER = 12;
  const DELAI_INDICE = 60;         // secondes sans trouver avant l'indice
  const TOLERANCE_DOIGT = 14;      // pixels d'écran autour d'un objet qui comptent encore
  const CLE_DERNIERE_SCENE = "cherche-trouve-derniere-scene";

  // ----- Les éléments de la page -----
  const $ = function (id) { return document.getElementById(id); };
  const ecranAccueil = $("accueil"), ecranJeu = $("jeu");
  const cadre = $("cadre"), plateau = $("plateau"), calque = $("calque");
  const imageScene = $("image-scene"), liste = $("liste");
  const bravo = $("bravo");

  // ----- L'état de la partie -----
  let theme = null;          // le thème choisi
  let scene = null;          // la scène jouée
  let aTrouver = [];         // les 12 objets de la partie
  let trouves = new Set();   // les identifiants déjà trouvés
  let finie = false;

  // ===================================================================
  // 1. Petits outils
  // ===================================================================
  function lire(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } }
  function ecrire(cle, valeur) { try { localStorage.setItem(cle, valeur); } catch (e) { /* rien */ } }

  function melanger(tableau) {
    const t = tableau.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = t[i]; t[i] = t[j]; t[j] = x;
    }
    return t;
  }

  function majuscule(texte) { return texte.charAt(0).toUpperCase() + texte.slice(1); }

  // ===================================================================
  // 2. La voix : un enregistrement de papa s'il existe, sinon le téléphone
  // ===================================================================
  let voixFrancaise = null;
  function choisirVoix() {
    if (!("speechSynthesis" in window)) return;
    const voix = speechSynthesis.getVoices();
    voixFrancaise = voix.find(function (v) { return v.lang === "fr-FR"; }) ||
                    voix.find(function (v) { return v.lang && v.lang.indexOf("fr") === 0; }) || null;
  }
  if ("speechSynthesis" in window) {
    choisirVoix();
    speechSynthesis.addEventListener("voiceschanged", choisirVoix);
  }

  function parlerTelephone(texte) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const phrase = new SpeechSynthesisUtterance(texte);
    phrase.lang = "fr-FR";
    if (voixFrancaise) phrase.voice = voixFrancaise;
    phrase.rate = 0.9;
    phrase.pitch = 1.1;
    speechSynthesis.speak(phrase);
  }

  let lecteur = null;
  function jouerEnregistrements(noms) {
    if (lecteur) lecteur.pause();
    if (!noms.length) return;
    lecteur = new Audio("voix/" + noms[0] + ".mp3");
    lecteur.onended = function () { jouerEnregistrements(noms.slice(1)); };
    lecteur.play().catch(function () { /* rien */ });
  }

  function enregistre(nom) { return typeof VOIX_ENREGISTREES !== "undefined" && VOIX_ENREGISTREES.indexOf(nom) >= 0; }

  // dire(texte, [enregistrements à jouer à la place, s'ils existent tous])
  function dire(texte, enregistrements) {
    if (enregistrements && enregistrements.every(enregistre)) {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      jouerEnregistrements(enregistrements);
    } else {
      parlerTelephone(texte);
    }
  }

  // ===================================================================
  // 3. L'accueil
  // ===================================================================
  function construireAccueil() {
    const tuiles = $("tuiles");
    tuiles.innerHTML = "";
    THEMES.forEach(function (t) {
      const bouton = document.createElement("button");
      bouton.className = "tuile";
      bouton.innerHTML = '<img alt="" src="vignettes/' + t.scenes[0].id + "/" + t.tuile + '.webp"><span></span>';
      bouton.querySelector("span").textContent = t.nom;
      bouton.addEventListener("click", function () {
        Sons.preparer();
        pleinEcran();
        lancerTheme(t);
      });
      tuiles.appendChild(bouton);
    });
  }

  function montrerAccueil() {
    Feu.arreter();
    bravo.classList.add("cache");
    ecranJeu.classList.add("cache");
    ecranAccueil.classList.remove("cache");
    arreterMinuteur();
  }

  // Dans le navigateur (pas l'appli installée), on passe en plein écran
  // couché, pour que la barre d'adresse ne prenne pas de place.
  function pleinEcran() {
    const installee = window.matchMedia("(display-mode: standalone)").matches ||
                      window.matchMedia("(display-mode: fullscreen)").matches;
    const el = document.documentElement;
    if (installee || document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen().then(function () {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(function () { /* rien */ });
      }
    }).catch(function () { /* rien */ });
  }

  // ===================================================================
  // 4. Lancer une partie
  // ===================================================================
  function lancerTheme(t) {
    theme = t;
    // une autre scène que la dernière jouée, quand il y en a plusieurs
    const derniere = lire(CLE_DERNIERE_SCENE);
    let choix = t.scenes.filter(function (s) { return s.id !== derniere; });
    if (!choix.length) choix = t.scenes;
    scene = choix[Math.floor(Math.random() * choix.length)];
    ecrire(CLE_DERNIERE_SCENE, scene.id);

    aTrouver = melanger(scene.objets).slice(0, NOMBRE_A_TROUVER);
    trouves = new Set();
    finie = false;

    Feu.arreter();
    bravo.classList.add("cache");
    ecranAccueil.classList.add("cache");
    ecranJeu.classList.remove("cache");

    calque.innerHTML = "";
    construireListe();
    imageScene.onload = function () { ajuster(); };
    imageScene.src = "scenes/" + scene.id + ".webp";
    if (imageScene.complete && imageScene.naturalWidth) ajuster();
    demarrerMinuteur();
  }

  function construireListe() {
    liste.innerHTML = "";
    aTrouver.forEach(function (objet) {
      const li = document.createElement("li");
      li.dataset.id = objet.id;
      const bouton = document.createElement("button");
      bouton.setAttribute("aria-label", objet.nom);
      bouton.innerHTML = '<img alt="" src="vignettes/' + scene.id + "/" + objet.id + '.webp">';
      bouton.addEventListener("click", function () {
        Sons.preparer();
        if (trouves.has(objet.id)) dire(majuscule(objet.nom) + " !", [objet.id]);
        else dire("Trouve " + objet.nom + " !", ["trouve", objet.id]);
      });
      li.appendChild(bouton);
      liste.appendChild(li);
    });
    tailleVignettes();
  }

  // Les 12 vignettes : 2 colonnes x 6 lignes qui tiennent dans la hauteur
  const COLONNES = 2;
  function tailleVignettes() {
    const lignes = Math.ceil(aTrouver.length / COLONNES) || 6;
    const hauteur = window.innerHeight - 12 - (lignes - 1) * 4;
    const taille = Math.max(32, Math.min(90, Math.floor(hauteur / lignes)));
    liste.style.setProperty("--vignette", taille + "px");
    liste.style.setProperty("--lignes", lignes);
    liste.style.setProperty("--colonnes", COLONNES);
  }

  // ===================================================================
  // 5. La scène est FIXE : elle tient entière dans le cadre, on ne peut
  //    ni la grossir ni la déplacer avec les doigts. Seul le toucher compte.
  // ===================================================================
  let base = 1;

  function ajuster() {
    tailleVignettes();
    const l = cadre.clientWidth, h = cadre.clientHeight;
    base = Math.min(l / scene.largeur, h / scene.hauteur);
    const pl = scene.largeur * base, ph = scene.hauteur * base;
    plateau.style.width = pl + "px";
    plateau.style.height = ph + "px";
    plateau.style.transform = "translate(" + (l - pl) / 2 + "px," + (h - ph) / 2 + "px)";
  }

  // Un toucher compte s'il ne glisse pas trop (sinon c'est un geste raté)
  let depart = null;
  cadre.addEventListener("pointerdown", function (e) {
    if (e.target.closest("button")) return;
    Sons.preparer();
    depart = e.isPrimary ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  });
  cadre.addEventListener("pointerup", function (e) {
    if (!depart || e.pointerId !== depart.id) return;
    if (Math.hypot(e.clientX - depart.x, e.clientY - depart.y) <= 15) {
      toucherScene(e.clientX, e.clientY);
    }
    depart = null;
  });
  cadre.addEventListener("pointercancel", function () { depart = null; });
  // pas de menu ni de loupe du navigateur sur un appui long
  cadre.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  // ===================================================================
  // 6. Toucher la scène : a-t-on trouvé un objet ?
  // ===================================================================

  // Distance (en pixels de l'image) entre un point et un objet (0 = dedans)
  function distance(objet, x, y) {
    let meilleure = Infinity;
    objet.zones.forEach(function (z) {
      const ex = Math.max(z[0] - x, 0, x - (z[0] + z[2]));
      const ey = Math.max(z[1] - y, 0, y - (z[1] + z[3]));
      meilleure = Math.min(meilleure, Math.hypot(ex, ey));
    });
    return meilleure;
  }

  function toucherScene(clientX, clientY) {
    if (finie) return;
    const r = plateau.getBoundingClientRect();
    const echelle = r.width / scene.largeur;              // pixels d'écran par pixel d'image
    const x = (clientX - r.left) / echelle;
    const y = (clientY - r.top) / echelle;
    const tolerance = TOLERANCE_DOIGT / echelle;

    // L'objet de la scène le plus proche du doigt (même ceux qui ne sont pas à trouver :
    // toucher le volcan quand il n'est pas dans la liste, ce n'est pas trouver l'objet voisin)
    let plusProche = null, dMin = Infinity;
    scene.objets.forEach(function (o) {
      const d = distance(o, x, y);
      if (d < dMin) { dMin = d; plusProche = o; }
    });

    const cherche = plusProche && dMin <= tolerance &&
                    aTrouver.some(function (o) { return o.id === plusProche.id; }) &&
                    !trouves.has(plusProche.id);
    if (cherche) {
      objetTrouve(plusProche);
    } else {
      Sons.sonRate();
      const rond = document.createElement("div");
      rond.className = "rate";
      rond.style.left = (x / scene.largeur * 100) + "%";
      rond.style.top = (y / scene.hauteur * 100) + "%";
      calque.appendChild(rond);
      setTimeout(function () { rond.remove(); }, 600);
    }
  }

  // Un rond (en % de la scène) autour de chaque zone de l'objet
  function entourer(objet, classe) {
    const ronds = [];
    // L'indice doit se voir même quand toute la scène est affichée en petit :
    // son rond fait au moins 70 pixels d'écran.
    const minimum = classe === "lueur" ? 70 / base : 0;
    objet.zones.forEach(function (z) {
      const marge = classe === "lueur" ? 0.35 : 0.18;
      const l = Math.max(z[2] * (1 + 2 * marge), minimum);
      const h = Math.max(z[3] * (1 + 2 * marge), minimum);
      const cx = z[0] + z[2] / 2, cy = z[1] + z[3] / 2;
      const rond = document.createElement("div");
      rond.className = classe;
      rond.style.left = ((cx - l / 2) / scene.largeur * 100) + "%";
      rond.style.top = ((cy - h / 2) / scene.hauteur * 100) + "%";
      rond.style.width = (l / scene.largeur * 100) + "%";
      rond.style.height = (h / scene.hauteur * 100) + "%";
      calque.appendChild(rond);
      ronds.push(rond);
    });
    return ronds;
  }

  function objetTrouve(objet) {
    trouves.add(objet.id);
    enleverIndice();
    entourer(objet, "marque");
    const li = liste.querySelector('li[data-id="' + objet.id + '"]');
    if (li) li.classList.add("trouve");
    Sons.sonTrouve(trouves.size);
    dire(majuscule(objet.nom) + " !", [objet.id]);
    remettreMinuteur();
    if (trouves.size === aTrouver.length) setTimeout(victoire, 900);
  }

  // ===================================================================
  // 7. L'indice : après 1 minute sans trouver, un objet brille
  //    (le temps ne compte pas quand l'appli est cachée)
  // ===================================================================
  let attente = 0, minuteur = null, indice = null;

  function demarrerMinuteur() {
    arreterMinuteur();
    attente = 0;
    minuteur = setInterval(function () {
      if (document.hidden || finie || ecranJeu.classList.contains("cache")) return;
      attente += 1;
      if (attente >= DELAI_INDICE && !indice) montrerIndice();
    }, 1000);
  }
  function arreterMinuteur() {
    if (minuteur) clearInterval(minuteur);
    minuteur = null;
    enleverIndice();
  }
  function remettreMinuteur() { attente = 0; }

  function montrerIndice() {
    const restants = aTrouver.filter(function (o) { return !trouves.has(o.id); });
    if (!restants.length) return;
    const objet = restants[Math.floor(Math.random() * restants.length)];
    indice = { objet: objet, ronds: entourer(objet, "lueur") };
    const li = liste.querySelector('li[data-id="' + objet.id + '"]');
    if (li) li.classList.add("indice");
  }
  function enleverIndice() {
    if (!indice) return;
    indice.ronds.forEach(function (r) { r.remove(); });
    const li = liste.querySelector('li[data-id="' + indice.objet.id + '"]');
    if (li) li.classList.remove("indice");
    indice = null;
  }

  // ===================================================================
  // 8. La victoire
  // ===================================================================
  function victoire() {
    finie = true;
    arreterMinuteur();
    const duree = Sons.fanfare() || 4;
    Feu.lancer(duree + 2);
    setTimeout(function () {
      if (!finie) return;
      bravo.classList.remove("cache");
      dire("Bravo Myrtille !", ["bravo"]);
    }, duree * 1000 + 300);
  }

  $("bouton-rejouer").addEventListener("click", function () { lancerTheme(theme); });
  $("bouton-accueil").addEventListener("click", montrerAccueil);
  $("bouton-maison").addEventListener("click", montrerAccueil);

  // ===================================================================
  // 9. Démarrage
  // ===================================================================
  window.addEventListener("resize", function () {
    if (scene && !ecranJeu.classList.contains("cache")) ajuster();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && "speechSynthesis" in window) speechSynthesis.cancel();
  });

  construireAccueil();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* rien */ });
    });
  }
})();

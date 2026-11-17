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
  const ZOOM_MAX = 5;
  const TOLERANCE_DOIGT = 14;      // pixels d'écran autour d'un objet qui comptent encore
  const CLE_DERNIERE_SCENE = "cherche-trouve-derniere-scene";

  // ----- Les éléments de la page -----
  const $ = function (id) { return document.getElementById(id); };
  const ecranAccueil = $("accueil"), ecranJeu = $("jeu");
  const cadre = $("cadre"), plateau = $("plateau"), calque = $("calque");
  const imageScene = $("image-scene"), liste = $("liste");
  const boutonZoom = $("bouton-zoom"), bravo = $("bravo");

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

  // 6 vignettes doivent tenir dans la hauteur de l'écran
  function tailleVignettes() {
    const hauteur = window.innerHeight - 12 - 5 * 5;
    const taille = Math.max(36, Math.min(96, Math.floor(hauteur / 6)));
    liste.style.setProperty("--vignette", taille + "px");
  }

  // ===================================================================
  // 5. Le zoom et le déplacement de la scène
  //    base : taille de la scène quand elle tient entière dans le cadre
  //    zoom : 1 = toute la scène ; jusqu'à ZOOM_MAX
  // ===================================================================
  let base = 1, zoom = 1, dx = 0, dy = 0;

  function ajuster() {
    tailleVignettes();
    const l = cadre.clientWidth, h = cadre.clientHeight;
    base = Math.min(l / scene.largeur, h / scene.hauteur);
    plateau.style.width = scene.largeur * base + "px";
    plateau.style.height = scene.hauteur * base + "px";
    zoom = 1;
    appliquer();
  }

  // On garde la scène dans le cadre (pas de grand vide sur les côtés)
  function borner() {
    const l = cadre.clientWidth, h = cadre.clientHeight;
    const pl = scene.largeur * base * zoom, ph = scene.hauteur * base * zoom;
    dx = pl <= l ? (l - pl) / 2 : Math.min(0, Math.max(l - pl, dx));
    dy = ph <= h ? (h - ph) / 2 : Math.min(0, Math.max(h - ph, dy));
  }

  function appliquer() {
    borner();
    plateau.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + zoom + ")";
    boutonZoom.classList.toggle("cache", zoom <= 1.01);
  }

  // Zoomer en gardant le point (cx, cy) du cadre sous le doigt
  function zoomerVers(nouveauZoom, cx, cy) {
    nouveauZoom = Math.max(1, Math.min(ZOOM_MAX, nouveauZoom));
    dx = cx - (cx - dx) * (nouveauZoom / zoom);
    dy = cy - (cy - dy) * (nouveauZoom / zoom);
    zoom = nouveauZoom;
    appliquer();
  }

  boutonZoom.addEventListener("click", function () { zoom = 1; appliquer(); });

  // ----- Les doigts sur la scène -----
  const doigts = new Map();
  let geste = null;   // { type: "toucher" | "glisser" | "pincer", ... }

  function pointDuCadre(e) {
    const r = cadre.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  cadre.addEventListener("pointerdown", function (e) {
    if (e.target.closest("button")) return;
    Sons.preparer();
    cadre.setPointerCapture(e.pointerId);
    doigts.set(e.pointerId, pointDuCadre(e));
    if (doigts.size === 1) {
      const p = pointDuCadre(e);
      geste = { type: "toucher", depart: p, dx0: dx, dy0: dy, debut: performance.now() };
    } else if (doigts.size === 2) {
      const [a, b] = Array.from(doigts.values());
      geste = {
        type: "pincer",
        ecart0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom0: zoom,
        milieu0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        dx0: dx, dy0: dy
      };
    }
  });

  cadre.addEventListener("pointermove", function (e) {
    if (!doigts.has(e.pointerId) || !geste) return;
    const p = pointDuCadre(e);
    doigts.set(e.pointerId, p);

    if (geste.type === "pincer" && doigts.size >= 2) {
      const [a, b] = Array.from(doigts.values());
      const ecart = Math.hypot(a.x - b.x, a.y - b.y);
      const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = Math.max(1, Math.min(ZOOM_MAX, geste.zoom0 * ecart / geste.ecart0));
      // le point de l'image qui était sous les doigts reste sous les doigts
      dx = milieu.x - (geste.milieu0.x - geste.dx0) * (z / geste.zoom0);
      dy = milieu.y - (geste.milieu0.y - geste.dy0) * (z / geste.zoom0);
      zoom = z;
      appliquer();
    } else if (geste.type === "toucher" || geste.type === "glisser") {
      const ddx = p.x - geste.depart.x, ddy = p.y - geste.depart.y;
      if (geste.type === "toucher" && Math.hypot(ddx, ddy) > 10) geste.type = "glisser";
      if (geste.type === "glisser") {
        dx = geste.dx0 + ddx;
        dy = geste.dy0 + ddy;
        appliquer();
      }
    }
  });

  function finDoigt(e) {
    if (!doigts.has(e.pointerId)) return;
    doigts.delete(e.pointerId);
    if (geste && geste.type === "toucher" && doigts.size === 0 && e.type === "pointerup") {
      toucherScene(e.clientX, e.clientY);
    }
    if (doigts.size === 0) {
      geste = null;
    } else if (doigts.size === 1 && geste && geste.type === "pincer") {
      // il reste un doigt : il peut continuer à faire glisser
      const p = Array.from(doigts.values())[0];
      geste = { type: "glisser", depart: p, dx0: dx, dy0: dy };
    }
  }
  cadre.addEventListener("pointerup", finDoigt);
  cadre.addEventListener("pointercancel", finDoigt);

  // Sur ordinateur : la molette zoome
  cadre.addEventListener("wheel", function (e) {
    e.preventDefault();
    const p = pointDuCadre(e);
    zoomerVers(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p.x, p.y);
  }, { passive: false });

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
    zoom = 1;                          // on montre toute la scène pour voir la lueur
    appliquer();
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

// ===================================================================
// Le feu d'artifice de la victoire, dessiné dans un <canvas>.
// Feu.lancer(dureeEnSecondes) : des fusées montent et éclatent.
// Feu.arreter() : on efface tout.
// ===================================================================

const Feu = (function () {
  const COULEURS = ["#ff4d6d", "#ffd23f", "#3ccf5a", "#4dabff", "#c77dff", "#ff9f1c", "#ffffff"];
  let toile, pinceau, fusees = [], etincelles = [], fin = 0, prochaine = 0, enCours = false;

  function hasard(min, max) { return min + Math.random() * (max - min); }

  function dimensionner() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    toile.width = Math.floor(window.innerWidth * ratio);
    toile.height = Math.floor(window.innerHeight * ratio);
    pinceau.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function nouvelleFusee() {
    const l = window.innerWidth, h = window.innerHeight;
    fusees.push({
      x: hasard(l * 0.15, l * 0.85),
      y: h + 10,
      vy: -hasard(h * 0.9, h * 1.25),          // vitesse en pixels par seconde
      hauteurEclat: hasard(h * 0.15, h * 0.45),
      couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)]
    });
  }

  function eclater(f) {
    const nombre = 70;
    const force = hasard(140, 240);
    const deuxieme = Math.random() < 0.4 ? COULEURS[Math.floor(Math.random() * COULEURS.length)] : f.couleur;
    for (let i = 0; i < nombre; i++) {
      const angle = (i / nombre) * Math.PI * 2;
      const v = force * hasard(0.6, 1);
      etincelles.push({
        x: f.x, y: f.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        vie: 1,
        couleur: i % 2 ? f.couleur : deuxieme
      });
    }
    Sons.sonPop();
  }

  let avant = 0;
  function image(maintenant) {
    if (!enCours) return;
    const dt = Math.min((maintenant - avant) / 1000, 0.05);
    avant = maintenant;

    // un voile qui efface lentement : les étincelles laissent une traînée
    pinceau.globalCompositeOperation = "destination-out";
    pinceau.fillStyle = "rgba(0,0,0,0.22)";
    pinceau.fillRect(0, 0, window.innerWidth, window.innerHeight);
    pinceau.globalCompositeOperation = "source-over";

    if (maintenant < fin && maintenant > prochaine) {
      nouvelleFusee();
      if (Math.random() < 0.5) nouvelleFusee();     // parfois deux en même temps
      prochaine = maintenant + hasard(300, 600);
    }

    fusees = fusees.filter(function (f) {
      f.y += f.vy * dt;
      f.vy += 300 * dt;
      pinceau.fillStyle = f.couleur;
      pinceau.beginPath();
      pinceau.arc(f.x, f.y, 3, 0, Math.PI * 2);
      pinceau.fill();
      if (f.y <= f.hauteurEclat || f.vy >= 0) { eclater(f); return false; }
      return true;
    });

    etincelles = etincelles.filter(function (e) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.985;
      e.vy = e.vy * 0.985 + 90 * dt;     // la pesanteur
      e.vie -= dt * 0.7;
      if (e.vie <= 0) return false;
      pinceau.globalAlpha = Math.max(e.vie, 0);
      pinceau.fillStyle = e.couleur;
      pinceau.beginPath();
      pinceau.arc(e.x, e.y, 3.2, 0, Math.PI * 2);
      pinceau.fill();
      pinceau.globalAlpha = 1;
      return true;
    });

    if (maintenant < fin || fusees.length || etincelles.length) {
      requestAnimationFrame(image);
    } else {
      arreter();
    }
  }

  function lancer(duree) {
    toile = document.getElementById("feu");
    pinceau = toile.getContext("2d");
    toile.classList.remove("cache");
    dimensionner();
    pinceau.clearRect(0, 0, toile.width, toile.height);
    fusees = [];
    etincelles = [];
    enCours = true;
    avant = performance.now();
    fin = avant + duree * 1000;
    prochaine = avant;
    window.addEventListener("resize", dimensionner);
    requestAnimationFrame(image);
  }

  function arreter() {
    enCours = false;
    if (toile) {
      pinceau.clearRect(0, 0, toile.width, toile.height);
      toile.classList.add("cache");
    }
    window.removeEventListener("resize", dimensionner);
  }

  return { lancer, arreter };
})();

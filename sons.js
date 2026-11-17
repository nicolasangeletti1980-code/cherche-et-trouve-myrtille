// ===================================================================
// Les sons, fabriqués par le navigateur (aucun fichier son) :
//  - sonTrouve(n)  : une petite note de carillon, plus aiguë à chaque objet
//  - sonRate()     : un "bloup" doux et neutre quand on touche à côté
//  - sonPop()      : le "pof" d'une fusée du feu d'artifice
//  - fanfare()     : la musique de victoire (environ 4 secondes, originale)
// ===================================================================

const Sons = (function () {
  let ctx = null;
  let general = null;

  // Le navigateur n'autorise le son qu'après un premier toucher :
  // on prépare tout au premier toucher.
  function preparer() {
    if (!ctx) {
      const Contexte = window.AudioContext || window.webkitAudioContext;
      if (!Contexte) return null;
      ctx = new Contexte();
      general = ctx.createGain();
      general.gain.value = 0.8;
      general.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Une note : forme d'onde, fréquence, début, durée, volume
  function note(type, freq, debut, duree, volume, sortie) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, debut);
    env.gain.exponentialRampToValueAtTime(volume, debut + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    osc.connect(env);
    env.connect(sortie || general);
    osc.start(debut);
    osc.stop(debut + duree + 0.05);
  }

  // Les notes de la gamme de do majeur sur deux octaves (do4 à do6)
  const GAMME = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88,
                 523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];

  function sonTrouve(numero) {
    if (!preparer()) return;
    const t = ctx.currentTime;
    const f = GAMME[Math.min(numero + 2, GAMME.length - 1)];
    // un carillon : la note + son octave, qui s'éteignent doucement
    note("sine", f, t, 0.9, 0.35);
    note("sine", f * 2, t, 0.6, 0.12);
    note("triangle", f * 1.5, t + 0.08, 0.5, 0.1);
  }

  function sonRate() {
    if (!preparer()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(env);
    env.connect(general);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  function sonPop() {
    if (!preparer()) return;
    const t = ctx.currentTime;
    // un petit souffle de bruit filtré
    const duree = 0.35;
    const tampon = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duree), ctx.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < donnees.length; i++) {
      donnees[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / donnees.length, 3);
    }
    const bruit = ctx.createBufferSource();
    bruit.buffer = tampon;
    const filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = 1800 + Math.random() * 1500;
    const env = ctx.createGain();
    env.gain.value = 0.25;
    bruit.connect(filtre);
    filtre.connect(env);
    env.connect(general);
    bruit.start(t);
  }

  // Une note "cuivre" : dent de scie adoucie par un filtre
  function cuivre(freq, debut, duree, volume) {
    const osc = ctx.createOscillator();
    const filtre = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    filtre.type = "lowpass";
    filtre.frequency.setValueAtTime(900, debut);
    filtre.frequency.linearRampToValueAtTime(2600, debut + 0.06);
    filtre.frequency.linearRampToValueAtTime(1400, debut + duree);
    env.gain.setValueAtTime(0.0001, debut);
    env.gain.exponentialRampToValueAtTime(volume, debut + 0.03);
    env.gain.setValueAtTime(volume * 0.8, debut + Math.max(0.04, duree - 0.08));
    env.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    osc.connect(filtre);
    filtre.connect(env);
    env.connect(general);
    osc.start(debut);
    osc.stop(debut + duree + 0.05);
  }

  // Un coup de tambour grave
  function tambour(debut, volume) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, debut);
    osc.frequency.exponentialRampToValueAtTime(50, debut + 0.25);
    env.gain.setValueAtTime(volume, debut);
    env.gain.exponentialRampToValueAtTime(0.0001, debut + 0.3);
    osc.connect(env);
    env.connect(general);
    osc.start(debut);
    osc.stop(debut + 0.35);
  }

  // La fanfare de victoire : une mélodie originale composée pour le jeu.
  // [note en Hz, durée en temps] ; un temps = 0,18 seconde.
  const SOL4 = 392.0, DO5 = 523.25, RE5 = 587.33, MI5 = 659.25,
        FA5 = 698.46, SOL5 = 783.99, LA5 = 880.0, DO4 = 261.63,
        MI4 = 329.63, SOL3 = 196.0, DO3 = 130.81;
  const MELODIE = [
    [SOL4, 1], [DO5, 1], [MI5, 1], [SOL5, 3],
    [MI5, 1], [SOL5, 4],
    [LA5, 1], [SOL5, 1], [FA5, 1], [MI5, 1], [RE5, 1], [MI5, 1],
    [DO5, 6]
  ];

  function fanfare() {
    if (!preparer()) return 0;
    const temps = 0.18;
    let t = ctx.currentTime + 0.05;
    const depart = t;
    MELODIE.forEach(function (n) {
      cuivre(n[0], t, n[1] * temps * 0.95, 0.16);
      t += n[1] * temps;
    });
    // l'accord final (do - mi - sol) et les basses
    const fin = t - 6 * temps;
    cuivre(DO4, fin, 6 * temps, 0.09);
    cuivre(MI4, fin, 6 * temps, 0.08);
    cuivre(SOL3, fin, 6 * temps, 0.08);
    cuivre(DO3, fin, 6 * temps, 0.1);
    // le tambour sur les temps forts
    [0, 3, 6, 10, 14, 17, 20].forEach(function (b) {
      tambour(depart + b * temps, 0.5);
    });
    return t - ctx.currentTime;   // durée en secondes
  }

  return { preparer, sonTrouve, sonRate, sonPop, fanfare };
})();

/* =========================================================
   SACCHARIA — Audio (musique, voix, effets, boucles d'action)
   Fichiers MP3 optionnels dans assets/sounds/ (sinon synthèse)
   Voix dialogues : MP3 humains (assets/sounds/voices/) — pas de synthèse IA
   ========================================================= */

const GameSounds = (function () {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let enabled = true;
  let voiceEnabled = true;
  let initialized = false;

  let currentBgmKey = null;
  let bgmAudio = null;
  let bgmProc = null;

  const buffers = {};
  const loading = {};
  const loops = {};
  let lastBlowSfx = 0;
  let lastMixPlop = 0;

  const FILE_PATHS = {
    pickup: "assets/sounds/pickup.mp3",
    lose: "assets/sounds/lose.mp3",
    win: "assets/sounds/win.mp3",
    kingAngry: "assets/sounds/king_angry.mp3",
    hurt: "assets/sounds/hurt.mp3",
    wrong: "assets/sounds/wrong.mp3",
    interact: "assets/sounds/interact.mp3",
    blow: "assets/sounds/blow.mp3",
    mixStart: "assets/sounds/mix_start.mp3",
    memoryBeep: "assets/sounds/memory_beep.mp3",
    bakeDone: "assets/sounds/bake_done.mp3",
    bgm_world: "assets/sounds/bgm_world.mp3",
    bgm_kitchen: "assets/sounds/bgm_kitchen.mp3",
    bgm_angry: "assets/sounds/bgm_angry.mp3",
    bgm_east: "assets/sounds/bgm_east.mp3",
    bgm_west: "assets/sounds/bgm_west.mp3",
    bgm_throne: "assets/sounds/bgm_throne.mp3",
    loop_mix: "assets/sounds/loop_mix.mp3",
    loop_oven: "assets/sounds/loop_oven.mp3",
    loop_pour: "assets/sounds/loop_pour.mp3",
  };

  /** Accords pour arpège + pad (ambiance, pas une seule note). */
  const BGM_CHORDS = {
    world: [
      [261.63, 329.63, 392.0, 523.25],
      [293.66, 369.99, 440.0, 554.37],
      [329.63, 415.3, 493.88, 659.25],
    ],
    kitchen: [
      [293.66, 369.99, 440.0, 587.33],
      [329.63, 415.3, 493.88, 659.25],
      [349.23, 440.0, 523.25, 698.46],
    ],
    angry: [
      [110.0, 146.83, 174.61, 220.0],
      [123.47, 155.56, 185.0, 233.08],
      [130.81, 164.81, 196.0, 246.94],
    ],
    east: [
      [196.0, 246.94, 293.66, 392.0],
      [220.0, 277.18, 329.63, 440.0],
      [246.94, 311.13, 369.99, 493.88],
    ],
    west: [
      [349.23, 440.0, 523.25, 698.46],
      [392.0, 493.88, 587.33, 783.99],
      [440.0, 554.37, 659.25, 880.0],
    ],
    throne: [
      [220.0, 277.18, 329.63, 440.0],
      [246.94, 311.13, 369.99, 493.88],
      [261.63, 329.63, 392.0, 523.25],
    ],
  };

  /** Voix humaines libres de droit : un MP3 court par personnage (voir assets/sounds/voices/README.md). */
  const VOICE_FILES = {
    roi: "assets/sounds/voices/roi.mp3",
    confiturio: "assets/sounds/voices/confiturio.mp3",
    chef_marshmallow: "assets/sounds/voices/chef_marshmallow.mp3",
    chef_sali: "assets/sounds/voices/chef_sali.mp3",
    baron: "assets/sounds/voices/baron.mp3",
    zyx: "assets/sounds/voices/zyx.mp3",
    narrateur: "assets/sounds/voices/narrateur.mp3",
    distributeur: "assets/sounds/voices/distributeur.mp3",
    systeme: "assets/sounds/voices/systeme.mp3",
    default: "assets/sounds/voices/default.mp3",
  };

  for (const [id, path] of Object.entries(VOICE_FILES)) {
    FILE_PATHS["voice_" + id] = path;
  }

  const LOOP_FILE = {
    mixSoup: "loop_mix",
    mixBowl: "loop_mix",
    oven: "loop_oven",
    pour: "loop_pour",
  };

  const SYNTH = {
    pickup() {
      playTone({ freq: 523, freqEnd: 784, type: "sine", duration: 0.1, volume: 0.22 });
      playTone({ freq: 784, type: "triangle", duration: 0.08, volume: 0.14, delay: 0.06 });
    },
    lose() {
      playTone({ freq: 280, freqEnd: 120, type: "sawtooth", duration: 0.35, volume: 0.18 });
      playNoise(0.2, 0.12, 200);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => {
        playTone({ freq: f, type: "triangle", duration: 0.14, volume: 0.2, delay: i * 0.09 });
      });
    },
    kingAngry() {
      playTone({ freq: 90, freqEnd: 55, type: "square", duration: 0.5, volume: 0.12 });
      playNoise(0.35, 0.15, 120);
      playTone({ freq: 180, freqEnd: 140, type: "sawtooth", duration: 0.2, volume: 0.2, delay: 0.15 });
    },
    hurt() {
      playTone({ freq: 150, freqEnd: 80, type: "square", duration: 0.15, volume: 0.2 });
      playNoise(0.08, 0.18, 300);
    },
    wrong() {
      playTone({ freq: 200, freqEnd: 160, type: "square", duration: 0.12, volume: 0.15 });
    },
    interact() {
      playTone({ freq: 660, type: "sine", duration: 0.06, volume: 0.12 });
    },
    blow() {
      playNoise(0.14, 0.1, 900);
      playTone({ freq: 400, freqEnd: 200, type: "sine", duration: 0.1, volume: 0.08 });
    },
    mixStart() {
      playTone({ freq: 330, freqEnd: 440, type: "triangle", duration: 0.2, volume: 0.16 });
      playNoise(0.15, 0.08, 500);
    },
    memoryBeep() {
      playTone({ freq: 880, type: "square", duration: 0.05, volume: 0.1 });
    },
    bakeDone() {
      playTone({ freq: 523, type: "triangle", duration: 0.2, volume: 0.2 });
      playTone({ freq: 784, type: "sine", duration: 0.25, volume: 0.18, delay: 0.12 });
    },
    mixPlop() {
      playTone({ freq: 180 + Math.random() * 40, type: "sine", duration: 0.04, volume: 0.06 });
    },
  };

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.65;
      masterGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(masterGain);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.55;
      sfxGain.connect(masterGain);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function loadFile(key) {
    if (buffers[key] || loading[key] || !FILE_PATHS[key]) return;
    loading[key] = true;
    fetch(FILE_PATHS[key])
      .then(r => { if (!r.ok) throw new Error("missing"); return r.arrayBuffer(); })
      .then(ab => ensureCtx().decodeAudioData(ab))
      .then(decoded => { buffers[key] = decoded; })
      .catch(() => {})
      .finally(() => { loading[key] = false; });
  }

  function playBuffer(key, volume, loop) {
    const c = ensureCtx();
    if (!c || !buffers[key]) return false;
    const src = c.createBufferSource();
    src.buffer = buffers[key];
    src.loop = !!loop;
    const g = c.createGain();
    g.gain.value = volume ?? 0.7;
    src.connect(g);
    g.connect(loop ? musicGain : sfxGain);
    src.start(0);
    if (loop) return src;
    return true;
  }

  function playTone(opts) {
    const c = ensureCtx();
    if (!c || !enabled) return;
    const {
      freq = 440, freqEnd = null, type = "sine",
      duration = 0.12, volume = 0.25, delay = 0,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t0 + duration);
    }
    g.gain.setValueAtTime(0.001, t0);
    g.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function playNoise(duration, volume, freq) {
    const c = ensureCtx();
    if (!c || !enabled) return;
    const len = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = freq ?? 400;
    const g = c.createGain();
    g.gain.value = volume ?? 0.2;
    src.connect(filt);
    filt.connect(g);
    g.connect(sfxGain);
    src.start();
  }

  function play(name) {
    if (!enabled) return;
    ensureCtx();
    if (playBuffer(name, 0.75)) return;
    const fn = SYNTH[name];
    if (fn) fn();
  }

  function playArpNote(freq, destGain, volume) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(volume, t0 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    osc.connect(g);
    g.connect(destGain);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  }

  function stopBgmProcedural() {
    if (!bgmProc) return;
    if (bgmProc.interval) clearInterval(bgmProc.interval);
    bgmProc.oscillators.forEach(o => { try { o.stop(); } catch (e) {} });
    if (bgmProc.noise) { try { bgmProc.noise.stop(); } catch (e) {} }
    try {
      if (bgmProc.padGain) bgmProc.padGain.disconnect();
      if (bgmProc.arpGain) bgmProc.arpGain.disconnect();
    } catch (e) {}
    bgmProc = null;
  }

  function startBgmProcedural(key) {
    const c = ensureCtx();
    if (!c) return;
    stopBgmProcedural();
    const chords = BGM_CHORDS[key] || BGM_CHORDS.world;
    const notes = chords.flat();
    const padGain = c.createGain();
    padGain.gain.value = 0.018;
    padGain.connect(musicGain);
    const arpGain = c.createGain();
    arpGain.gain.value = 1;
    arpGain.connect(musicGain);

    const oscillators = [];
    const root = chords[0];
    root.forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = f * 0.5;
      o.connect(padGain);
      o.start();
      oscillators.push(o);
    });

    const len = Math.floor(c.sampleRate * 2);
    const nbuf = c.createBuffer(1, len, c.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = (Math.random() * 2 - 1) * 0.35;
    const noise = c.createBufferSource();
    noise.buffer = nbuf;
    noise.loop = true;
    const nf = c.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.value = 420;
    const ng = c.createGain();
    ng.gain.value = 0.006;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(padGain);
    noise.start();

    let step = 0;
    const interval = setInterval(() => {
      if (!enabled || !bgmProc) return;
      const chord = chords[Math.floor(step / 4) % chords.length];
      const note = chord[step % chord.length];
      playArpNote(note, arpGain, 0.032);
      step++;
    }, 400);

    bgmProc = { oscillators, padGain, arpGain, noise, interval };
  }

  function stopBgm() {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio = null;
    }
    stopBgmProcedural();
    currentBgmKey = null;
  }

  function startBgm(key) {
    if (!enabled || currentBgmKey === key) return;
    stopBgm();
    currentBgmKey = key;
    const path = FILE_PATHS["bgm_" + key];
    if (path) {
      const el = new Audio(path);
      el.loop = true;
      el.volume = 0.11;
      el.onerror = () => {
        el.pause();
        startBgmProcedural(key);
      };
      el.play()
        .then(() => { bgmAudio = el; })
        .catch(() => startBgmProcedural(key));
    } else {
      startBgmProcedural(key);
    }
  }

  function resolveBgm(state) {
    if (state.mixingActive) return "kitchen";
    if (state.scene === "kitchen") return "kitchen";
    if (state.scene === "east") return "east";
    if (state.scene === "west" && state.westPhase === "CUISINE") return "west";
    if (state.scene === "west") return "west";
    if (state.scene === "throne") return "throne";
    if (state.targetPaletteName === "angry" || state.gameState === "SURVIE") return "angry";
    return "world";
  }

  function ensureProcLoop(name) {
    if (loops[name]?.proc) return loops[name];
    const c = ensureCtx();
    if (!c) return null;
    const len = Math.floor(c.sampleRate * 1.5);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = name === "oven" ? 220 : name === "pour" ? 450 : 750;
    bp.Q.value = 0.7;
    const g = c.createGain();
    g.gain.value = 0;
    src.connect(bp);
    bp.connect(g);
    g.connect(sfxGain);
    src.start();
    loops[name] = { proc: true, src, g, bp };
    return loops[name];
  }

  function setActionLoop(name, active, intensity) {
    if (!enabled) return;
    ensureCtx();
    const vol = constrain(intensity ?? 0.5, 0, 1);

    if (!active || vol < 0.02) {
      if (loops[name]) {
        if (loops[name].audio) {
          loops[name].audio.pause();
          loops[name].audio = null;
        }
        if (loops[name].proc) {
          loops[name].g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        }
      }
      return;
    }

    const fileKey = LOOP_FILE[name];
    if (fileKey && !loops[name]?.audio) {
      const path = FILE_PATHS[fileKey];
      if (path) {
        const el = new Audio(path);
        el.loop = true;
        el.volume = vol * 0.35;
        el.play().catch(() => {});
        loops[name] = { audio: el };
        return;
      }
    }
    if (loops[name]?.audio) {
      loops[name].audio.volume = vol * 0.35;
      return;
    }

    const loop = ensureProcLoop(name);
    if (loop) loop.g.gain.setTargetAtTime(vol * 0.22, ctx.currentTime, 0.06);
  }

  let voiceDuckTimer = null;
  let currentUtterance = null;

  // ─── Profils de voix par PNJ (synthese vocale fr-FR) ───
  // Pitch ∈ [0..2], rate ∈ [0.1..10]. Defaut : 1.0
  // 'gender' : 'male' | 'female' — utilise pour preferer une voix adaptee.
  const VOICE_PROFILES = {
    roi:              { pitch: 0.75, rate: 0.90, volume: 1.0, gender: "male" },
    confiturio:       { pitch: 1.20, rate: 1.00, volume: 1.0, gender: "male" },
    chef_marshmallow: { pitch: 1.35, rate: 1.02, volume: 1.0, gender: "female" },
    chef_sali:        { pitch: 0.85, rate: 0.95, volume: 1.0, gender: "male" },
    baron:            { pitch: 0.55, rate: 0.85, volume: 1.0, gender: "male" },
    zyx:              { pitch: 1.10, rate: 0.98, volume: 0.95, gender: "female" },
    narrateur:        { pitch: 0.95, rate: 0.92, volume: 1.0, gender: "male" },
    distributeur:     { pitch: 1.55, rate: 1.10, volume: 0.9, gender: null },
    systeme:          { pitch: 1.00, rate: 1.00, volume: 0.9, gender: null },
    default:          { pitch: 1.00, rate: 0.96, volume: 1.0, gender: null }
  };

  // Noms de voix connues comme masculines / feminines en fr-FR (toutes plateformes).
  // Sources : voix Google Chrome, Microsoft Edge (Windows), Apple (macOS/iOS), Firefox espeak.
  const KNOWN_MALE_VOICES = [
    "thomas", "henri", "paul", "claude", "michael", "nicolas", "victor", "antoine",
    "google français", "google français masculin",
    "microsoft paul", "microsoft claude", "microsoft henri", "microsoft jean",
    "microsoft remy", "microsoft alain", "homme", "male"
  ];
  const KNOWN_FEMALE_VOICES = [
    "amelie", "amélie", "marie", "audrey", "celine", "céline", "virginie",
    "julie", "elise", "élise", "aurelie", "aurélie",
    "google français féminin",
    "microsoft julie", "microsoft hortense", "microsoft brigitte",
    "microsoft denise", "microsoft caroline", "microsoft eloise",
    "femme", "female"
  ];

  // Liste de voix fr-FR detectees, par ordre de preference (qualite).
  // Priorite absolue : voix neuronales Microsoft Edge "Online (Natural)" et Google Neural.
  let _voicesLoaded = false;
  let _frVoices = [];
  function refreshVoices() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const all = window.speechSynthesis.getVoices() || [];
    const fr = all.filter(v => /^fr(-|_|$)/i.test(v.lang));
    const score = (v) => {
      const n = (v.name || "").toLowerCase();
      let s = 0;
      // Voix neuronales Edge (ex: "Microsoft Denise Online (Natural) - French (France)")
      if (n.includes("natural") && n.includes("online")) s += 300;
      if (n.includes("natural")) s += 200;
      if (n.includes("neural"))  s += 200;
      // Google Neural (Chrome)
      if (n.includes("google") && n.includes("fr")) s += 180;
      if (n.includes("google")) s += 150;
      // Voix Microsoft en ligne (Edge sans "natural")
      if (n.includes("online") && n.includes("microsoft")) s += 100;
      if (n.includes("online")) s += 80;
      // Voix Microsoft locale (meilleure que Apple/eSpeak)
      if (n.includes("microsoft")) s += 40;
      // Premium / Enhanced (Apple macOS)
      if (n.includes("premium") || n.includes("enhanced")) s += 60;
      // Penaliser fortement eSpeak (son tres robotique)
      if (n.includes("espeak")) s -= 500;
      if (n.includes("zira")) s -= 20; // voix anglaise parfois classee fr
      return s;
    };
    fr.sort((a, b) => score(b) - score(a));
    _frVoices = fr;
    _voicesLoaded = _frVoices.length > 0;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    refreshVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
  }

  function voiceGender(v) {
    const n = (v.name || "").toLowerCase();
    for (const m of KNOWN_MALE_VOICES)   if (n.includes(m)) return "male";
    for (const f of KNOWN_FEMALE_VOICES) if (n.includes(f)) return "female";
    return null;
  }

  function pickVoice(profile) {
    if (!_frVoices.length) refreshVoices();
    if (!_frVoices.length) return null;
    if (profile.gender) {
      const matchGender = _frVoices.find(v => voiceGender(v) === profile.gender);
      if (matchGender) return matchGender;
    }
    return _frVoices[0]; // meilleure voix fr dispo
  }

  function speakerKey(speaker) {
    const raw = (speaker || "").toLowerCase();
    if (raw.includes("roi")) return "roi";
    if (raw.includes("confiturio")) return "confiturio";
    if (raw.includes("marshmallow")) return "chef_marshmallow";
    if (raw.includes("sali")) return "chef_sali";
    if (raw.includes("baron")) return "baron";
    if (raw.includes("zyx")) return "zyx";
    if (raw.includes("narrateur") || raw.includes("pancarte")) return "narrateur";
    if (raw.includes("distributeur") || raw.includes("four")) return "distributeur";
    if (raw.includes("syst")) return "systeme";
    return "default";
  }

  function duckMusic(duck) {
    if (!musicGain || !ctx) return;
    musicGain.gain.setTargetAtTime(duck ? 0.07 : 0.16, ctx.currentTime, 0.12);
  }

  // Cleanup pour speechSynthesis : retire les emojis / pictos, ramene les
  // accents typographiques en accents simples, et nettoie les espaces.
  function _cleanForSpeech(text) {
    return String(text)
      // emojis et pictos
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}]/gu, "")
      // marqueurs etoile / fleche / coche etc.
      .replace(/[★✓✗✘✦✧❤❥✪✯☆→←↑↓►◄▲▼]/g, "")
      // Apostrophes / guillemets typographiques (problemes de lecture)
      .replace(/[‘’‛]/g, "'")
      .replace(/[“”]/g, '"')
      // Tirets typographiques
      .replace(/[–—]/g, "-")
      // Espaces fins / insecables
      .replace(/[   ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speakLine(speaker, text) {
    if (!voiceEnabled || !text) return;
    cancelVoice();
    const key = speakerKey(speaker);
    const fileKey = "voice_" + key;
    loadFile(fileKey);
    duckMusic(true);
    if (voiceDuckTimer) clearTimeout(voiceDuckTimer);

    // 1) Essai d'un extrait MP3 court (s'il existe) pour identifier le personnage.
    const playedMp3 = (buffers[fileKey] || buffers["voice_default"]) &&
                      (playBuffer(fileKey, 0.5) || playBuffer("voice_default", 0.45));

    // 2) Voix off via synthese vocale fr-FR (lecture du texte complet).
    //    Sans MP3 → direct ; avec MP3 → petit retard pour ne pas se chevaucher.
    const speakDelay = playedMp3 ? 280 : 0;
    setTimeout(() => speakWithSynth(speaker, text), speakDelay);

    // Duck musique pendant la lecture (timer de secours, onend la coupe normalement).
    voiceDuckTimer = setTimeout(() => duckMusic(false), Math.max(2400, text.length * 80));
  }

  function speakWithSynth(speaker, text) {
    if (!voiceEnabled || !text) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const cleaned = _cleanForSpeech(text);
    if (!cleaned) return;

    try { window.speechSynthesis.cancel(); } catch (_) {}

    const profile = VOICE_PROFILES[speakerKey(speaker)] || VOICE_PROFILES.default;
    const v = pickVoice(profile);

    const u = new SpeechSynthesisUtterance(cleaned);
    // Force fr-FR systematiquement (meme si la voix selectionnee a une variante
    // proche : fr_CA, fr-BE etc.). Aide les voix neutres a prononcer en francais.
    u.lang = (v && /^fr/i.test(v.lang)) ? v.lang : "fr-FR";
    u.pitch = profile.pitch;
    u.rate = profile.rate;
    u.volume = profile.volume;
    if (v) u.voice = v;
    u.onend = () => {
      if (currentUtterance === u) {
        currentUtterance = null;
        duckMusic(false);
      }
    };
    u.onerror = () => {
      if (currentUtterance === u) {
        currentUtterance = null;
        duckMusic(false);
      }
    };
    currentUtterance = u;
    try { window.speechSynthesis.speak(u); } catch (e) { console.warn("[voice] speak failed", e); }
  }

  function cancelVoice() {
    if (voiceDuckTimer) {
      clearTimeout(voiceDuckTimer);
      voiceDuckTimer = null;
    }
    if (currentUtterance) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
      currentUtterance = null;
    }
    duckMusic(false);
  }

  function updateScene(state) {
    if (!initialized || !enabled) return;
    const bgm = resolveBgm(state);
    startBgm(bgm);

    const mixRecent = state.mixingActive && (state.mixRecent || state.mixIntensity > 0.05);
    setActionLoop("mixSoup", mixRecent, state.mixIntensity ?? 0.4);

    const westMix = state.scene === "west" && state.westPhase === "CUISINE" && state.westCuisineStep === "MIX";
    setActionLoop("mixBowl", westMix, westMix ? min(1, (state.westMixSpeed || 0) / 14) : 0);

    const westOven = state.scene === "west" && state.westCuisineStep === "BAKE" && !state.westBakeDone;
    setActionLoop("oven", westOven, (state.westBakeTemp || 0) / 100);

    const westPour = state.westCuisineStep === "POUR" && (state.westPourTilt || 0) > 0.15;
    setActionLoop("pour", westPour, state.westPourTilt || 0.3);

    if (state.blowAmp > 0.18) {
      const now = performance.now();
      if (now - lastBlowSfx > 140) {
        play("blow");
        lastBlowSfx = now;
      }
    }

    if (state.mixingActive && state.mixProgressDelta > 0) {
      const now = performance.now();
      if (now - lastMixPlop > 80) {
        play("mixPlop");
        lastMixPlop = now;
      }
    }
  }

  function constrain(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  return {
    init() {
      if (initialized) return;
      initialized = true;
      ensureCtx();
      Object.keys(FILE_PATHS).forEach(loadFile);
      startBgm("world");
    },

    play,
    speakLine,
    cancelVoice,
    updateScene,
    setActionLoop,
    stopBgm,
    // Lit une sequence de lignes { speaker, text } l'une apres l'autre via onend.
    // Toujours la meilleure voix neuronale disponible ; pitch/rate different par personnage.
    speakSequence(lines) {
      if (!voiceEnabled || !lines || !lines.length) return;
      if (!window.speechSynthesis) return;

      // Profils pitch/rate pour chaque personnage appliques SUR la meilleure voix unique.
      // On ne cherche plus de voix masculine separee (souvent robotique) :
      // on pitch-shifte la voix neuronale pour simuler des timbres differents.
      const SEQUENCE_PROFILES = {
        roi:              { pitch: 0.82, rate: 0.84 },  // grave, lent, autoritaire
        confiturio:       { pitch: 1.05, rate: 1.00 },  // enjoue, normal
        chef_marshmallow: { pitch: 1.15, rate: 1.02 },  // aigu, vif
        chef_sali:        { pitch: 0.88, rate: 0.93 },  // pose, sec
        baron:            { pitch: 0.72, rate: 0.80 },  // tres grave, menacant
        zyx:              { pitch: 1.10, rate: 0.97 },  // neutre, clair
        narrateur:        { pitch: 1.00, rate: 0.88 },  // voix neutre, lisible
        distributeur:     { pitch: 1.20, rate: 1.05 },  // mecanique, aigu
        systeme:          { pitch: 1.00, rate: 1.00 },
        default:          { pitch: 1.00, rate: 0.90 }
      };

      const doSpeak = () => {
        if (!_frVoices.length) refreshVoices();
        // Toujours la #1 — la mieux classee (neuronale si dispo)
        const bestVoice = _frVoices[0] || null;
        try { window.speechSynthesis.cancel(); } catch (_) {}
        duckMusic(true);

        let idx = 0;
        const speakOne = () => {
          if (idx >= lines.length) { duckMusic(false); return; }
          const { speaker, text } = lines[idx++];
          const cleaned = _cleanForSpeech(text);
          if (!cleaned) { speakOne(); return; }

          const key = speakerKey(speaker);
          const p = SEQUENCE_PROFILES[key] || SEQUENCE_PROFILES.default;

          const u = new SpeechSynthesisUtterance(cleaned);
          u.lang = (bestVoice && /^fr/i.test(bestVoice.lang)) ? bestVoice.lang : "fr-FR";
          if (bestVoice) u.voice = bestVoice;
          u.pitch  = p.pitch;
          u.rate   = p.rate;
          u.volume = 1.0;
          u.onend  = speakOne;
          u.onerror = speakOne;
          try { window.speechSynthesis.speak(u); } catch (e) { speakOne(); }
        };
        speakOne();
      };

      // Si les voix ne sont pas encore chargees, on attend l'evenement.
      if (_frVoices.length > 0) {
        doSpeak();
      } else {
        const onReady = () => {
          window.speechSynthesis.removeEventListener("voiceschanged", onReady);
          refreshVoices();
          doSpeak();
        };
        window.speechSynthesis.addEventListener("voiceschanged", onReady);
        // Timeout de securite : si l'evenement ne vient pas, on tente quand meme.
        setTimeout(() => { refreshVoices(); if (!_frVoices.length) doSpeak(); }, 1500);
      }
    },

    setEnabled(v) { enabled = !!v; if (!v) { stopBgm(); cancelVoice(); } },
    setVoiceEnabled(v) { voiceEnabled = !!v; if (!v) cancelVoice(); },

    isReady() {
      return !!ctx && ctx.state === "running";
    },
  };
})();

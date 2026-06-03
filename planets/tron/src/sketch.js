// ============================================================
// sketch.js — TIME JUMP · v0.5 — FINAL 3 ÉCRANS
// SAE S4 — MMI Dev — IUT Toulon
// ============================================================
// v0.5 :
//   - Canvas 5760×1200 (3 écrans rétroprojection côte à côte)
//   - Personnage JAXX Beat-Hacker Intergalactique (2D side-view)
//   - Niveau en 3 zones : Initiation → Défi temporel → Finale
//   - Vol horizontal pur (Dr Strange, 2 sec)
//   - Double saut, pont cigarette, aura
//   - tracking.js : maxHands:2, threshold 0.20, jambes visibles
// ============================================================

// ── Config ───────────────────────────────────────────────────
const WORLD_W = 5760;  // largeur totale du monde (3 écrans × 1920 px)
const W = WORLD_W;     // viewport = monde entier (zoom géré par viewZoom)
const H = 1200;
const HUMAN_ZONE_W = 225; // zone d'entrée/sortie humain↔sphère (px)

// ── Mode debug / installation 3 écrans ───────────────────────
// DEBUG_3SCREENS = true  → canvas = fenêtre du navigateur, 60 fps
//                          (touche V pour basculer en vue complète 5760×1200)
// DEBUG_3SCREENS = false → installation réelle 3×1920px = 5760 px, 30 fps
const DEBUG_3SCREENS = true;
let CANVAS_W = DEBUG_3SCREENS ? window.innerWidth  : W;
let CANVAS_H = DEBUG_3SCREENS ? window.innerHeight : H;
let DEBUG_SC  = CANVAS_W / W;   // < 1 en debug, 1.0 en installation

const GRAVITY        = 0.83;
const PLAYER_SPEED   = 11;
const JUMP_FORCE     = -20;
const GROUND_Y       = H - 135;

const ERA_PRESENT    = 'PRÉSENT';
const ERA_PAST       = 'PASSÉ';
const JUMP_CD_MAX    = 90;    // frames cooldown saut temporel
const STRANGE_DUR    = 120;   // frames vol Doctor Strange (2 sec)
const DESTROY_RADIUS = 675;   // rayon destruction murs (px)

// Pont cigarette (V+bouche)
const CIGBRIDGE_DURATION = 60;   // frames (1 sec @ 60 fps)
const CIGBRIDGE_LENGTH   = 480;  // longueur du pont (px) — adapté 3 écrans
const CIGBRIDGE_H        = 21;   // épaisseur (px)

// Barre de gestes — items
const GBAR = [
  { icon:'✊', label:'Poing',   action:'Saut temporel',  key:'closed_fist',    hand:'L' },
  { icon:'🖐', label:'Paume',   action:'Sprint',         key:'open_palm',      hand:'L' },
  { icon:'☝', label:'Index',   action:'Sauter',         key:'pointing_up',    hand:'L' },
  { icon:'✌', label:'Signe V', action:'Vision',         key:'victory_v',      hand:'L' },
  { icon:'↻', label:'Cercle→', action:'Aller droite',   key:'_circ_r',        hand:'R' },
  { icon:'↺', label:'Cercle←', action:'Aller gauche',   key:'_circ_l',        hand:'R' },
  { icon:'⬇', label:'Corps',   action:'Accroupir',      key:'_crouch',        hand:'B' },
  { icon:'⚡', label:'Strange', action:'Aura / Vol',     key:'_strange',       hand:'2' },
  { icon:'🚬', label:'V+bouche',action:'Pont cig.',     key:'_cigbridge',     hand:'L' },
];

// ── État monde ───────────────────────────────────────────────
let era          = ERA_PRESENT;
let timeCooldown = 0;
let borderPulse  = 0;
let obstacles;
let camX         = 0;  // position caméra (décalage horizontal)
let viewZoom     = 3.0; // zoom actuel : 1.0 = vue globale, 3.0 = suivi joueur

// Shim PlatformerTab pour TelekinesisInteraction (lit camX/camY/viewZoom au runtime)
const PlatformerTab = {
  getCameraTransform: () => ({
    x: camX,
    y: max(0, H - CANVAS_H),
    zoom: viewZoom * DEBUG_SC
  })
};

// ── État de jeu : intro / tutorial / playing ─────────────────
let gameState     = 'intro';
let introTimer    = 220;   // frames avant de passer au tutorial
let tutorialStep       = 0;
let tutorialFlash      = 0;    // frames de flash "✓ Bien !"
let tutorialPauseTimer = 0;    // frames de pause après action réussie (5 sec = 300)
let _tPrevJumpsLeft    = 2;
let _tPrevEra          = ERA_PRESENT;
let levelComplete      = false;
let currentLevelIndex  = 0;      // 0-based (0 = niveau 1)
let _uiVisible         = true;   // bouton 👁 — masque/affiche les overlays de hint
let finalVictoryStartFrame = -1;
let finalVictoryHandled = false;

// Tutorial auto-advance helpers
let _tLastTutorialStep = -1;
let _tStepVisibleTimer = 0; // frames remaining before auto-advance for special steps
const TUTORIAL_AUTO_VISIBLE = 240; // 4 seconds @60fps

const TUTO_PAUSE_DUR = 300;  // 5 secondes à 60fps

const TUTORIAL_STEPS = [
  {
    key: 'move',
    icon: '⬅  ➡',
    label: 'DÉPLACEMENT',
    hintKey: '← → clavier',
    hintGesture: 'Index droit sur les flèches du pad',
    desc: 'Déplace-toi de gauche à droite',
    done: false
  },
  {
    key: 'jump',
    icon: '⬆',
    label: 'SAUT',
    hintKey: '↑',
    hintGesture: 'Index droit sur les flèches du pad',
    desc: 'Saute au-dessus des obstacles',
    done: false
  },
  {
    key: 'djump',
    icon: '⬆⬆',
    label: 'DOUBLE SAUT',
    hintKey: '↑ deux fois',
    hintGesture: 'Index droit sur les flèches du pad',
    desc: 'Saute une 2ème fois dans les airs',
    done: false
  },
  {
    key: 'crouch',
    icon: '⬇',
    label: 'ACCROUPI',
    hintKey: '↓  ou  S',
    hintGesture: 'Utilise les flèches du pad',
    desc: 'Passe sous les obstacles bas',
    done: false
  },
  {
    key: 'timejump',
    icon: '⌛',
    label: 'SAUT TEMPOREL',
    hintKey: 'T',
    hintGesture: 'Poing ✊ main gauche',
    desc: 'Change d\'époque — PRÉSENT ↔ PASSÉ',
    done: false
  },
  {
    key: 'terminal',
    icon: '⌨️',
    label: 'TERMINAL',
    hintKey: 'Flèches',
    hintGesture: 'Index gauche sur les flèches du terminal',
    desc: 'Utilise le pad terminal pour entrer des directions (← ↑ → ↓)',
    done: false
  },
  {
    key: 'flight',
    icon: '✦',
    label: 'VOL STRANGE',
    hintKey: 'Micro (cri)',
    hintGesture: 'Cri rapide dans le micro',
    desc: 'Crie dans le micro pour activer le vol Strange',
    done: false
  },
];

// ── État joueur ──────────────────────────────────────────────
let player;
let humanRatioSmooth = 1.0;  // 0=sphère, 1=humain (basé sur le mouvement)

// Sphère liquide
const SPHERE_VERTS = 34;
let sv = [];

// ── Doctor Strange / Vol ────────────────────────────────────
let auraActive   = false;
let auraTimer    = 0;        // compte à rebours en frames
let flightActive = false;
let auraRot      = 0;        // rotation des anneaux
let strangeParticles = [];   // étincelles aura

// Pont cigarette
let cigaretteBridge = null;  // { x,y,w,h,timer,facingRight }
let prevVNearMouth  = false;
let smokeParticles  = [];

// ── Input ────────────────────────────────────────────────────
let keys = {};

// ── Micro (cri AAAAA → vol Strange) ──────────────────────────
let _micAnalyser  = null;   // Web Audio AnalyserNode
let _micDataArray = null;   // Uint8Array données temporelles
let _micShoutCD   = 0;      // cooldown anti-déclenchement répété (frames)

// ── Double saut par paume ouverte (tracking) ──────────────────
let holdPalmTimer = 0;      // frames où open_palm est tenu en l'air

// Ajustement fin curseur main->écran (px canvas)
const HAND_CURSOR_OFFSET_X = 10;
const HAND_CURSOR_OFFSET_Y = 3;

// ── D-pad virtuel (main droite, espace canvas) ────────────────
const DPAD_R        = 220;          // rayon de la zone active (grand = moins de faux positifs)
const DPAD_DEAD     = 60;           // rayon de la zone morte centrale
const DPAD_MARGIN_X = 280;
const DPAD_Y_RATIO  = 0.74;
let _dpadZone         = 'none';     // movement: 'up','down','left','right','none'
let _dpadJumpFired    = false;      // anti-répétition saut
let _terminalDPadZone = 'none';     // terminal: 'up','down','left','right','none'
let _terminalDPadFired = false;

// ── Boîtes poussables ─────────────────────────────────────────
let pushBoxes = [];  // { x, y, w, h, vx, vy, onGround, col }
const PBOX_FRICTION = 0.78;
const PBOX_GRAVITY  = 0.83;

// ── Audio FX ───────────────────────────────────────────────────
let _audioCtx = null;
let _audioMaster = null;
let _noiseBuffer = null;

function _unlockAudio() {
  if (typeof window === 'undefined') return false;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  if (!_audioCtx) {
    _audioCtx = new Ctx();
    _audioMaster = _audioCtx.createGain();
    _audioMaster.gain.value = 0.18;
    _audioMaster.connect(_audioCtx.destination);
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return true;
}

function _sfxEnvelope(node, startTime, attack, release, gain) {
  node.gain.setValueAtTime(0.0001, startTime);
  node.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), startTime + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + release);
}

function _playTone({ type = 'sine', startFreq = 440, endFreq = null, duration = 0.12, gain = 0.2, attack = 0.005, release = 0.08, detune = 0, filter = null }) {
  if (!_unlockAudio() || !_audioCtx || !_audioMaster) return;
  const now = _audioCtx.currentTime;
  const osc = _audioCtx.createOscillator();
  const amp = _audioCtx.createGain();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(Math.max(1, startFreq), now);
  if (endFreq != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
  }
  _sfxEnvelope(amp, now, attack, release, gain);
  osc.connect(amp);
  let lastNode = amp;
  if (filter) {
    const fx = _audioCtx.createBiquadFilter();
    fx.type = filter.type || 'lowpass';
    if (filter.freq) fx.frequency.value = filter.freq;
    if (filter.q) fx.Q.value = filter.q;
    amp.connect(fx);
    lastNode = fx;
  }
  lastNode.connect(_audioMaster);
  osc.start(now);
  osc.stop(now + duration + release + 0.02);
}

function _playNoise({ duration = 0.12, gain = 0.16, highpass = 900, lowpass = 5000 }) {
  if (!_unlockAudio() || !_audioCtx || !_audioMaster) return;
  if (!_noiseBuffer) {
    const frames = Math.max(1, Math.floor(_audioCtx.sampleRate * 0.25));
    _noiseBuffer = _audioCtx.createBuffer(1, frames, _audioCtx.sampleRate);
    const data = _noiseBuffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  }
  const now = _audioCtx.currentTime;
  const src = _audioCtx.createBufferSource();
  const hp = _audioCtx.createBiquadFilter();
  const lp = _audioCtx.createBiquadFilter();
  const amp = _audioCtx.createGain();
  src.buffer = _noiseBuffer;
  hp.type = 'highpass';
  hp.frequency.value = highpass;
  lp.type = 'lowpass';
  lp.frequency.value = lowpass;
  _sfxEnvelope(amp, now, 0.003, duration * 0.8, gain);
  src.connect(hp);
  hp.connect(lp);
  lp.connect(amp);
  amp.connect(_audioMaster);
  src.start(now);
  src.stop(now + duration + 0.03);
}

// ── Audio assets loader & helpers ────────────────────────────
const AUDIO = { sfx: {}, mus: {}, currentMusic: null, volumes: { sfx: 0.72, mus: 0.42 } };

function loadAudioAssets() {
  // music
  AUDIO.mus.mus_mystere = new Audio('assets/mus/mus_mystere.wav'); AUDIO.mus.mus_mystere.preload = 'auto'; AUDIO.mus.mus_mystere.loop = true;
  AUDIO.mus.mus_terminal = new Audio('assets/mus/mus_terminal.wav'); AUDIO.mus.mus_terminal.preload = 'auto'; AUDIO.mus.mus_terminal.loop = true;
  AUDIO.mus.mus_ending   = new Audio('assets/mus/mus_ending.wav');   AUDIO.mus.mus_ending.preload = 'auto';   AUDIO.mus.mus_ending.loop = true;

  // sfx
  const sfxList = [
    'sfx_bip','sfx_doublejump','sfx_exit_level','sfx_failed','sfx_fly','sfx_grab','sfx_jump','sfx_terminal_start','sfx_success','sfx_timejump'
  ];
  for (const k of sfxList) {
    const p = 'assets/sfx/' + k + (k.endsWith('.mp3') ? '' : '.wav');
    // handle sfx_failed.mp3 specifically
    const src = k === 'sfx_failed' ? 'assets/sfx/sfx_failed.mp3' : 'assets/sfx/' + k + '.wav';
    const a = new Audio(src);
    a.preload = 'auto';
    AUDIO.sfx[k] = a;
  }
}

function playAudioSfx(key) {
  const base = AUDIO.sfx[key];
  if (!base) return false;
  try {
    const inst = new Audio(base.currentSrc || base.src);
    inst.preload = 'auto';
    inst.volume = key === 'sfx_bip' ? 1.0 : AUDIO.volumes.sfx;
    inst.play().catch(()=>{});
    return true;
  } catch (e) {
    return false;
  }
}

function playMusic(key) {
  if (AUDIO.currentMusic) {
    try { AUDIO.currentMusic.pause(); AUDIO.currentMusic.currentTime = 0; } catch (e) {}
    AUDIO.currentMusic = null;
  }
  const m = AUDIO.mus[key];
  if (!m) return false;
  m.volume = AUDIO.volumes.mus;
  m.loop = true;
  m.play().catch(()=>{});
  AUDIO.currentMusic = m;
  return true;
}

function stopMusic() {
  if (!AUDIO.currentMusic) return;
  try { AUDIO.currentMusic.pause(); AUDIO.currentMusic.currentTime = 0; } catch (e) {}
  AUDIO.currentMusic = null;
}

function playJumpSound(isSecond = false) {
  // prefer asset SFX if available
  if (isSecond) {
    if (playAudioSfx('sfx_doublejump')) return;
  }
  if (playAudioSfx('sfx_jump')) return;
  // fallback synthesized tone
  _playTone({ type: 'triangle', startFreq: 420, endFreq: 760, duration: 0.09, gain: 0.18, attack: 0.004, release: 0.06 });
}

function playTimeJumpSound() {
  if (playAudioSfx('sfx_timejump')) return;
  _playTone({ type: 'sawtooth', startFreq: 160, endFreq: 70, duration: 0.13, gain: 0.20, attack: 0.004, release: 0.10, filter: { type: 'lowpass', freq: 1200, q: 0.8 } });
  _playTone({ type: 'sine', startFreq: 72, endFreq: 48, duration: 0.16, gain: 0.10, attack: 0.004, release: 0.10 });
}

function playBoxGrabSound() {
  if (playAudioSfx('sfx_grab')) return;
  _playTone({ type: 'square', startFreq: 1200, endFreq: 520, duration: 0.05, gain: 0.10, attack: 0.002, release: 0.04 });
}

function playZoneValidatedSound() {
  if (playAudioSfx('sfx_success')) return;
  _playTone({ type: 'triangle', startFreq: 392, endFreq: 523.25, duration: 0.08, gain: 0.14, attack: 0.004, release: 0.08 });
  _playTone({ type: 'triangle', startFreq: 523.25, endFreq: 659.25, duration: 0.10, gain: 0.11, attack: 0.004, release: 0.08, detune: -3 });
}

function playTerminalSuccessSound() {
  if (playAudioSfx('sfx_success')) return;
  _playTone({ type: 'sine', startFreq: 523.25, endFreq: 659.25, duration: 0.10, gain: 0.14, attack: 0.004, release: 0.10 });
  _playTone({ type: 'sine', startFreq: 659.25, endFreq: 783.99, duration: 0.12, gain: 0.12, attack: 0.004, release: 0.10, detune: 4 });
}

function playTerminalFailSound() {
  if (playAudioSfx('sfx_failed')) return;
  _playTone({ type: 'sawtooth', startFreq: 220, endFreq: 110, duration: 0.18, gain: 0.14, attack: 0.004, release: 0.14, filter: { type: 'lowpass', freq: 900, q: 0.7 } });
  _playTone({ type: 'sine', startFreq: 175, endFreq: 130, duration: 0.18, gain: 0.08, attack: 0.004, release: 0.14, detune: -18 });
}

function playCigaretteSound() {
  // no dedicated asset — fallback to noise
  _playNoise({ duration: 0.14, gain: 0.06, highpass: 1800, lowpass: 6200 });
}

function playStrangeSound() {
  if (playAudioSfx('sfx_fly')) return;
  _playTone({ type: 'sawtooth', startFreq: 180, endFreq: 55, duration: 0.20, gain: 0.18, attack: 0.004, release: 0.14, filter: { type: 'lowpass', freq: 1100, q: 0.8 } });
}

function playStartSound() {
  // Play a non-looping start sound alongside ambient music
  playAudioSfx('sfx_terminal_start');
  playMusic('mus_mystere');
}

function playExitSound() {
  playAudioSfx('sfx_exit_level');
  playMusic('mus_ending');
}

// ── Setup ────────────────────────────────────────────────────
function setup() {
  let cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.style('display', 'block');
  cnv.position(0, 0);
  textFont('Courier New');
  frameRate(DEBUG_3SCREENS ? 60 : 30);

  // v0.3 : PAS de createCapture() — tracking.js gère sa propre caméra
  initTracking(onGestureChange);

  // Micro pour détection cri (vol Strange)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        _micAnalyser = audioCtx.createAnalyser();
        _micAnalyser.fftSize = 256;
        _micDataArray = new Uint8Array(_micAnalyser.frequencyBinCount);
        src.connect(_micAnalyser);
      })
      .catch(err => console.warn('Micro non disponible :', err));
  }

  buildLevel();
  LevelEditor.init();   // ← éditeur de niveau (touche E pour activer)
  initMechanics(currentLevelIndex);  // ← ennemis, terminaux, télékinésie, Helldivers
  try { loadAudioAssets(); } catch (e) { /* ignore asset load errors */ }

  player = {
    x: 270, y: GROUND_Y - 57,
    vx: 0, vy: 0,
    r: 51,
    onGround: false,
    jumpsLeft: 2,          // ← double saut
    facingRight: true,
    crouching: false,
    noiseT: 0,
    scaleX: 1, scaleY: 1,
    tScaleX: 1, tScaleY: 1,
    landFrame: 0,
    trail: [],
    // Data platform binding
    standingOnData: -1,
    standingOffsetX: 0,
    standingOffsetY: 0,
  };

  for (let i = 0; i < SPHERE_VERTS; i++) sv.push({ r: 51, tr: 51 });
}

// ── Niveau ───────────────────────────────────────────────────
// Les données sont dans level_data.js (LEVELS_DATA[currentLevelIndex]).
// Pour modifier le niveau : éditer level_data.js directement,
// ou utiliser l'éditeur intégré (touche E) puis S pour sauvegarder.
function buildLevel() {
  const ld = (typeof LEVELS_DATA !== 'undefined' && LEVELS_DATA[currentLevelIndex]) || {};

  obstacles = (ld.obstacles || []).map(d => ({
    x: d.x, y: d.y, w: d.w, h: d.h,
    pOnly:       d.pOnly       || false,
    paOnly:      d.paOnly      || false,
    low:         d.low         || false,
    destroyable: d.destroyable || false,
    destroyed:   false,
    lbl:         d.lbl         || '',
  }));

  pushBoxes = (ld.pushBoxes || []).map(d => ({
    x: d.x, y: d.y, w: d.w, h: d.h,
    vx: 0, vy: 0, onGround: false,
    col: d.col.slice(),
  }));
}

function isActive(obs) {
  if (obs.destroyed)               return false;
  if (obs.pOnly  && era !== ERA_PRESENT) return false;
  if (obs.paOnly && era !== ERA_PAST)    return false;
  return true;
}

// ── Boîtes poussables — physique ─────────────────────────────
function updatePushBoxes() {
  for (const b of pushBoxes) {
    b.vx = 0;              // pas d'inertie horizontale : bouge seulement si poussée
    b.vy += PBOX_GRAVITY;
    b.y  += b.vy;
    b.onGround = false;

    // Collision avec le sol
    const groundTop = GROUND_Y + 54; // sommet du sol
    if (b.y + b.h >= groundTop) {
      b.y  = groundTop - b.h;
      b.vy = 0;
      b.onGround = true;
    }

    // Collision avec les obstacles statiques (AABB simple)
    for (const obs of obstacles) {
      if (!isActive(obs)) continue;
      _resolveBoxObs(b, obs);
    }

    // Collisions boîte ↔ boîte
    for (const other of pushBoxes) {
      if (other === b) continue;
      _resolveBoxBox(b, other);
    }

    // Limites monde
    b.x = constrain(b.x, 0, WORLD_W - b.w);
    if (b.y > H + 200) { b.y = GROUND_Y - b.h; b.vy = 0; } // reset si tombe

    // ── Collision joueur ↔ boîte ─────────────────────────────
    // Joueur pousse la boîte latéralement, peut sauter dessus
    const pr     = player.crouching ? 23 : 51;
    const px     = player.x, py = player.y;
    const closX  = constrain(px, b.x, b.x + b.w);
    const closY  = constrain(py, b.y, b.y + b.h);
    const dxP    = px - closX, dyP = py - closY;
    const distP2 = dxP*dxP + dyP*dyP;

    if (distP2 < pr * pr) {
      const distP = sqrt(distP2) || 0.001;
      const ov    = pr - distP;
      const nx    = dxP / distP;
      const ny    = dyP / distP;

      // Repousser le joueur (résolution normale)
      player.x += nx * ov;
      player.y += ny * ov;

      if (ny < -0.5) {
        // Joueur atterrit / repose sur le dessus de la boîte
        if (player.vy >= 0) {               // tombe ou immobile — ne pas annuler un saut
          const wasAlreadyOnBox = player.onGround;
          player.vy = 0;
          player.onGround = true;
          if (!wasAlreadyOnBox) {            // atterrissage → réinitialiser le double saut
            player.jumpsLeft = 2;
          }
        }
        // si vy < 0 (saut en cours), on ne touche à rien : le joueur s'échappe librement
      } else if (ny > 0.5) {
        player.vy = abs(player.vy) * 0.15;
      } else {
        // Joueur pousse latéralement → déplacement direct LOIN du joueur (sans inertie)
        // nx = direction boîte→joueur ; donc -nx = direction joueur→boîte = repousser la boîte
        const pushAmt = abs(player.vx) * 0.8 + 0.5;
        b.x -= nx * pushAmt;   // repousse la boîte À L'OPPOSÉ du joueur
        player.vx *= 0.5;
      }
    }
  }

  
}

// ── Data platforms (DATA BOXES moved by telekinesis) ─────────
// Make data boxes solid for the player: player can stand on them,
// be carried when the box moves, and not slip off.
function updateDataPlatforms() {
  if (typeof TelekinesisInteraction === 'undefined' ||
      typeof TelekinesisInteraction.getDataPlatformInfos !== 'function') return;

  const infos = TelekinesisInteraction.getDataPlatformInfos();
  if (!infos || infos.length === 0) return;

  const pr = player.crouching ? 23 : 51; // player radius used for collisions

  // Preserve existing onGround (e.g. from pushBoxes) and remember it
  // so we can reset jumps only on a new landing.
  let wasOnGround = player.onGround;

  for (const info of infos) {
    const b = info.current; // { x, y, w, h }
    const dx = info.dx || 0;
    const dy = info.dy || 0;

    // Compute closest point from player center to box AABB
    const closX = constrain(player.x, b.x, b.x + b.w);
    const closY = constrain(player.y, b.y, b.y + b.h);
    const dxP = player.x - closX, dyP = player.y - closY;
    const dist2 = dxP * dxP + dyP * dyP;

    if (dist2 < pr * pr) {
      const dist = sqrt(dist2) || 0.001;
      const ov = pr - dist;
      const nx = dxP / dist;
      const ny = dyP / dist;

      // Push player out of the platform if overlapping
      player.x += nx * ov;
      player.y += ny * ov;

      if (ny < -0.5) {
        // Player landed on top of platform
        if (player.vy >= 0) {
          player.vy = 0;
          player.onGround = true;
          if (!wasOnGround) player.jumpsLeft = 2; // reset jumps on land
        }
        // Bind player to this data platform so they remain exactly on it
        if (player.standingOnData !== info.index) {
          player.standingOnData = info.index;
          player.standingOffsetX = player.x - b.x;
          player.standingOffsetY = player.y - b.y;
        }
        // Snap player to platform position this frame
        player.x = b.x + player.standingOffsetX;
        player.y = b.y + player.standingOffsetY;
        player.vx = 0; player.vy = 0;
      } else if (ny > 0.5) {
        // player hit underside — dampen vertical speed
        player.vy = abs(player.vy) * 0.15;
      } else {
        // lateral contact: nudge platform away from player slightly
        // but do not apply large impulses — keep platform control to telekinesis
        player.vx *= 0.6;
      }
    }
  }
}

// Résolution AABB boîte ↔ obstacle statique
function _resolveBoxObs(b, obs) {
  const overlapX = min(b.x + b.w, obs.x + obs.w) - max(b.x, obs.x);
  const overlapY = min(b.y + b.h, obs.y + obs.h) - max(b.y, obs.y);
  if (overlapX <= 0 || overlapY <= 0) return;

  if (overlapX < overlapY) {
    // Collision horizontale
    if (b.x < obs.x) b.x -= overlapX;
    else              b.x += overlapX;
    b.vx *= -0.15;
  } else {
    // Collision verticale
    if (b.y < obs.y) { b.y -= overlapY; b.vy = 0; b.onGround = true; }
    else              { b.y += overlapY; b.vy = abs(b.vy) * 0.1; }
  }
}

// Résolution AABB boîte ↔ boîte
function _resolveBoxBox(a, b) {
  const overlapX = min(a.x + a.w, b.x + b.w) - max(a.x, b.x);
  const overlapY = min(a.y + a.h, b.y + b.h) - max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return;

  if (overlapX < overlapY) {
    const half = overlapX * 0.5;
    if (a.x < b.x) { a.x -= half; b.x += half; }
    else            { a.x += half; b.x -= half; }
    const avg = (a.vx + b.vx) * 0.5;
    a.vx = avg; b.vx = avg;
  } else {
    if (a.y < b.y) {
      a.y -= overlapY * 0.5; b.y += overlapY * 0.5;
      if (a.vy > 0) { a.vy = 0; a.onGround = true; }
      if (b.vy < 0)   b.vy = 0;
    } else {
      a.y += overlapY * 0.5; b.y -= overlapY * 0.5;
      if (b.vy > 0) { b.vy = 0; b.onGround = true; }
      if (a.vy < 0)   a.vy = 0;
    }
  }
}

// ── Boîtes poussables — dessin ────────────────────────────────
function drawPushBoxes() {
  for (const b of pushBoxes) {
    const [r, g2, bl] = b.col;
    const gp = 0.6 + 0.4 * sin(frameCount * 0.05);

    // Ombre portée
    noStroke();
    fill(0, 0, 0, 30);
    rect(b.x + 4, b.y + 4, b.w, b.h, 6);

    // Corps de la caisse
    fill(r, g2, bl, 210);
    stroke(r * 1.4, g2 * 1.4, bl * 1.4, 180);
    strokeWeight(2);
    rect(b.x, b.y, b.w, b.h, 6);

    // Croix de renfort
    stroke(0, 0, 0, 60);
    strokeWeight(1.5);
    line(b.x + 8, b.y + 8, b.x + b.w - 8, b.y + b.h - 8);
    line(b.x + b.w - 8, b.y + 8, b.x + 8, b.y + b.h - 8);

    // Contour néon pulsant (couleur complémentaire)
    noFill();
    stroke(255 - r, 255 - g2, 255 - bl, 80 * gp);
    strokeWeight(2);
    rect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, 4);

    // Icône ↔ pour indiquer que la caisse est poussable
    noStroke();
    fill(255, 255, 255, 120);
    textAlign(CENTER, CENTER);
    textSize(20);
    text('↔', b.x + b.w / 2, b.y + b.h / 2);
  }
}

// ── Boucle principale ────────────────────────────────────────
function draw() {
  const terminalActive = typeof HelldiversInteraction !== 'undefined' && HelldiversInteraction.isActive();

  // ── Logique (bloquée pendant l'intro) ───────────────────────
  if (gameState !== 'intro') {
    handleInput();
    if (!terminalActive) {
      applyTrackingToPlayer();
      applyDPadToPlayer();   // D-pad virtuel main droite
      updatePlayer();
      updatePushBoxes();     // physique caisses poussables
      updateDataPlatforms();  // physics & carry for telekinesis data boxes
    } else {
      player.vx = 0;
      player.vy = 0;
    }
    _checkShoutFlight();   // détection cri AAAAA → vol Strange
    updateParticles();
    updateStrangeParticles();
    checkCigaretteGesture();
    updateCigaretteBridge();
    updateEnemies();
    updateTerminals();
    updateExitDoor();   // ← verrou porte + transition niveau
  }

  // ── Transition de niveau ─────────────────────────────────────
  if (typeof isTransitionPending === 'function' && isTransitionPending()) {
    clearTransition();
    if (currentLevelIndex < LEVELS_DATA.length - 1) {
      currentLevelIndex++;
      buildLevel();
      initMechanics(currentLevelIndex);
      player.x = 270; player.y = GROUND_Y - 57;
      player.vx = 0;  player.vy = 0;
      player.onGround = false; player.jumpsLeft = 2;
      camX = 0; era = ERA_PRESENT;
      gameState = 'playing';
      levelComplete = false;
      finalVictoryHandled = false;
      if (typeof playStartSound === 'function') playStartSound();
      if (typeof LevelEditor !== 'undefined' && typeof LevelEditor.onLevelSwitch === 'function') {
        LevelEditor.onLevelSwitch(currentLevelIndex);
      }
    } else {
      if (!finalVictoryHandled) {
        finalVictoryHandled = true;
        levelComplete = true; // dernier niveau — victoire
        finalVictoryStartFrame = frameCount;
        if(window.SpaceCrystals)SpaceCrystals.complete('tron');
        if (typeof playExitSound === 'function') playExitSound();
      }
    }
  }

  // ── Zoom dynamique ──────────────────────────────────────────
  // Quand le joueur est au centre du monde → zoom 1.0 (vue globale)
  // Quand il est aux extrémités → zoom 3.0 (suivi proche)
  const distFromCenter = abs(player.x - WORLD_W / 2);
  const targetZoom = constrain(map(distFromCenter, 600, 2550, 1.0, 3.0), 1.0, 3.0);
  viewZoom = lerp(viewZoom, targetZoom, 0.04);

  // ── Caméra ──────────────────────────────────────────────────
  const visW   = W / viewZoom;   // largeur du monde visible selon le zoom
  const rawCam = constrain(player.x - visW * 0.5, 0, W - visW);
  camX = lerp(camX, rawCam, 0.06);

  // ── Rendu dans l'espace logique W=5760 / H=1200 ─────────────
  push();
  scale(DEBUG_SC);   // ~0.444 debug (→ 2560 px) / 1.0 installation (→ 5760 px)

  // Fond de base — remplit tout le canvas
  if (era === ERA_PRESENT) background(18, 8, 4);
  else                     background(4,  8, 22);

  // ── PASS 1 : vue d'ensemble atténuée (plein niveau, 1:1) ────
  drawOverviewDim();
  drawScreenDividers();

  // ── PASS 2 : gameplay zoomé ──────────────────────────────────
  push();
  scale(viewZoom, 1.0);   // zoom horizontal uniquement (H inchangé)
  const camY = max(0, H - CANVAS_H);
  translate(-camX, -camY);
  drawBackground();        // étoiles + grille (sans background())
  drawDoors();
  drawObstacles();
  drawPushBoxes();         // caisses poussables
  drawParticles();
  drawCigaretteBridge();
  drawLiquidSphere();
  if (auraActive) drawAura();
  drawEnemies();
  drawTerminals();
  drawExitDoor();                   // ← porte de sortie (verrouillée / ouverte)
  LevelEditor.drawWorldOverlay();   // ← grille + sélection éditeur (world-space)
  pop();

  // ── HUD / Overlay (espace logique W=5760) ───────────────────
  drawTrackingOverlay();
  if (_uiVisible) {
    drawBorder();
    drawGestureBar();
    drawHUD();
  }

  // ── Overlays par état de jeu ─────────────────────────────────
  if (gameState === 'intro') {
    drawIntroOverlay();
    introTimer--;
    if (introTimer <= 0) gameState = currentLevelIndex === 0 ? 'tutorial' : 'playing';
  } else if (gameState === 'tutorial') {
    checkTutorialStep();
    drawTutorialOverlay();
  } else if (gameState === 'playing') {
    checkLevelComplete();
  }

  pop(); // fin scale(DEBUG_SC)

  // ── Overlays canvas-space (hors scale) ───────────────────────────
  TelekinesisInteraction.drawInteractionLayer();
  HelldiversInteraction.draw();     // gère son propre état (inactive = no-op)
  drawExitDoorHint();               // message de la porte verrouillée
  drawLevelNumber();                // numéro de niveau en haut au centre

  LevelEditor.drawHUD();            // ← panneau info éditeur (canvas-space)

  // ── D-pad virtuel (dessiné en espace canvas, hors scale) ─────
  if (gameState !== 'intro') {
    if (!terminalActive) drawDPad();
  }

  // ── Boutons UI (canvas-space) ─────────────────────────────────
  drawUIToggleBtn();
  if (gameState === 'tutorial') drawSkipTutorialBtn();

  // ── Timers ────────────────────────────────────────────────────
  if (timeCooldown > 0) timeCooldown--;
  if (borderPulse  > 0) borderPulse = max(0, borderPulse - 0.022);

  // Décompte vol Strange
  if (auraActive) {
    auraTimer--;
    auraRot += 0.025;
    if (auraTimer <= 0) {
      auraActive   = false;
      flightActive = false;
    }
    if (frameCount % 2 === 0) _spawnStrangeSpark();
  }

  updateCooldownBarHTML();
}

// ── Fond (étoiles + grille — sans background(), appelé dans le bloc zoomé) ──
function drawBackground() {
  if (era === ERA_PRESENT) {
    _drawStars(color(255, 90, 30, 22));
    _drawGrid(color(50, 15, 5, 130));
  } else {
    _drawStars(color(30, 100, 255, 32));
    _drawGrid(color(5, 20, 70, 130));
  }
}
function _drawStars(c) {
  randomSeed(777); noStroke();
  for (let i = 0; i < 810; i++) {
    fill(c); let s = random(1, 2.8);
    ellipse(random(WORLD_W), random(H*0.75), s, s);
  }
  randomSeed();
}
function _drawGrid(c) {
  stroke(c); strokeWeight(1);
  for (let x = 0; x < WORLD_W; x += 80) line(x, 0, x, H);
  for (let y = 0; y < H; y += 80) line(0, y, WORLD_W, y);
}

// ── Obstacles ────────────────────────────────────────────────
function drawObstacles() {
  for (const obs of obstacles) {
    if (obs.lbl === '') continue; // sol dessiné séparément

    if (obs.destroyed) {
      // Débris fantôme — presque invisible
      fill(100, 100, 100, 12);
      stroke(150, 150, 150, 20);
      strokeWeight(1);
      rect(obs.x, obs.y, obs.w, obs.h, 3);
      // Label "détruit"
      noStroke(); fill(255, 100, 50, 40);
      textAlign(CENTER, BOTTOM); textSize(8);
      text('✦ détruit', obs.x + obs.w/2, obs.y - 2);
      continue;
    }

    const active = isActive(obs);

    if (active) {
      if (obs.low) {
        fill(era===ERA_PRESENT ? color(180,40,120) : color(40,180,120));
        stroke(255, 200);
      } else {
        // Destructibles ont un contour doré
        if (obs.destroyable) {
          fill(era===ERA_PRESENT ? color(200,90,15) : color(15,90,180));
          stroke(color(255,200,60));
          strokeWeight(2.5);
        } else {
          fill(era===ERA_PRESENT ? color(200,50,15) : color(15,55,160));
          stroke(era===ERA_PRESENT ? color(255,110,40) : color(50,120,255));
          strokeWeight(2);
        }
      }
    } else {
      fill(era===ERA_PRESENT ? color(50,120,255,25) : color(255,110,40,25));
      stroke(era===ERA_PRESENT ? color(50,120,255,55) : color(255,110,40,55));
      strokeWeight(1);
    }
    rect(obs.x, obs.y, obs.w, obs.h, 3);

    if (active && obs.lbl) {
      noStroke(); fill(255, 255, 255, obs.destroyable ? 85 : 55);
      textAlign(CENTER, BOTTOM); textSize(9);
      text(obs.lbl + (obs.destroyable ? ' ⚡' : ''), obs.x + obs.w/2, obs.y - 3);
    }
  }

  // Sol
  fill(era===ERA_PRESENT ? color(70,28,8) : color(8,28,70));
  stroke(era===ERA_PRESENT ? color(130,55,18) : color(18,55,130));
  strokeWeight(2);
  rect(0, GROUND_Y+54, WORLD_W, 96);
}

// ── Input clavier ────────────────────────────────────────────
function handleInput() {
  const boxGrabbed = typeof TelekinesisInteraction !== 'undefined' &&
    typeof TelekinesisInteraction.isBoxGrabbed === 'function' &&
    TelekinesisInteraction.isBoxGrabbed();
  const L = keys['ArrowLeft']  || keys['a'];
  const R = keys['ArrowRight'] || keys['d'];
  const J = keys['ArrowUp']    || keys[' ']  || keys['w'];
  const T = keys['t'];
  const C = keys['ArrowDown']  || keys['s'];

  if (boxGrabbed) {
    if (T) { triggerTimeJump(); keys['t'] = false; }
    player.vx = 0;
    player.crouching = (C || (isTrackingActive() && getIsCrouching())) && !flightActive;
    return;
  }

  if (J && player.jumpsLeft > 0) {
    const isSecondJump = !player.onGround && player.jumpsLeft === 1;
    player.vy = isSecondJump ? JUMP_FORCE * 0.92 : JUMP_FORCE;
    const faceBoost = player.facingRight ? 7.5 : -7.5;
    player.vx += faceBoost;
    if (L) player.vx = min(player.vx - 2.0, -3.0);
    if (R) player.vx = max(player.vx + 2.0,  3.0);
    player.onGround = false;
    player.jumpsLeft--;
    playJumpSound(isSecondJump);
    spawnJumpParticles(isSecondJump);
    player.standingOnData = -1;
    keys['ArrowUp'] = false; keys[' '] = false; keys['w'] = false;
  }

  // Vol Dr Strange : horizontal uniquement — ↑↓ ignorés pendant le vol

  if (T) { triggerTimeJump(); keys['t'] = false; }

  player.crouching = (C || (isTrackingActive() && getIsCrouching())) && !flightActive;
}

// ── Tracking → joueur ────────────────────────────────────────
function applyTrackingToPlayer() {
  if (!isTrackingActive()) {
    holdPalmTimer = 0;
    return;
  }

  holdPalmTimer = 0;
}

// ── Callback geste (changement) ──────────────────────────────
function onGestureChange(g) {
  if (g === 'closed_fist')   triggerTimeJump();
  if (g === '_strange_pull') activateStrange();
}

// ── Mise à jour joueur ───────────────────────────────────────
function updatePlayer() {
  if (flightActive) {
    // Vol horizontal uniquement : vy annulée agressivement chaque frame
    player.vy *= 0.10;
  } else {
    player.vy += GRAVITY;
  }
  player.vx *= 0.82;
  player.vx  = constrain(player.vx, -PLAYER_SPEED, PLAYER_SPEED);

  player.x += player.vx;
  player.y += player.vy;

  // Collisions
  const wasOnGround = player.onGround;
  player.onGround = false;

  // Collisions — toujours actives (même en vol pour bloquer les murs)
  for (const obs of obstacles) {
    if (!isActive(obs)) continue;
    const effR = player.crouching ? 23 : 51;
    resolveCircle(player, obs, effR);
  }
  resolveCigaretteBridge();
  // En vol : empêcher l'atterrissage involontaire (paroi / sol)
  if (flightActive && player.onGround) {
    player.onGround = false;
    player.vy = min(player.vy, -1.5);
  }

  // Réinitialiser double saut au sol
  if (!wasOnGround && player.onGround) {
    player.jumpsLeft = 2;
    player.landFrame = 10;
  }

  // Limites
  player.x = constrain(player.x, player.r + 2, WORLD_W - player.r - 2);
  if (player.y > H + 180) { player.y = GROUND_Y - 57; player.vy = 0; player.jumpsLeft = 2; }

  // Trail
  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 14) player.trail.shift();
  player.noiseT += 0.038;
  if (player.landFrame > 0) player.landFrame--;

  // Squash & stretch
  if (player.crouching) {
    player.tScaleX = 1.75; player.tScaleY = 0.32;
  } else if (flightActive) {
    // Légère élongation horizontale en vol
    player.tScaleX = 1.15; player.tScaleY = 0.88;
  } else if (!player.onGround) {
    const fall = constrain(player.vy / 12, -1, 1);
    player.tScaleY = 1 + fall * 0.38;
    player.tScaleX = 1 - abs(fall) * 0.20;
  } else if (player.landFrame > 0) {
    const t = player.landFrame / 10;
    player.tScaleX = lerp(1.4, 1.0, 1 - t);
    player.tScaleY = lerp(0.65, 1.0, 1 - t);
  } else {
    player.tScaleX = 1.0; player.tScaleY = 1.0;
  }
  player.scaleX = lerp(player.scaleX, player.tScaleX, 0.20);
  player.scaleY = lerp(player.scaleY, player.tScaleY, 0.20);

  // Morphing humain ↔ sphère : basé sur le mouvement
  const isMoving = abs(player.vx) > 0.6 || (!player.onGround && !flightActive);
  const hrTarget = isMoving ? 0.0 : 1.0;
  humanRatioSmooth = lerp(humanRatioSmooth, hrTarget, isMoving ? 0.18 : 0.07);
}

function resolveCircle(p, obs, effR) {
  const cx = constrain(p.x, obs.x, obs.x + obs.w);
  const cy = constrain(p.y, obs.y, obs.y + obs.h);
  const dx = p.x - cx, dy = p.y - cy;
  const d2 = dx*dx + dy*dy;
  if (d2 >= effR*effR) return;
  const d  = sqrt(d2) || 0.001;
  const ov = effR - d;
  const nx = dx/d, ny = dy/d;
  p.x += nx*ov; p.y += ny*ov;
  if (ny < -0.5) { p.vy = 0; p.onGround = true; }
  else if (ny > 0.5) p.vy = abs(p.vy) * 0.15;
  else p.vx = 0;
}

// ── Morphing humain ↔ sphère ──────────────────────────────────
// Retourne 0 = sphère pure, 1 = humain pur (basé sur le mouvement)
function _getHumanRatio() {
  return humanRatioSmooth;
}

// Personnage JAXX — Beat-Hacker Intergalactique (2D side-view)
function _drawJaxx(x, y, alpha) {
  if (alpha < 5) return;
  push();
  translate(x, y);
  if (!player.facingRight) scale(-1, 1);

  const gp = 0.65 + 0.35 * sin(frameCount * 0.08);  // glow pulse

  // Palette JAXX
  const bodyC   = color(0,   60,  85,  alpha);
  const armorC  = color(20,  18,  55,  alpha);
  const headC   = color(85,  68,  58,  alpha);
  const helmetC = color(60,  20,  100, alpha);
  const cyanC   = color(0,   220, 255, alpha * gp);
  const pinkC   = color(255, 0,   200, alpha * gp);
  const glovC   = color(25,  32,  45,  alpha);
  const bootC   = color(220, 225, 230, alpha);
  const darkC   = color(5,   5,   20,  alpha * 0.95);
  const ampC    = color(0,   80,  110, alpha * 0.8);

  const walking    = abs(player.vx) > 0.5 && player.onGround;
  const legSwing   = walking ? sin(player.noiseT * 6.5) * 7 : 0;
  const blinkPhase = frameCount % 200;

  noStroke();

  if (player.crouching) {
    // ── POSE ACCROUPIE ──────────────────────────────────────────

    // Boots (larges, aplaties)
    fill(bootC);
    rect(-33,  6, 21, 11, 0, 0, 5, 5);   // boot gauche
    rect( 12,  6, 21, 11, 0, 0, 5, 5);   // boot droite
    // Neon strips
    fill(cyanC); rect(-33, 6, 21, 3);
    fill(pinkC); rect( 12, 6, 21, 3);

    // Jambes courtes (genoux pliés)
    fill(armorC);
    rect(-28, -4, 16, 12, 4, 4, 0, 0);
    rect( 12, -4, 16, 12, 4, 4, 0, 0);

    // Corps principal (wide & low)
    fill(bodyC);
    rect(-24, -42, 48, 48, 12, 12, 5, 5);

    // Lignes circuit cyan
    stroke(cyanC); strokeWeight(1.5);
    line(-8, -36, -8,  -8);
    line( 8, -36,  8,  -8);
    line(-8, -22,  8, -22);
    noStroke();

    // Gauntlets latéraux
    fill(glovC);
    rect(-38, -36, 16, 18, 5);
    rect( 22, -36, 16, 18, 5);
    fill(cyanC); ellipse(-30, -24, 12, 7);   // pad holo gauche
    fill(pinkC); ellipse( 30, -24, 12, 7);   // pad holo droite

    // Tête (basse, ramassée)
    fill(headC); ellipse(0, -54, 34, 30);

    // Visor cyan
    fill(cyanC); rect(-13, -61, 26, 8, 3);
    if (blinkPhase < 5) { fill(darkC); rect(-13, -61, 26, 8, 3); }

    // Casque
    fill(helmetC); rect(-17, -70, 34, 18, 8, 8, 3, 3);

    // Cheveux
    _drawJaxxHair(0, -72, alpha, 0.65);

  } else {
    // ── POSE DEBOUT ──────────────────────────────────────────────

    // Boots (blanches, bas)
    fill(bootC);
    rect(-18, 18, 15, 11, 0, 0, 4, 4);   // boot gauche
    rect(  3, 18, 15, 11, 0, 0, 4, 4);   // boot droite
    // Neon strips sur boots
    fill(cyanC); rect(-18, 18, 15, 3);
    fill(pinkC); rect(  3, 18, 15, 3);

    // Jambes (armor violet foncé, animation marche)
    fill(armorC);
    rect(-18,  0, 15, 21 + legSwing * 0.5, 3, 3, 0, 0);
    rect(  3,  0, 15, 21 - legSwing * 0.5, 3, 3, 0, 0);

    // Core Amp (cylindre audio derrière le torse, côté gauche)
    fill(ampC);
    rect(-28, -44, 13, 30, 5);
    fill(cyanC); ellipse(-22, -30, 7, 7);   // témoin lumineux ampli

    // Corps principal (torse dark teal)
    fill(bodyC);
    rect(-20, -68, 40, 70, 10, 10, 4, 4);

    // Lignes circuit cyan sur le torse
    stroke(cyanC); strokeWeight(1.5);
    line( -8, -60,  -8, -10);
    line(  8, -60,   8, -10);
    line( -8, -38,   8, -38);
    line( -8, -20,   8, -20);
    noStroke();

    // Bras gauche + gantelet DJ
    fill(armorC); rect(-34, -62, 16, 30, 6, 6, 3, 3);
    fill(glovC);  rect(-36, -36, 18, 20, 4, 4, 5, 5);
    fill(cyanC);  ellipse(-27, -26, 13, 8);   // pad holographique

    // Bras droit (partiellement visible)
    fill(armorC); rect( 18, -60, 14, 26, 6, 6, 3, 3);
    fill(glovC);  rect( 18, -37, 14, 15, 4, 4, 4, 4);

    // Épaulières
    fill(armorC);
    rect(-28, -70, 18, 8, 4);
    rect( 10, -70, 18, 8, 4);

    // Tête (visage marron)
    fill(headC); ellipse(0, -83, 34, 32);

    // Tatouages EQ animés (côtés du visage, barres équaliseur)
    const b1 = 3 + 4 * sin(frameCount * 0.22);
    const b2 = 3 + 4 * sin(frameCount * 0.22 + 1.1);
    const b3 = 3 + 4 * sin(frameCount * 0.22 + 2.2);
    fill(pinkC);
    rect(-18, -78 - b1, 3, b1, 1);
    rect(-14, -78 - b2, 3, b2, 1);
    rect(-10, -78 - b3, 3, b3, 1);

    // Visor (yeux cyan)
    fill(cyanC); rect(-13, -90, 26, 9, 4);
    if (blinkPhase >= 5) {
      fill(color(255, 255, 255, alpha * 0.8));
      ellipse(-5, -86, 5, 5);
      ellipse( 5, -86, 5, 5);
    } else {
      fill(darkC); rect(-13, -90, 26, 9, 4);   // clignement
    }

    // Casque (violet)
    fill(helmetC); rect(-18, -101, 36, 20, 9, 9, 4, 4);
    fill(color(40, 15, 75, alpha)); rect(-18, -95, 36, 8, 2);   // bande casque

    // Cheveux avec pointes lumineuses
    _drawJaxxHair(0, -103, alpha, 1.0);
  }

  pop();
}

// Mèches de cheveux JAXX avec pointes néon colorées
function _drawJaxxHair(hx, hy, alpha, sc) {
  noStroke();
  const locks = [
    { ox: -12, len: 14, c: color(0,   220, 255, alpha) },   // cyan
    { ox:  -5, len: 20, c: color(255,  0,  200, alpha) },   // pink
    { ox:   0, len: 22, c: color(180,  0,  255, alpha) },   // violet
    { ox:   5, len: 18, c: color(0,   220, 255, alpha) },   // cyan
    { ox:  12, len: 13, c: color(255,  80,   0, alpha) },   // orange
  ];
  for (const l of locks) {
    // Mèche (sombre)
    fill(10, 8, 28, alpha);
    rect(hx + l.ox * sc - 2 * sc, hy, 4 * sc, l.len * sc, 2);
    // Pointe lumineuse
    fill(l.c);
    ellipse(hx + l.ox * sc, hy + l.len * sc + 3 * sc, 6 * sc, 8 * sc);
  }
}

function _drawPlayerIndicators(hr) {
  // Indicateur accroupi (supprimé — la pose visuelle remplace ce debug label)

  // Flèche de direction (seulement en mode sphère)
  if (!player.crouching && hr < 0.5) {
    const arrowY   = player.y - player.r * player.scaleY - 18;
    const arrowCol = era===ERA_PRESENT ? color(255,180,50,220) : color(50,180,255,220);
    noStroke(); fill(arrowCol);
    const sz = 10;
    if (player.facingRight) {
      triangle(player.x + sz, arrowY,
               player.x - sz*0.6, arrowY - sz*0.75,
               player.x - sz*0.6, arrowY + sz*0.75);
    } else {
      triangle(player.x - sz, arrowY,
               player.x + sz*0.6, arrowY - sz*0.75,
               player.x + sz*0.6, arrowY + sz*0.75);
    }
  }

  // Double saut dispo (petit point au-dessus)
  if (!player.onGround && player.jumpsLeft > 0 && !flightActive && hr < 0.3) {
    noStroke();
    fill(era===ERA_PRESENT ? color(255,200,60,180) : color(60,200,255,180));
    ellipse(player.x, player.y - player.r * player.scaleY - 14, 7, 7);
  }

  // Indicateur vol Strange
  if (flightActive) {
    noStroke(); fill(255, 200, 50, 200);
    textAlign(CENTER, BOTTOM); textSize(11);
    text('✦ VOL ✦', player.x, player.y - player.r * player.scaleY - 8);
  }
}

// ── Sphère liquide ────────────────────────────────────────────
function drawLiquidSphere() {
  const hr = _getHumanRatio(); // 0 = sphère, 1 = humain

  // Déformation des sommets (rayon réduit pendant la transformation humain)
  for (let i = 0; i < SPHERE_VERTS; i++) {
    const angle = (i / SPHERE_VERTS) * TWO_PI;
    const n1 = noise(cos(angle)*0.42 + player.noiseT*0.85,
                     sin(angle)*0.42 + player.noiseT*0.60);
    const n2 = noise(cos(angle)*0.88 + player.noiseT*1.9,
                     sin(angle)*0.88 + player.noiseT*1.3);
    let deform = map(n1*0.65 + n2*0.35, 0, 1, 0.76, 1.24);
    if (!player.onGround && sin(angle) > 0.55) {
      deform *= 1 + 0.18 * abs(sin(player.noiseT*3 + angle));
    }
    sv[i].tr = player.r * deform * (1 - hr * 0.85);
    sv[i].r  = lerp(sv[i].r, sv[i].tr, 0.24);
  }

  // Trail
  noStroke();
  for (let i = 0; i < player.trail.length - 1; i++) {
    const t = i / player.trail.length;
    const trailC = auraActive
      ? color(255, 180, 30, t * 90)
      : (era===ERA_PRESENT ? color(255,160,50,t*65) : color(50,160,255,t*65));
    fill(trailC);
    ellipse(player.trail[i].x, player.trail[i].y, player.r * t * 1.1 * (1 - hr * 0.7));
  }

  // Sphère (s'efface quand hr → 1)
  if (hr < 0.95) {
    const sphereAlpha = map(hr, 0, 0.95, 1, 0);

    // Halo externe
    noStroke();
    if (auraActive) {
      fill(255, 180, 30, (45 + sin(frameCount * 0.15) * 25) * sphereAlpha);
      _drawSphereShape(1.55);
      fill(255, 220, 80, 25 * sphereAlpha);
      _drawSphereShape(1.8);
    } else {
      const haloC = era===ERA_PRESENT ? color(255,140,30,22*sphereAlpha) : color(30,140,255,22*sphereAlpha);
      fill(haloC);
      _drawSphereShape(1.35);
    }

    // Corps principal
    const mainC = auraActive
      ? color(255, 220, 90, 255 * sphereAlpha)
      : (era===ERA_PRESENT
          ? color(255, 200, 65, 255 * sphereAlpha)
          : color(65, 200, 255, 255 * sphereAlpha));
    fill(mainC);
    stroke(255, 255, 255, 80 * sphereAlpha);
    strokeWeight(1.5);
    _drawSphereShape(1.0);

    // Reflet
    noStroke(); fill(255, 255, 255, 65 * sphereAlpha);
    ellipse(player.x - player.r*0.22*player.scaleX,
            player.y - player.r*0.28*player.scaleY,
            player.r * 0.36);
  }

  // Humain JAXX (apparaît quand hr → 1)
  if (hr > 0.05) {
    _drawJaxx(player.x, player.y, map(hr, 0.05, 1, 0, 255));
  }

  _drawPlayerIndicators(hr);
}

function _drawSphereShape(scale) {
  beginShape();
  for (let i = 0; i <= SPHERE_VERTS; i++) {
    const idx   = i % SPHERE_VERTS;
    const angle = (idx / SPHERE_VERTS) * TWO_PI;
    const r     = sv[idx].r * scale;
    vertex(
      player.x + cos(angle) * r * player.scaleX,
      player.y + sin(angle) * r * player.scaleY
    );
  }
  endShape(CLOSE);
}

// ── Saut temporel ────────────────────────────────────────────
function triggerTimeJump() {
  // Cooldown disabled for instant repeated Time Jump
  era          = era===ERA_PRESENT ? ERA_PAST : ERA_PRESENT;
  // timeCooldown = JUMP_CD_MAX;
  borderPulse  = 1.0;
  playTimeJumpSound();
  spawnTimeParticles();
  for (const obs of obstacles) {
    if (!isActive(obs)) continue;
    resolveCircle(player, obs, player.crouching ? 23 : 51);
  }
  const d = document.getElementById('era-display');
  if (d) {
    d.textContent       = '[ ' + era + ' ]';
    d.style.color       = era===ERA_PRESENT ? '#ff7a30' : '#35b8ff';
    d.style.borderColor = era===ERA_PRESENT ? '#ff7a30' : '#35b8ff';
  }
}

// ── Doctor Strange ────────────────────────────────────────────
function activateStrange() {
  if (auraActive) return; // déjà actif
  auraActive   = true;
  auraTimer    = STRANGE_DUR;
  flightActive = true;
  player.vy    = 0;  // vol horizontal pur : pas de boost vertical
  borderPulse  = 1.0;
  playStrangeSound();
  destroyNearbyWalls();
}

// ── Détection cri micro → vol Strange ────────────────────────
// Amplitude RMS sur le buffer temporel : si pic > seuil pendant ~2 frames
// consécutives → activateStrange(). Cooldown 3 sec pour éviter re-trigger.
function _checkShoutFlight() {
  if (_micShoutCD > 0) { _micShoutCD--; return; }
  if (!_micAnalyser || !_micDataArray) return;

  _micAnalyser.getByteTimeDomainData(_micDataArray);
  // Calcul amplitude crête (distance max par rapport à la ligne médiane 128)
  let peak = 0;
  for (let i = 0; i < _micDataArray.length; i++) {
    const v = Math.abs(_micDataArray[i] - 128);
    if (v > peak) peak = v;
  }
  // Seuil 70/128 ≈ 55 % — cri fort mais pas simple parole
  if (peak > 70 && !auraActive) {
    activateStrange();
    _micShoutCD = 180; // cooldown 3 sec (60 fps × 3)
  }
}

function destroyNearbyWalls() {
  let destroyed = 0;
  for (const obs of obstacles) {
    if (!obs.destroyable || obs.destroyed) continue;
    if (obs.lbl === '') continue; // ignore sol
    // Distance du centre du mur au joueur
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;
    const dx = player.x - cx, dy = player.y - cy;
    if (sqrt(dx*dx + dy*dy) < DESTROY_RADIUS) {
      obs.destroyed = true;
      destroyed++;
      _spawnDestructionParticles(cx, cy);
    }
  }
  if (destroyed > 0) borderPulse = 1.0;
}

function _spawnDestructionParticles(cx, cy) {
  for (let i = 0; i < 40; i++) {
    const a  = random(TWO_PI);
    const sp = random(3, 11);
    particles.push({
      x: cx + random(-12, 12), y: cy + random(-12, 12),
      vx: cos(a)*sp, vy: sin(a)*sp - 2,
      life: 70, max: 70,
      col: color(255, random(140,220), random(20,80)),
      sz: random(4, 13),
    });
  }
  // Fragments rectangulaires
  for (let i = 0; i < 8; i++) {
    debris.push({
      x: cx + random(-20, 20), y: cy + random(-20, 20),
      vx: random(-4, 4), vy: random(-6, -1),
      rot: random(TWO_PI), vrot: random(-0.2, 0.2),
      w: random(6, 18), h: random(4, 12),
      life: 55, max: 55,
      col: color(200, 100, 20),
    });
  }
}

// ── Aura Doctor Strange ───────────────────────────────────────
function drawAura() {
  const t    = auraTimer / STRANGE_DUR; // 1 → 0
  const fade = t < 0.25 ? t / 0.25 : 1.0; // fade out les 0.25 dernières secondes
  const px   = player.x, py = player.y;

  push();
  translate(px, py);

  // ── Anneaux géométriques tournants ───
  const rings = [
    { r: 72,  segs: 12, gap: 0.28, rot: auraRot,        lw: 2.5, alpha: 220 },
    { r: 98,  segs: 8,  gap: 0.42, rot: -auraRot*1.4,   lw: 2.0, alpha: 180 },
    { r: 128, segs: 16, gap: 0.22, rot: auraRot*0.7,    lw: 1.5, alpha: 140 },
    { r: 55,  segs: 6,  gap: 0.35, rot: -auraRot*2.1,   lw: 3.0, alpha: 190 },
  ];

  for (const ring of rings) {
    noFill();
    stroke(255, 185, 40, ring.alpha * fade);
    strokeWeight(ring.lw);
    const segAngle = TWO_PI / ring.segs;
    for (let s = 0; s < ring.segs; s++) {
      const a0 = ring.rot + s * segAngle;
      const a1 = a0 + segAngle * (1 - ring.gap);
      arc(0, 0, ring.r * 2, ring.r * 2, a0, a1);
    }
  }

  // ── Lignes de mandala ────────────────────────────────────────
  stroke(255, 220, 80, 110 * fade);
  strokeWeight(1);
  const ML  = 6;
  const MR1 = 62, MR2 = 130;
  for (let m = 0; m < ML; m++) {
    const a = auraRot * 0.5 + (m / ML) * TWO_PI;
    line(cos(a)*MR1, sin(a)*MR1, cos(a)*MR2, sin(a)*MR2);
  }

  // ── Étoile centrale ──────────────────────────────────────────
  noStroke(); fill(255, 200, 50, 180 * fade);
  const starSz = 8 + sin(frameCount * 0.2) * 3;
  _drawStar(0, 0, starSz * 0.45, starSz, 6);

  // ── Cercle de base pulsant ───────────────────────────────────
  noFill();
  stroke(255, 160, 30, 130 * fade);
  strokeWeight(1.5);
  const baseR = player.r * 1.6 + sin(frameCount * 0.18) * 5;
  ellipse(0, 0, baseR * 2, baseR * 2);

  // ── Compte-à-rebours vol (arc de progression) ────────────────
  stroke(255, 255, 255, 120 * fade);
  strokeWeight(3);
  noFill();
  arc(0, 0, (player.r + 16) * 2, (player.r + 16) * 2, -HALF_PI, -HALF_PI + TWO_PI * t);

  pop();

  // ── Étincelles aura ──────────────────────────────────────────
  drawStrangeParticles();
}

function _drawStar(x, y, r1, r2, pts) {
  beginShape();
  for (let i = 0; i < pts * 2; i++) {
    const r     = i % 2 === 0 ? r2 : r1;
    const angle = (i / (pts * 2)) * TWO_PI - HALF_PI;
    vertex(x + cos(angle) * r, y + sin(angle) * r);
  }
  endShape(CLOSE);
}

// ── Étincelles Doctor Strange ─────────────────────────────────
function _spawnStrangeSpark() {
  const angle = random(TWO_PI);
  const dist  = player.r * 1.5 + random(20, 70);
  strangeParticles.push({
    x:   player.x + cos(angle) * dist,
    y:   player.y + sin(angle) * dist,
    vx:  cos(angle) * random(0.5, 2.5),
    vy:  sin(angle) * random(0.5, 2.5) - 1.5,
    life: random(14, 28), max: 28,
    sz:  random(2, 5),
  });
}

function updateStrangeParticles() {
  for (let i = strangeParticles.length - 1; i >= 0; i--) {
    const s = strangeParticles[i];
    s.x += s.vx; s.y += s.vy; s.vy += 0.08; s.life--;
    if (s.life <= 0) strangeParticles.splice(i, 1);
  }
}

function drawStrangeParticles() {
  noStroke();
  for (const s of strangeParticles) {
    const a = map(s.life, 0, s.max, 0, 240);
    fill(255, 195 + random(-20, 20), 30, a);
    ellipse(s.x, s.y, s.sz);
  }
}

// ── Bordure animée ────────────────────────────────────────────
function drawBorder() {
  let ec;
  if (auraActive) {
    ec = [255, 195, 40]; // dorée pendant le vol Strange
  } else {
    ec = era===ERA_PRESENT ? [255,122,48] : [53,184,255];
  }
  const alpha = 60  + borderPulse * 195;
  const thick = 3   + borderPulse * 22;
  noFill();
  stroke(ec[0], ec[1], ec[2], alpha);
  strokeWeight(thick);
  rect(thick/2, thick/2, W - thick, H - thick, 0);
}

// ── Barre de gestes (haut centre) ────────────────────────────
function drawGestureBar() {
  const IW = 98;
  const IH = 88;
  const N  = GBAR.length;
  const sx = W/2 - (IW*N)/2;
  const sy = 6;

  const leftG  = isTrackingActive() ? getLeftGesture() : 'none';
  const motion = isTrackingActive() ? getRightMotion() : 0;
  const crouch = isTrackingActive() ? getIsCrouching() : (keys['ArrowDown']||keys['s']||false);
  const ec     = auraActive ? [255,195,40]
               : era===ERA_PRESENT ? [255,122,48] : [53,184,255];

  for (let i = 0; i < N; i++) {
    const item = GBAR[i];
    const x    = sx + i * IW;

    const active =
      (item.key === leftG) ||
      (item.key === '_circ_r' && motion > 0.22) ||
      (item.key === '_circ_l' && motion < -0.22) ||
      (item.key === '_crouch' && crouch) ||
      (item.key === '_strange'    && auraActive) ||
      (item.key === '_cigbridge'  && cigaretteBridge !== null);

    if (active) {
      fill(ec[0], ec[1], ec[2], 200);
      stroke(ec[0], ec[1], ec[2], 255);
      strokeWeight(2);
    } else {
      fill(0, 0, 0, 160);
      stroke(40);
      strokeWeight(1);
    }
    rect(x, sy, IW - 2, IH, 4);

    noStroke(); fill(active ? 255 : 200);
    textAlign(CENTER, TOP); textSize(32);
    text(item.icon, x + IW/2 - 1, sy + 6);

    textSize(14);
    fill(active ? 255 : 150);
    text(item.label, x + IW/2 - 1, sy + 44);

    textSize(11);
    fill(active ? 230 : 90);
    text(item.action, x + IW/2 - 1, sy + 62);

    textSize(11);
    const hCol = item.hand==='L' ? color(255,90,60,active?255:120) :
                 item.hand==='R' ? color(60,190,255,active?255:120) :
                 item.hand==='2' ? color(255,200,40,active?255:120) :
                                   color(255,220,0,active?255:120);
    fill(hCol);
    const hLbl = item.hand==='L'?'G' : item.hand==='R'?'D' : item.hand==='2'?'2M' : 'CORPS';
    text(hLbl, x + IW/2 - 1, sy + IH - 10);
  }
}

// ── HUD ──────────────────────────────────────────────────────
function drawHUD() {
  // Indicateur double saut en bas
  if (!player.onGround && !flightActive) {
    const jumpsC = player.jumpsLeft > 0 ? color(255,200,60,180) : color(80,80,80,120);
    noStroke(); fill(jumpsC);
    textAlign(LEFT, BOTTOM); textSize(18);
    text('SAUTS: ' + '●'.repeat(player.jumpsLeft) + '○'.repeat(2-player.jumpsLeft),
         W - 190, H - 26);
  }

  // Vol Strange : barre de temps restant
  if (auraActive) {
    const barW = 240;
    const barX = W/2 - barW/2;
    const barY = H - 42;
    const pct  = auraTimer / STRANGE_DUR;
    noStroke(); fill(0, 0, 0, 140);
    rect(barX - 4, barY - 6, barW + 8, 22, 6);
    fill(255, 190, 30, 200);
    rect(barX, barY, barW * pct, 12, 4);
    noStroke(); fill(255, 220, 100);
    textAlign(CENTER, TOP); textSize(15);
    text('✦ VOL STRANGE ✦', W/2, barY + 15);
  }

  if (!isTrackingActive()) {
    noStroke(); fill(70);
    textAlign(CENTER, TOP); textSize(18);
    text('mode clavier — caméra non active', W/2, H - 28);
  }
}

// ── Cooldown HTML ─────────────────────────────────────────────
function updateCooldownBarHTML() {
  const pct   = timeCooldown > 0 ? 1 - timeCooldown/JUMP_CD_MAX : 1;
  const fillEl = document.getElementById('cooldown-fill');
  if (fillEl) {
    fillEl.style.width      = (pct * 100) + '%';
    fillEl.style.background = auraActive ? '#ffc832'
                            : era===ERA_PRESENT ? '#ff7a30' : '#35b8ff';
  }
}

// ── Particules saut ───────────────────────────────────────────
let particles = [];
let debris    = [];

function spawnJumpParticles(isSecond) {
  const c = isSecond
    ? color(255, 240, 80)   // 2e saut → doré
    : (era===ERA_PRESENT ? color(255,150,50) : color(50,150,255));
  const count = isSecond ? 16 : 10;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: player.x + random(-8, 8), y: player.y + player.r,
      vx: random(-2.8, 2.8), vy: random(-1.5, 2.5),
      life: isSecond ? 50 : 38, max: isSecond ? 50 : 38,
      col: c, sz: random(4, isSecond ? 12 : 9),
    });
  }
  // Anneau flash pour 2e saut
  if (isSecond) {
    for (let i = 0; i < 20; i++) {
      const a  = (i / 20) * TWO_PI;
      const sp = random(3, 7);
      particles.push({
        x: player.x, y: player.y,
        vx: cos(a)*sp, vy: sin(a)*sp,
        life: 22, max: 22,
        col: color(255, 255, 120), sz: random(3, 7),
      });
    }
  }
}

function spawnTimeParticles() {
  const c = era===ERA_PRESENT ? color(255,160,50) : color(50,160,255);
  for (let i = 0; i < 55; i++) {
    const a = random(TWO_PI), sp = random(2.5, 9);
    particles.push({
      x: player.x, y: player.y,
      vx: cos(a)*sp, vy: sin(a)*sp,
      life: 65, max: 65, col: c, sz: random(3, 9),
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.x += d.vx; d.y += d.vy; d.vy += 0.18; d.vx *= 0.96;
    d.rot += d.vrot; d.life--;
    if (d.life <= 0) debris.splice(i, 1);
  }
}

function drawParticles() {
  noStroke();
  for (const p of particles) {
    const a = map(p.life, 0, p.max, 0, 200);
    fill(red(p.col), green(p.col), blue(p.col), a);
    ellipse(p.x, p.y, p.sz);
  }
  // Débris (fragments de murs détruits)
  for (const d of debris) {
    const a = map(d.life, 0, d.max, 0, 200);
    push();
    translate(d.x, d.y); rotate(d.rot);
    fill(red(d.col), green(d.col), blue(d.col), a);
    noStroke();
    rect(-d.w/2, -d.h/2, d.w, d.h, 2);
    pop();
  }
}

// ── Pont cigarette ────────────────────────────────────────────
// Déclenche sur le front montant du geste V+bouche
function checkCigaretteGesture() {
  if (!isTrackingActive()) return;
  const vnm = getIsVNearMouth();
  if (vnm && !prevVNearMouth && !cigaretteBridge) {
    spawnCigaretteBridge();
  }
  prevVNearMouth = vnm;
}

function spawnCigaretteBridge() {
  playCigaretteSound();
  const startX = player.facingRight
    ? player.x + player.r
    : player.x - player.r - CIGBRIDGE_LENGTH;
  const by = player.y + player.r - 2;  // niveau des pieds
  cigaretteBridge = {
    x:           startX,
    y:           by,
    w:           CIGBRIDGE_LENGTH,
    h:           CIGBRIDGE_H,
    timer:       CIGBRIDGE_DURATION,
    facingRight: player.facingRight,
  };
}

function updateCigaretteBridge() {
  if (!cigaretteBridge) return;
  cigaretteBridge.timer--;
  if (cigaretteBridge.timer <= 0) {
    cigaretteBridge = null;
    smokeParticles  = [];
    return;
  }

  // Braise — particule de fumée au bout qui brûle
  const b       = cigaretteBridge;
  const t       = b.timer / CIGBRIDGE_DURATION;
  const activeW = b.w * t;
  // Le bout lointain brûle en premier
  const emberX  = b.facingRight ? b.x + activeW : b.x + b.w - activeW;

  if (frameCount % 3 === 0) {
    smokeParticles.push({
      x: emberX, y: b.y,
      vx: random(-0.4, 0.4), vy: random(-1.8, -0.5),
      life: 28, max: 28,
    });
  }
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const s = smokeParticles[i];
    s.x += s.vx; s.y += s.vy; s.life--;
    if (s.life <= 0) smokeParticles.splice(i, 1);
  }
}

function drawCigaretteBridge() {
  if (!cigaretteBridge) return;
  const b       = cigaretteBridge;
  const t       = b.timer / CIGBRIDGE_DURATION;  // 1 → 0
  const activeW = b.w * t;                        // rétrécit du côté lointain
  const ashW    = b.w - activeW;

  // Coordonnées selon direction
  let activeX, ashX, emberX;
  if (b.facingRight) {
    activeX = b.x;
    ashX    = b.x + activeW;
    emberX  = b.x + activeW;
  } else {
    activeX = b.x + ashW;
    ashX    = b.x;
    emberX  = b.x + ashW;
  }

  // Cendres (partie brûlée)
  noStroke();
  fill(85, 80, 75, 90);
  rect(ashX, b.y, ashW, b.h, 2);

  // Corps actif du pont (cigarette qui brûle)
  const cigCol = lerpColor(color(240, 220, 180), color(255, 130, 40), 1 - t);
  fill(cigCol);
  stroke(255, 210, 90, 180);
  strokeWeight(1.5);
  rect(activeX, b.y, activeW, b.h, 2);

  // Braise pulsante au bout qui brûle
  if (activeW > 3) {
    const pulse = 0.65 + 0.35 * sin(frameCount * 0.5);
    noStroke();
    fill(255, 65, 5, 230 * pulse);
    ellipse(emberX, b.y + b.h / 2, 14, 12);
    fill(255, 210, 50, 160 * pulse);
    ellipse(emberX, b.y + b.h / 2, 7, 6);
  }

  // Fumée
  noStroke();
  for (const s of smokeParticles) {
    const a  = map(s.life, 0, s.max, 0, 55);
    const sz = map(s.life, s.max, 0, 4, 16);
    fill(200, 195, 190, a);
    ellipse(s.x, s.y, sz);
  }

  // Étiquette flottante avec compte-à-rebours
  noStroke();
  fill(255, 220, 100, 200);
  textAlign(CENTER, BOTTOM);
  textSize(11);
  const secsLeft = (t).toFixed(1);
  text('🚬 ' + secsLeft + 's', activeX + activeW / 2, b.y - 5);
}

// Collision joueur ↔ pont cigarette (partie encore active)
function resolveCigaretteBridge() {
  if (!cigaretteBridge) return;
  const b       = cigaretteBridge;
  const t       = b.timer / CIGBRIDGE_DURATION;
  const activeW = b.w * t;
  if (activeW < 4) return;  // trop fin pour collision

  const collX = b.facingRight ? b.x : b.x + (b.w - activeW);
  const bridgeRect = { x: collX, y: b.y, w: activeW, h: b.h };
  const effR = player.crouching ? 23 : 51;
  resolveCircle(player, bridgeRect, effR);
}

// ── Clavier ───────────────────────────────────────────────────
function keyPressed() {
  _unlockAudio();
  const refreshShortcut = keyCode === 116 || (keyCode === 82 && typeof event !== 'undefined' && (event.ctrlKey || event.metaKey));
  if (refreshShortcut) return;

  // ── Helldivers mini-jeu : bloque les contrôles du jeu tant qu'il est actif ─
  if (HelldiversInteraction.isActive()) {
    HelldiversInteraction.onKeyPressed(keyCode);
    return false;
  }

  // ── Bascule vue debug ↔ niveau complet (touche V) ───────────
  if ((key === 'v' || key === 'V') && DEBUG_3SCREENS) {
    _toggleViewMode();
    return false;
  }

  // ── Éditeur de niveau (priorité max quand actif) ─────────────
  // E active/désactive l'éditeur. Quand actif, B/C/N/S/F/1-4 sont interceptés.
  if (LevelEditor.keyPressed(keyCode)) return false;

  keys[key] = true;
  if (keyCode===UP_ARROW)    keys['ArrowUp']    = true;
  if (keyCode===DOWN_ARROW)  keys['ArrowDown']  = true;
  if (keyCode===LEFT_ARROW)  keys['ArrowLeft']  = true;
  if (keyCode===RIGHT_ARROW) keys['ArrowRight'] = true;
  if (key===' ') return false;

  if (key==='o'||key==='O') toggleOverlay();
  if (key==='c'||key==='C') calibrateCrouch();

  // Strange : déclenché par cri micro (AAAAA) — touche Y gardée pour test dev
  if (key==='y'||key==='Y') activateStrange();

  // Test pont cigarette au clavier (touche B)
  if ((key==='b'||key==='B') && !cigaretteBridge) spawnCigaretteBridge();
}

// ── Souris — télékinésie + éditeur de niveau ─────────────────────
function mousePressed() {
  _unlockAudio();
  // Boutons UI canvas-space — priorité avant tout
  if (_hitUIToggleBtn(mouseX, mouseY))  { _uiVisible = !_uiVisible; _applyUIVisibility(); return; }
  if (gameState === 'tutorial' && _hitSkipTutorialBtn(mouseX, mouseY)) { skipTutorial(); return; }

  TelekinesisInteraction.mousePressed(mouseX, mouseY);
  LevelEditor.mousePressed(mouseX, mouseY);
}
function mouseDragged() {
  TelekinesisInteraction.mouseDragged(mouseX, mouseY);
  LevelEditor.mouseDragged(mouseX, mouseY);
}
function mouseReleased() {
  TelekinesisInteraction.mouseReleased();
  LevelEditor.mouseReleased();
}
function keyReleased() {
  keys[key] = false;
  if (keyCode===UP_ARROW)    keys['ArrowUp']    = false;
  if (keyCode===DOWN_ARROW)  keys['ArrowDown']  = false;
  if (keyCode===LEFT_ARROW)  keys['ArrowLeft']  = false;
  if (keyCode===RIGHT_ARROW) keys['ArrowRight'] = false;
}
// ── Bascule vue : fenêtre ↔ niveau complet 5760×1200 ──────────────
function _toggleViewMode() {
  if (CANVAS_W < W) {
    // Passer en vue niveau complet
    CANVAS_W = W;
    CANVAS_H = H;
    frameRate(30);
  } else {
    // Revenir en vue fenêtre
    CANVAS_W = window.innerWidth;
    CANVAS_H = window.innerHeight;
    frameRate(60);
  }
  DEBUG_SC = CANVAS_W / W;
  resizeCanvas(CANVAS_W, CANVAS_H);
  _positionCanvas();
}

function _positionCanvas() {
  const cnv = document.querySelector('canvas');
  if (!cnv) return;
  cnv.style.left = '0px';
  cnv.style.top  = '0px';
}

function windowResized() {
  if (DEBUG_3SCREENS && CANVAS_W < W) {
    // Mode fenêtre : suivre le redimensionnement
    CANVAS_W = window.innerWidth;
    CANVAS_H = window.innerHeight;
    DEBUG_SC  = CANVAS_W / W;
    resizeCanvas(CANVAS_W, CANVAS_H);
  }
  _positionCanvas();
}

// ── Numéro de niveau (canvas-space, haut centre) ─────────────
function drawLevelNumber() {
  if (typeof LEVELS_DATA === 'undefined') return;
  const ld   = LEVELS_DATA[currentLevelIndex];
  const name = ld ? ld.name : '';
  const lbl  = `NIVEAU ${currentLevelIndex + 1}${name ? ' · ' + name : ''}`;

  push();
  const cx   = CANVAS_W / 2;
  const tw   = 34 + lbl.length * 10.5;
  const th   = 50;
  const ty   = 12;

  // Fond
  noStroke();
  fill(0, 0, 0, 170);
  rect(cx - tw / 2, ty, tw, th, 5);

  // Bordure
  noFill();
  stroke(255, 200, 60, 120);
  strokeWeight(1);
  rect(cx - tw / 2, ty, tw, th, 5);

  // Texte
  noStroke();
  fill(255, 215, 60, 220);
  textFont('Courier New');
  textAlign(CENTER, CENTER);
  textSize(22);
  text(lbl, cx, ty + th / 2);
  pop();
}

// ── Portes d'entrée ───────────────────────────────────────────
// La porte de sortie est gérée par drawExitDoor() dans mechanics.js.
function drawDoors() {
  _drawDoor(63, GROUND_Y - 150, true);
}

function _drawDoor(x, y, isEntry) {
  const dW = 78;
  const dH = 180;
  const pulse = 0.5 + 0.5 * sin(frameCount * 0.07);

  // Couleur selon entrée/sortie et ère
  let r, g, b;
  if (isEntry) {
    // Vert entrée
    r = 40; g = 220; b = 100;
  } else {
    // Rouge/orange sortie
    r = 255; g = 90; b = 40;
  }

  // Halo externe pulsant
  noStroke();
  fill(r, g, b, 18 + pulse * 22);
  rect(x - 14, y - 14, dW + 28, dH + 28, 12);

  // Bâti de la porte
  fill(r * 0.18, g * 0.18, b * 0.18, 230);
  stroke(r, g, b, 100 + pulse * 120);
  strokeWeight(3);
  rect(x, y, dW, dH, 5);

  // Scanlines verticales
  noStroke();
  for (let sx = x + 6; sx < x + dW - 6; sx += 8) {
    fill(r, g, b, 14 + pulse * 10);
    rect(sx, y + 4, 3, dH - 8);
  }

  // Bordure lumineuse intérieure
  noFill();
  stroke(r, g, b, 160 + pulse * 80);
  strokeWeight(1.5);
  rect(x + 4, y + 4, dW - 8, dH - 8, 3);

  // Coins marqueurs
  const mk = 10;
  stroke(r, g, b, 200 + pulse * 55);
  strokeWeight(2.5);
  // coin haut-gauche
  line(x, y, x + mk, y);
  line(x, y, x, y + mk);
  // coin haut-droit
  line(x + dW, y, x + dW - mk, y);
  line(x + dW, y, x + dW, y + mk);
  // coin bas-gauche
  line(x, y + dH, x + mk, y + dH);
  line(x, y + dH, x, y + dH - mk);
  // coin bas-droit
  line(x + dW, y + dH, x + dW - mk, y + dH);
  line(x + dW, y + dH, x + dW, y + dH - mk);

  // Symbole centré
  noStroke();
  fill(r, g, b, 180 + pulse * 60);
  textAlign(CENTER, CENTER);
  textSize(22);
  text(isEntry ? '▶' : '★', x + dW / 2, y + dH / 2 - 8);

  // Label sous le symbole
  textSize(12);
  fill(r, g, b, 160);
  text(isEntry ? 'ENTRÉE' : 'SORTIE', x + dW / 2, y + dH / 2 + 14);

  // Ligne au sol
  stroke(r, g, b, 80 + pulse * 60);
  strokeWeight(1);
  line(x, y + dH, x + dW, y + dH);
}

// ── Overlay intro (3.67 s de gel) ────────────────────────────
function drawIntroOverlay() {
  // Fond semi-transparent
  noStroke();
  fill(0, 0, 0, 190);
  rect(0, 0, W, H);

  // Progression du compte-à-rebours (220 → 0)
  const progress = introTimer / 220;  // 1 → 0

  // Glitch horizontal aléatoire
  const glitch = sin(frameCount * 2.7) * 3;

  // Titre principal
  const titleAlpha = 220;
  fill(255, 220, 80, titleAlpha);
  textAlign(CENTER, CENTER);
  textSize(18);
  text('— ZONE INSTABLE —', W / 2 + glitch, H / 2 - 90);

  textSize(28);
  fill(255, 100, 40, titleAlpha);
  text('GRAVITÉ ET FLUX', W / 2 - glitch * 0.5, H / 2 - 52);
  text('TEMPOREL PERTURBÉS', W / 2 + glitch * 0.5, H / 2 - 16);

  // Sous-titre
  textSize(18);
  fill(200, 200, 255, 170);
  text('Prépare-toi à naviguer entre les époques', W / 2, H / 2 + 22);

  // Barre de décompte
  const barW = 320;
  const barX = W / 2 - barW / 2;
  const barY = H / 2 + 55;
  noStroke();
  fill(30, 30, 60, 200);
  rect(barX, barY, barW, 8, 4);
  fill(255, 120, 40, 220);
  rect(barX, barY, barW * progress, 8, 4);

  // Texte compte à rebours
  const secsLeft = ceil(introTimer / 60);
  textSize(14);
  fill(180, 180, 220, 180);
  textAlign(CENTER, TOP);
  text(secsLeft + ' …', W / 2, barY + 14);

  // Lignes de scan animées
  const scanY = (frameCount * 4) % H;
  stroke(255, 200, 60, 18);
  strokeWeight(1);
  line(0, scanY, W, scanY);
  if (scanY + 3 < H) line(0, scanY + 3, W, scanY + 3);
}

// ── Tutorial : vérification des actions ───────────────────────
function checkTutorialStep() {
  if (tutorialStep >= TUTORIAL_STEPS.length) return;

  // Detect entering a new step and reset visible timer
  if (_tLastTutorialStep !== tutorialStep) {
    _tLastTutorialStep = tutorialStep;
    _tStepVisibleTimer = TUTORIAL_AUTO_VISIBLE;
  }

  // ── Pendant la pause post-action (5 secondes) ─────────────────
  if (tutorialPauseTimer > 0) {
    tutorialPauseTimer--;
    if (tutorialPauseTimer === 0) {
      // Fin de pause → avancer à l'étape suivante
      tutorialStep++;
      if (tutorialStep >= TUTORIAL_STEPS.length) {
        setTimeout(() => {
          gameState = 'playing';
          player.x  = 270;
          player.y  = GROUND_Y - 57;
          player.vx = 0;
          player.vy = 0;
          player.onGround  = false;
          player.jumpsLeft = 2;
          humanRatioSmooth = 1.0;
          era = ERA_PRESENT;
          for (const obs of obstacles) obs.destroyed = false;
          if (typeof playStartSound === 'function') playStartSound();
        }, 1000);
      }
    }
    return;  // ne pas re-détecter pendant la pause
  }

  // ── Détection de l'action ─────────────────────────────────────
  const step = TUTORIAL_STEPS[tutorialStep];
  if (step.done) return;

  let done = false;

  if (step.key === 'move') {
    done = abs(player.vx) > 1.0;
  } else if (step.key === 'jump') {
    done = !player.onGround && player.vy < -4;
  } else if (step.key === 'djump') {
    if (!player.onGround && player.jumpsLeft === 0 && _tPrevJumpsLeft === 1) done = true;
    _tPrevJumpsLeft = player.jumpsLeft;
  } else if (step.key === 'crouch') {
    done = player.crouching;
  } else if (step.key === 'timejump') {
    if (era !== _tPrevEra) done = true;
    _tPrevEra = era;
  } else if (step.key === 'terminal') {
    // Terminal D-PAD input (left-hand index touching terminal pad)
    if (_terminalDPadFired) done = true;
    // If player can't reach terminal, auto-advance after visible timer expires
    if (!done && _tStepVisibleTimer > 0) {
      _tStepVisibleTimer--;
      if (_tStepVisibleTimer === 0) done = true;
    }
  } else if (step.key === 'flight') {
    // Flight activated by loud shout → aura/flight becomes active
    if (flightActive || auraActive) done = true;
    // Allow a few seconds of visibility then auto-advance
    if (!done && _tStepVisibleTimer > 0) {
      _tStepVisibleTimer--;
      if (_tStepVisibleTimer === 0) done = true;
    }
  }

  if (done) {
    step.done          = true;
    tutorialPauseTimer = TUTO_PAUSE_DUR;  // 5 secondes de pause
    tutorialFlash      = TUTO_PAUSE_DUR;  // flash "✓ Bien !" pendant toute la pause
  }
}

// ── Tutorial : affichage plein écran ─────────────────────────
function drawTutorialOverlay() {
  const accentCol = era === ERA_PRESENT ? color(255, 140, 40) : color(60, 160, 255);
  const cx = W / 2;
  const cy = H / 2;

  // ── Fond plein écran semi-opaque ──────────────────────────────
  noStroke();
  fill(4, 4, 22, 210);
  rect(0, 0, W, H);

  // ── Carte centrale ────────────────────────────────────────────
  const cw = min(W * 0.88, 2680);  // largeur carte (88% du monde, max 2680px)
  const ch = 560;
  const cx0 = cx - cw / 2;
  const cy0 = cy - ch / 2;

  // Fond carte
  noStroke();
  fill(8, 8, 30, 240);
  rect(cx0, cy0, cw, ch, 24);

  // Bordure accentuée
  noFill();
  stroke(accentCol);
  strokeWeight(2.5);
  rect(cx0, cy0, cw, ch, 24);

  // ── ÉTAT "✓ Bien !" (pendant toute la pause) ──────────────────
  if (tutorialFlash > 0) {
    tutorialFlash--;
    const secsLeft = ceil(tutorialPauseTimer / 60);
    const doneStep = tutorialStep < TUTORIAL_STEPS.length
      ? TUTORIAL_STEPS[tutorialStep]
      : TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];

    // Fond vert pulsant
    const pulse = sin(frameCount * 0.15) * 0.5 + 0.5;
    noStroke();
    fill(30, 200, 80, 28 + pulse * 18);
    rect(cx0, cy0, cw, ch, 24);

    // Grand ✓ + nom de l'action (rangée haute)
    noStroke();
    fill(80, 255, 130, 240);
    textAlign(CENTER, CENTER);
    textSize(min(cw * 0.075, 124));
    text('✓', cx, cy0 + ch * 0.22);

    textSize(min(cw * 0.050, 82));
    fill(255, 255, 255, 240);
    text('BIEN !', cx, cy0 + ch * 0.42);

    textSize(min(cw * 0.026, 42));
    fill(180, 255, 200, 200);
    text(doneStep.label + ' maîtrisé', cx, cy0 + ch * 0.55);

    // ── Rappel des touches utilisées ─────────────────────────
    const hintY2   = cy0 + ch * 0.73;
    const col1b    = cx - cw * 0.23;
    const col2b    = cx + cw * 0.23;

    // Séparateur
    stroke(80, 255, 130, 50);
    strokeWeight(1);
    line(cx, hintY2 - 22, cx, hintY2 + 36);

    // Clavier
    noStroke();
    fill(160, 160, 160, 160);
    textAlign(CENTER, CENTER);
    textSize(min(cw * 0.016, 24));
    text('⌨ CLAVIER', col1b, hintY2 - 12);
    // Fond badge touche
    // Compute badge sizes to fit the text (extra padding for readability)
    fill(255, 220, 80, 40);
    noStroke();
    const keyTextSize = min(cw * 0.030, 44);
    textSize(keyTextSize);
    const paddingX = 56;
    const kwKey = min(max(textWidth(doneStep.hintKey) + paddingX, 96), min(cw * 0.5, 720));
    const kh = min(cw * 0.090, 80);
    rect(col1b - kwKey/2, hintY2 + 4, kwKey, kh, 8);
    stroke(255, 220, 80, 120); strokeWeight(1.5);
    rect(col1b - kwKey/2, hintY2 + 4, kwKey, kh, 8);
    noStroke();
    fill(255, 220, 80, 240);
    textAlign(CENTER, CENTER);
    text(doneStep.hintKey, col1b, hintY2 + 4 + kh/2);

    // Geste
    noStroke();
    fill(160, 160, 160, 160);
    textAlign(CENTER, CENTER);
    textSize(min(cw * 0.016, 24));
    text('✋ GESTE', col2b, hintY2 - 12);
    // Fond badge geste (size based on gesture text)
    const gestureTextSize = keyTextSize;
    textSize(gestureTextSize);
    const kwGesture = min(max(textWidth(doneStep.hintGesture) + paddingX, 96), min(cw * 0.5, 720));
    fill(60, 200, 255, 40);
    noStroke();
    rect(col2b - kwGesture/2, hintY2 + 4, kwGesture, kh, 8);
    stroke(60, 200, 255, 120); strokeWeight(1.5);
    rect(col2b - kwGesture/2, hintY2 + 4, kwGesture, kh, 8);
    noStroke();
    fill(60, 200, 255, 240);
    textSize(gestureTextSize);
    text(doneStep.hintGesture, col2b, hintY2 + 4 + kh/2);

    // Compte à rebours
    const barW = cw * 0.68;
    const barH = 12;
    const barX = cx - barW / 2;
    const barY = cy0 + ch - 34;
    const pct  = tutorialPauseTimer / TUTO_PAUSE_DUR;
    noStroke(); fill(255, 255, 255, 22); rect(barX, barY, barW, barH, 5);
    fill(80, 255, 130, 175); rect(barX, barY, barW * pct, barH, 5);
    textSize(min(cw * 0.020, 30));
    fill(200, 255, 200, 175);
    textAlign(CENTER, CENTER);
    text('Prochain dans  ' + secsLeft + ' s', cx, barY - 10);

    return;  // ne rien dessiner d'autre
  }

  // ── Fin de tutoriel (toutes étapes ok) ────────────────────────
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    noStroke();
    fill(255, 220, 80, 230);
    textAlign(CENTER, CENTER);
    textSize(min(cw * 0.052, 86));
    text('Tutoriel terminé !', cx, cy - 20);
    textSize(min(cw * 0.026, 42));
    fill(180, 220, 255, 200);
    text('Lancement du niveau…', cx, cy + 50);
    return;
  }

  const step = TUTORIAL_STEPS[tutorialStep];

  // ── Numéro d'étape ────────────────────────────────────────────
  noStroke();
  fill(red(accentCol), green(accentCol), blue(accentCol), 160);
  textAlign(CENTER, TOP);
  textSize(min(cw * 0.020, 30));
  text('ÉTAPE  ' + (tutorialStep + 1) + '  /  ' + TUTORIAL_STEPS.length, cx, cy0 + 22);

  // ── Icône grande ─────────────────────────────────────────────
  textSize(min(cw * 0.085, 140));
  fill(255, 220, 80, 230);
  textAlign(CENTER, CENTER);
  text(step.icon, cx, cy0 + 155);

  // ── Nom de la mécanique ───────────────────────────────────────
  textSize(min(cw * 0.056, 94));
  fill(255, 255, 255, 245);
  textAlign(CENTER, CENTER);
  text(step.label, cx, cy0 + 258);

  // ── Description ───────────────────────────────────────────────
  textSize(min(cw * 0.026, 42));
  fill(180, 200, 255, 200);
  text(step.desc, cx, cy0 + 322);

  // ── Hints clavier | geste ─────────────────────────────────────
  const hintY = cy0 + ch - 58;
  const col1  = cx - cw * 0.22;
  const col2  = cx + cw * 0.22;

  // Séparateur vertical central
  stroke(red(accentCol), green(accentCol), blue(accentCol), 60);
  strokeWeight(1);
  line(cx, hintY - 22, cx, hintY + 32);

  // Clavier
  noStroke();
  fill(200, 200, 200, 170);
  textAlign(CENTER, CENTER);
  textSize(min(cw * 0.018, 26));
  text('⌨ CLAVIER', col1, hintY - 14);
  // Draw badge that fits the key text
  const normalKeySize = min(cw * 0.030, 40);
  textSize(normalKeySize);
  const paddingX2 = 40;
  const kwKeyN = min(max(textWidth(step.hintKey) + paddingX2, 80), min(cw * 0.5, 720));
  const khN = min(cw * 0.090, 80);
  fill(255, 220, 80, 40);
  rect(col1 - kwKeyN/2, hintY + 18 - khN/2, kwKeyN, khN, 8);
  stroke(255, 220, 80, 120); strokeWeight(1.2);
  rect(col1 - kwKeyN/2, hintY + 18 - khN/2, kwKeyN, khN, 8);
  noStroke(); fill(255, 220, 80, 220);
  textSize(normalKeySize);
  text(step.hintKey, col1, hintY + 18);

  // Geste
  noStroke();
  fill(200, 200, 200, 170);
  textAlign(CENTER, CENTER);
  textSize(min(cw * 0.018, 26));
  text('✋ GESTE', col2, hintY - 14);
  // Draw badge that fits the gesture text
  const normalGSize = normalKeySize;
  textSize(normalGSize);
  const kwGestN = min(max(textWidth(step.hintGesture) + paddingX2, 80), min(cw * 0.5, 720));
  fill(60, 200, 255, 40);
  rect(col2 - kwGestN/2, hintY + 18 - khN/2, kwGestN, khN, 8);
  stroke(60, 200, 255, 120); strokeWeight(1.2);
  rect(col2 - kwGestN/2, hintY + 18 - khN/2, kwGestN, khN, 8);
  noStroke(); fill(60, 200, 255, 220);
  textSize(normalGSize);
  text(step.hintGesture, col2, hintY + 18);

  // ── Points de progression ─────────────────────────────────────
  const dotR   = min(cw * 0.009, 14);
  const dotGap = dotR * 3.5;
  const dotsX0 = cx - (TUTORIAL_STEPS.length - 1) * dotGap / 2;
  const dotsY  = cy0 + ch + 28;
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    noStroke();
    const dx = dotsX0 + i * dotGap;
    if (TUTORIAL_STEPS[i].done) {
      fill(80, 230, 110, 230);
      ellipse(dx, dotsY, dotR * 2);
    } else if (i === tutorialStep) {
      const pulse2 = sin(frameCount * 0.14) * 0.4 + 0.6;
      fill(255, 200, 50, 180 + pulse2 * 75);
      ellipse(dx, dotsY, dotR * 2.4);
    } else {
      fill(60, 60, 90, 160);
      ellipse(dx, dotsY, dotR * 1.6);
    }
  }
}

// ── Fin de niveau ─────────────────────────────────────────────
// La détection de passage de porte est gérée par updateExitDoor() dans mechanics.js.
// checkLevelComplete() affiche uniquement le panneau victoire si levelComplete=true.
function _drawVictoryCrystal(cx, cy, size, age) {
  const pulse = 0.5 + 0.5 * sin(age * 0.08);
  const spin = age * 0.02;

  push();
  translate(cx, cy);
  rotate(spin);

  // Halo principal
  noStroke();
  fill(40, 120, 255, 62 + 40 * pulse);
  ellipse(0, 0, size * 2.15, size * 2.15);
  fill(255, 145, 55, 60 + 38 * pulse);
  ellipse(0, 0, size * 1.7, size * 1.7);

  // Anneaux orbitaux
  noFill();
  stroke(70, 180, 255, 112);
  strokeWeight(2);
  ellipse(0, 0, size * 1.55, size * 1.55);
  stroke(255, 155, 65, 112);
  ellipse(0, 0, size * 1.95, size * 1.95);

  // Cristal facetté
  const topY = -size * 1.18;
  const midY = -size * 0.08;
  const botY = size * 1.28;
  const leftX = -size * 0.72;
  const rightX = size * 0.72;
  const lowLeftX = -size * 0.42;
  const lowRightX = size * 0.42;

  noStroke();
  fill(50, 175, 245, 240);
  beginShape();
  vertex(0, topY);
  vertex(rightX, midY);
  vertex(lowRightX, botY);
  vertex(0, botY * 1.12);
  vertex(lowLeftX, botY);
  vertex(leftX, midY);
  endShape(CLOSE);

  fill(255, 165, 70, 150);
  triangle(0, topY, rightX, midY, 0, midY + size * 0.18);
  fill(85, 195, 255, 120);
  triangle(0, topY, leftX, midY, 0, midY + size * 0.18);
  fill(255, 205, 115, 112);
  triangle(lowLeftX, botY, 0, botY * 1.12, lowRightX, botY);

  // Highlights
  stroke(255, 255, 255, 130);
  strokeWeight(2);
  line(0, topY + 12, 0, botY - 12);
  line(leftX + 8, midY - 3, lowLeftX + 12, botY - 10);
  line(rightX - 8, midY - 3, lowRightX - 12, botY - 10);

  // Orbiting sparkles
  noStroke();
  for (let i = 0; i < 10; i++) {
    const ang = spin * 1.6 + i * TWO_PI / 10;
    const rr  = size * (1.45 + 0.15 * sin(age * 0.05 + i));
    const sx  = cos(ang) * rr;
    const sy  = sin(ang) * rr * 0.86;
    fill(i % 2 === 0 ? color(75, 195, 255, 180) : color(255, 165, 70, 200));
    ellipse(sx, sy, 6 + 2 * pulse);
  }

  pop();
}

function checkLevelComplete() {
  if (!levelComplete) return;

  if (finalVictoryStartFrame < 0) finalVictoryStartFrame = frameCount;
  const age = frameCount - finalVictoryStartFrame;
  const intro = constrain(age / 60, 0, 1);
  const glow  = 0.5 + 0.5 * sin(age * 0.08);

  // Panneau victoire animé (dernier niveau seulement — sinon, transition automatique)
  noStroke();
  fill(0, 0, 0, 175);
  rect(0, 0, W, H);

  // Light scan / star haze
  for (let i = 0; i < 18; i++) {
    const px = (i * 313 + age * 3) % W;
    const py = (i * 137 + age * 2) % H;
    fill(i % 2 === 0 ? color(80, 190, 255, 12) : color(255, 140, 55, 10));
    ellipse(px, py, 120 + 25 * sin(age * 0.04 + i));
  }

  const cw = 1060;
  const ch = 520;
  const cx = W / 2;
  const cy = H / 2;
  const x0 = cx - cw / 2;
  const y0 = cy - ch / 2;

  fill(8, 10, 28, 230);
  rect(x0, y0, cw, ch, 22);
  stroke(70, 180, 255, 160 + 50 * glow);
  strokeWeight(3);
  noFill();
  rect(x0, y0, cw, ch, 22);
  stroke(255, 150, 55, 70 + 50 * glow);
  strokeWeight(1.5);
  rect(x0 + 10, y0 + 10, cw - 20, ch - 20, 18);

  _drawVictoryCrystal(cx, y0 + 186 + sin(age * 0.05) * 10, 106, age);

  const titleY = y0 + 335;
  const subtitleY = y0 + 405;
  textAlign(CENTER, CENTER);
  fill(255, 220, 120, 255 * intro);
  textSize(34 + 8 * intro);
  text('Bravo !', cx, y0 + 70);

  fill(255, 245, 235, 245 * intro);
  textSize(28 + 6 * intro);
  text('Tu as obtenu le cristal de la planète TRON !', cx, titleY);

  fill(170, 220, 255, 200 * intro);
  textSize(18);
  text('Le cristal pulse entre le bleu et l’orange, comme les deux époques de TRON.', cx, subtitleY);

  // Small aura line under the text
  stroke(70, 180, 255, 120 + 80 * glow);
  strokeWeight(2);
  line(cx - 210, y0 + 462, cx + 210, y0 + 462);
}

// ── PASS 1 : vue d'ensemble atténuée ─────────────────────────
// Dessine le niveau complet en 1:1 (sans zoom) à très faible alpha.
// Visible sur les écrans latéraux — donne du contexte spatial.
function drawOverviewDim() {
  const a = 20;  // alpha faible : visible mais non distrayant

  // Sol
  noStroke();
  fill(era === ERA_PRESENT ? color(70, 28, 8, a * 2) : color(8, 28, 70, a * 2));
  rect(0, GROUND_Y + 36, WORLD_W, 64);

  // Obstacles actifs
  for (const obs of obstacles) {
    if (obs.lbl === '' || obs.destroyed) continue;
    if (!isActive(obs)) continue;
    let c;
    if (obs.low) {
      c = era === ERA_PRESENT ? color(180, 40, 120, a) : color(40, 180, 120, a);
    } else if (obs.destroyable) {
      c = era === ERA_PRESENT ? color(200, 90, 15, a) : color(15, 90, 180, a);
    } else {
      c = era === ERA_PRESENT ? color(200, 50, 15, a) : color(15, 55, 160, a);
    }
    fill(c);
    rect(obs.x, obs.y, obs.w, obs.h, 2);
  }

  // Porte d'entrée (silhouette)
  noStroke();
  fill(40, 220, 100, a);
  rect(63, GROUND_Y - 150, 78, 180, 3);

  // ── Rectangle du viewport actuel (zone zoomée visible) ───────
  const visW = W / viewZoom;
  noFill();
  const vpCol = era === ERA_PRESENT ? color(255, 160, 60, 38) : color(60, 160, 255, 38);
  stroke(vpCol); strokeWeight(1.5);
  rect(camX, 0, visW, H, 2);
  // Petites encoches en haut pour mieux repérer les bords
  const encoche = 10;
  stroke(vpCol);
  line(camX,         0, camX,         encoche);
  line(camX + visW,  0, camX + visW,  encoche);
  line(camX,         H, camX,         H - encoche);
  line(camX + visW,  H, camX + visW,  H - encoche);

  // ── Fantôme JAXX (vue d'ensemble, mini silhouette) ────────────
  const pa      = 45;
  const bodyGh  = color(0,   60,  85,  pa);
  const armorGh = color(20,  18,  55,  pa);
  const headGh  = color(85,  68,  58,  pa);
  const helmGh  = color(60,  20, 100,  pa);
  const cyanGh  = color(0,  220, 255,  pa);

  push();
  translate(player.x, player.y);
  if (!player.facingRight) scale(-1, 1);
  noStroke();

  if (player.crouching) {
    // Mini JAXX accroupi
    fill(armorGh);
    rect(-14, -2, 8, 6, 2, 2, 0, 0);   // jambe gauche
    rect(  6, -2, 8, 6, 2, 2, 0, 0);   // jambe droite
    fill(bodyGh);
    rect(-12, -21, 24, 24, 6, 6, 3, 3); // corps
    fill(headGh);
    ellipse(0, -27, 17, 15);            // tête
    fill(helmGh);
    rect(-9, -35, 18, 10, 4, 4, 2, 2); // casque
    fill(cyanGh);
    rect(-7, -31, 14, 4, 2);           // visor
  } else {
    // Mini JAXX debout
    fill(armorGh);
    rect( -9,  0, 8, 11, 2, 2, 0, 0);  // jambe gauche
    rect(  1,  0, 8, 11, 2, 2, 0, 0);  // jambe droite
    fill(armorGh);
    rect(-17, -31, 8, 15, 3, 3, 2, 2); // bras gauche
    fill(bodyGh);
    rect(-10, -34, 20, 36, 5, 5, 2, 2); // torse
    fill(headGh);
    ellipse(0, -42, 17, 16);            // tête
    fill(helmGh);
    rect(-9, -51, 18, 11, 5, 5, 2, 2); // casque
    fill(cyanGh);
    rect(-7, -47, 14, 4, 2);           // visor
  }
  pop();
}

// ── Séparateurs entre les 3 zones d'écran ────────────────────
function drawScreenDividers() {
  const c = era === ERA_PRESENT ? color(255, 80, 20, 15) : color(20, 80, 255, 15);
  stroke(c);
  strokeWeight(1);
  line(WORLD_W / 3,     0, WORLD_W / 3,     H);  // x = 1280
  line(WORLD_W * 2 / 3, 0, WORLD_W * 2 / 3, H);  // x = 2560
}

// ── D-pad virtuel : logique (appliqué chaque frame) ──────────
function applyDPadToPlayer() {
  const boxGrabbed = typeof TelekinesisInteraction !== 'undefined' &&
    typeof TelekinesisInteraction.isBoxGrabbed === 'function' &&
    TelekinesisInteraction.isBoxGrabbed();
  const keyboardLeft  = !!(keys['ArrowLeft']  || keys['a']);
  const keyboardRight = !!(keys['ArrowRight'] || keys['d']);
  const keyboardUp    = !!(keys['ArrowUp']    || keys[' '] || keys['w']);
  const keyboardDown  = !!(keys['ArrowDown']  || keys['s']);

  if (boxGrabbed) {
    _dpadZone = 'none';
    _dpadJumpFired = false;
    player.vx = 0;
    player.crouching = keyboardDown && !flightActive;
    return;
  }
  const applyKeyboardMove = () => {
    if (keyboardLeft && !keyboardRight) {
      player.vx -= 1.1;
      player.facingRight = false;
      player.standingOnData = -1;
      return;
    }
    if (keyboardRight && !keyboardLeft) {
      player.vx += 1.1;
      player.facingRight = true;
      player.standingOnData = -1;
      return;
    }
    if (!keyboardLeft && !keyboardRight) {
      player.vx = 0;
    }
  };

  if (!isTrackingActive()) {
    _dpadZone = 'none';
    _dpadJumpFired = false;
    applyKeyboardMove();
    player.crouching = keyboardDown && !flightActive;
    return;
  }

  const wp = _getRightHandCursor();
  if (!wp) {
    _dpadZone = 'none';
    _dpadJumpFired = false;
    applyKeyboardMove();
    player.crouching = keyboardDown && !flightActive;
    return;
  }

  const layout = getMovementDPadLayout();
  const dx   = wp.x - layout.cx;
  const dy   = layout.cy - wp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > layout.r || dist < DPAD_DEAD) {
    _dpadZone      = 'none';
    _dpadJumpFired = false;
    if (!keyboardLeft && !keyboardRight) player.vx = 0;
    player.crouching = keyboardDown && !flightActive;
    return;
  }

  const prevZone = _dpadZone;
  _dpadZone = _getPadDirection(dx, dy);
  if (_dpadZone !== prevZone) _dpadJumpFired = false; // nouvelle zone → réarmer

  const motion = _getPadMotion(_dpadZone);
  const moveLeft  = motion.left  || keyboardLeft;
  const moveRight = motion.right || keyboardRight;

  if (!moveLeft && !moveRight) {
    player.vx = 0;
  }
  if (moveLeft && !moveRight) {
    player.vx -= 1.6;
    player.facingRight = false;
    player.standingOnData = -1;
  }
  if (moveRight && !moveLeft) {
    player.vx += 1.6;
    player.facingRight = true;
    player.standingOnData = -1;
  }

  if (motion.up) {
    // Saut déclenché une seule fois par entrée dans la zone haute
    if (!_dpadJumpFired && player.jumpsLeft > 0) {
      const isSecond = !player.onGround && player.jumpsLeft === 1;
      player.vy = isSecond ? JUMP_FORCE * 0.92 : JUMP_FORCE;
      player.vx += player.facingRight ? 7.5 : -7.5;
      player.onGround = false;
      player.jumpsLeft--;
      playJumpSound(isSecond);
      spawnJumpParticles(isSecond);
      _dpadJumpFired = true;
    }
  }

  player.crouching = (motion.down || keyboardDown) && !flightActive;
}

// ── D-pad virtuel : dessin (espace canvas, hors scale(DEBUG_SC)) ─
function drawDPad() {
  const layout = getMovementDPadLayout();
  const cx = layout.cx, cy = layout.cy, r = layout.r;
  const wp = isTrackingActive() ? _getRightHandCursor() : null;

  // Fond circulaire semi-transparent
  noStroke();
  fill(0, 0, 0, 80);
  ellipse(cx, cy, r * 2, r * 2);

  // Cercle extérieur
  noFill();
  stroke(255, 255, 255, 50);
  strokeWeight(1.5);
  ellipse(cx, cy, r * 2, r * 2);

  // Zone morte centrale
  stroke(255, 255, 255, 22);
  strokeWeight(1);
  ellipse(cx, cy, DPAD_DEAD * 2, DPAD_DEAD * 2);

  // Lignes de séparation des secteurs
  stroke(255, 255, 255, 18);
  strokeWeight(1);
  line(cx - r, cy, cx + r, cy);
  line(cx, cy - r, cx, cy + r);
  line(cx - r * 0.707, cy - r * 0.707, cx + r * 0.707, cy + r * 0.707);
  line(cx + r * 0.707, cy - r * 0.707, cx - r * 0.707, cy + r * 0.707);

  // 8 flèches directionnelles
  const dirs = [
    { zone: 'up',    sym: '⬆', ox:  0, oy: -1, hint: 'SAUT' },
    { zone: 'down',  sym: '⬇', ox:  0, oy:  1, hint: 'ACCROUPI' },
    { zone: 'left',  sym: '⬅', ox: -1, oy:  0, hint: '' },
    { zone: 'right', sym: '➡', ox:  1, oy:  0, hint: '' },
    { zone: 'up-right',   sym: '↗', ox:  0.72, oy: -0.72, hint: '' },
    { zone: 'up-left',    sym: '↖', ox: -0.72, oy: -0.72, hint: '' },
    { zone: 'down-left',  sym: '↙', ox: -0.72, oy:  0.72, hint: '' },
    { zone: 'down-right', sym: '↘', ox:  0.72, oy:  0.72, hint: '' },
  ];
  const ad = r * 0.70;

  for (const d of dirs) {
    const ax = cx + d.ox * ad;
    const ay = cy + d.oy * ad;
    const active = _dpadZone === d.zone;

    if (active) {
      noStroke();
      fill(255, 255, 100, 65);
      ellipse(ax, ay, 54, 54);
    }
    noStroke();
    fill(active ? color(255, 255, 100, 240) : color(255, 255, 255, 125));
    textAlign(CENTER, CENTER);
    textSize(active ? 30 : 24);
    text(d.sym, ax, ay);

    if (active && d.hint) {
      noStroke();
      fill(255, 255, 100, 170);
      textSize(11);
      text(d.hint, ax, ay + 22);
    }
  }

  // Curseur main droite (poignet)
  if (wp) {
    const cdx   = wp.x - cx;
    const cdy   = wp.y - cy;
    const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
    let curX = wp.x, curY = wp.y;
    if (cdist > r) {
      curX = cx + (cdx / cdist) * r;
      curY = cy + (cdy / cdist) * r;
    }
    const inZone = cdist <= r && cdist >= DPAD_DEAD;
    noStroke();
    fill(60, 200, 255, inZone ? 220 : 75);
    ellipse(curX, curY, 15, 15);
    noFill();
    stroke(60, 200, 255, inZone ? 140 : 45);
    strokeWeight(1.5);
    ellipse(curX, curY, 25, 25);
  }

  // Étiquette
  noStroke();
  fill(170, 170, 210, 120);
  textAlign(CENTER, BOTTOM);
  textSize(13);
  text('🤚 MAIN DROITE', cx, cy - r - 5);
}

function getMovementDPadLayout() {
  const cx = constrain(width * (2 / 3) - 200, DPAD_R + 44, width - DPAD_R - 44);
  const cy = height * 0.5;
  return { cx, cy, r: DPAD_R };
}

function getTerminalDPadLayout() {
  const cx = constrain(width * 0.84, DPAD_R + 84, width - DPAD_R - 44);
  const cy = height * (1.5 / 2);
  return { cx, cy, r: DPAD_R * 1.45 };
}

function _getLeftHandCursor() {
  const hand = typeof getLeftHandData === 'function' ? getLeftHandData() : null;
  if (!hand || !hand.keypoints || hand.keypoints.length < 9) return null;
  const indexTip = hand.keypoints[8];
  if (!indexTip) return null;
  return {
    x: indexTip.x + HAND_CURSOR_OFFSET_X,
    y: indexTip.y + HAND_CURSOR_OFFSET_Y,
  };
}

function _getRightHandCursor() {
  const hand = typeof getRightHandData === 'function' ? getRightHandData() : null;
  if (!hand || !hand.keypoints) return null;

  const indexTip = hand.keypoints[8] || null;
  if (indexTip) {
    return {
      x: indexTip.x + HAND_CURSOR_OFFSET_X,
      y: indexTip.y + HAND_CURSOR_OFFSET_Y,
    };
  }

  const wrist = hand.keypoints.find(kp => kp.name === 'wrist');
  if (!wrist) return null;
  return {
    x: wrist.x + HAND_CURSOR_OFFSET_X,
    y: wrist.y + HAND_CURSOR_OFFSET_Y,
  };
}

function _getPadDirection(dx, dy) {
  const angle = Math.atan2(dy, dx);
  const full = Math.PI * 2;
  const sector = Math.floor((((angle + full) % full) + Math.PI / 10) / (Math.PI / 4)) % 8;
  switch (sector) {
    case 0: return 'right';
    case 1: return 'up-right';
    case 2: return 'up';
    case 3: return 'up-left';
    case 4: return 'left';
    case 5: return 'down-left';
    case 6: return 'down';
    default: return 'down-right';
  }
}

function _getPadMotion(zone) {
  return {
    up: zone === 'up' || zone === 'up-left' || zone === 'up-right',
    down: zone === 'down' || zone === 'down-left' || zone === 'down-right',
    left: zone === 'left' || zone === 'up-left' || zone === 'down-left',
    right: zone === 'right' || zone === 'up-right' || zone === 'down-right',
  };
}

function drawTerminalDPad() {
  const layout = getTerminalDPadLayout();
  const cx = layout.cx, cy = layout.cy, r = layout.r;
  const terminalDead = 40;
  const state = typeof HelldiversInteraction !== 'undefined' ? HelldiversInteraction.getState() : 'inactive';
  const active = state === 'playing';

  const leftCursor = _getLeftHandCursor();
  const px = leftCursor ? leftCursor.x : -9999;
  const py = leftCursor ? leftCursor.y : -9999;
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const pointerZone = active && leftCursor && dist <= r && dist >= terminalDead ? _getPadDirection(dx, dy) : 'none';

  if (active && leftCursor) {
    if (pointerZone !== _terminalDPadZone) {
      _terminalDPadZone = pointerZone;
      _terminalDPadFired = false;
    }
    if (_terminalDPadZone !== 'none' && !_terminalDPadFired && typeof HelldiversInteraction.onKeyPressed === 'function') {
      const codeMap = { up: UP_ARROW, down: DOWN_ARROW, left: LEFT_ARROW, right: RIGHT_ARROW };
      if (typeof playAudioSfx === 'function') playAudioSfx('sfx_bip');
      HelldiversInteraction.onKeyPressed(codeMap[_terminalDPadZone]);
      _terminalDPadFired = true;
    }
  } else {
    _terminalDPadZone = 'none';
    _terminalDPadFired = false;
  }

  push();
  noStroke();
  fill(0, 0, 0, 82);
  ellipse(cx, cy, r * 2, r * 2);

  noFill();
  stroke(255, 255, 255, 50);
  strokeWeight(1.5);
  ellipse(cx, cy, r * 2, r * 2);

  stroke(255, 255, 255, 18);
  strokeWeight(1);
  line(cx - r, cy, cx + r, cy);
  line(cx, cy - r, cx, cy + r);

  const dirs = [
    { zone: 'up', sym: '⬆', ox: 0, oy: -1 },
    { zone: 'down', sym: '⬇', ox: 0, oy: 1 },
    { zone: 'left', sym: '⬅', ox: -1, oy: 0 },
    { zone: 'right', sym: '➡', ox: 1, oy: 0 },
  ];
  const ad = r * 0.54;
  for (const d of dirs) {
    const ax = cx + d.ox * ad;
    const ay = cy + d.oy * ad;
    const isActive = pointerZone === d.zone;
    if (isActive) {
      noStroke();
      fill(255, 255, 100, active ? 90 : 50);
      ellipse(ax, ay, 66, 66);
    }
    noStroke();
    fill(isActive ? color(255, 255, 100, 255) : color(255, 255, 255, 150));
    textAlign(CENTER, CENTER);
    textSize(isActive ? 38 : 30);
    text(d.sym, ax, ay);
  }

  noStroke();
  fill(170, 170, 210, 150);
  textAlign(CENTER, CENTER);
  textSize(16);
  text('D-PAD TERMINAL', cx, cy + r + 24);
  pop();
}

// ═══════════════════════════════════════════════════════════════
//  TOGGLE UI — masque/affiche overlays canvas ET panneaux HTML
// ═══════════════════════════════════════════════════════════════
function _applyUIVisibility() {
  const vis = _uiVisible ? '' : 'none';
  const ids = ['ui-top-left', 'gesture-panel'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.style.display = vis;
  }
}

// ── Bouton toggle UI  (bas-gauche, espace canvas) ──────────────
const _UI_BTN_W = 128;
const _UI_BTN_H = 42;
const _UI_BTN_X = 12;
const _UI_BTN_Y = CANVAS_H - _UI_BTN_H - 12;

function drawUIToggleBtn() {
  if (LevelEditor.isEnabled()) return;  // caché quand l'éditeur est actif
  noStroke();
  fill(0, 0, 0, 130);
  rect(_UI_BTN_X, _UI_BTN_Y, _UI_BTN_W, _UI_BTN_H, 8);
  noFill();
  stroke(_uiVisible ? color(110, 220, 110, 200) : color(200, 100, 100, 200));
  strokeWeight(1.5);
  rect(_UI_BTN_X, _UI_BTN_Y, _UI_BTN_W, _UI_BTN_H, 8);
  noStroke();
  fill(_uiVisible ? color(140, 255, 140, 230) : color(255, 130, 130, 230));
  textAlign(CENTER, CENTER);
  textSize(15);
  text(_uiVisible ? '👁 UI ON' : '👁 UI OFF', _UI_BTN_X + _UI_BTN_W / 2, _UI_BTN_Y + _UI_BTN_H / 2);
}

function _hitUIToggleBtn(mx, my) {
  if (LevelEditor.isEnabled()) return false;
  return mx >= _UI_BTN_X && mx <= _UI_BTN_X + _UI_BTN_W &&
         my >= _UI_BTN_Y && my <= _UI_BTN_Y + _UI_BTN_H;
}

// ═══════════════════════════════════════════════════════════════
//  BOUTON PASSER TUTORIEL  (bas-droite, espace canvas)
// ═══════════════════════════════════════════════════════════════
const _SKIP_BTN_W = 190;
const _SKIP_BTN_H = 50;
const _SKIP_BTN_X = CANVAS_W - _SKIP_BTN_W - 16;
const _SKIP_BTN_Y = CANVAS_H - _SKIP_BTN_H - 16;

function drawSkipTutorialBtn() {
  // Fond
  noStroke();
  fill(0, 0, 0, 150);
  rect(_SKIP_BTN_X, _SKIP_BTN_Y, _SKIP_BTN_W, _SKIP_BTN_H, 10);
  // Bordure dorée animée
  const pulse = sin(frameCount * 0.08) * 0.5 + 0.5;
  noFill();
  stroke(255, 220, 80, 140 + pulse * 90);
  strokeWeight(1.5);
  rect(_SKIP_BTN_X, _SKIP_BTN_Y, _SKIP_BTN_W, _SKIP_BTN_H, 10);
  // Texte
  noStroke();
  fill(255, 225, 90, 230);
  textAlign(CENTER, CENTER);
  textSize(18);
  text('PASSER  ▶▶', _SKIP_BTN_X + _SKIP_BTN_W / 2, _SKIP_BTN_Y + _SKIP_BTN_H / 2);
}

function _hitSkipTutorialBtn(mx, my) {
  return mx >= _SKIP_BTN_X && mx <= _SKIP_BTN_X + _SKIP_BTN_W &&
         my >= _SKIP_BTN_Y && my <= _SKIP_BTN_Y + _SKIP_BTN_H;
}

function skipTutorial() {
  for (const s of TUTORIAL_STEPS) s.done = true;
  tutorialStep      = TUTORIAL_STEPS.length;
  tutorialFlash     = 0;
  tutorialPauseTimer = 0;
  gameState         = 'playing';
}

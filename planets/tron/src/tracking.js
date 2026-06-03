// ============================================================
// tracking.js — v0.3
// ml5.js 1.x  ·  HandPose (2 mains) + BodyPose
// FIX v0.3 : tracking.js gère SON propre <video> via getUserMedia
//            → plus de conflit avec createCapture de p5.js
// ============================================================
//
// RÉFÉRENCE LANDMARKS ml5 1.x HandPose (21 points / main)
//
//  Nom ml5 1.x                   Doigt / Articulation
//  wrist                          Poignet
//  thumb_cmc / mcp / ip / tip     Pouce
//  index_finger_mcp/pip/dip/tip   Index
//  middle_finger_mcp/pip/dip/tip  Majeur
//  ring_finger_mcp/pip/dip/tip    Annulaire
//  pinky_finger_mcp/pip/dip/tip   Auriculaire
//
// RÉFÉRENCE LANDMARKS BodyPose (33 points, coords pixel 320×240)
//  left_shoulder(11)  right_shoulder(12)
//  left_elbow(13)     right_elbow(14)
//  left_wrist(15)     right_wrist(16)
//  left_hip(23)       right_hip(24)
//  left_knee(25)      right_knee(26)
//
// DICTIONNAIRE GESTES
//  closed_fist     Poing fermé      Closed Fist       Saut temporel
//  open_palm       Paume ouverte    Open Palm         Sprint
//  pointing_up     Index levé       Index Point Up    Sauter
//  victory_v       Signe V          Victory V Sign    Vision temporelle
//  thumb_up        Pouce levé       Thumbs Up         Interagir
//  spread_fingers  Doigts écartés   Spread/Fan        Onde de choc
//  pinch           Pincement        Pinch             Manipulation
//  _strange_pull   Mains croisées   Cross & Pull      Aura Strange / Vol
//  _crouch         Accroupissement  Crouch            S'aplatir
// ============================================================

const GESTURE_DICT = {
  closed_fist:    { fr:'Poing fermé',     en:'Closed Fist',     action:'Saut temporel',       icon:'✊' },
  open_palm:      { fr:'Paume ouverte',   en:'Open Palm',       action:'Sprint',              icon:'🖐' },
  pointing_up:    { fr:'Index levé',      en:'Index Point Up',  action:'Sauter',              icon:'☝' },
  victory_v:      { fr:'Signe V',         en:'Victory V Sign',  action:'Vision temporelle',   icon:'✌' },
  thumb_up:       { fr:'Pouce levé',      en:'Thumbs Up',       action:'Interagir',           icon:'👍' },
  spread_fingers: { fr:'Doigts écartés', en:'Spread/Fan',      action:'Onde de choc',        icon:'🖖' },
  pinch:          { fr:'Pincement',       en:'Pinch Gesture',   action:'Manipulation objet',  icon:'🤏' },
  ok_sign:        { fr:'OK',              en:'OK Sign',         action:'Accroupir',            icon:'👌' },
  _strange_pull:  { fr:'Croiser & écarter',en:'Cross & Pull',  action:'Aura Strange / Vol',  icon:'🌀' },
};

const HAND_BONES = [
  ['wrist','thumb_cmc'],['thumb_cmc','thumb_mcp'],['thumb_mcp','thumb_ip'],['thumb_ip','thumb_tip'],
  ['wrist','index_finger_mcp'],['index_finger_mcp','index_finger_pip'],['index_finger_pip','index_finger_dip'],['index_finger_dip','index_finger_tip'],
  ['wrist','middle_finger_mcp'],['middle_finger_mcp','middle_finger_pip'],['middle_finger_pip','middle_finger_dip'],['middle_finger_dip','middle_finger_tip'],
  ['wrist','ring_finger_mcp'],['ring_finger_mcp','ring_finger_pip'],['ring_finger_pip','ring_finger_dip'],['ring_finger_dip','ring_finger_tip'],
  ['wrist','pinky_finger_mcp'],['pinky_finger_mcp','pinky_finger_pip'],['pinky_finger_pip','pinky_finger_dip'],['pinky_finger_dip','pinky_finger_tip'],
  ['index_finger_mcp','middle_finger_mcp'],['middle_finger_mcp','ring_finger_mcp'],['ring_finger_mcp','pinky_finger_mcp'],
];
const BODY_BONES = [
  ['left_shoulder','right_shoulder'],
  ['left_shoulder','left_elbow'],['left_elbow','left_wrist'],
  ['right_shoulder','right_elbow'],['right_elbow','right_wrist'],
  ['left_shoulder','left_hip'],['right_shoulder','right_hip'],
  ['left_hip','right_hip'],
  // Jambes (visibles même assis)
  ['left_hip','left_knee'],['right_hip','right_knee'],
  ['left_knee','left_ankle'],['right_knee','right_ankle'],
];

// ── État ─────────────────────────────────────────────────────
let _videoEl   = null;  // <video> natif, créé par tracking.js
let _handModel = null;
let _bodyModel = null;
let _camReady  = false;
let _overlayOn = true;

let _leftHand  = null;
let _rightHand = null;
let _bodyPose  = null;
let _rawHands  = null;

// Geste main gauche
let _leftGesture = 'none';
let _gestureMS   = 0;
const DEBOUNCE   = 500;

// Mouvement circulaire main droite
let _wristHist  = [];
const HIST_N    = 20;
let _circSmooth = 0;
const HAND_PATH_MAX = 15;
const HAND_PATH_MIN = 10;
let _handPath = new Array(HAND_PATH_MAX);
let _handPathHead = 0;
let _handPathSize = 0;

// Accroupissement
let _crouchBase  = null;
let _isCrouching = false;

// Geste Doctor Strange (mains croisées puis écartées)
let _handsWereCrossed = false;
let _strangeCooldownMS = 0;
let _vNearMouth        = false;  // V-жест у рта (сигарета)
const STRANGE_COOLDOWN = 3000; // 3 sec entre deux activations

let _onGestureChange = null;

// ── Getters publics ──────────────────────────────────────────
function isTrackingActive()  { return _camReady; }
function getLeftGesture()    { return _leftGesture; }
function getRightMotion()    { return _circSmooth; }
function getIsCrouching()    { return _isCrouching; }
function getLeftHandData()   { return _leftHand; }
function getRightHandData()  { return _rightHand; }
function getBodyPoseData()   { return _bodyPose; }
function getIsVNearMouth()   { return _vNearMouth; }
function toggleOverlay()     { _overlayOn = !_overlayOn; }

// Distance normalisée entre les deux poignets (0 = même endroit, 1 = largeur canvas)
// NOTE: après l'optimisation _onHands, les coords sont en espace canvas (0–W), pas 0–320
function getHandsProximity() {
  if (!_leftHand || !_rightHand) return 1;
  const lw = _kp(_leftHand, 'wrist'), rw = _kp(_rightHand, 'wrist');
  if (!lw || !rw) return 1;
  const cW = typeof W !== 'undefined' ? W : 1280;
  return Math.sqrt((lw.x-rw.x)**2 + (lw.y-rw.y)**2) / cW;
}

// ── Helpers purs JS ──────────────────────────────────────────
function _kp(hand, name) {
  if (!hand?.keypoints) return null;
  return hand.keypoints.find(k => k.name === name) || null;
}
function _bkp(pose, name) {
  if (!pose?.keypoints) return null;
  return pose.keypoints.find(k => k.name === name) || null;
}
function _ext(hand, mcpN, tipN) {
  const m = _kp(hand, mcpN), t = _kp(hand, tipN);
  return m && t ? t.y < m.y - 14 : false;
}
function checkIsFist(hand) {
  const keypoints = hand?.keypoints;
  if (!keypoints || keypoints.length < 21) return false;

  const wrist = keypoints[0];
  if (!wrist) return false;

  // Индексы MCP/кончиков: указательный, средний, безымянный, мизинец.
  // Используем размер ладони как опорную шкалу, чтобы детекция не зависела
  // слишком сильно от расстояния до камеры.
  const mcpIndices = [5, 9, 13, 17];
  const tipIndices = [8, 12, 16, 20];

  let palmSpan = 0;
  let curledCount = 0;
  let tipDistanceSum = 0;

  for (let i = 0; i < tipIndices.length; i++) {
    const mcp = keypoints[mcpIndices[i]];
    const tip = keypoints[tipIndices[i]];
    if (!mcp || !tip) return false;

    palmSpan += Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
    tipDistanceSum += Math.hypot(tip.x - wrist.x, tip.y - wrist.y);

    // Пальцы считаются согнутыми, если кончик не вытянут заметно выше MCP.
    if (tip.y >= mcp.y - 8) curledCount++;
  }

  palmSpan /= tipIndices.length;
  const avgTipDistance = tipDistanceSum / tipIndices.length;

  // Более чувствительный порог: если большинство пальцев согнуты,
  // допускаем чуть большую дистанцию до запястья.
  return (curledCount >= 3 && avgTipDistance < palmSpan * 1.7) ||
         (curledCount >= 2 && avgTipDistance < palmSpan * 1.35);
}
function _lerpJS(a, b, t) { return a + (b-a)*t; }
function _clamp(v,lo,hi)  { return Math.max(lo, Math.min(hi, v)); }

// ── Init principal ────────────────────────────────────────────
// NOTE: sketch.js NE DOIT PAS appeler createCapture()
// tracking.js crée son propre <video> via getUserMedia
function initTracking(onGestureChange) {
  _onGestureChange = onGestureChange;
  _createVideoAndInit();
}

async function _createVideoAndInit() {
  // Créer l'élément vidéo natif (invisible)
  _videoEl = document.createElement('video');
  Object.assign(_videoEl, { width:320, height:240, autoplay:true, muted:true, playsInline:true });
  _videoEl.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;';
  document.body.appendChild(_videoEl);

  try {
    // MoveNet Lightning exige min ~192×192 — on demande 320×240 pour la fiabilité
    const constraints = {
      video: {
        width:  { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 30 }  // 30fps pour body + hands, réduit la charge GPU
      },
      audio: false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    _videoEl.srcObject = stream;

    // Attendre que la vidéo soit prête
    await new Promise((resolve, reject) => {
      _videoEl.onloadedmetadata = () => _videoEl.play().then(resolve).catch(reject);
      setTimeout(() => reject(new Error('Video timeout')), 8000);
    });

    await _initML5Models();

  } catch(e) {
    console.error('[Tracking] Erreur caméra :', e.message);
    _setStatus('❌ ' + e.message);
  }
}

async function _initML5Models() {
  try {
    _setStatus('Загрузка нейросетей...');
    
    // 1. Загружаем модели (облегченная конфигурация HandPose)
    const handPoseOptions = {
      maxHands: 2,           // ← 2 mains : nécessaire pour le geste Doctor Strange
      flipped: true,
      runtime: 'mediapipe',
      modelType: 'lite'
    };
    try {
      _handModel = await ml5.handPose(handPoseOptions);
    } catch (err) {
      // Fallback для версий ml5, где modelType еще не поддерживается
      const { modelType, ...fallbackOptions } = handPoseOptions;
      console.warn('[Tracking] modelType=lite недоступен, запуск без modelType');
      _handModel = await ml5.handPose(fallbackOptions);
    }
    _bodyModel = await ml5.bodyPose('MoveNet');

    // 2. Ждем не только готовности видео, но и появления размеров кадра
    while (_videoEl.readyState < 2 || _videoEl.videoWidth === 0) {
      await new Promise(r => setTimeout(r, 250));
    }

    // 3. "Прогрев" и ожидание для Chrome
    // На Windows Chrome иногда нужно до 4-5 секунд, чтобы подцепить WebGL
    _setStatus('Настройка GPU...');
    await new Promise(r => setTimeout(r, 4000)); 

    // Функция для безопасного старта (avec fallback polling si detectStart absent)
    const safeStart = async (model, video, callback, name) => {
      if (!model) { console.warn(`[Tracking] ${name} model est null, ignoré`); return; }
      // Essai 1 : detectStart (mode push, le plus efficace)
      if (typeof model.detectStart === 'function') {
        try {
          await model.detectStart(video, callback);
          console.log(`[Tracking] ${name} detectStart OK`);
          return;
        } catch (err) {
          console.warn(`[Tracking] ${name} detectStart échoué :`, err.message);
        }
      }
      // Fallback : polling manuel si detectStart absent ou raté
      console.warn(`[Tracking] ${name} → fallback polling`);
      if (name === 'BodyPose')  _startBodyPoll(model, video, callback);
      if (name === 'HandPose')  _startHandPoll(model, video, callback);
    };

    // Вызываем внутри _initML5Models после загрузки моделей и видео
    await safeStart(_handModel, _videoEl, _onHands, "HandPose");
    await safeStart(_bodyModel, _videoEl, _onBody,  "BodyPose");

    _camReady = true;
    _setStatus('✅ active (Chrome OK)');
    console.log('[Tracking] ✅ Все системы запущены и прогреты');

  } catch (e) {
    console.error('[Tracking] Критическая ошибка ml5:', e.message);
    _setStatus('❌ Ошибка: ' + e.message);
  }
}

// Polling fallback si detectStart n'existe pas
async function _pollDetection() {
  while (_camReady !== false) {
    if (_videoEl.readyState >= 2) {
      try {
        if (_handModel?.detect) {
          const h = await _handModel.detect(_videoEl);
          _onHands(h);
        }
      } catch(e) {}
    }
    await new Promise(r => setTimeout(r, 33)); // ~30fps
  }
}

// Polling dédié pour HandPose (fallback)
let _handPollActive = false;
async function _startHandPoll(model, video, callback) {
  if (_handPollActive) return;
  _handPollActive = true;
  console.log('[Tracking] HandPose polling démarré');
  while (true) {
    if (video.readyState >= 2) {
      try {
        const r = await model.detect(video);
        if (r) callback(r);
      } catch(e) {}
    }
    await new Promise(r => setTimeout(r, 33));
  }
}

// Polling dédié pour BodyPose (fallback)
let _bodyPollActive = false;
async function _startBodyPoll(model, video, callback) {
  if (_bodyPollActive) return;
  _bodyPollActive = true;
  console.log('[Tracking] BodyPose polling démarré');
  while (true) {
    if (video.readyState >= 2) {
      try {
        const r = await model.detect(video);
        if (r) callback(r);
      } catch(e) {}
    }
    await new Promise(r => setTimeout(r, 50)); // 20fps suffisant pour le corps
  }
}

function _setStatus(txt) {
  const el = document.getElementById('cam-status');
  if (el) el.textContent = txt;
}

// Calibrer posture debout
function calibrateCrouch() {
  if (!_bodyPose) { console.warn('[Tracking] Pas de pose pour calibrer'); return; }
  const ls = _bkp(_bodyPose,'left_shoulder'), rs = _bkp(_bodyPose,'right_shoulder');
  if (!ls || !rs) return;
  _crouchBase = (ls.y + rs.y) / 2;
  console.log('[Tracking] Baseline calibrée :', _crouchBase);
}

// ── Callbacks modèles ─────────────────────────────────────────
function _onHands(results) {
  _rawHands = results;
  _leftHand = null; _rightHand = null;
  if (!results?.length) return;

  // Приводим координаты детекции к размерам p5-холста + зеркалим по X.
  // Модель может работать в низком разрешении (160x120 / 320x240),
  // поэтому масштабируем точки обратно в экранные координаты.
  const videoW = _videoEl?.videoWidth || 320;
  const videoH = _videoEl?.videoHeight || 240;
  const sx = (typeof width === 'number' && videoW) ? width / videoW : 1;
  const sy = (typeof height === 'number' && videoH) ? height / videoH : 1;

  for (const h of results) {
    if (Array.isArray(h.keypoints)) {
      for (const kp of h.keypoints) {
        kp.x *= sx;
        kp.y *= sy;
        // ❌ PAS de flip manuel : flipped:true dans handPoseOptions gère déjà
        // le miroir côté ml5/MediaPipe. Un double-flip inverserait les mains.
      }
    }
  }

  // Avec flipped:true, MediaPipe retourne la latéralité anatomique :
  // 'Right' = main droite physique de l'utilisateur → contrôle du mouvement
  // 'Left'  = main gauche physique                  → contrôle des gestes
  for (const h of results) {
    if      (h.handedness === 'Left')  _leftHand  = h;
    else if (h.handedness === 'Right') _rightHand = h;
  }

  if (_leftHand)  _detectGesture(_leftHand);
  if (_rightHand) _updateCircular(_rightHand);

  // Непрерывный анализ движения указательного пальца первой руки
  const finger = results[0].index_finger_tip || results[0].keypoints?.[8];
  if (finger) {
    _pushHandPathPoint(finger.x, finger.y);
    _analyzeMovementContinuous();
  }

  _checkStrangeGesture();
  _checkVNearMouth();
  _updateGesturePanel();
}

function _onBody(results) {
  _bodyPose = results?.[0] || null;
  if (_bodyPose) _detectCrouch(_bodyPose);
}

// ── Détection geste main gauche ───────────────────────────────
function _detectGesture(h) {
  const isFist = checkIsFist(h);
  const thumb  = _ext(h,'thumb_mcp',         'thumb_tip');
  const index  = _ext(h,'index_finger_mcp',  'index_finger_tip');
  const middle = _ext(h,'middle_finger_mcp', 'middle_finger_tip');
  const ring   = _ext(h,'ring_finger_mcp',   'ring_finger_tip');
  const pinky  = _ext(h,'pinky_finger_mcp',  'pinky_finger_tip');
  const n      = [thumb,index,middle,ring,pinky].filter(Boolean).length;

  const tt = _kp(h,'thumb_tip'), it = _kp(h,'index_finger_tip');
  const isPinch = tt && it && (tt.x-it.x)**2+(tt.y-it.y)**2 < 900;

  let g = 'none';
  if      (isPinch && middle && ring && pinky) g = 'ok_sign';  // 👌 OK sign : pouce+index pincés + autres doigts étendus
  else if (isPinch && n<=2)               g = 'pinch';
  else if (isFist)                         g = 'closed_fist';
  else if (n>=5)                           g = 'spread_fingers';
  else if (index&&middle&&!ring&&!pinky)   g = 'victory_v';
  else if (index&&!middle&&!ring&&!pinky)  g = 'pointing_up';
  else if (thumb&&!index&&!middle&&!ring&&!pinky) g = 'thumb_up';
  else if (n>=4)                           g = 'open_palm';

  const now = Date.now();
  if (g !== _leftGesture && now - _gestureMS > DEBOUNCE) {
    _leftGesture = g;
    _gestureMS   = now;
    if (_onGestureChange) _onGestureChange(g);
  }
}

// ── Mouvement circulaire main droite ──────────────────────────
function _updateCircular(h) {
  const w = _kp(h, 'wrist');
  if (!w) return;
  _wristHist.push({ x: w.x, y: w.y }); // уже в espace canvas после _onHands
  if (_wristHist.length > HIST_N) _wristHist.shift();
  _analyzeMovementContinous();
}

function _pushHandPathPoint(x, y) {
  const writeIdx = (_handPathHead + _handPathSize) % HAND_PATH_MAX;
  _handPath[writeIdx] = { x, y };

  if (_handPathSize < HAND_PATH_MAX) {
    _handPathSize++;
    return;
  }

  // Buffer plein: сдвигаем логическое начало, не трогая сам массив.
  _handPathHead = (_handPathHead + 1) % HAND_PATH_MAX;
}

function _handPathAt(idx) {
  if (idx < 0 || idx >= _handPathSize) return null;
  return _handPath[(_handPathHead + idx) % HAND_PATH_MAX];
}

// Analyse continue du mouvement (fenêtre glissante без сброса массива)
function _analyzeMovementContinuous() {
  if (_handPathSize < HAND_PATH_MIN) return;

  const first = _handPathAt(0);
  const last = _handPathAt(_handPathSize - 1);
  if (!first || !last) return;
  const dx = last.x - first.x;
  const dy = last.y - first.y;

  // Если есть движение и по X, и по Y, обновляем направление сразу.
  // Для управления в sketch.js используется getRightMotion() -> _circSmooth.
  const movedX = Math.abs(dx) > 14;
  const movedY = Math.abs(dy) > 14;
  if (!movedX || !movedY) {
    _circSmooth = _lerpJS(_circSmooth, 0, 0.2);
    return;
  }

  const raw = _clamp(dx / 80, -1, 1);
  _circSmooth = _lerpJS(_circSmooth, raw, 0.55);
}

// Backward compatibility for old call-sites with typo
function _analyzeMovementContinous() {
  _analyzeMovementContinuous();
}

// ── Geste Doctor Strange : croiser → écarter ─────────────────
function _checkStrangeGesture() {
  if (!_leftHand || !_rightHand) { _handsWereCrossed = false; return; }
  const lw = _kp(_leftHand,'wrist'), rw = _kp(_rightHand,'wrist');
  if (!lw || !rw) return;

  const dist = Math.sqrt((lw.x-rw.x)**2+(lw.y-rw.y)**2);
  const now  = Date.now();

  // Coords en espace canvas après _onHands; seuils proportionnels (320 → W)
  const cW          = typeof W !== 'undefined' ? W : 1280;
  const closeThresh = cW * (90  / 320);   // ~360 px sur 1280
  const farThresh   = cW * (150 / 320);   // ~600 px sur 1280

  // Phase 1 : mains proches
  if (dist < closeThresh) {
    _handsWereCrossed = true;
  }

  // Phase 2 : mains s'écartent après s'être croisées
  if (_handsWereCrossed && dist > farThresh && now - _strangeCooldownMS > STRANGE_COOLDOWN) {
    _handsWereCrossed    = false;
    _strangeCooldownMS   = now;
    if (_onGestureChange) _onGestureChange('_strange_pull');
    console.log('[Tracking] 🌀 Geste Strange détecté !');
  }
}

// ── Geste V près de la bouche (cigarette → pont) ─────────────
function _checkVNearMouth() {
  if (_leftGesture !== 'victory_v') { _vNearMouth = false; return; }
  if (!_leftHand)                    { _vNearMouth = false; return; }

  const it = _kp(_leftHand, 'index_finger_tip');
  const mt = _kp(_leftHand, 'middle_finger_tip');
  if (!it || !mt) { _vNearMouth = false; return; }

  // Hand coords : déjà en espace canvas après _onHands scaling
  const handX = (it.x + mt.x) / 2;
  const handY = (it.y + mt.y) / 2;
  const cW    = typeof width  === 'number' ? width  : 1280;
  const cH    = typeof height === 'number' ? height : 800;

  if (_bodyPose) {
    // BodyPose : coords brutes dans l'espace vidéo réel → convertir via _c2c
    const nose = _bodyPose.keypoints?.find(k => k.name === 'nose');
    if (nose && (nose.score || 0) >= 0.15) {
      const nc = _c2c(nose.x, nose.y);
      const noseCX  = nc.x;
      const noseCY  = nc.y;
      const mouthCY = noseCY + 55;               // bouche ≈ 55px sous le nez
      const dist = Math.sqrt((handX - noseCX) ** 2 + (handY - mouthCY) ** 2);
      _vNearMouth = dist < 170;
      return;
    }
  }
  // Fallback si BodyPose indisponible : main dans la zone faciale (haut 38%, centre)
  _vNearMouth = handY < cH * 0.38 && handX > cW * 0.18 && handX < cW * 0.82;
}

// ── Détection accroupissement ─────────────────────────────────
function _detectCrouch(pose) {
  const ls = _bkp(pose,'left_shoulder'), rs = _bkp(pose,'right_shoulder');
  if (!ls || !rs || (ls.score||0)<0.15 || (rs.score||0)<0.15) return;
  // Normaliser Y par rapport à la hauteur RÉELLE de la vidéo
  const vh = _videoEl?.videoHeight || 240;
  const avgY = (ls.y + rs.y) / 2 / vh;
  if (!_crouchBase) { if (avgY < 0.55) _crouchBase = avgY; return; }
  const prev = _isCrouching;
  _isCrouching = (avgY - _crouchBase) > 0.085;
  if (_isCrouching !== prev && _onGestureChange) {
    _onGestureChange(_isCrouching ? '_crouch_start' : '_crouch_end');
  }
  const el = document.getElementById('g-crouch');
  if (el) el.textContent = _isCrouching ? 'Posture : ⬇ ACCROUPI' : 'Posture : debout';
}

// ── Mise à jour HTML ──────────────────────────────────────────
function _updateGesturePanel() {
  const info = GESTURE_DICT[_leftGesture];
  const ne = document.getElementById('g-name'),  ae = document.getElementById('g-action');
  const me = document.getElementById('g-motion');
  if (ne) ne.textContent = info ? info.icon+' '+info.fr+' · '+info.en : '— aucun —';
  if (ae) ae.textContent = info ? '→ '+info.action : 'en attente…';
  const m = _circSmooth;
  if (me) me.textContent = Math.abs(m)>0.2
    ? 'Cercle : '+(m>0?'→ droite':'← gauche')+' ('+Math.round(Math.abs(m)*100)+'%)'
    : 'Mouvement circulaire : —';
}

// ── Overlay tracking ──────────────────────────────────────────
function drawTrackingOverlay() {
  if (!_overlayOn || !_camReady || !_videoEl) return;

  // Flux caméra semi-transparent (drawingContext = canvas 2D brut de p5)
  drawingContext.save();
  drawingContext.globalAlpha = 0.12;
  drawingContext.translate(W, 0); drawingContext.scale(-1, 1); // miroir
  try { drawingContext.drawImage(_videoEl, 0, 0, W, H); } catch(e){}
  drawingContext.restore();

  if (_leftHand)  _drawHandSkeleton(_leftHand,  color(255, 90,  60));
  if (_rightHand) _drawHandSkeleton(_rightHand, color(60,  190, 255));
  if (_bodyPose)  _drawBodySkeleton(_bodyPose);
  if (_rightHand && _wristHist.length > 6) _drawCircleTrail();

  // ── Debug body tracking status ───────────────────────────────
  push();
  noStroke(); textAlign(LEFT, BOTTOM); textSize(14);
  if (_bodyPose) {
    const ls = _bkp(_bodyPose, 'left_shoulder');
    const sc = ls ? (ls.score||0).toFixed(2) : '?';
    fill(_isCrouching ? color(255,80,80,220) : color(80,255,120,220));
    text('BODY ✓  score:' + sc + (_isCrouching ? '  ⬇ ACCROUPI' : '  debout'), 12, H - 8);
  } else {
    fill(255, 60, 60, 220);
    text('BODY ✗  (aucune détection)', 12, H - 8);
  }
  // Résolution vidéo effective
  if (_videoEl) {
    fill(180, 180, 180, 150);
    textSize(11);
    text('cam: ' + (_videoEl.videoWidth||'?') + '×' + (_videoEl.videoHeight||'?'), 12, H - 26);
  }
  pop();

  // Indicateur Strange : halo vert quand mains proches
  if (_leftHand && _rightHand) {
    const prox = 1 - getHandsProximity() * 4; // 0-1 quand très proches
    if (prox > 0) {
      const lw = _kp(_leftHand,'wrist'), rw = _kp(_rightHand,'wrist');
      if (lw && rw) {
        const ca = { x: lw.x, y: lw.y }, cb = { x: rw.x, y: rw.y }; // déjà en espace canvas
        noFill(); stroke(0, 255, 150, prox*180); strokeWeight(3);
        line(ca.x, ca.y, cb.x, cb.y);
        fill(0,255,150, prox*120); noStroke();
        ellipse((ca.x+cb.x)/2, (ca.y+cb.y)/2, 20, 20);
      }
    }
  }
}

// Convertir coords caméra → canvas (avec flip X)
// Utilise les dimensions RÉELLES de la vidéo (pas hardcodé 320×240)
function _c2c(kpX, kpY) {
  const vw = _videoEl?.videoWidth  || 320;
  const vh = _videoEl?.videoHeight || 240;
  return { x: (1 - kpX / vw) * W, y: (kpY / vh) * H };
}

function _drawHandSkeleton(hand, col) {
  // IMPORTANT: _onHands a déjà scalé + miroir les keypoints en espace canvas.
  // Ne PAS utiliser _c2c() ici — ça re-convertirait des coords déjà converties.
  stroke(col); strokeWeight(2.5); noFill();
  for (const [a,b] of HAND_BONES) {
    const ka=_kp(hand,a), kb=_kp(hand,b);
    if (!ka||!kb) continue;
    line(ka.x, ka.y, kb.x, kb.y);
  }
  noStroke();
  for (const kp of hand.keypoints) {
    fill(col);
    ellipse(kp.x, kp.y, kp.name.endsWith('tip') ? 9 : 5);
  }
  const wr=_kp(hand,'wrist');
  if (wr) {
    fill(255,200); noStroke(); textAlign(CENTER,BOTTOM); textSize(10);
    text(hand.handedness, wr.x, wr.y - 10);
  }
}

function _drawBodySkeleton(pose) {
  const SCORE_MIN = 0.15;  // threshold abaissé pour plus de détections

  // ── PASS 1 : halo large (glow) ────────────────────────────────
  const glowCol = _isCrouching ? color(255,60,60,55) : color(255,220,0,55);
  stroke(glowCol); strokeWeight(10); noFill();
  for (const [a,b] of BODY_BONES) {
    const ka=pose.keypoints.find(k=>k.name===a), kb=pose.keypoints.find(k=>k.name===b);
    if (!ka||!kb||(ka.score||0)<SCORE_MIN||(kb.score||0)<SCORE_MIN) continue;
    const ca=_c2c(ka.x,ka.y), cb=_c2c(kb.x,kb.y);
    line(ca.x,ca.y,cb.x,cb.y);
  }

  // ── PASS 2 : os nets ─────────────────────────────────────────
  const lineCol = _isCrouching ? color(255,80,80,230) : color(255,235,60,230);
  stroke(lineCol); strokeWeight(3.5); noFill();
  for (const [a,b] of BODY_BONES) {
    const ka=pose.keypoints.find(k=>k.name===a), kb=pose.keypoints.find(k=>k.name===b);
    if (!ka||!kb||(ka.score||0)<SCORE_MIN||(kb.score||0)<SCORE_MIN) continue;
    const ca=_c2c(ka.x,ka.y), cb=_c2c(kb.x,kb.y);
    line(ca.x,ca.y,cb.x,cb.y);
  }

  // ── Points clés : épaules, hanches, genoux, chevilles ────────
  const KEY_JOINTS = [
    'left_shoulder','right_shoulder',
    'left_hip','right_hip',
    'left_knee','right_knee',
    'left_ankle','right_ankle'
  ];
  for (const n of KEY_JOINTS) {
    const kp=pose.keypoints.find(k=>k.name===n);
    if (!kp||(kp.score||0)<SCORE_MIN) continue;
    const c=_c2c(kp.x,kp.y);
    const isLeg = n.includes('hip')||n.includes('knee')||n.includes('ankle');
    const sz = isLeg ? 11 : 15;
    noStroke();
    // halo
    fill(_isCrouching ? color(255,60,60,70) : (isLeg ? color(180,200,255,70) : color(255,220,0,70)));
    ellipse(c.x,c.y, sz*2.2, sz*2.2);
    // solide
    fill(_isCrouching ? color(255,80,80) : (isLeg ? color(200,215,255) : color(255,235,60)));
    ellipse(c.x,c.y, sz, sz);
  }
}

// ── Position poignet main droite (espace canvas) ─────────────
function getRightWristPos() {
  if (!_rightHand) return null;
  const w = _kp(_rightHand, 'wrist');
  return w ? { x: w.x, y: w.y } : null;
}

function _drawCircleTrail() {
  // _wristHist contient maintenant des coords canvas directes (pas normalisées)
  noFill(); strokeWeight(2);
  for (let i=1;i<_wristHist.length;i++) {
    const t=i/_wristHist.length;
    stroke(255,255,60,t*180);
    line(_wristHist[i-1].x, _wristHist[i-1].y,
         _wristHist[i].x,   _wristHist[i].y);
  }
  const m=_circSmooth;
  if (Math.abs(m)>0.2) {
    noStroke(); fill(255,255,60,200);
    textAlign(CENTER,TOP); textSize(18);
    text(m>0?'↻ →':'↺ ←', W*0.72, 8);
  }
}

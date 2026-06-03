// ═══════════════════════════════════════════════════════════════════
//  mechanics.js — Mécaniques additionnelles · Time Jump  v2
//
//  ① HelldiversInteraction  — mini-jeu flèches (dial circulaire souris)
//  ② TelekinesisInteraction — télékinésie pinch/souris → boîtes DATA
//  ③ Enemies                — patrouilles AABB (collision → reset)
//  ④ Terminals              — zones auto-déclenchées par proximité
//  ⑤ ExitDoor               — porte verrou jusqu'à complétion de niveau
//
//  API sketch.js :
//    setup()      → initMechanics(levelIdx)
//    draw()       → updateEnemies() / updateTerminals() / updateExitDoor()
//                   drawEnemies() / drawTerminals() / drawExitDoor()  [world]
//                   HelldiversInteraction.draw()                       [canvas]
//                   TelekinesisInteraction.drawInteractionLayer()       [canvas]
//                   drawExitDoorHint()                                 [canvas]
//    keyPressed() → HelldiversInteraction.onKeyPressed(keyCode)
//    mouse*()     → TelekinesisInteraction.*
// ═══════════════════════════════════════════════════════════════════


// ── ① HelldiversInteraction ──────────────────────────────────────
// Dial circulaire centré à l'écran.
//  GUIDE  : affiche instructions + dial, maintenir curseur au centre 1 s
//  PLAYING: séquence de flèches, maintenir curseur dans une direction ~0.5 s
//  SUCCESS/FAIL : flash court puis retour à inactive
const HelldiversInteraction = (() => {
  // ── Constantes ────────────────────────────────────────────────
  const HOLD_TOTAL      = 60;   // frames pour activer (1 s @ 60 fps)
  const DIAL_R          = 150;  // rayon extérieur du dial (px canvas)
  const CENTER_R        = 48;   // rayon zone centrale
  const DIR_HOLD_NEEDED = 28;   // frames pour valider une direction
  const INPUT_COOLDOWN   = 45;   // frames de pause après chaque flèche
  const FLASH_DUR       = 75;   // frames du flash résultat
  const DIAL_POS_X_RATIO = 0.25;
  const DIAL_POS_Y_RATIO = 0.5;

  // ── État interne ──────────────────────────────────────────────
  let _state            = 'inactive'; // 'inactive'|'guide'|'playing'|'success'|'fail'
  let _keys             = 5;
  let _timeSec          = 6;
  let _onSuccess        = null;
  let _onFail           = null;

  // guide
  let _centerHoldFrames = 0;

  // playing
  let _sequence      = [];
  let _inputIndex    = 0;
  let _timer         = 0;
  let _maxTimer      = 0;
  let _curDir        = null;
  let _dirHoldFrames = 0;
  let _inputCooldown = 0;

  // flash
  let _flashTimer = 0;
  let _flashOk    = false;

  // ── API publique ──────────────────────────────────────────────
  function init() {
    _state            = 'inactive';
    _centerHoldFrames = 0;
    _dirHoldFrames    = 0;
    _curDir           = null;
    _sequence         = [];
    _inputIndex       = 0;
    _timer            = 0;
    _flashTimer       = 0;
    _inputCooldown    = 0;
    _onSuccess        = null;
    _onFail           = null;
  }

  // Appelé par updateTerminals() dès que le joueur entre en portée
  function showGuide(keys, timeSec, successCb, failCb) {
    if (_state === 'playing' || _state === 'guide') return; // ne pas interrompre
    _keys      = keys    || 5;
    _timeSec   = timeSec || 6;
    _onSuccess = successCb || null;
    _onFail    = failCb    || null;
    _state     = 'guide';
    _centerHoldFrames = 0;
    if (typeof playAudioSfx === 'function') playAudioSfx('sfx_terminal_start');
  }

  // Appelé par updateTerminals() quand le joueur quitte la portée
  function dismiss() {
    if (_state === 'guide') {
      _state            = 'inactive';
      _centerHoldFrames = 0;
    }
  }

  function getState() { return _state; }
  function isActive() { return _state !== 'inactive'; }

  // ── Lancement de la partie ────────────────────────────────────
  function _startPlaying() {
    _maxTimer      = Math.max(1, Math.floor(_timeSec * 60));
    _timer         = _maxTimer;
    _sequence      = _generateSequence(_keys);
    _inputIndex    = 0;
    _dirHoldFrames = 0;
    _curDir        = null;
    _inputCooldown = 0;
    _state         = 'playing';
  }

  function _startInputCooldown() {
    _inputCooldown = INPUT_COOLDOWN;
    _curDir = null;
    _dirHoldFrames = 0;
  }

  function _cooldownActive() {
    return _inputCooldown > 0;
  }

  function _generateSequence(length) {
    const dirs = [UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW];
    const seq  = [];
    for (let i = 0; i < length; i++) {
      seq.push(dirs[Math.floor(Math.random() * dirs.length)]);
    }
    return seq;
  }

  // ── Helpers curseur (main OU souris) ─────────────────────────
  // Retourne {x, y} du curseur actif : main gauche prioritaire, souris en fallback.
  function _getPointerCursor() {
    const left = typeof getLeftHandData === 'function' ? getLeftHandData() : null;
    const right = typeof getRightHandData === 'function' ? getRightHandData() : null;

    // Prefer explicit left hand; fallback to right only if left is unavailable.
    let h = left;
    if ((!h || !h.keypoints || h.keypoints.length < 9) && right?.keypoints?.length >= 9) {
      h = right;
    }

    if (h?.keypoints && h.keypoints.length >= 9) {
      const it = h.keypoints[8];  // index tip
      if (it) return { x: it.x, y: it.y };
    }

    if (typeof mouseX === 'number' && typeof mouseY === 'number') {
      return { x: mouseX, y: mouseY };
    }

    return null;
  }

  function _getDialCenter() {
    const margin = DIAL_R + 34;
    const cx = constrain(width * DIAL_POS_X_RATIO, margin, width - margin);
    const cy = constrain(height * DIAL_POS_Y_RATIO, margin, height - margin);
    return { cx, cy };
  }

  function _getMouseDir(cx, cy) {
    const cur = _getPointerCursor();
    if (!cur) return null;
    const px = cur.x;
    const py = cur.y;
    const dx = px - cx, dy = py - cy;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d <= CENTER_R || d > DIAL_R) return null;
    const a = Math.atan2(dy, dx); // -PI … PI
    const q = Math.PI / 4;
    if (a >= -q   && a <  q)   return RIGHT_ARROW;
    if (a >=  q   && a <  3*q) return DOWN_ARROW;
    if (a >= -3*q && a < -q)   return UP_ARROW;
    return LEFT_ARROW;
  }

  function _getMouseInCenter(cx, cy) {
    const cur = _getPointerCursor();
    if (!cur) return false;
    const px = cur.x;
    const py = cur.y;
    const dx = px - cx, dy = py - cy;
    return Math.sqrt(dx * dx + dy * dy) <= CENTER_R;
  }

  // ── Dessin principal ──────────────────────────────────────────
  function draw() {
    if (_state === 'inactive') return;
    push();
    textFont('Courier New');
    const { cx, cy } = _getDialCenter();
    if      (_state === 'guide')   _drawGuide(cx, cy);
    else if (_state === 'playing') _drawPlaying(cx, cy);
    else                           _drawFlash(cx, cy, _state === 'success');
    pop();
  }

  // ── Dial partagé (guide + playing) ───────────────────────────
  function _drawDial(cx, cy, activeDir, holdPct, centerHoldPct) {
    // Fond sombre circulaire
    noStroke();
    fill(5, 12, 38, 218);
    circle(cx, cy, (DIAL_R + 24) * 2);

    // Anneau extérieur
    noFill();
    stroke(0, 195, 255, 105);
    strokeWeight(2);
    circle(cx, cy, DIAL_R * 2);

    // Séparations de secteur (diagonales)
    stroke(0, 195, 255, 38);
    strokeWeight(1);
    const s = DIAL_R * 0.707;
    line(cx - s, cy - s, cx + s, cy + s);
    line(cx + s, cy - s, cx - s, cy + s);

    // Flèches directionnelles
    const arrows = [
      { dir: UP_ARROW,    ax: cx,             ay: cy - DIAL_R + 26, sym: '↑' },
      { dir: DOWN_ARROW,  ax: cx,             ay: cy + DIAL_R - 26, sym: '↓' },
      { dir: LEFT_ARROW,  ax: cx - DIAL_R + 26, ay: cy,             sym: '←' },
      { dir: RIGHT_ARROW, ax: cx + DIAL_R - 26, ay: cy,             sym: '→' },
    ];
      for (const ai of arrows) {
        textSize(16);
      const isAct = (ai.dir === activeDir);
      const hp    = isAct ? (holdPct || 0) : 0;
      if (isAct) {
        noStroke();
        fill(0, 160, 255, 55 + 70 * hp);
        circle(ai.ax, ai.ay, 46);
        // Arc de progression direction
        if (hp > 0 && hp < 1) {
          noFill();
          stroke(255, 220, 0, 200);
          strokeWeight(3);
          arc(ai.ax, ai.ay, 48, 48,
              -Math.PI / 2,
              -Math.PI / 2 + hp * 2 * Math.PI);
        }
      }
      noStroke();
      fill(isAct ? color(255, 228, 0, 235) : color(0, 200, 255, 168));
      textAlign(CENTER, CENTER);
        textSize(16);
      text(ai.sym, ai.ax, ai.ay);
    }

    // Zone centrale
    const inCtr = _getMouseInCenter(cx, cy);
    fill(inCtr ? color(0, 235, 255, 108) : color(0, 68, 112, 85));
    stroke(inCtr ? color(0, 255, 255, 210) : color(0, 140, 200, 105));
    strokeWeight(2);
    circle(cx, cy, CENTER_R * 2);

    // Arc de progression "maintien centre" (guide uniquement)
    if (centerHoldPct > 0) {
      noFill();
      stroke(0, 255, 180, 215);
      strokeWeight(4);
      arc(cx, cy, CENTER_R * 2 + 15, CENTER_R * 2 + 15,
          -Math.PI / 2,
          -Math.PI / 2 + centerHoldPct * 2 * Math.PI);
    }

    // Croix centrale
    stroke(0, 195, 255, inCtr ? 225 : 100);
    strokeWeight(2);
    line(cx - 10, cy, cx + 10, cy);
    line(cx, cy - 10, cx, cy + 10);
  }

  // ── État GUIDE ────────────────────────────────────────────────
  function _drawGuide(cx, cy) {
    const panW = 520, panH = 176;
    const panX = cx - panW / 2, panY = cy - DIAL_R - panH - 22;
    fill(4, 9, 30, 228);
    stroke(0, 190, 255, 68);
    strokeWeight(1);
    rect(panX, panY, panW, panH, 8);

    noStroke();
    fill(0, 215, 255);
    textAlign(CENTER, TOP);
    textSize(19);
    text('TERMINAL HELLDIVERS', cx, panY + 10);

    fill(168, 212, 255, 205);
    textSize(15);
    text('Sequence : ' + _keys + ' fleches  .  Temps : ' + _timeSec + ' s', cx, panY + 36);
    text('Maintenez le curseur au centre (1 s) pour demarrer', cx, panY + 58);
    text('Puis guidez le curseur dans chaque direction requise', cx, panY + 80);
    fill(108, 162, 255, 158);
    text('Echap pour quitter', cx, panY + 112);

    // Dial (mode guide, pas de direction active)
    const chp = _centerHoldFrames / HOLD_TOTAL;
    _drawDial(cx, cy, null, 0, chp);

    // Mise à jour maintien centre
    if (_getMouseInCenter(cx, cy)) {
      _centerHoldFrames++;
      if (_centerHoldFrames >= HOLD_TOTAL) _startPlaying();
    } else {
      _centerHoldFrames = Math.max(0, _centerHoldFrames - 2);
    }
  }

  // ── État PLAYING ──────────────────────────────────────────────
  function _drawPlaying(cx, cy) {
    if (_inputCooldown > 0) {
      _inputCooldown--;
    }

    _timer--;
    if (_timer <= 0) {
      _state = 'fail'; _flashTimer = FLASH_DUR; _flashOk = false;
      if (_onFail) _onFail();
      return;
    }

    const panW = 620, panH = 144;
    const panX = cx - panW / 2, panY = cy - DIAL_R - panH - 22;
    fill(4, 9, 30, 238);
    stroke(0, 175, 255, 65);
    strokeWeight(1);
    rect(panX, panY, panW, panH, 8);

    // Barre de temps
    const tp = _timer / _maxTimer;
    noStroke();
    fill(32, 10, 10, 185);
    rect(panX + 10, panY + 12, panW - 20, 16, 4);
    fill(_timer < 90 ? color(255, 52, 52) : color(0, 208, 255));
    rect(panX + 10, panY + 12, (panW - 20) * tp, 16, 4);

    // Séquence de flèches
    const symMap = {
      [UP_ARROW]: '↑', [DOWN_ARROW]: '↓',
      [LEFT_ARROW]: '←', [RIGHT_ARROW]: '→'
    };
    const slotW  = 60;
    const startS = cx - (_sequence.length * slotW) / 2;
    for (let i = 0; i < _sequence.length; i++) {
      const done = i < _inputIndex;
      const curr = i === _inputIndex;
      noStroke();
      fill(done ? color(12, 168, 12, 115)
                : (curr ? color(0, 88, 208, 115) : color(15, 15, 40, 82)));
      rect(startS + i * slotW, panY + 42, slotW - 6, 52, 5);
      fill(done ? color(65, 250, 65)
                : (curr ? color(255, 218, 0) : color(92, 122, 175)));
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(curr ? 36 : 26);
      text(symMap[_sequence[i]] || '?', startS + i * slotW + slotW / 2 - 2, panY + 66);
    }

    // Détection direction courante et maintien
    const dir = _getMouseDir(cx, cy);
    if (_cooldownActive()) {
      _curDir = null;
      _dirHoldFrames = 0;
      _drawDial(cx, cy, null, 0, 0);
      return;
    }
    if (dir !== null) {
      if (dir === _curDir) {
        _dirHoldFrames++;
        if (_dirHoldFrames >= DIR_HOLD_NEEDED) _registerInput(dir);
      } else {
        _curDir = dir; _dirHoldFrames = 0;
      }
    } else {
      _curDir = null; _dirHoldFrames = 0;
    }

    const hp = (_curDir !== null) ? Math.min(1, _dirHoldFrames / DIR_HOLD_NEEDED) : 0;
    _drawDial(cx, cy, _curDir, hp, 0);
  }

  function _registerInput(dir) {
    if (_cooldownActive()) return;

    _curDir = null; _dirHoldFrames = 0;
    if (dir === _sequence[_inputIndex]) {
      _inputIndex++;
      _startInputCooldown();
      if (_inputIndex >= _sequence.length) {
        _state = 'success'; _flashTimer = FLASH_DUR; _flashOk = true;
        if (_onSuccess) _onSuccess();
      }
    } else {
      _startInputCooldown();
      _state = 'fail'; _flashTimer = FLASH_DUR; _flashOk = false;
      if (_onFail) _onFail();
    }
  }

  // ── Flash succès / échec ──────────────────────────────────────
  function _drawFlash(cx, cy, isOk) {
    _flashTimer--;
    const pct = _flashTimer / FLASH_DUR;
    noStroke();
    fill(isOk ? color(18, 255, 98, 178 * pct) : color(255, 52, 52, 178 * pct));
    circle(cx, cy, (DIAL_R + 100) * 2);
    fill(255, 255 * pct);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(54);
    text(isOk ? '✔ CODE ACCEPTE' : '✘ CODE REFUSE', cx, cy);
    if (_flashTimer <= 0) _state = 'inactive';
  }

  // ── Entrée clavier (fallback) ─────────────────────────────────
  function onKeyPressed(kc) {
    if (_state === 'guide' && kc === ESCAPE) { dismiss(); return true; }
    if (_state === 'playing') {
      if (kc === ESCAPE) { _state = 'inactive'; return true; }
      const dirs = [UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW];
      if (dirs.includes(kc)) {
        if (_cooldownActive()) return true;
        // play click/bip for terminal directional input
        if (typeof playAudioSfx === 'function') playAudioSfx('sfx_bip');
        if (kc === _sequence[_inputIndex]) {
          _inputIndex++;
          _startInputCooldown();
          if (_inputIndex >= _sequence.length) {
            _state = 'success'; _flashTimer = FLASH_DUR; _flashOk = true;
            if (_onSuccess) _onSuccess();
          }
        } else {
          _startInputCooldown();
          _state = 'fail'; _flashTimer = FLASH_DUR; _flashOk = false;
          if (_onFail) _onFail();
        }
        return true;
      }
    }
    return false;
  }

  return { init, draw, showGuide, dismiss, getState, isActive, onKeyPressed };
})();


// ── ② TelekinesisInteraction ─────────────────────────────────────
// Source : tab_telekinesis.js (conservé + ajout getBoxStarts/getZones)
const TelekinesisInteraction = (() => {
  let hands = [];
  let smoothedKeypoints = [];

  let boxes = [];
  let grabbedBoxIndex = -1;
  let mouseDragging   = false;
  let zones = [];
  let safeZonePadding = { left: 8, right: 8, top: 64, bottom: 8 };
  let solved = false;
  let cameraTransform = { x: 0, zoom: 1 };
  const TELE_DEBUG = false;

  function createBoxState(x, y, size, id) {
    return { x, y, size,
      id: id != null ? String(id) : undefined,
      startX: x, startY: y,
      prevX: x, prevY: y,
      grabbed: false };
  }

  function preload() {}

  function init() {
    hands = []; smoothedKeypoints = [];
    boxes = []; zones = [];
    solved = false;
    grabbedBoxIndex = -1;
    mouseDragging = false;
  }

  function getCameraState() {
    if (typeof PlatformerTab !== 'undefined' &&
        typeof PlatformerTab.getCameraTransform === 'function') {
      const camera = PlatformerTab.getCameraTransform();
      return {
        x:    Number.isFinite(camera?.x)    ? camera.x    : 0,
        y:    Number.isFinite(camera?.y)    ? camera.y    : 0,
        zoom: Number.isFinite(camera?.zoom) ? camera.zoom : 1
      };
    }
    return { x: 0, y: 0, zoom: 1 };
  }

  function syncCameraState()    { cameraTransform = getCameraState(); }
  function screenToWorldX(x)   { return x / cameraTransform.zoom + cameraTransform.x; }
  function screenToWorldY(y)   { return y + cameraTransform.y; }
  function worldToScreenX(x)   { return (x - cameraTransform.x) * cameraTransform.zoom; }
  function worldToScreenY(y)   { return y - cameraTransform.y; }
  function screenToWorldPoint(p){ return { x: screenToWorldX(p.x), y: screenToWorldY(p.y) }; }

  function drawOverlay() {
    if (typeof drawTrackingOverlay === 'function') drawTrackingOverlay();
  }

  function drawInteractionLayer() {
    if (zones.length === 0 && boxes.length === 0) return;
    syncCameraState();
    const bigMode = typeof isBigCanvasMode === 'function' && isBigCanvasMode();
    drawSafeZone();
    drawZone();
    drawTronBox();
    handleHands(bigMode);

    push();
    fill(0, 255, 255);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(20);
    text('Telekinesie : pincez pouce + index pour deplacer le cube', 12, 98);
    if (solved) {
      fill(20, 255, 140);
      text('Objectif telekinesie valide !', 12, 126);
    }
    pop();
  }

  function isSolved()  { return solved; }
  function hasZones()  { return zones.length > 0; }

  // Sérialiseurs pour l'éditeur
  function getBoxStarts() {
    return boxes.map(b => ({ x: b.startX, y: b.startY, size: b.size, id: b.id }));
  }
  function getZones() {
    return zones.map(z => ({ x: z.x, y: z.y, w: z.w, h: z.h, id: z.id }));
  }

  function resetObjective() {
    solved = false;
    for (const box of boxes) {
      box.x = box.startX; box.y = box.startY;
      box.prevX = box.x;  box.prevY = box.y;
      box.grabbed = false;
    }
    clampBoxesToSafeZone();
    grabbedBoxIndex = -1;
    mouseDragging = false;
  }

  function setLevelConfig(config = {}) {
    if (Array.isArray(config.zones) && config.zones.length > 0) {
      zones = config.zones.map(z => ({
        x: z.x, y: z.y, w: z.w, h: z.h,
        id: z.id != null ? String(z.id) : undefined,
        solved: z.solved || false
      }));
    } else if (config.zone) {
      zones = [{ ...zones[0], ...config.zone }];
    } else {
      zones = [];
    }

    if (config.safeZonePadding) {
      safeZonePadding = { ...safeZonePadding, ...config.safeZonePadding };
    }

    const rawBoxStarts = Array.isArray(config.boxStarts) && config.boxStarts.length > 0
      ? config.boxStarts
      : (config.boxStart ? [config.boxStart] : []);

    boxes = rawBoxStarts.map((box, index) => {
      const id   = box.id != null ? String(box.id) : (zones[index]?.id ?? `data-${index + 1}`);
      const size = box.size || config.boxSize || 60;
      return createBoxState(box.x, box.y, size, id);
    });

    if (boxes.length === 0 && zones.length > 0) {
      const fallbackId = zones[0]?.id || 'data-1';
      boxes = [createBoxState(2400, 500, config.boxSize || 60, fallbackId)];
    }

    clampBoxesToSafeZone();
    grabbedBoxIndex = -1;
    mouseDragging = false;
    solved = false;
  }

  function drawSafeZone() {
    // On affiche simplement la zone visible (toute la largeur canvas) pour
    // ne pas dessiner un rectangle de 5760px hors-écran.
    const bounds = getSafeZoneBounds();
    stroke(0, 255, 255, 40);
    strokeWeight(1);
    noFill();
    rect(0, worldToScreenY(bounds.minY),
         (typeof width !== 'undefined' ? width : 1366),
         bounds.maxY - bounds.minY, 6);
  }

  function drawZone() {
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const tlX = worldToScreenX(zone.x);
      const brX = worldToScreenX(zone.x + zone.w);
      const tlY = worldToScreenY(zone.y);
      stroke(solved ? color(20, 255, 140) : color(0, 255, 255));
      strokeWeight(2);
      fill(0, 80, 120, 60);
      rect(tlX, tlY, brX - tlX, zone.h, 8);
      noStroke();
      fill(solved ? color(20, 255, 140) : color(0, 255, 255));
      textSize(12);
      textAlign(LEFT, TOP);
      text(zones.length === 1 ? 'ZONE DATA' : 'ZONE DATA ' + (i + 1), tlX + 8, tlY + 8);
    }
  }

  function drawTronBox() {
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const tlX = worldToScreenX(box.x);
      const brX = worldToScreenX(box.x + box.size);
      const tlY = worldToScreenY(box.y);
      const bW  = brX - tlX;
      stroke(255, 100, 0);
      strokeWeight(box.grabbed ? 6 : 2);
      fill(0, 150);
      rect(tlX, tlY, bW, box.size, 10);
      stroke(255, 170, 90, 170);
      strokeWeight(2);
      line(tlX + 7, tlY + 10, brX - 7, tlY + 10);
      fill(255, 100, 0);
      noStroke();
      textSize(12);
      textAlign(CENTER, CENTER);
      text(box.id ? 'DATA ' + box.id : 'DATA', tlX + bW / 2, tlY + box.size / 2);
    }
  }

  function _setSolvedState(nextSolved) {
    const prevSolved = solved;
    solved = nextSolved;
    if (!prevSolved && solved && typeof playZoneValidatedSound === 'function') {
      playZoneValidatedSound();
    }
  }

  function handleHands(bigMode) {
    hands = [
      typeof getLeftHandData  === 'function' ? getLeftHandData()  : null,
      typeof getRightHandData === 'function' ? getRightHandData() : null
    ].filter(Boolean);

    let handDetected = false;
    for (const box of boxes) { box.prevX = box.x; box.prevY = box.y; }

    if (mouseDragging) {
      clampBoxesToSafeZone();
      _setSolvedState(_checkAllZonesSolved());
      return;
    }

    if (hands.length > 0) {
      handDetected = true;
      let hand = hands[0];
      let bestPinchDist = Infinity;
      for (const candidate of hands) {
        const it = candidate?.keypoints?.[8];
        const tt = candidate?.keypoints?.[4];
        if (!it || !tt) continue;
        const d = dist(it.x, it.y, tt.x, tt.y);
        if (d < bestPinchDist) { bestPinchDist = d; hand = candidate; }
      }

      // Guard : si les keypoints sont incomplets on abandonne ce frame
      if (!hand.keypoints || hand.keypoints.length < 21) {
        for (const box of boxes) box.grabbed = false;
        grabbedBoxIndex = -1;
        smoothedKeypoints = [];
        clampBoxesToSafeZone();
        _setSolvedState(_checkAllZonesSolved());
        return;
      }

      if (smoothedKeypoints.length === 0) {
        for (let j = 0; j < 21; j++) {
          smoothedKeypoints.push({ x: hand.keypoints[j].x, y: hand.keypoints[j].y });
        }
      }
      for (let j = 0; j < 21; j++) {
        smoothedKeypoints[j].x = lerp(smoothedKeypoints[j].x, hand.keypoints[j].x, 0.5);
        smoothedKeypoints[j].y = lerp(smoothedKeypoints[j].y, hand.keypoints[j].y, 0.5);
      }

      const indexTip  = smoothedKeypoints[8];
      const thumbTip  = smoothedKeypoints[4];
      const indexW    = screenToWorldPoint(indexTip);
      const thumbW    = screenToWorldPoint(thumbTip);
      const pinchDist = dist(indexW.x, indexW.y, thumbW.x, thumbW.y);
      const midX = (indexW.x + thumbW.x) / 2;
      const midY = (indexW.y + thumbW.y) / 2;
      const drawHands = !bigMode || (frameCount % 2 === 0);

      const grabThreshold = 72;
      const releaseThreshold = 108;

      if (grabbedBoxIndex >= 0 && boxes[grabbedBoxIndex]) {
        const ab = boxes[grabbedBoxIndex];
        stroke(255, 100, 0);
        line(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
        if (pinchDist > releaseThreshold) { ab.grabbed = false; grabbedBoxIndex = -1; }
        else {
          ab.x = lerp(ab.x, midX - ab.size / 2, 0.4);
          ab.y = lerp(ab.y, midY - ab.size / 2, 0.4);
        }
      } else if (pinchDist < grabThreshold) {
        stroke(255, 100, 0);
        line(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
        for (let i = boxes.length - 1; i >= 0; i--) {
          const box = boxes[i];
          if (indexW.x > box.x && indexW.x < box.x + box.size &&
              indexW.y > box.y && indexW.y < box.y + box.size) {
            grabbedBoxIndex = i; box.grabbed = true;
            if (typeof playBoxGrabSound === 'function') playBoxGrabSound();
            break;
          }
        }
      }

      if (drawHands) {
        stroke(0, 255, 255); strokeWeight(2); fill(0);
        for (let j = 0; j < 21; j++) {
          circle(smoothedKeypoints[j].x, smoothedKeypoints[j].y, 6);
        }
      }
    }

    if (!handDetected) {
      for (const box of boxes) box.grabbed = false;
      grabbedBoxIndex = -1;
      smoothedKeypoints = [];
    }

    clampBoxesToSafeZone();
    _setSolvedState(_checkAllZonesSolved());
  }

  function _checkAllZonesSolved() {
    return zones.length > 0 && zones.every(zone => {
      let candidates = zone.id ? boxes.filter(b => String(b.id) === String(zone.id)) : boxes;
      if (candidates.length === 0) candidates = boxes;
      return candidates.some(box => {
        const cx = box.x + box.size / 2, cy = box.y + box.size / 2;
        return cx >= zone.x && cx <= zone.x + zone.w &&
               cy >= zone.y && cy <= zone.y + zone.h;
      });
    });
  }

  function getCompletionState() {
    const hasTerms = typeof _terminals !== 'undefined' && _terminals.length > 0;
    const hasDataZones = hasZones();
    const allTermsSolved = !hasTerms || _terminals.every(t => t.solved);
    const allDataSolved = !hasDataZones || solved;
    return {
      hasTerms,
      hasDataZones,
      allTermsSolved,
      allDataSolved,
      complete: allTermsSolved && allDataSolved,
    };
  }

  function clampBoxesToSafeZone() {
    const b = getSafeZoneBounds();
    for (const box of boxes) {
      box.x = constrain(box.x, b.minX, b.maxX - box.size);
      box.y = constrain(box.y, b.minY, b.maxY - box.size);
    }
  }

  function getSafeZoneBounds() {
    // Bornes en coordonnées MONDE (fixes), pas en coordonnées écran.
    // Bug précédent : screenToWorldX() dépend de camX → les boîtes
    // se déplaçaient lors du scroll de caméra à cause du clamp.
    const WORLD_W = (typeof W !== 'undefined') ? W : 5760;
    const WORLD_H = (typeof H !== 'undefined') ? H : 1200;
    return {
      minX: 0,
      minY: safeZonePadding.top,
      maxX: WORLD_W,
      maxY: WORLD_H - safeZonePadding.bottom
    };
  }

  function mousePressed(mx, my) {
    if (!boxes.length) return false;
    syncCameraState();
    const wx = screenToWorldX(mx);
    const wy = screenToWorldY(my);
    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      if (wx >= box.x && wx <= box.x + box.size &&
          wy >= box.y && wy <= box.y + box.size) {
        grabbedBoxIndex = i; 
        mouseDragging = true;
        box.grabbed = true; 
        box.prevX = box.x; 
        box.prevY = box.y;
        if (typeof playBoxGrabSound === 'function') playBoxGrabSound();
        return true;
      }
    }
    return false;
  }

  function mouseDragged(mx, my) {
    if (!mouseDragging || grabbedBoxIndex < 0 || !boxes[grabbedBoxIndex]) return false;
    syncCameraState();
    const box = boxes[grabbedBoxIndex];
    box.prevX = box.x; box.prevY = box.y;
    box.x = screenToWorldX(mx) - box.size / 2;
    box.y = screenToWorldY(my) - box.size / 2;
    clampBoxesToSafeZone();
    return true;
  }

  function mouseReleased() {
    mouseDragging = false;
    if (grabbedBoxIndex >= 0 && boxes[grabbedBoxIndex]) {
      boxes[grabbedBoxIndex].grabbed = false;
    }
    grabbedBoxIndex = -1;
    return false;
  }

  function getDataPlatformCollider(box) {
    const t = box || boxes[0];
    if (!t) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: min(t.prevX, t.x), y: min(t.prevY, t.y),
      w: max(t.prevX + t.size, t.x + t.size) - min(t.prevX, t.x),
      h: max(t.prevY + t.size, t.y + t.size) - min(t.prevY, t.y)
    };
  }

  function getDataPlatformInfos() {
    return boxes.map((box, index) => ({
      id: box.id, index,
      current: { x: box.x, y: box.y, w: box.size, h: box.size },
      swept: getDataPlatformCollider(box),
      dx: box.x - box.prevX, dy: box.y - box.prevY
    }));
  }

  function getDataPlatformInfo() {
    const infos = getDataPlatformInfos();
    if (grabbedBoxIndex >= 0 && infos[grabbedBoxIndex]) return infos[grabbedBoxIndex];
    return infos[0] || { current:{x:0,y:0,w:0,h:0}, swept:{x:0,y:0,w:0,h:0},
      dx:0, dy:0, id:'', index:-1 };
  }

  function isBoxGrabbed() {
    return grabbedBoxIndex >= 0 || mouseDragging;
  }

  return {
    preload, init, setLevelConfig,
    drawOverlay, drawInteractionLayer,
    mousePressed, mouseDragged, mouseReleased,
    getDataPlatformCollider, getDataPlatformInfos, getDataPlatformInfo,
    isBoxGrabbed,
    isSolved, hasZones, resetObjective, getCompletionState,
    getBoxStarts, getZones
  };
})();


// ── ③ Ennemis de patrouille ──────────────────────────────────────
// initEnemies(arr) peuple le tableau depuis les données du niveau.

let enemies = [];

function initEnemies(arr) {
  const groundY = typeof GROUND_Y !== 'undefined' ? GROUND_Y : 1065;
  const floorY  = groundY + 54;   // y=1119 = sol
  const enemyH  = 90;
  const src = Array.isArray(arr) ? arr : [];
  enemies = src.map(d => ({
    x:           d.x,
    y:           floorY - enemyH,
    w:           60,
    h:           enemyH,
    patrolLeft:  d.patrolLeft,
    patrolRight: d.patrolRight,
    speed:       d.speed || 2.5,
    facingRight: true,
    hitFlash:    0
  }));
}

function getEnemiesData() {
  return enemies.map(e => ({
    x:           e.x,
    patrolLeft:  e.patrolLeft,
    patrolRight: e.patrolRight,
    speed:       e.speed
  }));
}

function updateEnemies() {
  if (!enemies || enemies.length === 0) return;
  for (const e of enemies) {
    if (e.facingRight) {
      e.x += e.speed;
      if (e.x + e.w >= e.patrolRight) e.facingRight = false;
    } else {
      e.x -= e.speed;
      if (e.x <= e.patrolLeft) e.facingRight = true;
    }
    if (e.hitFlash > 0) e.hitFlash--;

    if (typeof player === 'undefined') continue;
    const pr   = player.crouching ? 23 : 51;
    const closX = constrain(player.x, e.x, e.x + e.w);
    const closY = constrain(player.y, e.y, e.y + e.h);
    const dx = player.x - closX, dy = player.y - closY;
    if (dx*dx + dy*dy < pr*pr) _resetPlayerToStart();
  }
}

function drawEnemies() {
  if (!enemies || enemies.length === 0) return;
  for (const e of enemies) {
    push();
    translate(e.x + e.w / 2, e.y + e.h / 2);
    if (!e.facingRight) scale(-1, 1);

    const flash = e.hitFlash > 0;
    const pulse = 0.6 + 0.4 * sin(frameCount * 0.12);

    noStroke();
    fill(0, 0, 0, 40);
    ellipse(2, e.h / 2 + 4, e.w - 6, 14);

    fill(flash ? color(255,255,255) : color(180, 15, 15, 220));
    stroke(flash ? color(255,255,255) : color(255, 60, 60, 200));
    strokeWeight(2);
    rect(-e.w/2, -e.h/2, e.w, e.h, 8, 8, 3, 3);

    fill(100, 10, 10, 180);
    stroke(180, 40, 40);
    strokeWeight(1.5);
    rect(-e.w/2 - 4, -e.h/2 + 4, 14, 20, 4);
    rect( e.w/2 - 10, -e.h/2 + 4, 14, 20, 4);

    fill(flash ? color(255,0,0) : color(255, 230, 0, 200 + 55*pulse));
    noStroke();
    ellipse(-10, -e.h/2 + 22, 13, 10);
    ellipse( 10, -e.h/2 + 22, 13, 10);

    fill(20, 0, 0, 200);
    rect(-12, -e.h/2 + 36, 24, 8, 2);
    fill(220, 220, 220, 200);
    for (let t = -10; t <= 8; t += 6) {
      rect(t, -e.h/2 + 36, 4, 5);
    }

    fill(255, 200, 0, 180 + 60 * pulse);
    textAlign(CENTER, TOP);
    textSize(16);
    text('⚠', 0, -e.h/2 - 22);
    pop();
  }
}

function _resetPlayerToStart() {
  if (typeof player === 'undefined') return;
  for (const e of enemies) e.hitFlash = 12;
  player.x = 270;
  player.y = (typeof GROUND_Y !== 'undefined' ? GROUND_Y : 1065) - 57;
  player.vx = 0; player.vy = 0;
  player.onGround = false; player.jumpsLeft = 2;
  if (typeof camX !== 'undefined') camX = 0;
}


// ── ④ Terminaux ──────────────────────────────────────────────────
// initTerminals(arr) depuis le niveau ; auto-déclenchement Helldivers
// quand le joueur approche à 150 px.

let _terminals      = [];
let _nearTerminalIdx = -1;

function initTerminals(arr) {
  const src = Array.isArray(arr) ? arr : [];
  _terminals = src.map(d => Object.assign({}, d, { solved: false }));
  _nearTerminalIdx = -1;
}

function getTerminalsData() {
  return _terminals.map(t => ({
    x: t.x, y: t.y, w: t.w || 60, h: t.h || 90,
    unlockLabel: t.unlockLabel || '',
    keys:    t.keys    || 5,
    timeSec: t.timeSec || 6
  }));
}

function updateTerminals() {
  _nearTerminalIdx = -1;
  if (typeof player === 'undefined') return;

  for (let i = 0; i < _terminals.length; i++) {
    const t  = _terminals[i];
    if (t.solved) continue;
    const tx = t.x + (t.w || 60) / 2;
    const ty = t.y + (t.h || 90) / 2;
    if (Math.abs(player.x - tx) < 150 && Math.abs(player.y - ty) < 150) {
      _nearTerminalIdx = i; break;
    }
  }

  // Dismiss si plus personne en portée
  if (_nearTerminalIdx < 0) {
    HelldiversInteraction.dismiss();
    return;
  }

  // Auto-déclencher le guide si Helldivers est inactif
  const hdState = HelldiversInteraction.getState();
  if (hdState === 'inactive') {
    const t = _terminals[_nearTerminalIdx];
    // play terminal music while the guide is active (if available)
    if (typeof playMusic === 'function') playMusic('mus_terminal');
    HelldiversInteraction.showGuide(
      t.keys, t.timeSec,
      () => {
        // ── Succès ──────────────────────────────────────────────
        if (typeof playTerminalSuccessSound === 'function') playTerminalSuccessSound();
        t.solved = true;
        if (t.unlockLabel && typeof obstacles !== 'undefined') {
          const obs = obstacles.find(o => o.lbl === t.unlockLabel);
          if (obs) obs.destroyed = true;
        }
        // restore ambient music
        if (typeof playMusic === 'function') playMusic('mus_mystere');
      },
      () => {
        if (typeof playTerminalFailSound === 'function') playTerminalFailSound();
        if (typeof playMusic === 'function') playMusic('mus_mystere');
      }
    );
  }
}

// Dessin des terminaux (espace monde, dans bloc world-space)
function drawTerminals() {
  if (!_terminals || _terminals.length === 0) return;
  push();
  for (const t of _terminals) {
    const tw = t.w || 60, th = t.h || 90;
    const pulse = 0.5 + 0.5 * sin(frameCount * 0.09);

    // Socle
    fill(30, 30, 50, 200);
    stroke(60, 60, 100);
    strokeWeight(2);
    rect(t.x + 8, t.y + th - 16, tw - 16, 16, 0, 0, 4, 4);

    // Corps
    if (t.solved) {
      fill(10, 60, 30, 200); stroke(20, 200, 80);
    } else {
      fill(10, 30, 55, 190 + 40 * pulse);
      stroke(0, 160 + 60 * pulse, 255);
    }
    strokeWeight(2);
    rect(t.x + 4, t.y, tw - 8, th - 16, 6, 6, 2, 2);

    // Écran animé
    if (!t.solved) {
      fill(0, 80 + 60 * pulse, 180, 120);
      noStroke();
      rect(t.x + 10, t.y + 8, tw - 20, 30, 3);
      stroke(0, 200, 255, 100 + 80 * pulse);
      strokeWeight(1);
      for (let row = 0; row < 3; row++) {
        const lw = (row % 2 === 0 ? tw * 0.5 : tw * 0.35) * pulse;
        line(t.x + 10, t.y + 14 + row * 8, t.x + 10 + lw, t.y + 14 + row * 8);
      }
    }

    // Icône centrale
    noStroke();
    fill(t.solved ? color(20, 255, 80, 230) : color(0, 220, 255, 200));
    textAlign(CENTER, CENTER);
    textSize(22);
    text(t.solved ? '✓' : '⌨', t.x + tw / 2, t.y + th - 38);

    // Label
    noStroke();
    fill(255, 255, 255, t.solved ? 180 : 130);
    textAlign(CENTER, BOTTOM);
    textSize(9);
    text(t.solved ? 'HACKE' : 'TERMINAL', t.x + tw / 2, t.y - 3);

    // Halo de proximité
    if (!t.solved && _nearTerminalIdx >= 0 && _terminals[_nearTerminalIdx] === t) {
      noFill();
      stroke(0, 200, 255, 60 + 40 * pulse);
      strokeWeight(3 + 2 * pulse);
      rect(t.x - 6, t.y - 6, tw + 12, th + 12, 10);
    }
  }
  pop();
}

// Compatibilité ascendante (stub, remplacé par drawExitDoorHint)
function drawTerminalHint() { /* no-op : géré par drawExitDoorHint() */ }
// Compatibilité ascendante (terminal maintenant auto-déclenché)
function tryActivateTerminal() { /* no-op : activation automatique */ }


// ── ⑤ Porte de sortie ────────────────────────────────────────────
// Verrouillée tant que isLevelComplete() = false.
// updateExitDoor() déclenche isTransitionPending() quand le joueur
// entre en contact avec une porte déverrouillée.

let _exitDoor               = null;
let _levelTransitionPending = false;

function initExitDoor(levelData) {
  const d = (levelData && levelData.exitDoor) || { x: 5648, y: 915, w: 78, h: 150 };
  _exitDoor = { x: d.x, y: d.y, w: d.w, h: d.h, locked: true };
  _levelTransitionPending = false;
}

function updateExitDoor() {
  if (!_exitDoor) return;
  const completion = TelekinesisInteraction.getCompletionState();
  if (completion.complete) {
    _exitDoor.locked = false;
    if (typeof player !== 'undefined') {
      const pr   = player.crouching ? 23 : 51;
      const closX = constrain(player.x, _exitDoor.x, _exitDoor.x + _exitDoor.w);
      const closY = constrain(player.y, _exitDoor.y, _exitDoor.y + _exitDoor.h);
      const dx = player.x - closX, dy = player.y - closY;
      if (dx*dx + dy*dy < pr*pr) _levelTransitionPending = true;
    }
  } else {
    _exitDoor.locked = true;
  }
}

// Dessin porte (espace monde)
function drawExitDoor() {
  if (!_exitDoor) return;
  push();
  const d      = _exitDoor;
  const locked = d.locked;
  const pulse  = 0.5 + 0.5 * sin(frameCount * 0.08);

  // Encadrement
  fill(locked ? color(55, 18, 18, 205) : color(15, 58, 30, 205));
  stroke(locked ? color(175, 38, 38, 148 + 80*pulse)
                : color(38, 200, 72, 148 + 80*pulse));
  strokeWeight(3);
  rect(d.x, d.y, d.w, d.h, 6, 6, 2, 2);

  // Remplissage intérieur
  fill(locked ? color(75, 8, 8, 125) : color(8, 140, 38, 118 + 58*pulse));
  noStroke();
  rect(d.x + 5, d.y + 5, d.w - 10, d.h - 10, 4);

  // Icône
  noStroke();
  textAlign(CENTER, CENTER);
  if (locked) {
    // Padlock dessiné avec des formes
    const lx = d.x + d.w / 2, ly = d.y + d.h / 2;
    fill(200, 60, 60, 220);
    rect(lx - 14, ly - 8, 28, 20, 3);
    noFill();
    stroke(200, 60, 60, 200);
    strokeWeight(3);
    arc(lx, ly - 8, 22, 20, Math.PI, 0);
    fill(255, 230, 0, 200);
    noStroke();
    circle(lx, ly, 7);
  } else {
    fill(80, 255, 120, 225);
    textSize(28);
    text('►', d.x + d.w / 2, d.y + d.h / 2);
  }

  // Label
  noStroke();
  fill(255, 255, 255, 158);
  textSize(10);
  textAlign(CENTER, BOTTOM);
  text(locked ? 'VERROUILLE' : 'SORTIE', d.x + d.w / 2, d.y - 4);

  // Chaînes animées si verrouillé
  if (locked) {
    stroke(175, 38, 38, 95 + 78*pulse);
    strokeWeight(2);
    noFill();
    for (let row = 0; row < 3; row++) {
      const yy = d.y + 18 + row * 38;
      line(d.x - 5, yy, d.x + d.w + 5, yy);
    }
  }
  pop();
}

// Indication porte (espace canvas, hors scale)
function drawExitDoorHint() {
  if (!_exitDoor) return;
  if (typeof player === 'undefined') return;

  // N'afficher que si le joueur est relativement proche
  const dx = player.x - (_exitDoor.x + _exitDoor.w / 2);
  if (Math.abs(dx) > 400) return;

  push();
  const locked = _exitDoor.locked;
  const pulse  = 0.7 + 0.3 * sin(frameCount * 0.14);

  if (locked) {
    const completion = TelekinesisInteraction.getCompletionState();

    noStroke();
    fill(255, 78, 78, 202 * pulse);
    textAlign(CENTER, BOTTOM);
    textSize(20);
    text('🔒 Porte verrouillee', width / 2, height / 2 - 68);

    fill(200, 158, 158, 182 * pulse);
    textSize(15);
    const missing = [];
    if (completion.hasTerms && !completion.allTermsSolved) missing.push('Resolvez tous les terminaux');
    if (completion.hasDataZones && !completion.allDataSolved) missing.push('Deposez les boites DATA dans les zones');
    for (let i = 0; i < missing.length; i++) {
      text('• ' + missing[i], width / 2, height / 2 - 46 + i * 18);
    }
  } else {
    noStroke();
    fill(78, 255, 118, 202 * pulse);
    textAlign(CENTER, BOTTOM);
    textSize(20);
    text('Niveau termine !  Entrez dans la sortie →', width / 2, height / 2 - 68);
  }
  pop();
}

function isLevelComplete() {
  return TelekinesisInteraction.getCompletionState().complete;
}

function isTransitionPending() { return _levelTransitionPending; }
function clearTransition()     { _levelTransitionPending = false; }


// ── Point d'entrée ───────────────────────────────────────────────
function initMechanics(levelIdx) {
  const idx       = (typeof levelIdx !== 'undefined') ? levelIdx : 0;
  const levelData = (typeof LEVELS_DATA !== 'undefined' && LEVELS_DATA[idx]) || {};

  HelldiversInteraction.init();
  TelekinesisInteraction.init();

  const db = levelData.dataBricks || { boxes: [], zones: [] };
  TelekinesisInteraction.setLevelConfig({
    zones:     db.zones || [],
    boxStarts: db.boxes || [],
  });

  initEnemies(levelData.enemies    || []);
  initTerminals(levelData.terminals || []);
  initExitDoor(levelData);
  _levelTransitionPending = false;
}

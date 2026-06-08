// ═══════════════════════════════════════
//  GESTURE — ml5.js HandPose
// ═══════════════════════════════════════

const G = {
  VW: 320, VH: 240,
  HOLD_TIME: 650,
  COOLDOWN: 1800,
  FINGERS: [[8,5],[12,9],[16,13],[20,17]],
  SKELETON: [
    [0,1],[1,2],[2,3],[3,4],
    [5,6],[6,7],[7,8],[9,10],[10,11],[11,12],
    [13,14],[14,15],[15,16],[17,18],[18,19],[19,20],
    [0,5],[5,9],[9,13],[13,17],[0,17]
  ],
  // Zone affichée en coordonnées canvas (resetMatrix → indépendant du GAME_SCALE)
  // Taille doublée (640×480) et repositionnée à l'intérieur du panneau de jeu
  UI: { x:700, y:100, w:640, h:480 }
};

let gesture = {
  handPose:     null,
  capture:      null,
  enabled:      false,
  error:        null,
  landmarks:    null,
  detected:     null,
  holdDetected: null,
  holdStart:    0,
  lastTrigger:  0,
};

let _detectToken = 0; // invalide l'ancienne boucle si initGesture/gestureStop appelés plusieurs fois

function preloadGestureModel() {
  gesture.handPose = ml5.handPose();
}

function initGesture() {
  if (gesture.error) return;
  gesture.enabled = true;
  gesture.landmarks = null;
  gesture.detected = null;
  gesture.holdDetected = null;
  gesture.holdStart = 0;
  if (!gesture.capture) {
    try {
      gesture.capture = createCapture(VIDEO);
      gesture.capture.size(G.VW, G.VH);
      gesture.capture.hide();
    } catch(e) {
      gesture.error = e.message || 'Caméra indisponible';
      gesture.enabled = false;
      return;
    }
  }
  _detectToken++;
  _scheduleDetect(_detectToken);
}

function gestureStop() {
  gesture.enabled = false;
  _detectToken++; // invalide toute boucle en cours
  gesture.landmarks = null;
  gesture.detected = null;
  gesture.holdDetected = null;
  gesture.holdStart = 0;
}

function _scheduleDetect(token) {
  if (!gesture.enabled || token !== _detectToken) return;
  gesture.handPose.detect(gesture.capture).then(results => {
    if (token !== _detectToken) return;
    _onHands(results);
    setTimeout(() => _scheduleDetect(token), 80); // ~12 fps max
  }).catch(() => {
    setTimeout(() => _scheduleDetect(token), 200);
  });
}

function _onHands(results) {
  const kps = results[0]?.keypoints ?? null;
  gesture.landmarks = kps;
  gesture.detected  = kps ? _classify(kps) : null;
  _updateHold();
}

function _classify(kps) {
  const handSize = Math.hypot(kps[0].x - kps[9].x, kps[0].y - kps[9].y) || 80;
  if (gstate === 'ROULETTE') {
    const pinchDist = Math.hypot(kps[4].x - kps[8].x, kps[4].y - kps[8].y);
    return pinchDist < handSize * 0.35 ? 'PINCH' : null;
  }
  const isUp  = ([tip, mcp]) => kps[mcp].y - kps[tip].y > handSize * 0.15;
  const count = G.FINGERS.filter(isUp).length;
  if (count === 1) return 'HIT';
  if (count === 3) return 'STAND';
  return null;
}

function _updateHold() {
  const now = Date.now();
  if (!gesture.detected) {
    gesture.holdDetected = null;
    gesture.holdStart    = 0;
    return;
  }
  if (gesture.detected !== gesture.holdDetected) {
    gesture.holdDetected = gesture.detected;
    gesture.holdStart    = now;
    return;
  }
  const heldLongEnough  = now - gesture.holdStart  >= G.HOLD_TIME;
  const cooldownElapsed = now - gesture.lastTrigger >= G.COOLDOWN;
  if (heldLongEnough && cooldownElapsed) {
    _trigger(gesture.detected);
    gesture.lastTrigger = now;
    gesture.holdStart   = now + 999999;
  }
}

function _trigger(g) {
  if (gstate === 'BLACKJACK' && currentGame) {
    if (currentGame.state === 'PLAY') {
      if (g === 'HIT')   currentGame.hit();
      if (g === 'STAND') currentGame.stand();
    } else if (currentGame.state === 'LOSE' || currentGame.state === 'PUSH') {
      // Geste pendant défaite → reset immédiat sans attendre le timer
      currentGame.reset();
    }
  }
  if (gstate === 'ROULETTE' && currentGame) {
    if (currentGame.state === 'IDLE') {
      if (g === 'PINCH') currentGame._startSpin();
    } else if (currentGame.state === 'RESULT' && !currentGame.won) {
      // Pincer pendant défaite → reset + relance directe
      if (g === 'PINCH') { currentGame.reset(); currentGame._startSpin(); }
    }
  }
}

function drawGestureUI() {
  const { x, y, w, h } = G.UI;
  push();
  resetMatrix(); // dessine en coordonnées canvas fixes, indépendant du GAME_SCALE
  _drawPanel(x, y, w, h);
  if      (gesture.error)    _drawError(x, y, w, h);
  else if (!gesture.enabled) _drawLoading(x, y, w);
  else                       _drawActive(x, y, w, h);
  pop();
}

function _drawPanel(x, y, w, h) {
  fill(6,3,16,235); stroke(95,70,155); strokeWeight(4);
  rect(x-14, y-54, w+28, h+210, 18);
  fill(185,160,255); noStroke(); textAlign(CENTER); textSize(28);
  const label = gstate === 'ROULETTE' ? '🎥 GESTES / ROULETTE' : '🎥 GESTES / BLACKJACK';
  text(label, x+w/2, y-22);
}

function _drawError(x, y, w, h) {
  fill(255,80,80); noStroke(); textSize(26); textAlign(CENTER);
  text(gesture.error, x+w/2, y+80);
  fill(150,150,170);
  text('Utilise [H] et [S]', x+w/2, y+120);
}

function _drawLoading(x, y, w) {
  fill(160,160,180); noStroke(); textSize(26); textAlign(CENTER);
  text('Chargement modèle...', x+w/2, y+100);
}

function _drawActive(x, y, w, h) {
  if (gesture.capture) image(gesture.capture, x, y, w, h);
  if (gesture.landmarks) _drawSkeleton(x, y, w, h);
  fill(gesture.landmarks ? color(50,255,100) : color(160,160,160));
  noStroke(); textAlign(LEFT); textSize(26);
  text(gesture.landmarks ? '● main détectée' : '○ pas de main', x, y+h+34);
  _drawHoldBar(x, y, w, h);
  _drawLabels(x, y, w, h);
}

function _drawSkeleton(x, y, w, h) {
  const lm = gesture.landmarks;
  const sx = kp => x + (kp.x / G.VW) * w;
  const sy = kp => y + (kp.y / G.VH) * h;
  stroke(0,255,180,210); strokeWeight(3);
  for (const [a, b] of G.SKELETON)
    line(sx(lm[a]), sy(lm[a]), sx(lm[b]), sy(lm[b]));
  noStroke();
  for (const kp of lm) {
    fill(0,255,0);
    circle(sx(kp), sy(kp), 14);
  }
}

function _drawHoldBar(x, y, w, h) {
  const now     = Date.now();
  const holdPct = gesture.holdDetected
    ? min(1, max(0, (now - gesture.holdStart) / G.HOLD_TIME))
    : 0;
  fill(20,12,35); noStroke(); rect(x, y+h+52, w, 18, 8);
  if (holdPct > 0) {
    fill(gesture.holdDetected === 'HIT' ? color(70,160,255) : color(70,255,140));
    rect(x, y+h+52, w * holdPct, 18, 8);
  }
}

function _drawLabels(x, y, w, h) {
  fill(150,140,195); noStroke(); textAlign(LEFT); textSize(26);
  if (gstate === 'ROULETTE') {
    const isLost = currentGame && currentGame.state === 'RESULT' && !currentGame.won;
    text(isLost ? '🤏 Pincer = Rejouer' : '🤏 Pincer = Lancer la roue', x, y+h+90);
    if (gesture.detected === 'PINCH') {
      fill(isLost ? color(255,140,60) : color(255,200,60));
      textSize(36); textAlign(CENTER); textStyle(BOLD);
      text(isLost ? '🤏 REJOUER...' : '🤏 LANCER...', x+w/2, y+h+148);
      textStyle(NORMAL);
    }
  } else {
    const isLost = currentGame && (currentGame.state === 'LOSE' || currentGame.state === 'PUSH');
    if (isLost) {
      // Pendant une défaite, n'importe quel geste relance
      fill(255,160,80); textSize(26);
      text('✊ N\'importe quel geste = Rejouer', x, y+h+90);
    } else {
      text('☝️  1 doigt  = Tirer (Hit)',   x, y+h+90);
      text('🤟 3 doigts = Rester (Stand)', x, y+h+124);
    }
    if (gesture.detected) {
      const isHit = gesture.detected === 'HIT';
      fill(isLost ? color(255,160,80) : isHit ? color(80,175,255) : color(80,255,145));
      textSize(36); textAlign(CENTER); textStyle(BOLD);
      text(isLost ? '🔄 REJOUER...' : isHit ? '☝️ TIRER...' : '🤟 RESTER...', x+w/2, y+h+165);
      textStyle(NORMAL);
    }
  }
}

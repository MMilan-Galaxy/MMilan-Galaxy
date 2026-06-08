// ═══════════════════════════════════════
//  ROULETTE — Physique roue + bille
// ═══════════════════════════════════════

let audioCtx = null;
function initAudio() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playClick(vol = 0.3) {
  if (!audioCtx) return;
  try {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.035, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.006));
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
  } catch (e) {}
}

const ROULETTE_SEQ = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,
  16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

class Roulette {
  constructor() {
    this.cx = W/2 - 360;
    this.cy = H/2;
    this.wheelR = 370;
    this.reset();
    this.tutorial=!tutorialSeen.roulette;
  }

  reset() {
    this._stopNoise();
    this.rotation   = 0;
    this.velocity   = 0;
    this.friction   = 0.992;
    this.minVel     = 0.0004;
    this.isDragging = false;
    this.dragBuf    = [];
    this.trackOuter  = this.wheelR * 0.96;
    this.trackInner  = this.wheelR * 0.45;
    this.ballActive  = false;
    this.ballSettled = false;
    this.ballAngle   = 0;
    this.ballAngVel  = 0;
    this.ballR       = this.trackOuter;
    this.lastSlot    = -1;
    this.bet        = 'ROUGE';
    this.resultNum  = null;
    this.won        = false;
    this.winMsg     = '';
    this.state      = 'IDLE';
    this.resetTimer = 0;
    this.exitTimer  = 0;
    this.prevSlot = -1;
  }

  _stopNoise() {}

  _triggerClick() {
    const spd = Math.abs(this.ballAngVel);
    const vol = constrain(map(spd, 0.004, 0.2, 0.04, 0.22), 0.04, 0.22);
    playClick(vol);
  }

  destroy() {}

  _wheelUpdate() {
    if (this.isDragging) return;
    this.rotation += this.velocity;
    this.velocity *= this.friction;
    if (Math.abs(this.velocity) < this.minVel) this.velocity = 0;
  }

  _wheelStopped() {
    return !this.isDragging && Math.abs(this.velocity) < this.minVel * 2;
  }

  _ballUpdate() {
    if (!this.ballActive || this.ballSettled) return;
    this.ballAngle  += this.ballAngVel;
    this.ballAngVel *= 0.991;
    const spd = Math.abs(this.ballAngVel);
    const fac = Math.min(spd / 0.08, 1.0);
    const desired = this.trackInner + (this.trackOuter - this.trackInner) * fac;
    this.ballR += (desired - this.ballR) * 0.18 * 0.05;
    const N    = 37;
    const step = TWO_PI / N;
    const rel  = this.ballAngle - this.rotation;
    const norm = ((rel % TWO_PI) + TWO_PI) % TWO_PI;
    const slot = Math.floor(norm / step);
    this.lastSlot = slot;
    if ((spd < 0.004 && this.ballR < this.trackInner * 1.05) ||
        (spd < 0.001 && this.ballR < this.trackInner * 1.12)) {
      this.ballAngVel = 0;
      this.ballR      = this.trackInner * 0.88;
      this.ballSettled = true;
    }
  }

  _launchBall() {
    if (Math.abs(this.velocity) < 0.02) {
      const dir = random(1) < 0.5 ? 1 : -1;
      this.velocity = dir * (0.14 + random(0.08));
    }
    const raw = -this.velocity * 3.2 + random(-0.025, 0.025);
    this.ballAngVel  = Math.sign(raw) * Math.min(Math.abs(raw), 2.2);
    this.ballAngle   = random(TWO_PI);
    this.ballR       = this.trackOuter;
    this.ballActive  = true;
    this.ballSettled = false;
    this.lastSlot    = -1;
  }

  _getResult() {
    const N    = ROULETTE_SEQ.length;
    const step = TWO_PI / N;
    const rel  = this.ballAngle - this.rotation + HALF_PI;
    const norm = ((rel % TWO_PI) + TWO_PI) % TWO_PI;
    return ROULETTE_SEQ[Math.floor(norm / step) % N];
  }

  _dismissTutorial(){this.tutorial=false;tutorialSeen.roulette=true;}

  onMousePressed(mx, my) {
    if (this.tutorial) { this._dismissTutorial(); return; }
    if (this.state === 'RESULT' && this.won) return;

    // ── Boutons du panneau latéral ──────────────────────────
    const px = this.cx + this.wheelR + 202;
    const pw = W - px - 72;
    const py = H/2 - 220;
    const bx1 = px + 72, bx2 = px + pw - 72; // limites gauche/droite des boutons

    // Boutons de mise (toujours cliquables sauf RESULT+won)
    const betKeys = ['ROUGE', 'NOIR', 'VERT'];
    for (let i = 0; i < 3; i++) {
      const by2 = py + 116 + i * 72;
      if (mx >= bx1 && mx <= bx2 && my >= by2 && my <= by2 + 56) {
        this.bet = betKeys[i];
        return;
      }
    }
    // Bouton Lancer (seulement en IDLE)
    if (this.state === 'IDLE') {
      const ry = py + 116 + 3 * 72 + 16;
      if (mx >= bx1 && mx <= bx2 && my >= ry && my <= ry + 60) {
        this._startSpin();
        return;
      }
    }

    // ── Roue (drag) ─────────────────────────────────────────
    if (dist(mx, my, this.cx, this.cy) < this.wheelR) {
      this.isDragging = true;
      this.dragBuf    = [];
      this.velocity   = 0;
    }
  }

  onMouseDragged(mx, my, px=pmouseX, py=pmouseY) {
    if (!this.isDragging) return;
    const aNow  = Math.atan2(my - this.cy, mx - this.cx);
    const aPrev = Math.atan2(py - this.cy, px - this.cx);
    let   delta = aNow - aPrev;
    if (delta >  PI) delta -= TWO_PI;
    if (delta < -PI) delta += TWO_PI;
    this.rotation += delta;
    this.dragBuf.push(delta);
    if (this.dragBuf.length > 6) this.dragBuf.shift();
  }

  onMouseReleased() {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.dragBuf.length > 0) {
      const avg = this.dragBuf.reduce((s, v) => s + v, 0) / this.dragBuf.length;
      this.velocity = avg * 1.4;
    }
    this.dragBuf = [];
    if (Math.abs(this.velocity) > 0.02 && this.state === 'IDLE') {
      this._startSpin();
    }
  }

  _startSpin() {
    this.state   = 'SPIN';
    this.winMsg  = '';
    this.resultNum = null;
    this._launchBall();
    initAudio();
  }

  _resolve() {
    const num   = this._getResult();
    this.resultNum = num;
    const isRed = RED_NUMS.has(num);
    const col   = num === 0 ? 'VERT' : isRed ? 'ROUGE' : 'NOIR';
    const label = num === 0 ? '🟢 Zéro' : isRed ? '🔴 Rouge' : '⚫ Noir';
    this.won    = col === this.bet;
    this.winMsg = this.won
      ? `✅ ${num} — ${label} — Victoire !`
      : `❌ ${num} — ${label} — Perdu !`;
    this.state  = 'RESULT';
    if (!this.won) this.resetTimer = 90;
  }

  update() {
    this._wheelUpdate();
    const prevSlot = this.lastSlot;
    this._ballUpdate();
    if (this.state === 'SPIN' && this.ballSettled && !this.resultNum) {
      this._resolve();
    }
    if (this.ballActive && !this.ballSettled && this.lastSlot !== prevSlot && prevSlot !== -1) {
      this._triggerClick();
    }
    if (this.resetTimer > 0) {
      this.resetTimer--;
      if (this.resetTimer === 0) this.reset();
    }
    if (this.state === 'RESULT' && this.won) this.exitTimer++;
  }

  handleKey(k) {
    if (this.tutorial) { this._dismissTutorial(); return; }
    if (k === '1') this.bet = 'ROUGE';
    if (k === '2') this.bet = 'NOIR';
    if (k === '3') this.bet = 'VERT';
    if (k === ' ' && this.state === 'IDLE') this._startSpin();
  }

  isWon() { return this.won; }
  shouldAutoExit() { return this.state === 'RESULT' && this.won && this.exitTimer > 180; }

  draw2d() {
    background(6, 12, 6);
    noStroke();
    for (let r = H; r > 0; r -= 120) {
      fill(10, 40, 10, map(r, 0, H, 35, 0));
      ellipse(W/2, H/2, r * 2.5);
    }
    if (this.tutorial) {
      drawTutorialCard('◎ ROULETTE',[
        {label:'🎯 But du jeu',lines:['Deviner la couleur (ou le zéro) sur laquelle la bille blanche va s\'arrêter','Choisis ta mise avant de lancer']},
        {label:'🎲 Les mises',lines:['[1] Rouge — la bille tombe sur une case rouge','[2] Noir  — la bille tombe sur une case noire','[3] Zéro  — la bille tombe sur le 0 (case verte)']},
        {label:'🎮 Comment jouer',lines:['Fais tourner la roue en cliquant-glissant dessus','Ou appuie sur [Espace] pour lancer directement']}
      ],color(0,180,60));
      return;
    }
    this._drawWheel();
    this._drawBall();
    this._drawPanel();
    fill(132, 152, 132, 192); noStroke(); textAlign(CENTER); textSize(22);
    if (this.state === 'IDLE') {
      text('1=Rouge  2=Noir  3=Zéro  |  [Espace] ou glisser la roue  |  [Échap] Retour', W/2, H-75);
    } else if (this.state === 'RESULT' && !this.won && this.resetTimer > 0) {
      text('Nouvelle partie dans ' + ceil(this.resetTimer / 60) + 's…  — ou pincez pour rejouer  |  [Échap]', W/2, H-75);
    } else {
      text('[Échap] Retour au casino', W/2, H-75);
    }
    drawGestureUI();
  }

  _drawWheel() {
    const N    = ROULETTE_SEQ.length;
    const step = TWO_PI / N;
    push();
    translate(this.cx, this.cy);
    rotate(this.rotation);
    for (let i = 0; i < N; i++) {
      const num = ROULETTE_SEQ[i];
      const a   = i * step - HALF_PI;
      if (num === 0)           fill('#00622a');
      else if (RED_NUMS.has(num)) fill('#c0392b');
      else                     fill('#1a1a1a');
      stroke('#7a6020'); strokeWeight(1.6);
      arc(0, 0, this.wheelR * 2, this.wheelR * 2, a, a + step, PIE);
      push();
      rotate(a + step / 2);
      translate(this.wheelR * 0.72, 0);
      rotate(HALF_PI);
      textAlign(CENTER, CENTER); textSize(this.wheelR * 0.07); textStyle(BOLD);
      noStroke(); fill(num === 0 ? '#ffffff' : '#f0d080');
      text(num, 0, 0);
      pop();
    }
    textStyle(NORMAL);
    noStroke(); fill('#1a0e04');
    ellipse(0, 0, this.wheelR * 0.38, this.wheelR * 0.38);
    stroke('#ffd700'); strokeWeight(3); noFill();
    ellipse(0, 0, this.wheelR * 0.36, this.wheelR * 0.36);
    ellipse(0, 0, this.wheelR * 0.22, this.wheelR * 0.22);
    const cr = this.wheelR * 0.08;
    strokeWeight(2);
    line(-cr, 0, cr, 0); line(0, -cr, 0, cr);
    pop();

    noFill(); stroke('#ffd700'); strokeWeight(5);
    ellipse(this.cx, this.cy, this.wheelR * 2.06, this.wheelR * 2.06);
    stroke('#7a6020'); strokeWeight(2);
    ellipse(this.cx, this.cy, this.wheelR * 2.14, this.wheelR * 2.14);

    noStroke(); fill('#ffd700');
    triangle(this.cx - 50, this.cy - this.wheelR - 32,
             this.cx + 50, this.cy - this.wheelR - 32,
             this.cx,      this.cy - this.wheelR - 4);
  }

  _drawBall() {
    if (!this.ballActive) return;
    const bx = this.cx + this.ballR * Math.cos(this.ballAngle);
    const by = this.cy + this.ballR * Math.sin(this.ballAngle);
    noStroke(); fill(0, 0, 0, 80); ellipse(bx + 4, by + 6, 28, 28);
    fill(230, 230, 240);           ellipse(bx, by, 28, 28);
    fill(255, 255, 255, 180);      ellipse(bx - 4, by - 4, 12, 12);
  }

  _drawPanel() {
    const px = this.cx + this.wheelR + 202;
    const pw = W - px - 72;
    const py = H/2 - 220;

    fill(10, 20, 10, 210); noStroke();
    rect(px, py, pw, 480, 20);
    stroke('#ffd700'); strokeWeight(2); noFill();
    rect(px, py, pw, 480, 20);

    fill(255, 215, 0); noStroke();
    textAlign(CENTER, TOP); textSize(30); textStyle(BOLD);
    text('◎ ROULETTE', px + pw/2, py + 24);
    textStyle(NORMAL);

    fill(180, 180, 180); textSize(22); textAlign(CENTER);
    if (this.state === 'IDLE') text('Choisissez votre mise :', px + pw/2, py + 72);
    else if (this.state === 'SPIN') text('La bille roule…', px + pw/2, py + 72);

    const bets = [
      ['ROUGE', color(172, 22, 22),  '1 Rouge'],
      ['NOIR',  color(22, 22, 22),   '2 Noir'],
      ['VERT',  color(16, 128, 16),  '3 Zéro'],
    ];
    for (let i = 0; i < 3; i++) {
      const by2 = py + 116 + i * 72;
      const sel = this.bet === bets[i][0];
      fill(bets[i][1]);
      stroke(sel ? color(255, 255, 0) : color(70, 70, 70));
      strokeWeight(sel ? 5 : 2);
      rect(px + 72, by2, pw - 144, 56, 10);
      fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(24);
      text(`[${bets[i][2]}]`, px + pw/2, by2 + 28);
    }

    const ry = py + 116 + 3 * 72 + 16;
    if (this.state === 'IDLE') {
      fill(100, 60, 200); noStroke();
      rect(px + 72, ry, pw - 144, 60, 10);
      fill(255); textAlign(CENTER, CENTER); textSize(22);
      text('[Espace] Lancer', px + pw/2, ry + 30);
    } else if (this.state === 'RESULT') {
      const wc = this.won ? color(72, 255, 72) : color(255, 90, 90);
      fill(wc); noStroke(); textAlign(CENTER, CENTER); textSize(22);
      text(this.winMsg, px + pw/2, ry + 30, pw - 144, 80);
      if (this.won) {
        fill(255, 210, 30); textSize(20);
        text("🥇 +1 Lingot d'or !", px + pw/2, ry + 88);
        let secs = max(0, ceil((181 - this.exitTimer) / 60));
        fill(160, 160, 210); textSize(20);
        text('Retour au casino dans ' + secs + 's…', px + pw/2, ry + 122);
      }
    }
  }
}

// ── Délégation souris vers le jeu actif ──────────────────────
// Inverse la transformation GAME_SCALE pour obtenir les coords jeu
function _unscale(v, c){ return c + (v-c)/GAME_SCALE; }

function mousePressed() {
  _startBgMusic();
  if (gstate === 'BLACKJACK' && currentGame instanceof Blackjack)
    currentGame.onMousePressed(_unscale(mouseX,W/2), _unscale(mouseY,H/2));
  if (gstate === 'SLOTS' && currentGame instanceof Slots)
    currentGame.onMousePressed(_unscale(mouseX,W/2), _unscale(mouseY,H/2));
  if (gstate === 'ROULETTE' && currentGame instanceof Roulette)
    currentGame.onMousePressed(_unscale(mouseX,W/2), _unscale(mouseY,H/2));
}
function mouseDragged() {
  if (gstate === 'SLOTS' && currentGame instanceof Slots)
    currentGame.onMouseDragged(_unscale(mouseX,W/2), _unscale(mouseY,H/2));
  if (gstate === 'ROULETTE' && currentGame instanceof Roulette)
    currentGame.onMouseDragged(_unscale(mouseX,W/2), _unscale(mouseY,H/2),
                               _unscale(pmouseX,W/2), _unscale(pmouseY,H/2));
}
function mouseReleased() {
  if (gstate === 'SLOTS' && currentGame instanceof Slots)
    currentGame.onMouseReleased();
  if (gstate === 'ROULETTE' && currentGame instanceof Roulette)
    currentGame.onMouseReleased();
}

class Quete5 extends Quest {
  constructor() {
    super({
      id: 'q5',
      title: 'Quête 5 · Le Simon coloré',
      author: 'Evan',
      progressPercent: 85,
      parcelName: 'Des piles',
      npcName: 'Fabricant de jouets',
      briefing:
        "Livre ces piles au fabricant de jouets. Il veut tester sa dernière création : un Simon coloré. Mémorise la séquence puis clique les mêmes boutons dans le même ordre.",
      successText:
        "Bravo, vous avez reproduit la séquence ! Le jouet fonctionne, les piles sont livrées.",
      mapLocation: { x: 4598, z: 1452 },
      locationLabel: 'Atelier du fabricant'
    });

    this.COLORS = {
      rose:      '#ff7ad1',
      violet:    '#cb6ce6',
      turquoise: '#29ffdf',
      orange:    '#ffbd59',
      jaune:     '#fff854',
      noir:      '#0a0a14'
    };

    this.SEQUENCE_LENGTH = 4;

    this.buttons = [];
    this.sequence = [];
    this.playerInput = [];

    this.phase = 'IDLE';
    this.activeButton = null;
    this.flashAll = 0;
    this.shake = 0;
    this.sparks = [];

    this.oscillator = null;
    this._finishing = false;
    this._timeouts = [];
  }

  setup(p) {
    super.setup(p);
    this._finishing = false;
    this.sequence = [];
    this.playerInput = [];
    this.phase = 'IDLE';
    this.activeButton = null;
    this.flashAll = 0;
    this.shake = 0;
    this.sparks = [];

    this._buildButtons(p);

    try {
      p.userStartAudio();
      this.oscillator = new p5.Oscillator('triangle');
      this.oscillator.start();
      this.oscillator.amp(0);
    } catch (e) {
      console.warn('[Q5] oscillator init failed', e);
    }

    this._generateSequence();
    this._scheduleTimeout(() => this._beginPlayback(), 1000);
  }

  cleanup(p) {
    super.cleanup(p);
    this._timeouts.forEach(t => clearTimeout(t));
    this._timeouts = [];
    if (this.oscillator) {
      try { this.oscillator.amp(0, 0); this.oscillator.stop(); } catch (e) {}
      this.oscillator = null;
    }
    this.buttons = [];
    this.sparks = [];
  }

  _scheduleTimeout(fn, ms) {
    const t = setTimeout(() => {
      this._timeouts = this._timeouts.filter(x => x !== t);
      fn();
    }, ms);
    this._timeouts.push(t);
    return t;
  }

  _buildButtons(p) {
    const cx = p.width / 2;
    const cy = p.height / 2;
    const size = Math.min(p.width * 0.32, p.height * 0.34);
    const gap = Math.max(18, size * 0.05);

    const layout = [
      { id: 0, color: this.COLORS.turquoise, freq: 440, dx: -1, dy: -1, label: 'A4' },
      { id: 1, color: this.COLORS.rose,      freq: 554, dx:  0, dy: -1, label: 'C#5' },
      { id: 2, color: this.COLORS.orange,    freq: 659, dx: -1, dy:  0, label: 'E5' },
      { id: 3, color: this.COLORS.violet,    freq: 880, dx:  0, dy:  0, label: 'A5' }
    ];

    this.buttons = layout.map(b => ({
      ...b,
      x: cx + b.dx * (size + gap / 2),
      y: cy + b.dy * (size + gap / 2),
      w: size,
      h: size,
      lit: 0
    }));
  }

  _generateSequence() {
    this.sequence = [];
    let last = -1;
    for (let i = 0; i < this.SEQUENCE_LENGTH; i++) {
      let next;
      do {
        next = Math.floor(Math.random() * 4);
      } while (next === last);
      this.sequence.push(next);
      last = next;
    }
  }

  _beginPlayback() {
    if (this._finishing) return;
    this.phase = 'PLAYING';
    this.playerInput = [];
    this._playStep(0);
  }

  _playStep(idx) {
    if (this._finishing) return;
    if (idx >= this.sequence.length) {
      this.phase = 'AWAITING';
      return;
    }
    const btnId = this.sequence[idx];
    this._lightButton(btnId, 450);
    this._scheduleTimeout(() => this._playStep(idx + 1), 700);
  }

  _lightButton(btnId, durationMs) {
    const btn = this.buttons[btnId];
    if (!btn) return;
    btn.lit = durationMs;
    this.activeButton = btnId;
    this._playTone(btn.freq, durationMs);
  }

  _playTone(freq, durationMs) {
    if (!this.oscillator) return;
    try {
      this.oscillator.freq(freq);
      this.oscillator.amp(0.28, 0.015);
      this._scheduleTimeout(() => {
        if (this.oscillator) this.oscillator.amp(0, 0.08);
      }, durationMs);
    } catch (e) {}
  }

  _registerPlayerHit(btnId, p) {
    if (this.phase !== 'AWAITING' || this._finishing) return;
    this._lightButton(btnId, 250);
    this.playerInput.push(btnId);

    const stepIdx = this.playerInput.length - 1;
    if (this.playerInput[stepIdx] !== this.sequence[stepIdx]) {
      this._fail(p);
      return;
    }

    if (this.playerInput.length === this.sequence.length) {
      this._succeed(p);
    }
  }

  _succeed(p) {
    this.phase = 'SUCCESS';
    this._finishing = true;
    this._spawnConfetti(p);
    this._scheduleTimeout(() => this.complete(), 1800);
  }

  _fail(p) {
    this.phase = 'FAIL';
    this.flashAll = 30;
    this.shake = 20;
    try {
      if (this.oscillator) {
        this.oscillator.freq(110);
        this.oscillator.amp(0.35, 0.02);
        this._scheduleTimeout(() => { if (this.oscillator) this.oscillator.amp(0, 0.2); }, 400);
      }
    } catch (e) {}
    this._scheduleTimeout(() => this._beginPlayback(), 1600);
  }

  _spawnConfetti(p) {
    for (let i = 0; i < 60; i++) {
      const ang = p.random(p.TWO_PI);
      const spd = p.random(3, 9);
      this.sparks.push({
        x: p.width / 2,
        y: p.height / 2,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        color: [this.COLORS.turquoise, this.COLORS.rose, this.COLORS.orange, this.COLORS.violet, this.COLORS.jaune][i % 5]
      });
    }
  }

  update(p) {
    const dt = p.deltaTime || 16;
    for (const btn of this.buttons) {
      if (btn.lit > 0) btn.lit = Math.max(0, btn.lit - dt);
    }
    if (this.flashAll > 0) this.flashAll = Math.max(0, this.flashAll - 1);
    if (this.shake > 0)    this.shake    = Math.max(0, this.shake    - 1);

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx; s.y += s.vy;
      s.vy += 0.2;
      s.life -= 0.018;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
  }

  draw(p) {
    p.background(this.COLORS.noir);

    p.push();
    if (this.shake > 0) {
      p.translate(p.random(-this.shake, this.shake) * 0.4, p.random(-this.shake, this.shake) * 0.4);
    }

    this._drawGrid(p);
    this._drawHeader(p);
    this._drawProgress(p);
    for (const btn of this.buttons) this._drawButton(p, btn);
    this._drawSparks(p);
    this._drawStatus(p);
    this._drawJaxxSpectator(p);

    if (this.flashAll > 0) {
      p.noStroke();
      p.fill(255, 80, 120, (this.flashAll / 30) * 180);
      p.rect(0, 0, p.width, p.height);
    }

    p.pop();
  }

  _drawGrid(p) {
    p.push();
    p.stroke(this.COLORS.turquoise);
    const spacing = 60;
    p.strokeWeight(0.6);
    for (let x = 0; x < p.width; x += spacing) {
      p.stroke(41, 255, 223, 30);
      p.line(x, 0, x, p.height);
    }
    for (let y = 0; y < p.height; y += spacing) {
      p.stroke(41, 255, 223, 30);
      p.line(0, y, p.width, y);
    }
    p.pop();
    p.noStroke();
  }

  _drawHeader(p) {
    p.push();
    const hh = Math.max(36, p.height * 0.085);
    p.noStroke();
    p.fill('#0e0e1a');
    p.rect(0, 0, p.width, hh);
    p.fill(this.COLORS.turquoise);
    p.rect(0, hh - 2, p.width, 2);
    p.textFont('Montserrat');
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(this.COLORS.turquoise);
    p.textSize(Math.max(14, hh * 0.38));
    p.text('SIMON · TEST DU JOUET', p.width / 2, hh / 2);
    p.pop();
  }

  _drawProgress(p) {
    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    const dotSize = 18;
    const gap = 12;
    const totalW = this.SEQUENCE_LENGTH * dotSize + (this.SEQUENCE_LENGTH - 1) * gap;
    let x = p.width / 2 - totalW / 2 + dotSize / 2;
    const y = p.height * 0.14;
    for (let i = 0; i < this.SEQUENCE_LENGTH; i++) {
      const filled = i < this.playerInput.length;
      const current = (this.phase === 'AWAITING' && i === this.playerInput.length);
      const pulse = current ? 1.2 + 0.2 * Math.sin(p.frameCount * 0.2) : 1;
      p.noStroke();
      p.fill(filled ? this.COLORS.turquoise : 'rgba(255,255,255,0.15)');
      p.ellipse(x, y, dotSize * pulse, dotSize * pulse);
      if (current) {
        p.noFill();
        p.stroke(this.COLORS.turquoise);
        p.strokeWeight(2);
        p.ellipse(x, y, dotSize * 2.2, dotSize * 2.2);
        p.noStroke();
      }
      x += dotSize + gap;
    }
    p.pop();
  }

  _drawButton(p, btn) {
    const litT = Math.max(0, btn.lit) / 450;
    const c = p.color(btn.color);
    const r = p.red(c), g = p.green(c), b = p.blue(c);
    const scale = 1 + litT * 0.05;

    p.push();
    p.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
    p.scale(scale);

    p.noStroke();
    p.fill(r, g, b, 30 + litT * 90);
    p.rect(-btn.w / 2 - 14, -btn.h / 2 - 14, btn.w + 28, btn.h + 28, 22);

    const dim = 0.32 + litT * 0.68;
    p.fill(r * dim, g * dim, b * dim);
    p.rect(-btn.w / 2, -btn.h / 2, btn.w, btn.h, 16);

    if (litT > 0) {
      p.fill(255, 255, 255, 110 * litT);
      p.rect(-btn.w / 2 + 10, -btn.h / 2 + 10, btn.w - 20, btn.h * 0.32, 12);
    }

    p.noFill();
    p.stroke(r, g, b, 220);
    p.strokeWeight(litT > 0 ? 5 : 2);
    p.rect(-btn.w / 2, -btn.h / 2, btn.w, btn.h, 16);

    p.fill(r, g, b, 180);
    p.noStroke();
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(12);
    p.text(btn.label, -btn.w / 2 + 12, -btn.h / 2 + 12);

    p.pop();
    p.noStroke();
  }

  _drawSparks(p) {
    for (const s of this.sparks) {
      const c = p.color(s.color);
      p.fill(p.red(c), p.green(c), p.blue(c), 255 * s.life);
      p.noStroke();
      p.ellipse(s.x, s.y, 6 * s.life + 2, 6 * s.life + 2);
    }
  }

  _drawStatus(p) {
    p.push();
    p.textAlign(p.CENTER, p.CENTER);

    if (this.phase === 'SUCCESS') {
      const pulse = 0.6 + 0.4 * Math.sin(p.frameCount * 0.15);
      p.fill(255, 248, 84, 255 * pulse);
      p.textFont('Montserrat');
      p.textStyle(p.BOLD);
      p.textSize(Math.max(22, p.height * 0.052));
      p.text('SÉQUENCE RÉUSSIE !', p.width / 2, p.height * 0.93);
      p.pop();
      return;
    }

    let msg = '';
    let col = this.COLORS.turquoise;
    if      (this.phase === 'IDLE')     { msg = 'Prépare-toi…'; }
    else if (this.phase === 'PLAYING')  { msg = 'Écoute et regarde la séquence'; col = this.COLORS.jaune; }
    else if (this.phase === 'AWAITING') { msg = `À toi de jouer · ${this.playerInput.length} / ${this.sequence.length}`; }
    else if (this.phase === 'FAIL')     { msg = 'Raté ! On rejoue la séquence…'; col = this.COLORS.rose; }

    const sz = Math.max(14, p.height * 0.024);
    p.textFont('Inter');
    p.textStyle(p.NORMAL);
    p.textSize(sz);
    const tw = p.textWidth(msg) + sz * 3.5;
    const th = sz * 2.2;
    const bx = p.width / 2 - tw / 2;
    const by = p.height * 0.905 - th / 2;
    dsPanel(p, bx, by, tw, th, { cut: 8, fill: '#0e0e1a', stroke: col });
    p.noStroke();
    p.fill(col);
    p.textFont('Inter');
    p.textStyle(p.NORMAL);
    p.textSize(sz);
    p.text(msg, p.width / 2, p.height * 0.905);
    p.pop();
    p.noStroke();
  }

  _drawJaxxSpectator(p) {
    const idleWalk = Math.sin(p.frameCount * 0.04) * 0.3;
    drawJaxx2D(p, p.width * 0.07, p.height * 0.65, 0.6, 0, idleWalk, 1);
  }

  _hitTest(p, mx, my) {
    for (const btn of this.buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        return btn.id;
      }
    }
    return -1;
  }

  onMousePressed(p) {
    if (this.phase !== 'AWAITING') return;
    const id = this._hitTest(p, p.mouseX, p.mouseY);
    if (id !== -1) this._registerPlayerHit(id, p);
  }
  onMouseDragged(p) {}
  onMouseReleased(p) {}
  onKeyPressed(p) {
    if (this.phase !== 'AWAITING') return;
    const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'q': 0, 'Q': 0, 'd': 1, 'D': 1, 'a': 2, 'A': 2, 'e': 3, 'E': 3 };
    if (map[p.key] !== undefined) this._registerPlayerHit(map[p.key], p);
  }
  onKeyReleased(p) {}
  onWindowResized(p) {
    this._buildButtons(p);
  }
}

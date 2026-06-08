class Quete4 extends Quest {
  constructor() {
    super({
      id: 'q4',
      title: 'Quête 4Le gramophone',
      author: 'Siwar',
      progressPercent: 70,
      parcelName: 'Un gramophone',
      npcName: 'Musicien',
      briefing:
        "Livre ce gramophone au musicien. Il veut que tu le testes : lance le vinyle à la bonne vitesse avec tes mains avant la livraison.",
      successText:
        "Le gramophone tourne à la perfection ! Le musicien est ravi de sa nouvelle acquisition.",
      mapLocation: { x: 3800, z: 1540 },
      locationLabel: 'Place du vinyle'
    });

    this.COLORS = {
      noir: '#0a0a0f', bleu: '#191970', rose: '#ff7ad1',
      violet: '#cb6ce6', turquoise: '#29ffdf', orange: '#ffbd59', jaune: '#fff854'
    };
    this.REF_W = 800;
    this.REF_H = 600;

    this.video = null;
    this.handPose = null;
    this.hands = [];
    this.song = null;
    this.vinylAngle = 0;
    this.vinylSpeed = 0;
    this.prevHandAngle = null;
    this.smoothedFingerX = null;
    this.smoothedFingerY = null;
    this.smoothedCursorRate = 0;
    this.isMouseDragging = false;
    this.prevMouseAngle = null;
    this.detectionCounter = 0;
    this.detectionRequired = 2;
    this.progress = 0;
    this.isQuestComplete = false;
    this.gameStarted = false;
    this.timeOffset = 0;
    this._finishing = false;
    this._winTimeout = null;
  }

  setup(p) {
    super.setup(p);
    this.gameStarted = false;
    this.isQuestComplete = false;
    this.progress = 0;
    this.vinylAngle = 0;
    this.vinylSpeed = 0;
    this.prevHandAngle = null;
    this.smoothedFingerX = null;
    this.smoothedFingerY = null;
    this.smoothedCursorRate = 0;
    this.isMouseDragging = false;
    this.prevMouseAngle = null;
    this.detectionCounter = 0;
    this.timeOffset = 0;
    this._finishing = false;
    this.hands = [];

    try {
      this.song = p.loadSound('assets/sounds/misik-quete4.mp4');
    } catch (e) {
      console.warn('[Q4] loadSound failed', e);
    }

    this.video = p.createCapture(p.VIDEO, () => {
      this.video.size(640, 480);
      this.video.hide();
      try {
        this.handPose = ml5.handPose(() => {
          if (this.video && this.handPose) {
            this.handPose.detectStart(this.video, (results) => {
              if (this.handPose) this.hands = results;
            });
          }
        });
      } catch (e) {
        console.warn('[Q4] handPose init failed', e);
      }
    });
    this.video.hide();
  }

  cleanup(p) {
    super.cleanup(p);
    if (this._winTimeout) { clearTimeout(this._winTimeout); this._winTimeout = null; }
    if (this.handPose) {
      const hp = this.handPose;
      this.handPose = null;
      try { if (hp.detectStop) hp.detectStop(); } catch (e) {}
    }
    if (this.video) {
      try { this.video.remove(); } catch (e) {}
      this.video = null;
    }
    if (this.song) {
      try { if (this.song.isPlaying()) this.song.stop(); } catch (e) {}
      this.song = null;
    }
    this.hands = [];
    this._detectionStarted = false;
  }

  _s(p, v)  { return v * Math.min(p.width / this.REF_W, p.height / this.REF_H); }
  _sx(p, v) { return v * p.width / this.REF_W; }
  _sy(p, v) { return v * p.height / this.REF_H; }

  _layoutZones(p) {
    return { top: this._s(p, 130), bottom: this._s(p, 95), side: this._s(p, 24) };
  }

  _vinylRadius(p) {
    const z = this._layoutZones(p);
    const playW = p.width - z.side * 2;
    const playH = p.height - z.top - z.bottom;
    return Math.min(playW, playH) * 0.36;
  }

  _vinylCenter(p) {
    const z = this._layoutZones(p);
    return { x: p.width / 2, y: z.top + (p.height - z.top - z.bottom) / 2 };
  }

  draw(p) {
    if (!this.gameStarted) {
      this._drawTutorial(p);
      return;
    }

    p.background(this.COLORS.noir);

    if (this.video) {
      p.push();
      p.translate(p.width, 0);
      p.scale(-1, 1);
      p.tint(255, 40);
      p.image(this.video, 0, 0, p.width, p.height);
      p.noTint();
      p.pop();
    }

    const vinyl = this._vinylCenter(p);
    const centerX = vinyl.x;
    const centerY = vinyl.y;
    const touchMin = this._vinylRadius(p) * 0.28;

    if (this.hands.length > 0) {
      const indexFinger = this.hands[0].index_finger_tip;
      if (indexFinger && this.video) {
        const rawX = p.map(indexFinger.x, 0, this.video.width, p.width, 0);
        const rawY = p.map(indexFinger.y, 0, this.video.height, 0, p.height);

        if (this.smoothedFingerX === null) {
          this.smoothedFingerX = rawX;
          this.smoothedFingerY = rawY;
        }
        this.smoothedFingerX = p.lerp(this.smoothedFingerX, rawX, 0.45);
        this.smoothedFingerY = p.lerp(this.smoothedFingerY, rawY, 0.45);

        const d = Math.hypot(this.smoothedFingerX - centerX, this.smoothedFingerY - centerY);
        if (d > touchMin && d < this._vinylRadius(p) * 1.4) {
          const currentAngle = Math.atan2(this.smoothedFingerY - centerY, this.smoothedFingerX - centerX);
          this.detectionCounter++;
          if (this.detectionCounter >= this.detectionRequired) {
            if (this.prevHandAngle !== null) {
              let deltaAngle = currentAngle - this.prevHandAngle;
              if (deltaAngle > p.PI) deltaAngle -= p.TWO_PI;
              if (deltaAngle < -p.PI) deltaAngle += p.TWO_PI;
              deltaAngle = p.constrain(deltaAngle, -0.06, 0.06);
              this.vinylSpeed = p.lerp(this.vinylSpeed, deltaAngle, 0.05);
            }
            this.prevHandAngle = currentAngle;
          }
        }

        p.stroke(this.COLORS.jaune);
        p.strokeWeight(this._s(p, 2));
        p.line(centerX, centerY, this.smoothedFingerX, this.smoothedFingerY);
        p.fill(this.COLORS.turquoise);
        p.noStroke();
        p.circle(this.smoothedFingerX, this.smoothedFingerY, this._s(p, 20));
      }
    } else {
      this.detectionCounter = 0;
      if (!this.isMouseDragging) {
        this.prevHandAngle = null;
        this.smoothedFingerX = null;
        this.smoothedFingerY = null;
        this.vinylSpeed *= 0.95;
      }
    }

    let playbackRate = p.map(this.vinylSpeed, -0.08, 0.08, -1.5, 1.5);
    playbackRate = p.constrain(playbackRate, -2.0, 2.0);

    if (this.song && this.song.isLoaded()) {
      this.song.rate(1);
      if (!this.song.isPlaying() && Math.abs(this.vinylSpeed) > 0.01) this.song.loop();
      else if (this.song.isPlaying() && Math.abs(this.vinylSpeed) <= 0.01) this.song.pause();
    }

    this.timeOffset += 0.005;
    const noiseValue = p.noise(this.timeOffset);
    const biased = p.lerp(0.5, noiseValue, 0.3);
    const dynamicTarget = p.map(biased, 0, 1, 0.4, 1.6);

    this.smoothedCursorRate = p.lerp(this.smoothedCursorRate, playbackRate, 0.06);
    const displayRate = this.smoothedCursorRate;

    const inTargetZone = playbackRate > (dynamicTarget - 0.2) && playbackRate < (dynamicTarget + 0.2);

    if (inTargetZone && !this.isQuestComplete) {
      this.progress += 1.5;
    }
    this.progress = p.constrain(this.progress, 0, 300);
    if (this.progress >= 300) this.isQuestComplete = true;

    this._drawVinyl(p, centerX, centerY);
    this._drawUI(p, displayRate, dynamicTarget);
    this._drawJaxxSpectator(p);

    if (this.isQuestComplete && !this._finishing) {
      this._finishing = true;
      if (this._winTimeout) clearTimeout(this._winTimeout);
      this._winTimeout = setTimeout(() => this.complete(), 2500);
    }
  }

  _drawVinyl(p, x, y) {
    const r = this._vinylRadius(p);
    p.push();
    p.translate(x, y);
    this.vinylAngle += this.vinylSpeed;
    p.rotate(this.vinylAngle);
    p.fill(20);
    p.stroke(this.COLORS.violet); p.strokeWeight(this._s(p, 4));
    p.circle(0, 0, r * 2);
    p.noFill();
    p.stroke(50); p.strokeWeight(this._s(p, 1));
    for (let i = 0.2; i < 0.47; i += 0.04) p.circle(0, 0, r * 2 * i);
    p.fill(this.COLORS.orange); p.noStroke();
    p.circle(0, 0, r * 0.6);
    p.fill(this.COLORS.bleu); p.circle(0, 0, r * 0.2);
    p.fill(this.COLORS.noir); p.circle(0, 0, r * 0.07);
    p.fill(this.COLORS.rose); p.circle(r * 0.33, 0, r * 0.1);
    p.pop();
  }

  _drawUI(p, rate, target) {
    const z = this._layoutZones(p);
    const barWidth = Math.min(p.width * 0.55, this._sx(p, 440));
    const barH = this._s(p, 22);
    const barY = p.height - z.bottom + this._s(p, 18);
    const barR = this._s(p, 10);
    const gaugeW = barWidth;
    const gaugeX = p.width / 2;
    const gaugeTrackY = this._s(p, 72);
    const gaugeH = this._s(p, 16);

    p.fill(this.COLORS.violet);
    p.textSize(this._s(p, 14));
    p.textAlign(p.CENTER, p.BOTTOM);
    p.noStroke();
    p.text('Vitessegarde le point jaune dans la zone turquoise', gaugeX, gaugeTrackY - this._s(p, 8));

    p.fill(this.COLORS.bleu);
    p.rect(gaugeX - gaugeW / 2, gaugeTrackY, gaugeW, gaugeH, this._s(p, 6));

    p.fill(this.COLORS.turquoise);
    let targetStart = p.map(target - 0.2, -1.0, 2.0, 0, gaugeW);
    let targetEnd = p.map(target + 0.2, -1.0, 2.0, 0, gaugeW);
    targetStart = p.constrain(targetStart, 0, gaugeW);
    targetEnd = p.constrain(targetEnd, 0, gaugeW);
    p.rect(gaugeX - gaugeW / 2 + targetStart, gaugeTrackY - this._s(p, 5), targetEnd - targetStart, gaugeH + this._s(p, 10), this._s(p, 6));

    p.fill(this.COLORS.jaune);
    let cursorX = p.map(rate, -1.0, 2.0, 0, gaugeW);
    cursorX = p.constrain(cursorX, 0, gaugeW);
    p.circle(gaugeX - gaugeW / 2 + cursorX, gaugeTrackY + gaugeH / 2, this._s(p, 18));

    p.fill(this.COLORS.violet);
    p.textSize(this._s(p, 14));
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('Progression', gaugeX, barY - this._s(p, 10));
    p.fill(this.COLORS.bleu);
    p.rect(gaugeX - barWidth / 2, barY, barWidth, barH, barR);
    p.fill(this.COLORS.rose);
    const currentProgress = p.map(this.progress, 0, 300, 0, barWidth);
    p.rect(gaugeX - barWidth / 2, barY, currentProgress, barH, barR);

    if (this.isQuestComplete) {
      p.fill(this.COLORS.jaune);
      p.textSize(this._s(p, 36));
      p.textAlign(p.CENTER, p.CENTER);
      p.text('Quête réussie !', gaugeX, gaugeTrackY - this._s(p, 42));
    }
  }

  _drawJaxxSpectator(p) {
    const idleWalk = Math.sin(p.frameCount * 0.04) * 0.3;
    drawJaxx2D(p, p.width * 0.1, p.height * 0.76, 0.65, 0, idleWalk, 1);
  }

  _drawTutorial(p) {
    p.background(DS.bg);
    dsGrid(p);

    const cx  = p.width / 2;
    const sc  = (v) => this._s(p, v);

    const panelW = Math.min(p.width * 0.82, 640);
    const panelH = Math.min(p.height * 0.74, 460);
    const panelX = cx - panelW / 2;
    const panelY = p.height * 0.06;
    dsPanel(p, panelX, panelY, panelW, panelH, { cut: 18 });

    // Title
    p.noStroke();
    p.fill(this.COLORS.turquoise);
    p.textFont('Montserrat');
    p.textStyle(p.BOLD);
    p.textSize(sc(24));
    p.textAlign(p.CENTER, p.TOP);
    p.text('Comment tester le gramophone ?', cx, panelY + sc(18));

    // Divider
    p.stroke(this.COLORS.turquoise);
    p.strokeWeight(1);
    p.line(panelX + 18, panelY + sc(52), panelX + panelW - 18, panelY + sc(52));
    p.noStroke();

    // Steps
    const steps = [
      'Place ta main devant la caméra pour diriger le curseur turquoise.',
      'Fais des cercles avec ton doigt pour faire tourner le vinyle.',
      'Ajuste ta vitesse pour garder le point jaune dans la zone turquoise.',
      'Remplis la barre rose en bas pour valider la livraison.',
    ];
    const lineH = panelH * 0.175;
    for (let i = 0; i < steps.length; i++) {
      const ly = panelY + sc(66) + i * lineH;
      const bx = panelX + sc(20);
      const bw = sc(30);
      // Number badge
      p.noStroke();
      p.fill(this.COLORS.violet);
      p.rect(bx, ly - sc(11), bw, bw, 4);
      p.fill(this.COLORS.turquoise);
      p.textFont('Montserrat');
      p.textStyle(p.BOLD);
      p.textSize(sc(13));
      p.textAlign(p.CENTER, p.CENTER);
      p.text(`0${i + 1}`, bx + bw / 2, ly + sc(4));
      // Instruction text
      p.fill(DS.text);
      p.textFont('Inter');
      p.textStyle(p.NORMAL);
      p.textSize(sc(14));
      p.textAlign(p.LEFT, p.TOP);
      p.text(steps[i], panelX + sc(62), ly - sc(8), panelW - sc(82));
    }

    // CTA button
    const ctaW = Math.min(p.width * 0.42, 310);
    const ctaH = sc(42);
    const ctaX = cx - ctaW / 2;
    const ctaY = panelY + panelH + sc(12);
    p.noStroke();
    p.fill(this.COLORS.turquoise);
    dsCutRect(p, ctaX, ctaY, ctaW, ctaH, 10);
    p.fill(DS.bg);
    p.textFont('Montserrat');
    p.textStyle(p.BOLD);
    p.textSize(sc(16));
    p.textAlign(p.CENTER, p.CENTER);
    p.text('ESPACECommencer', cx, ctaY + ctaH / 2 + 1);
  }

  onMousePressed(p) {
    const vinyl = this._vinylCenter(p);
    const d = p.dist(vinyl.x, vinyl.y, p.mouseX, p.mouseY);
    if (d <= this._vinylRadius(p)) {
      this.isMouseDragging = true;
      this.prevMouseAngle = Math.atan2(p.mouseY - vinyl.y, p.mouseX - vinyl.x);
      this.prevHandAngle = this.prevMouseAngle;
    }
  }

  onMouseDragged(p) {
    if (!this.isMouseDragging) return;
    const vinyl = this._vinylCenter(p);
    const current = Math.atan2(p.mouseY - vinyl.y, p.mouseX - vinyl.x);
    if (this.prevMouseAngle !== null) {
      let delta = current - this.prevMouseAngle;
      if (delta > p.PI) delta -= p.TWO_PI;
      if (delta < -p.PI) delta += p.TWO_PI;
      delta = p.constrain(delta, -0.08, 0.08);
      this.vinylSpeed = p.lerp(this.vinylSpeed, delta, 0.08);
    }
    this.prevMouseAngle = current;
    this.detectionCounter = 0;
  }

  onMouseReleased(p) {
    this.isMouseDragging = false;
    this.prevMouseAngle = null;
  }

  onKeyPressed(p) {
    if (p.key === ' ' || p.keyCode === 32) {
      this.gameStarted = true;
      try { p.userStartAudio(); } catch (e) {}
    }
  }
  onKeyReleased(p) {}
  onWindowResized(p) {}
}

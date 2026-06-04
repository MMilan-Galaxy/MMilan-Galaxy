class Quete3 extends Quest {
  constructor() {
    super({
      id: "q3",
      title: "Quête 3 · Câblage symphonique",
      author: "Evan",
      progressPercent: 55,
      parcelName: "Objet importé de Tron",
      npcName: "Immigré de Tron",
      briefing:
        "Livre cet objet importé de la planète Tron. Avant la livraison, rebranche les câbles entre les pistes et l'enceinte (style Among Us) pour rétablir le son. Utilise tes mains : pince le pouce et l'index pour saisir un câble.",
      successText:
        "Le son est rétabli ! Vous avez livré l'objet de Tron à son nouveau propriétaire.",
      mapLocation: { x: 4378, z: 3036 },
      locationLabel: "Studio sud-est",
    });

    this.COLORS = {
      rose: "#ff7ad1",
      violet: "#cb6ce6",
      turquoise: "#29ffdf",
      orange: "#ffbd59",
      jaune: "#fff854",
      noir: "#0a0a14",
      panel: "rgba(20, 20, 35, 0.85)",
    };
    this.PALETTE = [
      this.COLORS.rose,
      this.COLORS.violet,
      this.COLORS.turquoise,
      this.COLORS.orange,
      this.COLORS.jaune,
    ];

    this.video = null;
    this.handPose = null;
    this.hands = [];

    this.leftWires = [];
    this.rightWires = [];
    this.connections = [];
    this.totalConnections = 5;

    this.draggedWire = null;
    this.dragX = 0;
    this.dragY = 0;

    this.smoothedCursorX = null;
    this.smoothedCursorY = null;
    this.isPinching = false;
    this.pinchRatio = 1;
    this.hoverWireId = null;

    this.oscillator = null;
    this.sparks = [];
    this._finishing = false;
    this._winTimeout = null;

    // Guitar mode (strum the connected cables)
    this.guitarMode = false;
    this.guitarStrumCount = 0;
    this._prevHandY = null;
    this._guitarDone = false;
    this.dwellProgress = 0;
    this.DWELL_DURATION = 1500;
    this.DS_ACCENT = "#F72585"; // Symphonia music accent
  }

  setup(p) {
    super.setup(p);
    this._finishing = false;
    this.connections = [];
    this.sparks = [];
    this.hands = [];
    this.draggedWire = null;
    this.smoothedCursorX = null;
    this.smoothedCursorY = null;
    this.isPinching = false;
    this.guitarMode = false;
    this.guitarStrumCount = 0;
    this._prevHandY = null;
    this._guitarDone = false;
    this.dwellProgress = 0;
    this._loopActive = false;

    this._buildWires(p);

    this.video = p.createCapture(p.VIDEO, () => {
      if (!this.video) return; // quest cleaned up before callback fired
      this.video.size(320, 240);
      this.video.hide();
      try {
        this.handPose = ml5.handPose(() => {
          if (!this.video || !this.handPose || !this._loopActive) return;
          this._detectionLoop();
        });
      } catch (e) {
        console.warn("[Q3] handPose init failed", e);
      }
    });
    this._loopActive = true; // set before capture callback may fire
    this.video.hide();

    try {
      p.userStartAudio();
      this.oscillator = new p5.Oscillator("triangle");
      this.oscillator.start();
      this.oscillator.freq(220);
      this.oscillator.amp(0);
      this._updateHum();
    } catch (e) {
      console.warn("[Q3] oscillator init failed", e);
    }
  }

  _buildWires(p) {
    const colors = [...this.PALETTE];
    const shuffled = [...this.PALETTE];
    do {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(p.random(i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } while (shuffled.every((c, i) => c === colors[i]));

    this._positionWires(p, colors, shuffled);
  }

  _positionWires(p, leftColors, rightColors) {
    const panel = this._panelRect(p);
    const margin = panel.h * 0.08;
    const count = this.totalConnections;
    const spacing = (panel.h - margin * 2) / (count - 1);
    const startY = panel.y + margin;
    const leftX = panel.x + panel.w * 0.1;
    const rightX = panel.x + panel.w * 0.9;

    if (!this.leftWires.length) {
      this.leftWires = leftColors.map((c, i) => ({
        id: i,
        color: c,
        x: leftX,
        y: startY + i * spacing,
        connectedTo: null,
      }));
      this.rightWires = rightColors.map((c, i) => ({
        id: i,
        color: c,
        x: rightX,
        y: startY + i * spacing,
        takenBy: null,
      }));
    } else {
      this.leftWires.forEach((w, i) => {
        w.x = leftX;
        w.y = startY + i * spacing;
      });
      this.rightWires.forEach((w, i) => {
        w.x = rightX;
        w.y = startY + i * spacing;
      });
    }
  }

  _panelRect(p) {
    return {
      x: p.width * 0.12,
      y: p.height * 0.12,
      w: p.width * 0.76,
      h: p.height * 0.72,
    };
  }

  // ─── Audio ────────────────────────────────────────────────────────────────

  _getAudioCtx() {
    try {
      if (typeof getAudioContext === "function") return getAudioContext();
      if (window.p5 && p5.soundOut) return p5.soundOut.audiocontext;
      return new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }

  // Karplus-Strong plucked string synthesis
  _playGuitarPluck(freq) {
    try {
      const ctx = this._getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const sr = ctx.sampleRate;
      const period = Math.round(sr / freq);
      const len = Math.min(sr * 3, period * 180);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
      for (let i = period; i < len; i++) {
        d[i] = 0.996 * ((d[i - period] + d[i - period + 1]) * 0.5);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
    } catch (e) {
      console.warn("[Q3] guitar pluck failed", e);
    }
  }

  _colorToFreq(color) {
    const map = {
      "#ff7ad1": 196.0,   // rose   → G3
      "#cb6ce6": 246.94,  // violet → B3
      "#29ffdf": 329.63,  // turquoise → E4
      "#ffbd59": 146.83,  // orange → D3
      "#fff854": 220.0,   // jaune  → A3
    };
    return map[color] || 220.0;
  }

  // ─── Guitar mode ──────────────────────────────────────────────────────────

  _initGuitarMode(p) {
    this.guitarMode = true;
    this.dwellProgress = 0;

    // Victory arpeggio on the connected cables
    this.connections.forEach((conn, i) => {
      setTimeout(
        () => this._playGuitarPluck(this._colorToFreq(conn.left.color)),
        i * 100,
      );
    });
  }

  _updateGuitar(p) {
    if (!this.guitarMode || this._guitarDone) return;

    // Decay all vibrations
    for (const conn of this.connections) conn.vibration *= 0.94;

    if (this.smoothedCursorY === null) {
      this._prevHandY = null;
      this.dwellProgress = Math.max(0, this.dwellProgress - p.deltaTime / 600);
      return;
    }

    // ── Dwell button ──────────────────────────────────────────────────────
    const btn = this._nextBtnPos(p);
    const inBtn =
      this.smoothedCursorX >= btn.x &&
      this.smoothedCursorX <= btn.x + btn.w &&
      this.smoothedCursorY >= btn.y &&
      this.smoothedCursorY <= btn.y + btn.h;
    if (inBtn) {
      this.dwellProgress = Math.min(
        1,
        this.dwellProgress + p.deltaTime / this.DWELL_DURATION,
      );
      if (this.dwellProgress >= 1) {
        this._guitarDone = true;
        this.complete();
        return;
      }
    } else {
      this.dwellProgress = Math.max(0, this.dwellProgress - p.deltaTime / 600);
    }

    // ── Strum detection ───────────────────────────────────────────────────
    const prevY =
      this._prevHandY !== null ? this._prevHandY : this.smoothedCursorY;
    const currY = this.smoothedCursorY;
    const dy = Math.abs(currY - prevY);

    for (const conn of this.connections) {
      // Use the bezier midpoint Y (= average of left and right Y endpoints)
      const midY = (conn.left.y + conn.right.y) / 2;
      const crossed =
        (prevY < midY && currY >= midY) || (prevY > midY && currY <= midY);
      const fast = dy > 6;
      const notRecent = p.frameCount - conn.lastStrumFrame > 12;

      if (crossed && fast && notRecent) {
        conn.vibration = 1.0;
        conn.lastStrumFrame = p.frameCount;
        conn.strummed = true;
        this._playGuitarPluck(this._colorToFreq(conn.left.color));
        this.guitarStrumCount++;
      }
    }

    this._prevHandY = currY;
  }

  _nextBtnPos(p) {
    const h = 52;
    // Right strip outside the cable panel (panel ends at 88% width)
    const x = p.width * 0.885;
    const w = p.width - x - 14;
    return {
      x,
      y: p.height * 0.5 - h / 2,
      w: Math.max(w, 100),
      h,
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(p) {
    this._updateSparks(p);

    if (!this.hands || this.hands.length === 0) {
      if (this.isPinching && this.draggedWire) this._releaseDrag(p);
      this.isPinching = false;
      this.pinchRatio = 1;
      if (this.guitarMode) this._prevHandY = null;
      return;
    }

    const hand = this.hands[0];
    const index = hand.index_finger_tip;
    const thumb = hand.thumb_tip;
    const wrist = hand.wrist;
    const midMcp = hand.middle_finger_mcp;
    if (!index || !thumb || !this.video) return;

    const rawX = p.map(index.x, 0, this.video.width, p.width, 0);
    const rawY = p.map(index.y, 0, this.video.height, 0, p.height);

    if (this.smoothedCursorX === null) {
      this.smoothedCursorX = rawX;
      this.smoothedCursorY = rawY;
    }
    this.smoothedCursorX = p.lerp(this.smoothedCursorX, rawX, 0.5);
    this.smoothedCursorY = p.lerp(this.smoothedCursorY, rawY, 0.5);

    const pinchRaw = Math.hypot(index.x - thumb.x, index.y - thumb.y);
    let palmSize = 60;
    if (wrist && midMcp) {
      palmSize = Math.hypot(wrist.x - midMcp.x, wrist.y - midMcp.y);
    }
    this.pinchRatio = palmSize > 1 ? pinchRaw / palmSize : 1;
    const wasPinching = this.isPinching;
    if (wasPinching) {
      this.isPinching = this.pinchRatio < 0.65;
    } else {
      this.isPinching = this.pinchRatio < 0.45;
    }

    if (this.guitarMode) {
      this._updateGuitar(p);
      return;
    }

    this._updateHover();

    if (this.isPinching && !wasPinching) {
      this._tryGrab(this.smoothedCursorX, this.smoothedCursorY);
    }
    if (this.isPinching && this.draggedWire) {
      this.dragX = this.smoothedCursorX;
      this.dragY = this.smoothedCursorY;
    }
    if (!this.isPinching && wasPinching && this.draggedWire) {
      this._releaseDrag(p);
    }
  }

  _updateHover() {
    if (this.draggedWire || this.smoothedCursorX === null) {
      this.hoverWireId = null;
      return;
    }
    let bestId = null;
    let bestDist = Infinity;
    for (const wire of this.leftWires) {
      if (wire.connectedTo !== null) continue;
      const d = Math.hypot(
        this.smoothedCursorX - wire.x,
        this.smoothedCursorY - wire.y,
      );
      if (d < 140 && d < bestDist) {
        bestDist = d;
        bestId = wire.id;
      }
    }
    this.hoverWireId = bestId;
  }

  _tryGrab(x, y) {
    const grab = 130;
    let bestWire = null;
    let bestDist = Infinity;
    for (const wire of this.leftWires) {
      if (wire.connectedTo !== null) continue;
      const d = Math.hypot(x - wire.x, y - wire.y);
      if (d < grab && d < bestDist) {
        bestDist = d;
        bestWire = wire;
      }
    }
    if (bestWire) {
      this.draggedWire = bestWire;
      this.dragX = x;
      this.dragY = y;
    }
  }

  _releaseDrag(p) {
    const wire = this.draggedWire;
    this.draggedWire = null;
    if (!wire) return;

    const snap = 90;
    for (const rw of this.rightWires) {
      if (rw.takenBy !== null) continue;
      if (Math.hypot(this.dragX - rw.x, this.dragY - rw.y) >= snap) continue;
      if (rw.color !== wire.color) continue;

      wire.connectedTo = rw.id;
      rw.takenBy = wire.id;
      this.connections.push({
        left: wire,
        right: rw,
        flowPhase: p.random(1000),
        vibration: 0,
        lastStrumFrame: -999,
        strummed: false,
      });
      this._spawnSparks(p, rw.x, rw.y, rw.color);
      this._playGuitarPluck(this._colorToFreq(wire.color));
      this._updateHum();

      if (
        this.connections.length === this.totalConnections &&
        !this._finishing
      ) {
        this._finishing = true;
        if (this._winTimeout) clearTimeout(this._winTimeout);
        this._winTimeout = null;
        this._initGuitarMode(p);
      }
      return;
    }
  }

  _spawnSparks(p, x, y, color) {
    for (let i = 0; i < 16; i++) {
      const ang = p.random(p.TWO_PI);
      const spd = p.random(2, 6);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        color,
      });
    }
  }

  _updateSparks(p) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.15;
      s.life -= 0.03;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
  }

  _updateHum() {
    if (!this.oscillator) return;
    const ratio = this.connections.length / this.totalConnections;
    if (ratio >= 1) {
      this.oscillator.amp(0, 0.8);
    } else {
      this.oscillator.freq(220 + ratio * 220);
      this.oscillator.amp(0.055 - ratio * 0.04, 0.3);
    }
  }

  // Manual detect() loop — avoids ml5 detectStart's uncontrollable internal loop
  _detectionLoop() {
    if (!this._loopActive || !this.handPose || !this.video) return;
    const hp = this.handPose;
    const vid = this.video;
    hp.detect(vid).then((results) => {
      if (!this._loopActive || this.handPose !== hp) return;
      this.hands = results || [];
      requestAnimationFrame(() => this._detectionLoop());
    }).catch(() => {
      // video removed or model disposed — stop loop silently
    });
  }

  // ─── Design System helpers (Canvas2D) ────────────────────────────────────

  // Chamfered polygon path matching the DS clip-path style
  _dsChampferPath(ctx, x, y, w, h, cut) {
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - cut);
    ctx.lineTo(x + w - cut, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────

  draw(p) {
    p.background(this.COLORS.noir);

    if (this.video) {
      p.push();
      p.translate(p.width, 0);
      p.scale(-1, 1);
      p.tint(255, 28);
      p.image(this.video, 0, 0, p.width, p.height);
      p.noTint();
      p.pop();
    }

    this._drawGrid(p);
    this._positionWires(p, null, null);
    this._drawPanel(p);
    this._drawConnectedWires(p);
    if (this.draggedWire) this._drawDragWire(p);
    this._drawEndpoints(p);
    this._drawSparks(p);
    if (this.guitarMode) this._drawNextButton(p);
    if (this.smoothedCursorX !== null) this._drawCursor(p);
    this._drawHUD(p);
    this._drawJaxxSpectator(p);
  }

  _drawGrid(p) {
    p.push();
    p.strokeWeight(0.6);
    const spacing = 64;
    const fade = 0.35;
    for (let x = 0; x < p.width; x += spacing) {
      p.stroke(41, 255, 223, 50 * fade);
      p.line(x, 0, x, p.height);
    }
    for (let y = 0; y < p.height; y += spacing) {
      p.stroke(41, 255, 223, 50 * fade);
      p.line(0, y, p.width, y);
    }
    const pulse = (p.frameCount * 4) % p.height;
    p.stroke(41, 255, 223, 140);
    p.strokeWeight(1.5);
    p.line(0, pulse, p.width, pulse);
    p.pop();
    p.noStroke();
  }

  _drawPanel(p) {
    const r = this._panelRect(p);
    p.push();

    // Cable area — keep existing visual (turquoise glow, cables live here)
    p.noStroke();
    p.fill(20, 20, 35, 220);
    p.rect(r.x, r.y, r.w, r.h, 18);
    const glow = 0.6 + 0.4 * Math.sin(p.frameCount * 0.05);
    p.noFill();
    p.stroke(41, 255, 223, 80 + 80 * glow);
    p.strokeWeight(8);
    p.rect(r.x, r.y, r.w, r.h, 18);
    p.stroke(this.COLORS.turquoise);
    p.strokeWeight(2);
    p.rect(r.x, r.y, r.w, r.h, 18);
    p.pop();

    // ── DS context-header above panel ─────────────────────────────────────
    const ctx = p.drawingContext;
    const hh = 38;
    const hy = r.y - hh - 6;

    // Left header label (title)
    const titleW = 260;
    const titleX = r.x;
    ctx.save();
    ctx.fillStyle = "rgba(10, 10, 20, 0.92)";
    ctx.fillRect(titleX, hy, titleW, hh);
    // accent top strip (like .context-menu::before)
    ctx.fillStyle = this.DS_ACCENT;
    ctx.fillRect(titleX, hy, titleW, 4);
    // title text
    ctx.font = "700 12px 'Inter', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = this.guitarMode ? this.DS_ACCENT : "#29ffdf";
    ctx.fillText(
      this.guitarMode ? "JOUE DE LA GUITARE !" : "TRON · O2 · CÂBLAGE",
      titleX + 14,
      hy + hh / 2 + 2,
    );
    ctx.restore();

    // Right: connection count — DS badge style (chamfered)
    const countW = 110;
    const countX = r.x + r.w - countW;
    const cut = 10;
    const allDone = this.connections.length === this.totalConnections;
    ctx.save();
    this._dsChampferPath(ctx, countX, hy, countW, hh, cut);
    ctx.fillStyle = "rgba(10, 10, 20, 0.92)";
    ctx.fill();
    // top accent
    ctx.fillStyle = this.DS_ACCENT;
    ctx.fillRect(countX, hy, countW, 4);
    // border
    this._dsChampferPath(ctx, countX, hy, countW, hh, cut);
    ctx.strokeStyle = allDone ? this.DS_ACCENT : "rgba(255,255,255,0.15)";
    ctx.lineWidth = allDone ? 2 : 1;
    ctx.stroke();
    // count text
    ctx.font = "900 14px 'Inter', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = allDone ? this.DS_ACCENT : "#fff854";
    ctx.fillText(
      `${this.connections.length} / ${this.totalConnections}`,
      countX + countW / 2,
      hy + hh / 2 + 2,
    );
    ctx.restore();

    p.noStroke();
  }

  _drawConnectedWires(p) {
    for (const conn of this.connections) {
      this._drawWireCurve(
        p,
        conn.left.x,
        conn.left.y,
        conn.right.x,
        conn.right.y,
        conn.left.color,
        true,
      );
      // Vibration overlay when cable is strummed
      if (conn.vibration > 0.02) {
        this._drawWireVibration(p, conn);
      }
      this._drawFlowDot(p, conn);
    }
  }

  _drawWireVibration(p, conn) {
    const vib = conn.vibration;
    const x1 = conn.left.x;
    const y1 = conn.left.y;
    const x2 = conn.right.x;
    const y2 = conn.right.y;
    const cp = Math.max(60, (x2 - x1) * 0.45);
    const amp = vib * 14;
    const col = p.color(conn.left.color);

    p.push();
    p.noFill();

    // Outer glow
    p.stroke(p.red(col), p.green(col), p.blue(col), 110 * vib);
    p.strokeWeight(18);
    p.beginShape();
    for (let t = 0; t <= 1; t += 0.025) {
      const bx = this._bezier(t, x1, x1 + cp, x2 - cp, x2);
      const by = this._bezier(t, y1, y1, y2, y2);
      p.vertex(bx, by + amp * Math.sin(t * Math.PI * 5 + p.frameCount * 0.3));
    }
    p.endShape();

    // Bright vibrating core
    p.stroke(conn.left.color);
    p.strokeWeight(5);
    p.beginShape();
    for (let t = 0; t <= 1; t += 0.025) {
      const bx = this._bezier(t, x1, x1 + cp, x2 - cp, x2);
      const by = this._bezier(t, y1, y1, y2, y2);
      p.vertex(bx, by + amp * Math.sin(t * Math.PI * 5 + p.frameCount * 0.3));
    }
    p.endShape();

    p.pop();
    p.noStroke();
  }

  _drawDragWire(p) {
    this._drawWireCurve(
      p,
      this.draggedWire.x,
      this.draggedWire.y,
      this.dragX,
      this.dragY,
      this.draggedWire.color,
      false,
    );
  }

  _drawWireCurve(p, x1, y1, x2, y2, color, locked) {
    const cp = Math.max(60, (x2 - x1) * 0.45);
    const c = p.color(color);
    p.push();
    p.noFill();
    p.stroke(p.red(c), p.green(c), p.blue(c), 60);
    p.strokeWeight(20);
    p.bezier(x1, y1, x1 + cp, y1, x2 - cp, y2, x2, y2);
    p.stroke(color);
    p.strokeWeight(10);
    p.bezier(x1, y1, x1 + cp, y1, x2 - cp, y2, x2, y2);
    if (locked) {
      p.stroke(255, 255, 255, 180);
      p.strokeWeight(2);
      p.bezier(x1, y1, x1 + cp, y1, x2 - cp, y2, x2, y2);
    }
    p.pop();
    p.noStroke();
  }

  _drawFlowDot(p, conn) {
    const t = ((p.frameCount + conn.flowPhase) % 90) / 90;
    const cp = Math.max(60, (conn.right.x - conn.left.x) * 0.45);
    const x = this._bezier(
      t,
      conn.left.x,
      conn.left.x + cp,
      conn.right.x - cp,
      conn.right.x,
    );
    const y = this._bezier(
      t,
      conn.left.y,
      conn.left.y,
      conn.right.y,
      conn.right.y,
    );
    p.fill(255);
    p.noStroke();
    p.ellipse(x, y, 12, 12);
    p.fill(conn.left.color);
    p.ellipse(x, y, 6, 6);
  }

  _bezier(t, a, b, c, d) {
    const it = 1 - t;
    return (
      it * it * it * a +
      3 * it * it * t * b +
      3 * it * t * t * c +
      t * t * t * d
    );
  }

  _drawEndpoints(p) {
    for (const wire of this.leftWires) {
      this._drawEndpoint(p, wire, "left");
    }
    for (const wire of this.rightWires) {
      this._drawEndpoint(p, wire, "right");
    }
  }

  _drawEndpoint(p, wire, side) {
    const connected =
      side === "left" ? wire.connectedTo !== null : wire.takenBy !== null;
    const dragged = this.draggedWire === wire;
    const hovered =
      side === "left" && this.hoverWireId === wire.id && !connected;
    const stubLen = 36;

    p.push();
    p.stroke(wire.color);
    p.strokeWeight(14);
    if (side === "left") p.line(wire.x, wire.y, wire.x + stubLen, wire.y);
    else p.line(wire.x, wire.y, wire.x - stubLen, wire.y);

    p.noStroke();
    p.fill(10, 10, 20);
    p.ellipse(wire.x, wire.y, 44, 44);

    const pulse = connected
      ? 1
      : dragged
        ? 1.3
        : hovered
          ? 1.15 + 0.1 * Math.sin(p.frameCount * 0.2)
          : 0.85 + 0.15 * Math.sin(p.frameCount * 0.1);
    p.noFill();
    p.stroke(wire.color);
    p.strokeWeight(hovered || dragged ? 5 : 3);
    p.ellipse(wire.x, wire.y, 44 * pulse, 44 * pulse);

    if (hovered) {
      const c = p.color(wire.color);
      p.stroke(p.red(c), p.green(c), p.blue(c), 90);
      p.strokeWeight(2);
      p.ellipse(wire.x, wire.y, 90, 90);
      p.ellipse(
        wire.x,
        wire.y,
        120 + Math.sin(p.frameCount * 0.15) * 6,
        120 + Math.sin(p.frameCount * 0.15) * 6,
      );
    }

    p.fill(wire.color);
    p.noStroke();
    p.ellipse(wire.x, wire.y, 22, 22);
    p.fill(10, 10, 20);
    p.ellipse(wire.x, wire.y, 8, 8);
    p.pop();
    p.noStroke();
  }

  _drawSparks(p) {
    for (const s of this.sparks) {
      const c = p.color(s.color);
      p.fill(p.red(c), p.green(c), p.blue(c), 255 * s.life);
      p.noStroke();
      p.ellipse(s.x, s.y, 4 + 4 * s.life, 4 + 4 * s.life);
    }
  }

  _drawCursor(p) {
    p.push();
    const x = this.smoothedCursorX;
    const y = this.smoothedCursorY;

    const pinchClose =
      1 - Math.min(1, Math.max(0, (this.pinchRatio - 0.3) / 0.5));

    p.noFill();
    p.stroke(255, 255, 255, 80);
    p.strokeWeight(2);
    p.ellipse(x, y, 40, 40);

    if (this.isPinching) {
      p.stroke(this.COLORS.turquoise);
      p.strokeWeight(4);
      p.ellipse(x, y, 24, 24);
      p.fill(this.COLORS.turquoise);
      p.noStroke();
      p.ellipse(x, y, 12, 12);
    } else {
      const ringR = p.lerp(40, 20, pinchClose);
      p.stroke(this.COLORS.turquoise);
      p.strokeWeight(2 + pinchClose * 3);
      p.ellipse(x, y, ringR, ringR);
      p.fill(255);
      p.noStroke();
      p.ellipse(x, y, 5, 5);
    }
    p.pop();
    p.noStroke();
  }

  _drawHUD(p) {
    const ctx = p.drawingContext;
    const handDetected = this.hands && this.hands.length > 0;

    // ── Bottom strip layout (below panel, above screen edge) ──────────────
    // All UI lives here — cables field stays clear
    const bh = 44;             // badge / toast height
    const cut = 13;            // chamfer size
    const stripY = p.height - bh - 14;

    // ── LEFT : hand-detection badge ───────────────────────────────────────
    const badgeW = 190;
    const badgeX = 16;
    const handColor = handDetected ? "#29ffdf" : "#ff7ad1";
    const handLabel = handDetected ? "✓ MAIN DÉTECTÉE" : "✗ AUCUNE MAIN";

    ctx.save();
    this._dsChampferPath(ctx, badgeX, stripY, badgeW, bh, cut);
    ctx.fillStyle = "rgba(10,10,20,0.90)";
    ctx.fill();
    // left accent strip
    ctx.fillStyle = handColor;
    ctx.fillRect(badgeX, stripY, 4, bh);
    // border
    this._dsChampferPath(ctx, badgeX, stripY, badgeW, bh, cut);
    ctx.strokeStyle = handColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // label
    ctx.font = "700 12px 'Inter', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = handColor;
    ctx.fillText(handLabel, badgeX + 16, stripY + bh / 2);
    ctx.restore();

    // Sub-label: pinch status (cable mode) or strum count (guitar mode)
    if (handDetected) {
      let subLabel, subColor;
      if (this.guitarMode) {
        subLabel = `GRATTAGES : ${this.guitarStrumCount}`;
        subColor = "#fff854";
      } else {
        subLabel = this.isPinching
          ? "⚡ PINCE FERMÉE"
          : `RATIO PINCE : ${this.pinchRatio.toFixed(2)}`;
        subColor = this.isPinching ? "#fff854" : "rgba(140,140,158,0.85)";
      }
      ctx.save();
      ctx.font = "600 10px 'Inter', sans-serif";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillStyle = subColor;
      ctx.fillText(subLabel, badgeX + 12, stripY + bh + 5);
      ctx.restore();
    }

    // ── CENTER : instruction toast ─────────────────────────────────────────
    let instruction = null;
    if (this.guitarMode) {
      instruction = "BOUGE TA MAIN DE HAUT EN BAS POUR GRATTER LES CÂBLES";
    } else if (this.connections.length < this.totalConnections) {
      instruction = "PINCE POUCE + INDEX · RELÂCHE SUR LE SOCKET DE MÊME COULEUR";
    }

    if (instruction) {
      const toastMargin = 12;
      const toastX = badgeX + badgeW + toastMargin;
      // Toast spans to the right strip edge (button is now on right side, not bottom)
      const toastW = p.width * 0.88 - toastX - toastMargin;

      if (toastW > 60) {
        ctx.save();
        // background
        this._dsChampferPath(ctx, toastX, stripY, toastW, bh, cut);
        ctx.fillStyle = "rgba(10,10,20,0.88)";
        ctx.fill();
        // top accent
        ctx.fillStyle = this.DS_ACCENT;
        ctx.fillRect(toastX, stripY, toastW, 3);
        // subtle border
        this._dsChampferPath(ctx, toastX, stripY, toastW, bh, cut);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // text
        ctx.font = "600 11px 'Inter', sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "#8c8c9e";
        ctx.fillText(instruction, toastX + toastW / 2, stripY + bh / 2);
        ctx.restore();
      }
    }

    p.noStroke();
  }

  _drawJaxxSpectator(p) {
    const idleWalk = Math.sin(p.frameCount * 0.04) * 0.3;
    drawJaxx2D(p, p.width * 0.06, p.height * 0.72, 0.6, 0, idleWalk, 1);
  }

  _drawNextButton(p) {
    if (!this.guitarMode) return;
    const btn = this._nextBtnPos(p);
    const prog = this.dwellProgress;
    const ctx = p.drawingContext;
    const cut = 16;

    ctx.save();

    // 1. Dark background
    this._dsChampferPath(ctx, btn.x, btn.y, btn.w, btn.h, cut);
    ctx.fillStyle = "rgba(10,10,20,0.92)";
    ctx.fill();

    // 2. Progress gauge fill (clipped to chamfered shape, left→right)
    if (prog > 0) {
      ctx.save();
      this._dsChampferPath(ctx, btn.x, btn.y, btn.w, btn.h, cut);
      ctx.clip();
      ctx.fillStyle = this.DS_ACCENT;
      ctx.fillRect(btn.x, btn.y, btn.w * prog, btn.h);
      ctx.restore();
    }

    // 3. Top accent strip (4 px, like .context-menu::before)
    ctx.fillStyle = this.DS_ACCENT;
    ctx.fillRect(btn.x, btn.y, btn.w, 4);

    // 4. Border
    this._dsChampferPath(ctx, btn.x, btn.y, btn.w, btn.h, cut);
    ctx.strokeStyle = prog > 0 ? this.DS_ACCENT : "rgba(247,37,133,0.4)";
    ctx.lineWidth = prog > 0 ? 2 : 1.5;
    ctx.stroke();

    // 5. Label — dark on filled bg, white otherwise
    ctx.font = "900 12px 'Inter', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = prog > 0.5 ? "rgba(0,0,0,0.9)" : "#ffffff";
    ctx.fillText(
      "QUÊTE SUIVANTE  ▶",
      btn.x + btn.w / 2,
      btn.y + btn.h / 2 + 1,
    );

    ctx.restore();
    p.noStroke();
  }

  cleanup(p) {
    super.cleanup(p);
    // Stop detection loop first — prevents any pending detect() from firing
    this._loopActive = false;
    this.handPose = null;

    if (this._winTimeout) {
      clearTimeout(this._winTimeout);
      this._winTimeout = null;
    }
    if (this.video) {
      try {
        this.video.remove();
      } catch (e) {}
      this.video = null;
    }
    if (this.oscillator) {
      try {
        this.oscillator.amp(0, 0);
        this.oscillator.stop();
      } catch (e) {}
      this.oscillator = null;
    }
    this.hands = [];
    this.draggedWire = null;
    this.sparks = [];
    this.guitarMode = false;
    this._prevHandY = null;
    this._guitarDone = false;
    this.dwellProgress = 0;
  }

  onMousePressed(p) {
    this._tryGrab(p.mouseX, p.mouseY);
    if (this.draggedWire) {
      this.dragX = p.mouseX;
      this.dragY = p.mouseY;
    }
  }
  onMouseDragged(p) {
    if (this.draggedWire) {
      this.dragX = p.mouseX;
      this.dragY = p.mouseY;
    }
  }
  onMouseReleased(p) {
    if (this.draggedWire) this._releaseDrag(p);
  }
  onKeyPressed(p) {}
  onKeyReleased(p) {}
  onWindowResized(p) {
    this._positionWires(p, null, null);
  }
}

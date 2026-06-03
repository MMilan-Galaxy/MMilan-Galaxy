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

    this._buildWires(p);

    this.video = p.createCapture(p.VIDEO, () => {
      this.video.size(320, 240);
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
        console.warn("[Q3] handPose init failed", e);
      }
    });
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

  update(p) {
    this._updateSparks(p);

    if (!this.hands || this.hands.length === 0) {
      if (this.isPinching && this.draggedWire) this._releaseDrag(p);
      this.isPinching = false;
      this.pinchRatio = 1;
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
      });
      this._spawnSparks(p, rw.x, rw.y, rw.color);
      this._playSuccessTone();
      this._updateHum();

      if (
        this.connections.length === this.totalConnections &&
        !this._finishing
      ) {
        this._finishing = true;
        if (this._winTimeout) clearTimeout(this._winTimeout);
        this._winTimeout = setTimeout(() => this.complete(), 1800);
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
      this.oscillator.freq(220 + ratio * 220); // 220 Hz → 440 Hz au fil des connexions
      this.oscillator.amp(0.055 - ratio * 0.04, 0.3); // léger, s'estompe progressivement
    }
  }

  _playSuccessTone() {
    try {
      const blip = new p5.Oscillator("sine");
      blip.start();
      blip.freq(660);
      blip.amp(0.25, 0.02);
      setTimeout(() => {
        blip.freq(990);
        setTimeout(() => {
          blip.amp(0, 0.15);
          setTimeout(() => {
            try {
              blip.stop();
            } catch (e) {}
          }, 250);
        }, 90);
      }, 80);
    } catch (e) {}
  }

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
    if (this.smoothedCursorX !== null) this._drawCursor(p);
    this._drawHUD(p);
    this._drawJaxxSpectator(p);
  }

  _drawGrid(p) {
    p.push();
    p.stroke(this.COLORS.turquoise);
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

    p.noStroke();
    p.fill(10, 10, 20);
    p.rect(r.x - 1, r.y - 28, 280, 30, 6);
    p.fill(this.COLORS.turquoise);
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(16);
    p.text("TRON · O2 · CÂBLAGE", r.x + 14, r.y - 14);

    p.fill(10, 10, 20);
    p.rect(r.x + r.w - 130, r.y - 28, 130, 30, 6);
    p.fill(this.COLORS.jaune);
    p.textAlign(p.RIGHT, p.CENTER);
    p.textSize(15);
    p.text(
      `${this.connections.length} / ${this.totalConnections}`,
      r.x + r.w - 14,
      r.y - 14,
    );
    p.pop();
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
      this._drawFlowDot(p, conn);
    }
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
    p.push();
    const handDetected = this.hands && this.hands.length > 0;
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(14);
    p.fill(handDetected ? this.COLORS.turquoise : "#ff7ad1");
    p.text(
      handDetected ? "● MAIN DÉTECTÉE" : "○ aucune main détectée",
      20,
      p.height - 70,
    );
    if (handDetected) {
      if (this.isPinching) {
        p.fill(this.COLORS.jaune);
      } else {
        p.fill(255, 220);
      }
      p.text(
        this.isPinching
          ? "✕ PINCE FERMÉE"
          : `pince : ${this.pinchRatio.toFixed(2)} (ferme à 0.45)`,
        20,
        p.height - 50,
      );
    }

    p.textAlign(p.CENTER, p.BOTTOM);
    if (this.connections.length < this.totalConnections) {
      p.fill(this.COLORS.turquoise);
      p.textSize(16);
      p.text(
        "Pince pouce + index sur un câble, relâche au-dessus du socket de la même couleur.",
        p.width / 2,
        p.height - 24,
      );
    } else {
      const glow = 0.6 + 0.4 * Math.sin(p.frameCount * 0.15);
      p.fill(255, 248, 84, 255 * glow);
      p.textSize(36);
      p.text("CIRCUIT RESTAURÉ", p.width / 2, p.height - 40);
    }
    p.pop();
    p.noStroke();
  }

  _drawJaxxSpectator(p) {
    const idleWalk = Math.sin(p.frameCount * 0.04) * 0.3;
    drawJaxx2D(p, p.width * 0.06, p.height * 0.72, 0.6, 0, idleWalk, 1);
  }

  cleanup(p) {
    super.cleanup(p);
    if (this._winTimeout) {
      clearTimeout(this._winTimeout);
      this._winTimeout = null;
    }
    if (this.handPose) {
      const hp = this.handPose;
      this.handPose = null;
      try {
        if (hp.detectStop) hp.detectStop();
      } catch (e) {}
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

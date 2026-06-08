class Quete2 extends Quest {
  constructor() {
    super({
      id: 'q2',
      title: 'Quête 2 · Les Singing Monsters',
      author: 'Siwar',
      progressPercent: 40,
      parcelName: 'Paquet de croquettes (mini notes)',
      npcName: "Éleveur de Singing Monsters",
      briefing:
        "Amène ce paquet de croquettes à l'éleveur. Sur place, replace les Singing Monsters dans le bon ordre pour rétablir la mélodie avant de livrer.",
      successText:
        "Vous avez livré le colis avec brio ! Les Singing Monsters vont pouvoir se rassasier.",
      mapLocation: { x: 2222, z: 1100 },
      locationLabel: 'Scène centrale'
    });

    this.COLORS = {
      noir: '#0a0a0f', bleu: '#191970', rose: '#ff7ad1',
      violet: '#cb6ce6', turquoise: '#29ffdf', orange: '#ffbd59', jaune: '#fff854'
    };
    this.GAME_W = 800;
    this.GAME_H = 600;

    this.gameState = 'EXPLORE';
    this.myMusic = null;
    this.chaosLevel = 0;
    this.hasColis = false;
    this._finishing = false;
    this._winTimeout = null;
    this._failTimeout = null;
    this._winRedirectTimeout = null;

    this.gameScale = 1;
    this.gameOx = 0;
    this.gameOy = 0;

    this.PX = 3;
    this.player = { x: 60, y: 545, speed: 2.2, facing: 'right', moving: false, animFrame: 0, animTick: 0 };

    this.pathPoints = [
      { x: 0,   y: 560 }, { x: 90,  y: 555 }, { x: 180, y: 520 },
      { x: 230, y: 455 }, { x: 290, y: 405 }, { x: 360, y: 330 },
      { x: 430, y: 240 }, { x: 510, y: 285 }, { x: 580, y: 360 },
      { x: 640, y: 405 }, { x: 700, y: 320 }, { x: 745, y: 220 },
      { x: 770, y: 165 }
    ];

    this.groups = [
      { x: 230, y: 455, radius: 55, completed: false,
        palette: [this.COLORS.turquoise, this.COLORS.rose, this.COLORS.orange], bobs: [-12, -8, -10] },
      { x: 430, y: 240, radius: 55, completed: false,
        palette: [this.COLORS.violet, this.COLORS.jaune, this.COLORS.rose], bobs: [-10, -14, -7] },
      { x: 640, y: 405, radius: 55, completed: false,
        palette: [this.COLORS.orange, this.COLORS.turquoise, this.COLORS.violet], bobs: [-9, -13, -11] }
    ];
    this.activeGroupIndex = -1;
    this.nearGroupIndex = -1;
    this.nearHouse = false;

    this.CHAOS_START_DIST = 95;
    this.CHAOS_FULL_DIST = 40;

    this.GROUP_DIFFICULTY = [
      { snap: 28, shuffleSlots: true, monsterSize: 60, spawnX: [70, 730], spawnY: [95, 440], timeLimit: 85, drift: true, driftSpeed: 4.2 },
      { snap: 18, shuffleSlots: true, monsterSize: 50, spawnX: [45, 755], spawnY: [75, 470], timeLimit: 55, drift: true, driftSpeed: 6.5 },
      { snap: 15, shuffleSlots: true, monsterSize: 52, spawnX: [55, 745], spawnY: [85, 465], timeLimit: 60, drift: true, driftSpeed: 7.2 }
    ];

    this.puzzleConfig = null;
    this.puzzleDeadline = 0;
    this.puzzleTimedOut = false;

    this.house = { x: 740, y: 155, w: 90, h: 80 };
    this.slots = [];
    this.monsters = [];
    this.draggedMonster = null;
    this.offsetX = 0; this.offsetY = 0;
    this.isQuestComplete = false;

    this.stars = [];
    this.bushes = [];
    this.grassTufts = [];
    this.lake = { cx: 110, cy: 340, w: 130, h: 70 };
  }

  setup(p) {
    super.setup(p);
    this._finishing = false;
    this.gameState = 'EXPLORE';
    this.chaosLevel = 0;
    this.hasColis = false;
    this.player.x = 60; this.player.y = 545; this.player.facing = 'right'; this.player.animFrame = 0;
    this.groups.forEach(g => g.completed = false);

    try {
      this.myMusic = p.loadSound('assets/sounds/singingMonster.mp4');
    } catch (e) {
      console.warn('[Q2] loadSound failed', e);
    }

    this.stars = [];
    for (let i = 0; i < 55; i++) {
      this.stars.push({ x: p.random(this.GAME_W), y: p.random(0, 220), s: p.random(1.2, 2.6), tw: p.random(p.TWO_PI) });
    }
    const bushSpots = [
      [70, 480], [165, 580], [310, 565], [395, 475], [365, 290],
      [505, 170], [555, 220], [560, 470], [700, 480], [385, 540],
      [115, 240], [205, 290], [475, 380], [725, 525], [620, 545],
      [275, 245], [625, 200], [50, 410], [675, 150], [340, 480]
    ];
    this.bushes = bushSpots.map(b => ({ x: b[0], y: b[1], size: p.random(22, 38), variant: Math.floor(p.random(3)) }));
    this.grassTufts = [];
    for (let i = 0; i < 60; i++) {
      this.grassTufts.push({ x: p.random(this.GAME_W), y: p.random(180, this.GAME_H - 10), h: p.random(4, 9) });
    }
  }

  cleanup(p) {
    super.cleanup(p);
    if (this._winTimeout)          { clearTimeout(this._winTimeout); this._winTimeout = null; }
    if (this._failTimeout)         { clearTimeout(this._failTimeout); this._failTimeout = null; }
    if (this._winRedirectTimeout)  { clearTimeout(this._winRedirectTimeout); this._winRedirectTimeout = null; }
    if (this.myMusic) {
      try { if (this.myMusic.isPlaying()) this.myMusic.stop(); } catch (e) {}
      this.myMusic = null;
    }
    this.draggedMonster = null;
  }

  _updateViewport(p) {
    this.gameScale = Math.min(p.width / this.GAME_W, p.height / this.GAME_H);
    this.gameOx = (p.width - this.GAME_W * this.gameScale) / 2;
    this.gameOy = (p.height - this.GAME_H * this.gameScale) / 2;
  }

  _bx(p, x)  { return x * p.width / this.GAME_W; }
  _by(p, y)  { return y * p.height / this.GAME_H; }
  _bSize(p, v) { return v * Math.min(p.width / this.GAME_W, p.height / this.GAME_H); }
  _skyLine(p) { return p.height * (260 / this.GAME_H); }
  _gameMouseX(p) { return (p.mouseX - this.gameOx) / this.gameScale; }
  _gameMouseY(p) { return (p.mouseY - this.gameOy) / this.gameScale; }

  draw(p) {
    p.background(this.COLORS.noir);
    this._drawBackgroundFullscreen(p);
    this._updateViewport(p);

    p.push();
    p.translate(this.gameOx, this.gameOy);
    p.scale(this.gameScale);

    if (this.gameState === 'EXPLORE') {
      this._drawPath(p);
      this._drawHouse(p);
      this._drawGroups(p);
      this._drawPlayer(p);
      this._updatePlayer(p);
      this._checkProximity(p);
      this._drawHUD(p);
    } else if (this.gameState === 'PUZZLE') {
      this._updatePuzzleDifficultyEffects(p);
      this._checkPuzzleTimer(p);
      this._drawPuzzle(p);
      this._checkWinCondition(p);
    } else if (this.gameState === 'WIN') {
      this._drawPath(p);
      this._drawHouse(p);
      this._drawPlayer(p);
      this._drawWinScreen(p);
      if (!this._finishing) {
        this._finishing = true;
        if (this._winRedirectTimeout) clearTimeout(this._winRedirectTimeout);
        this._winRedirectTimeout = setTimeout(() => this.complete(), 3500);
      }
    }

    p.pop();
    this._applyAudioChaos(p);
  }

  _startMusic() {
    if (this.myMusic && !this.myMusic.isPlaying()) {
      try { this.myMusic.loop(); this.myMusic.setVolume(0.5); } catch (e) {}
    }
  }

  _applyAudioChaos(p) {
    if (!this.myMusic || !this.myMusic.isPlaying()) return;
    if (this.gameState === 'EXPLORE') {
      if (this.chaosLevel > 0) {
        const wobble = 1 + Math.sin(p.frameCount * 0.5) * (this.chaosLevel * 0.5);
        this.myMusic.rate(wobble);
      } else this.myMusic.rate(1);
    } else if (this.gameState === 'PUZZLE' && !this.isQuestComplete) {
      let errors = 0;
      for (const m of this.monsters) if (!m.isLocked) errors++;
      let pressure = (this.activeGroupIndex + 1) * 0.12;
      if (this.puzzleDeadline > 0) {
        const left = (this.puzzleDeadline - p.millis()) / 1000;
        if (left < 20) pressure += (20 - left) * 0.02;
      }
      if (errors === 0) this.myMusic.rate(1 + pressure * 0.3);
      else {
        const puzzleChaos = errors * 0.2 + pressure;
        const wobble = 1 + Math.sin(p.frameCount * 0.5) * puzzleChaos;
        this.myMusic.rate(wobble);
      }
    } else this.myMusic.rate(1);
  }

  _drawBackgroundFullscreen(p) {
    const top = this._skyLine(p);
    for (let y = 0; y < top; y++) {
      const t = y / top;
      const c = p.lerpColor(p.color(this.COLORS.bleu), p.color(this.COLORS.violet), t);
      p.stroke(c);
      p.line(0, y, p.width, y);
    }
    p.noStroke();
    for (const st of this.stars) {
      const a = 150 + Math.sin(p.frameCount * 0.05 + st.tw) * 105;
      p.fill(255, 248, 84, a);
      p.circle(this._bx(p, st.x), this._by(p, st.y), st.s * this._bSize(p, 1));
    }
    p.push();
    p.noStroke();
    p.fill(this.COLORS.noir);
    p.ellipse(this._bx(p, this.lake.cx + 2), this._by(p, this.lake.cy + 4), this._bx(p, this.lake.w + 8), this._by(p, this.lake.h + 8));
    p.fill(this.COLORS.turquoise);
    p.ellipse(this._bx(p, this.lake.cx), this._by(p, this.lake.cy), this._bx(p, this.lake.w), this._by(p, this.lake.h));
    p.fill(255, 255, 255, 110);
    const off = Math.sin(p.frameCount * 0.04) * this._bSize(p, 4);
    p.ellipse(this._bx(p, this.lake.cx - 25) + off, this._by(p, this.lake.cy - 12), this._bx(p, 30), this._by(p, 4));
    p.ellipse(this._bx(p, this.lake.cx + 15) - off, this._by(p, this.lake.cy + 6), this._bx(p, 22), this._by(p, 3));
    p.pop();
    for (let y = top; y < p.height; y++) {
      const t = (y - top) / (p.height - top);
      const c = p.lerpColor(p.color(this.COLORS.bleu), p.color(this.COLORS.noir), t);
      p.stroke(c);
      p.line(0, y, p.width, y);
    }
    p.noStroke();
    for (const b of this.bushes) this._drawBush(p, this._bx(p, b.x), this._by(p, b.y), this._bSize(p, b.size), b.variant);
    p.stroke(this.COLORS.violet);
    p.strokeWeight(this._bSize(p, 2));
    for (const g of this.grassTufts) {
      const gx = this._bx(p, g.x), gy = this._by(p, g.y), gh = this._bSize(p, g.h);
      p.line(gx, gy, gx - this._bSize(p, 2), gy - gh);
      p.line(gx, gy, gx, gy - gh - this._bSize(p, 1));
      p.line(gx, gy, gx + this._bSize(p, 2), gy - gh);
    }
    p.noStroke();
  }

  _drawBush(p, x, y, sz, variant) {
    p.push();
    p.translate(x, y);
    p.noStroke();
    p.fill(this.COLORS.noir);
    p.ellipse(2, sz * 0.35, sz * 1.1, sz * 0.35);
    p.fill(this.COLORS.violet);
    p.circle(-sz * 0.3, 0, sz * 0.85);
    p.circle(sz * 0.3, 0, sz * 0.85);
    p.circle(0, -sz * 0.25, sz);
    p.fill(this.COLORS.rose);
    if (variant === 0) { p.circle(-sz * 0.25, -sz * 0.15, sz * 0.18); p.circle(sz * 0.15, -sz * 0.05, sz * 0.15); }
    else if (variant === 1) p.circle(0, -sz * 0.35, sz * 0.22);
    else p.circle(sz * 0.25, -sz * 0.2, sz * 0.18);
    p.fill(this.COLORS.jaune);
    if (variant !== 1) p.circle(sz * 0.05, -sz * 0.1, this._bSize(p, 3));
    p.pop();
  }

  _drawPath(p) {
    p.push();
    p.noFill();
    p.stroke(this.COLORS.noir); p.strokeWeight(46); p.strokeJoin(p.ROUND); p.strokeCap(p.ROUND);
    p.beginShape();
    for (const pt of this.pathPoints) p.curveVertex(pt.x, pt.y);
    p.endShape();
    p.stroke(this.COLORS.violet); p.strokeWeight(40);
    p.beginShape();
    for (const pt of this.pathPoints) p.curveVertex(pt.x, pt.y);
    p.endShape();
    p.stroke(this.COLORS.rose); p.strokeWeight(32);
    p.beginShape();
    for (const pt of this.pathPoints) p.curveVertex(pt.x, pt.y);
    p.endShape();
    p.stroke(this.COLORS.jaune); p.strokeWeight(3);
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i], p2 = this.pathPoints[i + 1];
      for (let t = 0; t <= 1; t += 0.25) {
        const x = p.lerp(p1.x, p2.x, t);
        const y = p.lerp(p1.y, p2.y, t);
        p.point(x, y);
      }
    }
    p.pop();
    p.noStroke();
  }

  _drawHouse(p) {
    const h = this.house;
    p.push();
    p.translate(h.x, h.y);
    p.noStroke();
    p.fill(this.COLORS.noir);
    p.ellipse(h.w / 2, h.h + 6, h.w * 1.1, 12);
    p.fill(this.COLORS.orange);
    p.rect(0, h.h * 0.3, h.w, h.h * 0.7, 4);
    p.fill(this.COLORS.noir);
    p.triangle(-8, h.h * 0.3 + 2, h.w + 8, h.h * 0.3 + 2, h.w / 2, -8);
    p.fill(this.COLORS.violet);
    p.triangle(-4, h.h * 0.3, h.w + 4, h.h * 0.3, h.w / 2, -4);
    p.fill(this.COLORS.rose);
    p.rect(h.w * 0.4, h.h * 0.55, h.w * 0.22, h.h * 0.45, 2);
    p.fill(this.COLORS.jaune);
    p.circle(h.w * 0.58, h.h * 0.78, 3);
    p.fill(this.COLORS.turquoise);
    p.rect(h.w * 0.1, h.h * 0.45, h.w * 0.2, h.h * 0.2, 2);
    p.stroke(this.COLORS.noir); p.strokeWeight(1);
    p.line(h.w * 0.2, h.h * 0.45, h.w * 0.2, h.h * 0.65);
    p.line(h.w * 0.1, h.h * 0.55, h.w * 0.3, h.h * 0.55);
    p.noStroke();
    p.fill(this.COLORS.noir);
    p.rect(h.w * 0.7, -2, 10, 14);
    p.fill(255, 255, 255, 140);
    const t = p.frameCount * 0.03;
    p.circle(h.w * 0.75 + Math.sin(t) * 3, -10, 8);
    p.circle(h.w * 0.75 + Math.sin(t + 1) * 4, -20, 10);
    p.circle(h.w * 0.75 + Math.sin(t + 2) * 5, -32, 12);
    p.fill(this.COLORS.jaune);
    p.rect(20, h.h * 0.20, 48, 16, 2);
    p.fill(this.COLORS.noir);
    p.textStyle(p.BOLD); p.textAlign(p.CENTER, p.CENTER); p.textSize(8);
    p.text('ÉLEVEUR', 44, h.h * 0.22 + 7);
    if (this.hasColis && this.groups.every(g => g.completed)) {
      const pulse = Math.sin(p.frameCount * 0.12) * 3;
      this._drawColis(p, h.w * 0.5, h.h * 0.72 + pulse, 1.1);
    }
    p.pop();
  }

  _drawColis(p, x, y, sc) {
    p.push();
    p.translate(x, y);
    p.scale(sc);
    p.noStroke();
    p.fill(this.COLORS.noir); p.rect(-11, -5, 22, 16, 2);
    p.fill(this.COLORS.orange); p.rect(-9, -3, 18, 12, 2);
    p.fill(this.COLORS.jaune); p.rect(-7, -11, 14, 5, 1);
    p.stroke(this.COLORS.violet); p.strokeWeight(2);
    p.line(-9, 1, 9, 1);
    p.line(0, 1, 0, -9);
    p.noStroke();
    p.fill(this.COLORS.turquoise); p.circle(0, -13, 4);
    p.pop();
  }

  _drawGroups(p) {
    for (let i = 0; i < this.groups.length; i++) {
      const g = this.groups[i];
      if (g.completed) {
        p.push();
        p.translate(g.x, g.y - 30);
        p.fill(this.COLORS.jaune);
        p.noStroke();
        this._drawStarShape(p, 0, 0, 8, 16, 5);
        p.pop();
        continue;
      }
      if (this.nearGroupIndex === i) {
        p.noFill();
        p.stroke(this.COLORS.jaune); p.strokeWeight(2);
        p.circle(g.x, g.y, g.radius * 2.4 + Math.sin(p.frameCount * 0.1) * 6);
        p.noStroke();
      }
      const positions = [{ dx: -22, dy: 6 }, { dx: 0, dy: -4 }, { dx: 22, dy: 8 }];
      for (let k = 0; k < 3; k++) {
        const pos = positions[k];
        const bob = Math.sin(p.frameCount * 0.08 + k * 1.2 + i) * 3;
        this._drawMiniMonster(p, g.x + pos.dx, g.y + pos.dy + bob, g.palette[k], 28);
      }
      this._drawFloatingNote(p, g.x - 30, g.y - 35 + Math.sin(p.frameCount * 0.05 + i) * 4);
      this._drawFloatingNote(p, g.x + 28, g.y - 40 + Math.sin(p.frameCount * 0.05 + i + 1) * 4);
    }
  }

  _drawMiniMonster(p, x, y, col, s) {
    p.push();
    p.translate(x, y);
    p.fill(this.COLORS.noir); p.noStroke();
    p.ellipse(0, s * 0.45, s * 0.95, s * 0.25);
    p.fill(col); p.circle(0, 0, s);
    p.fill(255);
    p.circle(-s * 0.18, -s * 0.1, s * 0.22);
    p.circle(s * 0.18, -s * 0.1, s * 0.22);
    p.fill(this.COLORS.noir);
    p.circle(-s * 0.18, -s * 0.08, s * 0.1);
    p.circle(s * 0.18, -s * 0.08, s * 0.1);
    const mouthH = 4 + Math.sin(p.frameCount * 0.2) * 2;
    p.ellipse(0, s * 0.18, s * 0.28, mouthH);
    p.pop();
  }

  _drawFloatingNote(p, x, y) {
    p.push();
    p.translate(x, y);
    p.fill(this.COLORS.jaune); p.noStroke();
    p.ellipse(0, 0, 6, 5);
    p.stroke(this.COLORS.jaune); p.strokeWeight(2);
    p.line(3, 0, 3, -10);
    p.noStroke();
    p.fill(this.COLORS.jaune); p.triangle(3, -10, 9, -8, 3, -6);
    p.pop();
  }

  _drawStarShape(p, cx, cy, r1, r2, n) {
    p.beginShape();
    for (let i = 0; i < n * 2; i++) {
      const a = (i * p.PI) / n - p.HALF_PI;
      const r = i % 2 === 0 ? r2 : r1;
      p.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    p.endShape(p.CLOSE);
  }

  _updatePlayer(p) {
    let dx = 0, dy = 0;
    if (p.keyIsDown(90) || p.keyIsDown(87)) dy -= 1;
    if (p.keyIsDown(83)) dy += 1;
    if (p.keyIsDown(81) || p.keyIsDown(65)) dx -= 1;
    if (p.keyIsDown(68)) dx += 1;
    this.player.moving = (dx !== 0 || dy !== 0);
    if (this.player.moving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      this.player.x += (dx / len) * this.player.speed;
      this.player.y += (dy / len) * this.player.speed;
      if (Math.abs(dx) > Math.abs(dy)) this.player.facing = dx > 0 ? 'right' : 'left';
      else                              this.player.facing = dy > 0 ? 'down'  : 'up';
      this.player.animTick++;
      if (this.player.animTick % 8 === 0) this.player.animFrame = (this.player.animFrame + 1) % 4;
    } else this.player.animFrame = 0;
    this.player.x = p.constrain(this.player.x, 16, this.GAME_W - 16);
    this.player.y = p.constrain(this.player.y, 30, this.GAME_H - 16);
  }

  _drawPlayer(p) {
    // Shadow
    p.noStroke();
    p.fill(0, 0, 0, 110);
    p.ellipse(this.player.x, this.player.y + 20, 28, 7);

    // Facing direction + walk animation
    const facing = (this.player.facing === 'left') ? -1 : 1;
    const walkT  = this.player.moving ? this.player.animTick * 0.12 : 0;

    // Jaxx 2D — scale 0.44 fits the game's coordinate space
    drawJaxx2D(p, this.player.x, this.player.y + 4, 0.44, 0, walkT, facing);

    if (this.hasColis && this.gameState === 'EXPLORE') {
      const offX = this.player.facing === 'left' ? 20 : (this.player.facing === 'right' ? -20 : 0);
      const offY = this.player.facing === 'up' ? 18 : -16;
      this._drawColis(p, this.player.x + offX, this.player.y + offY, 0.85);
    }
  }

  _updateChaosFromDistance(nearestD) {
    if (nearestD === Infinity || nearestD >= this.CHAOS_START_DIST) this.chaosLevel = 0;
    else if (nearestD <= this.CHAOS_FULL_DIST) this.chaosLevel = 1;
    else this.chaosLevel = 1 - (nearestD - this.CHAOS_FULL_DIST) / (this.CHAOS_START_DIST - this.CHAOS_FULL_DIST);
  }

  _checkProximity(p) {
    this.nearGroupIndex = -1;
    let minD = Infinity;
    let nearestIncompleteD = Infinity;
    for (let i = 0; i < this.groups.length; i++) {
      const g = this.groups[i];
      if (g.completed) continue;
      const d = Math.hypot(this.player.x - g.x, this.player.y - g.y);
      nearestIncompleteD = Math.min(nearestIncompleteD, d);
      if (d < 70 && d < minD) { minD = d; this.nearGroupIndex = i; }
    }
    this._updateChaosFromDistance(nearestIncompleteD);
    const allDone = this.groups.every(g => g.completed);
    const dh = Math.hypot(this.player.x - (this.house.x + this.house.w / 2), this.player.y - (this.house.y + this.house.h / 2));
    this.nearHouse = allDone && this.hasColis && dh < 60;
  }

  _drawHUD(p) {
    p.push();
    p.noStroke();
    p.fill('#0e0e1a');
    p.rect(0, 0, this.GAME_W, 30);
    p.fill(this.COLORS.turquoise);
    p.rect(0, 28, this.GAME_W, 2);
    p.fill(this.COLORS.jaune);
    p.textFont('Montserrat');
    p.textStyle(p.BOLD);
    p.textAlign(p.LEFT, p.CENTER); p.textSize(13);
    const hudMsg = this.hasColis ? "Livre le colis à l'éleveur !" : "Aide les 3 groupes puis récupère le colis";
    p.text(hudMsg, 12, 14);
    const done = this.groups.filter(g => g.completed).length;
    p.textAlign(p.RIGHT, p.CENTER);
    p.fill(this.COLORS.turquoise);
    p.text(`Groupes : ${done} / 3`, this.GAME_W - 12, 14);
    p.pop();

    if (this.nearGroupIndex !== -1)         this._drawActionPrompt(p, 'ESPACE : aider ce groupe');
    else if (this.nearHouse)                 this._drawActionPrompt(p, "ESPACE : livrer le colis à l'éleveur");
    else if (this.hasColis)                  this._drawActionPrompt(p, "Direction : maison de l'éleveur");
    else if (p.frameCount < 240)             this._drawActionPrompt(p, 'ZQSD pour explorer');
  }

  _drawActionPrompt(p, msg) {
    p.push();
    p.textAlign(p.CENTER, p.CENTER); p.textSize(16);
    const w = p.textWidth(msg) + 30;
    const x = this.GAME_W / 2 - w / 2;
    const y = this.GAME_H - 50;
    p.noStroke();
    p.fill(this.COLORS.noir); p.rect(x + 3, y + 3, w, 32, 6);
    p.fill(this.COLORS.violet); p.rect(x, y, w, 32, 6);
    p.fill(this.COLORS.jaune); p.text(msg, this.GAME_W / 2, y + 16);
    p.pop();
  }

  _drawWinScreen(p) {
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 180);
    p.rect(0, 0, this.GAME_W, this.GAME_H);

    const panelW = 440;
    const panelH = 148;
    const panelX = this.GAME_W / 2 - panelW / 2;
    const panelY = this.GAME_H / 2 - panelH / 2;
    dsPanel(p, panelX, panelY, panelW, panelH, { cut: 16 });

    p.fill(this.COLORS.jaune);
    p.textFont('Montserrat');
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(34);
    p.text('Colis livré !', this.GAME_W / 2, panelY + 42);
    p.textSize(22);
    p.text('Mélodie restaurée !', this.GAME_W / 2, panelY + 78);
    p.fill(this.COLORS.turquoise);
    p.textFont('Inter');
    p.textStyle(p.NORMAL);
    p.textSize(13);
    p.text("L'éleveur a reçu ton colis. Tous les Singing Monsters sont réunis.", this.GAME_W / 2, panelY + 114);
    p.pop();
  }

  _shuffleArray(p, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(p.random(i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  _shuffledPalette(p, palette) {
    const arr = [...palette];
    let tries = 0;
    do {
      this._shuffleArray(p, arr);
      tries++;
    } while (tries < 20 && arr[0] === palette[0] && arr[1] === palette[1] && arr[2] === palette[2]);
    return arr;
  }

  _startPuzzle(p, groupIndex) {
    this.activeGroupIndex = groupIndex;
    const g = this.groups[groupIndex];
    this.puzzleConfig = this.GROUP_DIFFICULTY[groupIndex];
    this.puzzleTimedOut = false;
    this.slots = [];
    this.monsters = [];
    this.draggedMonster = null;
    this.isQuestComplete = false;
    const slotColors = this._shuffledPalette(p, g.palette);
    const startX = 200;
    for (let i = 0; i < 3; i++) {
      this.slots.push({ x: startX + i * 200, y: 470, id: i, col: slotColors[i] });
    }
    for (let i = 0; i < 3; i++) {
      const mx = p.random(this.puzzleConfig.spawnX[0], this.puzzleConfig.spawnX[1]);
      const my = p.random(this.puzzleConfig.spawnY[0], this.puzzleConfig.spawnY[1]);
      this.monsters.push(new Q2Monster(p, mx, my, i, g.palette[i], this.puzzleConfig.monsterSize, this.puzzleConfig.driftSpeed));
    }
    this.puzzleDeadline = this.puzzleConfig.timeLimit > 0 ? p.millis() + this.puzzleConfig.timeLimit * 1000 : 0;
    this.gameState = 'PUZZLE';
  }

  _updatePuzzleDifficultyEffects(p) {
    if (!this.puzzleConfig || !this.puzzleConfig.drift || this.puzzleTimedOut) return;
    const maxSpd = this.puzzleConfig.driftSpeed;
    for (const m of this.monsters) {
      if (m.isLocked || this.draggedMonster === m) continue;
      if (p.frameCount % 45 === Math.floor(m.bob * 10) % 45) {
        m.vx += p.random(-1.8, 1.8);
        m.vy += p.random(-1.8, 1.8);
      }
      m.x += m.vx; m.y += m.vy;
      if (m.x < 40 || m.x > this.GAME_W - 40) { m.vx *= -1.05; m.x = p.constrain(m.x, 40, this.GAME_W - 40); }
      if (m.y < 60 || m.y > this.GAME_H - 70) { m.vy *= -1.05; m.y = p.constrain(m.y, 60, this.GAME_H - 70); }
      const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      if (speed > maxSpd) { m.vx = (m.vx / speed) * maxSpd; m.vy = (m.vy / speed) * maxSpd; }
      else if (speed < maxSpd * 0.85) {
        m.vx = (m.vx / Math.max(speed, 0.01)) * maxSpd * 0.9;
        m.vy = (m.vy / Math.max(speed, 0.01)) * maxSpd * 0.9;
      }
    }
  }

  _checkPuzzleTimer(p) {
    if (!this.puzzleConfig || this.puzzleConfig.timeLimit <= 0 || this.isQuestComplete || this.puzzleTimedOut) return;
    if (p.millis() >= this.puzzleDeadline) {
      this.puzzleTimedOut = true;
      if (this.myMusic) this.myMusic.rate(1.4);
      if (this._failTimeout) clearTimeout(this._failTimeout);
      this._failTimeout = setTimeout(() => {
        this.puzzleTimedOut = false;
        if (this.gameState === 'PUZZLE' && this.activeGroupIndex >= 0) this._startPuzzle(p, this.activeGroupIndex);
      }, 2200);
    }
  }

  _drawPuzzle(p) {
    p.push();
    p.noStroke();
    p.fill('#0e0e1a');
    p.rect(0, 0, this.GAME_W, 40);
    p.fill(this.COLORS.turquoise);
    p.rect(0, 38, this.GAME_W, 2);
    p.fill(this.COLORS.jaune);
    p.textFont('Montserrat');
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.CENTER); p.textSize(16);
    p.text('Glisse chaque monstre sur la case de la même couleur', this.GAME_W / 2, 19);
    p.pop();

    if (this.puzzleDeadline > 0 && !this.isQuestComplete) {
      const left = Math.max(0, Math.ceil((this.puzzleDeadline - p.millis()) / 1000));
      p.push();
      p.fill(left <= 15 ? this.COLORS.rose : this.COLORS.jaune);
      p.textAlign(p.RIGHT, p.CENTER); p.textSize(18);
      p.text(`⏱ ${left}s`, this.GAME_W - 16, 14);
      p.pop();
    }

    if (this.puzzleTimedOut) {
      p.push();
      p.fill(0, 0, 0, 200);
      p.rect(0, 0, this.GAME_W, this.GAME_H);
      p.fill(this.COLORS.rose);
      p.textAlign(p.CENTER, p.CENTER); p.textSize(30);
      p.text('Temps écoulé !', this.GAME_W / 2, this.GAME_H / 2 - 16);
      p.textSize(16);
      p.fill(this.COLORS.jaune);
      p.text('Nouvelle tentative...', this.GAME_W / 2, this.GAME_H / 2 + 20);
      p.pop();
      return;
    }

    for (const s of this.slots) {
      p.push();
      p.rectMode(p.CENTER);
      p.noStroke();
      p.fill(this.COLORS.noir); p.rect(s.x + 4, s.y + 4, 110, 110, 18);
      p.fill(this.COLORS.violet); p.rect(s.x, s.y, 110, 110, 18);
      p.fill(s.col); p.rect(s.x, s.y, 96, 96, 14);
      p.pop();
    }
    for (const m of this.monsters) m.display(p, this.isQuestComplete);

    p.push();
    p.noStroke();
    p.fill(this.COLORS.noir); p.rect(13, 53, 110, 28, 6);
    p.fill(this.COLORS.rose); p.rect(10, 50, 110, 28, 6);
    p.fill(this.COLORS.noir);
    p.textAlign(p.CENTER, p.CENTER); p.textSize(13);
    p.text('← ESC : retour', 65, 64);
    p.pop();

    if (this.isQuestComplete) {
      p.push();
      p.noStroke();
      p.fill(0, 0, 0, 160);
      p.rect(0, 0, this.GAME_W, this.GAME_H);
      p.fill(this.COLORS.jaune);
      p.textAlign(p.CENTER, p.CENTER); p.textSize(32);
      p.text('Groupe harmonisé !', this.GAME_W / 2, this.GAME_H / 2);
      p.textSize(16);
      p.fill(this.COLORS.turquoise);
      p.text('Retour à la carte...', this.GAME_W / 2, this.GAME_H / 2 + 36);
      p.pop();
    }
  }

  _checkWinCondition(p) {
    if (this.isQuestComplete) return;
    const allLocked = this.monsters.every(m => m.isLocked);
    if (allLocked) {
      this.isQuestComplete = true;
      if (this.myMusic) this.myMusic.rate(1);
      if (this._winTimeout) clearTimeout(this._winTimeout);
      this._winTimeout = setTimeout(() => {
        if (this.activeGroupIndex >= 0) this.groups[this.activeGroupIndex].completed = true;
        if (this.groups.every(g => g.completed)) this.hasColis = true;
        this.activeGroupIndex = -1;
        this.gameState = 'EXPLORE';
        this.chaosLevel = 0;
      }, 2200);
    }
  }

  onMousePressed(p) {
    this._startMusic();
    if (this.gameState !== 'PUZZLE' || this.isQuestComplete || this.puzzleTimedOut) return;
    const mx = this._gameMouseX(p);
    const my = this._gameMouseY(p);
    if (mx > 10 && mx < 120 && my > 50 && my < 78) {
      this.gameState = 'EXPLORE';
      this.activeGroupIndex = -1;
      return;
    }
    for (const m of this.monsters) {
      if (!m.isLocked && m.checkHover(mx, my)) {
        this.draggedMonster = m;
        this.offsetX = mx - m.x;
        this.offsetY = my - m.y;
        break;
      }
    }
  }

  onMouseDragged(p) {
    if (this.puzzleTimedOut) return;
    if (this.draggedMonster) {
      this.draggedMonster.x = this._gameMouseX(p) - this.offsetX;
      this.draggedMonster.y = this._gameMouseY(p) - this.offsetY;
    }
  }

  onMouseReleased(p) {
    if (!this.draggedMonster) return;
    const snap = this.puzzleConfig ? this.puzzleConfig.snap : 55;
    for (const sl of this.slots) {
      const d = Math.hypot(this.draggedMonster.x - sl.x, this.draggedMonster.y - sl.y);
      if (d >= snap) continue;
      if (sl.col === this.draggedMonster.col) {
        this.draggedMonster.x = sl.x;
        this.draggedMonster.y = sl.y;
        this.draggedMonster.isLocked = true;
      } else {
        this.draggedMonster.x += p.random(-100, 100);
        this.draggedMonster.y += p.random(-80, 80);
        this.draggedMonster.x = p.constrain(this.draggedMonster.x, 40, this.GAME_W - 40);
        this.draggedMonster.y = p.constrain(this.draggedMonster.y, 60, this.GAME_H - 70);
        if (this.myMusic) this.myMusic.rate(1.6);
        setTimeout(() => { if (this.myMusic && this.myMusic.isPlaying()) this.myMusic.rate(1); }, 400);
      }
      break;
    }
    this.draggedMonster = null;
  }

  onKeyPressed(p) {
    this._startMusic();
    if (this.gameState === 'EXPLORE') {
      if (p.key === ' ') {
        if (this.nearGroupIndex !== -1) this._startPuzzle(p, this.nearGroupIndex);
        else if (this.nearHouse && this.hasColis) {
          this.hasColis = false;
          this.gameState = 'WIN';
          if (this.myMusic) this.myMusic.rate(1);
        }
      }
    } else if (this.gameState === 'PUZZLE') {
      if (p.keyCode === p.ESCAPE) {
        this.gameState = 'EXPLORE';
        this.activeGroupIndex = -1;
      }
    }
  }

  onKeyReleased(p) {}
  onWindowResized(p) {}
}

class Q2Monster {
  constructor(p, x, y, id, col, size, driftSpd) {
    this.x = x; this.y = y;
    this.id = id; this.col = col;
    this.size = size || 70;
    this.isLocked = false;
    this.bob = p.random(p.TWO_PI);
    const angle = p.random(p.TWO_PI);
    const initSpd = (driftSpd || 4) * 0.75;
    this.vx = Math.cos(angle) * initSpd;
    this.vy = Math.sin(angle) * initSpd;
  }

  display(p, isQuestComplete) {
    p.push();
    p.translate(this.x, this.y);
    p.noStroke();
    p.fill('#0a0a0f');
    p.ellipse(0, this.size * 0.45, this.size * 0.95, this.size * 0.25);
    p.fill(this.col);
    p.circle(0, 0, this.size);
    const eyeR = this.size * 0.11;
    const eyeY = -this.size * 0.14;
    p.fill(255);
    p.circle(-this.size * 0.21, eyeY, eyeR * 2);
    p.circle(this.size * 0.21, eyeY, eyeR * 2);
    p.fill('#0a0a0f');
    p.circle(-this.size * 0.21, eyeY + eyeR * 0.25, eyeR);
    p.circle(this.size * 0.21, eyeY + eyeR * 0.25, eyeR);
    p.fill('#0a0a0f');
    if (this.isLocked || isQuestComplete) {
      p.arc(0, this.size * 0.17, this.size * 0.4, this.size * 0.26, 0, p.PI);
    } else {
      const mh = this.size * 0.07 + Math.sin(p.frameCount * 0.2 + this.bob) * this.size * 0.04;
      p.ellipse(0, this.size * 0.2, this.size * 0.31, mh);
    }
    if (this.isLocked) {
      p.noFill();
      p.stroke('#29ffdf'); p.strokeWeight(2);
      p.circle(0, 0, this.size + 12 + Math.sin(p.frameCount * 0.1) * 2);
    }
    p.pop();
  }

  checkHover(px, py) {
    return Math.hypot(px - this.x, py - this.y) < this.size / 2;
  }
}

class Quete5 extends Quest {
  constructor() {
    super({
      id: 'q5',
      title: 'Quête 5 · Le Synthétiseur',
      author: 'Evan',
      progressPercent: 85,
      parcelName: 'Un synthétiseur',
      npcName: 'Compositeur numérique',
      briefing: "Pointe ta main dans une zone colorée pour jouer un accord. Pas besoin de cliquer !",
      successText: "Magnifique ! Le compositeur est ravi de son nouvel instrument.",
      mapLocation: { x: 4598, z: 1452 },
      locationLabel: 'Studio du compositeur'
    });

    this.REF_W = 1280;
    this.REF_H = 720;
    this.gameScale = 1;
    this.gameOx    = 0;
    this.gameOy    = 0;

    // Rangée 0 — AIGUS (octave 5) : sons brillants et cristallins
    // Rangée 1 — GRAVES (octave 3) : sons profonds et chaleureux
    // → Combiner une zone aigu + une zone grave = accord riche pleine gamme
    this.ZONES = [
      { note: 'Do',  type: 'aigu',  degree: 'I',   root: 523.25, semitones: [0,4,7],    color: '#ff7ad1' },
      { note: 'Fa',  type: 'aigu',  degree: 'IV',  root: 698.46, semitones: [0,4,7],    color: '#fff854' },
      { note: 'Sol', type: 'aigu',  degree: 'V',   root: 783.99, semitones: [0,4,7],    color: '#29ffdf' },
      { note: 'La',  type: 'aigu',  degree: 'vi',  root: 880.00, semitones: [0,3,7],    color: '#5fffd4' },
      { note: 'Do',  type: 'grave', degree: 'I',   root: 130.81, semitones: [0,4,7],    color: '#ff9eb5' },
      { note: 'Fa',  type: 'grave', degree: 'IV',  root: 174.61, semitones: [0,4,7],    color: '#ffbd59' },
      { note: 'Sol', type: 'grave', degree: 'V',   root: 196.00, semitones: [0,4,7],    color: '#a875e8' },
      { note: 'La',  type: 'grave', degree: 'vi',  root: 220.00, semitones: [0,3,7],    color: '#cb6ce6' },
    ];

    this.DETUNE = [1.000, 1.0028, 0.9972, 1.0014]; // chorus

    // Zones actives par chaque main
    this.activeZoneL = -1;
    this.activeZoneR = -1;
    this.zoneAnimL   = new Array(8).fill(0);
    this.zoneAnimR   = new Array(8).fill(0);

    // Audio
    this.oscsL = []; this.oscsR = []; this.reverb = null;
    this.mic   = null; this.micLevel = 0; this.audioStarted = false;

    // Caméra
    this.video             = null;
    this.handPose          = null;
    this.hands             = [];
    this.cameraReady       = false;
    this._detectionStarted = false;
    this.fingerPosL        = null;
    this.fingerPosR        = null;

    // Progression
    this.REQUIRED_PLAY_MS  = 10000;
    this.NEXT_DWELL_MS     = 1500; // ms de survol pour valider (comme quête 3)
    this.playTime          = 0;
    this.showNextBtn       = false;
    this.nextBtnAnim       = 0;
    this.nextBtnRect       = { x:0, y:0, w:0, h:0 };
    this.nextDwellProgress = 0;   // 0→1 pendant le survol

    this.sparks    = [];
    this.bgTint    = { r:10, g:10, b:20 };
    this.noiseOff  = 0;
    this.hueCycle  = 0; // rotation arc-en-ciel pour les effets latéraux

    // Effets latéraux
    this.sideStars = []; // champ d'étoiles fixes
    this.sideOrbs  = []; // orbes colorées flottantes
    this.sideRings = []; // ondes expansives depuis le bord du viewport

    this._timeouts  = [];
    this._finishing = false;

    // Warp starfield (inspiré du sketch starfield, réactif à la musique)
    this.warpParticlesL = [];
    this.warpParticlesR = [];
    this.warpSpeed = 0.003;
  }

  // ─── Viewport ──────────────────────────────────────────────────────────────

  _updateViewport(p) {
    const maxW     = Math.min(p.width, 1920);
    this.gameScale = Math.min(maxW / this.REF_W, p.height / this.REF_H);
    this.gameOx    = (p.width  - this.REF_W * this.gameScale) / 2;
    this.gameOy    = (p.height - this.REF_H * this.gameScale) / 2;
  }
  _refX(p) { return (p.mouseX - this.gameOx) / this.gameScale; }
  _refY(p) { return (p.mouseY - this.gameOy) / this.gameScale; }

  // ─── Zones ─────────────────────────────────────────────────────────────────

  _zoneRect(i) {
    const cols = 4, rows = 2;
    const hh   = Math.max(50, this.REF_H * 0.13);
    const gap  = 14, mx = 20;
    const topY = hh + 14, botY = this.REF_H - 14;
    const zW   = (this.REF_W - mx*2 - gap*(cols-1)) / cols;
    const zH   = (botY - topY - gap*(rows-1)) / rows;
    return { x: mx+(i%cols)*(zW+gap), y: topY+Math.floor(i/cols)*(zH+gap), w: zW, h: zH };
  }

  _getZone(pos) {
    if (!pos) return -1;
    for (let i = 0; i < this.ZONES.length; i++) {
      const r = this._zoneRect(i);
      if (pos.x >= r.x && pos.x <= r.x+r.w && pos.y >= r.y && pos.y <= r.y+r.h) return i;
    }
    return -1;
  }

  // ─── Audio ─────────────────────────────────────────────────────────────────

  _startAudio() {
    if (this.audioStarted) return;
    try {
      const make = () => {
        const a = [];
        for (let i = 0; i < 4; i++) { const o = new p5.Oscillator('sine'); o.start(); o.amp(0); a.push(o); }
        return a;
      };
      this.oscsL = make(); this.oscsR = make();
      try {
        this.reverb = new p5.Reverb(); this.reverb.set(2.2, 2);
        for (const o of [...this.oscsL, ...this.oscsR]) this.reverb.process(o);
      } catch(e) { this.reverb = null; }
      this.mic = new p5.AudioIn(); this.mic.start();
      this.audioStarted = true;
    } catch(e) { console.warn('[Q5] audio failed', e); }
  }

  // ─── Effets latéraux — init ────────────────────────────────────────────────

  _initSideEffects() {
    // Champ d'étoiles (200 par côté)
    this.sideStars = [];
    for (let i = 0; i < 200; i++) {
      this.sideStars.push({
        x:       Math.random(),
        y:       Math.random(),
        size:    Math.random() * 2.2 + 0.4,
        phase:   Math.random() * Math.PI * 2,
        speed:   Math.random() * 0.03 + 0.008
      });
    }
    // Orbes colorées flottantes (50 par côté)
    this.sideOrbs = [];
    for (let i = 0; i < 50; i++) {
      this.sideOrbs.push({
        x:    Math.random(),
        y:    Math.random(),
        vx:   (Math.random() - 0.5) * 0.0009,
        vy:   (Math.random() - 0.5) * 0.0007 - 0.0002, // légère montée
        size: Math.random() * 9 + 2,
        hue:  Math.random() * 360,
        phase: Math.random() * Math.PI * 2,
        twinkle: Math.random() * 0.04 + 0.01
      });
    }
    this.sideRings = [];
    this._initWarpParticles();
  }

  _initWarpParticles() {
    const make = () => ({
      ox:    Math.random() * 0.85 + 0.08,  // distance latérale depuis le point de fuite
      oy:    (Math.random() - 0.5) * 1.8,  // décalage vertical
      z:     Math.random() * 0.95 + 0.05,  // profondeur initiale dispersée
      pz:    0,
      color: '#9988cc'
    });
    const N = 150;
    this.warpParticlesL = Array.from({ length: N }, make);
    this.warpParticlesR = Array.from({ length: N }, make);
  }

  _playZone(oscs, idx) {
    if (!this.audioStarted) return;
    const z     = this.ZONES[idx];
    const freqs = z.semitones.map(s => z.root * Math.pow(2, s/12));
    for (let i = 0; i < oscs.length; i++) {
      if (i < freqs.length) { oscs[i].freq(freqs[i] * this.DETUNE[i]); oscs[i].amp(0.065, 0.25); }
      else oscs[i].amp(0, 0.4);
    }
  }

  _stopOscs(oscs) { if (!this.audioStarted) return; for (const o of oscs) o.amp(0, 2.2); }

  _spawnSparks(zoneIdx, p) {
    const r = this._zoneRect(zoneIdx);
    const cx = r.x+r.w/2, cy = r.y+r.h/2, col = this.ZONES[zoneIdx].color;
    for (let i = 0; i < 16; i++) {
      const ang = (i/16)*Math.PI*2, spd = p.random(3, 8);
      this.sparks.push({ x:cx, y:cy, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:1, col });
    }
  }

  // ─── Cycle de vie ──────────────────────────────────────────────────────────

  setup(p) {
    super.setup(p);
    this._updateViewport(p);
    this._finishing  = false;
    this.activeZoneL = -1; this.activeZoneR = -1;
    this.zoneAnimL   = new Array(8).fill(0);
    this.zoneAnimR   = new Array(8).fill(0);
    this.playTime          = 0; this.showNextBtn = false; this.nextBtnAnim = 0;
    this.nextDwellProgress = 0;
    this.sparks      = []; this.bgTint = { r:10, g:10, b:20 };
    this.noiseOff    = 0; this.hueCycle = 0;
    this.sideRings   = [];
    this.micLevel    = 0; this.audioStarted = false;
    this._initSideEffects();
    this.fingerPosL  = null; this.fingerPosR = null;
    this.hands       = []; this._detectionStarted = false;
    this.cameraReady = false; this._timeouts = [];

    this.video = p.createCapture(p.VIDEO, () => {
      if (!this.video) return;
      this.video.size(640, 480); this.video.hide();
      try {
        this.handPose = ml5.handPose(() => {
          if (!this.video || !this.handPose || this._detectionStarted) return;
          this._detectionStarted = true;
          this.handPose.detectStart(this.video, r => { if (this.handPose) this.hands = r; });
          this.cameraReady = true;
        });
      } catch(e) { this.cameraReady = true; }
    });
    this.video.hide();

    // L'audio démarre ici : setup() est appelé suite à l'action du joueur (touche E),
    // donc le contexte audio du navigateur est déjà actif — pas besoin de clic souris.
    try { p.userStartAudio(); } catch(e) {}
    this._startAudio();
  }

  cleanup(p) {
    super.cleanup(p);
    this._timeouts.forEach(t => clearTimeout(t)); this._timeouts = [];
    if (this.handPose) { const hp=this.handPose; this.handPose=null; try{if(hp.detectStop)hp.detectStop();}catch(e){} }
    if (this.video)    { try{this.video.remove();}catch(e){} this.video=null; }
    this._stopOscs(this.oscsL); this._stopOscs(this.oscsR);
    for (const o of [...this.oscsL,...this.oscsR]) { try{o.stop();}catch(e){} }
    this.oscsL=[]; this.oscsR=[];
    if (this.reverb) { try{this.reverb.disconnect();}catch(e){} this.reverb=null; }
    if (this.mic)    { try{this.mic.stop();}catch(e){} this.mic=null; }
    this.hands=[]; this.sparks=[];
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(p) {
    const dt = p.deltaTime || 16;
    if (this.mic) { try{this.micLevel=this.mic.getLevel();}catch(e){this.micLevel=0;} }
    this.noiseOff += 0.01;
    this.hueCycle  += 0.003;

    // ── Positions des mains (caméra) ───────────────────────────────────────
    this.fingerPosL = null; this.fingerPosR = null;
    if (this.cameraReady && this.hands.length > 0 && this.video) {
      const mapped = this.hands
        .map(h => {
          const tip = h.index_finger_tip; if (!tip) return null;
          return {
            x: (p.map(tip.x, 0, this.video.width,  p.width, 0)  - this.gameOx) / this.gameScale,
            y: (p.map(tip.y, 0, this.video.height, 0, p.height)  - this.gameOy) / this.gameScale
          };
        })
        .filter(Boolean).sort((a,b) => a.x - b.x);
      this.fingerPosL = mapped[0] || null;
      this.fingerPosR = mapped[1] || null;
    }

    // ── Curseur actif : caméra en priorité, souris en fallback ────────────
    const mx = this._refX(p), my = this._refY(p);
    const mouseInView = mx >= 0 && mx <= this.REF_W && my >= 0 && my <= this.REF_H;
    const cursorL = this.fingerPosL;
    const cursorR = this.fingerPosR || (mouseInView ? { x:mx, y:my } : null);

    // ── Changement de zone gauche ─────────────────────────────────────────
    const newZoneL = this._getZone(cursorL);
    if (newZoneL !== this.activeZoneL) {
      if (this.activeZoneL >= 0) this._stopOscs(this.oscsL);
      this.activeZoneL = newZoneL;
      if (newZoneL >= 0) {
        this._playZone(this.oscsL, newZoneL);
        this._spawnSparks(newZoneL, p);
        this._spawnSideRing(p, 'left', this.ZONES[newZoneL].color);
      }
    }

    // ── Changement de zone droite ─────────────────────────────────────────
    const newZoneR = this._getZone(cursorR);
    if (newZoneR !== this.activeZoneR) {
      if (this.activeZoneR >= 0) this._stopOscs(this.oscsR);
      this.activeZoneR = newZoneR;
      if (newZoneR >= 0) {
        this._playZone(this.oscsR, newZoneR);
        this._spawnSparks(newZoneR, p);
        this._spawnSideRing(p, 'right', this.ZONES[newZoneR].color);
      }
    }

    // ── Animations zones ──────────────────────────────────────────────────
    for (let i = 0; i < 8; i++) {
      const tL = (i === this.activeZoneL) ? 1 : 0;
      const tR = (i === this.activeZoneR) ? 1 : 0;
      this.zoneAnimL[i] += (tL - this.zoneAnimL[i]) * 0.14;
      this.zoneAnimR[i] += (tR - this.zoneAnimR[i]) * 0.14;
    }

    // ── Fond réactif ──────────────────────────────────────────────────────
    const az = this.activeZoneR >= 0 ? this.activeZoneR : this.activeZoneL;
    const col = az >= 0 ? this.ZONES[az].color : '#0a0a14';
    const tr=parseInt(col.slice(1,3),16), tg=parseInt(col.slice(3,5),16), tb=parseInt(col.slice(5,7),16);
    this.bgTint.r += (tr - this.bgTint.r) * 0.05;
    this.bgTint.g += (tg - this.bgTint.g) * 0.05;
    this.bgTint.b += (tb - this.bgTint.b) * 0.05;

    // ── Mise à jour effets latéraux ───────────────────────────────────────
    for (const o of this.sideOrbs) {
      o.x += o.vx; o.y += o.vy; o.phase += o.twinkle;
      if (o.x < 0) o.x = 1; if (o.x > 1) o.x = 0;
      if (o.y < 0) o.y = 1; if (o.y > 1) o.y = 0;
      o.hue = (o.hue + 0.15) % 360;
    }
    for (const st of this.sideStars) {
      st.phase += st.speed;
    }
    for (let i = this.sideRings.length - 1; i >= 0; i--) {
      const rng = this.sideRings[i];
      rng.r    += (rng.maxR - rng.r) * 0.06;
      rng.life -= 0.018;
      if (rng.life <= 0) this.sideRings.splice(i, 1);
    }

    // ── Warp starfield (réactif à la musique, comme le sketch starfield) ──
    const playing = this.activeZoneL >= 0 || this.activeZoneR >= 0;
    const warpTarget = playing ? 0.030 : 0.003;
    this.warpSpeed += (warpTarget - this.warpSpeed) * 0.06;
    const warpColor = az >= 0 ? this.ZONES[az].color : '#9988cc';
    const updateWarp = (particles) => {
      for (const pt of particles) {
        pt.pz = pt.z;
        pt.z -= this.warpSpeed;
        if (pt.z <= 0.005) {
          pt.ox    = Math.random() * 0.85 + 0.08;
          pt.oy    = (Math.random() - 0.5) * 1.8;
          pt.z     = 1;
          pt.pz    = 1;
          pt.color = warpColor;
        }
      }
    };
    updateWarp(this.warpParticlesL);
    updateWarp(this.warpParticlesR);

    // ── Particules ────────────────────────────────────────────────────────
    for (let i = this.sparks.length-1; i >= 0; i--) {
      const s = this.sparks[i]; s.x+=s.vx; s.y+=s.vy; s.vy+=0.15; s.life-=0.022;
      if (s.life<=0) this.sparks.splice(i,1);
    }

    // ── Progression ───────────────────────────────────────────────────────
    if (this.activeZoneL >= 0 || this.activeZoneR >= 0) this.playTime += dt;
    if (!this.showNextBtn && !this._finishing && this.playTime >= this.REQUIRED_PLAY_MS) this.showNextBtn = true;
    if (this.showNextBtn) this.nextBtnAnim = Math.min(1, this.nextBtnAnim + 0.04);

    // ── Bouton Suivant — dwell (survol 1.5 s) comme quête 3 ──────────────
    if (this.showNextBtn && !this._finishing) {
      const fingers = [this.fingerPosL, this.fingerPosR].filter(Boolean);
      const r = this.nextBtnRect;
      const overFinger = fingers.some(f => {
        const sx = f.x*this.gameScale+this.gameOx, sy = f.y*this.gameScale+this.gameOy;
        return sx>=r.x && sx<=r.x+r.w && sy>=r.y && sy<=r.y+r.h;
      });
      const overMouse = p.mouseX>=r.x && p.mouseX<=r.x+r.w && p.mouseY>=r.y && p.mouseY<=r.y+r.h;
      const over = overFinger || overMouse;
      if (over) {
        this.nextDwellProgress = Math.min(1, this.nextDwellProgress + dt / this.NEXT_DWELL_MS);
        if (this.nextDwellProgress >= 1) this._triggerComplete();
      } else {
        this.nextDwellProgress = Math.max(0, this.nextDwellProgress - dt / 600);
      }
    }
  }

  _triggerComplete() {
    if (this._finishing) return;
    this._finishing = true;
    this._stopOscs(this.oscsL); this._stopOscs(this.oscsR);
    const t = setTimeout(() => this.complete(), 400); this._timeouts.push(t);
  }

  // ─── Draw ──────────────────────────────────────────────────────────────────

  draw(p) {
    this._updateViewport(p);
    p.background(0);

    this._drawSideGlow(p);

    if (this.video) {
      p.push();
      p.translate(this.gameOx + this.REF_W*this.gameScale, this.gameOy);
      p.scale(-this.gameScale, this.gameScale);
      p.tint(255, 30); p.image(this.video, 0, 0, this.REF_W, this.REF_H); p.noTint();
      p.pop();
    }

    p.push();
    p.translate(this.gameOx, this.gameOy); p.scale(this.gameScale);

    // Fond teinté
    p.noStroke();
    p.fill(Math.floor(this.bgTint.r), Math.floor(this.bgTint.g), Math.floor(this.bgTint.b), 30);
    p.rect(0, 0, this.REF_W, this.REF_H);

    dsGrid(p, 60, 6);

    // Particules
    for (const s of this.sparks) {
      const c = p.color(s.col); c.setAlpha(Math.floor(255*s.life));
      p.fill(c); p.noStroke(); p.circle(s.x, s.y, 7*s.life+2);
    }

    // Zones
    for (let i = 0; i < this.ZONES.length; i++) this._drawZone(p, i);

    // Curseurs
    this._drawCursor(p, this.fingerPosL, '#ff7ad1');
    this._drawCursor(p, this.fingerPosR || (this._refX(p) >= 0 ? {x:this._refX(p),y:this._refY(p)} : null), '#29ffdf');

    this._drawHeader(p);
    if (!this.audioStarted) this._drawAudioHint(p);

    p.pop();

    if (this.showNextBtn) this._drawNextBtn(p);
  }

  // ─── Effets latéraux — spawn ───────────────────────────────────────────────

  _spawnSideRing(p, side, color) {
    const gameW  = this.REF_W * this.gameScale;
    const originX = side === 'left' ? this.gameOx : this.gameOx + gameW;
    const originY = p.random(p.height * 0.2, p.height * 0.8);
    const maxR = Math.max(this.gameOx, p.width - this.gameOx - gameW) * 1.6;
    // Spawn 3 rings décalés
    for (let k = 0; k < 3; k++) {
      this.sideRings.push({
        x: originX, y: originY + p.random(-60, 60),
        r: 0, maxR: maxR * (0.4 + k * 0.35),
        life: 1 - k * 0.15, color,
        side
      });
    }
    if (this.sideRings.length > 30) this.sideRings.splice(0, 6);
  }

  // ─── Effets latéraux — draw ────────────────────────────────────────────────

  _drawSideGlow(p) {
    const gameW  = this.REF_W * this.gameScale;
    const leftW  = this.gameOx;
    const rightX = this.gameOx + gameW;
    const rightW = p.width - rightX;
    if (leftW < 10 && rightW < 10) return;

    const az  = this.activeZoneR >= 0 ? this.activeZoneR : this.activeZoneL;
    const ctx = p.drawingContext;

    // ── Ondes expansives (depuis le bord du viewport) ─────────────────────
    for (const rng of this.sideRings) {
      const rc = rng.color;
      const rr = parseInt(rc.slice(1,3),16);
      const rg = parseInt(rc.slice(3,5),16);
      const rb = parseInt(rc.slice(5,7),16);
      ctx.save();
      ctx.beginPath(); ctx.arc(rng.x, rng.y, rng.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rr},${rg},${rb},${rng.life * 0.6})`;
      ctx.lineWidth   = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(rng.x, rng.y, rng.r * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rr},${rg},${rb},${rng.life * 0.2})`;
      ctx.lineWidth   = 12; ctx.stroke();
      ctx.restore();
    }

    if (leftW  > 10) this._drawSidePanel(p, 0,      leftW,  p.height, az, true);
    if (rightW > 10) this._drawSidePanel(p, rightX, rightW, p.height, az, false);
  }

  _drawSidePanel(p, startX, width, height, az, isLeft) {
    const ctx     = p.drawingContext;
    const playing = this.activeZoneL >= 0 || this.activeZoneR >= 0;

    // Couleur principale
    const col = az >= 0 ? this.ZONES[az].color : '#1a0a2e';
    const r=parseInt(col.slice(1,3),16), g=parseInt(col.slice(3,5),16), b=parseInt(col.slice(5,7),16);

    // ── 1. Fond dégradé arc-en-ciel ───────────────────────────────────────
    ctx.save();
    const hBase = (this.hueCycle * 360 + (isLeft ? 0 : 40)) % 360;
    const bgGr  = ctx.createLinearGradient(isLeft?startX+width:startX, 0, isLeft?startX:startX+width, 0);
    bgGr.addColorStop(0,   `hsla(${hBase},80%,12%,${playing?0.95:0.6})`);
    bgGr.addColorStop(0.5, `hsla(${(hBase+60)%360},70%,8%,${playing?0.8:0.5})`);
    bgGr.addColorStop(1,   `hsla(${(hBase+120)%360},60%,5%,0.3)`);
    ctx.fillStyle = bgGr; ctx.fillRect(startX, 0, width, height);
    ctx.restore();

    // ── 2. Champ d'étoiles ────────────────────────────────────────────────
    const halfStars = Math.floor(this.sideStars.length / 2);
    const stars = isLeft ? this.sideStars.slice(0, halfStars) : this.sideStars.slice(halfStars);
    ctx.save();
    for (const st of stars) {
      const sx  = startX + st.x * width;
      const sy  = st.y * height;
      const br  = 0.3 + 0.7 * Math.abs(Math.sin(st.phase));
      const hue = (this.hueCycle * 360 + st.x * 360) % 360;
      ctx.beginPath(); ctx.arc(sx, sy, st.size * br, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${hue},80%,90%,${br * (playing ? 0.7 : 0.25)})`;
      ctx.fill();
    }
    ctx.restore();

    // ── 3. Warp starfield (style sketch.js, réactif à la musique) ────────
    {
      const particles = isLeft ? this.warpParticlesL : this.warpParticlesR;
      // Point de fuite au bord intérieur du panneau (là où il touche le viewport)
      const vx = isLeft ? startX + width : startX;
      const vy = height / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, 0, width, height);
      ctx.clip();

      for (const pt of particles) {
        if (pt.pz <= 0.01 || pt.z <= 0.01) continue;

        // Projection 3D → 2D (même principe que sketch.js : x/z donne la position écran)
        const sx  = isLeft
          ? vx - (pt.ox / pt.z)  * width  * 1.5
          : vx + (pt.ox / pt.z)  * width  * 1.5;
        const sy  = vy + (pt.oy  / pt.z)  * height * 0.6;
        const px2 = isLeft
          ? vx - (pt.ox / pt.pz) * width  * 1.5
          : vx + (pt.ox / pt.pz) * width  * 1.5;
        const py2 = vy + (pt.oy  / pt.pz) * height * 0.6;

        // Épaisseur et opacité croissantes à mesure que la particule se rapproche
        const nearness  = 1 - pt.z;
        const strokeW   = Math.max(0.4, nearness * 4 * (playing ? 1.6 : 0.6));
        const alpha     = Math.min(0.95, nearness * 2 + 0.05) * (playing ? 0.9 : 0.25);

        const rc = pt.color;
        const rr = parseInt(rc.slice(1, 3), 16);
        const rg = parseInt(rc.slice(3, 5), 16);
        const rb = parseInt(rc.slice(5, 7), 16);

        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${alpha})`;
        ctx.lineWidth   = strokeW;
        ctx.beginPath();
        ctx.moveTo(px2, py2);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 4. Orbes flottantes colorées ──────────────────────────────────────
    const halfOrbs = Math.floor(this.sideOrbs.length / 2);
    const orbs = isLeft ? this.sideOrbs.slice(0, halfOrbs) : this.sideOrbs.slice(halfOrbs);
    for (const o of orbs) {
      const ox  = startX + o.x * width;
      const oy  = o.y * height;
      const br  = 0.35 + 0.65 * Math.abs(Math.sin(o.phase));
      const al  = br * (playing ? 0.85 : 0.2);
      const sz  = o.size;

      ctx.save();
      // Halo extérieur diffus
      const gr1 = ctx.createRadialGradient(ox, oy, 0, ox, oy, sz * 4);
      gr1.addColorStop(0,   `hsla(${o.hue},100%,70%,${al * 0.25})`);
      gr1.addColorStop(1,   `hsla(${o.hue},100%,50%,0)`);
      ctx.fillStyle = gr1; ctx.fillRect(ox-sz*4, oy-sz*4, sz*8, sz*8);
      // Halo intermédiaire
      ctx.beginPath(); ctx.arc(ox, oy, sz * 2, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${o.hue},100%,75%,${al * 0.35})`; ctx.fill();
      // Cœur brillant
      ctx.beginPath(); ctx.arc(ox, oy, sz, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${o.hue},100%,92%,${al})`; ctx.fill();
      ctx.restore();
    }

    // ── 5. Lueur d'ambiance depuis le bord du viewport ────────────────────
    ctx.save();
    const edgeGr = ctx.createLinearGradient(
      isLeft ? startX+width : startX, 0,
      isLeft ? startX : startX+width, 0
    );
    edgeGr.addColorStop(0,   `rgba(${r},${g},${b},${playing?0.35:0.06})`);
    edgeGr.addColorStop(0.25,`rgba(${r},${g},${b},${playing?0.08:0.02})`);
    edgeGr.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = edgeGr; ctx.fillRect(startX, 0, width, height);
    ctx.restore();
  }

  // ─── Zone ──────────────────────────────────────────────────────────────────

  _drawZone(p, i) {
    const z    = this.ZONES[i];
    const r    = this._zoneRect(i);
    const animL = this.zoneAnimL[i];
    const animR = this.zoneAnimR[i];
    const anim  = Math.max(animL, animR);  // 0=inactif, 1=actif
    const ctx   = p.drawingContext;
    const rad   = 22;

    // Fond de la zone
    ctx.save();
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, rad);
    ctx.fillStyle = this._rgba(z.color, 0.06 + anim * 0.70);
    ctx.fill();

    // Bordure
    ctx.strokeStyle = this._rgba(z.color, 0.25 + anim * 0.75);
    ctx.lineWidth   = 1.5 + anim * 3;
    ctx.stroke();
    ctx.restore();

    // Halo externe quand actif
    if (anim > 0.05) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(r.x-6, r.y-6, r.w+12, r.h+12, rad+6);
      ctx.strokeStyle = this._rgba(z.color, anim * 0.35);
      ctx.lineWidth   = 10; ctx.filter = 'blur(8px)';
      ctx.stroke(); ctx.restore();
    }

    // Contenu textuel
    const cx = r.x + r.w/2, cy = r.y + r.h/2;
    const textCol = anim > 0.5 ? '#0a0a14' : z.color;

    // Nom de la note (grand)
    p.noStroke(); p.fill(textCol);
    p.textFont('Montserrat'); p.textStyle(p.BOLD);
    p.textSize(Math.max(40, r.h * 0.38));
    p.textAlign(p.CENTER, p.CENTER);
    p.text(z.note, cx, cy - r.h * 0.08);

    // Type d'accord
    p.textFont('Inter'); p.textStyle(p.NORMAL);
    p.textSize(Math.max(14, r.h * 0.13));
    p.text(z.type, cx, cy + r.h * 0.22);

    // Degré romain (coin haut gauche)
    const dc = p.color(textCol); dc.setAlpha(anim > 0.5 ? 140 : 120);
    p.fill(dc); p.textFont('Montserrat'); p.textStyle(p.BOLD);
    p.textSize(Math.max(10, r.h * 0.1));
    p.textAlign(p.LEFT, p.TOP); p.text(z.degree, r.x+12, r.y+10);

    // Labels de rangée (au-dessus du premier bouton)
    if (i === 0) {
      p.fill('#fff854'); p.textSize(Math.max(9, this.REF_H*0.016));
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text('AIGUS ↑ · sons brillants et cristallins', r.x, r.y - 5);
    }
  }

  // ─── Curseur (doigt ou souris) ─────────────────────────────────────────────

  _drawCursor(p, pos, color) {
    if (!pos) return;
    // Vérifie que le curseur est dans le viewport (pour la souris)
    if (pos.x < -20 || pos.x > this.REF_W+20 || pos.y < -20 || pos.y > this.REF_H+20) return;

    const gc = p.color(color); gc.setAlpha(55);
    p.fill(gc); p.noStroke(); p.circle(pos.x, pos.y, 50);
    const cc = p.color(color); cc.setAlpha(230);
    p.fill(cc); p.circle(pos.x, pos.y, 18);
    p.fill(255, 255, 255, 100); p.circle(pos.x-4, pos.y-4, 7);
  }

  // ─── Header ────────────────────────────────────────────────────────────────

  _drawHeader(p) {
    const hh  = Math.max(50, this.REF_H * 0.13);
    const ctx = p.drawingContext;

    // Fond du header
    const bg = p.color(DS.panel); bg.setAlpha(220);
    p.fill(bg); p.noStroke(); p.rect(0, 0, this.REF_W, hh);
    // Ligne de séparation accent
    p.stroke('#cb6ce6'); p.strokeWeight(2); p.line(0, hh, this.REF_W, hh); p.noStroke();
    // Bande accent top (DS style)
    p.fill('#F72585'); p.rect(0, 0, this.REF_W, 4); p.noStroke();

    // ── Titre centré ──────────────────────────────────────────────────────
    p.fill('#29ffdf'); p.textFont('Montserrat'); p.textStyle(p.BOLD);
    p.textSize(Math.max(13, hh * 0.22)); p.textAlign(p.CENTER, p.CENTER);
    p.text('SYNTHÉTISEUR · entre dans une zone pour jouer', this.REF_W / 2, hh / 2);

    // ── Indicateur note en haut à gauche ─────────────────────────────────
    const az = this.activeZoneR >= 0 ? this.activeZoneR : this.activeZoneL;
    const noteW  = this.REF_W * 0.18;
    const noteX  = 0;
    const noteH  = hh;

    if (az >= 0) {
      const z = this.ZONES[az];
      // Fond coloré translucide
      ctx.save();
      ctx.fillStyle = this._rgba(z.color, 0.18);
      ctx.fillRect(noteX, 0, noteW, noteH);
      // Barre gauche pleine couleur
      ctx.fillStyle = z.color;
      ctx.fillRect(noteX, 4, 5, noteH - 4);
      ctx.restore();

      // Note (grand)
      p.fill(z.color); p.textFont('Montserrat'); p.textStyle(p.BOLD);
      p.textSize(Math.max(24, hh * 0.46));
      p.textAlign(p.LEFT, p.CENTER);
      p.text(`♪  ${z.note}`, noteX + 18, hh * 0.38);

      // Type + degré (petit, dessous)
      p.textFont('Inter'); p.textStyle(p.NORMAL);
      p.textSize(Math.max(11, hh * 0.19));
      const dc = p.color(z.color); dc.setAlpha(180);
      p.fill(dc);
      p.text(`${z.type.toUpperCase()}  ·  degré ${z.degree}`, noteX + 18, hh * 0.72);
    } else {
      // Aucune zone active — placeholder grisé
      p.fill(80, 80, 100); p.textFont('Montserrat'); p.textStyle(p.BOLD);
      p.textSize(Math.max(15, hh * 0.27));
      p.textAlign(p.LEFT, p.CENTER);
      p.text('♪  —', noteX + 18, hh * 0.4);
      p.textFont('Inter'); p.textStyle(p.NORMAL);
      p.textSize(Math.max(10, hh * 0.17));
      p.fill(60, 60, 80);
      p.text('entre dans une zone', noteX + 18, hh * 0.72);
    }

    // ── Arc de progression (droite) ───────────────────────────────────────
    const prog = Math.min(this.playTime / this.REQUIRED_PLAY_MS, 1);
    const acr  = Math.max(14, hh * 0.38);
    const acx  = this.REF_W - acr - 18;
    const acy  = hh / 2;
    p.noFill(); p.stroke('#191970'); p.strokeWeight(3.5); p.circle(acx, acy, acr * 2);
    if (prog > 0) {
      p.stroke(this.showNextBtn ? '#fff854' : '#29ffdf');
      p.strokeWeight(3.5);
      p.arc(acx, acy, acr * 2, acr * 2, -p.HALF_PI, -p.HALF_PI + p.TWO_PI * prog);
    }
    p.noStroke();
    if (this.showNextBtn) {
      p.fill('#fff854'); p.textFont('Montserrat'); p.textStyle(p.BOLD);
      p.textSize(Math.max(11, acr * 0.7)); p.textAlign(p.CENTER, p.CENTER); p.text('✓', acx, acy + 1);
    } else if (this.playTime > 0) {
      p.fill('#6a6a8a'); p.textFont('Inter'); p.textStyle(p.NORMAL);
      p.textSize(Math.max(10, acr * 0.62)); p.textAlign(p.CENTER, p.CENTER);
      const s = Math.ceil((this.REQUIRED_PLAY_MS - this.playTime) / 1000);
      p.text(s > 0 ? `${s}s` : '', acx, acy + 1);
    }
  }

  // ─── Bouton Suivant — style identique à la quête 3 ────────────────────────

  _drawNextBtn(p) {
    const eased  = 1 - Math.pow(1 - this.nextBtnAnim, 3);
    const gameW  = this.REF_W * this.gameScale;
    const rightX = this.gameOx + gameW;
    const rightW = p.width - rightX;

    const bw  = Math.min(Math.max(rightW * 0.65, 120), 260);
    const bh  = Math.max(60, p.height * 0.1);
    const bx  = p.lerp(p.width + bw + 20, rightX + (rightW - bw) / 2, eased);
    const by  = p.height * 0.65;
    this.nextBtnRect = { x: bx, y: by, w: bw, h: bh };

    const prog = this.nextDwellProgress;
    const ctx  = p.drawingContext;
    const cut  = Math.max(14, bh * 0.22);

    ctx.save();

    // 1. Fond sombre (polygon à coins coupés comme quête 3)
    this._dsChampferPath(ctx, bx, by, bw, bh, cut);
    ctx.fillStyle = 'rgba(10, 10, 20, 0.94)';
    ctx.fill();

    // 2. Remplissage de progression (gauche → droite, clippé au polygon)
    if (prog > 0) {
      ctx.save();
      this._dsChampferPath(ctx, bx, by, bw, bh, cut);
      ctx.clip();
      ctx.fillStyle = '#F72585';
      ctx.fillRect(bx, by, bw * prog, bh);
      ctx.restore();
    }

    // 3. Bande accent en haut (comme .context-menu::before)
    ctx.fillStyle = '#F72585';
    ctx.fillRect(bx, by, bw, 5);

    // 4. Bordure
    this._dsChampferPath(ctx, bx, by, bw, bh, cut);
    ctx.strokeStyle = prog > 0 ? '#F72585' : 'rgba(247, 37, 133, 0.45)';
    ctx.lineWidth   = prog > 0 ? 2.5 : 1.5;
    ctx.stroke();

    // 5. Label
    const fs = Math.max(14, bh * 0.23);
    ctx.font         = `900 ${fs}px 'Montserrat', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'center';
    ctx.fillStyle    = prog > 0.5 ? 'rgba(0,0,0,0.9)' : '#ffffff';
    ctx.fillText('QUÊTE SUIVANTE  ▶', bx + bw / 2, by + bh / 2 + 1);

    ctx.restore();
    p.noStroke();
  }

  // Identique à la quête 3 — polygon à coins coupés (DS clip-path)
  _dsChampferPath(ctx, x, y, w, h, cut) {
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + w,   y);
    ctx.lineTo(x + w,   y + h - cut);
    ctx.lineTo(x + w - cut, y + h);
    ctx.lineTo(x,        y + h);
    ctx.lineTo(x,        y + cut);
    ctx.closePath();
  }

  // Affiché uniquement si le navigateur a bloqué l'audio au démarrage
  _drawAudioHint(p) {
    const pulse = 0.5 + 0.5 * Math.sin(p.frameCount * 0.08);
    const msg   = 'Clic ou touche pour activer le son 🎵';
    p.noStroke();
    p.fill(255, 220, 50, 200 * pulse);
    p.textFont('Montserrat'); p.textStyle(p.BOLD);
    p.textSize(Math.max(14, this.REF_H * 0.025));
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(msg, this.REF_W / 2, this.REF_H - 8);
  }

  _rgba(hex, a) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ─── Événements ────────────────────────────────────────────────────────────

  onMousePressed(p) {
    try{p.userStartAudio();}catch(e){}
    if (!this.audioStarted) this._startAudio();

    // Clic souris = validation immédiate (sans attendre le dwell caméra)
    if (this.showNextBtn && !this._finishing) {
      const r = this.nextBtnRect;
      if (p.mouseX>=r.x&&p.mouseX<=r.x+r.w&&p.mouseY>=r.y&&p.mouseY<=r.y+r.h) {
        this.nextDwellProgress = 1;
        this._triggerComplete();
      }
    }
  }

  onMouseDragged(p) {}
  onMouseReleased(p) {}
  onKeyPressed(p) {
    // N'importe quelle touche démarre l'audio (fallback pour cave sans souris)
    try{p.userStartAudio();}catch(e){}
    if (!this.audioStarted) this._startAudio();
  }
  onKeyReleased(p) {}
  onWindowResized(p) { this._updateViewport(p); }
}

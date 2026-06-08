class Quete1 extends Quest {
  constructor() {
    super({
      id: 'q1',
      title: 'Quête 1 · Le portail mélodique',
      author: 'Limpia',
      progressPercent: 25,
      parcelName: 'Un livre',
      npcName: 'Vieil hermite',
      briefing:
        "Livre ce livre au vieil hermite. Sur le chemin, un portail fermé : pour l'ouvrir, retrouve la note manquante de la mélodie. Utilise tes mains.",
      successText:
        "Vous avez livré le livre à l'hermite. Le portail est resté ouvert derrière vous.",
      mapLocation: { x: 77, z: 77 },
      locationLabel: 'Antenne nord-ouest'
    });

    // Phase : WALKING → INSTRUCTIONS → PLAYING → SUCCESS
    this.phase = 'WALKING';

    // --- Phase WALKING (debut.js) ---
    this.charX = 0;
    this.charY = 0;
    this.groundY = 0;
    this.walkMoveDistance = 0;
    this.walkDoorAppeared = false;
    this.walkDoorX = 0;
    this.walkDoorY = 0;
    this.walkDoorWidth = 300;
    this.walkDoorHeight = 500;
    this.walkDoorTriggerDistance = 400;
    this.walkKeys = {};

    // --- Phase PLAYING (jeu.js) ---
    this.video = null;
    this.handPose = null;
    this.hands = [];
    this.cameraReady = false;
    this.holdingNote = null;
    this.notes = [];
    this.slots = [];
    this.melody = [0, 1, 2, 3, 4];
    this.noteNames = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
    this.frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
    this.doorX = 0;
    this.doorY = 0;
    this.doorWidth = 482;
    this.doorHeight = 525;
    this.doorOpen = false;
    this.doorFlash = 0;
    this.failTimeout = null;
    this.successTimeout = null;
    this.message = '';
    this.melodyPlaying = false;
    this.oscillator = null;
    this._finishing = false;
  }

  setup(p) {
    super.setup(p);
    this.phase = 'WALKING';
    this._finishing = false;

    // Init marche
    this.groundY = p.height * 0.7;
    this.charX = p.width * 0.2;
    this.charY = this.groundY - 40;
    this.walkMoveDistance = 0;
    this.walkDoorAppeared = false;
    this.walkDoorX = p.width + this.walkDoorWidth;
    this.walkDoorY = this.groundY - this.walkDoorHeight / 2;
    this.walkKeys = {};

    // Init puzzle
    this._initDoor(p);
    this.doorOpen = false;
    this.doorFlash = 0;
    this.holdingNote = null;
    this.message = '';

    // Caméra + handpose (chargement en arrière-plan pendant la marche)
    this.video = p.createCapture(p.VIDEO, () => {
      this.video.size(320, 240);
      this.video.hide();
      try {
        this.handPose = ml5.handPose(() => {
          if (this.video && this.handPose) {
            this.handPose.detectStart(this.video, (results) => {
              if (this.handPose) this.hands = results;
            });
            this.cameraReady = true;
          }
        });
      } catch (e) {
        console.warn('[Q1] handPose init failed', e);
        this.cameraReady = false;
      }
    });
    this.video.hide();

    try {
      p.userStartAudio();
      this.oscillator = new p5.Oscillator('sine');
      this.oscillator.start();
      this.oscillator.amp(0);
    } catch (e) {
      console.warn('[Q1] oscillator init failed', e);
    }

    this._initNotes(p);
    this._initSlots();
  }

  update(p) {
    if (this.phase === 'WALKING') {
      this._updateWalking(p);
    } else if (this.phase === 'PLAYING') {
      if (!this.doorOpen && this.cameraReady) this._handleHandInput(p);
    }
  }

  draw(p) {
    if (this.phase === 'WALKING') {
      this._drawWalkingPhase(p);
    } else if (this.phase === 'INSTRUCTIONS') {
      this._drawInstructionScreen(p);
    } else {
      p.background('#191970');
      this._drawFloor(p);
      this._drawDoor(p);
      this._drawDoorSlots(p);
      this._drawNotes(p);
      this._drawStatus(p);
      if (this.doorFlash > 0) this.doorFlash -= 5;
    }
  }

  cleanup(p) {
    super.cleanup(p);
    if (this.failTimeout)    { clearTimeout(this.failTimeout);    this.failTimeout = null; }
    if (this.successTimeout) { clearTimeout(this.successTimeout); this.successTimeout = null; }
    if (this.handPose) {
      const hp = this.handPose;
      this.handPose = null;
      try { if (hp.detectStop) hp.detectStop(); } catch (e) {}
    }
    if (this.video) {
      try { this.video.remove(); } catch (e) {}
      this.video = null;
    }
    if (this.oscillator) {
      try { this.oscillator.amp(0, 0); this.oscillator.stop(); } catch (e) {}
      this.oscillator = null;
    }
    this.hands = [];
    this.cameraReady = false;
    this.holdingNote = null;
    this.walkKeys = {};
  }

  _initDoor(p) {
    this.doorWidth  = Math.min(p.width * 0.34, 520);
    this.doorHeight = Math.min(p.height * 0.70, this.doorWidth * 1.15);
    this.doorX = (p.width  - this.doorWidth)  / 2;
    this.doorY = p.height  * 0.04;
    this.slotR = Math.round(this.doorWidth * 0.066);
  }

  // ─── Phase WALKING ───────────────────────────────────────────────────────────

  _updateWalking(p) {
    const speed = 5;
    if (this.walkKeys['d'] || this.walkKeys['D']) {
      this.charX += speed;
      this.walkMoveDistance += speed;
    }
    if (this.walkKeys['q'] || this.walkKeys['Q']) {
      this.charX -= speed;
      this.walkMoveDistance -= speed;
      if (this.walkMoveDistance < 0) this.walkMoveDistance = 0;
    }
    this.charX = p.constrain(this.charX, 50, p.width - 50);

    if (this.walkMoveDistance >= this.walkDoorTriggerDistance) {
      this.walkDoorAppeared = true;
      this.walkDoorX = p.width + this.walkDoorWidth - (this.walkMoveDistance - this.walkDoorTriggerDistance) * 1.4;
    }

    if (this.walkDoorAppeared) {
      const doorLeft = this.walkDoorX - this.walkDoorWidth / 2;
      if (this.charX + 15 >= doorLeft) {
        this.phase = 'INSTRUCTIONS';
      }
    }
  }

  _drawWalkingPhase(p) {
    p.background('#191970');

    // Sol
    p.noStroke();
    p.fill('#ff7ad1');
    p.rect(0, this.groundY, p.width, p.height - this.groundY);
    p.stroke('#ffd9f4');
    p.strokeWeight(40);
    p.line(0, this.groundY + 20, p.width, this.groundY + 20);
    p.noStroke();

    // Indice de départ
    if (this.walkMoveDistance < 60) {
      p.fill('#29ffdf');
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(p.min(p.width * 0.025, 22));
      p.text('Appuie sur D pour avancer →', p.width / 2, p.height * 0.14);
    }

    this._drawWalkCharacter(p);
    this._drawBook(p);
    if (this.walkDoorAppeared) this._drawWalkDoor(p);
  }

  _drawWalkCharacter(p) {
    const moving = this.walkKeys['d'] || this.walkKeys['D'] || this.walkKeys['q'] || this.walkKeys['Q'];
    const walkT  = moving ? p.frameCount * 0.15 : 0;
    drawJaxx2D(p, this.charX, this.charY, 1, 0, walkT, 1);
  }

  _drawBook(p) {
    p.push();
    p.translate(this.charX + 24, this.charY + 10);
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill('#e38a1e');
    p.rect(0, 0, 22, 28, 4);
    p.fill('#d9750a');
    p.rect(0, 0, 16, 24, 4);
    p.fill('#c46209');
    p.rect(0, -4, 10, 3, 1);
    p.rect(0, 4, 10, 3, 1);
    p.pop();
  }

  _drawWalkDoor(p) {
    p.push();
    p.translate(this.walkDoorX, this.walkDoorY);
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill('#d9750a');
    p.rect(0, 0, this.walkDoorWidth, this.walkDoorHeight, 12);
    p.fill('#ff8b0e');
    p.rect(0, 25, this.walkDoorWidth * 0.8, this.walkDoorHeight * 0.9, 6);
    p.fill('#2c0a45');
    p.rect(0, 20, this.walkDoorWidth, this.walkDoorHeight * 0.2, 6);
    p.noFill();
    p.stroke('#ffffff');
    p.strokeWeight(2);
    for (let i = -2; i <= 2; i++) p.ellipse(i * 50, 20, 40, 40);
    p.pop();
  }

  // ─── Phase INSTRUCTIONS ──────────────────────────────────────────────────────

  _drawInstructionScreen(p) {
    p.background('#191970');
    this._drawFloor(p);
    this._drawDoor(p);
    this._drawDoorSlots(p);

    // Panel de consignes sous la porte
    const botY  = this.doorY + this.doorHeight;
    const midY  = botY + (p.height - botY) * 0.45;
    const lineH = p.height * 0.048;

    p.noStroke();
    p.fill(10, 10, 30, 180);
    p.rect(this.doorX - 30, botY + lineH * 0.2, this.doorWidth + 55, lineH * 3.2, 10);

    p.textAlign(p.CENTER, p.CENTER);
    p.fill('#29ffdf');
    p.textSize(p.min(p.width * 0.024, 26));
    p.text('▶  CLIQUER / APPUYER POUR COMMENCER', p.width / 2, midY - lineH * 1.2);
    p.fill(255, 200);
    p.textSize(p.min(p.width * 0.014, 15));
    p.text('Glissez les notes dans les emplacements pour reconstituer la mélodie.', p.width / 2, midY - lineH * 0.3);
    p.text('Utilisez vos mains ou la souris.', p.width / 2, midY + lineH * 0.5);
  }

  _startPlaying(p) {
    try {
      const ctx = p ? p.getAudioContext() : null;
      if (ctx && ctx.state !== 'running') ctx.resume();
    } catch (e) {}
    this.phase = 'PLAYING';
    this._playMelody();
  }

  // ─── Phase PLAYING : puzzle ───────────────────────────────────────────────────

  _initNotes(p) {
    this.notes = this.noteNames.map((name, index) => {
      const x = p.width * 0.15 + index * (p.width * 0.11);
      const y = p.height * 0.78;
      return { name, index, freq: this.frequencies[index], homeX: x, homeY: y, x, y, r: 30, placedSlot: null, grabbed: false };
    });
  }

  _initSlots() {
    const count = this.melody.length;
    const dW = this.doorWidth, dH = this.doorHeight;
    const slotY = this.doorY + dH * 0.44;
    const slotAreaWidth = dW * 0.64;
    const left = this.doorX + (dW - slotAreaWidth) / 2;
    const spacing = count > 1 ? slotAreaWidth / (count - 1) : 0;
    this.slots = Array.from({ length: count }, (_, i) => ({
      x: left + i * spacing,
      y: slotY,
      note: null
    }));
  }

  _drawFloor(p) {
    const cx = this.doorX + this.doorWidth / 2;
    const dW = this.doorWidth;
    p.noStroke();
    p.fill('#ff7ad1');
    p.rect(cx - dW * 0.60, 0, dW * 1.20, p.height);
    p.fill('#ffd9f4');
    p.rect(cx - dW * 0.33, 0, dW * 0.66, p.height);
  }

  _drawDoor(p) {
    const dW = this.doorWidth, dH = this.doorHeight;
    p.push();
    p.translate(this.doorX, this.doorY);
    p.noStroke();
    if (this.doorOpen) {
      const leafW = dW / 3;
      p.fill('#d9750a');
      p.rect(-52, -30, leafW, dH, 2);
      p.rect(399, -30, leafW, dH, 2);
    } else {
      if (this.doorFlash > 0) p.fill(255, 100, 100, this.doorFlash);
      else p.fill('#d9750a');
      p.rect(-52, -30, dW + 104, dH, 2);
      const px = dW * 0.12, py = dH * 0.09;
      p.fill('#ff8b0e');
      p.rect(px, 10, dW - px * 2, dH - py * 2, 4);
      p.fill('#2c0a45');
      p.rect(-52, 175, dW + 104, dH * 0.18);
    }
    p.pop();
  }

  _drawDoorSlots(p) {
    const r = this.slotR || 30;
    this.slots.forEach(slot => {
      p.push();
      p.translate(slot.x, slot.y);
      p.noFill();
      p.stroke('#ffffff');
      p.strokeWeight(2);
      p.ellipse(0, 0, r * 2, r * 2);
      if (slot.note) {
        p.fill('#29ffdf');
        p.noStroke();
        p.ellipse(0, 0, r * 1.73, r * 1.73);
        p.fill('#2c0a45');
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(r * 0.6);
        p.text(slot.note.name, 0, 0);
      }
      p.pop();
    });
  }

  _drawNotes(p) {
    this.notes.forEach(note => {
      if (note === this.holdingNote && note.grabbed && !note.placedSlot) return;
      this._drawNote(p, note);
    });
    if (this.holdingNote && this.holdingNote.grabbed && !this.holdingNote.placedSlot) {
      this._drawNote(p, this.holdingNote);
    }
  }

  _drawNote(p, note) {
    p.push();
    p.translate(note.x, note.y);
    p.fill('#e38a1e');
    p.noStroke();
    p.ellipse(0, 0, note.r * 2, note.r * 2);
    p.fill('#ffcf8c');
    p.ellipse(0, 0, note.r * 1.4, note.r * 1.4);
    p.fill('#2c0a45');
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(16);
    p.text(note.name, 0, 0);
    p.pop();
  }

  _drawStatus(p) {
    if (!this.message) return;
    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(24);
    const msgX = p.width / 2;
    const msgY = p.height * 0.2;
    const paddingX = 24;
    const paddingY = 12;
    const w = p.textWidth(this.message) + paddingX * 2;
    const h = p.textAscent() + p.textDescent() + paddingY * 2;
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill(0, 0, 0, 170);
    p.rect(msgX, msgY, w, h, 8);
    p.fill('#16cbb0');
    p.text(this.message, msgX, msgY);
    p.pop();
  }

  _handleHandInput(p) {
    if (!this.hands || this.hands.length === 0) return;
    const hand = this.hands[0];
    const thumb = hand.thumb_tip;
    const index = hand.index_finger_tip;
    if (!thumb || !index) return;

    const screenX = p.map(index.x, 0, this.video.width, p.width, 0);
    const screenY = p.map(index.y, 0, this.video.height, 0, p.height);
    const thumbX  = p.map(thumb.x,  0, this.video.width, p.width, 0);
    const thumbY  = p.map(thumb.y,  0, this.video.height, 0, p.height);
    const grabDist = p.dist(screenX, screenY, thumbX, thumbY);

    if (grabDist < 60 && !this.holdingNote) this._pickNoteAt(screenX, screenY);
    if (grabDist < 60 && this.holdingNote) {
      this.holdingNote.x = screenX;
      this.holdingNote.y = screenY;
    }
    if (grabDist >= 60 && this.holdingNote) this._releaseHeldNote();
  }

  _pickNoteAt(x, y) {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      if (Math.hypot(x - note.x, y - note.y) < note.r) {
        if (note.placedSlot !== null) {
          this.slots[note.placedSlot].note = null;
          note.placedSlot = null;
        }
        note.grabbed = true;
        this.holdingNote = note;
        return;
      }
    }
  }

  _releaseHeldNote() {
    if (!this.holdingNote) return;
    if (this._placeNoteOnDoor(this.holdingNote)) this._playTone(this.holdingNote.freq);
    else this._resetNote(this.holdingNote);
    this.holdingNote.grabbed = false;
    this.holdingNote = null;
    this._checkPlacedMelody();
  }

  _placeNoteOnDoor(note) {
    let closest = null;
    let best = 999;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.note) continue;
      const d = Math.hypot(note.x - slot.x, note.y - slot.y);
      if (d < best) { best = d; closest = slot; }
    }
    if (closest && best < 80) {
      closest.note = note;
      note.placedSlot = this.slots.indexOf(closest);
      note.x = closest.x;
      note.y = closest.y;
      return true;
    }
    return false;
  }

  _resetNote(note) {
    note.placedSlot = null;
    note.grabbed = false;
    note.x = note.homeX;
    note.y = note.homeY;
  }

  _checkPlacedMelody() {
    if (this.slots.some(slot => !slot.note)) return;
    const placed = this.slots.map(slot => slot.note.index);
    const correct = placed.every((v, i) => v === this.melody[i]);
    if (correct) {
      this.doorOpen = true;
      this.message = 'VOUS AVEZ RÉUSSI À OUVRIR LA PORTE ET À LIVRER VOTRE COLIS';
      this._playMelody();
      if (this.successTimeout) clearTimeout(this.successTimeout);
      this.successTimeout = setTimeout(() => {
        if (!this._finishing) {
          this._finishing = true;
          this.complete();
        }
      }, 2400);
    } else {
      this.doorFlash = 255;
      if (this.failTimeout) clearTimeout(this.failTimeout);
      this.failTimeout = setTimeout(() => {
        this.doorFlash = 0;
        this._clearPlacedNotes();
        this._playMelody();
      }, 600);
    }
  }

  _clearPlacedNotes() {
    this.slots.forEach(slot => {
      if (slot.note) { this._resetNote(slot.note); slot.note = null; }
    });
  }

  _playMelody() {
    if (this.melodyPlaying || !this.oscillator) return;
    this.melodyPlaying = true;
    let delay = 0;
    this.melody.forEach(noteIndex => {
      setTimeout(() => this._playTone(this.frequencies[noteIndex]), delay);
      delay += 450;
    });
    setTimeout(() => {
      this.melodyPlaying = false;
      if (this.oscillator) this.oscillator.amp(0, 0.1);
    }, delay);
  }

  _playTone(freq) {
    if (!this.oscillator) return;
    this.oscillator.freq(freq);
    this.oscillator.amp(0.5, 0.05);
    setTimeout(() => { if (this.oscillator) this.oscillator.amp(0, 0.1); }, 300);
  }

  // ─── Événements ──────────────────────────────────────────────────────────────

  onMousePressed(p) {
    if (this.phase === 'INSTRUCTIONS') {
      this._startPlaying(p);
      return;
    }
    if (this.phase === 'PLAYING') this._pickNoteAt(p.mouseX, p.mouseY);
  }

  onMouseDragged(p) {
    if (this.phase === 'PLAYING' && this.holdingNote) {
      this.holdingNote.x = p.mouseX;
      this.holdingNote.y = p.mouseY;
    }
  }

  onMouseReleased(p) {
    if (this.phase === 'PLAYING' && this.holdingNote) this._releaseHeldNote();
  }

  onKeyPressed(p) {
    if (this.phase === 'WALKING') {
      this.walkKeys[p.key] = true;
      return;
    }
    if (this.phase === 'INSTRUCTIONS') {
      this._startPlaying(p);
      return;
    }
    if (p.key === 'z' || p.key === 'Z') this._pickNoteAt(p.mouseX, p.mouseY);
    if ((p.key === 's' || p.key === 'S') && this.holdingNote) this._releaseHeldNote();
  }

  onKeyReleased(p) {
    if (this.phase === 'WALKING') this.walkKeys[p.key] = false;
  }

  onWindowResized(p) {
    this.groundY = p.height * 0.7;
    this.charY = this.groundY - 40;
    this.walkDoorY = this.groundY - this.walkDoorHeight / 2;
    this._initDoor(p);
    this._initNotes(p);
    this._initSlots();
  }
}

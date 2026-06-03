class Quete6 extends Quest {
  constructor() {
    super({
      id: 'q6',
      title: 'Quête 6 · Le castor flappy',
      author: 'Limpia',
      progressPercent: 100,
      parcelName: "Bonbonne d'eau",
      npcName: 'Famille au bord du pont',
      briefing:
        "Livre cette bonbonne d'eau à la famille. Le pont est cassé : aide le castor à traverser de plateforme en plateforme avec ta voix.",
      successText:
        "Le castor a réparé le pont, et la bonbonne d'eau est livrée. Mission accomplie !",
      mapLocation: { x: 700, z: 3000 },
      locationLabel: 'Pont sud-ouest'
    });

    this.mic = null;
    this.micStarted = false;
    this.status = 'START';
    this.bridgeRepaired = false;

    this.charX = 0; this.charY = 0;
    this.beaverX = 0; this.beaverY = 0;
    this.beaverVelY = 0;
    this.gravity = 0.6;
    this.jumpPower = -12;
    this.moveSpeed = 3;

    this.holes = [];
    this.groundY = 0;
    this.cliffWidth = 0;
    this.cliffHeight = 0;
    this._finishing = false;
    this._winTimeout = null;
    this._gameOverTimeout = null;
  }

  setup(p) {
    super.setup(p);
    this._finishing = false;
    this.status = 'START';

    this.cliffWidth = p.width * 0.2;
    this.cliffHeight = p.height * 0.5;
    this.groundY = p.height - this.cliffHeight;

    try {
      this.mic = new p5.AudioIn();
    } catch (e) {
      console.warn('[Q6] AudioIn init failed', e);
      this.mic = null;
    }

    this._initGame(p);
  }

  _initGame(p) {
    this.charX = this.cliffWidth * 0.4;
    this.charY = this.groundY - 40;
    this.beaverX = this.cliffWidth * 0.7;
    this.beaverY = this.groundY - 20;
    this.beaverVelY = 0;
    this.bridgeRepaired = false;
    this.status = (this.status === 'START') ? 'START' : 'PLAYING';
    this.holes = [
      { x: p.width * 0.3, w: p.width * 0.10 },
      { x: p.width * 0.5, w: p.width * 0.12 },
      { x: p.width * 0.7, w: p.width * 0.08 }
    ];
  }

  update(p) {
    if (this.status !== 'PLAYING') return;
    const level = this.mic ? this.mic.getLevel() : 0;
    this._handleInput(level);
    this._checkCollisions(p);
  }

  draw(p) {
    p.background('#191970');

    if (this.status === 'START') {
      this._drawCliffs(p);
      this._drawBridge(p);
      this._drawCharacter(p, 0);
      this._drawWaterBottle(p);
      this._drawBeaver(p);
      this._drawUI(p, 'CLIQUER POUR COMMENCER LA QUÊTE');
      return;
    }

    const level = this.mic ? this.mic.getLevel() : 0;
    this._drawCliffs(p);
    this._drawBridge(p);

    if (this.status === 'WON') {
      if (this.charX < this.beaverX - 25) {
        this.charX += 2.5;
        const humLevel = p.map(Math.sin(p.frameCount * 0.2), -1, 1, 0.01, 0.02);
        this._drawCharacter(p, humLevel);
      } else {
        this._drawCharacter(p, 0);
      }
      this._drawUI(p, 'LE PONT A ÉTÉ RÉPARÉ ET VOUS AVEZ RÉUSSI À LIVRER LE COLIS');
      if (!this._finishing) {
        this._finishing = true;
        if (this._winTimeout) clearTimeout(this._winTimeout);
        this._winTimeout = setTimeout(() => this.complete(), 3500);
      }
    } else if (this.status === 'GAMEOVER') {
      this._drawUI(p, 'GAME OVER');
    }

    if (this.status !== 'WON') this._drawCharacter(p, level);
    this._drawWaterBottle(p);
    this._drawBeaver(p);
  }

  cleanup(p) {
    super.cleanup(p);
    if (this._winTimeout)      { clearTimeout(this._winTimeout); this._winTimeout = null; }
    if (this._gameOverTimeout) { clearTimeout(this._gameOverTimeout); this._gameOverTimeout = null; }
    if (this.mic) {
      try { this.mic.stop(); } catch (e) {}
      this.mic = null;
    }
    this.micStarted = false;
  }

  _drawCliffs(p) {
    p.noStroke();
    p.fill('#ff7ad1');
    p.rect(0, this.groundY, this.cliffWidth, this.cliffHeight);
    p.rect(p.width - this.cliffWidth, this.groundY, this.cliffWidth, this.cliffHeight);
  }

  _drawBridge(p) {
    p.fill('#ffbd59');
    const bridgeStart = this.cliffWidth;
    const bridgeEnd = p.width - this.cliffWidth;
    const bridgeH = 15;
    if (this.bridgeRepaired) {
      p.rect(bridgeStart, this.groundY, bridgeEnd - bridgeStart, bridgeH);
    } else {
      let currentX = bridgeStart;
      for (const h of this.holes) {
        if (currentX < h.x) p.rect(currentX, this.groundY, h.x - currentX, bridgeH);
        currentX = h.x + h.w;
      }
      if (currentX < bridgeEnd) p.rect(currentX, this.groundY, bridgeEnd - currentX, bridgeH);
    }
  }

  _drawCharacter(p, level) {
    const moving = this.status === 'WON';
    const walkT  = moving ? p.frameCount * 0.15 : 0;
    const mouthLevel = p.map(level, 0, 0.05, 0, 1, true);
    drawJaxx2D(p, this.charX, this.charY, 1, mouthLevel, walkT, 1);
  }

  _drawBeaver(p) {
    p.push();
    p.translate(this.beaverX + 10, this.beaverY);
    p.noStroke();
    p.fill('#8B4513');
    p.ellipse(0, 5, 40, 30);
    p.ellipse(-8, -15, 28, 28);
    p.ellipse(-18, -28, 8, 12);
    p.ellipse(2, -28, 8, 12);
    p.fill('#000000');
    p.ellipse(-15, -18, 4, 5);
    p.ellipse(-2, -18, 4, 5);
    p.ellipse(-8, -10, 4, 4);
    p.fill('#FFFFFF');
    p.rect(-12, -5, 4, 6);
    p.rect(-6, -5, 4, 6);
    p.fill('#654321');
    p.ellipse(15, 15, 25, 12);
    p.pop();
  }

  _drawWaterBottle(p) {
    p.push();
    p.translate(this.charX + 26, this.charY + 9);
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill('#FFD700');
    p.rect(0, -22, 12, 6, 2);
    p.fill('#E8E8E8');
    p.rect(0, -16, 10, 10, 2);
    p.fill('#29ffdf');
    p.rect(0, 2, 18, 32, 5);
    p.fill(255, 255, 255, 100);
    p.ellipse(-3, -4, 6, 12);
    p.rectMode(p.CORNER);
    p.pop();
  }

  // Sensibilité du micro
  _handleInput(level) {
    const speakThresh = 0.001;
    const loudThresh = 0.003;
    if (level > loudThresh) {
      if (this.beaverY >= this.groundY - 21) this.beaverVelY = this.jumpPower;
      this.beaverX += this.moveSpeed * 1.5;
    } else if (level > speakThresh) {
      this.beaverX += this.moveSpeed;
    }
    this.beaverY += this.beaverVelY;
    if (this.beaverY < this.groundY - 20) this.beaverVelY += this.gravity;
    else { this.beaverY = this.groundY - 20; this.beaverVelY = 0; }
  }

  _checkCollisions(p) {
    if (this.beaverX > p.width - this.cliffWidth) {
      this.status = 'WON';
      this.bridgeRepaired = true;
      return;
    }
    if (this.beaverY >= this.groundY - 20) {
      if (this.beaverX > this.cliffWidth && this.beaverX < p.width - this.cliffWidth) {
        let isOverHole = false;
        for (const h of this.holes) {
          if (this.beaverX - 2 > h.x && this.beaverX - 2 < h.x + h.w) isOverHole = true;
        }
        if (isOverHole) {
          this.status = 'GAMEOVER';
          if (this._gameOverTimeout) clearTimeout(this._gameOverTimeout);
          this._gameOverTimeout = setTimeout(() => this._initGame(p), 500);
        }
      }
    }
  }

  _drawUI(p, msg) {
    const isStart   = msg === 'CLIQUER POUR COMMENCER LA QUÊTE';
    const isWon     = msg.startsWith('LE PONT');
    const titleSz   = Math.min(p.width * 0.035, 38);
    const acol      = isWon ? '#fff854' : isStart ? '#29ffdf' : '#ff7ad1';

    const panelW = Math.min(p.width * 0.82, 660);
    const panelH = isStart ? titleSz * 5.2 : titleSz * 3.0;
    const panelX = p.width / 2 - panelW / 2;
    const panelY = p.height * 0.10;
    dsPanel(p, panelX, panelY, panelW, panelH, { cut: 16, fill: '#0e0e1a', stroke: '#1e1e3a', alpha: 220 });

    p.noStroke();
    p.fill(acol);
    p.textFont('Montserrat');
    p.textStyle(p.BOLD);
    p.textSize(titleSz);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(msg, 500, panelY + 70, panelW - 40);

    if (isStart) {
      p.fill(DS.text);
      p.textFont('Inter');
      p.textStyle(p.NORMAL);
      p.textSize(Math.min(p.width * 0.020, 20));
      p.text('Parler doucement pour marcher et fort pour sauter', p.width / 2, panelY + titleSz * 4.2);
    }
  }

  _handleStartClick(p) {
    try {
      const ctx = p.getAudioContext();
      if (ctx.state !== 'running') ctx.resume();
    } catch (e) {}
    if (this.mic && !this.micStarted) {
      this.mic.start();
      this.micStarted = true;
    }
    if (this.status === 'START') this.status = 'PLAYING';
  }

  onMousePressed(p) { this._handleStartClick(p); }
  onMouseDragged(p) {}
  onMouseReleased(p) {}
  onKeyPressed(p)  {}
  onKeyReleased(p) {}
  onWindowResized(p) {
    this.cliffWidth = p.width * 0.2;
    this.cliffHeight = p.height * 0.5;
    this.groundY = p.height - this.cliffHeight;
    this._initGame(p);
  }
}

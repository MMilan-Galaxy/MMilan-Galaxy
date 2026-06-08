class PostOffice {
  constructor() {
    this.game = null;
    this.postman = new Postman({ name: 'Eugène' });
    this.mode = 'IDLE';
    this.currentQuest = null;
  }

  bindGame(game) { this.game = game; }

  enter(p) {
    this.mode = 'IDLE';
    this.currentQuest = null;
    if (this.game && this.game.hud) {
      this.game.hud.hidePrompt();
      this.game.hud.setLocation('Bureau de Poste', 'Parlez au facteur Eugène');
    }
    this._openBriefing();
  }

  enterEnding(p) {
    this.mode = 'IDLE';
    this.currentQuest = null;
    if (this.game && this.game.hud) {
      this.game.hud.hidePrompt();
      this.game.hud.setLocation('Bureau de Poste', 'Facteur Eugène');
    }
  }

  startBriefing(quest) {
    this.currentQuest = quest;
    this._openBriefing();
  }

  _openBriefing() {
    const quest = this._questForBriefing();
    if (!quest || !this.game || !this.game.hud) return;
    this.mode = 'BRIEFING';
    const isIntro = quest.autoCompleteOnAccept;
    this.game.hud.showDialog({
      badge: `Facteur Eugène · ${quest.title}`,
      text: quest.briefing,
      choices: [
        isIntro
          ? { label: "[ Bonne chance ! ]", sub: "Commencer les livraisons", shortcut: 'E', kind: 'highlight', action: 'accept' }
          : { label: '[ Accepter ]', sub: 'Partir en livraison', shortcut: 'E', kind: 'highlight', action: 'accept' }
      ],
      onChoice: (action) => {
        if (action === 'accept') this.game.startCurrentQuest();
      }
    });
  }

  _questForBriefing() {
    if (this.currentQuest) return this.currentQuest;
    return this.game && this.game.questManager.current();
  }

  update(p) {}

  draw(p) {
    p.background(15, 12, 25);

    p.perspective(p.PI / 3, p.width / p.height, 0.5, 3000);
    const sway = Math.sin(p.frameCount * 0.018) * 4;
    p.camera(0, -180 + sway, 230, 0, -180, -120, 0, 1, 0);

    p.ambientLight(70, 65, 90);
    p.pointLight(255, 220, 180, 0, -380, 60);
    p.pointLight(120, 200, 255, -250, -260, -180);
    p.pointLight(255, 180, 90, 250, -240, -100);
    p.pointLight(6, 214, 160, 0, -240, 0);

    p.noStroke();

    this._room(p);
    this._sign(p);
    this._shelves(p);
    this._counter(p);
    this._postmanScene(p);
    this._floatingParcel(p);
    this._deskItems(p);
  }

  _room(p) {
    p.push(); p.translate(0, 2, -20); p.fill('#5b3a8e'); p.box(900, 4, 560); p.pop();
    for (let i = -3; i <= 3; i++) {
      p.push(); p.translate(i * 130, 0, -20); p.fill('#3a2e5c'); p.box(2, 1, 560); p.pop();
    }
    p.push(); p.translate(0, -420, -20); p.fill('#1a1230'); p.box(900, 8, 560); p.pop();
    p.push(); p.translate(0, -210, -300); p.fill('#3a2e5c'); p.box(900, 420, 12); p.pop();
    p.push(); p.translate(0, -405, -293); p.emissiveMaterial(6, 214, 160); p.box(900, 4, 4); p.pop();
    p.push(); p.translate(-450, -210, -20); p.fill('#4a3a8e'); p.box(12, 420, 560); p.pop();
    p.push(); p.translate( 450, -210, -20); p.fill('#4a3a8e'); p.box(12, 420, 560); p.pop();
  }

  _sign(p) {
    p.push(); p.translate(0, -355, -290); p.fill('#ffd05a'); p.box(440, 76, 6); p.pop();
    p.push(); p.translate(0, -355, -286); p.emissiveMaterial(6, 214, 160); p.box(410, 60, 3); p.pop();
    for (let i = 0; i < 5; i++) {
      p.push(); p.translate(-140 + i * 70, -355, -283); p.fill('#1a1230'); p.box(30, 30, 2); p.pop();
    }
  }

  _shelves(p) {
    const pkgColors = [
      [255, 208, 90], [203, 108, 230], [255, 122, 209],
      [255, 51, 102], [122, 95, 235], [255, 190, 11]
    ];
    for (let row = 0; row < 3; row++) {
      const shelfY = -100 - row * 60;
      p.push(); p.translate(0, shelfY, -270); p.fill('#5b3a1f'); p.box(680, 8, 36); p.pop();
      p.push(); p.translate(-330, shelfY - 8, -270); p.fill('#3a200f'); p.box(8, 16, 32); p.pop();
      p.push(); p.translate( 330, shelfY - 8, -270); p.fill('#3a200f'); p.box(8, 16, 32); p.pop();
      for (let i = 0; i < 7; i++) {
        const c = pkgColors[(i + row * 2) % pkgColors.length];
        p.push();
        p.translate(-290 + i * 95, shelfY - 36, -270);
        p.fill(c[0], c[1], c[2]);
        p.box(58, 56, 28);
        p.push(); p.translate(0, 0, 15); p.fill('#5b3a1f'); p.box(58, 6, 1); p.box(6, 56, 1); p.pop();
        p.pop();
      }
    }
  }

  _counter(p) {
    p.push(); p.translate(0, -60, -40); p.fill('#5b3a1f'); p.box(620, 120, 90); p.pop();
    p.push(); p.translate(0, -125, -40); p.fill('#ffd05a'); p.box(640, 8, 100); p.pop();
    for (let i = -1; i <= 1; i++) {
      p.push();
      p.translate(i * 200, -50, 6);
      p.fill('#8b5b34'); p.box(170, 80, 1);
      p.push(); p.translate(0, 0, 2); p.emissiveMaterial(120, 80, 40); p.sphere(4); p.pop();
      p.pop();
    }
  }

  _postmanScene(p) {
    p.push();
    p.translate(0, 0, -150);
    this.postman.draw(p);
    p.pop();
  }

  _floatingParcel(p) {
    p.push();
    const float = Math.sin(p.frameCount * 0.05) * 5;
    p.translate(0, -160 + float, -10);
    p.rotateY(p.frameCount * 0.012);

    p.push();
    p.translate(0, 60, 0);
    p.rotateX(p.HALF_PI);
    const glow = 0.4 + 0.3 * Math.sin(p.frameCount * 0.08);
    p.emissiveMaterial(255 * glow, 190 * glow, 11 * glow);
    p.torus(40, 2, 24, 6);
    p.pop();

    p.fill('#ff3366'); p.box(55, 50, 55);
    p.push(); p.fill('#cb6ce6'); p.box(60, 8, 8); p.pop();
    p.push(); p.fill('#7a5feb'); p.box(8, 55, 8); p.pop();
    p.push(); p.fill('#cb6ce6'); p.box(8, 8, 60); p.pop();
    p.push();
    p.translate(0, -32, 0);
    p.fill('#cb6ce6');
    p.push(); p.translate(-10, 0, 0); p.sphere(8); p.pop();
    p.push(); p.translate( 10, 0, 0); p.sphere(8); p.pop();
    p.push(); p.translate(0, -2, 0); p.box(8, 4, 8); p.pop();
    p.pop();
    p.pop();
  }

  _deskItems(p) {
    p.push();
    p.translate(-240, -135, -30);
    p.fill('#3a2e5c'); p.cylinder(4, 30);
    p.translate(0, -22, 0);
    p.fill('#5b3a1f');
    p.push(); p.rotateZ(0.4); p.cylinder(3, 24); p.pop();
    p.translate(8, -10, 0);
    p.fill('#ffd05a');
    p.push(); p.scale(1, 0.7, 1); p.sphere(14); p.pop();
    p.emissiveMaterial(255, 220, 120);
    p.sphere(6);
    p.pop();

    p.push();
    p.translate(220, -136, -10);
    p.fill('#1a1230'); p.box(36, 6, 30);
    p.translate(0, -12, 0);
    p.fill('#7a5feb'); p.cylinder(6, 22);
    p.translate(0, -16, 0);
    p.fill('#cb6ce6');
    p.push(); p.scale(1.6, 0.6, 1); p.sphere(10); p.pop();
    p.pop();

    p.push();
    p.translate(-160, -132, 10);
    for (let i = 0; i < 5; i++) {
      p.push();
      p.translate(i * 0.6, -i * 1.4, i * 0.4);
      p.rotateY(i * 0.02);
      p.fill(255, 255 - i * 5, 240 - i * 10);
      p.box(38, 1.5, 26);
      p.pop();
    }
    p.pop();
  }

  onMousePressed(p) {}
  onKeyPressed(p) {
    if (p.key === 'Escape' && this.game) {
      this.game.hud.hideDialog();
      this.game.backToOverworld();
    }
  }
  onKeyReleased(p) {}
  onWindowResized(p) {}
}

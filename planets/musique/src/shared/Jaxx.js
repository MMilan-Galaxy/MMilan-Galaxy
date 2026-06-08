class Jaxx {
  constructor() {
    this.energy = 0;
    this.breathe = 0;
    this.hairPhase = 0;
    this.corePhase = 0;
    this.idleAngle = 0;
    this.eq  = Array.from({ length: 16 }, () => 0.1);
    this.eqT = Array.from({ length: 16 }, () => 0.1);
    this.pads = Array.from({ length: 6 }, () => ({ on: false, t: 0 }));
    this.armRotX = 0;
    this.coreRing = 0;
    this.legHipRotX_L = 0;
    this.legKneeRotX_L = 0;
    this.legHipRotX_R = 0;
    this.legKneeRotX_R = 0;
    this.armElbowRotX_L = 0.4;
    this.armElbowRotX_R = 0.5;
    this.walkCycle = 0;
  }

  update(p, speed, maxSpeed) {
    this.breathe   += 0.018;
    this.hairPhase += 0.035;
    this.corePhase += 0.07;
    this.idleAngle += 0.004;

    const target = p.constrain(p.map(speed, 0, maxSpeed || 1, 0, 1), 0, 1);
    this.energy   = p.lerp(this.energy, target, 0.07);
    this.coreRing += 0.05 + this.energy * 0.12;

    if (speed > 0) {
      this.walkCycle    += 0.2;
      this.legHipRotX_L  = Math.sin(this.walkCycle) * 0.5;
      this.legHipRotX_R  = Math.sin(this.walkCycle + Math.PI) * 0.5;
      this.armRotX       = Math.sin(this.walkCycle + Math.PI) * 0.4;
    } else {
      this.walkCycle     = 0;
      this.legHipRotX_L  = p.lerp(this.legHipRotX_L, 0, 0.2);
      this.legHipRotX_R  = p.lerp(this.legHipRotX_R, 0, 0.2);
      this.armRotX       = p.lerp(this.armRotX, 0, 0.1);
    }

    for (let i = 0; i < 16; i++) {
      if (p.random() < 0.12 + this.energy * 0.35)
        this.eqT[i] = p.random(0.05, 0.2 + this.energy * 0.8);
      this.eq[i] = p.lerp(this.eq[i], this.eqT[i], 0.18);
    }

    for (const pad of this.pads) {
      if (pad.t > 0) pad.t--;
      if (this.energy > 0.25 && p.random() < this.energy * 0.09) {
        pad.on = true;
        pad.t  = Math.floor(p.random(5, 22));
      }
      if (pad.t <= 0) pad.on = false;
    }
  }

  draw(p) {
    const bY = Math.sin(this.breathe) * 2.5;
    p.push();
    p.noStroke();
    p.translate(0, -150, 0);
    p.rotateY(Math.sin(this.idleAngle) * 0.06);
    this._legs(p);
    this._torso(p, bY);
    this._coreAmp(p, bY);
    this._arms(p, bY);
    this._head(p, bY);
    p.pop();
  }

  _resetGlow(p) { p.emissiveMaterial(0, 0, 0); }

  _legs(p) {
    this._resetGlow(p);

    // Jambe gauche
    p.push();
    p.translate(-22, 56, 0);
    p.rotateX(this.legHipRotX_L);
    p.push();
    p.translate(0, 29, 0);
    p.fill(40, 30, 100); p.box(26, 58, 30);
    p.push(); p.translate(8, -25, 0); p.fill(50, 38, 120); p.box(5, 35, 32); p.pop();
    p.push();
    p.translate(7, -15, 0); p.emissiveMaterial(0, 220, 200); p.box(8, 4, 34);
    this._resetGlow(p);
    p.pop();
    p.push(); p.translate(0, 26, 16); p.fill(60, 50, 130); p.box(24, 18, 8); p.pop();
    p.pop();
    p.translate(0, 58, 0);
    p.rotateX(this.legKneeRotX_L);
    p.push();
    p.translate(0, 22, 0); p.fill(35, 25, 85); p.box(23, 44, 26);
    p.translate(0, 18, 0); p.fill(55, 45, 120); p.box(26, 9, 28);
    p.pop();
    p.push();
    p.translate(2, 50, 10); p.fill(230, 232, 238); p.box(30, 15, 54);
    p.translate(0, 7, 0); p.emissiveMaterial(0, 255, 200); p.box(32, 4, 56);
    this._resetGlow(p);
    p.pop();
    p.pop();

    // Jambe droite
    p.push();
    p.translate(22, 56, 0);
    p.rotateX(this.legHipRotX_R);
    p.push();
    p.translate(0, 29, 0);
    p.fill(40, 30, 100); p.box(26, 58, 30);
    p.push(); p.translate(-8, -25, 0); p.fill(50, 38, 120); p.box(5, 35, 32); p.pop();
    p.push();
    p.translate(-7, -15, 0); p.emissiveMaterial(255, 120, 0); p.box(8, 4, 34);
    this._resetGlow(p);
    p.pop();
    p.push(); p.translate(0, 26, 16); p.fill(60, 50, 130); p.box(24, 18, 8); p.pop();
    p.pop();
    p.translate(0, 58, 0);
    p.rotateX(this.legKneeRotX_R);
    p.push();
    p.translate(0, 22, 0); p.fill(35, 25, 85); p.box(23, 44, 26);
    p.translate(0, 18, 0); p.fill(45, 35, 100); p.box(26, 9, 28);
    p.pop();
    p.push();
    p.translate(-2, 50, 10); p.fill(20, 15, 45); p.box(32, 17, 50);
    p.translate(0, 8, 0); p.emissiveMaterial(255, 0, 200); p.box(34, 4, 52);
    p.push();
    p.translate(0, -6, 26); p.emissiveMaterial(255, 80, 0); p.box(34, 4, 2);
    this._resetGlow(p);
    p.pop();
    p.pop();
    p.pop();
  }

  _torso(p, bY) {
    this._resetGlow(p);
    p.push();
    p.translate(0, bY * 0.4, 0);

    // Ceinture
    p.push();
    p.translate(0, 40, 0);
    p.fill(20, 18, 55); p.box(74, 22, 48);
    p.push(); p.translate(0, 0, 25); p.fill(190, 195, 200); p.box(20, 14, 5); p.pop();
    p.push(); p.translate(-45, 2, 5); p.fill(0, 80, 100); p.box(16, 24, 32); p.pop();
    p.push(); p.translate(45, 2, 5);  p.fill(0, 80, 100); p.box(16, 24, 32); p.pop();
    p.pop();

    // Torse principal
    p.push();
    p.translate(0, -4, 0);
    p.fill(0, 70, 90); p.box(76, 82, 52);
    p.push(); p.translate(0, 0, 27); p.fill(30, 100, 120); p.box(5, 82, 2); p.pop();
    p.push();
    p.translate(-20, -15, 27);
    p.emissiveMaterial(0, 200, 255); p.box(4, 25, 2);
    p.translate(8, -10, 0); p.emissiveMaterial(255, 0, 200); p.box(4, 10, 2);
    this._resetGlow(p);
    p.pop();
    p.push(); p.translate(24, 15, 27); p.fill(40, 50, 60); p.box(15, 8, 2); p.translate(0, 12, 0); p.box(15, 4, 2); p.pop();
    p.push(); p.translate(-38, -30, 0); p.fill(0, 50, 65); p.box(2, 24, 54); p.pop();
    p.push(); p.translate(38, -30, 0);  p.fill(0, 50, 65); p.box(2, 24, 54); p.pop();
    p.pop();

    // Pectoraux / épaules
    p.push();
    p.translate(0, -48, 0);
    p.fill(0, 50, 70); p.box(58, 20, 44);
    p.push(); p.translate(0, -8, 23); p.emissiveMaterial(0, 200, 255); p.box(58, 2, 2); this._resetGlow(p); p.pop();
    p.pop();

    p.pop();
  }

  _coreAmp(p, bY) {
    this._resetGlow(p);
    p.push();
    p.translate(0, -4 + bY * 0.4, -28);
    p.rotateX(p.HALF_PI);
    p.fill(10, 12, 16); p.cylinder(30, 60, 16, 1);
    p.push(); p.emissiveMaterial(0, 80 + this.energy * 170, 100 + this.energy * 155); p.torus(33, 3.5, 16, 12); p.pop();
    p.push(); p.rotateZ(this.coreRing); p.emissiveMaterial(255, 0, 200); p.torus(38, 2, 16, 12); p.pop();
    p.push();
    p.translate(0, -31, 0);
    const pulse = Math.sin(this.corePhase) * 0.5 + 0.5;
    for (let r = 4; r <= 25; r += 4.5) {
      p.push(); p.emissiveMaterial(0, 140 + pulse * 115, 200 + pulse * 55); p.torus(r, 0.8 + pulse * this.energy * 1.5, 16, 8); p.pop();
    }
    p.emissiveMaterial(0, 200 + this.energy * 55, 255);
    p.sphere(5 + pulse * this.energy * 4, 12, 12);
    this._resetGlow(p);
    p.pop();
    p.pop();
  }

  _arms(p, bY) {
    this._resetGlow(p);

    // Bras gauche
    p.push();
    p.translate(-42, -30 + bY * 0.4, 0);
    p.rotateX(this.armRotX); p.rotateZ(0.15);
    p.push(); p.fill(0, 50, 70); p.sphere(14, 16, 16); p.pop();
    p.push(); p.translate(0, 20, 0); p.fill(0, 65, 85); p.cylinder(11, 40, 12, 1); p.pop();
    p.push();
    p.translate(0, 40, 0);
    p.emissiveMaterial(0, 200, 220); p.sphere(10, 12, 12);
    this._resetGlow(p);
    p.rotateX(this.armElbowRotX_L);
    p.translate(0, 20, 0); p.fill(90, 72, 60); p.cylinder(9, 40, 12, 1);
    p.translate(0, 24, 0);
    this._drawHand(p);
    this._gauntlet(p);
    p.pop();
    p.pop();

    // Bras droit
    this._resetGlow(p);
    p.push();
    p.translate(42, -30 + bY * 0.4, 0);
    p.rotateX(-this.armRotX); p.rotateZ(-0.15);
    p.push(); p.fill(0, 50, 70); p.sphere(14, 16, 16); p.pop();
    p.push(); p.translate(0, 20, 0); p.fill(0, 65, 85); p.cylinder(11, 40, 12, 1); p.pop();
    p.push();
    p.translate(0, 40, 0);
    p.emissiveMaterial(220, 100, 0); p.sphere(10, 12, 12);
    this._resetGlow(p);
    p.rotateX(this.armElbowRotX_R);
    p.translate(0, 20, 0); p.fill(90, 72, 60); p.cylinder(9, 40, 12, 1);
    p.translate(0, 24, 0);
    this._drawHand(p);
    p.pop();
    p.pop();
  }

  _drawHand(p) {
    this._resetGlow(p);
    p.push();
    p.fill(85, 68, 58); p.box(12, 16, 12);
    p.pop();
  }

  _gauntlet(p) {
    this._resetGlow(p);
    p.push();
    p.translate(0, -15, 0);
    p.fill(10, 35, 55); p.box(32, 40, 32);

    for (let k = -1; k <= 1; k++) {
      p.push();
      p.translate(k * 9, 20, 14);
      p.fill(15, 50, 75); p.box(8, 8, 6);
      p.translate(0, 0, 4); p.emissiveMaterial(0, 180, 255); p.box(5, 5, 2);
      this._resetGlow(p);
      p.pop();
    }

    p.push();
    p.translate(0, -12, 0);
    p.fill(10, 30, 50); p.box(30, 28, 33);
    const padColors = [
      [0, 255, 255], [255, 0, 255], [0, 255, 100],
      [255, 180, 0], [0, 120, 255], [255, 60, 0]
    ];
    for (let pi = 0; pi < 6; pi++) {
      const px  = ((pi % 3) - 1) * 9;
      const py  = (Math.floor(pi / 3) - 0.5) * 10;
      const pad = this.pads[pi];
      const c   = padColors[pi];
      p.push();
      p.translate(px, py, 17);
      if (pad.on) {
        p.emissiveMaterial(c[0], c[1], c[2]);
        p.push(); p.translate(0, 0, 2); p.emissiveMaterial(c[0], c[1], c[2]); p.box(10, 9, 3); p.pop();
      } else {
        p.fill(c[0] * 0.12, c[1] * 0.12, c[2] * 0.12);
      }
      p.box(7, 8, 3);
      this._resetGlow(p);
      p.pop();
    }
    p.pop();

    this._resetGlow(p);
    p.pop();
  }

  _head(p, bY) {
    this._resetGlow(p);
    p.push();
    p.translate(0, -82 + bY, 0);

    // Cou
    p.push(); p.translate(0, 22, 0); p.fill(85, 68, 58); p.cylinder(7, 18, 12, 1); p.pop();

    // Tête
    p.fill(95, 76, 64); p.box(40, 46, 38);
    p.push(); p.translate(0, 15, 0); p.fill(88, 70, 58); p.box(44, 18, 36); p.pop();

    // Yeux
    p.push();
    p.translate(-12, -4, 20); p.emissiveMaterial(0, 220, 255); p.box(11, 8, 3);
    p.translate(0, 0, 2); p.emissiveMaterial(0, 255, 255); p.box(5, 4, 2);
    p.pop();
    p.push();
    p.translate(12, -4, 20); p.emissiveMaterial(0, 220, 255); p.box(11, 8, 3);
    p.translate(0, 0, 2); p.emissiveMaterial(0, 255, 255); p.box(5, 4, 2);
    this._resetGlow(p);
    p.pop();

    p.push(); p.translate(0, -10, 20); p.fill(65, 50, 40); p.box(44, 7, 5); p.pop();
    p.push(); p.translate(0, 4, 20);   p.fill(78, 62, 50); p.box(9, 12, 6);  p.pop();
    p.push(); p.translate(0, 14, 20);  p.fill(35, 25, 20); p.box(16, 5, 3);  p.pop();

    this._faceTattoos(p);

    // Casquette
    p.push();
    p.translate(0, -18, 0);
    p.fill(60, 20, 100); p.box(44, 11, 42);
    p.push(); p.translate(0, 0, 22); p.emissiveMaterial(0, 255, 255); p.box(44, 3, 2); p.pop();
    p.push(); p.translate(-23, 0, 5); p.emissiveMaterial(255, 0, 200); p.box(2, 8, 22); this._resetGlow(p); p.pop();
    p.pop();

    this._hair(p);

    // Visière
    p.push();
    p.translate(0, -6, 22);
    p.fill(180, 0, 255, 140); p.box(46, 14, 6);
    p.translate(0, -6, 1); p.emissiveMaterial(200, 80, 255); p.box(48, 2, 7);
    p.translate(0, 12, 0); p.emissiveMaterial(0, 160, 255); p.box(48, 2, 7);
    this._resetGlow(p);
    p.pop();

    p.pop();
  }

  _faceTattoos(p) {
    p.push();
    p.translate(-22, 4, 17); p.rotateY(p.HALF_PI);
    for (let i = 0; i < 5; i++) {
      const h = this.eq[i] * 22 + 3;
      p.emissiveMaterial(0, 200, 255);
      p.push(); p.translate((i - 2) * 5.5, -h / 2, 0); p.box(3.5, h, 1); p.pop();
    }
    this._resetGlow(p);
    p.pop();

    p.push();
    p.translate(22, 4, 17); p.rotateY(-p.HALF_PI);
    for (let i = 0; i < 5; i++) {
      const h = this.eq[i + 5] * 22 + 3;
      p.emissiveMaterial(255, 0, 200);
      p.push(); p.translate((i - 2) * 5.5, -h / 2, 0); p.box(3.5, h, 1); p.pop();
    }
    this._resetGlow(p);
    p.pop();
  }

  _hair(p) {
    this._resetGlow(p);
    const locks = [
      { x: -16, y: -30, z:  12, rx: -0.35, rz: -0.45, len: 38 },
      { x:  16, y: -30, z:  12, rx: -0.25, rz:  0.40, len: 33 },
      { x:   0, y: -33, z:   8, rx: -0.55, rz:  0.05, len: 30 },
      { x: -22, y: -26, z:  -4, rx:  0.12, rz: -0.55, len: 35 },
      { x:  22, y: -26, z:  -4, rx:  0.12, rz:  0.55, len: 35 },
      { x:  -8, y: -31, z: -10, rx:  0.32, rz: -0.22, len: 28 },
      { x:   8, y: -31, z: -10, rx:  0.32, rz:  0.22, len: 28 },
    ];
    for (const l of locks) {
      p.push();
      p.translate(l.x, l.y, l.z); p.rotateX(l.rx); p.rotateZ(l.rz);
      p.fill(22, 16, 12); p.cylinder(4.5, l.len * 0.65, 8, 1);
      p.translate(0, l.len * 0.42, 0);
      p.fill(32, 22, 16); p.cylinder(3.5, l.len * 0.25, 8, 1);
      p.translate(0, l.len * 0.2, 0);
      const freq = (l.x + 25) / 50;
      const tipR = p.map(freq, 0, 1, 255, 30) * (0.4 + this.energy * 0.6);
      const tipB = p.map(freq, 0, 1, 30, 255) * (0.4 + this.energy * 0.6);
      p.emissiveMaterial(tipR, 20, tipB);
      p.sphere(6 + Math.sin(this.hairPhase + l.x * 0.3) * 1.8, 8, 8);
      this._resetGlow(p);
      p.pop();
    }
  }
}

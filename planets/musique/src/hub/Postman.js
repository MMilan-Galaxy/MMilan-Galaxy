class Postman {
  constructor({ name = 'Eugène' } = {}) {
    this.name = name;
  }

  draw(p) {
    this._cap(p);
    this._head(p);
    this._torso(p);
    this._arms(p);
  }

  _cap(p) {
    p.push();
    p.translate(0, -250, 0);
    p.push();
    p.fill('#06d6a0');
    p.scale(1, 0.55, 1);
    p.sphere(40, 20, 16);
    p.pop();
    p.push();
    p.translate(0, 10, 0);
    p.fill('#ffffff');
    p.push(); p.scale(1, 0.18, 1); p.cylinder(38, 18, 24); p.pop();
    p.pop();
    p.push();
    p.translate(0, 11, 28);
    p.emissiveMaterial(6, 214, 160);
    p.sphere(5);
    p.pop();
    p.push();
    p.translate(0, 18, 28);
    p.fill('#1a1230');
    p.push(); p.rotateX(-0.25); p.box(75, 5, 22); p.pop();
    p.pop();
    p.pop();
  }

  _head(p) {
    p.push();
    p.translate(0, -200, 0);
    p.fill('#f4c8a0');
    p.sphere(34, 20, 16);
    p.push();
    p.translate(0, 28, 0);
    p.fill('#dca888');
    p.cylinder(14, 18);
    p.pop();

    p.push();
    p.translate(-12, -3, 28);
    p.emissiveMaterial(10, 10, 20);
    p.sphere(4);
    p.push(); p.translate(1, -1, 3); p.emissiveMaterial(255, 255, 255); p.sphere(1.4); p.pop();
    p.pop();
    p.push();
    p.translate(12, -3, 28);
    p.emissiveMaterial(10, 10, 20);
    p.sphere(4);
    p.push(); p.translate(1, -1, 3); p.emissiveMaterial(255, 255, 255); p.sphere(1.4); p.pop();
    p.pop();

    p.push(); p.translate(-13, -12, 27); p.fill('#1a1230'); p.rotateZ(0.1); p.box(11, 2.5, 1); p.pop();
    p.push(); p.translate(13, -12, 27); p.fill('#1a1230'); p.rotateZ(-0.1); p.box(11, 2.5, 1); p.pop();

    p.push();
    p.translate(0, 5, 30);
    p.fill('#e0a880');
    p.push(); p.scale(1, 1.2, 0.7); p.sphere(5); p.pop();
    p.pop();

    p.push();
    p.translate(0, 16, 28);
    p.fill('#5b1f3a');
    p.push(); p.rotateX(0.3); p.box(20, 3, 2); p.pop();
    p.pop();

    p.push(); p.translate(-22, 8, 24); p.emissiveMaterial(180, 80, 110); p.push(); p.scale(1.4, 0.8, 0.4); p.sphere(5); p.pop(); p.pop();
    p.push(); p.translate( 22, 8, 24); p.emissiveMaterial(180, 80, 110); p.push(); p.scale(1.4, 0.8, 0.4); p.sphere(5); p.pop(); p.pop();

    p.push();
    p.translate(0, -22, 0);
    p.fill('#5b3a1f');
    p.push(); p.scale(1.1, 0.4, 1.05); p.sphere(34, 16, 12); p.pop();
    p.pop();
    p.pop();
  }

  _torso(p) {
    p.push();
    p.translate(0, -120, 0);
    p.fill('#06d6a0');
    p.box(90, 140, 56);

    p.push(); p.translate(0, -55, 30); p.emissiveMaterial(255, 220, 90); p.sphere(4); p.pop();
    for (let i = 0; i < 4; i++) {
      p.push();
      p.translate(0, -30 + i * 22, 30);
      p.emissiveMaterial(255, 200, 90);
      p.sphere(3.5);
      p.pop();
    }

    p.push();
    p.translate(28, -42, 30);
    p.fill('#ffd05a');
    p.push(); p.scale(1, 1, 0.4); p.sphere(12, 16, 12); p.pop();
    p.push(); p.translate(0, 0, 6); p.emissiveMaterial(100, 70, 30); p.box(14, 9, 1); p.pop();
    p.pop();

    p.push();
    p.translate(0, -68, 16);
    p.fill('#ffffff');
    p.push(); p.rotateZ(0.2); p.box(22, 16, 1); p.pop();
    p.push(); p.translate(-12, 4, 0); p.rotateZ(-0.6); p.box(16, 4, 1); p.pop();
    p.push(); p.translate(12, 4, 0); p.rotateZ(0.6); p.box(16, 4, 1); p.pop();
    p.pop();
    p.pop();
  }

  _arms(p) {
    p.push();
    p.translate(-55, -90, 18);
    p.rotateZ(0.25);
    p.rotateX(0.8);
    p.fill('#06d6a0');
    p.cylinder(13, 80);
    p.pop();
    p.push();
    p.translate(55, -90, 18);
    p.rotateZ(-0.25);
    p.rotateX(0.8);
    p.fill('#06d6a0');
    p.cylinder(13, 80);
    p.pop();

    p.push(); p.translate(-42, -58, 50); p.fill('#f4c8a0'); p.sphere(10); p.pop();
    p.push(); p.translate( 42, -58, 50); p.fill('#f4c8a0'); p.sphere(10); p.pop();
  }
}

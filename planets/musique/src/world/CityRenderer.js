class CityRenderer {
  constructor({ mapWidth, mapDepth, streetWidth, scale }) {
    this.mapWidth = mapWidth;
    this.mapDepth = mapDepth;
    this.streetWidth = streetWidth;
    this.scale = scale;
  }

  drawGround(p) {
    // Vast outer terrain — fills the view beyond city edges
    const outerSize = Math.max(this.mapWidth, this.mapDepth) * 7;
    p.push();
    p.translate(this.mapWidth / 2, 6, this.mapDepth / 2);
    p.fill("#0f0620");
    p.box(outerSize, 6, outerSize);
    p.pop();

    p.push();
    p.translate(this.mapWidth / 2, 4, this.mapDepth / 2);
    p.fill("#1e0d3a");
    p.box(this.mapWidth * 3.2, 2, this.mapDepth * 3.2);
    p.pop();

    this._drawHorizonMountains(p);

    p.push();
    p.translate(this.mapWidth / 2, 2, this.mapDepth / 2);
    p.fill("#282828");
    p.box(this.mapWidth, 4, this.mapDepth);
    p.pop();

    const w = this.mapWidth / 2;
    const d = this.mapDepth / 2;
    p.fill("#d48eed");
    p.push();
    p.translate(w / 2, -0.5, d / 2);
    p.box(w, 2, d);
    p.pop();
    p.push();
    p.translate(w + w / 2, -0.5, d / 2);
    p.box(w, 2, d);
    p.pop();
    p.push();
    p.translate(w / 2, -0.5, d + d / 2);
    p.box(w, 2, d);
    p.pop();
    p.push();
    p.translate(w + w / 2, -0.5, d + d / 2);
    p.box(w, 2, d);
    p.pop();
  }

  _drawHorizonMountains(p) {
    const mw = this.mapWidth;
    const md = this.mapDepth;
    const peaks = [
      { x: mw * 0.15, z: -md * 0.75, h: 700 },
      { x: mw * 0.5, z: -md * 0.92, h: 950 },
      { x: mw * 0.85, z: -md * 0.75, h: 780 },
      { x: mw * 0.32, z: -md * 0.6, h: 520 },
      { x: mw * 0.68, z: -md * 0.6, h: 480 },
      { x: mw * 0.15, z: md * 1.75, h: 720 },
      { x: mw * 0.5, z: md * 1.92, h: 950 },
      { x: mw * 0.85, z: md * 1.75, h: 800 },
      { x: mw * 0.3, z: md * 1.6, h: 500 },
      { x: mw * 0.7, z: md * 1.6, h: 540 },
      { x: -mw * 0.72, z: md * 0.2, h: 680 },
      { x: -mw * 0.92, z: md * 0.5, h: 860 },
      { x: -mw * 0.72, z: md * 0.8, h: 710 },
      { x: mw * 1.72, z: md * 0.2, h: 680 },
      { x: mw * 1.92, z: md * 0.5, h: 860 },
      { x: mw * 1.72, z: md * 0.8, h: 710 },
      { x: -mw * 0.62, z: -md * 0.62, h: 1050 },
      { x: mw * 1.62, z: -md * 0.62, h: 1050 },
      { x: -mw * 0.62, z: md * 1.62, h: 1050 },
      { x: mw * 1.62, z: md * 1.62, h: 1050 },
    ];

    for (const pk of peaks) {
      const h = pk.h;
      p.push();
      p.translate(pk.x, 0, pk.z);
      p.fill("#3d1f7a");
      p.cone(h * 0.52, h, 10, 1);
      p.translate(0, -h * 0.62, 0);
      p.fill("#e8d8ff");
      p.cone(h * 0.18, h * 0.26, 8, 1);
      p.pop();
    }
  }

  drawStreets(p) {
    p.fill("#ff7ad1");
    p.push();
    p.translate(this.mapWidth / 2, -1, this.mapDepth / 2);
    p.box(this.streetWidth, 2.5, this.mapDepth);
    p.pop();
    p.push();
    p.translate(this.mapWidth / 2, -1, this.mapDepth / 2);
    p.box(this.mapWidth, 2.5, this.streetWidth);
    p.pop();

    p.fill("#ffe7f4");
    const dashLen = 60 * this.scale;
    const dashGap = 50 * this.scale;
    const dashThk = 8;
    for (let z = dashGap; z < this.mapDepth; z += dashLen + dashGap) {
      if (Math.abs(z + dashLen / 2 - this.mapDepth / 2) < this.streetWidth / 2)
        continue;
      p.push();
      p.translate(this.mapWidth / 2, -2.6, z + dashLen / 2);
      p.box(dashThk, 1, dashLen);
      p.pop();
    }
    for (let x = dashGap; x < this.mapWidth; x += dashLen + dashGap) {
      if (Math.abs(x + dashLen / 2 - this.mapWidth / 2) < this.streetWidth / 2)
        continue;
      p.push();
      p.translate(x + dashLen / 2, -2.6, this.mapDepth / 2);
      p.box(dashLen, 1, dashThk);
      p.pop();
    }
  }

  drawFeatures(p, features) {
    for (const f of features) {
      p.push();
      const cx = f.x + f.w / 2;
      const cz = f.z + f.d / 2;
      this._drawByType(p, f, cx, cz);
      p.pop();
    }
  }

  _drawByType(p, f, cx, cz) {
    switch (f.type) {
      case "house":
        this._house(p, f, cx, cz);
        break;
      case "building":
        this._building(p, f, cx, cz);
        break;
      case "postoffice":
        this._postoffice(p, f, cx, cz);
        break;
      case "tree":
        this._tree(p, f, cx, cz);
        break;
      case "pond":
        this._pond(p, f, cx, cz);
        break;
      case "fountain":
        this._fountain(p, f, cx, cz);
        break;
      case "lamp":
        this._lamp(p, f, cx, cz);
        break;
      case "pathmark":
        this._pathmark(p, f, cx, cz);
        break;
      case "bench":
        this._bench(p, f, cx, cz);
        break;
      case "speaker":
        this._speaker(p, f, cx, cz);
        break;
      case "stage":
        this._stage(p, f, cx, cz);
        break;
      case "vinyl":
        this._vinyl(p, f, cx, cz);
        break;
      case "antenna":
        this._antenna(p, f, cx, cz);
        break;
      case "note":
        this._note(p, f, cx, cz);
        break;
      case "mountain":
        this._mountain(p, f, cx, cz);
        break;
      case "studio":
        this._studio(p, f, cx, cz);
        break;
    }
  }

  _house(p, f, cx, cz) {
    const hH = (90 * this.scale) / 1.6;
    p.translate(cx, -hH / 2, cz);
    p.fill("#ffbd59");
    p.box(f.w, hH, f.d);

    p.push();
    p.translate(0, -hH * 0.1, f.d / 2 + 0.5);
    p.emissiveMaterial(255, 220, 130);
    for (let wx = -1; wx <= 1; wx += 2) {
      p.push();
      p.translate(wx * f.w * 0.22, 0, 0);
      p.plane(f.w * 0.18, hH * 0.28);
      p.pop();
    }
    p.pop();

    p.push();
    p.translate(0, hH * 0.25, f.d / 2 + 0.5);
    p.fill("#5b3a1f");
    p.plane(f.w * 0.15, hH * 0.45);
    p.pop();

    p.push();
    p.translate(0, -hH / 2 - 22, 0);
    p.fill("#e3a64a");
    p.cone(Math.max(f.w, f.d) * 0.72, 44, 4, 1);
    p.pop();

    p.push();
    p.translate(f.w * 0.25, -hH / 2 - 32, f.d * 0.15);
    p.fill("#a86a30");
    p.box(14, 38, 14);
    p.pop();
  }

  _building(p, f, cx, cz) {
    const bH = (200 * this.scale) / 1.6;
    p.translate(cx, -bH / 2, cz);
    p.fill("#d18a3e");
    p.box(f.w, bH, f.d);

    p.push();
    p.translate(0, 0, f.d / 2 + 0.5);
    p.emissiveMaterial(255, 215, 125);
    const rows = 4,
      cols = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        p.push();
        p.translate(
          (c - (cols - 1) / 2) * f.w * 0.22,
          (r - (rows - 1) / 2) * bH * 0.18,
          0,
        );
        p.plane(f.w * 0.13, bH * 0.1);
        p.pop();
      }
    }
    p.pop();

    p.push();
    p.translate(f.w / 2 + 0.5, 0, 0);
    p.rotateY(p.HALF_PI);
    p.emissiveMaterial(255, 215, 125);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        p.push();
        p.translate(
          (c - (cols - 1) / 2) * f.d * 0.22,
          (r - (rows - 1) / 2) * bH * 0.18,
          0,
        );
        p.plane(f.d * 0.13, bH * 0.1);
        p.pop();
      }
    }
    p.pop();

    p.push();
    p.translate(0, -bH / 2 - 2, 0);
    p.fill("#9c6428");
    p.box(f.w * 1.02, 6, f.d * 1.02);
    p.pop();
  }

  _postoffice(p, f, cx, cz) {
    const poH = (240 * this.scale) / 1.6;
    const pulse = 0.55 + 0.45 * Math.sin(p.frameCount * 0.08);

    p.translate(cx, -10, cz);
    p.fill("#06d6a0");
    p.box(f.w * 1.22, 20, f.d * 1.22);

    p.translate(0, -poH / 2, 0);
    p.fill("#ffd05a");
    p.box(f.w, poH, f.d);

    p.push();
    p.translate(0, -poH / 2 - 18, 0);
    p.emissiveMaterial(6 * pulse, 214 * pulse, 160 * pulse);
    p.box(f.w * 0.95, 36, f.d * 0.95);
    p.pop();

    p.push();
    p.translate(0, -poH * 0.15, f.d / 2 + 0.5);
    p.emissiveMaterial(255, 230, 140);
    for (let wx = -1; wx <= 1; wx++) {
      for (let wy = 0; wy < 2; wy++) {
        p.push();
        p.translate(wx * f.w * 0.28, wy * poH * 0.32 - poH * 0.15, 0);
        p.plane(f.w * 0.16, poH * 0.18);
        p.pop();
      }
    }
    p.pop();

    p.push();
    p.translate(0, -poH / 2 - 110, 0);
    p.fill("#ffffff");
    p.cylinder(22, 170);
    p.translate(0, -100, 0);
    p.emissiveMaterial(6 * pulse, 214 * pulse, 160 * pulse);
    p.sphere(34);
    p.translate(0, 10, 0);
    p.rotateX(p.HALF_PI);
    p.emissiveMaterial(6 * pulse, 214 * pulse, 160 * pulse);
    p.torus(60, 5, 24, 6);
    p.pop();

    p.push();
    p.translate(0, -1200, 0);
    p.emissiveMaterial(6 * pulse * 0.6, 214 * pulse * 0.6, 160 * pulse * 0.6);
    p.cylinder(14, 2400, 8, 1);
    p.pop();

    const entW = f.w * 0.3;
    const entD = f.d * 0.35;
    p.translate(0, poH / 2 - 36, f.d / 2);
    p.fill("#8b5b34");
    p.box(entW, 72, entD);

    p.push();
    p.translate(0, -64, 6);
    p.emissiveMaterial(6 * pulse, 214 * pulse, 160 * pulse);
    p.box(f.w * 0.45, 14, 6);
    p.pop();
  }

  _tree(p, f, cx, cz) {
    p.translate(cx, 0, cz);
    p.fill("#7a4ab5");
    p.cylinder(f.w * 0.18, (90 * this.scale) / 1.6);
    p.translate(0, (-70 * this.scale) / 1.6, 0);
    p.fill("#cb6ce6");
    p.ellipsoid(f.w * 0.85, 70, f.d * 0.85);
    p.translate(0, -55, 0);
    p.fill("#d987ed");
    p.ellipsoid(f.w * 0.55, 42, f.d * 0.55);
  }

  _pond(p, f, cx, cz) {
    p.translate(cx, -2, cz);
    p.fill("#8c6feb");
    p.cylinder(f.w * 0.5, 4);
    p.push();
    p.translate(0, -3, 0);
    p.emissiveMaterial(80, 130, 240);
    p.cylinder(f.w * 0.25, 1);
    p.pop();
  }

  _fountain(p, f, cx, cz) {
    p.translate(cx, 0, cz);
    p.fill("#b89cff");
    p.cylinder(f.w * 0.55, 14);
    p.translate(0, -10, 0);
    p.fill("#7a5feb");
    p.cylinder(f.w * 0.45, 8);
    p.translate(0, -30, 0);
    p.fill("#d8c6ff");
    p.cylinder(f.w * 0.12, 50);
    p.translate(0, -30, 0);
    const fp = 0.7 + 0.3 * Math.sin(p.frameCount * 0.1);
    p.emissiveMaterial(120 * fp, 180 * fp, 255 * fp);
    p.sphere(f.w * 0.18);
    p.translate(0, 6, 0);
    p.rotateX(p.HALF_PI);
    p.emissiveMaterial(80 * fp, 140 * fp, 240 * fp);
    p.torus(f.w * 0.3, 2, 16, 6);
  }

  _lamp(p, f, cx, cz) {
    p.translate(cx, 0, cz);
    p.fill("#3a2e5c");
    p.cylinder(4, (95 * this.scale) / 1.6);
    p.translate(0, (-52 * this.scale) / 1.6, 0);
    p.emissiveMaterial(255, 220, 140);
    p.sphere(9);
  }

  _pathmark(p, f, cx, cz) {
    const wave = (p.frameCount * 0.06 - f.z * 0.005) % p.TWO_PI;
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(wave));
    p.translate(cx, -3, cz);
    p.rotateX(p.HALF_PI);
    p.noStroke();
    p.emissiveMaterial(6 * pulse, 214 * pulse, 160 * pulse);
    p.torus(f.w * 0.45, 3, 20, 6);
    p.translate(0, 0, 2);
    p.emissiveMaterial(6 * pulse * 0.6, 214 * pulse * 0.6, 160 * pulse * 0.6);
    p.cylinder(f.w * 0.4, 1, 18, 1);
  }

  _bench(p, f, cx, cz) {
    p.translate(cx, 0, cz);
    p.fill("#3a2e5c");
    p.push();
    p.translate(-f.w / 2 + 6, -12, 0);
    p.box(8, 24, f.d * 0.9);
    p.pop();
    p.push();
    p.translate(f.w / 2 - 6, -12, 0);
    p.box(8, 24, f.d * 0.9);
    p.pop();
    p.translate(0, -26, 0);
    p.fill("#d48eed");
    p.box(f.w, 6, f.d);
    p.translate(0, -16, -f.d / 2 + 4);
    p.fill("#cb6ce6");
    p.box(f.w * 0.95, 26, 6);
  }

  _speaker(p, f, cx, cz) {
    p.translate(cx, 0, cz);
    p.fill("#3a2e5c");
    p.cylinder(f.w * 0.16, 100);
    p.translate(0, -180, 0);
    p.fill("#7a5feb");
    p.box(f.w, 160, f.d);
    p.push();
    p.translate(0, 24, f.d / 2 + 1);
    p.fill("#0a0a14");
    p.plane(f.w * 0.7, f.w * 0.7);
    p.pop();
    p.push();
    p.translate(0, -48, f.d / 2 + 1);
    p.fill("#0a0a14");
    p.plane(f.w * 0.3, f.w * 0.3);
    p.pop();
    p.push();
    p.translate(0, -78, f.d / 2 + 1.2);
    const sp = 0.5 + 0.5 * Math.sin(p.frameCount * 0.15);
    p.emissiveMaterial(6 * sp, 214 * sp, 160 * sp);
    p.plane(f.w * 0.7, 8);
    p.pop();
  }

  _stage(p, f, cx, cz) {
    p.translate(cx, -10, cz);
    p.fill("#d48eed");
    p.cylinder(f.w * 0.5, 20, 8);
    p.push();
    p.translate(0, 12, 0);
    p.rotateX(p.HALF_PI);
    const sp = 0.5 + 0.5 * Math.sin(p.frameCount * 0.1);
    p.emissiveMaterial(247 * sp, 37 * sp, 133 * sp);
    p.torus(f.w * 0.5, 4, 24, 8);
    p.pop();
    p.translate(0, -160, 0);
    p.emissiveMaterial(255, 200 * sp, 240 * sp);
    p.cylinder(8, 320, 8, 1);
  }

  _vinyl(p, f, cx, cz) {
    p.translate(cx, -1, cz);
    p.fill("#0a0a14");
    p.cylinder(f.w * 0.5, 3, 36);
    p.push();
    p.translate(0, -2, 0);
    p.rotateX(p.HALF_PI);
    for (let r = 0.45; r > 0.18; r -= 0.07) {
      p.push();
      p.emissiveMaterial(40, 30, 50);
      p.torus(f.w * r, 0.6, 32, 4);
      p.pop();
    }
    p.pop();
    p.translate(0, -2, 0);
    p.fill("#cb6ce6");
    p.cylinder(f.w * 0.18, 2, 24);
    p.translate(0, -1.5, 0);
    const vp = 0.6 + 0.4 * Math.sin(p.frameCount * 0.08);
    p.emissiveMaterial(6 * vp, 214 * vp, 160 * vp);
    p.cylinder(f.w * 0.05, 1, 12);
  }

  _antenna(p, f, cx, cz) {
    p.translate(cx, 0, cz);
    p.fill("#3a2e5c");
    p.cylinder(f.w * 0.5, 28, 8);
    p.translate(0, -180, 0);
    p.fill("#5a3e8e");
    p.cylinder(f.w * 0.18, 340, 8);
    for (let h = 0; h < 3; h++) {
      p.push();
      p.translate(0, -80 + h * 90, 0);
      p.rotateX(p.HALF_PI);
      p.fill("#8b52c5");
      p.torus(f.w * 0.32, 3, 12, 6);
      p.pop();
    }
    p.translate(0, -180, 0);
    const ap = 0.5 + 0.5 * Math.sin(p.frameCount * 0.12);
    p.emissiveMaterial(247 * ap, 37 * ap, 133 * ap);
    p.sphere(f.w * 0.45);
  }

  _note(p, f, cx, cz) {
    const float = -180 + Math.sin(p.frameCount * 0.04 + cz * 0.01) * 30;
    p.translate(cx, float, cz);
    const np = 0.6 + 0.4 * Math.sin(p.frameCount * 0.1);
    p.push();
    p.emissiveMaterial(6 * np, 214 * np, 160 * np);
    p.ellipsoid(22, 18, 22);
    p.pop();
    p.push();
    p.translate(18, -36, 0);
    p.fill("#cb6ce6");
    p.box(4, 70, 4);
    p.pop();
    p.push();
    p.translate(28, -68, 0);
    p.fill("#d48eed");
    p.box(16, 4, 4);
    p.pop();
  }

  _mountain(p, f, cx, cz) {
    p.translate(cx, 0, cz);
    p.fill("#7a5feb");
    p.cone(f.w * 0.55, 320, 12, 1);
    p.translate(0, -200, 0);
    p.fill("#e8d8ff");
    p.cone(f.w * 0.22, 80, 10, 1);
  }

  _studio(p, f, cx, cz) {
    const stH = (180 * this.scale) / 1.6;
    p.translate(cx, -stH / 2, cz);
    p.fill("#cb6ce6");
    p.box(f.w, stH, f.d);
    p.push();
    p.translate(0, 0, f.d / 2 + 0.5);
    p.emissiveMaterial(255, 220, 140);
    for (let c = -1; c <= 1; c++) {
      p.push();
      p.translate(c * f.w * 0.27, -stH * 0.1, 0);
      p.plane(f.w * 0.18, stH * 0.2);
      p.pop();
    }
    p.pop();
    p.push();
    p.translate(0, -stH / 2 - 4, 0);
    p.fill("#7a5feb");
    p.box(f.w * 1.02, 8, f.d * 1.02);
    p.pop();
    p.push();
    p.translate(0, -stH / 2 - 40, f.d * 0.15);
    p.rotateX(-p.PI / 4);
    p.fill("#e8d8ff");
    p.push();
    p.scale(1, 0.3, 1);
    p.sphere(28, 16, 8);
    p.pop();
    p.pop();
    p.push();
    p.translate(0, -stH / 2 - 18, f.d * 0.15);
    p.fill("#3a2e5c");
    p.cylinder(4, 28);
    p.pop();
  }
}

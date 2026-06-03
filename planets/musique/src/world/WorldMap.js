class WorldMap {
  constructor() {
    this.game = null;

    this.scale = 2.2;
    this.mapWidth = 2400 * this.scale;
    this.mapDepth = 1800 * this.scale;
    this.streetWidth = 140 * this.scale;

    this.player = {
      x: this.mapWidth / 2,
      z: this.mapDepth / 2,
      size: 34,
      speed: 8 * this.scale,
      angle: 0,
    };

    this.jaxx = new Jaxx();
    this.renderer = new CityRenderer({
      mapWidth: this.mapWidth,
      mapDepth: this.mapDepth,
      streetWidth: this.streetWidth,
      scale: this.scale,
    });
    this.staticFeatures = CityBuilder.build({
      mapWidth: this.mapWidth,
      mapDepth: this.mapDepth,
      streetWidth: this.streetWidth,
      scale: this.scale,
    });
    this.pathFeatures = [];

    this.target = null;
    this._withinTrigger = false;
  }

  bindGame(game) {
    this.game = game;
  }

  postOfficeEntrance() {
    const po = this.staticFeatures.find((f) => f.type === "postoffice");
    if (!po) return { x: this.mapWidth / 2, z: this.mapDepth / 2 };
    const entD = po.d * 0.35;
    return { x: po.x + po.w / 2, z: po.z + po.d - entD / 2 };
  }

  postOfficeExit() {
    const entrance = this.postOfficeEntrance();
    return { x: entrance.x, z: entrance.z + 140 };
  }

  enter(p, { spawn, target } = {}) {
    const safeDefault = { x: this.mapWidth / 2, z: this.mapDepth / 2 };
    const start = this._safeSpawn(spawn || safeDefault);
    this.player.x = start.x;
    this.player.z = start.z;

    if (target === null) {
      this.target = null;
      this.pathFeatures = [];
    } else {
      this.target = target || { type: "postoffice" };
      if (
        this.target.type === "postoffice" &&
        (this.target.x == null || this.target.z == null)
      ) {
        const e = this.postOfficeEntrance();
        this.target.x = e.x;
        this.target.z = e.z;
      }
      this.pathFeatures = PathBuilder.build(start, {
        x: this.target.x,
        z: this.target.z,
      });
    }

    this._withinTrigger = false;
    if (this.game && this.game.hud) {
      this.game.hud.hidePrompt();
      this._refreshHudLocation();
    }
  }

  _refreshHudLocation() {
    if (!this.game || !this.game.hud) return;
    const q = this.game.questManager.current();
    if (!this.target) {
      this.game.hud.setLocation("Symphonia", "Toutes les livraisons sont accomplies !");
      return;
    }
    if (this.target.type === "postoffice") {
      const label = (this.game.state === GameState.ENDING)
        ? "Retourner voir le Facteur Eugène"
        : "Direction : bureau de poste";
      this.game.hud.setLocation("Symphonia", label);
    } else if (this.target.type === "quest" && q) {
      const loc = q.locationLabel ? ` (${q.locationLabel})` : "";
      this.game.hud.setLocation(
        "Symphonia",
        `Livrer : ${q.parcelName}${loc}`,
      );
    }
  }

  update(p) {
    let dx = 0,
      dz = 0;
    if (p.keyIsDown(90)) dz -= this.player.speed;
    if (p.keyIsDown(83)) dz += this.player.speed;
    if (p.keyIsDown(81)) dx -= this.player.speed;
    if (p.keyIsDown(68)) dx += this.player.speed;

    const nextX = p.constrain(
      this.player.x + dx,
      this.player.size / 2,
      this.mapWidth - this.player.size / 2,
    );
    const nextZ = p.constrain(
      this.player.z + dz,
      this.player.size / 2,
      this.mapDepth - this.player.size / 2,
    );

    if (!this._isBlocked(nextX, this.player.z)) this.player.x = nextX;
    if (!this._isBlocked(this.player.x, nextZ)) this.player.z = nextZ;

    const moveSpeed = Math.hypot(dx, dz);
    if (moveSpeed > 0) this.player.angle = Math.atan2(dx, dz);
    this.jaxx.update(p, moveSpeed, this.player.speed);

    const wasNear = this._withinTrigger;
    this._withinTrigger = this._isNearTarget();
    if (this._withinTrigger !== wasNear && this.game && this.game.hud) {
      if (this._withinTrigger) this._showTargetPrompt();
      else this.game.hud.hidePrompt();
    }
  }

  _showTargetPrompt() {
    if (!this.target || !this.game) return;
    if (this.target.type === "postoffice") {
      this.game.hud.showPrompt({
        title: "Bureau de Poste",
        action: "Parler au Facteur Eugène",
      });
    } else if (this.target.type === "quest") {
      const q = this.game.questManager.current();
      const label = q ? q.title : "Démarrer la quête";
      this.game.hud.showPrompt({
        title: label,
        action: "Commencer la livraison",
      });
    }
  }

  draw(p) {
    p.clear();
    p.background(15, 8, 35);

    p.ambientLight(85, 90, 110);
    p.directionalLight(255, 245, 220, 0.35, 0.7, -0.55);
    p.pointLight(6, 214, 160, this.player.x, -250, this.player.z);
    p.pointLight(255, 180, 90, this.player.x + 400, -200, this.player.z + 200);

    const FOV = p.PI / 3;
    const ISO_ANGLE = p.radians(55);
    p.perspective(FOV, p.width / p.height, 1, 20000);
    const aspect = p.width / p.height;
    const tanHalf = Math.tan(FOV / 2);
    const needLh = (this.mapWidth * 1.03) / 2 / (tanHalf * aspect);
    const needLv = (this.mapDepth * 1.03 * Math.sin(ISO_ANGLE)) / 2 / tanHalf;
    const L = Math.max(needLh, needLv);
    const targetX = this.mapWidth / 2;
    const targetZ = this.mapDepth / 2;
    const camHeight = -L * Math.sin(ISO_ANGLE);
    const camDistance = L * Math.cos(ISO_ANGLE);
    p.camera(
      targetX,
      camHeight,
      targetZ + camDistance,
      targetX,
      0,
      targetZ,
      0,
      1,
      0,
    );

    p.noStroke();
    this.renderer.drawGround(p);
    this.renderer.drawStreets(p);
    this.renderer.drawFeatures(p, this.staticFeatures);
    this.renderer.drawFeatures(p, this.pathFeatures);
    this._drawTargetBeacon(p);
    this._drawPlayer(p);
  }

  _drawTargetBeacon(p) {
    if (!this.target || this.target.type !== "quest") return;
    p.push();
    p.translate(this.target.x, -400, this.target.z);
    const pulse = 0.6 + 0.4 * Math.sin(p.frameCount * 0.08);
    p.emissiveMaterial(247 * pulse, 37 * pulse, 133 * pulse);
    p.sphere(28);
    p.translate(0, 200, 0);
    p.emissiveMaterial(247 * pulse * 0.5, 37 * pulse * 0.5, 133 * pulse * 0.5);
    p.cylinder(10, 800, 8, 1);
    p.pop();
  }

  _drawPlayer(p) {
    p.push();
    p.translate(this.player.x, -2, this.player.z);
    p.rotateX(p.HALF_PI);
    p.noStroke();
    const ringPulse = 0.7 + 0.3 * Math.sin(p.frameCount * 0.08);
    p.emissiveMaterial(6 * ringPulse, 214 * ringPulse, 160 * ringPulse);
    p.torus(48 * this.scale, 3.5, 28, 8);
    p.pop();

    p.push();
    p.translate(this.player.x, 0, this.player.z);
    p.rotateY(this.player.angle);
    p.scale(0.3 * this.scale);
    this.jaxx.draw(p);
    p.pop();
  }

  _isBlocked(x, z) {
    const r = this.player.size / 2;
    const walkable = new Set([
      "pond",
      "pathmark",
      "lamp",
      "vinyl",
      "note",
      "soundwave",
    ]);
    for (const f of this.staticFeatures) {
      if (walkable.has(f.type)) continue;
      if (IsoUtils.circleRectCollision(x, z, r, f.x, f.z, f.w, f.d))
        return true;
    }
    return false;
  }

  _safeSpawn(point) {
    if (!this._isBlocked(point.x, point.z)) return { x: point.x, z: point.z };
    const po = this.postOfficeEntrance();
    const dx = po.x - point.x;
    const dz = po.z - point.z;
    const dist = Math.hypot(dx, dz) || 1;
    const ux = dx / dist;
    const uz = dz / dist;
    const step = 60;
    for (let k = 1; k <= 20; k++) {
      const x = point.x + ux * step * k;
      const z = point.z + uz * step * k;
      if (!this._isBlocked(x, z)) return { x, z };
    }
    return { x: this.mapWidth / 2, z: this.mapDepth / 2 };
  }

  _isNearTarget() {
    if (!this.target) return false;
    return (
      IsoUtils.distance(
        this.player.x,
        this.player.z,
        this.target.x,
        this.target.z,
      ) <
      200 * this.scale
    );
  }

  _triggerTarget() {
    if (!this.target) return;
    if (this.target.type === "postoffice") this.game.enterPostOffice();
    else if (this.target.type === "quest") this.game.triggerCurrentQuest();
  }

  onMousePressed(p) {
    if (this._withinTrigger) this._triggerTarget();
  }
  onKeyPressed(p) {
    if (this._withinTrigger && (p.key === "e" || p.key === "E"))
      this._triggerTarget();
  }
  onKeyReleased(p) {}
  onWindowResized(p) {}
}

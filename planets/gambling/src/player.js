// ═══════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.hw = 24; this.hh = 20; this.spd = 9;
    this.dir = 2; this.fr = 0; this.moving = false; this.trail = [];
  }

  update() {
    if (dlg.active) return;
    let dx = 0, dy = 0;
    if (keyIsDown(81) || keyIsDown(LEFT_ARROW))  { dx = -this.spd; this.dir = 3; }
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) { dx =  this.spd; this.dir = 1; }
    if (keyIsDown(90) || keyIsDown(UP_ARROW))    { dy = -this.spd; this.dir = 0; }
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  { dy =  this.spd; this.dir = 2; }
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) this.fr += 0.2;
    if (dx && dy) { dx *= .707; dy *= .707; }
    if (dx !== 0 && !this.hits(this.x + dx, this.y)) this.x += dx;
    if (dy !== 0 && !this.hits(this.x, this.y + dy)) this.y += dy;
    if (gstate === 'EXPLORE') {
      let ea=WORLD_W/2-200, eb=WORLD_H/2-100;
      let ndx=this.x-PCX, ndy=this.y-PCY;
      let e=(ndx/ea)*(ndx/ea)+(ndy/eb)*(ndy/eb);
      if(e>1){let sc=1/sqrt(e);this.x=PCX+ndx*sc;this.y=PCY+ndy*sc;}
    } else {
      this.x = constrain(this.x, 288, INT_W - 288);
      this.y = constrain(this.y, 80, INT_H - 80);
    }
    if (this.moving) { this.trail.unshift({ x: this.x, y: this.y }); if (this.trail.length > 8) this.trail.pop(); }
  }

  hits(nx, ny) {
    for (let s of allSolids)
      if (nx + this.hw > s.x && nx - this.hw < s.x + s.w && ny + this.hh > s.y && ny - this.hh < s.y + s.h) return true;
    return false;
  }

  draw() {
    this._drawTrail();
    push();
    translate(this.x, this.y);
    scale(2, 2);
    const bob = this.moving ? sin(this.fr * 3) * 2 : 0;
    const la  = this.moving ? sin(this.fr * 4) * 7 : 0;
    noStroke(); fill(0, 0, 0, 58); ellipse(2, 13, 30, 11);
    if (hasCostume) this._drawTuxedo(bob, la);
    else            this._drawDefault(bob, la);
    this._drawFace(bob);
    pop();
  }

  _drawTrail() {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      noStroke();
      fill(hasCostume
        ? color(220, 190, 40,  map(i, 0, this.trail.length, 55, 0))
        : color(55,  190, 255, map(i, 0, this.trail.length, 55, 0)));
      ellipse(t.x, t.y, 18 - i * 2);
    }
  }

  _drawDefault(bob, la) {
    fill(18, 10, 32); noStroke();
    ellipse(-5, 11 + la, 10, 14); ellipse(5, 11 - la, 10, 14);
    fill(10, 6, 20);
    ellipse(-5, 17 + la, 12, 7); ellipse(5, 17 - la, 12, 7);
    const coat = color(175, 138, 18);
    fill(coat); stroke(215, 175, 28); strokeWeight(1.5);
    ellipse(0, 1 + bob, 28, 30);
    fill(130, 100, 12); noStroke();
    triangle(-4, -2, -1, -11, -1, 4);
    triangle( 4, -2,  1, -11,  1, 4);
    fill(240, 232, 215); triangle(-2, -11, 2, -11, 0, -2);
    fill(coat); noStroke();
    this._drawArms(bob, coat, color(220, 185, 155));
    fill(20, 12, 35); stroke(42, 30, 58); strokeWeight(1.2);
    ellipse(0, -11 + bob, 26, 26);
    fill(30, 18, 48); noStroke(); ellipse(0, -11 + bob, 18, 18);
    stroke(215, 178, 28); strokeWeight(1.8); noFill();
    ellipse(0, -11 + bob, 19, 19);
    fill(220, 180, 30); noStroke();
    textAlign(CENTER, CENTER); textSize(9); text('♠', 0, -11 + bob);
  }

  _drawTuxedo(bob, la) {
    fill(22, 20, 38); noStroke();
    ellipse(-5, 11 + la, 10, 14); ellipse(5, 11 - la, 10, 14);
    fill(12, 10, 22);
    ellipse(-5, 18 + la, 13, 7); ellipse(5, 18 - la, 13, 7);
    fill(22, 20, 38); stroke(50, 46, 72); strokeWeight(1.5);
    ellipse(0, 1 + bob, 28, 30);
    fill(240, 235, 220); noStroke();
    triangle(-4, -1, -1, -10, -1, 5);
    triangle( 4, -1,  1, -10,  1, 5);
    fill(245, 242, 232); noStroke();
    triangle(-2, -10, 2, -10, 0, -1);
    fill(180, 175, 168);
    ellipse(0, 1 + bob, 2.5, 2.5);
    ellipse(0, 4 + bob, 2.5, 2.5);
    fill(15, 12, 28); noStroke();
    triangle(-5, -8 + bob, 0, -6 + bob,  0, -10 + bob);
    triangle( 5, -8 + bob, 0, -6 + bob,  0, -10 + bob);
    fill(35, 30, 55); ellipse(0, -8 + bob, 3.5, 3.5);
    fill(240, 238, 225); noStroke();
    rect(7, -2 + bob, 6, 5, 1);
    fill(255, 255, 255); rect(8, -3 + bob, 4, 3, 1);
    fill(22, 20, 38); noStroke();
    this._drawArms(bob, color(22, 20, 38), color(235, 230, 215));
    this._drawTopHat(bob);
  }

  _drawTopHat(bob) {
    fill(18, 16, 30); noStroke();
    ellipse(0, -10 + bob, 30, 9);
    fill(22, 20, 36); stroke(42, 38, 62); strokeWeight(1);
    rect(-9, -26 + bob, 18, 17, 2);
    fill(18, 16, 30); noStroke();
    ellipse(0, -26 + bob, 18, 6);
    fill(230, 225, 210); noStroke();
    rect(-9, -14 + bob, 18, 3);
    fill(215, 178, 28); noStroke();
    textAlign(CENTER, CENTER); textSize(8);
    text('♠', 0, -20 + bob);
  }

  _drawArms(bob, sleeveCol, handCol) {
    fill(sleeveCol); noStroke();
    if (this.dir === 1) {
      ellipse(13, -1 + bob, 11, 16);
      fill(handCol); ellipse(18, -1 + bob, 9, 9);
    } else if (this.dir === 3) {
      ellipse(-13, -1 + bob, 11, 16);
      fill(handCol); ellipse(-18, -1 + bob, 9, 9);
    } else {
      ellipse(-14, 1 + bob, 11, 14); ellipse(14, 1 + bob, 11, 14);
      fill(handCol); ellipse(-18, 2 + bob, 9, 9); ellipse(18, 2 + bob, 9, 9);
    }
  }

  _drawFace(bob) {
    if (this.dir === 0) return;
    const fy = (this.dir === 2 ? -7 : -10) + bob;
    fill(235, 200, 150); noStroke(); ellipse(0, fy + 1, 12, 9);
    const ex = this.dir === 1 ? 2 : this.dir === 3 ? -2 : 0;
    fill(30, 20, 55);
    ellipse(ex - 3, fy, 2.5, 2.5); ellipse(ex + 3, fy, 2.5, 2.5);
    noFill(); stroke(150, 90, 50); strokeWeight(1);
    arc(ex, fy + 2, 6, 4, 0, PI);
  }
}

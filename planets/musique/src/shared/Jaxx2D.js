// Draws a flat 2D version of Jaxx — faithful to the 3D WebGL design.
// Origin (x, y): waist level. Feet near y+40, hair tips near y-70 (scale=1).
// mouthLevel : 0–1  (mic-driven mouth opening)
// walkT      : walk cycle angle  (frameCount * 0.15 or distance * 0.18)
// facing     : 1 = right (default) | -1 = left (horizontal mirror)
function drawJaxx2D(p, x, y, scale = 1, mouthLevel = 0, walkT = 0, facing = 1) {
  // ── Palette (faithful to 3D emissive / fill colors) ──
  const SK  = '#7a5848';  // skin
  const HR  = '#16100c';  // hair dark base
  const CAP = '#3c1464';  // cap (dark violet)
  const OUT = '#003c55';  // outfit body (dark teal)
  const LEG = '#281e64';  // leg fabric (dark purple-blue)
  const DRK = '#09060f';  // darkest panels / right shoe
  const CYN = '#00ffdf';  // cyan
  const RSE = '#ff00c8';  // rose/magenta
  const VIO = '#b400ff';  // violet (visor)
  const ORN = '#ffb400';  // orange
  const WHT = '#d8d8e8';  // left shoe (light)

  const sw  = Math.sin(walkT);
  const bob = walkT !== 0 ? Math.abs(sw) * 2 : 0;

  p.push();
  p.translate(x, y - bob);
  p.scale(facing * scale, scale);
  p.noStroke();

  // ── Ground shadow ─────────────────────────────────────
  p.fill(0, 0, 0, 45);
  p.ellipse(0, 42, 34, 8);

  // ── Hair locks — drawn BEHIND the head ───────────────
  // 7 straight cylindrical locks (dreads) matching the 3D _hair() method.
  // Colors follow 3D formula: freq = (x+25)/50 → R=map(freq,0,1,255,30), G=20, B=map(freq,0,1,30,255)
  // Left side: warm (reddish), right side: cool (blue-violet).
  const hCX = 0, hCY = -46;
  const hRX = 15, hRY = 18;

  // bLockY: base of all locks — just above the cap (inside crown area, cap will cover bases)
  const bLockY = hCY - hRY * 0.62;

  // 7 locks with exact 3D positions (bx, rz, rx) — back-to-front draw order.
  // rx < 0 = lock penches vers le spectateur → paraît plus vertical en 2D.
  // rx > 0 = lock penches en arrière → paraît plus oblique / couché.
  const lockData = [
    { bx: -14, rz: -0.55, rx:  0.12, len: 26, freq: 0.06 },  // back-left
    { bx:  14, rz:  0.55, rx:  0.12, len: 26, freq: 0.94 },  // back-right
    { bx:  -5, rz: -0.22, rx:  0.32, len: 21, freq: 0.34 },  // back-center-left
    { bx:   5, rz:  0.22, rx:  0.32, len: 21, freq: 0.66 },  // back-center-right
    { bx: -11, rz: -0.45, rx: -0.35, len: 28, freq: 0.18 },  // front-left
    { bx:  11, rz:  0.40, rx: -0.25, len: 25, freq: 0.82 },  // front-right
    { bx:   0, rz:  0.05, rx: -0.55, len: 23, freq: 0.50 },  // front-center
  ];
  const elev = 0.55;  // camera elevation factor: rx tilts the apparent angle
  for (const l of lockData) {
    const tipR = p.map(l.freq, 0, 1, 255, 30);
    const tipB = p.map(l.freq, 0, 1, 30, 255);
    const ang  = -Math.PI / 2 + l.rz - l.rx * elev;
    const tx   = l.bx + Math.cos(ang) * l.len;
    const ty   = bLockY + Math.sin(ang) * l.len;

    p.stroke(HR);
    p.strokeWeight(7);
    p.line(l.bx, bLockY, tx, ty);

    p.noStroke();
    p.fill(tipR, 20, tipB);
    p.ellipse(tx, ty, 11, 11);
    p.fill(Math.min(tipR + 90, 255), 90, Math.min(tipB + 90, 255));
    p.ellipse(tx, ty, 5, 5);
  }
  p.noStroke();

  // ── LEFT leg + shoe (light gray + cyan sole) ──────────
  p.push();
  p.translate(0, sw * 5);
  p.fill(LEG);
  p.rect(-14, 8, 12, 24, 3);
  p.fill(CYN);
  p.rect(-13, 12, 2, 14, 1);   // outer stripe
  p.fill(WHT);
  p.rect(-15, 31, 14, 9, 3);   // shoe body (light, matching 3D left shoe)
  p.fill(CYN);
  p.rect(-15, 38, 14, 3, 1);   // sole glow
  p.pop();

  // ── RIGHT leg + shoe (dark + rose sole) ───────────────
  p.push();
  p.translate(0, -sw * 5);
  p.fill(LEG);
  p.rect(2, 8, 12, 24, 3);
  p.fill(ORN);
  p.rect(10, 12, 2, 14, 1);    // outer stripe
  p.fill(DRK);
  p.rect(1, 31, 14, 9, 3);     // shoe body (dark, matching 3D right shoe)
  p.fill(RSE);
  p.rect(1, 38, 14, 3, 1);     // sole glow (rose, matching 3D)
  p.pop();

  // ── Belt ──────────────────────────────────────────────
  p.fill(DRK);
  p.rect(-14, 4, 28, 6, 2);

  // ── Torso ─────────────────────────────────────────────
  p.fill(OUT);
  p.rect(-16, -16, 32, 22, 5);

  // ── Core amplifier ────────────────────────────────────
  p.fill(DRK);
  p.ellipse(0, -5, 22, 22);
  p.noFill();
  p.stroke(CYN); p.strokeWeight(2.5);
  p.ellipse(0, -5, 17, 17);
  p.stroke(RSE); p.strokeWeight(1.5);
  p.ellipse(0, -5, 10, 10);
  p.noStroke();
  p.fill(RSE); p.ellipse(0, -5, 5, 5);
  p.fill(255); p.ellipse(0, -5, 2, 2);

  // Pectoral cyan line (3D: emissiveMaterial(0,200,255) on chest top)
  p.fill(CYN);
  p.rect(-14, -16, 28, 2, 1);

  // ── LEFT arm — sleeve + cyan elbow + gauntlet ─────────
  p.fill(OUT);
  p.rect(-26, -14, 10, 12, 3);
  // Elbow joint: cyan (3D: emissiveMaterial(0,200,220))
  p.fill(CYN);
  p.ellipse(-21, -2, 11, 11);
  p.fill(DRK);
  p.ellipse(-21, -2, 6, 6);
  // Gauntlet housing
  p.fill(DRK);
  p.rect(-27, 7, 13, 15, 3);
  // 6 color pads (2 rows × 3 cols — matching 3D padColors)
  const pads = [CYN, '#ff00ff', '#00ff64', ORN, '#0078ff', '#ff3c00'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      p.fill(pads[r * 3 + c]);
      p.rect(-26 + c * 4, 8 + r * 6, 3, 4, 1);
    }
  }
  p.fill(CYN);
  p.rect(-27, 21, 12, 1, 1);   // knuckle highlight

  // ── RIGHT arm — sleeve + orange elbow + hand ──────────
  p.fill(OUT);
  p.rect(16, -14, 10, 12, 3);
  // Elbow joint: orange (3D: emissiveMaterial(220,100,0))
  p.fill(ORN);
  p.ellipse(21, -2, 11, 11);
  p.fill(DRK);
  p.ellipse(21, -2, 6, 6);
  p.fill(SK);
  p.rect(16, -2, 10, 10, 2);
  p.rect(15, 7, 12, 10, 4);

  // ── Neck ──────────────────────────────────────────────
  p.fill(SK);
  p.rect(-5, -22, 10, 8, 2);

  // ── Head (ellipse + wider jaw) ────────────────────────
  p.fill(SK);
  p.ellipse(hCX, hCY, hRX * 2, hRY * 2);
  p.ellipse(hCX, hCY + 5, hRX * 2 + 4, 18);

  // ── Cap — top arc (dark violet, matching 3D fill(60,20,100)) ──
  p.fill(CAP);
  p.arc(hCX, hCY, hRX * 2 + 4, hRY * 2 + 4, p.PI, p.TWO_PI, p.CHORD);
  // Face supérieure de la box cap (lumière ambiante venant du dessus)
  p.fill(p.color(58, 22, 105));
  p.ellipse(hCX, hCY - hRY - 1, 27, 7);
  // Pointe de lumière (spéculaire en haut du crâne)
  p.fill(p.color(130, 58, 205, 215));
  p.ellipse(hCX - 2, hCY - hRY - 2, 11, 4);
  p.fill(p.color(225, 190, 255, 200));
  p.ellipse(hCX - 3, hCY - hRY - 1, 5, 2);

  // ── Visor — violet + cyan strip + blue strip ──────────
  // 3D: box violet 180,0,255 + emissive(200,80,255) top + emissive(0,160,255) bottom
  p.fill(VIO);
  p.rect(hCX - hRX - 2, hCY, hRX * 2 + 4, 6, 2);
  p.fill(CYN);
  p.rect(hCX - hRX, hCY + 3, hRX * 2, 2, 1);   // cyan bottom strip
  p.fill(p.color(200, 80, 255));
  p.rect(hCX - hRX, hCY + 1, hRX * 2, 1);       // violet-pink top strip

  // ── Eyes — rectangular glow (3D uses box for eyes) ────
  const eyeY = hCY + 9;
  p.fill(DRK);
  p.rect(-12, eyeY - 3, 10, 6, 1);
  p.rect(2,   eyeY - 3, 10, 6, 1);
  p.fill(CYN);
  p.rect(-11, eyeY - 2, 8, 4, 1);
  p.rect(3,   eyeY - 2, 8, 4, 1);
  p.fill(255);
  p.rect(-9, eyeY - 1, 3, 2);
  p.rect(5,  eyeY - 1, 3, 2);

  // ── Nose ──────────────────────────────────────────────
  p.fill('#4a3025');
  p.rect(-2, eyeY + 3, 4, 4, 2);

  // ── Mouth ─────────────────────────────────────────────
  const mH = p.max(2, mouthLevel * 13 + 2);
  p.fill(DRK);
  p.rect(-5, eyeY + 9, 10, mH, 2);

  // ── EQ cheek tattoos ──────────────────────────────────
  // LEFT = cyan (3D left cheek emissive(0,200,255))
  // RIGHT = rose (3D right cheek emissive(255,0,200))
  const bH = [3, 6, 4, 7, 3];
  for (let i = 0; i < 5; i++) {
    p.fill(CYN);
    p.rect(-17 + i * 3, eyeY + 1 - bH[i], 2, bH[i], 1);
    p.fill(RSE);
    p.rect(7 + i * 3, eyeY + 1 - bH[i], 2, bH[i], 1);
  }

  p.pop();
}

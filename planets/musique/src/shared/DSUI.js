// Design-system helpers for p5.js canvases — mirrors src/styles/design-system.css
const DS = {
  bg:      '#05050a',
  panel:   '#0e0e1a',
  border:  '#1e1e3a',
  accent:  '#06d6a0',
  text:    '#e8e8f0',
  textDim: '#6a6a8a',
};

// Rectangle with a single cut corner (bottom-right).
function dsCutRect(p, x, y, w, h, cut) {
  cut = cut === undefined ? 12 : cut;
  p.beginShape();
  p.vertex(x,         y);
  p.vertex(x + w,     y);
  p.vertex(x + w,     y + h - cut);
  p.vertex(x + w - cut, y + h);
  p.vertex(x,         y + h);
  p.endShape(p.CLOSE);
}

// Dark panel with optional cut corner. Handles fill + stroke internally (push/pop).
function dsPanel(p, x, y, w, h, options) {
  options = options || {};
  const cut    = options.cut    !== undefined ? options.cut    : 12;
  const fill   = options.fill   !== undefined ? options.fill   : DS.panel;
  const stroke = options.stroke !== undefined ? options.stroke : DS.border;
  const alpha  = options.alpha  !== undefined ? options.alpha  : 255;
  p.push();
  const fc = p.color(fill);
  fc.setAlpha(alpha);
  p.fill(fc);
  if (stroke) {
    const sc = p.color(stroke);
    sc.setAlpha(alpha);
    p.stroke(sc);
    p.strokeWeight(1);
  } else {
    p.noStroke();
  }
  dsCutRect(p, x, y, w, h, cut);
  p.pop();
}

// Subtle cyan grid — call after background(), before drawing scene elements.
function dsGrid(p, spacing, alpha) {
  spacing = spacing || 60;
  alpha   = alpha !== undefined ? alpha : 22;
  p.push();
  p.strokeWeight(0.6);
  for (let x = 0; x < p.width; x += spacing) {
    p.stroke(41, 255, 223, alpha);
    p.line(x, 0, x, p.height);
  }
  for (let y = 0; y < p.height; y += spacing) {
    p.stroke(41, 255, 223, alpha);
    p.line(0, y, p.width, y);
  }
  p.pop();
  p.noStroke();
}

// Progress bar / gauge.
function dsGauge(p, x, y, w, h, value, options) {
  options = options || {};
  const bg     = options.bg     || DS.border;
  const fill   = options.fill   || DS.accent;
  const radius = options.radius !== undefined ? options.radius : 4;
  p.push();
  p.noStroke();
  p.fill(bg);
  p.rect(x, y, w, h, radius);
  const fw = p.constrain(value, 0, 1) * w;
  if (fw > 0) {
    p.fill(fill);
    p.rect(x, y, fw, h, radius);
  }
  p.pop();
}

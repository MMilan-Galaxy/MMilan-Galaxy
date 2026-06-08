// ═══════════════════════════════════════════════════════════════════
//  LEVEL EDITOR v2 — Time Jump Project
//  Multi-niveau · Obstacles · PushBoxes · Ennemis · Terminaux
//  Data Boxes · Data Zones · Porte de sortie
//
//  ACTIVATION   : touche E (pendant le jeu)
//  NIVEAUX      : PageUp / PageDown  pour naviguer entre les 5 niveaux
//
//  CONTRÔLES SOURIS :
//    Clic        → sélectionner un objet
//    Drag        → déplacer l'objet sélectionné
//    Drag handle → redimensionner / ajuster bornes patrol
//    Clic vide   → désélectionner
//
//  AJOUT :
//    N  → nouvel obstacle          B  → nouvelle boîte poussable
//    T  → nouveau terminal         J  → nouvel ennemi
//    D  → nouveau data box         G  → nouveau goal zone
//
//  FLAGS obstacle :  1=pOnly  2=paOnly  3=low  4=destroyable
//  Renommer        : L  |  Changer couleur boîte : C
//  Éditer vitesse/clés/id : K  (prompt)  |  ID data : I
//  Supprimer       : Delete / Backspace
//  Sauvegarder     : S   |   Lier fichier .js : F
//
//  INTÉGRATION dans sketch.js (déjà en place) :
//    LevelEditor.init()            → dans setup()
//    LevelEditor.drawWorldOverlay()→ dans push/scale(DEBUG_SC)
//    LevelEditor.drawHUD()         → après pop()
//    LevelEditor.mousePressed / mouseDragged / mouseReleased
//    LevelEditor.keyPressed(kc)
//    LevelEditor.onLevelSwitch(idx)→ appelé par sketch après transition
// ═══════════════════════════════════════════════════════════════════

const LevelEditor = (() => {

  // ── État interne ─────────────────────────────────────────────
  let enabled   = false;
  let selected  = null;
  // { type: 'obs'|'box'|'enemy'|'terminal'|'databox'|'datazone'|'door',
  //   index: number, subHandle: null|'patrolLeft'|'patrolRight' }

  let dragging  = false;
  let dragOffX  = 0, dragOffY = 0;
  let dragOffPL = 0, dragOffPR = 0;   // patrol offsets pour ennemi

  let resizing      = false;
  let resizeDir     = '';             // 'se'|'e'|'s'
  let resizeStartWX = 0, resizeStartWY = 0;
  let resizeStartW  = 0, resizeStartH  = 0, resizeStartSz = 0;

  // Tableau éditeur (types non-live dans les globals de jeu)
  let _edArr_enemies   = [];
  let _edArr_terminals = [];
  let _edArr_databoxes = [];
  let _edArr_datazones = [];
  let _edArr_door      = null;

  // Index local du niveau affiché dans l'éditeur
  let _localIdx = 0;

  // File System Access API
  let fileHandle = null;

  const HANDLE_PX  = 14;
  const GRID_PX    = 30;
  const DIAMOND_R  = 10;

  // Layout HUD (canvas-space)
  const PX = 14, PY = 14, PW = 470;
  const TAB_H = 30, TAB_W = 62, TAB_GAP = 8;
  const TAB_ROW_Y = PY + 40;

  function _gY() { return (typeof GROUND_Y !== 'undefined') ? GROUND_Y : 1065; }
  function _lvCount() {
    return (typeof LEVELS_DATA !== 'undefined') ? LEVELS_DATA.length : 5;
  }

  // ── IndexedDB — persistance du FileHandle ────────────────────
  const IDB_NAME  = 'LevelEditorDB_TimeJump';
  const IDB_STORE = 'handles';
  const IDB_KEY   = 'levelDataHandle';

  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
      req.onsuccess  = e => resolve(e.target.result);
      req.onerror    = e => reject(e.target.error);
    });
  }

  async function _loadHandle() {
    try {
      const db = await _openDB();
      return new Promise(resolve => {
        const tx  = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = e => resolve(e.target.result || null);
        req.onerror   = () => resolve(null);
      });
    } catch { return null; }
  }

  async function _persistHandle(h) {
    try {
      const db = await _openDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(h, IDB_KEY);
    } catch {}
  }

  // ── Initialisation ───────────────────────────────────────────
  async function init() {
    fileHandle = await _loadHandle();
    if (fileHandle) {
      try {
        const perm = await fileHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') await fileHandle.requestPermission({ mode: 'readwrite' });
      } catch { fileHandle = null; }
    }
    _localIdx = (typeof currentLevelIndex !== 'undefined') ? currentLevelIndex : 0;
    _loadLevelData(_localIdx);
    console.log('[LevelEditor v2] Prêt — E pour activer, PageUp/Down pour changer de niveau.');
  }

  // ── Sauvegarde des tableaux éditeur → LEVELS_DATA ────────────
  function _saveCurrentLevelToData(idx) {
    if (typeof LEVELS_DATA === 'undefined' || !LEVELS_DATA[idx]) return;
    const ld = LEVELS_DATA[idx];

    // obstacles et pushBoxes depuis les tableaux live de sketch.js
    if (typeof obstacles !== 'undefined') {
      ld.obstacles = obstacles.map(o => ({
        x: Math.round(o.x), y: Math.round(o.y),
        w: Math.round(o.w), h: Math.round(o.h),
        pOnly: !!o.pOnly, paOnly: !!o.paOnly,
        low: !!o.low, destroyable: !!o.destroyable,
        lbl: o.lbl || '',
      }));
    }
    if (typeof pushBoxes !== 'undefined') {
      ld.pushBoxes = pushBoxes.map(b => ({
        x: Math.round(b.x), y: Math.round(b.y),
        w: Math.round(b.w), h: Math.round(b.h),
        col: b.col.slice(),
      }));
    }

    // Tableaux éditeur
    ld.enemies = _edArr_enemies.map(e => ({
      x: Math.round(e.x),
      patrolLeft:  Math.round(e.patrolLeft),
      patrolRight: Math.round(e.patrolRight),
      speed: e.speed,
    }));
    ld.terminals = _edArr_terminals.map(t => ({
      x: Math.round(t.x), y: Math.round(t.y),
      w: Math.round(t.w), h: Math.round(t.h),
      unlockLabel: t.unlockLabel || '',
      keys: t.keys, timeSec: t.timeSec,
    }));
    ld.dataBricks = {
      boxes: _edArr_databoxes.map(b => ({
        x: Math.round(b.x), y: Math.round(b.y),
        size: Math.round(b.size), id: b.id,
      })),
      zones: _edArr_datazones.map(z => ({
        x: Math.round(z.x), y: Math.round(z.y),
        w: Math.round(z.w), h: Math.round(z.h),
        id: z.id,
      })),
    };
    if (_edArr_door) {
      ld.exitDoor = {
        x: Math.round(_edArr_door.x), y: Math.round(_edArr_door.y),
        w: Math.round(_edArr_door.w), h: Math.round(_edArr_door.h),
      };
    }
  }

  // ── Chargement LEVELS_DATA → tableaux éditeur ─────────────────
  function _loadLevelData(idx) {
    if (typeof LEVELS_DATA === 'undefined' || !LEVELS_DATA[idx]) {
      _edArr_enemies   = [];
      _edArr_terminals = [];
      _edArr_databoxes = [];
      _edArr_datazones = [];
      _edArr_door = { x: 5648, y: 915, w: 78, h: 150 };
      return;
    }
    const ld = LEVELS_DATA[idx];
    _edArr_enemies   = (ld.enemies   || []).map(e => Object.assign({}, e));
    _edArr_terminals = (ld.terminals || []).map(t => Object.assign({}, t));
    const db = ld.dataBricks || {};
    _edArr_databoxes = (db.boxes || []).map(b => Object.assign({}, b));
    _edArr_datazones = (db.zones || []).map(z => Object.assign({}, z));
    _edArr_door = ld.exitDoor ? Object.assign({}, ld.exitDoor)
                              : { x: 5648, y: 915, w: 78, h: 150 };
    selected = null;
    dragging = false;
    resizing = false;
  }

  // ── Changement de niveau ──────────────────────────────────────
  function _switchToLevel(newIdx) {
    const total = _lvCount();
    if (newIdx < 0 || newIdx >= total) return;

    // 1. Sauvegarder le niveau courant
    _saveCurrentLevelToData(_localIdx);

    // 2. Mettre à jour l'index de niveau (variable de sketch.js accessible)
    currentLevelIndex = newIdx;
    _localIdx         = newIdx;

    // 3. Reconstruire le niveau dans le jeu
    if (typeof buildLevel    === 'function') buildLevel();
    if (typeof initMechanics === 'function') initMechanics(currentLevelIndex);

    // 4. Recentrer le joueur
    if (typeof player !== 'undefined' && player) {
      player.x = 270; player.y = _gY() - 57;
      player.vx = 0;  player.vy = 0;
      player.onGround = false; player.jumpsLeft = 2;
    }
    if (typeof camX       !== 'undefined') camX = 0;
    if (typeof era        !== 'undefined' && typeof ERA_PRESENT !== 'undefined') era = ERA_PRESENT;
    if (typeof gameState  !== 'undefined') gameState = 'playing';
    if (typeof levelComplete !== 'undefined') levelComplete = false;

    // 5. Charger les tableaux éditeur du nouveau niveau
    _loadLevelData(newIdx);

    console.log(`[LevelEditor] ► Niveau ${newIdx + 1}`);
  }

  // Appelé par sketch.js après une transition de niveau en jeu
  function onLevelSwitch(idx) {
    _saveCurrentLevelToData(_localIdx);
    _localIdx = idx;
    _loadLevelData(idx);
  }

  // ── On / Off ─────────────────────────────────────────────────
  function toggle() {
    enabled  = !enabled;
    selected = null;
    dragging = false;
    resizing = false;
    console.log(`[LevelEditor] ${enabled ? '▶ ACTIF' : '■ DÉSACTIVÉ'}`);
  }

  function isEnabled() { return enabled; }

  // ── Coordonnées canvas → monde ───────────────────────────────
  function _toWorld(mx, my) {
    return {
      wx: mx / (viewZoom * DEBUG_SC) + camX,
      wy: my / DEBUG_SC
    };
  }

  // ── Hit tests ────────────────────────────────────────────────
  function _hitHandle(wx, wy, obj) {
    const hs = HANDLE_PX;
    const pts = {
      se: { wx: obj.x + obj.w,     wy: obj.y + obj.h },
      e:  { wx: obj.x + obj.w,     wy: obj.y + obj.h / 2 },
      s:  { wx: obj.x + obj.w / 2, wy: obj.y + obj.h },
    };
    for (const [dir, p] of Object.entries(pts)) {
      if (Math.abs(wx - p.wx) < hs && Math.abs(wy - p.wy) < hs) return dir;
    }
    return null;
  }

  function _hitHandleSq(wx, wy, obj) {
    // Pour databox : handle unique SE sur le carré (x, y, size, size)
    const hs = HANDLE_PX;
    const px = obj.x + obj.size, py = obj.y + obj.size;
    return (Math.abs(wx - px) < hs && Math.abs(wy - py) < hs) ? 'se' : null;
  }

  function _hitRect(wx, wy, obj) {
    return wx >= obj.x && wx <= obj.x + obj.w &&
           wy >= obj.y && wy <= obj.y + obj.h;
  }

  function _hitSq(wx, wy, obj) {
    return wx >= obj.x && wx <= obj.x + obj.size &&
           wy >= obj.y && wy <= obj.y + obj.size;
  }

  function _hitDiamond(wx, wy, cx, cy) {
    return Math.abs(wx - cx) + Math.abs(wy - cy) < DIAMOND_R * 2;
  }

  // ── HUD : détection clic sur onglets de niveau ────────────────
  function _tabRect(n) {    // n = 0..4
    return {
      x: PX + 10 + n * (TAB_W + TAB_GAP),
      y: TAB_ROW_Y,
      w: TAB_W,
      h: TAB_H,
    };
  }

  function _checkHUDClick(mx, my) {
    // Test sur les onglets de niveau
    for (let n = 0; n < _lvCount(); n++) {
      const r = _tabRect(n);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        _switchToLevel(n);
        return true;
      }
    }
    return false;
  }

  // ── Dessin overlay WORLD-SPACE ────────────────────────────────
  function drawWorldOverlay() {
    if (!enabled) return;

    const visW  = CANVAS_W / DEBUG_SC;
    const startX = Math.floor(camX / GRID_PX) * GRID_PX;
    const gY = _gY();

    // ── Grille ─────────────────────────────────────────────────
    stroke(255, 255, 255, 20);
    strokeWeight(0.5);
    noFill();
    for (let wx = startX; wx < camX + visW; wx += GRID_PX) {
      line(wx, 0, wx, H);
    }
    for (let wy = 0; wy <= H; wy += GRID_PX) {
      line(camX, wy, camX + visW, wy);
    }

    // GROUND_Y repère
    stroke(255, 255, 0, 45);
    strokeWeight(1);
    line(camX, gY, camX + visW, gY);
    fill(255, 255, 0, 70);
    noStroke();
    textSize(10);
    textAlign(LEFT, BOTTOM);
    text('GROUND_Y=' + gY, camX + 4, gY - 2);

    // ── Obstacles ──────────────────────────────────────────────
    for (let i = 0; i < obstacles.length; i++) {
      const o   = obstacles[i];
      const sel = selected && selected.type === 'obs' && selected.index === i;
      noFill();
      strokeWeight(sel ? 2.5 : 1.2);
      if (sel)              stroke(255, 210, 0);
      else if (o.pOnly && o.destroyable) stroke(255, 140, 50);
      else if (o.pOnly)     stroke(80, 160, 255);
      else if (o.paOnly)    stroke(190, 90, 255);
      else if (o.destroyable) stroke(255, 80, 80);
      else if (o.low)       stroke(80, 220, 200);
      else                  stroke(60, 220, 100, 170);
      rect(o.x, o.y, o.w, o.h);
      fill(255, 255, 255, 150);
      noStroke();
      textSize(9);
      textAlign(LEFT, TOP);
      text(o.lbl || `obs[${i}]`, o.x + 3, o.y + 2);
      if (sel) _drawHandles(o);
    }

    // ── PushBoxes ──────────────────────────────────────────────
    for (let i = 0; i < pushBoxes.length; i++) {
      const b   = pushBoxes[i];
      const sel = selected && selected.type === 'box' && selected.index === i;
      noFill();
      strokeWeight(sel ? 2.5 : 1.5);
      stroke(sel ? color(255, 210, 0) : color(255, 160, 30, 200));
      rect(b.x, b.y, b.w, b.h);
      stroke(255, 160, 30, 110);
      strokeWeight(1);
      line(b.x, b.y, b.x + b.w, b.y + b.h);
      line(b.x + b.w, b.y, b.x, b.y + b.h);
      fill(255, 190, 60, 190);
      noStroke();
      textSize(9);
      textAlign(LEFT, TOP);
      text(`box[${i}]`, b.x + 3, b.y + 2);
      if (sel) _drawHandles(b);
    }

    // ── Ennemis ────────────────────────────────────────────────
    for (let i = 0; i < _edArr_enemies.length; i++) {
      const e   = _edArr_enemies[i];
      const sel = selected && selected.type === 'enemy' && selected.index === i;
      const ex  = e.x, ew = 60, eh = 90;
      // initEnemies() place les ennemis à floorY - 90 où floorY = GROUND_Y + 54
      // → ey = gY + 54 - 90 = gY - 36  (et non gY - 90)
      const ey  = gY - 36;

      // Ligne de patrol (dessous)
      stroke(sel ? color(255, 120, 120) : color(200, 60, 60, 150));
      strokeWeight(sel ? 1.5 : 1);
      drawingContext.setLineDash([8, 5]);
      line(e.patrolLeft, gY + 6, e.patrolRight + ew, gY + 6);
      drawingContext.setLineDash([]);

      // Corps ennemi
      noFill();
      stroke(sel ? color(255, 120, 120) : color(220, 70, 70, 200));
      strokeWeight(sel ? 2.5 : 1.5);
      rect(ex, ey, ew, eh);
      // Croix
      stroke(220, 70, 70, 100);
      strokeWeight(1);
      line(ex, ey, ex + ew, ey + eh);
      line(ex + ew, ey, ex, ey + eh);

      fill(255, 120, 120, 200);
      noStroke();
      textSize(9);
      textAlign(LEFT, TOP);
      text(`ennemi[${i}] v=${e.speed}`, ex + 3, ey + 2);

      // Poignées patrol
      const selHL = sel && selected.subHandle === 'patrolLeft';
      const selHR = sel && selected.subHandle === 'patrolRight';
      _drawDiamond(e.patrolLeft,       gY + 6, selHL ? color(255,210,0) : color(255,80,80,210));
      _drawDiamond(e.patrolRight + ew, gY + 6, selHR ? color(255,210,0) : color(255,80,80,210));
    }

    // ── Terminaux ──────────────────────────────────────────────
    for (let i = 0; i < _edArr_terminals.length; i++) {
      const t   = _edArr_terminals[i];
      const sel = selected && selected.type === 'terminal' && selected.index === i;
      noFill();
      stroke(sel ? color(255, 210, 0) : color(40, 220, 200, 200));
      strokeWeight(sel ? 2.5 : 1.5);
      rect(t.x, t.y, t.w, t.h);
      // Antenne
      stroke(40, 220, 200, 150);
      strokeWeight(1);
      const tx = t.x + t.w / 2;
      line(tx, t.y, tx, t.y - 18);
      line(tx - 12, t.y - 18, tx + 12, t.y - 18);
      fill(40, 220, 200, 200);
      noStroke();
      textSize(9);
      textAlign(LEFT, TOP);
      text(`term[${i}] k=${t.keys} t=${t.timeSec}s`, t.x + 3, t.y + 2);
      if (t.unlockLabel) {
        text(`⚿ ${t.unlockLabel}`, t.x + 3, t.y + 13);
      }
      if (sel) _drawHandles(t);
    }

    // ── Data Boxes ─────────────────────────────────────────────
    for (let i = 0; i < _edArr_databoxes.length; i++) {
      const b   = _edArr_databoxes[i];
      const sel = selected && selected.type === 'databox' && selected.index === i;
      noFill();
      stroke(sel ? color(255, 210, 0) : color(255, 165, 30, 200));
      strokeWeight(sel ? 2.5 : 1.5);
      rect(b.x, b.y, b.size, b.size);
      // Losange intérieur
      stroke(255, 165, 30, 120);
      strokeWeight(1);
      const hx = b.x + b.size / 2, hy = b.y + b.size / 2, hr = b.size * 0.32;
      beginShape();
      vertex(hx, hy - hr); vertex(hx + hr, hy);
      vertex(hx, hy + hr); vertex(hx - hr, hy);
      endShape(CLOSE);
      fill(255, 200, 60, 200);
      noStroke();
      textSize(9);
      textAlign(LEFT, TOP);
      text(`dbox[${i}] ${b.id}`, b.x + 3, b.y + 2);
      if (sel) {
        // Poignée SE unique (redimensionne `size`)
        fill(255, 210, 0, 220);
        noStroke();
        const hs = HANDLE_PX;
        rect(b.x + b.size - hs / 2, b.y + b.size - hs / 2, hs, hs);
      }
    }

    // ── Data Zones (goal) ──────────────────────────────────────
    for (let i = 0; i < _edArr_datazones.length; i++) {
      const z   = _edArr_datazones[i];
      const sel = selected && selected.type === 'datazone' && selected.index === i;
      noFill();
      stroke(sel ? color(255, 210, 0) : color(0, 220, 255, 200));
      strokeWeight(sel ? 2.5 : 1.5);
      drawingContext.setLineDash([6, 4]);
      rect(z.x, z.y, z.w, z.h);
      drawingContext.setLineDash([]);
      fill(0, 220, 255, 170);
      noStroke();
      textSize(9);
      textAlign(LEFT, TOP);
      text(`zone[${i}] ${z.id}`, z.x + 3, z.y + 2);
      if (sel) _drawHandles(z);
    }

    // ── Porte de sortie ────────────────────────────────────────
    if (_edArr_door) {
      const d   = _edArr_door;
      const sel = selected && selected.type === 'door';
      noFill();
      stroke(sel ? color(255, 210, 0) : color(210, 60, 210, 220));
      strokeWeight(sel ? 2.5 : 2);
      rect(d.x, d.y, d.w, d.h);
      fill(210, 80, 210, 180);
      noStroke();
      textSize(9);
      textAlign(LEFT, TOP);
      text('EXIT DOOR', d.x + 3, d.y + 2);
      if (sel) _drawHandles(d);
    }
  }

  function _drawHandles(obj) {
    const hs = HANDLE_PX;
    const pts = [
      { wx: obj.x + obj.w,     wy: obj.y + obj.h },
      { wx: obj.x + obj.w,     wy: obj.y + obj.h / 2 },
      { wx: obj.x + obj.w / 2, wy: obj.y + obj.h },
    ];
    fill(255, 210, 0, 220);
    noStroke();
    for (const p of pts) rect(p.wx - hs / 2, p.wy - hs / 2, hs, hs);
  }

  function _drawDiamond(cx, cy, col) {
    fill(col);
    noStroke();
    const r = DIAMOND_R;
    beginShape();
    vertex(cx,     cy - r);
    vertex(cx + r, cy);
    vertex(cx,     cy + r);
    vertex(cx - r, cy);
    endShape(CLOSE);
  }

  // ── Dessin HUD CANVAS-SPACE ───────────────────────────────────
  function drawHUD() {
    if (!enabled) return;
    push();
    textFont('Courier New');

    // Calcul hauteur du panneau
    let PH = 310;
    if (selected) PH += 90;

    // Fond
    fill(0, 0, 0, 188);
    noStroke();
    rect(PX, PY, PW, PH, 8);
    stroke(80, 80, 80);
    strokeWeight(1);
    noFill();
    rect(PX, PY, PW, PH, 8);

    // Titre
    noStroke();
    fill(255, 210, 0);
    textSize(18);
    textAlign(LEFT, TOP);
    text('🛠 LEVEL EDITOR  [E=quitter]', PX + 10, PY + 10);

    // ── Onglets de niveau ─────────────────────────────────────
    const total = _lvCount();
    for (let n = 0; n < total; n++) {
      const r   = _tabRect(n);
      const cur = (n === _localIdx);
      noStroke();
      fill(cur ? color(255, 210, 0) : color(50, 50, 50));
      rect(r.x, r.y, r.w, r.h, 6);
      stroke(cur ? color(255, 210, 0) : color(100, 100, 100));
      strokeWeight(1);
      noFill();
      rect(r.x, r.y, r.w, r.h, 6);
      noStroke();
      fill(cur ? color(0, 0, 0) : color(180, 180, 180));
      textSize(14);
      textAlign(CENTER, CENTER);
      text(`Niv ${n + 1}`, r.x + r.w / 2, r.y + r.h / 2);
    }

    textAlign(LEFT, TOP);
    let oy = TAB_ROW_Y + TAB_H + 14;

    // Raccourcis
    fill(170, 170, 170);
    textSize(14);
    text('N=obs  B=boîte  T=terminal  J=ennemi', PX + 10, oy);
    oy += 20;
    text('D=dbox  G=zone  Del=supp  S=save  F=fichier', PX + 10, oy);
    oy += 20;
    text('PageUp/Down=niveau  Clic=sel  Drag=déplacer', PX + 10, oy);
    oy += 24;

    // Légende couleurs
    _hudColorKey(PX + 10, oy);
    oy += 32;

    // ── Objet sélectionné ─────────────────────────────────────
    if (selected) {
      stroke(60, 60, 60);
      strokeWeight(1);
      line(PX + 8, oy - 4, PX + PW - 8, oy - 4);
      noStroke();

      fill(255, 210, 0);
      textSize(15);
      const typeLabels = {
        obs: 'Obstacle', box: 'PushBox', enemy: 'Ennemi',
        terminal: 'Terminal', databox: 'DataBox',
        datazone: 'DataZone', door: 'Porte de sortie',
      };
      text(`► ${typeLabels[selected.type] || selected.type} [${selected.index ?? ''}]`, PX + 10, oy);
      oy += 20;

      fill(160, 220, 160);
      textSize(13);

      if (selected.type === 'obs') {
        const o = obstacles[selected.index];
        if (o) {
          text(`x:${r(o.x)}  y:${r(o.y)}  w:${r(o.w)}  h:${r(o.h)}`, PX + 10, oy); oy += 18;
          const fl = [o.pOnly&&'pOnly', o.paOnly&&'paOnly', o.low&&'low', o.destroyable&&'destroy'].filter(Boolean);
          fill(200, 200, 200);
          text(`flags: [${fl.join(', ')||'aucun'}]`, PX + 10, oy); oy += 18;
          fill(180, 180, 255);
          text(`lbl: "${o.lbl}"  [L=ren]  1/2/3/4=flags`, PX + 10, oy);
        }

      } else if (selected.type === 'box') {
        const b = pushBoxes[selected.index];
        if (b) {
          text(`x:${r(b.x)}  y:${r(b.y)}  w:${r(b.w)}  h:${r(b.h)}`, PX + 10, oy); oy += 18;
          fill(b.col[0], b.col[1], b.col[2]);
          noStroke();
          rect(PX + 10, oy, 20, 20);
          fill(200, 200, 200);
          text(`col:[${b.col}]  [C=changer]`, PX + 28, oy);
        }

      } else if (selected.type === 'enemy') {
        const e = _edArr_enemies[selected.index];
        if (e) {
          text(`x:${r(e.x)}  speed:${e.speed}  [K=vitesse]`, PX + 10, oy); oy += 18;
          text(`patrol: ${r(e.patrolLeft)} → ${r(e.patrolRight)}`, PX + 10, oy); oy += 18;
          fill(200, 200, 200);
          text('Drag corps=déplacer  ♦ drag=patrol', PX + 10, oy);
        }

      } else if (selected.type === 'terminal') {
        const t = _edArr_terminals[selected.index];
        if (t) {
          text(`x:${r(t.x)}  y:${r(t.y)}  w:${r(t.w)}  h:${r(t.h)}`, PX + 10, oy); oy += 18;
          fill(200, 200, 200);
          text(`keys:${t.keys}  timeSec:${t.timeSec}  [K=éditer]`, PX + 10, oy); oy += 18;
          fill(180, 180, 255);
          text(`unlock: "${t.unlockLabel||''}"  [L=renommer]`, PX + 10, oy);
        }

      } else if (selected.type === 'databox') {
        const b = _edArr_databoxes[selected.index];
        if (b) {
          text(`x:${r(b.x)}  y:${r(b.y)}  size:${r(b.size)}`, PX + 10, oy); oy += 18;
          fill(180, 180, 255);
          text(`id: "${b.id}"  [I=renommer id]`, PX + 10, oy);
        }

      } else if (selected.type === 'datazone') {
        const z = _edArr_datazones[selected.index];
        if (z) {
          text(`x:${r(z.x)}  y:${r(z.y)}  w:${r(z.w)}  h:${r(z.h)}`, PX + 10, oy); oy += 18;
          fill(180, 180, 255);
          text(`id: "${z.id}"  [I=renommer id]`, PX + 10, oy);
        }

      } else if (selected.type === 'door') {
        if (_edArr_door) {
          text(`x:${r(_edArr_door.x)}  y:${r(_edArr_door.y)}`, PX + 10, oy); oy += 18;
          text(`w:${r(_edArr_door.w)}  h:${r(_edArr_door.h)}`, PX + 10, oy);
        }
      }
    } else {
      fill(100, 100, 100);
      textSize(13);
      text('Aucun objet sélectionné', PX + 10, oy);
    }

    // Statut fichier (bas du panneau)
    const fyPos = PY + PH - 20;
    noStroke();
    if (fileHandle) {
      fill(80, 220, 80);
      textSize(13);
      text(`✓ ${fileHandle.name}  [S=sauv]`, PX + 10, fyPos);
    } else {
      fill(255, 100, 100);
      textSize(13);
      text('✗ Pas de fichier lié  [F=lier]  [S=dl]', PX + 10, fyPos);
    }

    pop();
  }

  function r(v) { return Math.round(v); }

  function _hudColorKey(x, y) {
    const entries = [
      { col: [60, 220, 100],  label: 'Normal' },
      { col: [80, 160, 255],  label: 'pOnly' },
      { col: [190, 90, 255],  label: 'paOnly' },
      { col: [255, 80, 80],   label: 'Dest.' },
      { col: [80, 220, 200],  label: 'Low' },
      { col: [255, 160, 30],  label: 'Box' },
      { col: [220, 70, 70],   label: 'Enemy' },
      { col: [40, 220, 200],  label: 'Term.' },
      { col: [255, 165, 30],  label: 'DBox' },
      { col: [0, 220, 255],   label: 'Zone' },
      { col: [210, 60, 210],  label: 'Door' },
    ];
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    let dx = 0, dy = 0;
    for (const e of entries) {
      fill(e.col[0], e.col[1], e.col[2]);
      rect(x + dx, y + dy, 9, 9);
      fill(160, 160, 160);
      text(e.label, x + dx + 9, y + dy);
      dx += textWidth(e.label) + 22;
      if (dx > 420) { dx = 0; dy += 18; }
    }
  }

  // ── Événements souris ────────────────────────────────────────
  function mousePressed(mx, my) {
    if (!enabled) return false;

    // 1) Onglets de niveau dans le HUD (canvas-space)
    if (_checkHUDClick(mx, my)) return true;

    const { wx, wy } = _toWorld(mx, my);
    const gY = _gY();

    // ── DEBUG (à retirer après confirmation) ──────────────────────
    console.log(`[ED] click mx=${Math.round(mx)} my=${Math.round(my)} → wx=${Math.round(wx)} wy=${Math.round(wy)} | terms=${_edArr_terminals.length} zones=${_edArr_datazones.length} enems=${_edArr_enemies.length}`);
    if (_edArr_terminals.length > 0) {
      const t0 = _edArr_terminals[0];
      console.log(`[ED] terminal[0] x=${t0.x} y=${t0.y} w=${t0.w} h=${t0.h} | hit=${wx>=t0.x&&wx<=t0.x+t0.w&&wy>=t0.y&&wy<=t0.y+t0.h}`);
    }
    if (_edArr_enemies.length > 0) {
      const e0 = _edArr_enemies[0];
      console.log(`[ED] enemy[0] x=${e0.x} | Yhit: wy=${Math.round(wy)} in [${gY-36}..${gY+54}]? ${wy>=gY-36&&wy<=gY+54}`);
    }
    // ── FIN DEBUG ─────────────────────────────────────────────────

    // 2) Poignées de redimensionnement sur l'objet sélectionné
    if (selected) {
      let obj = _getSelectedObj();
      if (obj && selected.type !== 'enemy') {
        // databox : poignée size SE
        if (selected.type === 'databox') {
          const dir = _hitHandleSq(wx, wy, obj);
          if (dir) {
            resizing = true; resizeDir = dir;
            resizeStartWX = wx; resizeStartWY = wy;
            resizeStartSz = obj.size;
            return true;
          }
        } else {
          const dir = _hitHandle(wx, wy, obj);
          if (dir) {
            resizing = true; resizeDir = dir;
            resizeStartWX = wx; resizeStartWY = wy;
            resizeStartW  = obj.w; resizeStartH = obj.h;
            return true;
          }
        }
      }
      // Ennemi : poignées patrol
      if (selected.type === 'enemy') {
        const e  = _edArr_enemies[selected.index];
        if (e) {
          const ew = 60;
          if (_hitDiamond(wx, wy, e.patrolLeft, gY + 6)) {
            selected = { type: 'enemy', index: selected.index, subHandle: 'patrolLeft' };
            dragging = true; dragOffX = 0; return true;
          }
          if (_hitDiamond(wx, wy, e.patrolRight + ew, gY + 6)) {
            selected = { type: 'enemy', index: selected.index, subHandle: 'patrolRight' };
            dragging = true; dragOffX = 0; return true;
          }
        }
      }
    }

    // 3) Porte de sortie
    if (_edArr_door && _hitRect(wx, wy, _edArr_door)) {
      selected = { type: 'door', index: 0, subHandle: null };
      dragging = true;
      dragOffX = wx - _edArr_door.x;
      dragOffY = wy - _edArr_door.y;
      return true;
    }

    // 4) Terminaux (avant les data zones pour éviter d'être masqués)
    for (let i = _edArr_terminals.length - 1; i >= 0; i--) {
      if (_hitRect(wx, wy, _edArr_terminals[i])) {
        selected = { type: 'terminal', index: i, subHandle: null };
        dragging = true;
        dragOffX = wx - _edArr_terminals[i].x;
        dragOffY = wy - _edArr_terminals[i].y;
        return true;
      }
    }

    // 5) Data Zones
    for (let i = _edArr_datazones.length - 1; i >= 0; i--) {
      if (_hitRect(wx, wy, _edArr_datazones[i])) {
        selected = { type: 'datazone', index: i, subHandle: null };
        dragging = true;
        dragOffX = wx - _edArr_datazones[i].x;
        dragOffY = wy - _edArr_datazones[i].y;
        return true;
      }
    }

    // 6) Data Boxes
    for (let i = _edArr_databoxes.length - 1; i >= 0; i--) {
      if (_hitSq(wx, wy, _edArr_databoxes[i])) {
        selected = { type: 'databox', index: i, subHandle: null };
        dragging = true;
        dragOffX = wx - _edArr_databoxes[i].x;
        dragOffY = wy - _edArr_databoxes[i].y;
        return true;
      }
    }

    // 7) Ennemis (corps)
    for (let i = _edArr_enemies.length - 1; i >= 0; i--) {
      const e = _edArr_enemies[i];
      const ew = 60, eh = 90;
      if (wx >= e.x && wx <= e.x + ew && wy >= gY - 36 && wy <= gY + 54) {
        selected = { type: 'enemy', index: i, subHandle: null };
        dragging = true;
        dragOffX  = wx - e.x;
        dragOffPL = e.x - e.patrolLeft;
        dragOffPR = e.patrolRight - e.x;
        return true;
      }
    }

    // 8) PushBoxes
    for (let i = pushBoxes.length - 1; i >= 0; i--) {
      if (_hitRect(wx, wy, pushBoxes[i])) {
        selected = { type: 'box', index: i, subHandle: null };
        dragging = true;
        dragOffX = wx - pushBoxes[i].x;
        dragOffY = wy - pushBoxes[i].y;
        return true;
      }
    }

    // 9) Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (_hitRect(wx, wy, obstacles[i])) {
        selected = { type: 'obs', index: i, subHandle: null };
        dragging = true;
        dragOffX = wx - obstacles[i].x;
        dragOffY = wy - obstacles[i].y;
        return true;
      }
    }

    // Clic dans le vide
    selected = null;
    return false;
  }

  function mouseDragged(mx, my) {
    if (!enabled || !selected) return false;
    const { wx, wy } = _toWorld(mx, my);
    const gY = _gY();

    // Redimensionnement
    if (resizing) {
      const dx = wx - resizeStartWX;
      const dy = wy - resizeStartWY;

      if (selected.type === 'databox') {
        const b = _edArr_databoxes[selected.index];
        if (b) b.size = Math.max(20, Math.round(resizeStartSz + Math.max(dx, dy)));
      } else {
        const obj = _getSelectedObj();
        if (obj) {
          if (resizeDir === 'se' || resizeDir === 'e') obj.w = Math.max(10, Math.round(resizeStartW + dx));
          if (resizeDir === 'se' || resizeDir === 's') obj.h = Math.max(10, Math.round(resizeStartH + dy));
        }
      }
      return true;
    }

    // Déplacement
    if (dragging) {
      if (selected.type === 'obs') {
        const o = obstacles[selected.index];
        if (o) { o.x = Math.round(wx - dragOffX); o.y = Math.round(wy - dragOffY); }

      } else if (selected.type === 'box') {
        const b = pushBoxes[selected.index];
        if (b) { b.x = Math.round(wx - dragOffX); b.y = Math.round(wy - dragOffY); }

      } else if (selected.type === 'enemy') {
        const e = _edArr_enemies[selected.index];
        if (!e) return false;
        if (selected.subHandle === 'patrolLeft') {
          e.patrolLeft = Math.round(wx);
          if (e.patrolLeft > e.patrolRight) e.patrolLeft = e.patrolRight;
        } else if (selected.subHandle === 'patrolRight') {
          e.patrolRight = Math.round(wx - 60);
          if (e.patrolRight < e.patrolLeft) e.patrolRight = e.patrolLeft;
        } else {
          // Corps : déplacer x + patrol ensemble
          e.x = Math.round(wx - dragOffX);
          e.patrolLeft  = e.x - dragOffPL;
          e.patrolRight = e.x + dragOffPR;
        }

      } else if (selected.type === 'terminal') {
        const t = _edArr_terminals[selected.index];
        if (t) { t.x = Math.round(wx - dragOffX); t.y = Math.round(wy - dragOffY); }

      } else if (selected.type === 'databox') {
        const b = _edArr_databoxes[selected.index];
        if (b) { b.x = Math.round(wx - dragOffX); b.y = Math.round(wy - dragOffY); }

      } else if (selected.type === 'datazone') {
        const z = _edArr_datazones[selected.index];
        if (z) { z.x = Math.round(wx - dragOffX); z.y = Math.round(wy - dragOffY); }

      } else if (selected.type === 'door') {
        if (_edArr_door) {
          _edArr_door.x = Math.round(wx - dragOffX);
          _edArr_door.y = Math.round(wy - dragOffY);
        }
      }
      return true;
    }
    return false;
  }

  function mouseReleased() {
    if (!enabled) return;
    dragging = false;
    resizing = false;
    // Réinitialiser subHandle des ennemis après relâchement
    if (selected && selected.type === 'enemy' && selected.subHandle) {
      selected = { type: 'enemy', index: selected.index, subHandle: null };
    }
  }

  function _getSelectedObj() {
    if (!selected) return null;
    switch (selected.type) {
      case 'obs':      return obstacles[selected.index]       || null;
      case 'box':      return pushBoxes[selected.index]       || null;
      case 'enemy':    return _edArr_enemies[selected.index]  || null;
      case 'terminal': return _edArr_terminals[selected.index]|| null;
      case 'databox':  return _edArr_databoxes[selected.index]|| null;
      case 'datazone': return _edArr_datazones[selected.index]|| null;
      case 'door':     return _edArr_door;
      default: return null;
    }
  }

  // ── Événements clavier ────────────────────────────────────────
  function keyPressed(kc) {
    // E = toggle (fonctionne même désactivé)
    if (kc === 69) { toggle(); return true; }
    if (!enabled) return false;

    // S = sauvegarder
    if (kc === 83) { saveLevelData(); return true; }

    // F = lier fichier
    if (kc === 70) { pickAndLinkFile(); return true; }

    // N = nouvel obstacle
    if (kc === 78) { _addObstacle(); return true; }

    // B = nouvelle boîte
    if (kc === 66) { _addBox(); return true; }

    // T = nouveau terminal
    if (kc === 84) { _addTerminal(); return true; }

    // J = nouvel ennemi
    if (kc === 74) { _addEnemy(); return true; }

    // D = nouveau data box
    if (kc === 68) { _addDataBox(); return true; }

    // G = nouveau goal zone
    if (kc === 71) { _addDataZone(); return true; }

    // PageUp (33) = niveau précédent
    if (kc === 33) { _switchToLevel(_localIdx - 1); return true; }

    // PageDown (34) = niveau suivant
    if (kc === 34) { _switchToLevel(_localIdx + 1); return true; }

    // Delete (46) ou Backspace (8) = supprimer
    if ((kc === 46 || kc === 8) && selected) { _deleteSelected(); return true; }

    // ── Raccourcis selon l'objet sélectionné ─────────────────
    if (!selected) return false;
    const type = selected.type;

    // Obstacle : 1/2/3/4 pour flags, L pour label
    if (type === 'obs') {
      const o = obstacles[selected.index];
      if (!o) return false;
      if (kc === 49) { o.pOnly = !o.pOnly; if (o.pOnly) o.paOnly = false; return true; }
      if (kc === 50) { o.paOnly = !o.paOnly; if (o.paOnly) o.pOnly = false; return true; }
      if (kc === 51) { o.low = !o.low; return true; }
      if (kc === 52) { o.destroyable = !o.destroyable; return true; }
      if (kc === 76) {
        const n = window.prompt('Nom obstacle :', o.lbl);
        if (n !== null) o.lbl = n;
        return true;
      }
    }

    // PushBox : C pour couleur
    if (type === 'box') {
      if (kc === 67) {
        const b  = pushBoxes[selected.index];
        const rv = parseInt(window.prompt('Rouge (0-255) :', b.col[0]));
        const gv = parseInt(window.prompt('Vert (0-255) :', b.col[1]));
        const bv = parseInt(window.prompt('Bleu (0-255) :', b.col[2]));
        if (!isNaN(rv) && !isNaN(gv) && !isNaN(bv)) {
          b.col = [clamp(rv), clamp(gv), clamp(bv)];
        }
        return true;
      }
    }

    // Ennemi : K pour vitesse
    if (type === 'enemy') {
      if (kc === 75) {
        const e  = _edArr_enemies[selected.index];
        if (!e) return false;
        const sv = parseFloat(window.prompt('Vitesse :', e.speed));
        if (!isNaN(sv) && sv > 0) e.speed = Math.round(sv * 10) / 10;
        return true;
      }
    }

    // Terminal : L pour label, K pour keys/timeSec
    if (type === 'terminal') {
      const t = _edArr_terminals[selected.index];
      if (!t) return false;
      if (kc === 76) {
        const n = window.prompt('Unlock label :', t.unlockLabel);
        if (n !== null) t.unlockLabel = n;
        return true;
      }
      if (kc === 75) {
        const ks = parseInt(window.prompt('Nombre de touches :', t.keys));
        const ts = parseFloat(window.prompt('Temps par touche (sec) :', t.timeSec));
        if (!isNaN(ks) && ks > 0)  t.keys    = ks;
        if (!isNaN(ts) && ts > 0)  t.timeSec = Math.round(ts * 10) / 10;
        return true;
      }
    }

    // DataBox / DataZone : I pour id
    if (type === 'databox') {
      if (kc === 73) {
        const b = _edArr_databoxes[selected.index];
        if (!b) return false;
        const n = window.prompt('ID data box :', b.id);
        if (n !== null && n.trim()) b.id = n.trim();
        return true;
      }
    }

    if (type === 'datazone') {
      if (kc === 73) {
        const z = _edArr_datazones[selected.index];
        if (!z) return false;
        const n = window.prompt('ID goal zone :', z.id);
        if (n !== null && n.trim()) z.id = n.trim();
        return true;
      }
    }

    return false;
  }

  function clamp(v) { return Math.max(0, Math.min(255, v)); }

  // ── Ajout ────────────────────────────────────────────────────
  function _cx() { return Math.round(camX + (CANVAS_W / DEBUG_SC) / 2); }

  function _addObstacle() {
    obstacles.push({
      x: _cx() - 75, y: _gY() - 200,
      w: 150, h: 30,
      pOnly: false, paOnly: false, low: false, destroyable: false,
      destroyed: false, lbl: `obs_${obstacles.length}`,
    });
    selected = { type: 'obs', index: obstacles.length - 1, subHandle: null };
  }

  function _addBox() {
    pushBoxes.push({
      x: _cx() - 45, y: _gY() - 96,
      w: 90, h: 90,
      vx: 0, vy: 0, onGround: false,
      col: [150, 100, 50],
    });
    selected = { type: 'box', index: pushBoxes.length - 1, subHandle: null };
  }

  function _addEnemy() {
    const cx = _cx();
    _edArr_enemies.push({
      x: cx - 30,
      patrolLeft:  cx - 130,
      patrolRight: cx + 70,
      speed: 2.5,
    });
    selected = { type: 'enemy', index: _edArr_enemies.length - 1, subHandle: null };
  }

  function _addTerminal() {
    _edArr_terminals.push({
      x: _cx() - 30, y: _gY() - 90,
      w: 60, h: 90,
      unlockLabel: '', keys: 5, timeSec: 6,
    });
    selected = { type: 'terminal', index: _edArr_terminals.length - 1, subHandle: null };
  }

  function _addDataBox() {
    const nextId = `data-${_edArr_databoxes.length + 1}`;
    _edArr_databoxes.push({ x: _cx() - 30, y: _gY() - 120, size: 60, id: nextId });
    selected = { type: 'databox', index: _edArr_databoxes.length - 1, subHandle: null };
  }

  function _addDataZone() {
    const nextId = `data-${_edArr_datazones.length + 1}`;
    _edArr_datazones.push({ x: _cx() - 55, y: _gY() - 200, w: 110, h: 110, id: nextId });
    selected = { type: 'datazone', index: _edArr_datazones.length - 1, subHandle: null };
  }

  function _deleteSelected() {
    if (!selected) return;
    switch (selected.type) {
      case 'obs':      obstacles.splice(selected.index, 1);            break;
      case 'box':      pushBoxes.splice(selected.index, 1);            break;
      case 'enemy':    _edArr_enemies.splice(selected.index, 1);       break;
      case 'terminal': _edArr_terminals.splice(selected.index, 1);     break;
      case 'databox':  _edArr_databoxes.splice(selected.index, 1);     break;
      case 'datazone': _edArr_datazones.splice(selected.index, 1);     break;
      case 'door':     /* ne pas supprimer la porte */                  break;
    }
    selected = null;
  }

  // ── Sérialisation ────────────────────────────────────────────
  function _pad(v, n) { return String(Math.round(v)).padStart(n); }

  function _serObs(o) {
    const lbl = (o.lbl || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `      { x:${_pad(o.x,5)}, y:${_pad(o.y,5)}, w:${_pad(o.w,5)}, h:${_pad(o.h,4)}, ` +
           `pOnly:${o.pOnly?'true ':'false'}, paOnly:${o.paOnly?'true ':'false'}, ` +
           `low:${o.low?'true ':'false'}, destroyable:${o.destroyable?'true ':'false'}, lbl:'${lbl}' },`;
  }

  function _serBox(b) {
    return `      { x:${_pad(b.x,5)}, y:${_pad(b.y,4)}, w:${b.w}, h:${b.h}, col: [${b.col[0]}, ${b.col[1]}, ${b.col[2]}] },`;
  }

  function _serEnemy(e) {
    return `      { x:${_pad(e.x,5)}, patrolLeft:${_pad(e.patrolLeft,5)}, patrolRight:${_pad(e.patrolRight,5)}, speed: ${e.speed} },`;
  }

  function _serTerminal(t) {
    const lbl = (t.unlockLabel || '').replace(/'/g,"\\'");
    return `      { x:${_pad(t.x,5)}, y:${_pad(t.y,5)}, w:${_pad(t.w,3)}, h:${_pad(t.h,3)}, unlockLabel: '${lbl}', keys: ${t.keys}, timeSec: ${t.timeSec} },`;
  }

  function _serDataBox(b) {
    return `        { x:${_pad(b.x,5)}, y:${_pad(b.y,5)}, size:${_pad(b.size,3)}, id: "${b.id}" },`;
  }

  function _serDataZone(z) {
    return `        { x:${_pad(z.x,5)}, y:${_pad(z.y,5)}, w:${_pad(z.w,4)}, h:${_pad(z.h,4)}, id: "${z.id}" },`;
  }

  function _serDoor(d) {
    return `      { x: ${_pad(d.x,5)}, y: ${_pad(d.y,5)}, w: ${_pad(d.w,3)}, h: ${_pad(d.h,3)} }`;
  }

  function buildExportText() {
    // 1. Sauvegarder le niveau courant dans LEVELS_DATA
    _saveCurrentLevelToData(_localIdx);

    const ts = new Date().toLocaleString('fr-FR');

    const levelBlocks = LEVELS_DATA.map((ld, idx) => {
      const obsLines  = (ld.obstacles || []).map(_serObs).join('\n');
      const boxLines  = (ld.pushBoxes || []).map(_serBox).join('\n');
      const eneLines  = (ld.enemies   || []).map(_serEnemy).join('\n');
      const termLines = (ld.terminals || []).map(_serTerminal).join('\n');
      const db = ld.dataBricks || { boxes: [], zones: [] };
      const dboxLines = (db.boxes || []).map(_serDataBox).join('\n');
      const dzoneLines= (db.zones || []).map(_serDataZone).join('\n');
      const door = ld.exitDoor || { x: 5648, y: 915, w: 78, h: 150 };
      const name = (ld.name || `NIVEAU ${idx + 1}`).replace(/'/g, "\\'");

      return `  // ── NIVEAU ${idx + 1} : ${ld.name || ''} ─────────────────────────────────
  {
    id: ${idx + 1},
    name: "${ld.name || ''}",

    obstacles: [
${obsLines || '      // (vide)'}
    ],

    pushBoxes: [
${boxLines || '      // (vide)'}
    ],

    enemies: [
${eneLines || '      // (vide)'}
    ],

    terminals: [
${termLines || '      // (vide)'}
    ],

    dataBricks: {
      boxes: [${dboxLines ? '\n' + dboxLines + '\n      ' : ''}],
      zones: [${dzoneLines ? '\n' + dzoneLines + '\n      ' : ''}],
    },

    exitDoor: ${_serDoor(door)},
  }`;
    }).join(',\n\n');

    return `// ═══════════════════════════════════════════════════════════════════
//  LEVEL DATA — Time Jump  (format multi-niveaux)
//  Généré par LevelEditor le ${ts}
//
//  Note : GROUND_Y = 1065  (H - 135,  H = 1200)
// ═══════════════════════════════════════════════════════════════════

const LEVELS_DATA = [

${levelBlocks},

];
`;
  }

  // ── File System Access API ────────────────────────────────────
  async function pickAndLinkFile() {
    if (!window.showSaveFilePicker) {
      alert('File System Access API non supportée.\nUtilise Chrome 86+ ou Edge 86+.\n\nS téléchargera un fichier .js.');
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'level_data.js',
        types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
      });
      fileHandle = handle;
      await _persistHandle(fileHandle);
      await _writeToFile(buildExportText());
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[LevelEditor] Erreur liaison :', e);
    }
  }

  async function _writeToFile(text) {
    if (!fileHandle) return;
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(text);
      await writable.close();
      console.log('[LevelEditor] ✓ Sauvegardé → ' + fileHandle.name);
    } catch (e) {
      console.error('[LevelEditor] Erreur écriture :', e);
      try {
        await fileHandle.requestPermission({ mode: 'readwrite' });
        await _writeToFile(text);
      } catch {
        fileHandle = null;
      }
    }
  }

  async function saveLevelData() {
    const text = buildExportText();
    if (fileHandle) {
      await _writeToFile(text);
    } else {
      const blob = new Blob([text], { type: 'text/javascript' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'level_data.js';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[LevelEditor] ⬇ Téléchargé level_data.js  (F pour lier un fichier)');
    }
  }

  // ── API publique ──────────────────────────────────────────────
  return {
    init,
    toggle,
    isEnabled,
    drawWorldOverlay,
    drawHUD,
    mousePressed,
    mouseDragged,
    mouseReleased,
    keyPressed,
    onLevelSwitch,
    save: saveLevelData,
    export: buildExportText,
  };

})();

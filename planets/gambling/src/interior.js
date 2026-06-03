// ═══════════════════════════════════════
//  INTERIOR — une seule grande carte avec vraies salles
// ═══════════════════════════════════════

const R_TOP  = 70;   // y haut des salles
const R_BOT  = 700;  // y bas des salles
const R_WALL = 24;   // épaisseur des murs

const DIV1_X = 3384; // cloison entre BJ et roulette
const DIV2_X = 6602; // cloison entre roulette et slots

const BJ_DOOR_X    = 1418;
const ROU_DOOR_X   = 4637;
const SLOTS_DOOR_X = 7855;
const DOOR_W       = 792;

const GAME_TABLES = [
  {x:1094, y:220, w:1440, h:260, type:'blackjack', label:'♠ BLACKJACK', col:[28,48,200]},
  {x:4313, y:220, w:1440, h:260, type:'roulette',  label:'◎ ROULETTE',  col:[178,26,26]},
  {x:7531, y:220, w:1440, h:260, type:'slots',     label:'🎰 MACHINES',  col:[155,26,155]},
];

const BOSS_ROOM    = {x:3096, y:1040, w:3888, h:400};
const BOSS_DOOR_X  = 4644;
const BOSS_POS     = {x:5040, y:1096};
const EXIT_DOOR    = {x:4500, y:1930, w:1080, h:70};

// Derived constants (avoid recomputing every frame)
const BW_Y         = R_BOT - R_WALL;
const BOSS_BOT_Y   = BOSS_ROOM.y + BOSS_ROOM.h;
const BOSS_DOOR_CX = BOSS_DOOR_X + DOOR_W / 2;
const CHAND_X      = [1818, 5040, 8280];
const CHAND_Y      = 780;

// Room floor areas aligned with game tables
const ROOM_DEFS = [
  {x:70,   w:3314, t:GAME_TABLES[0]},
  {x:3408, w:3194, t:GAME_TABLES[1]},
  {x:6626, w:3404, t:GAME_TABLES[2]},
];

// Door arch definitions per room
const DOOR_DEFS = [
  {cx:BJ_DOOR_X+DOOR_W/2,    key:'blackjack', col:GAME_TABLES[0].col},
  {cx:ROU_DOOR_X+DOOR_W/2,   key:'roulette',  col:GAME_TABLES[1].col},
  {cx:SLOTS_DOOR_X+DOOR_W/2, key:'slots',     col:GAME_TABLES[2].col},
];

// ── SOLIDES ───────────────────────────────────────────────────
function getInteriorSolids(){
  let s = [];

  // Outer boundary walls
  s.push({x:0,           y:0,           w:INT_W,                             h:R_TOP});
  s.push({x:0,           y:EXIT_DOOR.y, w:EXIT_DOOR.x,                       h:EXIT_DOOR.h});
  s.push({x:EXIT_DOOR.x+EXIT_DOOR.w, y:EXIT_DOOR.y, w:INT_W-(EXIT_DOOR.x+EXIT_DOOR.w), h:EXIT_DOOR.h});
  s.push({x:0,           y:0,           w:70,                                 h:INT_H});
  s.push({x:INT_W-70,    y:0,           w:70,                                 h:INT_H});

  // Vertical room dividers
  s.push({x:DIV1_X, y:R_TOP, w:R_WALL, h:R_BOT - R_TOP});
  s.push({x:DIV2_X, y:R_TOP, w:R_WALL, h:R_BOT - R_TOP});

  // Bottom walls with door gaps
  s.push({x:70,                y:BW_Y, w:BJ_DOOR_X-70,                        h:R_WALL});
  s.push({x:BJ_DOOR_X+DOOR_W,  y:BW_Y, w:DIV1_X-(BJ_DOOR_X+DOOR_W),          h:R_WALL});
  s.push({x:DIV1_X+R_WALL,     y:BW_Y, w:ROU_DOOR_X-(DIV1_X+R_WALL),         h:R_WALL});
  s.push({x:ROU_DOOR_X+DOOR_W, y:BW_Y, w:DIV2_X-(ROU_DOOR_X+DOOR_W),         h:R_WALL});
  s.push({x:DIV2_X+R_WALL,     y:BW_Y, w:SLOTS_DOOR_X-(DIV2_X+R_WALL),       h:R_WALL});
  s.push({x:SLOTS_DOOR_X+DOOR_W, y:BW_Y, w:INT_W-70-(SLOTS_DOOR_X+DOOR_W),   h:R_WALL});

  // Game tables
  for(let t of GAME_TABLES) s.push({x:t.x, y:t.y, w:t.w, h:t.h});

  // Boss room walls
  let bw = R_WALL, br = BOSS_ROOM;
  s.push({x:br.x,              y:br.y,            w:br.w,                              h:bw});
  s.push({x:br.x,              y:br.y,            w:bw,                                h:br.h});
  s.push({x:br.x+br.w-bw,      y:br.y,            w:bw,                                h:br.h});
  s.push({x:br.x,              y:BOSS_BOT_Y-bw,   w:BOSS_DOOR_X-br.x,                  h:bw});
  s.push({x:BOSS_DOOR_X+DOOR_W, y:BOSS_BOT_Y-bw,  w:(br.x+br.w)-(BOSS_DOOR_X+DOOR_W), h:bw});
  if(ingots < 3) s.push({x:BOSS_DOOR_X, y:BOSS_BOT_Y-bw, w:DOOR_W, h:bw});

  // Boss desk
  s.push({x:br.x+432, y:BOSS_POS.y+190, w:br.w-864, h:64});

  return s;
}

// ── PROXIMITÉS ────────────────────────────────────────────────
function nearIntTable(){
  for(let t of GAME_TABLES){
    if(!done[t.type] && dist(player.x, player.y, t.x+t.w/2, t.y+t.h+20) < 130) return t;
  }
  return null;
}

function nearBoss(){
  return dist(player.x, player.y, BOSS_POS.x, BOSS_POS.y+160) < 164;
}

function nearBossDoor(){
  return dist(player.x, player.y, BOSS_DOOR_CX, BOSS_BOT_Y) < 144;
}

function nearExit(){
  return dist(player.x, player.y, EXIT_DOOR.x+EXIT_DOOR.w/2, EXIT_DOOR.y) < 140;
}

// ── DESSIN ────────────────────────────────────────────────────
function drawInterior(){
  background(14,4,22);
  push(); translate(-cam.x,-cam.y);
  _intDrawFloor();
  _intDrawRoomFloors();
  _intDrawWalls();
  _intDrawTables();
  _intDrawBossRoom();
  _intDrawExit();
  player.update(); player.draw();
  pop();
  updateCam(INT_W, INT_H);
}

function _intDrawFloor(){
  noStroke(); fill(72,10,12);
  rect(70, R_BOT, INT_W-140, INT_H-R_BOT-70);

  // Grid tiles — state set once, viewport-culled
  noFill(); stroke(92,14,16); strokeWeight(2);
  for(let x=70;x<INT_W-70;x+=360){
    if(x+360<cam.x||x>cam.x+W) continue;
    for(let y=R_BOT;y<INT_H-70;y+=100){
      if(y+100<cam.y||y>cam.y+H) continue;
      rect(x+14,y+4,332,92,4);
    }
  }

  // Diagonal tiles — pre-computed quad corners (rot 45°), no push/pop
  // rect(-101,-28,202,56) rotated 45° → corners at offsets below
  noFill(); stroke(112,88,18,55); strokeWeight(2);
  for(let x=432;x<INT_W-432;x+=360){
    if(x+132<cam.x||x>cam.x+W) continue;
    for(let y=R_BOT+50;y<INT_H-120;y+=100){
      if(y+132<cam.y||y>cam.y+H) continue;
      quad(x-51.6,y-91.2, x+91.2,y+51.6, x+51.6,y+91.2, x-91.2,y-51.6);
    }
  }
}

function _intDrawRoomFloors(){
  for(let rd of ROOM_DEFS){
    let c = rd.t.col;
    noStroke(); fill(c[0]*.18, c[1]*.18, c[2]*.18);
    rect(rd.x, R_TOP, rd.w, R_BOT - R_TOP);
    // Tile state set once per room, viewport-culled
    noFill(); stroke(c[0]*.42, c[1]*.42, c[2]*.42, 72); strokeWeight(2);
    for(let x=rd.x+58;x<rd.x+rd.w-58;x+=230){
      if(x+230<cam.x||x>cam.x+W) continue;
      for(let y=R_TOP+58;y<R_BOT-58;y+=64){
        if(y+64<cam.y||y>cam.y+H) continue;
        rect(x,y,158,44,2);
      }
    }
  }
}

function _intDrawWalls(){
  // Outer walls
  fill(26,12,40); noStroke();
  rect(0,0,INT_W,70); rect(0,INT_H-70,INT_W,70);
  rect(0,0,70,INT_H); rect(INT_W-70,0,70,INT_H);
  stroke(138,108,28); strokeWeight(4); noFill();
  line(70,70,INT_W-70,70); line(70,INT_H-70,INT_W-70,INT_H-70);
  line(70,70,70,INT_H-70); line(INT_W-70,70,INT_W-70,INT_H-70);

  // Vertical dividers
  fill(22,10,36); noStroke();
  rect(DIV1_X, R_TOP, R_WALL, R_BOT - R_TOP);
  rect(DIV2_X, R_TOP, R_WALL, R_BOT - R_TOP);
  stroke(120,90,20); strokeWeight(3); noFill();
  for(let dx of [DIV1_X, DIV2_X]){
    line(dx, R_TOP, dx, R_BOT);
    line(dx+R_WALL, R_TOP, dx+R_WALL, R_BOT);
  }

  // Bottom room walls
  fill(22,10,36); noStroke();
  rect(70,                 BW_Y, BJ_DOOR_X-70,                        R_WALL);
  rect(BJ_DOOR_X+DOOR_W,   BW_Y, DIV1_X-(BJ_DOOR_X+DOOR_W),          R_WALL);
  rect(DIV1_X+R_WALL,      BW_Y, ROU_DOOR_X-(DIV1_X+R_WALL),         R_WALL);
  rect(ROU_DOOR_X+DOOR_W,  BW_Y, DIV2_X-(ROU_DOOR_X+DOOR_W),         R_WALL);
  rect(DIV2_X+R_WALL,      BW_Y, SLOTS_DOOR_X-(DIV2_X+R_WALL),       R_WALL);
  rect(SLOTS_DOOR_X+DOOR_W,BW_Y, INT_W-70-(SLOTS_DOOR_X+DOOR_W),     R_WALL);
  stroke(120,90,20); strokeWeight(3); noFill();
  line(70,BW_Y,INT_W-70,BW_Y);

  // Door arches
  for(let d of DOOR_DEFS){
    let r = done[d.key] ? color(60,220,80) : color(d.col[0],d.col[1],d.col[2]);
    stroke(r); strokeWeight(6); noFill();
    arc(d.cx, BW_Y, DOOR_W, 76, PI, 0);
    fill(red(r),green(r),blue(r),120); noStroke();
    rect(d.cx-DOOR_W/2-29, BW_Y-R_WALL-40, 58, 40, 4);
    rect(d.cx+DOOR_W/2-29, BW_Y-R_WALL-40, 58, 40, 4);
  }

  // Room labels
  for(let t of GAME_TABLES){
    let cx = t.x+t.w/2;
    fill(0,0,0,100); noStroke(); rect(cx-518,R_TOP+24,1036,52,8);
    stroke(t.col[0],t.col[1],t.col[2]); strokeWeight(3); noFill(); rect(cx-518,R_TOP+24,1036,52,8);
    fill(255,235,60); textAlign(CENTER,CENTER); textSize(24); textStyle(BOLD);
    text(t.label, cx, R_TOP+50); textStyle(NORMAL);
  }
}

function _intDrawTables(){
  // Game tables
  for(let t of GAME_TABLES){
    let tc = t.col, isDone = done[t.type];
    let cx = t.x+t.w/2, cy = t.y+t.h/2;
    push();
    noStroke(); fill(0,0,0,78); rect(t.x+72,t.y+24,t.w,t.h,20);
    fill(isDone?color(30,130,30):color(tc[0],tc[1],tc[2]));
    stroke(255,255,255,42); strokeWeight(3); rect(t.x,t.y,t.w,t.h,16);
    fill(isDone?color(40,160,40,175):color(tc[0]+22,tc[1]+22,tc[2]+22,175));
    noStroke(); rect(t.x+72,t.y+20,t.w-144,t.h-40,10);
    noFill(); stroke(255,255,255,38); strokeWeight(2); ellipse(cx,cy,t.w-216,t.h-60);
    fill(255,230,50,215); noStroke(); textAlign(CENTER,CENTER); textSize(22); textStyle(BOLD);
    text(t.label, cx, t.y+44); textStyle(NORMAL);
    if(isDone){ fill(50,230,80); textSize(60); text('✓',cx,cy); }
    else{ fill(220,185,25); textSize(22); text('WIN → 🥇 LINGOT',cx,t.y+t.h-32); }
    if(!isDone && dist(player.x,player.y,cx,t.y+t.h+20)<130 && !dlg.active){
      fill(255,255,175); noStroke(); textSize(24); textStyle(BOLD); textAlign(CENTER);
      text('[E] Jouer', cx, t.y+t.h+60); textStyle(NORMAL);
    }
    pop();
  }

  // Velvet ropes
  for(let t of GAME_TABLES){
    let cx = t.x+t.w/2, padX=288, padY=52;
    stroke(175,138,18); strokeWeight(5); noFill();
    line(cx-t.w/2-padX, t.y+t.h+padY, cx+t.w/2+padX, t.y+t.h+padY);
    for(let sign=-1;sign<=1;sign+=2){
      let px = cx+sign*(t.w/2+padX), py = t.y+t.h+padY;
      fill(198,162,24); noStroke(); ellipse(px,py,58,16);
      fill(178,142,18); rect(px-22,py,43,40,4);
      fill(208,178,32); ellipse(px,py+40,58,16);
    }
  }

  // Chandeliers
  for(let cx of CHAND_X){
    for(let i=4;i>0;i--){noStroke();fill(255,220,80,16);ellipse(cx,CHAND_Y,(187+i*101),(52+i*28));}
    fill(220,190,60); stroke(180,150,30); strokeWeight(3); ellipse(cx,CHAND_Y,187,52);
    fill(255,240,120); noStroke(); ellipse(cx,CHAND_Y,94,26);
    for(let a=0;a<TWO_PI;a+=PI/4){stroke(215,185,40);strokeWeight(2);line(cx,CHAND_Y,cx+cos(a)*130,CHAND_Y+sin(a)*36);}
    for(let a=0;a<TWO_PI;a+=PI/4){fill(255,240,80,175);noStroke();ellipse(cx+cos(a)*130,CHAND_Y+sin(a)*36,29,8);}
  }
}

function _intDrawBossRoom(){
  let br = BOSS_ROOM;
  let bossOk = ingots >= 3;

  // Room interior tiles
  fill(11,4,20); noStroke(); rect(br.x+R_WALL, br.y+R_WALL, br.w-R_WALL*2, br.h-R_WALL*2);
  for(let x=br.x+R_WALL+29;x<br.x+br.w-R_WALL-29;x+=230)
    for(let y=br.y+R_WALL+29;y<BOSS_BOT_Y-R_WALL-29;y+=64){
      noFill(); stroke(52,32,88,48); strokeWeight(2); rect(x,y,202,56,2);
    }

  // Walls
  fill(20,9,34); noStroke();
  rect(br.x,              br.y,            br.w,                              R_WALL);
  rect(br.x,              br.y,            R_WALL,                            br.h);
  rect(br.x+br.w-R_WALL,  br.y,            R_WALL,                            br.h);
  rect(br.x,              BOSS_BOT_Y-R_WALL, BOSS_DOOR_X-br.x,               R_WALL);
  rect(BOSS_DOOR_X+DOOR_W, BOSS_BOT_Y-R_WALL, (br.x+br.w)-(BOSS_DOOR_X+DOOR_W), R_WALL);
  stroke(110,78,185); strokeWeight(4); noFill(); rect(br.x+2,br.y+2,br.w-4,br.h-4,4);
  stroke(90,58,155,120); strokeWeight(2); noFill(); rect(br.x+101,br.y+28,br.w-202,br.h-56,4);

  // Boss door
  if(!bossOk){
    fill(36,16,58); noStroke(); rect(BOSS_DOOR_X, BOSS_BOT_Y-56, DOOR_W, 56);
    stroke(175,135,22); strokeWeight(4); noFill(); rect(BOSS_DOOR_X, BOSS_BOT_Y-56, DOOR_W, 56, 4);
    fill(200,160,20); noStroke(); textAlign(CENTER,CENTER); textSize(18); textStyle(BOLD);
    text('🔒 '+ingots+'/3', BOSS_DOOR_CX, BOSS_BOT_Y-28); textStyle(NORMAL);
  } else {
    stroke(80,255,100); strokeWeight(6); noFill();
    arc(BOSS_DOOR_CX, BOSS_BOT_Y-4, DOOR_W, 88, PI, 0);
  }

  // Room label
  fill(0,0,0,90); noStroke(); rect(br.x+br.w/2-684,br.y+20,1368,48,8);
  stroke(130,95,210); strokeWeight(3); noFill(); rect(br.x+br.w/2-684,br.y+20,1368,48,8);
  fill(255,215,80); noStroke(); textAlign(CENTER,CENTER); textSize(22); textStyle(BOLD);
  text('✦ BUREAU DU PATRON ✦', br.x+br.w/2, br.y+44); textStyle(NORMAL);

  // Patron figure (original pixel coords inside scale(2,2))
  let bx = BOSS_POS.x, by = BOSS_POS.y;
  push(); translate(bx, by); scale(2, 2);
  // Throne
  fill(46,26,80); noStroke(); rect(-30,10,60,80,5);
  fill(62,40,102); rect(-24,10,48,64,4);
  fill(80,52,128); rect(-26,6,52,9,3);
  // Body
  fill(14,9,22); noStroke();
  beginShape();vertex(-22,22);vertex(-10,32);vertex(0,30);vertex(10,32);vertex(22,22);vertex(25,90);vertex(-25,90);endShape(CLOSE);
  fill(225,218,255); noStroke(); rect(-5,22,10,26,2);
  fill(155,28,28); rect(-2,24,4,20,1);
  fill(18,12,30); noStroke(); ellipse(0,38,50,65);
  fill(28,20,48); triangle(-20,20,-8,30,-8,5); triangle(20,20,8,30,8,5);
  fill(18,12,30); noStroke(); ellipse(-17,44,13,38); ellipse(17,44,13,38);
  fill(188,148,102); noStroke(); ellipse(-17,67,13,11); ellipse(17,67,13,11);
  // Head
  fill(192,152,102); noStroke(); ellipse(0,12,40,43);
  fill(12,8,20); ellipse(-8,10,9,10); ellipse(8,10,9,10);
  fill(48,195,215); ellipse(-7,9,5,5); ellipse(7,9,5,5);
  fill(220,220,255,170); ellipse(-6,8,2,2); ellipse(6,8,2,2);
  stroke(108,72,52); strokeWeight(1.5); noFill(); line(-8,18,8,18);
  fill(155,155,175); noStroke(); arc(0,3,38,28,PI,0);
  fill(138,105,62); noStroke(); rect(13,16,18,4,2);
  fill(188,65,14,175); ellipse(31,18,6,6);
  // Shadow
  fill(0,0,0,38); noStroke(); ellipse(4,102,66,14);
  // Desk
  fill(50,30,14); noStroke(); rect(-210,95,420,32,4);
  fill(68,46,20); rect(-205,91,410,9,2);
  // Ingots on desk
  for(let i=0;i<3;i++){
    let ix=-140+i*45, iy=99;
    fill(i<ingots?color(215,178,25):color(55,45,30)); noStroke(); rect(ix-18,iy-5,36,14,3);
    if(i<ingots){ fill(240,205,50); stroke(200,165,20); strokeWeight(0.5); rect(ix-16,iy-3,32,10,2); }
  }
  // Crystal
  {
    let ct = frameCount * .03;
    push(); translate(160, 99);
    for(let i=3;i>0;i--){noStroke();fill(183,68,255,8+i*4);let sz=6+i*5+sin(ct)*2;ellipse(0,0,sz,sz);}
    fill(183,68,255); noStroke(); let cs=7+sin(ct*2)*1.2;
    beginShape();vertex(0,-cs*1.2);vertex(cs*.6,0);vertex(0,cs*.8);vertex(-cs*.6,0);endShape(CLOSE);
    fill(226,166,255);
    beginShape();vertex(0,-cs*.6);vertex(cs*.22,-cs*.04);vertex(0,cs*.24);vertex(-cs*.22,-cs*.04);endShape(CLOSE);
    pop();
  }
  pop();

  // Interaction prompts
  if(nearBoss()&&!dlg.active){
    fill(255,255,175); noStroke(); textAlign(CENTER); textSize(24); textStyle(BOLD);
    text('[E] Parler au patron', bx, by+244); textStyle(NORMAL);
  }
  if(nearBossDoor()&&!bossOk&&!dlg.active){
    fill(255,255,175); noStroke(); textAlign(CENTER); textSize(24); textStyle(BOLD);
    text('[E] Interphone', BOSS_DOOR_CX, BOSS_BOT_Y+48); textStyle(NORMAL);
  }
}

function _intDrawExit(){
  // Wall lingot display
  for(let i=0;i<3;i++){
    let ix=1872+i*2160, iy=930;
    fill(38,26,52); noStroke(); rect(ix-173,iy-14,346,36,6);
    fill(i<ingots?color(215,178,25):color(52,42,62)); noStroke(); rect(ix-94,iy-22,187,28,6);
    if(i<ingots){
      fill(240,205,50); stroke(200,165,20); strokeWeight(2); rect(ix-79,iy-18,158,20,4);
      fill(255,230,80); noStroke(); rect(ix-50,iy-12,101,10,2);
    }
    fill(200,175,80,145); noStroke(); textAlign(CENTER,CENTER); textSize(16);
    text(i<ingots?'🥇':'—', ix, iy-8);
  }

  // Exit door
  let ex = EXIT_DOOR;
  noStroke(); fill(0,0,0,68); rect(ex.x+43,ex.y+10,ex.w,ex.h,10);
  fill(25,14,40); stroke(100,80,140); strokeWeight(3); rect(ex.x,ex.y,ex.w,ex.h,10);
  fill(160,130,200,175); noStroke(); textAlign(CENTER,CENTER); textSize(20);
  text('◀ SORTIE', ex.x+ex.w/2, ex.y+ex.h/2);
  if(nearExit()&&!dlg.active){
    fill(255,255,175); noStroke(); textAlign(CENTER); textSize(24); textStyle(BOLD);
    text('[E] Sortir', ex.x+ex.w/2, ex.y-28); textStyle(NORMAL);
  }
}

// ── HUD intérieur ─────────────────────────────────────────────
function drawIntHUD(){
  push();
  fill(0,0,0,168); noStroke(); rect(8,8,1440,160,10);
  fill(255,215,0); textSize(24); textAlign(LEFT); noStroke(); text('CASINO GALACTIQUE',115,52);
  fill(215,178,25); textSize(24); text('Lingots : ',115,88);
  for(let i=0;i<3;i++){
    fill(i<ingots?color(255,200,30):color(60,50,40)); noStroke(); ellipse(634+i*144,80,100,28);
    if(i<ingots){ fill(240,215,50); textSize(20); textAlign(CENTER,CENTER); text('$',634+i*144,80); }
  }
  let list=[['blackjack','♠'],['roulette','◎'],['slots','🎰']];
  for(let i=0;i<3;i++){
    fill(done[list[i][0]]?color(72,255,72):color(100,100,100));
    textSize(26); textAlign(LEFT); text((done[list[i][0]]?'✓':' ')+list[i][1], 115+i*446, 124);
  }
  fill(132,132,175,192); textAlign(CENTER); textSize(22);
  text('ZQSD : marcher  |  E : interagir  |  Sortir par le bas', W/2, H-14);
  pop();
}

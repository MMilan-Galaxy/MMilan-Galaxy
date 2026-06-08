// ═══════════════════════════════════════
//  MAIN — setup, draw, input, transitions
// ═══════════════════════════════════════

let _cachedIngots = -1; // interior solids rebuild only when ingots changes

function playBushSound() {
  const snd = new Audio('assets/bushsound.mp3');
  snd.volume = 0.7;
  snd.play().catch(() => {});
  setTimeout(() => { snd.pause(); snd.currentTime = 0; }, 2000);
}

let _bgMusic = null;
function _startBgMusic() {
  if (_bgMusic) return;
  _bgMusic = new Audio('assets/casino-music-no-copyright--casino-royalty-free-music--copyright-free-casino-music.mp3');
  _bgMusic.loop = true;
  _bgMusic.volume = 0.2;
  _bgMusic.play().catch(() => { _bgMusic = null; });
}

function updateCam(worldW, worldH, lerpF=0.18){
  cam.x += (player.x - W/2 - cam.x) * lerpF;
  cam.y += (player.y - H/2 - cam.y) * lerpF;
  cam.x = constrain(Math.round(cam.x), 0, worldW - W);
  cam.y = constrain(Math.round(cam.y), 0, worldH - H);
}

function enterCasino(){
  outX=player.x; outY=player.y;
  player.x=INT_W/2; player.y=INT_H-300;
  cam.x=player.x-W/2; cam.y=player.y-H/2;
  gstate='CASINO_INTERIOR';
  _cachedIngots=-1; // force solids rebuild on entry
  fadeA=255;
}

function exitCasino(){
  player.x=outX; player.y=outY+120;
  cam.x=player.x-W/2; cam.y=player.y-H/2;
  gstate='EXPLORE';
  rebuildSolids();
  fadeA=255;
}

function rebuildSolids(){
  allSolids=[];
  if(casino) allSolids.push(casino.solid());
  for(let t of trees)     allSolids.push(t.solid());
  for(let p of lavaPools) allSolids.push(p.solid());
  for(let r of rocks)     allSolids.push(r.solid());
  for(let p of pillars)   allSolids.push(p.solid());
  for(let d of dice)      allSolids.push(d.solid());
  for(let b of bushes)    allSolids.push(b.solid());
}

// ── Responsive scaling ────────────────────────────────────────
function scaleCanvas(){
  let s=min(windowWidth/W, windowHeight/H);
  let cnv=document.querySelector('canvas');
  cnv.style.transform=`scale(${s})`;
  cnv.style.left=((windowWidth-W*s)/2)+'px';
  cnv.style.top=((windowHeight-H*s)/2)+'px';
}
function windowResized(){ scaleCanvas(); }

// ── Setup ─────────────────────────────────────────────────────
function setup(){
  pixelDensity(1);
  createCanvas(W,H); textFont('monospace'); noiseDetail(4,.5);
  scaleCanvas();
  preloadGestureModel();

  casino = new BigCasino(4032,820,3456,440);
  guard  = new Guard(casino.doorX, casino.doorY+110);

  let bushPos = [[7056,1120],[2448,1280],[8496,1360],[4320,1720],[7560,1680],[3096,960],[8280,960]];
  let itemIdx = floor(random(bushPos.length));
  bushes = bushPos.map(([bx,by],i) => new Bush(bx,by,i===itemIdx));

  let treePos = [[2376,1000],[3600,1160],[2736,1360],[4680,1600],[6480,1600],[7920,1400],[8640,1120],[8496,840],[4680,960],[3024,840],[3024,1640],[7560,1640],[5256,1840],[6264,1840],[4176,1840],[1800,1240],[9000,1240],[5760,1640]];
  for(let [tx,ty] of treePos) trees.push(new AlienTree(tx,ty,random(.7,1.25)));

  let lavaPos = [[2448,1120,252,40],[8064,1080,288,46],[5472,1300,216,34],[3960,1480,259,42],[7488,1480,230,36],[3384,1800,259,42],[6624,1800,238,38]];
  for(let [lx,ly,lrx,lry] of lavaPos) lavaPools.push(new LavaPool(lx,ly,lrx,lry));

  let rockPos = [[2160,960],[8640,940],[3888,1240],[7488,1160],[3096,1520],[7920,1520],[5184,1720]];
  for(let [rx,ry] of rockPos) rocks.push(new Rock(rx,ry,random(.65,1.15)));

  let pillarCols = [color(255,55,55),color(55,255,195),color(255,195,55),color(175,55,255),color(55,175,255)];
  let pillarPos  = [[4608,1180],[5256,1120],[6264,1120],[6912,1180],[4608,1520],[5472,1620],[6048,1620],[6912,1520],[3600,1360],[7920,1360]];
  for(let i=0;i<pillarPos.length;i++){
    let [ppx,ppy] = pillarPos[i];
    pillars.push(new NeonPillar(ppx,ppy,pillarCols[i%5]));
  }

  dice.push(new GiantDice(2592,1280,1.05));
  dice.push(new GiantDice(8640,1280,1.0));
  dice.push(new GiantDice(5688,1720,.95));

  for(let i=0;i<280;i++){
    let a=random(TWO_PI), r=random(PR*1.05, max(WORLD_W,WORLD_H)*.9);
    stars.push({x:PCX+cos(a)*r, y:PCY+sin(a)*r, sz:random(2,7), t:random(TWO_PI)});
  }

  player = new Player(PCX, PCY+400);
  rebuildSolids();
  buildTerrain();
  cam.x=player.x-W/2; cam.y=player.y-H/2;
  fadeA=255;
}

// ── Draw ──────────────────────────────────────────────────────
function draw(){
  if(gstate==='BLACKJACK'||gstate==='ROULETTE'||gstate==='SLOTS'){
    currentGame.update && currentGame.update();
    push(); translate(W/2,H/2-80); scale(GAME_SCALE); translate(-W/2,-H/2);
    currentGame.draw2d();
    pop();
    if(currentGame.isWon() && !done[gstate.toLowerCase()]){
      done[gstate.toLowerCase()]=true; ingots++;
    }
    // Auto-retour au casino après victoire (le jeu gère son propre compte à rebours)
    if(currentGame.shouldAutoExit()){
      gestureStop();
      currentGame.destroy && currentGame.destroy();
      gstate='CASINO_INTERIOR'; currentGame=null;
      _cachedIngots=-1; fadeA=255;
    }
    drawDlg();
    if(fadeA>0){noStroke();fill(0,0,0,fadeA);rect(0,0,W,H);fadeA=max(0,fadeA-14);}
    return;
  }

  if(gstate==='WIN'){
    drawWinScreen();
    if(fadeA>0){noStroke();fill(0,0,0,fadeA);rect(0,0,W,H);fadeA=max(0,fadeA-10);}
    return;
  }

  if(gstate==='CASINO_INTERIOR'){
    if(_cachedIngots!==ingots){allSolids=getInteriorSolids();_cachedIngots=ingots;}
    drawInterior();
    drawIntHUD();
    drawDlg();
    if(fadeA>0){noStroke();fill(0,0,0,fadeA);rect(0,0,W,H);fadeA=max(0,fadeA-12);}
    return;
  }

  // EXPLORE
  clear();
  push(); translate(-cam.x,-cam.y);
  noStroke();
  for(let s of stars){
    s.t+=0.014;
    if(s.x>cam.x-10&&s.x<cam.x+W+10&&s.y>cam.y-10&&s.y<cam.y+H+10)
      {fill(255,255,255,map(sin(s.t),-1,1,72,215));ellipse(s.x,s.y,s.sz);}
  }
  image(terrainBuf, cam.x, cam.y, W, H, cam.x, cam.y, W, H);
  // Cull entities outside viewport (300px margin for large objects)
  const vx1=cam.x-300, vx2=cam.x+W+300, vy1=cam.y-300, vy2=cam.y+H+300;
  const _iv=(e)=>e.x>vx1&&e.x<vx2&&e.y>vy1&&e.y<vy2;
  for(let p of lavaPools) if(_iv(p)) p.draw();
  for(let r of rocks)     if(_iv(r)) r.draw();
  for(let b of bushes)    if(_iv(b)) b.draw();
  casino.draw();
  guard.draw();
  for(let p of pillars)   if(_iv(p)) p.draw();
  for(let d of dice)      if(_iv(d)) d.draw();
  for(let t of trees)     if(_iv(t)) t.draw();
  player.update(); player.draw();
  pop();
  updateCam(WORLD_W, WORLD_H, 1.0); // caméra collée au joueur — élimine le lag en mode exploration
  drawHUD();
  drawDlg();
  if(fadeA>0){noStroke();fill(0,0,0,fadeA);rect(0,0,W,H);fadeA=max(0,fadeA-10);}
}

// ── Input ─────────────────────────────────────────────────────
function keyPressed(){
  _startBgMusic();
  if(key==='²'){let fs=fullscreen();fullscreen(!fs);return false;}

  if(dlg.active){if(key==='e'||key==='E'||keyCode===ENTER)advanceDlg();return false;}

  if(gstate==='WIN'){
    if(key==='r'||key==='R'){
      done={blackjack:false,roulette:false,slots:false}; ingots=0; hasCostume=false;
      let itemIdx2=floor(random(bushes.length));
      bushes.forEach((b,i)=>{b.searched=false;b.hasItem=(i===itemIdx2);});
      gstate='EXPLORE'; player.x=PCX; player.y=PCY+400;
      cam.x=player.x-W/2; cam.y=player.y-H/2;
      rebuildSolids(); fadeA=255;
    }
    return false;
  }

  if(gstate==='BLACKJACK'||gstate==='ROULETTE'||gstate==='SLOTS'){
    if(keyCode===ESCAPE){
      gestureStop();
      currentGame && currentGame.destroy && currentGame.destroy();
      gstate='CASINO_INTERIOR'; currentGame=null;
      _cachedIngots=-1;
      fadeA=255;
    } else {
      currentGame && currentGame.handleKey(key);
    }
    return false;
  }

  if(gstate==='CASINO_INTERIOR'){
    if(key==='e'||key==='E'){
      let t=nearIntTable();
      if(t){
        prevState='CASINO_INTERIOR';
        gstate=t.type.toUpperCase();
        if(t.type==='blackjack'){currentGame=new Blackjack();initGesture();}
        else if(t.type==='roulette'){currentGame=new Roulette();initGesture();}
        else currentGame=new Slots();
        fadeA=255; return false;
      }
      if(nearBoss()){
        startDlg([
          'Teufeurs : Alors... trois lingots.',
          'Teufeurs : (Il les récupère un à un, les examine longuement)',
          'Teufeurs : Vous avez tenu parole. Un accord est un accord.',
          'Teufeurs : Prenez ce cristal... et quittez ma planète.',
          '★ Cristal obtenu ! ★'
        ],()=>{gstate='WIN';fadeA=255;if(window.SpaceCrystals)SpaceCrystals.complete('gambling');});
        return false;
      }
      if(nearBossDoor()&&ingots<3){
        startDlg([
          `Interphone : "Hmm... ${ingots}/3 lingots seulement."`,
          'Interphone : "Prouvez votre valeur dans nos salles."',
          'Interphone : "Revenez avec les 3 lingots."'
        ]);
        return false;
      }
      if(nearExit()){exitCasino();return false;}
    }
    return false;
  }

  // EXPLORE
  if(key==='e'||key==='E'){
    for(let b of bushes){
      if(b.near()){
        playBushSound();
        b.searched=true; rebuildSolids();
        if(b.hasItem&&!hasCostume){
          hasCostume=true;
          startDlg(['Vous fouilles le buisson...','Un costume froissé est caché sous les feuilles !','Il sent le cigare et le casino... mais il fera l\'affaire.','★ Costume de soirée obtenu ! ★']);
        } else {
          startDlg(['Vous fouilles le buisson...','Rien ici. Juste des feuilles et de la poussière.']);
        }
        return false;
      }
    }
    if(guard.near()||casino.nearDoor()){guard.interact();return false;}
  }
  return false;
}

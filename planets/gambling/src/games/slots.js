// ═══════════════════════════════════════
//  SLOTS — Machine à roue avec levier
// ═══════════════════════════════════════

function playSlotTick() {
  if (!audioCtx) return;
  try {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.018, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.003));
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.18;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
  } catch(e) {}
}

function playSlotsWin() {
  if (!audioCtx) return;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime + i * 0.13;
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    } catch(e) {}
  });
}
class Slots{
  constructor(){
    this.reset();
    this._initMic();
    this.tutorial=!tutorialSeen.slots;
  }

  _initMic(){
    this.mic = null;
    this.micActive = false;
    this.micVol = 0;
    this.volThreshold = 0.15;
    if(typeof userStartAudio !== 'function' || typeof p5.AudioIn === 'undefined') return;
    userStartAudio().then(()=>{
      try {
        this.mic = new p5.AudioIn();
        this.mic.start(()=>{ this.micActive = true; });
      } catch(e){}
    }).catch(()=>{});
  }

  reset(){
    this.symbols = ["⭐","🌙","🌻","🎨","☁️"];
    this.reels   = [0,0,0];
    this.spinTimers = [0,0,0];
    this.isSpinning = false;
    this.leverY     = 0;
    this.isDragging = false;
    this.winMsg     = "";
    this.won        = false;
    this.state      = 'IDLE';
    this.luckFactor = 0.2;
    this.exitTimer  = 0;
    this.tickFrame  = 0;
  }

  _leverBase(){ return {x: W/2+1620, y: H/2}; }

  _dismissTutorial(){this.tutorial=false;tutorialSeen.slots=true;}

  onMousePressed(mx,my){
    if(this.tutorial){this._dismissTutorial();return;}
    if(this.state==='RESULT'&&this.won) return;
    let b=this._leverBase();
    let ballY=b.y-190+this.leverY;
    if(dist(mx,my,b.x,ballY)<60) this.isDragging=true;
  }

  onMouseDragged(mx,my){
    if(!this.isDragging) return;
    let b=this._leverBase();
    this.leverY=constrain(my-(b.y-190),0,340);
    if(this.leverY>300&&this.state==='IDLE'){
      this.startSpin();
      this.isDragging=false;
    }
  }

  onMouseReleased(){ this.isDragging=false; }

  startSpin(){
    if(this.isSpinning) return;
    initAudio();
    this.isSpinning=true;
    this.winMsg='';
    this.spinTimers=[40,70,100];
    this.tickFrame=0;
    this.state='SPIN';
  }

  update(){
    if(!this.isDragging) this.leverY=lerp(this.leverY,0,0.25);

    if(this.micActive && this.mic){
      this.micVol = this.mic.getLevel();
      if(this.micVol > this.volThreshold && this.state==='IDLE') this.startSpin();
    }

    if(this.state==='RESULT' && this.won) this.exitTimer++;

    if(!this.isSpinning) return;
    this.tickFrame++;
    if(this.tickFrame % 3 === 0) playSlotTick();
    let still=false;
    for(let i=0;i<3;i++){
      if(this.spinTimers[i]>0){
        this.spinTimers[i]--;
        still=true;
        if(i===0){
          this.reels[i]=floor(random(this.symbols.length));
        } else {
          this.reels[i]= random(1)<this.luckFactor
            ? this.reels[0]
            : floor(random(this.symbols.length));
        }
      }
    }
    if(!still){
      this.isSpinning=false;
      if(random(1)<0.30) this.reels=[this.reels[0],this.reels[0],this.reels[0]];
      this._resolve();
    }
  }

  _resolve(){
    let r=this.reels;
    if(r[0]===r[1]&&r[1]===r[2]){
      playSlotsWin();
      this.winMsg='💎 JACKPOT ! 💎';
      this.won=true;
      this.state='RESULT';
    } else {
      this.winMsg='RETENTE TA CHANCE !';
      this.won=false;
      this.state='IDLE';
    }
  }

  handleKey(k){
    if(this.tutorial){this._dismissTutorial();return;}
    if(k===' '&&this.state==='IDLE') this.startSpin();
  }

  isWon(){ return this.won; }
  shouldAutoExit(){ return this.state==='RESULT' && this.won && this.exitTimer > 180; }

  draw2d(){
    background('#2A0445');
    if(this.tutorial){
      drawTutorialCard('🎰 MACHINE À SOUS 🎰',[
        {label:'🎯 But du jeu',lines:['Aligner 3 symboles identiques sur les rouleaux = JACKPOT !','Les symboles : ⭐ 🌙 🌻 🎨 ☁️']},
        {label:'🎮 Comment jouer',lines:['Tire le levier vers le bas avec la souris','[Espace] pour lancer les rouleaux instantanément','🎤 Crie dans ton micro pour lancer !']}
      ],color(200,0,255));
      return;
    }
    noStroke();
    for(let r=H;r>0;r-=110){
      fill(80,10,130,map(r,0,H,42,0));
      ellipse(W/2,H/2,r*2.2);
    }

    this._drawMachine();
    this._drawLever();

    if(this.micActive){
      // Remonté de ~270px pour rester visible (était H-76, soit y≈1124 hors écran)
      let barW=1440, barH=22, bx=W/2-barW/2, by=H-270;
      noStroke(); fill(255,255,255,25); rect(bx,by,barW,barH,10);
      let vol=constrain(this.micVol||0,0,this.volThreshold*1.5);
      let fillW=map(vol,0,this.volThreshold,0,barW);
      fill(vol>this.volThreshold?color(0,255,100):color(255,0,200));
      rect(bx,by,constrain(fillW,0,barW),barH,10);
      stroke(255,255,0,160);strokeWeight(3);
      let threshX=bx+map(this.volThreshold,0,this.volThreshold*1.5,0,barW);
      line(threshX,by-6,threshX,by+barH+6);
      noStroke();
      fill(200,200,255,200);textAlign(CENTER);textSize(28);
      text('🎤 Crie pour lancer !',W/2,by-18);
    }

    fill(132,132,175,192);noStroke();textAlign(CENTER);textSize(22);
    if(this.state==='IDLE'){
      text('Tire le levier  |  [Espace]  |  [Échap] Retour',W/2,H-200);
    } else {
      text('[Échap] Retour au casino',W/2,H-200);
    }
  }

  _drawMachine(){
    push();
    translate(W/2, H/2);

    noStroke();
    for(let i=6;i>0;i--){
      fill(120,0,180,8);
      rect(-1512,-220,3024,440,110-i*8);
    }

    stroke(255,215,0);strokeWeight(10);
    fill(20,5,40);
    rect(-1512,-220,3024,440,70);

    fill(40,10,70);noStroke();rect(-1512,-220,3024,80,70,70,0,0);
    fill(255,215,0);textAlign(CENTER,CENTER);textSize(36);textStyle(BOLD);
    text('🎰 MACHINE À SOUS 🎰',0,-180);textStyle(NORMAL);

    for(let i=0;i<3;i++){
      fill(255);noStroke();
      rect(-1152+i*828,-130,684,280,30);
      fill(0,22);
      rect(-1152+i*828,-130,684,44,30,30,0,0);
      rect(-1152+i*828,106, 684,44,0,0,30,30);
      noStroke();textAlign(CENTER,CENTER);textSize(112);
      if(this.spinTimers[i]>0){
        fill(0,140);
      } else {
        fill(0);
      }
      text(this.symbols[this.reels[i]], -806+i*828, 20);
    }

    stroke(255,215,0,110);strokeWeight(4);
    line(-1152,-20,2196,-20);

    if(this.winMsg){
      drawingContext.shadowBlur=44;
      drawingContext.shadowColor=this.won?'gold':'white';
      fill(this.won?color(255,215,0):color(255));
      textAlign(CENTER,CENTER);textSize(this.won?56:40);
      text(this.winMsg,0,310);
      drawingContext.shadowBlur=0;
      if(this.won){
        fill(255,210,30);noStroke();textSize(30);
        text("🥇 +1 Lingot d'or obtenu !",0,384);
        let secs=max(0,ceil((181-this.exitTimer)/60));
        fill(160,160,210);noStroke();textSize(26);
        text('Retour au casino dans '+secs+'s…',0,440);
      }
    }

    pop();
  }

  _drawLever(){
    let b=this._leverBase();
    let ballY=b.y-190+this.leverY;

    stroke(60);strokeWeight(12);
    line(b.x,b.y-160,b.x,b.y);

    stroke(40);strokeWeight(24);
    line(b.x-101,b.y,b.x+101,b.y);
    noStroke();fill(80);ellipse(b.x,b.y,36,36);

    stroke(160);strokeWeight(18);
    line(b.x,b.y,b.x,ballY);

    noStroke();
    for(let i=4;i>0;i--){ fill(255,0,150,18);ellipse(b.x,ballY,(90+i*12),(90+i*12)); }
    fill(255,0,150);ellipse(b.x,ballY,80,80);
    fill(255,200);ellipse(b.x-14,ballY-20,20,20);

    if(this.state==='IDLE'){
      fill(255,180,255,180);noStroke();textAlign(CENTER);textSize(24);
      text('↓ Tire !', b.x, b.y+60);
    }
  }
}

// Les handlers mousePressed/Dragged/Released sont dans roulette.js

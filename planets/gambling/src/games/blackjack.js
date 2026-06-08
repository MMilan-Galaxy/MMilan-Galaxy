// ═══════════════════════════════════════
//  BLACKJACK
// ═══════════════════════════════════════
class Blackjack{
  constructor(){this.reset();this.tutorial=!tutorialSeen.blackjack;}

  reset(){
    this.deck=shuffle([...Array(52)].map((_,i)=>({
      v:['A','2','3','4','5','6','7','8','9','10','J','Q','K'][i%13],
      s:['♠','♥','♦','♣'][floor(i/13)]
    })));
    this.ph=[];this.dh=[];this.state='PLAY';this.revealed=false;this.msg='';
    this.resetTimer=0; this.exitTimer=0;
    this.ph.push(this.dc());this.dh.push(this.dc());
    this.ph.push(this.dc());this.dh.push(this.dc());
  }

  dc(){return this.deck.pop();}

  cv(c){
    if(['J','Q','K'].includes(c.v))return 10;
    if(c.v==='A')return 11;
    return parseInt(c.v);
  }

  val(h){
    let v=h.reduce((s,c)=>s+this.cv(c),0),a=h.filter(c=>c.v==='A').length;
    while(v>21&&a>0){v-=10;a--;}
    return v;
  }

  hit(){
    if(this.state!=='PLAY')return;
    this.ph.push(this.dc());
    if(this.val(this.ph)>21){this.revealed=true;this.state='LOSE';this.msg='Bust ! Perdu.';this.resetTimer=90;}
  }

  stand(){
    if(this.state!=='PLAY')return;
    this.revealed=true;
    while(this.val(this.dh)<17)this.dh.push(this.dc());
    let p=this.val(this.ph),d=this.val(this.dh);
    if(d>21||p>d){this.state='WIN';this.msg='Vous gagnez !';}
    else if(p===d){this.state='PUSH';this.msg='Égalité.';this.resetTimer=90;}
    else{this.state='LOSE';this.msg='Le croupier gagne.';this.resetTimer=90;}
  }

  update(){
    if(this.resetTimer>0){
      this.resetTimer--;
      if(this.resetTimer===0)this.reset();
    }
    if(this.state==='WIN') this.exitTimer++;
  }

  _dismissTutorial(){this.tutorial=false;tutorialSeen.blackjack=true;}

  handleKey(k){
    if(this.tutorial){this._dismissTutorial();return;}
    if(k==='h'||k==='H')this.hit();
    if(k==='s'||k==='S')this.stand();
  }

  // Clic sur les boutons Tirer / Rester (coordonnées jeu, avant GAME_SCALE)
  onMousePressed(mx,my){
    if(this.tutorial){this._dismissTutorial();return;}
    if(this.state!=='PLAY') return;
    const bx=W/2, by=900, bh=36;
    if(my>=by-bh && my<=by+bh){
      if(mx>=bx-1086 && mx<=bx-614) this.hit();   // bouton Tirer (centre W/2-850)
      if(mx>=bx+614  && mx<=bx+1086) this.stand(); // bouton Rester (centre W/2+850)
    }
  }

  isWon(){return this.state==='WIN';}
  shouldAutoExit(){return this.state==='WIN' && this.exitTimer > 180;}

  draw2d(){
    background(8,2,16);drawCasinoRoom(color(28,48,202));
    if(this.tutorial){
      drawTutorialCard('♠ BLACKJACK ♠',[
        {label:'🎯 But du jeu',lines:['Atteindre 21 (ou s\'en approcher) sans dépasser','Avoir une valeur plus haute que le croupier']},
        {label:'🃏 Valeurs des cartes',lines:['As = 1 ou 11 (automatique, la valeur la plus favorable)','Figures (J, Q, K) = 10  |  Autres = leur valeur nominale','Le croupier tire jusqu\'à 17 puis s\'arrête']},
        {label:'🎮 Contrôles',lines:['[H] Tirer une carte  |  [S] Rester','Ou cliquez sur les boutons à l\'écran']}
      ],color(80,80,255));
      return;
    }
    drawPanel();
    push();
    fill(255,215,0);noStroke();textAlign(CENTER);textSize(60);text('♠ BLACKJACK ♠',W/2,236);
    fill(172,172,255);textSize(30);text('— Croupier —',W/2,316);
    drawCards(this.dh,W/2,416,!this.revealed);
    fill(192,192,192);textSize(26);text('Valeur : '+(this.revealed?this.val(this.dh):'?'),W/2,536);
    fill(172,255,172);textSize(30);text('— Vous —',W/2,610);
    drawCards(this.ph,W/2,700,false);
    fill(192,192,192);textSize(26);text('Valeur : '+this.val(this.ph),W/2,820);
    if(this.state==='PLAY'){
      drawBtn(W/2-850,900,472,72,'[H] Tirer',color(42,122,255));
      drawBtn(W/2+850,900,472,72,'[S] Rester',color(122,42,255));
    } else {
      let c=this.state==='WIN'?color(72,255,72):this.state==='LOSE'?color(255,72,72):color(255,255,72);
      fill(c);noStroke();textAlign(CENTER);textSize(44);text(this.msg,W/2,904);
      if(this.isWon()){
        fill(255,210,30);textSize(30);text('🥇 +1 Lingot d\'or obtenu !',W/2,952);
        let secs=max(0,ceil((181-this.exitTimer)/60));
        fill(160,160,210);textSize(26);text('Retour au casino dans '+secs+'s…',W/2,998);
      }
      if(this.resetTimer>0){
        fill(160,160,160);textSize(22);text('Nouvelle partie dans '+ceil(this.resetTimer/60)+'s…  — ou geste pour rejouer',W/2,992);
      }
    }
    fill(132,132,152);textSize(22);textAlign(CENTER);text('[Échap] Retour au casino',W/2,1036);
    pop();
    drawGestureUI();
  }
}

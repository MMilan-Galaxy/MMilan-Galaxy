class Test2 extends Planet {
  constructor(interactions, quests, crystals) {
    super("Planète Test 2", "#e67e22", interactions, quests);
    this.readyToLaunch = false;

    this.state = {
      planetName:   "Planète Test 2",
      persoX:       width*0.12, persoY: height*0.55,
      tresorX:      width*0.75, tresorY: height*0.52,
      vaisseauX:    width*0.88, vaisseauY: height*0.27,
      tresorOuvert: false, readyToLaunch: false,
    };

    this.craters = Array.from({length:14}, () => ({x:random(width),y:random(height*0.5,height),r:random(20,70),a:random(30,80)}));
    this.stars   = Array.from({length:100}, () => ({x:random(width),y:random(height*0.5),r:random(0.5,2)}));
    this.angle = 0;

    addTest2QueteExplore(quests);
    addTest2QueteTresor(quests);
    addTest2QueteRetour(quests);

    this.tickMouvement = setupTest2Mouvement(interactions, quests, this.state);
    setupTest2Tresor(interactions, quests, this.state);
    setupTest2Retour(interactions, quests, this.state);
  }

  draw() {
    this.tickMouvement();
    this.angle += 0.04;
    this.readyToLaunch = this.state.readyToLaunch;

    background(18,8,5);
    noStroke();
    for(const s of this.stars){fill(255,220,180,160);ellipse(s.x,s.y,s.r);}
    fill(80,35,10); rect(0,height*0.5,width,height*0.5);
    stroke(160,80,20,150); strokeWeight(2); line(0,height*0.5,width,height*0.5); noStroke();
    for(const c of this.craters){fill(60,25,5,c.a);circle(c.x,c.y,c.r);}

    // Vaisseau retour
    const {vaisseauX:vx,vaisseauY:vy} = this.state, hov=sin(this.angle*0.9)*6;
    fill(255,180,50,8); for(let r=80;r>0;r-=20) circle(vx,vy+hov,r);
    fill(200,180,140); triangle(vx,vy-40+hov, vx-28,vy+28+hov, vx+28,vy+28+hov);
    fill(255,160,40); circle(vx,vy-5+hov,18);
    fill(255,120,20,180+70*sin(this.angle*3)); triangle(vx-14,vy+28+hov, vx+14,vy+28+hov, vx,vy+52+hov);
    if(Math.hypot(this.state.persoX-vx,this.state.persoY-vy)<120) this._hint(vx,vy-58+hov,"[Clic] Retourner à T1");

    // Coffre
    const {tresorX:tx,tresorY:ty} = this.state;
    const dt = Math.hypot(this.state.persoX-tx,this.state.persoY-ty);
    if (!this.state.tresorOuvert) {
      const al = constrain(map(dt,0,220,220,0),0,240);
      if (al>10){
        fill(120,80,20,al); rect(tx-22,ty-16,44,30,4);
        fill(160,110,40,al); rect(tx-22,ty-24,44,12,4);
        fill(255,200,50,al); circle(tx,ty-18,10);
        if(dt<120) this._hint(tx,ty-40,"[F] Ouvrir le coffre");
      }
    } else {
      fill(120,80,20); rect(tx-22,ty-10,44,26,4);
      fill(160,110,40); rect(tx-22,ty-24,44,12,4,4,0,0);
      fill(255,220,80,20); for(let r=50;r>0;r-=10) circle(tx,ty-5,r+5*sin(this.angle*4));
    }

    // Joueur
    const {persoX:jx,persoY:jy} = this.state;
    fill(200,100,20,80); circle(jx,jy,58);
    fill(230,126,34); circle(jx,jy,42);
    fill(255,255,255,180); circle(jx-8,jy-8,12);

    noStroke(); fill(255,180,100,180); textAlign(CENTER,TOP); textSize(13); text(this.name,width/2,18);
  }

  _hint(x,y,label){
    noStroke();fill(0,0,0,160);rectMode(CENTER);rect(x,y,textWidth(label)+20,22,6);rectMode(CORNER);
    fill(255,240,200);textAlign(CENTER,CENTER);textSize(11);text(label,x,y);
  }
}

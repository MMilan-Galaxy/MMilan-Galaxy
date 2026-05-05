class Test1 extends Planet {
  constructor(interactions, quests, crystals) {
    super("Planète Test 1", "#2ecc71", interactions, quests);
    this.readyToLaunch = false;

    this.state = {
      planetName:    "Planète Test 1",
      persoX:        width * 0.5,   persoY:  height * 0.55,
      pnjX:          width * 0.22,  pnjY:    height * 0.47,
      objetX:        width * 0.72,  objetY:  height * 0.60,
      cristalX:      width * 0.80,  cristalY: height * 0.33,
      vaisseauX:     width * 0.14,  vaisseauY: height * 0.28,
      dialogueVisible: false, dialogueTimer: 0,
      objetRamasse:  false,
      cristalRamasse: crystals.hasCollected("Planète Test 1"),
      readyToLaunch: false,
    };

    this.stars = Array.from({length: 120}, () => ({
      x: random(width), y: random(height * 0.65), r: random(0.5, 2.5), bri: random(100,220)
    }));
    this.angle = 0;

    // ── Quêtes ──
    addTest1QuesteMouvement(quests);
    addTest1QuestePNJ(quests);
    addTest1QueteObjet(quests);
    addTest1QuesteCristal(quests);
    if (this.state.cristalRamasse) addTest1QueteVaisseau(quests);

    // ── Interactions ──
    this.tickMouvement = setupTest1Mouvement(interactions, quests, this.state);
    setupTest1PNJ(interactions, quests, this.state);
    setupTest1Objet(interactions, quests, this.state);
    setupTest1Cristal(interactions, quests, crystals, this.state);
    setupTest1Vaisseau(interactions, quests, this.state);
  }

  draw() {
    this.tickMouvement();
    this.angle += 0.04;
    if (this.state.dialogueTimer > 0) this.state.dialogueTimer--;
    else this.state.dialogueVisible = false;
    this.readyToLaunch = this.state.readyToLaunch;

    // Fond
    background(8, 10, 22);
    noStroke();
    for (const s of this.stars) { fill(255,255,255,s.bri); ellipse(s.x,s.y,s.r); }

    // Sol
    fill(15, 45, 25); rect(0, height*0.65, width, height*0.35);
    stroke(30,100,50,120); strokeWeight(2); line(0,height*0.65,width,height*0.65); noStroke();

    // Vaisseau (après cristal)
    if (this.state.cristalRamasse) {
      const {vaisseauX:vx, vaisseauY:vy} = this.state;
      const hov = sin(this.angle*0.8)*5;
      fill(100,200,255,15); for(let r=80;r>0;r-=20) circle(vx,vy+hov,r);
      fill(180,220,255); triangle(vx,vy-40+hov, vx-30,vy+30+hov, vx+30,vy+30+hov);
      fill(50,150,255); circle(vx,vy-5+hov,20);
      fill(255,180,50, 180+60*sin(this.angle*3)); triangle(vx-15,vy+30+hov, vx+15,vy+30+hov, vx,vy+55+hov);
      if (Math.hypot(this.state.persoX-vx,this.state.persoY-vy)<120) this._hint(vx,vy-62+hov,"[Clic] Embarquer");
    }

    // Cristal
    if (!this.state.cristalRamasse) {
      const {cristalX:cx,cristalY:cy} = this.state, p=2*sin(this.angle*2);
      fill(180,80,255,12); for(let r=60;r>0;r-=15) circle(cx,cy,r+p);
      fill(200,100,255); quad(cx,cy-18-p, cx+12,cy, cx,cy+18+p, cx-12,cy);
      fill(220,160,255,200); quad(cx,cy-10-p, cx+7,cy, cx,cy+10+p, cx-7,cy);
      if (Math.hypot(this.state.persoX-cx,this.state.persoY-cy)<120) this._hint(cx,cy-30,"[C] Cristal");
    }

    // Objet
    if (!this.state.objetRamasse) {
      const {objetX:ox,objetY:oy} = this.state;
      fill(255,220,50, 150+80*sin(this.angle*1.5)); circle(ox,oy,30);
      fill(255,220,50);
      push(); translate(ox,oy); rotate(this.angle*0.5);
      for(let i=0;i<5;i++){const a=(TWO_PI/5)*i-HALF_PI,b=a+TWO_PI/10;triangle(cos(a)*14,sin(a)*14,cos(b)*6,sin(b)*6,cos(b-TWO_PI/5)*6,sin(b-TWO_PI/5)*6);}
      pop();
      if (Math.hypot(this.state.persoX-ox,this.state.persoY-oy)<120) this._hint(ox,oy-28,"[F] Ramasser");
    }

    // PNJ Cosmo
    const {pnjX:px,pnjY:py} = this.state;
    fill(60,130,200); ellipse(px,py,44,50);
    fill(80,160,230); circle(px,py-34,36);
    fill(255); circle(px-7,py-36,10); circle(px+7,py-36,10);
    fill(20,20,80); circle(px-7+sin(this.angle*0.3),py-36,5); circle(px+7+sin(this.angle*0.3),py-36,5);
    stroke(80,160,230); strokeWeight(2); line(px,py-52,px+8,py-66); noStroke();
    fill(255,100,100); circle(px+8,py-66,7);
    fill(180,220,255); textAlign(CENTER,BOTTOM); textSize(11); text("Cosmo",px,py-58);
    if (Math.hypot(this.state.persoX-px,this.state.persoY-py)<120) this._hint(px,py-80,"[E] Parler");

    // Joueur
    const {persoX:jx,persoY:jy} = this.state;
    fill(30,200,100,80); circle(jx,jy,58);
    fill(46,204,113); circle(jx,jy,42);
    fill(255,255,255,200); circle(jx-8,jy-8,12);

    // Dialogue
    if (this.state.dialogueVisible) {
      fill(10,20,40,220); stroke(80,160,230,200); strokeWeight(1.5);
      rectMode(CENTER); rect(width/2,height*0.82,520,68,10); rectMode(CORNER); noStroke();
      fill(80,160,230); textAlign(LEFT,TOP); textSize(13); text("Cosmo :", width/2-240,height*0.82-24);
      fill(220,235,255); text("« Bienvenue ! Récupère le cristal violet\npuis embarque dans le vaisseau pour la planète 2 ! »",width/2-240,height*0.82-9);
    }

    // Titre
    noStroke(); fill(150,255,180,180); textAlign(CENTER,TOP); textSize(13); text(this.name,width/2,18);
  }

  _hint(x,y,label) {
    noStroke(); fill(0,0,0,160); rectMode(CENTER); rect(x,y,textWidth(label)+20,22,6); rectMode(CORNER);
    fill(255,255,200); textAlign(CENTER,CENTER); textSize(11); text(label,x,y);
  }
}

// ═══════════════════════════════════════
//  ENTITIES — Bush, Guard, BigCasino
// ═══════════════════════════════════════

class Bush{
  constructor(x,y,hasItem){
    this.x=x;this.y=y;this.hasItem=hasItem||false;
    this.searched=false;this.t=random(TWO_PI);
    this.sz=random(0.85,1.3);
    this.shade=floor(random(3));
  }

  near(){return!this.searched&&dist(player.x,player.y,this.x,this.y)<116;}

  solid(){
    if(this.searched)return{x:-9999,y:-9999,w:1,h:1};
    return{x:this.x-130*this.sz,y:this.y-30*this.sz,w:260*this.sz,h:60*this.sz};
  }

  draw(){
    this.t+=0.018;
    let s=this.sz;
    push();translate(this.x,this.y);scale(2,2);
    if(!this.searched){
      noStroke();fill(0,0,0,50);ellipse(4,14*s,46*s,16*s);
      let c1=this.shade===0?[12,70,18]:this.shade===1?[55,15,75]:[8,65,55];
      let c2=this.shade===0?[22,100,30]:this.shade===1?[80,25,110]:[15,95,80];
      for(let i=0;i<7;i++){
        let a=(i/7)*TWO_PI,r=16*s;
        fill(c1[0]+i*4,c1[1]+i*8,c1[2]+i*5);noStroke();
        ellipse(cos(a)*r,sin(a)*r*0.65,30*s,24*s);
      }
      fill(c2[0],c2[1],c2[2]);noStroke();ellipse(0,0,34*s,28*s);
      fill(c2[0]+10,c2[1]+20,c2[2]+10);ellipse(-s*4,-s*3,20*s,16*s);
      fill(180,160,20,map(sin(this.t),-1,1,30,80));
      noStroke();ellipse(s*5,-s*5,8*s,8*s);
    } else {
      fill(8,38,10,140);noStroke();ellipse(0,4,40*s,12*s);
      fill(12,55,15,100);ellipse(-8,2,20*s,8*s);ellipse(8,6,16*s,7*s);
    }
    pop();
    if(this.near()&&!dlg.active){
      fill(255,255,180);noStroke();textAlign(CENTER);textSize(22);
      text('[E] Fouiller le buisson',this.x,this.y-(52+30*s));
    }
  }
}

// ─────────────────────────────────────
class Guard{
  constructor(x,y){this.x=x;this.y=y;this.t=0;this.angry=false;}

  near(){return dist(player.x,player.y,this.x,this.y)<130;}

  interact(){
    if(hasCostume){
      this.angry=false;
      startDlg([
        "Dwayne Johnson : Hmm... (il vous inspecte de haut en bas)",
        "Dwayne Johnson : Costume correct. Vous pouvez entrer.",
        "Dwayne Johnson : Ne causez pas de problèmes à l'intérieur."
      ],()=>{enterCasino();});
    } else {
      this.angry=true;
      startDlg([
        "Dwayne Johnson : STOP. Où croyez-vous aller comme ça ?",
        "Dwayne Johnson : Tenue correcte EXIGÉE dans ce casino.",
        "Dwayne Johnson : Pas de costume, pas d'entrée. Circulez !",
        "Dwayne Johnson : (Il vous regarde avec mépris et pointe vers la sortie)"
      ]);
    }
  }

  draw(){
    this.t+=0.02;
    push();translate(this.x,this.y);scale(2,2);
    noStroke();fill(0,0,0,58);ellipse(3,16,32,12);
    fill(18,18,28);noStroke();ellipse(-5,10,10,14);ellipse(5,10,10,14);
    fill(12,12,20);ellipse(-5,16,12,7);ellipse(5,16,12,7);
    fill(this.angry&&sin(this.t*4)>0?color(80,10,10):color(22,22,34));
    stroke(50,50,72);strokeWeight(1.5);ellipse(0,1,26,30);
    fill(215,175,25);noStroke();ellipse(7,0,9,9);fill(30,20,50);textSize(6);textAlign(CENTER,CENTER);text('★',7,0);
    fill(22,22,34);noStroke();ellipse(-12,2,10,14);ellipse(12,2,10,14);
    fill(235,195,148);ellipse(-16,3,8,8);ellipse(16,3,8,8);
    fill(210,165,112);noStroke();ellipse(0,-10,20,20);
    fill(28,28,42);ellipse(0,-18,24,8);rect(-10,-24,20,8,2);
    fill(50,50,70);rect(-10,-22,20,3);
    fill(10,10,18,220);ellipse(-5,-10,8,5);ellipse(5,-10,8,5);stroke(60,60,80);strokeWeight(.8);noFill();line(-1,-10,1,-10);
    if(this.angry){
      fill(255,60,60);noStroke();textSize(18);textAlign(CENTER,CENTER);
      text('!',0,-32+sin(this.t*5)*2);
    }
    pop();
    if(this.near()&&!dlg.active){
      fill(255,255,180);noStroke();textAlign(CENTER);textSize(22);
      text('[E] Parler',this.x,this.y-68);
    }
  }
}

// ─────────────────────────────────────
class BigCasino{
  constructor(x,y,w,h){
    this.x=x;this.y=y;this.w=w;this.h=h;
    this.doorX=x+w/2;this.doorY=y+h;
    this.pulse=random(TWO_PI);
    this.sx=w/480;this.sy=h/220;
    this.lights=[];
    for(let i=0;i<22;i++)
      this.lights.push({lx:random(x+130,x+w-130),ly:random(y+36,y+h-36),sz:random(8,24),t:random(TWO_PI),c:color(random(200,255),random(80,220),random(20,120))});
  }

  solid(){return{x:this.x,y:this.y,w:this.w,h:this.h};}

  nearDoor(){return dist(player.x,player.y,this.doorX,this.doorY+30)<140;}

  draw(){
    this.pulse+=0.025;let isDone=ingots>=3;
    let sx=this.sx, sy=this.sy;
    push();
    noStroke();fill(0,0,0,85);rect(this.x+18*sx,this.y+22*sy,this.w,this.h,10*sy);
    fill(60,20,8,.3);noStroke();rect(this.x+11*sx,this.y+13*sy,this.w,this.h,8*sy);
    fill(isDone?color(40,140,40):color(120,25,25));stroke(255,255,255,45);strokeWeight(3);rect(this.x,this.y,this.w,this.h,8*sy);
    fill(isDone?color(55,175,55,188):color(145,30,30,188));noStroke();rect(this.x+12*sx,this.y+12*sy,this.w-24*sx,this.h-24*sy,5*sy);
    for(let i=0;i<4;i++){
      let cx=this.x+40*sx+i*(this.w-80*sx)/3;
      fill(200,170,100);noStroke();rect(cx-6*sx,this.y,12*sx,this.h,3*sy);
      fill(220,195,130);rect(cx-4*sx,this.y+2*sy,8*sx,this.h-4*sy,2*sy);
      fill(230,200,140);ellipse(cx,this.y+4*sy,18*sx,10*sy);ellipse(cx,this.y+this.h-4*sy,18*sx,10*sy);
    }
    for(let l of this.lights){l.t+=0.04;noStroke();fill(red(l.c),green(l.c),blue(l.c),map(sin(l.t),-1,1,80,255));ellipse(l.lx,l.ly,l.sz,l.sz);}
    let ga=map(sin(this.pulse),-1,1,160,255);
    fill(12,5,25,200);rect(this.x+this.w/2-160*sx,this.y+8*sy,320*sx,32*sy,5*sy);
    fill(255,215,0,ga);noStroke();textSize(40);textAlign(CENTER,CENTER);textStyle(BOLD);
    text('★  CASINO GALACTIQUE  ★',this.x+this.w/2,this.y+24*sy);textStyle(NORMAL);
    fill(255,180,50,ga*.7);textSize(20);text('BLACKJACK  ◆  ROULETTE  ◆  MACHINES À SOUS',this.x+this.w/2,this.y+48*sy);
    let suits=['♠','♥','♦','♣'];
    for(let i=0;i<4;i++){fill(i%2===0?color(255,255,255,100):color(255,80,80,100));textSize(44);text(suits[i],this.x+60*sx+i*60*sx,this.y+this.h/2);}
    let dw=55*sx,dh=45*sy;
    fill(5,2,12);noStroke();rect(this.doorX-dw/2,this.doorY-dh,dw,dh,4*sy,4*sy,0,0);
    stroke(215,175,25);strokeWeight(5);noFill();rect(this.doorX-dw/2-3*sx,this.doorY-dh-3*sy,dw+6*sx,dh+6*sy,5*sy,5*sy,0,0);
    for(let i=0;i<7;i++){fill(i%2===0?color(180,20,20,130):color(215,175,25,90));noStroke();rect(this.doorX-dw/2+i*(dw/7),this.doorY-dh-16*sy,dw/7,16*sy);}
    if(this.nearDoor()&&!dlg.active){
      let g=sin(this.pulse)*12+28;
      noFill();stroke(255,238,75,map(sin(this.pulse),-1,1,100,220));strokeWeight(4);
      ellipse(this.doorX,this.doorY-dh/2,dw*1.3+g,dh*1.3+g);
      if(hasCostume){fill(255,255,175);noStroke();textAlign(CENTER);textSize(24);textStyle(BOLD);text('[E] Entrer',this.doorX,this.doorY+40);textStyle(NORMAL);}
    }
    if(isDone){fill(75,255,95);noStroke();textSize(44);textAlign(CENTER,CENTER);text('✓',this.x+this.w-32*sx,this.y+32*sy);}
    pop();
  }
}

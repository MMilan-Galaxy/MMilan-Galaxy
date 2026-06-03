// ═══════════════════════════════════════
//  DECORATIONS — AlienTree, LavaPool, Rock, NeonPillar, GiantDice
// ═══════════════════════════════════════

class AlienTree{
  constructor(x,y,sz){
    this.x=x;this.y=y;this.sz=sz||1;this.t=random(TWO_PI);
    this.nc=floor(random(3,7));
    this.gc=color(random(80,160),random(0,35),random(185,255));
    this.tc=color(random(38,75),random(14,38),random(52,88));
  }
  solid(){return{x:this.x-this.sz*58,y:this.y-this.sz*16,w:this.sz*115,h:this.sz*32};}
  draw(){
    this.t+=0.022;
    push();translate(this.x,this.y);scale(2,2);
    noStroke();fill(0,0,0,50);ellipse(4,this.sz*12,this.sz*24,this.sz*8);
    fill(this.tc);ellipse(0,0,this.sz*13,this.sz*16);
    for(let i=3;i>0;i--){fill(red(this.gc),green(this.gc),blue(this.gc),18);ellipse(0,0,(this.sz*7+sin(this.t)*2.5)*i*.55,(this.sz*7+sin(this.t)*2.5)*i*.55);}
    for(let i=0;i<this.nc;i++){
      let a=(i/this.nc)*TWO_PI+this.t*.22,r=this.sz*(8+sin(this.t+i)*2);
      push();rotate(a);fill(this.gc);noStroke();triangle(0,-r,-this.sz*3.2,0,this.sz*3.2,0);pop();
    }
    fill(225,195,255);noStroke();ellipse(0,0,this.sz*3.5,this.sz*3.5);
    pop();
  }
}

class LavaPool{
  constructor(x,y,rx,ry){
    this.x=x;this.y=y;this.rx=rx;this.ry=ry;this.t=random(TWO_PI);
    this.bubs=[];
    for(let i=0;i<6;i++)this.bubs.push({bx:random(-rx*.6,rx*.6),by:random(-ry*.6,ry*.6),sz:random(6,18),t:random(TWO_PI)});
  }
  solid(){return{x:this.x-this.rx,y:this.y-this.ry,w:this.rx*2,h:this.ry*2};}
  draw(){
    this.t+=0.018;
    push();translate(this.x,this.y);
    for(let i=4;i>0;i--){noStroke();fill(255,65,0,12);ellipse(0,0,(this.rx+i*18)*2,(this.ry+i*18)*2);}
    fill(192,48,0);noStroke();ellipse(0,0,this.rx*2,this.ry*2);
    fill(222,88,6);ellipse(0,sin(this.t)*this.ry*.32,this.rx*1.3,this.ry*1.1);
    fill(255,148,22,172);ellipse(0,0,this.rx*.72,this.ry*.52);
    for(let b of this.bubs){b.t+=0.045;let bs=b.sz+sin(b.t)*4;fill(255,110,16,168);noStroke();ellipse(b.bx,b.by+sin(b.t)*6,bs,bs);}
    pop();
  }
}

class Rock{
  constructor(x,y,sz){this.x=x;this.y=y;this.sz=sz||1;this.angle=random(TWO_PI);}
  solid(){return{x:this.x-this.sz*86,y:this.y-this.sz*16,w:this.sz*173,h:this.sz*32};}
  draw(){
    push();translate(this.x,this.y);scale(2,2);rotate(this.angle);
    noStroke();fill(0,0,0,58);ellipse(5,10,this.sz*28,this.sz*10);
    fill(40,26,58);stroke(62,44,85);strokeWeight(1.5);ellipse(0,0,this.sz*24,this.sz*16);
    fill(55,38,75);noStroke();ellipse(-this.sz*5,-this.sz*3.5,this.sz*13,this.sz*9);
    fill(72,54,95);ellipse(-this.sz*5.5,-this.sz*4.5,this.sz*6.5,this.sz*4.5);
    pop();
  }
}

class NeonPillar{
  constructor(x,y,col){this.x=x;this.y=y;this.col=col;this.t=random(TWO_PI);}
  solid(){return{x:this.x-50,y:this.y-14,w:100,h:28};}
  draw(){
    this.t+=0.035;let g=sin(this.t)*7+15;
    push();translate(this.x,this.y);scale(2,2);
    noStroke();fill(0,0,0,58);ellipse(4,10,18,7);
    fill(55,36,75);stroke(92,62,112);strokeWeight(1);rectMode(CENTER);rect(0,1,13,22,3);
    fill(this.col);noStroke();ellipse(0,-9,14,14);
    for(let i=3;i>0;i--){noStroke();fill(red(this.col),green(this.col),blue(this.col),18);ellipse(0,-9,(g+i*8)*.62,(g+i*8)*.62);}
    pop();
  }
}

class GiantDice{
  constructor(x,y,sz){this.x=x;this.y=y;this.sz=sz||1;this.t=random(TWO_PI);this.face=floor(random(1,7));}
  solid(){return{x:this.x-this.sz*94,y:this.y-this.sz*26,w:this.sz*187,h:this.sz*52};}
  draw(){
    this.t+=0.015;let hov=sin(this.t)*6;
    push();translate(this.x,this.y+hov);scale(2,2);
    noStroke();fill(0,0,0,60);ellipse(5,this.sz*13,this.sz*28,this.sz*11);
    fill(180,175,168);noStroke();rect(this.sz*4,this.sz*4,this.sz*24,this.sz*24,4);
    fill(245,240,232);stroke(180,175,168);strokeWeight(1.5);rectMode(CENTER);rect(0,0,this.sz*24,this.sz*24,4);
    let dots=[[],[1],[[-5,-5],[5,5]],[[-5,-5],[0,0],[5,5]],[[-5,-5],[-5,5],[5,-5],[5,5]],[[-5,-5],[-5,5],[0,0],[5,-5],[5,5]],[[-5,-5],[-5,0],[-5,5],[5,-5],[5,0],[5,5]]];
    fill(30,20,45);noStroke();
    for(let d of dots[this.face]){
      if(Array.isArray(d))ellipse(d[0]*this.sz,d[1]*this.sz,this.sz*4.5,this.sz*4.5);
      else ellipse(0,0,this.sz*4.5,this.sz*4.5);
    }
    pop();
  }
}

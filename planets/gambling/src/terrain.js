// ═══════════════════════════════════════
//  TERRAIN
// ═══════════════════════════════════════
function buildTerrain(){
  terrainBuf=createGraphics(WORLD_W,WORLD_H);
  let g=terrainBuf;
  let PW=WORLD_W-200, PH=WORLD_H-200; // planet ellipse fills most of world

  g.background(3,1,10);

  // Planet base
  g.noStroke(); g.fill(20,10,35); g.ellipse(PCX,PCY,PW,PH);

  // Glow aura
  for(let i=7;i>0;i--){g.noStroke();g.fill(55,15,92,15);g.ellipse(PCX,PCY,PW+i*60,PH+i*16);}

  // Planet border
  g.stroke(68,26,108,175); g.strokeWeight(6); g.noFill(); g.ellipse(PCX,PCY,PW,PH);

  // Terrain blobs (elliptical distribution matching planet shape)
  for(let i=0;i<600;i++){
    let a=random(TWO_PI);
    let rx=random(0,PW/2-80), ry=random(0,PH/2-30);
    let x=PCX+cos(a)*rx, y=PCY+sin(a)*ry;
    let n=noise(x*.009,y*.009);
    let c=lerpColor(color(13,7,24),color(34,18,52),n);
    g.noStroke(); g.fill(c); g.ellipse(x,y,random(130,396),random(20,68));
  }

  // Path to casino
  let casCX=PCX, casCY=PCY-360;
  for(let t=0;t<=1;t+=0.004){
    let px=lerp(PCX,casCX,t), py=lerp(PCY+360,casCY,t);
    g.noStroke(); g.fill(85,48,138,20); g.ellipse(px,py,187,52);
    g.fill(105,62,165,14); g.ellipse(px,py,115,32);
    if(t%(0.08)<0.004){g.fill(200,165,22,75);g.noStroke();g.ellipse(px,py,86,24);g.fill(230,200,50,55);g.ellipse(px,py,43,12);}
  }

  // Casino area marks
  for(let i=0;i<20;i++){
    let a=random(TWO_PI), r=random(40,260);
    g.fill(80,45,130,18); g.noStroke(); g.ellipse(casCX+cos(a)*r,casCY+sin(a)*r,202,56);
  }

  // Suit symbols spread across planet
  let suits=['♠','♥','♦','♣'];
  for(let i=0;i<40;i++){
    let a=random(TWO_PI);
    let rx=random(30,PW/2-60), ry=random(30,PH/2-20);
    let x=PCX+cos(a)*rx, y=PCY+sin(a)*ry;
    let si=floor(random(4));
    g.fill(si%2===0?color(55,55,130,100):color(130,38,38,100));
    g.noStroke(); g.textAlign(CENTER,CENTER); g.textSize(random(24,56)); g.text(suits[si],x,y);
  }

  // Crystal formations spread across planet
  for(let i=0;i<35;i++){
    let a=random(TWO_PI);
    let rx=random(40,PW/2-80), ry=random(40,PH/2-40);
    let x=PCX+cos(a)*rx, y=PCY+sin(a)*ry;
    let sz=random(6,26);
    g.noStroke(); g.fill(random(55,125),random(18,55),random(135,215),110);
    g.beginShape(); g.vertex(x,y-sz); g.vertex(x+sz*.5,y); g.vertex(x,y+sz*.4); g.vertex(x-sz*.5,y); g.endShape(CLOSE);
  }
}

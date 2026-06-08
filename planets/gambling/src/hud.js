// ═══════════════════════════════════════
//  HUD
// ═══════════════════════════════════════

function drawHUD(){
  push();
  fill(0,0,0,168);noStroke();rect(8,8,1512,216,10);
  fill(255,215,0);textSize(26);textAlign(LEFT);noStroke();text('PROGRESSION',144,56);
  fill(hasCostume?color(72,255,72):color(132,132,132));textSize(24);text((hasCostume?'✓ ':'○ ')+'Costume trouvé',144,96);
  let list=[['blackjack','♠ Blackjack'],['roulette','◎ Roulette'],['slots','🎰 Machine']];
  for(let i=0;i<3;i++){
    let d=done[list[i][0]];
    fill(d?color(72,255,72):color(132,132,132));textSize(24);
    text((d?'✓ ':'○ ')+list[i][1]+(d?' 🥇':''),144,132+i*32);
  }
  fill(215,178,25);textSize(24);text('Lingots : '+ingots+' / 3',144,232);

  // Minimap
  let mx=W-562,my=H-156,mr=124,scale=mr/PR;
  fill(0,0,0,152);noStroke();ellipse(mx,my,mr*2+20,mr*2+20);
  fill(16,8,30,200);noStroke();ellipse(mx,my,mr*2,mr*2);
  if(casino){
    let bx=mx+(casino.x+casino.w/2-PCX)*scale,by=my+(casino.y+casino.h/2-PCY)*scale;
    fill(ingots>=3?color(72,255,72):color(215,50,50));noStroke();ellipse(bx,by,16,8);
  }
  for(let b of bushes){
    if(!b.searched){
      let bx2=mx+(b.x-PCX)*scale,by2=my+(b.y-PCY)*scale;
      fill(hasCostume?color(72,255,72):color(80,200,80));noStroke();ellipse(bx2,by2,8,4);
    }
  }
  let ppx=mx+(player.x-PCX)*scale,ppy=my+(player.y-PCY)*scale;
  fill(215,178,28);noStroke();ellipse(ppx,ppy,12,6);
  stroke(68,42,108,198);strokeWeight(3);noFill();ellipse(mx,my,mr*2,mr*2);

  fill(132,132,175,192);textAlign(CENTER);textSize(22);text('ZQSD / Flèches  |  E : interagir',W/2,H-14);
  pop();
}

function drawWinScreen(){
  background(4,2,12);let t=frameCount*.02;
  noStroke();for(let s of stars){s.t+=0.04;fill(198,142,255,map(sin(s.t),-1,1,112,252));ellipse(s.x-cam.x,s.y-cam.y,s.sz*2);}
  for(let i=9;i>0;i--){noStroke();fill(135,36,255,13);let sz=324+i*72+sin(t)*36;ellipse(W/2,H/2-104,sz,sz);}
  push();translate(W/2,H/2-124);rotate(t*.55);
  let cs=152+sin(t*2)*18;noStroke();
  fill(183,68,255);beginShape();vertex(0,-cs*1.22);vertex(cs*.63,0);vertex(0,cs*.82);vertex(-cs*.63,0);endShape(CLOSE);
  fill(226,166,255);beginShape();vertex(0,-cs*.66);vertex(cs*.24,-cs*.06);vertex(0,cs*.26);vertex(-cs*.24,-cs*.06);endShape(CLOSE);
  fill(255,255,255,182);ellipse(-cs*.14,-cs*.38,cs*.18,cs*.26);pop();
  for(let i=0;i<14;i++){
    let a=(i/14)*TWO_PI+t,r=292+sin(t*2+i)*52;
    stroke(255,216,92,182);strokeWeight(4);noFill();
    let ss=10+sin(t*3+i)*6;
    line(W/2+cos(a)*r-ss,H/2-104+sin(a)*r,W/2+cos(a)*r+ss,H/2-104+sin(a)*r);
    line(W/2+cos(a)*r,H/2-104+sin(a)*r-ss,W/2+cos(a)*r,H/2-104+sin(a)*r+ss);
  }
  noStroke();fill(255,215,0);textAlign(CENTER);textSize(80);text('CRISTAL OBTENU !',W/2,H/2+104);
  fill(196,142,255);textSize(40);text('La Planète du Gambling est conquise',W/2,H/2+172);
  fill(162,162,162);textSize(28);text('[R] Recommencer',W/2,H/2+240);
}

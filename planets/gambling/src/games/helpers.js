// ═══════════════════════════════════════
//  GAME HELPERS
// ═══════════════════════════════════════

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){let j=floor(random(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
}

function drawPanel(){
  push();fill(14,6,30,240);stroke(132,42,255);strokeWeight(4);rectMode(CORNER);rect(634,124,4493,952,36);pop();
}

function drawBtn(x,y,w,h,lbl,col){
  push();rectMode(CENTER);fill(col);stroke(255,255,255,170);strokeWeight(2.4);rect(x,y,w,h,18);
  fill(255);noStroke();textAlign(CENTER,CENTER);textSize(26);text(lbl,x,y);pop();
}

function drawCards(hand,cx,cy,hideFirst){
  let cw=80,ch=112,gap=92,total=hand.length*gap,sx=cx-total/2+gap/2;
  for(let i=0;i<hand.length;i++){
    let x=sx+i*gap;
    push();rectMode(CENTER);
    if(hideFirst&&i===0){
      fill(33,33,162);stroke(172);strokeWeight(2);rect(x,cy,cw,ch,10);
      fill(255);noStroke();textAlign(CENTER,CENTER);textSize(44);text('?',x,cy);
    } else {
      fill(252,248,240);stroke(152);strokeWeight(2);rect(x,cy,cw,ch,10);
      let c=hand[i],isRed=c.s==='♥'||c.s==='♦';
      fill(isRed?color(192,0,0):color(10,10,10));noStroke();textAlign(CENTER,CENTER);textSize(24);text(c.v+c.s,x,cy);
    }
    pop();
  }
}

function drawTutorialCard(title, sections, accentCol){
  push();
  noStroke(); fill(0,0,0,200); rectMode(CORNER); rect(0,0,W,H);

  const cw=1300, ch=520;
  const cx=W/2-cw/2, cy=H/2-ch/2;

  fill(0,0,0,90); rect(cx+10,cy+10,cw,ch,32);
  fill(18,8,38,252); stroke(accentCol); strokeWeight(4); rect(cx,cy,cw,ch,32); noStroke();

  fill(red(accentCol)*0.18,green(accentCol)*0.18,blue(accentCol)*0.18);
  rect(cx,cy,cw,72,32,32,0,0);
  fill(accentCol); textAlign(CENTER,CENTER); textSize(40); textStyle(BOLD);
  text(title,W/2,cy+36); textStyle(NORMAL);

  stroke(accentCol); strokeWeight(2); line(cx+50,cy+72,cx+cw-50,cy+72); noStroke();

  let sy=cy+96;
  for(let s of sections){
    fill(255,215,0); textAlign(LEFT); textSize(22); textStyle(BOLD);
    text(s.label,cx+60,sy); textStyle(NORMAL); sy+=30;
    fill(215,215,255); textSize(18);
    for(let l of s.lines){text('  '+l,cx+60,sy); sy+=24;}
    sy+=14;
  }

  const p=128+127*sin(frameCount*0.06);
  fill(200,200,255,p); textAlign(CENTER); textSize(18);
  text('Clique ou appuie sur une touche pour commencer',W/2,cy+ch-28);
  pop();
}

function drawCasinoRoom(col){
  noStroke();fill(red(col)*.1,green(col)*.1,blue(col)*.1);rect(0,0,W,H);
  stroke(red(col)*.22,green(col)*.22,blue(col)*.22);strokeWeight(2);
  for(let x=0;x<W;x+=346)line(x,0,x,H);
  for(let y=0;y<H;y+=96)line(0,y,W,y);
  fill(red(col)*.06,green(col)*.06,blue(col)*.06);noStroke();rect(0,H*.54,W,H*.46);
  for(let i=5;i>0;i--){noStroke();fill(red(col),green(col),blue(col),9);ellipse(W/2,52,(576+i*230),(56+i*28));}
  fill(red(col)*.55,green(col)*.55,blue(col)*.55);noStroke();ellipse(W/2,48,374,40);
  fill(255,238,195,215);ellipse(W/2,52,158,22);
}

// ═══════════════════════════════════════
//  DIALOGUE
// ═══════════════════════════════════════
let dlg={active:false,lines:[],page:0,onDone:null,speaker:''};

function startDlg(lines,onDone=null){
  dlg={active:true,lines,page:0,onDone,speaker:''};
}

function advanceDlg(){
  dlg.page++;
  if(dlg.page>=dlg.lines.length){dlg.active=false;if(dlg.onDone)dlg.onDone();}
}

function drawDlg(){
  if(!dlg.active)return;
  push();
  const bw=2600, bh=216, bx=W/2-bw/2, by=H-560;
  fill(6,2,18,240);stroke(180,140,255);strokeWeight(4);
  rect(bx,by,bw,bh,20);
  fill(18,10,35);stroke(150,110,220);strokeWeight(3);rect(bx+16,by+16,518,184,12);
  fill(255,215,0);noStroke();textAlign(CENTER,CENTER);textSize(52);text('👤',bx+16+259,by+108);
  fill(255,242,190);noStroke();textAlign(LEFT);textSize(25);textLeading(36);
  text(dlg.lines[dlg.page],bx+554,by+32,bw-590,180);
  if(frameCount%44<22){fill(180,150,255);textAlign(RIGHT);textSize(22);text('[E] ►',bx+bw-32,by+bh-16);}
  pop();
}

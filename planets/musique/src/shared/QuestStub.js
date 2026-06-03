class QuestStub {
  static draw(p, quest) {
    p.background('#0a0a0f');

    p.push();
    p.noStroke();
    p.fill('#191970');
    p.rect(0, 0, p.width, p.height);

    const cx = p.width / 2;
    const cy = p.height / 2;
    const pulse = 0.6 + 0.4 * Math.sin(p.frameCount * 0.05);
    const r = 120 + Math.sin(p.frameCount * 0.03) * 8;
    p.fill(6 * pulse + 50, 214 * pulse + 30, 160 * pulse + 30);
    p.ellipse(cx, cy, r * 2, r * 2);

    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(28);
    p.text(quest.title, cx, cy - 220);
    p.fill(140, 140, 158);
    p.textSize(16);
    p.text('Auteur : ' + quest.author + 'stub (cliquer pour valider)', cx, cy - 180);

    p.fill(255, 255, 255, 220);
    p.textSize(20);
    p.text('Cliquez pour terminer la quête', cx, cy + 200);
    p.pop();
  }
}

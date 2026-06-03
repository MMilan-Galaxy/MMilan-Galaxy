class Quete0 extends Quest {
  constructor() {
    super({
      id: "q0",
      title: "Quête 0 — Bienvenue à Symphonia !",
      author: "Evan",
      progressPercent: 10,
      parcelName: "",
      npcName: "Facteur Eugène",
      briefing:
        "Bienvenue à Symphonia ! Je suis le facteur Eugène. Ce matin, je me suis blessé le dos... impossible de travailler. Tu arrives juste à temps ! J'ai <strong>6 livraisons urgentes</strong> à faire dans la ville. Les habitants comptent sur nous, tu acceptes ?",
      successText:
        "C'est parti ! Reviens me voir au bureau de poste pour récupérer ta première livraison.",
      autoCompleteOnAccept: true,
    });
  }

  draw(p) {
    p.background("#0a0a0f");
    // Ambient grid
    p.stroke(41, 255, 223, 18);
    p.strokeWeight(1);
    for (let x = 0; x < p.width; x += 60) p.line(x, 0, x, p.height);
    for (let y = 0; y < p.height; y += 60) p.line(0, y, p.width, y);
    p.noStroke();

    // Jaxx standing at center-right, facing left (toward dialog)
    drawJaxx2D(
      p,
      p.width * 0.72,
      p.height * 0.55,
      1.4,
      0,
      Math.sin(p.frameCount * 0.04) * 0.2,
      -1,
    );
  }
}

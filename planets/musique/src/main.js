if (window.location.protocol === 'file:') {
  console.error(
    "[JAXX] Le projet est ouvert en file:// — ml5 et p5.sound ne peuvent pas se charger. " +
    "Ouvre index.html avec Live Server (VS Code) ou via un serveur HTTP local."
  );
  document.addEventListener('DOMContentLoaded', () => {
    const boot = document.getElementById('boot-screen');
    if (boot) boot.classList.add('visible');
  });
}

const sketch = (p) => {
  let game = null;
  let hud = null;

  p.setup = () => {
    const cnv = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    cnv.elt.style.touchAction = 'none';
    cnv.elt.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    cnv.elt.setAttribute('tabindex', '0');
    cnv.elt.style.outline = 'none';
    p.setAttributes('antialias', true);
    p.pixelDensity(1);

    try {
      hud = new HUD();

      const player = new Player();

      const quests = [
        new Quete0(), new Quete1(), new Quete2(),
        new Quete3(), new Quete4(), new Quete5(), new Quete6()
      ];
      const questManager = new QuestManager(quests);

      const worldMap   = new WorldMap();
      const postOffice = new PostOffice();
      const transition = new Transition(hud);
      const progressBar = new ProgressBar(hud);
      const questRunner = new QuestRunner();

      cnv.elt.classList.add('world-canvas');

      game = new Game({ p, hud, questManager, worldMap, postOffice, transition, progressBar, player, questRunner });
      game.start();

      const params = new URLSearchParams(window.location.search);
      const questParam = params.get('quest');
      if (questParam !== null) {
        const idx = parseInt(questParam, 10);
        if (!Number.isNaN(idx)) {
          setTimeout(() => game.jumpToQuest(idx), 100);
        }
      }
    } catch (err) {
      console.error('[JAXX] setup() a échoué :', err);
      if (hud) hud.showBootError(String(err && err.message ? err.message : err));
    }
  };

  p.draw = () => {
    if (!game) {
      p.background(10, 10, 20);
      return;
    }
    game.update();
    game.draw();
  };

  p.mousePressed   = () => game && game.mousePressed();
  p.mouseDragged   = () => game && game.mouseDragged();
  p.mouseReleased  = () => game && game.mouseReleased();
  p.keyPressed     = () => game && game.keyPressed();
  p.keyReleased    = () => game && game.keyReleased();
  p.windowResized  = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    if (game) game.windowResized();
  };
};

new p5(sketch);

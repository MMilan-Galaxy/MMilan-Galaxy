class QuestRunner {
  constructor() {
    this.mainP = null;
    this.activeInstance = null;
    this.activeQuest = null;
  }

  bindMain(p) { this.mainP = p; }

  isActive() { return this.activeInstance !== null; }

  start(quest) {
    if (this.activeInstance) this.stop();
    this.activeQuest = quest;
    this._hideMain();

    const sketchFn = (p) => {
      p.setup = () => {
        const cnv = p.createCanvas(p.windowWidth, p.windowHeight);
        cnv.elt.classList.add('quest-canvas');
        cnv.elt.style.touchAction = 'none';
        cnv.elt.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        cnv.elt.setAttribute('tabindex', '0');
        cnv.elt.style.outline = 'none';
        p.pixelDensity(1);
        try { quest.setup(p); } catch (e) { console.error('[QuestRunner] setup error', e); }
      };
      p.draw = () => {
        try {
          if (quest.update) quest.update(p);
          quest.draw(p);
        } catch (e) {
          console.error('[QuestRunner] draw error', e);
        }
      };
      p.mousePressed   = () => { try { quest.onMousePressed(p); }   catch (e) { console.error(e); } };
      p.mouseDragged   = () => { try { quest.onMouseDragged(p); }   catch (e) { console.error(e); } };
      p.mouseReleased  = () => { try { quest.onMouseReleased(p); }  catch (e) { console.error(e); } };
      p.keyPressed     = () => { try { quest.onKeyPressed(p); }     catch (e) { console.error(e); } };
      p.keyReleased    = () => { try { quest.onKeyReleased(p); }    catch (e) { console.error(e); } };
      p.windowResized  = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        try { quest.onWindowResized(p); } catch (e) { console.error(e); }
      };
    };

    this.activeInstance = new p5(sketchFn);
  }

  pause() {
    if (this.activeInstance) {
      try { this.activeInstance.noLoop(); } catch (e) {}
    }
  }

  resume() {
    if (this.activeInstance) {
      try { this.activeInstance.loop(); } catch (e) {}
    }
  }

  stop() {
    if (this.activeQuest) {
      try { this.activeQuest.cleanup(this.activeInstance); } catch (e) { console.error('[QuestRunner] cleanup error', e); }
      this.activeQuest = null;
    }
    if (this.activeInstance) {
      const inst = this.activeInstance;
      this.activeInstance = null;
      try { inst.remove(); } catch (e) {}
    }
    this._showMain();
  }

  _hideMain() {
    if (!this.mainP) return;
    const cnv = this.mainP.canvas;
    if (cnv) cnv.style.display = 'none';
    try { this.mainP.noLoop(); } catch (e) {}
  }

  _showMain() {
    if (!this.mainP) return;
    const cnv = this.mainP.canvas;
    if (cnv) cnv.style.display = '';
    try { this.mainP.loop(); } catch (e) {}
  }
}

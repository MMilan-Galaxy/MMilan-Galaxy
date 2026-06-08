const GameState = Object.freeze({
  BOOT: 'BOOT',
  MENU: 'MENU',
  OVERWORLD: 'OVERWORLD',
  HUB: 'HUB',
  BRIEFING: 'BRIEFING',
  QUEST: 'QUEST',
  DELIVERY_FADE: 'DELIVERY_FADE',
  ENDING: 'ENDING'
});

class Game {
  constructor({ p, hud, questManager, worldMap, postOffice, transition, progressBar, player, questRunner }) {
    this.p = p;
    this.hud = hud;
    this.questManager = questManager;
    this.worldMap = worldMap;
    this.postOffice = postOffice;
    this.transition = transition;
    this.progressBar = progressBar;
    this.player = player;
    this.questRunner = questRunner;

    this.state = GameState.BOOT;
    this._lastQuestLocation = null;

    this.questManager.bindGame(this);
    this.worldMap.bindGame(this);
    this.postOffice.bindGame(this);
    if (this.questRunner) this.questRunner.bindMain(p);
  }

  start() {
    this.hud.installGlobalKeyListener();
    this.installDebugShortcuts();
    this.state = GameState.MENU;
    this.hud.showMenu(() => this._startFromMenu());
  }

  _startFromMenu() {
    this.transition.play({
      text: 'Bienvenue à Symphonia !',
      onOpaque: () => {
        this._enterOverworldTowardPostOffice();
        this.hud.toast({
          title: 'Contrôles',
          body: 'ZQSD pour se déplacer · E pour interagir · Échap pour le menu'
        });
      }
    });
  }

  installDebugShortcuts() {
    const codeMap = {
      Digit0: 0, Digit1: 1, Digit2: 2, Digit3: 3,
      Digit4: 4, Digit5: 5, Digit6: 6,
      Numpad0: 0, Numpad1: 1, Numpad2: 2, Numpad3: 3,
      Numpad4: 4, Numpad5: 5, Numpad6: 6
    };
    document.addEventListener('keydown', (e) => {
      if (!e.shiftKey) return;
      const idx = codeMap[e.code];
      if (idx === undefined) return;
      e.preventDefault();
      this.hud.hideMenu();
      this.jumpToQuest(idx);
    });
  }

  jumpToQuest(index) {
    if (!this.questRunner) return;
    if (index < 0 || index >= this.questManager.quests.length) return;
    console.log(`[Debug] Jump to quête ${index}`);

    if (this.questRunner.isActive()) this.questRunner.stop();
    this.hud.hideDialog();
    this.hud.hidePrompt();

    this.questManager.currentIndex = index;
    const quest = this.questManager.current();
    this.player.takeParcel({ name: quest.parcelName });

    if (quest.autoCompleteOnAccept) {
      quest.state = 'PLAYING';
      quest.complete();
      return;
    }

    this.state = GameState.QUEST;
    window.musicManager?.pause();
    this.questRunner.start(quest);
    quest.state = 'PLAYING';
    const parcelSub = quest.parcelName ? `Colis : ${quest.parcelName}` : quest.npcName;
    const sub = index > 0 ? `Quête ${index}/6 · ${parcelSub}` : parcelSub;
    this.hud.setLocation(quest.locationLabel || quest.title, sub);
  }

  update() {
    const p = this.p;
    this.progressBar.update(this.questManager.progressPercent());

    switch (this.state) {
      case GameState.OVERWORLD:
      case GameState.ENDING:    this.worldMap.update(p); break;
      case GameState.HUB:
      case GameState.BRIEFING:  this.postOffice.update(p); break;
    }
  }

  draw() {
    const p = this.p;

    switch (this.state) {
      case GameState.OVERWORLD:      this.worldMap.draw(p); break;
      case GameState.HUB:
      case GameState.BRIEFING:
      case GameState.DELIVERY_FADE:  this.postOffice.draw(p); break;
      case GameState.ENDING:         this.worldMap.draw(p); break;
      default:                       p.background(10, 10, 20);
    }
  }

  enterPostOffice() {
    if (this.state === GameState.ENDING) {
      this.state = GameState.BRIEFING;
      this.postOffice.enterEnding(this.p);
      this._showEndingDialog();
      return;
    }
    this.state = GameState.HUB;
    this.hud.hidePrompt();
    this.postOffice.enter(this.p);
    this.state = GameState.BRIEFING;
  }

  backToOverworld() {
    this.hud.hideDialog();
    this._enterOverworldTowardPostOffice();
  }

  startBriefing() {
    this.state = GameState.BRIEFING;
    this.postOffice.startBriefing(this.questManager.current());
  }

  startCurrentQuest() {
    const quest = this.questManager.current();
    this.player.takeParcel({ name: quest.parcelName });
    this.hud.hideDialog();

    if (quest.autoCompleteOnAccept) {
      quest.state = 'PLAYING';
      quest.complete();
      return;
    }

    this._enterOverworldTowardQuest(quest);
  }

  triggerCurrentQuest() {
    const quest = this.questManager.current();
    const idx = this.questManager.currentIndex;
    this.hud.hidePrompt();
    const parcelSub = quest.parcelName ? `Colis : ${quest.parcelName}` : quest.npcName;
    const sub = idx > 0 ? `Quête ${idx}/6 · ${parcelSub}` : parcelSub;
    this.hud.setLocation(quest.locationLabel || quest.title, sub);
    this.state = GameState.QUEST;
    window.musicManager?.pause();
    this.questRunner.start(quest);
    quest.state = 'PLAYING';
  }

  onQuestCompleted(quest) {
    this.player.markCompleted(quest.id);
    this.player.deliverParcel();
    this._lastQuestLocation = quest.mapLocation;
    this._beginDeliveryFade(quest);
  }

  _beginDeliveryFade(quest) {
    this.state = GameState.DELIVERY_FADE;
    this.transition.play({
      text: quest.successText,
      onOpaque: () => {
        if (this.questRunner && this.questRunner.isActive()) this.questRunner.stop();
        if (this.questManager.hasNext()) {
          this.questManager.advance();
          this._enterOverworldTowardPostOffice();
        } else {
          this._enterEnding();
        }
      }
    });
  }

  _enterEnding() {
    if(window.SpaceCrystals)SpaceCrystals.complete('musique');
    this.state = GameState.ENDING;
    this.transition.play({
      text: "Toutes les livraisons sont accomplies ! Retournez voir le Facteur Eugène.",
      onOpaque: () => {
        window.musicManager?.resume();
        const spawn = this._lastQuestLocation || null;
        this.worldMap.enter(this.p, { spawn, target: { type: 'postoffice' } });
      }
    });
  }

  _showEndingDialog() {
    this.hud.showDialog({
      badge: 'Facteur Eugène · Fin',
      text: 'Extraordinaire ! Grâce à vous, <strong>toutes les livraisons de Symphonia</strong> ont été accomplies. La ville entière vous remercie !',
      choices: [{
        action: 'end',
        shortcut: 'E',
        label: '[ Continuer ]',
        sub: 'Se balader dans Symphonia',
        kind: 'highlight'
      }],
      onChoice: () => {
        this.hud.hideDialog();
        this.state = GameState.ENDING;
        window.musicManager?.resume();
        const spawn = this.worldMap.postOfficeExit();
        this.worldMap.enter(this.p, { spawn, target: null });
      }
    });
  }

  _enterOverworldTowardPostOffice() {
    this.state = GameState.OVERWORLD;
    window.musicManager?.resume();
    const spawn = this._lastQuestLocation || null;
    this.worldMap.enter(this.p, { spawn, target: { type: 'postoffice' } });
  }

  _enterOverworldTowardQuest(quest) {
    this.state = GameState.OVERWORLD;
    const exit = this.worldMap.postOfficeExit();
    this.worldMap.enter(this.p, {
      spawn: exit,
      target: { type: 'quest', x: quest.mapLocation.x, z: quest.mapLocation.z }
    });
  }

  mousePressed() {
    if (this.state === GameState.OVERWORLD || this.state === GameState.ENDING) this.worldMap.onMousePressed(this.p);
    else if (this.state === GameState.HUB || this.state === GameState.BRIEFING) this.postOffice.onMousePressed(this.p);
  }
  mouseDragged() {}
  mouseReleased() {}
  keyPressed() {
    const p = this.p;
    if (p.key === 'Escape' || p.keyCode === 27) {
      // Ferme le menu si déjà ouvert
      if (this.hud.isMenuVisible()) {
        this.hud.hideMenu();
        if (this.state === GameState.QUEST) this.questRunner.resume();
        return;
      }
      if (this.state === GameState.QUEST) {
        this.questRunner.pause();
        this.hud.showPauseMenu({
          onResume: () => this.questRunner.resume(),
          onQuit:   () => { this.questRunner.stop(); this._enterOverworldTowardPostOffice(); }
        });
      } else if (
        this.state === GameState.OVERWORLD ||
        this.state === GameState.HUB ||
        this.state === GameState.BRIEFING ||
        this.state === GameState.ENDING
      ) {
        this.hud.showPauseMenu({
          onResume:   () => {},
          onQuit:     () => {},
          showQuitBtn: false
        });
      }
      return;
    }
    if (this.state === GameState.OVERWORLD || this.state === GameState.ENDING) this.worldMap.onKeyPressed(p);
    else if (this.state === GameState.HUB || this.state === GameState.BRIEFING) this.postOffice.onKeyPressed(p);
  }
  keyReleased() {
    if (this.state === GameState.OVERWORLD)  this.worldMap.onKeyReleased(this.p);
  }
  windowResized() {
    if (this.state === GameState.OVERWORLD)  this.worldMap.onWindowResized(this.p);
    this.postOffice.onWindowResized(this.p);
  }
}

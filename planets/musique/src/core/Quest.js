class Quest {
  constructor({
    id,
    title,
    author,
    progressPercent,
    parcelName,
    npcName,
    briefing,
    successText,
    mapLocation = null,
    locationLabel = null,
    autoCompleteOnAccept = false
  }) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.progressPercent = progressPercent;
    this.parcelName = parcelName;
    this.npcName = npcName;
    this.briefing = briefing;
    this.successText = successText;
    this.mapLocation = mapLocation;
    this.locationLabel = locationLabel;
    this.autoCompleteOnAccept = autoCompleteOnAccept;

    this.state = 'IDLE';
    this.game = null;
  }

  bindGame(game) {
    this.game = game;
  }

  setup(p) {
    this.state = 'PLAYING';
  }

  update(p) {}

  draw(p) {}

  cleanup(p) {
    this.state = 'IDLE';
  }

  complete() {
    if (this.state === 'PLAYING') {
      this.state = 'DONE';
      if (this.game) {
        this.game.onQuestCompleted(this);
      }
    }
  }

  isDone() {
    return this.state === 'DONE';
  }

  onMousePressed(p) {}
  onMouseDragged(p) {}
  onMouseReleased(p) {}
  onKeyPressed(p) {}
  onKeyReleased(p) {}
  onWindowResized(p) {}
}

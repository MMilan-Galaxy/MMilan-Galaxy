class ProgressBar {
  constructor(hud) {
    this.hud = hud;
    this._displayed = 0;
  }

  update(targetPercent) {
    this._displayed += (targetPercent - this._displayed) * 0.12;
    this.hud.setProgress(this._displayed);
  }
}

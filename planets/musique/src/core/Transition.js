class Transition {
  constructor(hud, { fadeInMs = 900, holdMs = 2400, fadeOutMs = 900 } = {}) {
    this.hud = hud;
    this.fadeInMs = fadeInMs;
    this.holdMs = holdMs;
    this.fadeOutMs = fadeOutMs;
  }

  play({ text, onOpaque, onComplete }) {
    this.hud.playFade({
      text,
      fadeInMs: this.fadeInMs,
      holdMs: this.holdMs,
      fadeOutMs: this.fadeOutMs,
      onOpaque,
      onComplete
    });
  }
}

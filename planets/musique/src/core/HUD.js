class HUD {
  constructor() {
    this.locationEl = document.getElementById("hud-location");
    this.questEl =
      this.locationEl && this.locationEl.querySelector(".hud-quest");
    this.labelEl =
      this.locationEl && this.locationEl.querySelector(".hud-label");
    this.cristalEl = document.getElementById("cristal-count");
    this.progressFill = document.getElementById("progress-fill");
    this.progressPct = document.getElementById("progress-percent");
    this.promptEl = document.getElementById("interaction-prompt");
    this.promptHeader = document.getElementById("prompt-header");
    this.promptAction = document.getElementById("prompt-action");
    this.dialogEl = document.getElementById("dialog-overlay");
    this.dialogBadge = document.getElementById("dialog-badge");
    this.dialogText = document.getElementById("dialog-text");
    this.dialogChoices = document.getElementById("dialog-choices");
    this.fadeEl = document.getElementById("fade-overlay");
    this.fadeText = document.getElementById("fade-text");
    this.toastsEl = document.getElementById("toast-container");
    this.bootEl = document.getElementById("boot-screen");
    this.menuEl = document.getElementById("main-menu");

    this._dialogChoiceHandler = null;
    this._keyListenerInstalled = false;
    this._typewriteTimer = null;
    this._typewriteFull = null;
    this._musicSliderWired = false;
  }

  installGlobalKeyListener() {
    if (this._keyListenerInstalled) return;
    this._keyListenerInstalled = true;
    document.addEventListener("keydown", (e) => {
      if (!this.dialogEl.classList.contains("visible")) return;
      if (e.key === "e" || e.key === "E" || e.key === "Enter") {
        this._triggerHighlightedChoice();
      }
    });
  }

  showMenu(onPlay) {
    if (this.menuEl) this.menuEl.classList.add("visible");
    this._wirePanels();
    const wire = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    };
    wire("btn-jouer", () => {
      this.hideMenu();
      window.musicManager?.start();
      if (onPlay) onPlay();
    });
    wire("btn-controles", () => this._openPanel("panel-controles"));
    wire("btn-musique", () => this._openMusicPanel());
    wire("btn-credits", () => this._openPanel("panel-credits"));
  }

  isMenuVisible() {
    return this.menuEl ? this.menuEl.classList.contains("visible") : false;
  }

  showPauseMenu({ onResume, onQuit, showQuitBtn = true }) {
    if (this.menuEl) {
      this.menuEl.classList.add("paused");
      this.menuEl.classList.add("visible");
    }
    const quitBtn = document.getElementById("btn-quit-quest");
    if (quitBtn) quitBtn.style.display = showQuitBtn ? "" : "none";

    this._wirePanels();
    const wire = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    };
    wire("btn-reprendre", () => {
      this.hideMenu();
      if (onResume) onResume();
    });
    wire("btn-controles-pause", () => this._openPanel("panel-controles"));
    wire("btn-musique-pause", () => this._openMusicPanel());
    wire("btn-credits-pause", () => this._openPanel("panel-credits"));
    wire("btn-quit-quest", () => {
      this.hideMenu();
      if (onQuit) onQuit();
    });
  }

  hideMenu() {
    if (this.menuEl) {
      this.menuEl.classList.remove("visible");
      this.menuEl.classList.remove("paused");
    }
    this._closeAllPanels();
  }

  _wirePanels() {
    const wire = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    };
    wire("btn-controles-back", () => this._closeAllPanels());
    wire("btn-musique-back", () => this._closeAllPanels());
    wire("btn-credits-back", () => this._closeAllPanels());
  }

  _openMusicPanel() {
    this._closeAllPanels();
    const panel = document.getElementById("panel-musique");
    if (!panel) return;
    panel.classList.add("visible");

    const slider = document.getElementById("bgm-volume-slider");
    const display = document.getElementById("bgm-vol-display");

    const syncSlider = (val) => {
      const pct = Math.round(parseFloat(val) * 100);
      slider.value = val;
      if (display) display.textContent = pct + ' %';
    };

    if (slider && window.musicManager) {
      syncSlider(window.musicManager.volume);
    }

    if (!this._musicSliderWired && slider) {
      this._musicSliderWired = true;
      slider.addEventListener("input", () => {
        if (window.musicManager) window.musicManager.setVolume(slider.value);
        syncSlider(slider.value);
      });
    }
  }

  _openPanel(id) {
    this._closeAllPanels();
    const el = document.getElementById(id);
    if (el) el.classList.add("visible");
  }

  _closeAllPanels() {
    ["panel-controles", "panel-musique", "panel-credits"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("visible");
    });
  }

  isDialogVisible() {
    return this.dialogEl ? this.dialogEl.classList.contains("visible") : false;
  }

  dismissDialog() {
    const continueBtn = this.dialogChoices.querySelector(
      '[data-action="continue"]',
    );
    if (continueBtn) continueBtn.click();
    else this.hideDialog();
  }

  setLocation(label, sub) {
    if (this.labelEl) this.labelEl.textContent = label || "";
    if (this.questEl) this.questEl.textContent = sub || "";
  }

  setCristal(count) {
    if (this.cristalEl) this.cristalEl.textContent = String(count);
  }

  setProgress(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    if (this.progressFill) this.progressFill.style.width = clamped + "%";
    if (this.progressPct)
      this.progressPct.textContent = Math.round(clamped) + " %";
  }

  showPrompt({ title, action }) {
    if (this.promptHeader) this.promptHeader.textContent = title || "";
    if (this.promptAction) this.promptAction.textContent = action || "";
    this.promptEl.classList.add("visible");
  }

  hidePrompt() {
    this.promptEl.classList.remove("visible");
  }

  showDialog({ badge, text, choices, onChoice }) {
    this.dialogBadge.textContent = badge || "";
    this._typewrite(this.dialogText, text || "");
    this.dialogChoices.innerHTML = "";

    this._dialogChoiceHandler = onChoice || null;

    (choices || []).forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn" + (choice.kind ? " " + choice.kind : "");
      btn.dataset.action = choice.action || "";
      btn.innerHTML = `
        <span class="ctx-shortcut">${choice.shortcut || ""}</span>
        <span>${choice.label ? `<strong>${choice.label}</strong> ` : ""}${choice.sub || ""}</span>
      `;
      btn.addEventListener("click", () => {
        if (this._dialogChoiceHandler) this._dialogChoiceHandler(choice.action);
      });
      this.dialogChoices.appendChild(btn);
    });

    this.dialogEl.classList.add("visible");
  }

  hideDialog() {
    if (this._typewriteTimer) {
      clearInterval(this._typewriteTimer);
      this._typewriteTimer = null;
      this._typewriteFull = null;
    }
    this.dialogEl.classList.remove("visible");
    this._dialogChoiceHandler = null;
  }

  playFade({
    text,
    fadeInMs = 900,
    holdMs = 2400,
    fadeOutMs = 900,
    onOpaque,
    onComplete,
  }) {
    this.fadeText.textContent = text || "";
    this.fadeEl.style.transitionDuration = `${fadeInMs}ms`;
    this.fadeEl.classList.add("visible");

    if (onOpaque) setTimeout(onOpaque, fadeInMs);
    setTimeout(() => {
      this.fadeEl.style.transitionDuration = `${fadeOutMs}ms`;
      this.fadeEl.classList.remove("visible");
    }, fadeInMs + holdMs);
    setTimeout(
      () => {
        if (onComplete) onComplete();
      },
      fadeInMs + holdMs + fadeOutMs,
    );
  }
  toast({ title, body, duration = 3500 }) {
    const div = document.createElement("div");
    div.className = "toast";
    div.innerHTML = `
      <div>
        <div class="toast-title">${title || ""}</div>
        <div class="toast-body">${body || ""}</div>
      </div>
    `;
    this.toastsEl.appendChild(div);
    setTimeout(() => {
      div.style.opacity = "0";
      div.style.transform = "translateX(120%)";
      setTimeout(() => div.remove(), 400);
    }, duration);
  }

  showBootError(message) {
    if (!this.bootEl) return;
    const msgEl = document.getElementById("boot-message");
    if (msgEl && message) msgEl.textContent = message;
    this.bootEl.classList.add("visible");
  }

  _typewrite(el, html, charsPerTick = 1, tickMs = 30) {
    if (this._typewriteTimer) {
      clearInterval(this._typewriteTimer);
      this._typewriteTimer = null;
    }
    this._typewriteFull = html;
    const plain = html.replace(/<[^>]*>/g, "");
    const total = plain.length;
    if (total === 0) {
      el.innerHTML = html;
      this._typewriteFull = null;
      return;
    }

    let visibleCount = 0;
    el.innerHTML = "";

    this._typewriteTimer = setInterval(() => {
      visibleCount = Math.min(visibleCount + charsPerTick, total);

      let seen = 0,
        inTag = false,
        result = "";
      for (let j = 0; j < html.length; j++) {
        const ch = html[j];
        if (ch === "<") {
          inTag = true;
          result += ch;
          continue;
        }
        if (inTag) {
          result += ch;
          if (ch === ">") inTag = false;
          continue;
        }
        result += ch;
        seen++;
        if (seen >= visibleCount) break;
      }
      el.innerHTML = result;

      if (visibleCount >= total) {
        clearInterval(this._typewriteTimer);
        this._typewriteTimer = null;
        this._typewriteFull = null;
        el.innerHTML = html;
      }
    }, tickMs);
  }

  _triggerHighlightedChoice() {
    if (this._typewriteTimer) {
      clearInterval(this._typewriteTimer);
      this._typewriteTimer = null;
      if (this._typewriteFull) {
        this.dialogText.innerHTML = this._typewriteFull;
        this._typewriteFull = null;
      }
      return;
    }
    const btn = this.dialogChoices.querySelector(
      ".choice-btn.highlight, .choice-btn",
    );
    if (btn) btn.click();
  }
}

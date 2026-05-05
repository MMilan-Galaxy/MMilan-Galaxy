class QuestSystem {
  constructor() {
    this.quests = {};
    this.initUI();
  }

  initUI() {
    this.container = document.getElementById("quest-hud");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "quest-hud";

      this.container.style.position = "fixed";
      this.container.style.top = "40px";
      this.container.style.left = "40px";
      this.container.style.color = "rgba(255, 255, 255, 0.85)";
      this.container.style.fontFamily = "system-ui, -apple-system, sans-serif";
      this.container.style.fontSize = "14px";
      this.container.style.letterSpacing = "0.5px";
      this.container.style.pointerEvents = "none";
      this.container.style.transition = "opacity 0.3s ease";

      document.body.appendChild(this.container);
    }
    this.updateUI();
  }

  addQuest(id, text) {
    this.quests[id] = { text: text, completed: false };
    this.updateUI();
  }

  completeQuest(id) {
    if (this.quests[id]) {
      this.quests[id].completed = true;
      this.updateUI();
    }
  }

  removeQuest(id) {
    if (this.quests[id]) {
      delete this.quests[id];
      this.updateUI();
    }
  }

  clearAllQuests() {
    this.quests = {};
    this.updateUI();
  }

  updateUI() {
    let html =
      '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; color: rgba(255, 255, 255, 0.4);">Objectifs</div><ul style="list-style-type: none; padding: 0; margin: 0;">';

    let questCount = 0;

    for (const id in this.quests) {
      questCount++;
      const quest = this.quests[id];
      const textStyle = quest.completed
        ? "text-decoration: line-through; opacity: 0.3;"
        : "opacity: 0.9;";
      const icon = quest.completed ? "✓" : "○";

      html += `<li style="${textStyle} margin-bottom: 8px; display: flex; align-items: center; gap: 10px;"><span style="font-size: 12px; opacity: 0.6;">${icon}</span> <span>${quest.text}</span></li>`;
    }

    html += "</ul>";

    this.container.innerHTML = html;
    this.container.style.opacity = questCount > 0 ? "1" : "0";
  }
}
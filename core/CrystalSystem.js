class CrystalSystem {
  constructor() {
    this.totalCount = 0;
    this.collected = {};
    this.initUI();
  }

  initUI() {
    this.container = document.getElementById("crystal-hud");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "crystal-hud";

      this.container.style.position = "fixed";
      this.container.style.top = "40px";
      this.container.style.right = "40px";
      this.container.style.color = "rgba(255, 255, 255, 0.9)";
      this.container.style.fontFamily = "system-ui, -apple-system, sans-serif";
      this.container.style.pointerEvents = "none";
      this.container.style.textAlign = "right";

      document.body.appendChild(this.container);
    }
    this.updateUI();
  }

  // Retourne true si c'est la 1ère collecte sur cette planète, false sinon
  collectCrystal(planetName) {
    if (this.collected[planetName]) return false;
    this.collected[planetName] = true;
    this.totalCount++;
    this.updateUI();
    return true;
  }

  addCrystal() {
    this.totalCount++;
    this.updateUI();
  }

  updateUI() {
    this.container.innerHTML = `
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; color: rgba(255, 255, 255, 0.4);">
        Cristaux
      </div>
      <div style="font-size: 20px; font-weight: 300; letter-spacing: 1px;">
        <span style="opacity: 0.6; margin-right: 5px;">◈</span> ${this.totalCount}
      </div>
    `;
  }
}

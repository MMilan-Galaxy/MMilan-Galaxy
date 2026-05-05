class CrystalSystem {
  constructor() {
    this.totalCount = 0;
    this.collected  = {};   // { "Nom Planète": true }
    this.initUI();
  }

  initUI() {
    this.container = document.getElementById("crystal-hud");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "crystal-hud";
      Object.assign(this.container.style, {
        position: "fixed", top: "40px", right: "40px",
        color: "rgba(255,255,255,0.9)",
        fontFamily: "system-ui, sans-serif",
        pointerEvents: "none", textAlign: "right",
      });
      document.body.appendChild(this.container);
    }
    this.updateUI();
  }

  // Collecte unique par planète — retourne true si première fois
  collectCrystal(planetName) {
    if (this.collected[planetName]) return false;
    this.collected[planetName] = true;
    this.totalCount++;
    this.updateUI();
    return true;
  }

  hasCollected(planetName) { return !!this.collected[planetName]; }

  updateUI() {
    this.container.innerHTML = `
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;color:rgba(255,255,255,0.4);">Cristaux</div>
      <div style="font-size:20px;font-weight:300;letter-spacing:1px;"><span style="opacity:0.6;margin-right:5px;">◈</span>${this.totalCount}</div>`;
  }
}

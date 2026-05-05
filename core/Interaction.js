class Interaction {
  constructor() {
    this.bindings = {};
    this.keysTracked = {};
    this._kd = (e) => { this.keysTracked[e.code] = true;  this.execute(e.code); };
    this._ku = (e) => { this.keysTracked[e.code] = false; };
    this._md = (e) => {
      if (e.button === 0) this.execute("MouseLeft",  { x: e.clientX, y: e.clientY });
      if (e.button === 2) this.execute("MouseRight", { x: e.clientX, y: e.clientY });
    };
    window.addEventListener("keydown",   this._kd);
    window.addEventListener("keyup",     this._ku);
    window.addEventListener("mousedown", this._md);
  }

  bindAction(trigger, callback) {
    if (!this.bindings[trigger]) this.bindings[trigger] = [];
    this.bindings[trigger].push(callback);
  }

  execute(trigger, data = null) {
    (this.bindings[trigger] || []).forEach(cb => cb(data));
  }

  // Appelé à chaque changement de planète pour éviter les doublons de bindings
  clearBindings() {
    this.bindings = {};
  }

  getMovementAxes() {
    let x = 0, z = 0;
    if (this.keysTracked["KeyW"] || this.keysTracked["ArrowUp"])    z -= 1;
    if (this.keysTracked["KeyS"] || this.keysTracked["ArrowDown"])  z += 1;
    if (this.keysTracked["KeyA"] || this.keysTracked["ArrowLeft"])  x -= 1;
    if (this.keysTracked["KeyD"] || this.keysTracked["ArrowRight"]) x += 1;
    if (x !== 0 && z !== 0) { const l = Math.sqrt(x*x+z*z); x/=l; z/=l; }
    return { x, z };
  }
}

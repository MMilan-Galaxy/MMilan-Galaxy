class InteractionManager {
  constructor() {
    this.bindings = {};
    this.keysTracked = {};
    this.setupKeyboardListeners();
    this.setupMouseListeners();
  }

  bindAction(trigger, callback) {
    if (!this.bindings[trigger]) {
      this.bindings[trigger] = [];
    }
    this.bindings[trigger].push(callback);
  }

  execute(trigger, data = null) {
    if (this.bindings[trigger]) {
      this.bindings[trigger].forEach((callback) => callback(data));
    }
  }

  setupKeyboardListeners() {
    window.addEventListener("keydown", (event) => {
      this.keysTracked[event.code] = true;
      this.execute(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keysTracked[event.code] = false;
    });
  }

  setupMouseListeners() {
    window.addEventListener("mousedown", (event) => {
      if (event.button === 0)
        this.execute("MouseLeft", { x: event.clientX, y: event.clientY });
      if (event.button === 2)
        this.execute("MouseRight", { x: event.clientX, y: event.clientY });
    });
  }

  getMovementAxes() {
    let x = 0;
    let z = 0;

    if (this.keysTracked["KeyW"] || this.keysTracked["ArrowUp"]) z -= 1;
    if (this.keysTracked["KeyS"] || this.keysTracked["ArrowDown"]) z += 1;
    if (this.keysTracked["KeyA"] || this.keysTracked["ArrowLeft"]) x -= 1;
    if (this.keysTracked["KeyD"] || this.keysTracked["ArrowRight"]) x += 1;

    if (x !== 0 && z !== 0) {
      const length = Math.sqrt(x * x + z * z);
      x /= length;
      z /= length;
    }

    return { x, z };
  }
}

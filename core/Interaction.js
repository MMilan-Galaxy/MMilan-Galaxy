class Interaction {
  constructor({ name, input, triggerFn, onSuccess, fallback = null }) {
    this.name      = name        // Nom affiché : "Le Seuil des Ninjas"
    this.input     = input       // "handpose" | "posenet" | "mic" | "keyboard" | "mouse"
    this.triggerFn = triggerFn   // () => boolean — condition de succès
    this.onSuccess = onSuccess   // () => void — appelé une seule fois au succès
    this.fallback  = fallback    // instance Fallback | null
    this.done      = false
    this.active    = false
  }

  // Démarre l'interaction (+ fallback si disponible)
  start() {
    this.active = true
    if (this.fallback) this.fallback.start(() => this._succeed())
  }

  // À appeler dans draw() — vérifie le trigger à chaque frame
  check() {
    if (!this.active || this.done) return
    if (this.triggerFn()) this._succeed()
  }

  // Arrête proprement l'interaction
  stop() {
    this.active = false
    if (this.fallback) this.fallback.stop()
  }

  _succeed() {
    if (this.done) return
    this.done   = true
    this.active = false
    if (this.fallback) this.fallback.stop()
    this.onSuccess()
  }
}
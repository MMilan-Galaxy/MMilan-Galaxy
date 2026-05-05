class InteractionManager {
    constructor() {
      this.bindings = new Map(); // Map de touches → callbacks
      this._keydownHandler = null;
    }
  
    // Initialise l'écoute des événements clavier
    init() {
      this._keydownHandler = (e) => {
        const callback = this.bindings.get(e.code);
        if (callback) {
          e.preventDefault(); // Évite le comportement par défaut
          callback();
        }
      };
      
      window.addEventListener('keydown', this._keydownHandler);
    }

    // Associe une touche à une action
    bindAction(key, callback) {
      this.bindings.set(key, callback);
    }
  
    // Supprime une association spécifique
    unbindAction(key) {
      this.bindings.delete(key);
    }
  
    // Efface toutes les associations (utilisé lors du changement de planète)
    clearBindings() {
      this.bindings.clear();
    }
  
    // Nettoyage complet (si besoin de détruire le manager)
    destroy() {
      if (this._keydownHandler) {
        window.removeEventListener('keydown', this._keydownHandler);
        this._keydownHandler = null;
      }
      this.clearBindings();
    }
  }
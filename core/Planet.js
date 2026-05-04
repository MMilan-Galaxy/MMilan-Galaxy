class Planet {
    constructor(name, color) {
      this.name  = name
      this.color = color
    }
  
    // À surcharger dans chaque planète
    draw() {
      throw new Error(`${this.name} : draw() doit être surchargé`)
    }
  }
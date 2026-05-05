class NebulionPlanet extends Planet {
    constructor() {
        super('Nebulion', '#7ec8ff')
        
        window.questSystem.addQuest('ninja', 'Effectuer le signe ninja')
        
        this.interaction1 = new NinjaHandInteraction()
        this.interaction1.start()
    }

    draw() {
        background(0)
    }
}
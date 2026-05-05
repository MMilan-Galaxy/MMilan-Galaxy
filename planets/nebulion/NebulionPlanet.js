class NebulionPlanet extends Planet {
    constructor(interactions, quests, crystals) {
        super('Nebulion', '#7ec8ff', interactions, quests, crystals)
        
        quests.addQuest('ninja', 'Effectuer le signe ninja')
        
        this.interaction1 = new NinjaHandInteraction()
        this.interaction1.start()
    }

    draw() {
        background(0)
    }
}
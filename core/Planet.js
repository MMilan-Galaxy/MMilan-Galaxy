class Planet {
  constructor(name, color, interactions, quests, crystals) {
    this.name = name
    this.color = color
    this.interactions = interactions
    this.quests = quests
    this.crystals = crystals

    this.quests.clearAllQuests() 
    this.readyToLaunch = false
  }

  draw() {
    throw new Error(`${this.name} : draw() doit être surchargé`);
  }

  unload() {
    this.quests.clearAllQuests();
  }
}

class Planet {
  constructor(name, color, interaction, questSystem) {
    this.name = name;
    this.color = color;
    this.interactions = interaction;
    this.quests = questSystem;

    this.quests.clearAllQuests();
  }

  draw() {
    throw new Error(`${this.name} : draw() doit être surchargé`);
  }

  unload() {
    this.quests.clearAllQuests();
  }
}

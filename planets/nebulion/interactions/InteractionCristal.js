function setupNebulionPlanetCristal(interactions, quests, crystals, state) {
  interactions.bindAction("KeyC", () => {
    if (state.cristalRamasse) return;
    if (Math.hypot(state.persoX - state.cristalX, state.persoY - state.cristalY) < 80) {
      quests.completeQuest("quete_cristal");
      crystals.collectCrystal(state.planetName);
      state.cristalRamasse = true;
    }
  });
}

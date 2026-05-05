function setupTest2Tresor(interactions, quests, state) {
  interactions.bindAction("KeyF", () => {
    if (state.tresorOuvert) return;
    if (Math.hypot(state.persoX - state.tresorX, state.persoY - state.tresorY) < 80) {
      quests.completeQuest("quete_tresor");
      state.tresorOuvert = true;
    }
  });
}

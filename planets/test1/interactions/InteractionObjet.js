// Touche F près de l'objet → ramassage unique
function setupTest1Objet(interactions, quests, state) {
  interactions.bindAction("KeyF", () => {
    if (state.objetRamasse) return;
    if (Math.hypot(state.persoX - state.objetX, state.persoY - state.objetY) < 80) {
      quests.completeQuest("quete_objet");
      state.objetRamasse = true;
    }
  });
}

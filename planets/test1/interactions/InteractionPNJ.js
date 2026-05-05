// Touche E près du PNJ → affiche le dialogue de Cosmo
function setupTest1PNJ(interactions, quests, state) {
  interactions.bindAction("KeyE", () => {
    if (Math.hypot(state.persoX - state.pnjX, state.persoY - state.pnjY) < 80) {
      quests.completeQuest("quete_pnj");
      state.dialogueVisible = true;
      state.dialogueTimer   = 220;
    }
  });
}

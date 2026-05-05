// Clic sur le vaisseau → retour planète 1
function setupTest2Retour(interactions, quests, state) {
  interactions.bindAction("MouseLeft", (pos) => {
    if (Math.hypot(pos.x - state.vaisseauX, pos.y - state.vaisseauY) < 70) {
      quests.completeQuest("quete_retour");
      state.readyToLaunch = true;
    }
  });
}

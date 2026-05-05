// Clic gauche sur le vaisseau → readyToLaunch = true (Sketch.js détecte)
function setupTest1Vaisseau(interactions, quests, state) {
  interactions.bindAction("MouseLeft", (pos) => {
    if (!state.cristalRamasse) return;
    if (Math.hypot(pos.x - state.vaisseauX, pos.y - state.vaisseauY) < 70) {
      quests.completeQuest("quete_vaisseau");
      state.readyToLaunch = true;
    }
  });
}

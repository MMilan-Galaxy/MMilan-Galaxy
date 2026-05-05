function setupTest2Mouvement(interactions, quests, state) {
  return () => {
    const d = interactions.getMovementAxes();
    if (d.x !== 0 || d.z !== 0) quests.completeQuest("quete_explore");
    state.persoX = constrain(state.persoX + d.x*4, 20, width-20);
    state.persoY = constrain(state.persoY + d.z*4, 20, height-20);
  };
}

class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.completedQuests = new Set();
    this.currentParcel = null;
    this.crystal = false;
  }

  takeParcel(parcel) {
    this.currentParcel = parcel;
  }

  deliverParcel() {
    const delivered = this.currentParcel;
    this.currentParcel = null;
    return delivered;
  }

  markCompleted(questId) {
    this.completedQuests.add(questId);
  }

  hasCompleted(questId) {
    return this.completedQuests.has(questId);
  }

  receiveCrystal() {
    this.crystal = true;
  }
}

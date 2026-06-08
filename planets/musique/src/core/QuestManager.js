class QuestManager {
  constructor(quests) {
    this.quests = quests;
    this.currentIndex = 0;
  }

  current() {
    return this.quests[this.currentIndex];
  }

  hasNext() {
    return this.currentIndex < this.quests.length - 1;
  }

  advance() {
    if (this.hasNext()) {
      this.currentIndex += 1;
      return this.current();
    }
    return null;
  }

  isFinalQuestDone() {
    const last = this.quests[this.quests.length - 1];
    return last && last.isDone();
  }

  progressPercent() {
    const cur = this.current();
    if (!cur) return 0;
    if (cur.isDone() && !this.hasNext()) return 100;
    return cur.isDone() ? cur.progressPercent : this._previousPercent();
  }

  _previousPercent() {
    if (this.currentIndex === 0) return 0;
    return this.quests[this.currentIndex - 1].progressPercent;
  }

  bindGame(game) {
    this.quests.forEach(q => q.bindGame(game));
  }
}

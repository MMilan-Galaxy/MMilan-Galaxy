const MUSIC_TRACKS = [
  'assets/sounds/music/01 Main Theme.mp3',
  'assets/sounds/music/02 We Named Her Ku.mp3',
  'assets/sounds/music/03 A Yearning for the Sky.mp3',
  'assets/sounds/music/04 A Keepsake from the Past.mp3',
  'assets/sounds/music/05 Ku\'s First Flight.mp3',
  'assets/sounds/music/06 Separated by the Storm.mp3',
  'assets/sounds/music/07 Howl.mp3',
  'assets/sounds/music/08 Now Use the Light, We Want to See!.mp3',
  'assets/sounds/music/09 A Shine Upon Inkwater Marsh.mp3',
  'assets/sounds/music/10 Overlooking the Mill.mp3',
  'assets/sounds/music/11 The Eyes of Kwolok.mp3',
  'assets/sounds/music/12 Kwolok\'s Hollow.mp3',
  'assets/sounds/music/13 Hornbug.mp3',
  'assets/sounds/music/14 Dashing and Bashing.mp3',
  'assets/sounds/music/15 Meeting Kwolok.mp3',
  'assets/sounds/music/16 Kwolok\'s Throne Room.mp3',
  'assets/sounds/music/17 Sanctuary in the Glades.mp3',
  'assets/sounds/music/18 The Ancient Wellspring.mp3',
  'assets/sounds/music/19 A Look Inside.mp3',
  'assets/sounds/music/20 Trouble Within.mp3',
  'assets/sounds/music/21 Turn, Turn, Turn Again.mp3',
  'assets/sounds/music/22 Amelioration.mp3',
  'assets/sounds/music/23 Escaping a Foul Presence.mp3',
  'assets/sounds/music/24 Silent Woodlands.mp3',
  'assets/sounds/music/25 Reunification.mp3',
  'assets/sounds/music/26 Ash and Bone.mp3',
  'assets/sounds/music/27 Shriek.mp3',
  'assets/sounds/music/28 Fading of the Light.mp3',
  'assets/sounds/music/29 The Story of Niwen.mp3',
  'assets/sounds/music/30 Shadows of Mouldwood.mp3',
  'assets/sounds/music/31 Mora the Spider.mp3',
  'assets/sounds/music/32 The Eyes of the Forest.mp3',
  'assets/sounds/music/33 The Darkness Lifted.mp3',
  'assets/sounds/music/34 Luma Pools.mp3',
  'assets/sounds/music/35 Kwolok\'s Malaise.mp3',
  'assets/sounds/music/36 Strength of the Forest.mp3',
  'assets/sounds/music/37 Resolution in Paradise.mp3',
  'assets/sounds/music/38 Midnight Burrows.mp3',
  'assets/sounds/music/39 Baur\'s Reach.mp3',
  'assets/sounds/music/40 A Snowy Skirmish.mp3',
  'assets/sounds/music/41 In Wonderment of Winter.mp3',
  'assets/sounds/music/42 Baur\'s Peak.mp3',
  'assets/sounds/music/43 Escape with the Memory of the Forest.mp3',
  'assets/sounds/music/44 Shriek\'s Tale.mp3',
  'assets/sounds/music/45 The Windswept Wastes.mp3',
  'assets/sounds/music/46 Burrowing.mp3',
  'assets/sounds/music/47 Approaching the Ruins.mp3',
  'assets/sounds/music/48 The Heart Knows It\'s Safe.mp3',
  'assets/sounds/music/49 The Windtorn Ruins.mp3',
  'assets/sounds/music/50 Seir.mp3',
  'assets/sounds/music/51 Escaping the Sandworm.mp3',
  'assets/sounds/music/52 The Weeping Ridge.mp3',
  'assets/sounds/music/53 Willow\'s End.mp3',
  'assets/sounds/music/54 Decay.mp3',
  'assets/sounds/music/55 Unblocking the Way.mp3',
  'assets/sounds/music/56 The Spirit Willow.mp3',
  'assets/sounds/music/57 Shriek and Ori.mp3',
  'assets/sounds/music/58 Remaining in Darkness.mp3',
  'assets/sounds/music/59 A Stirring of Memories.mp3',
  'assets/sounds/music/60 Ori, Embracing the Light.mp3',
];

class MusicManager {
  constructor(tracks) {
    this._tracks = tracks;
    this._audio = new Audio();
    this._playlist = [];
    this._idx = 0;
    this._started = false;

    const saved = localStorage.getItem('sym_bgm_vol');
    this._audio.volume = saved !== null ? parseFloat(saved) : 0.4;
    this._audio.addEventListener('ended', () => this._next());

    // Tente de jouer dès que l'utilisateur interagit pour la première fois
    this._scheduleAutoStart();
  }

  _scheduleAutoStart() {
    const go = () => {
      this._start();
      document.removeEventListener('click', go);
      document.removeEventListener('keydown', go);
    };
    // Essai immédiat (fonctionne si le navigateur autorise l'autoplay)
    this._start();
    // Fallback sur la première interaction utilisateur
    document.addEventListener('click', go, { once: true });
    document.addEventListener('keydown', go, { once: true });
  }

  _start() {
    if (this._started || this._tracks.length === 0) return;
    this._started = true;
    this._shuffle();
    this._play();
  }

  // Appelé manuellement si besoin (ex : après clic Jouer)
  start() { this._start(); }

  _shuffle() {
    this._playlist = [...this._tracks].sort(() => Math.random() - 0.5);
    this._idx = 0;
  }

  _play() {
    const raw = this._playlist[this._idx];
    const slash = raw.lastIndexOf('/');
    this._audio.src = raw.slice(0, slash + 1) + encodeURIComponent(raw.slice(slash + 1));
    this._audio.play().catch(() => {});
  }

  _next() {
    this._idx++;
    if (this._idx >= this._playlist.length) this._shuffle();
    this._play();
  }

  pause() {
    this._audio.pause();
  }

  resume() {
    if (this._started) this._audio.play().catch(() => {});
  }

  get volume() { return this._audio.volume; }

  setVolume(v) {
    this._audio.volume = Math.max(0, Math.min(1, parseFloat(v)));
    localStorage.setItem('sym_bgm_vol', String(this._audio.volume));
  }
}

window.musicManager = new MusicManager(MUSIC_TRACKS);

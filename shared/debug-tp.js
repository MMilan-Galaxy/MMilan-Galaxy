// Debug teleport menu - secret key: press "/" 3 times quickly
(function() {
  var presses = [], COMBO_MS = 800, TRIGGER_KEY = '/';
  var menu = null, visible = false;

  var DESTINATIONS = [
    { label: 'Vaisseau (Base)', url: '/index.html' },
    { label: 'Cockpit / Carte 3D', url: '/cockpit/index.html' },
    { label: '--- PLANETES ---', url: null },
    { label: 'Gambling', url: '/planets/gambling/index.html' },
    { label: 'Musique', url: '/planets/musique/index.html' },
    { label: 'Nourriture', url: '/planets/nourriture/index.html' },
    { label: 'Tron', url: '/planets/tron/index.html' },
    { label: 'Danse', url: '/planets/danse/index.html' },
    { label: 'Sable', url: '/planets/sable/index.html' },
    { label: 'Manga', url: '/planets/manga/index.html' },
  ];

  function getBasePath() {
    var path = window.location.pathname;
    var parts = path.split('/');
    // Find the project root by looking for known folders
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i] === 'cockpit' || parts[i] === 'planets' || parts[i] === 'base') {
        return parts.slice(0, i).join('/');
      }
    }
    // If we're at index.html root
    return parts.slice(0, -1).join('/');
  }

  function createMenu() {
    if (menu) return;
    menu = document.createElement('div');
    menu.id = 'debug-tp-menu';
    var basePath = getBasePath();
    var html = '<div class="dtp-title">TELEPORTATION</div>';
    DESTINATIONS.forEach(function(d) {
      if (!d.url) {
        html += '<div class="dtp-sep">' + d.label + '</div>';
      } else {
        html += '<a class="dtp-link" href="' + basePath + d.url + '">' + d.label + '</a>';
      }
    });
    html += '<div class="dtp-close" onclick="document.getElementById(\'debug-tp-menu\').style.display=\'none\'">FERMER [/]</div>';
    menu.innerHTML = html;
    document.body.appendChild(menu);

    var s = document.createElement('style');
    s.textContent = [
      '#debug-tp-menu{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;',
      'background:rgba(5,2,15,0.96);border:1px solid rgba(183,68,255,0.6);padding:24px 32px;min-width:280px;',
      'font-family:monospace;backdrop-filter:blur(12px);box-shadow:0 0 60px rgba(183,68,255,0.2)}',
      '.dtp-title{color:#b744ff;font-size:14px;font-weight:bold;letter-spacing:4px;text-align:center;margin-bottom:16px;text-shadow:0 0 12px rgba(183,68,255,0.5)}',
      '.dtp-link{display:block;color:rgba(200,200,255,0.8);text-decoration:none;padding:8px 12px;font-size:13px;letter-spacing:1px;transition:all 0.2s;border-left:2px solid transparent}',
      '.dtp-link:hover{color:#fff;background:rgba(183,68,255,0.15);border-left:2px solid #b744ff;padding-left:18px}',
      '.dtp-sep{color:rgba(183,68,255,0.4);font-size:10px;letter-spacing:3px;padding:12px 12px 4px;text-align:center}',
      '.dtp-close{text-align:center;margin-top:16px;color:rgba(255,100,100,0.6);font-size:10px;letter-spacing:2px;cursor:pointer;padding:6px}',
      '.dtp-close:hover{color:#ff6666}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function toggle() {
    createMenu();
    visible = !visible;
    menu.style.display = visible ? 'block' : 'none';
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === TRIGGER_KEY) {
      var now = Date.now();
      presses.push(now);
      presses = presses.filter(function(t) { return now - t < COMBO_MS; });
      if (presses.length >= 3) {
        presses = [];
        toggle();
      }
    }
    if (e.key === 'Escape' && visible) toggle();
  });
})();

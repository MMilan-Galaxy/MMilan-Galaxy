// =============================================
// crystals.js — Systeme de cristaux centralise
// Pas de localStorage — sessionStorage uniquement
// Reset automatique au lancement du jeu (index.html)
// Popup plein ecran a la fin de chaque planete
// Pas de compteur affiche
// =============================================
(function () {
  var STORAGE_KEY = "sd_crystals";
  var PLANETS = ["gambling","musique","nourriture","tron","danse","sable","manga"];
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch(e) { inIframe = true; }

  var NAMES = {
    gambling:"Gambling",musique:"Musique",nourriture:"Nourriture",
    tron:"Tron",danse:"Danse",sable:"Sable",manga:"Manga"
  };

  // --- Storage ---
  function getData() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; }
    catch(e) { return {}; }
  }
  function saveData(d) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch(e) {}
  }

  // --- API publique ---
  window.SpaceCrystals = {
    complete: function(planetId) {
      var d = getData();
      if (!d[planetId]) {
        d[planetId] = true;
        saveData(d);
        if (inIframe) {
          try { window.parent.postMessage({type:"crystal",planet:planetId}, "*"); }
          catch(e) {}
        }
        _showCrystalPopup(planetId);
      }
    },
    isComplete: function(planetId) {
      return !!getData()[planetId];
    },
    count: function() {
      var d = getData(), n = 0;
      for (var i = 0; i < PLANETS.length; i++) { if (d[PLANETS[i]]) n++; }
      return n;
    },
    total: PLANETS.length,
    reset: function() {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) {}
    }
  };

  // Ecouter les messages venant des iframes
  window.addEventListener("message", function(ev) {
    if (!ev.data) return;
    if (ev.data.type === "crystal" && ev.data.planet) {
      var d = getData();
      if (!d[ev.data.planet]) { d[ev.data.planet] = true; saveData(d); }
    }
    if (ev.data.type === "closePlanet") {
      if (typeof window.closePlanetGame === "function") window.closePlanetGame();
    }
  });

  // ── CSS ─────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById("sc-crystal-styles")) return;
    var s = document.createElement("style");
    s.id = "sc-crystal-styles";
    s.textContent = [
      "@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');",
      "@keyframes sc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}",
      "@keyframes sc-sparkle{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}",
      "@keyframes sc-diamond-spin{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}",
      "@keyframes sc-rays{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}",
      "@keyframes sc-btn-glow{0%,100%{box-shadow:0 0 20px rgba(183,68,255,0.3)}50%{box-shadow:0 0 40px rgba(183,68,255,0.7),0 0 60px rgba(255,215,0,0.2)}}",
      "",
      "#sc-crystal-popup{",
      "  position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;",
      "  background:rgba(4,2,12,0.95);opacity:0;pointer-events:none;transition:opacity 0.6s;",
      "}",
      "#sc-crystal-popup.visible{opacity:1;pointer-events:all}",
      "",
      "#sc-popup-rays{position:absolute;width:600px;height:600px;animation:sc-rays 20s linear infinite;opacity:0.15;pointer-events:none}",
      "#sc-popup-rays .ray{position:absolute;top:50%;left:50%;width:3px;height:300px;transform-origin:top center;background:linear-gradient(to bottom,rgba(183,68,255,0.8),transparent)}",
      "",
      "#sc-popup-diamond{font-size:120px;animation:sc-float 1.5s ease-in-out infinite;filter:drop-shadow(0 0 40px rgba(183,68,255,0.8));perspective:400px}",
      "#sc-popup-diamond span{display:inline-block;animation:sc-diamond-spin 4s ease-in-out infinite}",
      "",
      "#sc-popup-halo{position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(183,68,255,0.3) 0%,rgba(183,68,255,0.1) 40%,transparent 70%);pointer-events:none;animation:sc-float 2s ease-in-out infinite}",
      "",
      "#sc-popup-title{font-family:'Orbitron',sans-serif;font-size:42px;font-weight:900;color:#ffd700;margin-top:24px;text-shadow:0 0 30px rgba(255,215,0,0.5);letter-spacing:3px}",
      "#sc-popup-sub{font-family:'Orbitron',sans-serif;font-size:18px;color:rgba(183,68,255,0.8);margin-top:12px;letter-spacing:4px}",
      "",
      "#sc-popup-buttons{display:flex;gap:20px;margin-top:36px;flex-wrap:wrap;justify-content:center}",
      "#sc-popup-return,#sc-popup-continue{",
      "  font-family:'Orbitron',sans-serif;font-size:16px;font-weight:700;",
      "  padding:16px 40px;",
      "  background:linear-gradient(135deg,rgba(183,68,255,0.2),rgba(80,20,160,0.3));",
      "  border:2px solid rgba(183,68,255,0.6);color:#e0c0ff;",
      "  cursor:pointer;letter-spacing:3px;text-transform:uppercase;",
      "  clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);",
      "  animation:sc-btn-glow 2s ease-in-out infinite;",
      "  transition:all 0.3s;",
      "}",
      "#sc-popup-return:hover,#sc-popup-continue:hover{background:linear-gradient(135deg,rgba(183,68,255,0.4),rgba(80,20,160,0.5));color:#fff;transform:scale(1.05)}",
      "#sc-popup-continue{border-color:rgba(100,100,160,0.4);animation:none;color:rgba(180,180,210,0.7)}",
      "#sc-popup-continue:hover{border-color:rgba(183,68,255,0.5);color:#e0c0ff}",
      "",
      ".sc-sparkle{position:absolute;color:#ffd700;font-size:20px;animation:sc-sparkle 1.5s ease-in-out infinite;pointer-events:none}",
    ].join("\n");
    document.head.appendChild(s);
  }

  // ── Popup ───────────────────────────────────────────────────
  function _createPopup() {
    if (document.getElementById("sc-crystal-popup")) return;
    _injectStyles();
    var popup = document.createElement("div");
    popup.id = "sc-crystal-popup";

    var rays = '<div id="sc-popup-rays">';
    for (var r = 0; r < 12; r++) rays += '<div class="ray" style="transform:rotate(' + (r*30) + 'deg)"></div>';
    rays += '</div>';

    popup.innerHTML = rays +
      '<div id="sc-popup-halo"></div>' +
      '<div id="sc-popup-diamond"><span>\uD83D\uDC8E</span></div>' +
      '<div id="sc-popup-title">CRISTAL OBTENU !</div>' +
      '<div id="sc-popup-sub"></div>' +
      '<div id="sc-popup-buttons">' +
        '<button id="sc-popup-return">\u25C0 RETOUR AU SYST\u00C8ME SOLAIRE</button>' +
        '<button id="sc-popup-continue">CONTINUER \u25B6</button>' +
      '</div>';
    document.body.appendChild(popup);

    document.getElementById("sc-popup-return").addEventListener("click", function() {
      if (inIframe) {
        try { window.parent.postMessage({type:"closePlanet"}, "*"); } catch(e) {}
      }
      popup.classList.remove("visible");
    });
    document.getElementById("sc-popup-continue").addEventListener("click", function() {
      popup.classList.remove("visible");
    });
  }

  // ── Affichage popup ─────────────────────────────────────────
  function _showCrystalPopup(planetId) {
    var popup = document.getElementById("sc-crystal-popup");
    if (!popup) { _createPopup(); popup = document.getElementById("sc-crystal-popup"); }
    if (!popup) return;

    var sub = document.getElementById("sc-popup-sub");
    if (sub) sub.textContent = (NAMES[planetId] || planetId).toUpperCase() + " CONQUISE";

    var btns = document.getElementById("sc-popup-buttons");
    if (btns) btns.style.display = inIframe ? "flex" : "none";

    // Sparkles
    var existing = popup.querySelectorAll(".sc-sparkle");
    for (var i = 0; i < existing.length; i++) existing[i].remove();
    for (var j = 0; j < 16; j++) {
      var sp = document.createElement("span");
      sp.className = "sc-sparkle";
      sp.textContent = "\u2726";
      sp.style.left = (10 + Math.random() * 80) + "%";
      sp.style.top = (10 + Math.random() * 70) + "%";
      sp.style.animationDelay = (Math.random() * 2) + "s";
      sp.style.fontSize = (14 + Math.random() * 18) + "px";
      popup.appendChild(sp);
    }

    popup.classList.add("visible");

    // En parent, auto-fermer apres 4.5s
    if (!inIframe) {
      setTimeout(function() { popup.classList.remove("visible"); }, 4500);
    }
  }

  // Init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _createPopup);
  } else {
    _createPopup();
  }
})();

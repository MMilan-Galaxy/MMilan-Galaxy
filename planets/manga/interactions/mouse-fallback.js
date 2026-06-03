// Mouse fallback for hand-tracking mini-games
// Adds a "Mode Souris" button that auto-completes the game on long press
(function() {
  // Find completion ID from existing postMessage calls in this page
  var completionId = null;
  var scripts = document.querySelectorAll('script');
  for (var i = 0; i < scripts.length; i++) {
    var m = scripts[i].textContent.match(/interaction-complete.*?id:\s*['"]([^'"]+)['"]/);
    if (m) { completionId = m[1]; break; }
  }

  var btn = document.createElement('div');
  btn.id = 'mouse-fallback-btn';
  btn.innerHTML = '<div id="mf-bar"></div><span id="mf-text">🖱 MODE SOURIS (maintenir)</span>';
  document.body.appendChild(btn);

  var style = document.createElement('style');
  style.textContent = [
    '#mouse-fallback-btn {',
    '  position:fixed; bottom:30px; left:30px; z-index:99999;',
    '  width:220px; height:44px; border:1px solid rgba(255,200,100,0.5);',
    '  background:rgba(10,8,5,0.9); cursor:pointer; overflow:hidden;',
    '  display:flex; align-items:center; justify-content:center;',
    '  font-family:"Inter",sans-serif; font-size:11px; letter-spacing:1px;',
    '  color:rgba(255,200,100,0.8); user-select:none;',
    '  clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);',
    '}',
    '#mouse-fallback-btn:hover { border-color:rgba(255,200,100,0.8); }',
    '#mf-bar {',
    '  position:absolute;left:0;top:0;bottom:0;width:0%;',
    '  background:rgba(255,200,100,0.2);transition:width 0.05s linear;',
    '}',
    '#mf-text { position:relative; z-index:2; }',
    '#mouse-fallback-btn.done { border-color:#2d8f3a; color:#2d8f3a; }',
  ].join('\n');
  document.head.appendChild(style);

  var holding = false, startTime = 0, HOLD_MS = 2500, done = false;
  var bar = document.getElementById('mf-bar');
  var txt = document.getElementById('mf-text');

  function update() {
    if (done) return;
    if (holding) {
      var pct = Math.min((Date.now() - startTime) / HOLD_MS, 1);
      bar.style.width = (pct * 100) + '%';
      if (pct >= 1) {
        done = true;
        btn.classList.add('done');
        txt.textContent = '✓ COMPLÉTÉ';
        if (completionId) {
          try { window.parent.postMessage({ type: 'interaction-complete', id: completionId }, '*'); } catch(e) {}
        }
        // Also trigger any endMsg / success screen
        var endMsg = document.getElementById('endMsg');
        if (endMsg) endMsg.style.display = 'flex';
        return;
      }
    }
    requestAnimationFrame(update);
  }

  btn.addEventListener('mousedown', function(e) {
    if (done) return;
    e.preventDefault();
    holding = true; startTime = Date.now();
    update();
  });
  btn.addEventListener('mouseup', function() { holding = false; bar.style.width = '0%'; });
  btn.addEventListener('mouseleave', function() { holding = false; bar.style.width = '0%'; });
})();

class Fallback {
    constructor(type) {
        this.type = type    // "keyboard" | "mouse" | "click"
        this.active = false
        this._onSuccess = null
    }

    start(onSuccess) {
        this._onSuccess = onSuccess
        this.active = true
        this._attach()
    }

    stop() {
        this.active = false
        this._detach()
        this._hideUI()
    }

    // À surcharger dans les sous-classes
    _attach() { throw new Error('_attach() doit être implémenté') }
    _detach() { throw new Error('_detach() doit être implémenté') }
    _showUI() { }
    _hideUI() {
        const el = document.getElementById('fallback-container')
        if (el) el.classList.add('hidden')
    }

    _succeed() {
        this.stop()
        if (this._onSuccess) this._onSuccess()
    }
}

// -----------------------------------------------
// KeyboardFallback — séquence de touches
// Usage : new KeyboardFallback(['z','x','c'])
// -----------------------------------------------
class KeyboardFallback extends Fallback {
    constructor(sequence) {
        super('keyboard')
        this.sequence = sequence   // ex: ['z','x','c']
        this._index = 0
        this._bound = this._onKey.bind(this)
    }

    _attach() {
        this._index = 0
        this._showUI()
        window.addEventListener('keydown', this._bound)
    }

    _detach() {
        window.removeEventListener('keydown', this._bound)
    }

    _onKey(e) {
        if (!this.active) return
        const key = e.key.toLowerCase()
        if (key === this.sequence[this._index]) {
            this._index++
            this._highlightKey(this._index - 1)
            if (this._index >= this.sequence.length) this._succeed()
        } else {
            this._index = 0
            this._resetHighlights()
        }
    }

    _showUI() {
        const c = document.getElementById('fallback-container')
        if (!c) return
        c.classList.remove('hidden')
        c.innerHTML = `
        <p style="color:#7ec8ff;font-family:'Share Tech Mono',monospace;letter-spacing:3px;margin-bottom:16px;">
          // PROTOCOLE ALTERNATIF</p>
        <div id="fb-keys" style="display:flex;gap:12px;">
          ${this.sequence.map((k, i) => `
            <div id="fb-key-${i}" style="
              width:54px;height:54px;border:2px solid #505870;
              display:flex;align-items:center;justify-content:center;
              font-size:20px;font-family:'Share Tech Mono',monospace;
              color:#505870;text-transform:uppercase;border-radius:6px;
              transition:all .3s;">${k}</div>`).join('')}
        </div>`
    }

    _highlightKey(i) {
        const el = document.getElementById(`fb-key-${i}`)
        if (el) { el.style.borderColor = '#7ec8ff'; el.style.color = '#7ec8ff'; el.style.boxShadow = '0 0 10px #7ec8ff44' }
    }

    _resetHighlights() {
        this.sequence.forEach((_, i) => {
            const el = document.getElementById(`fb-key-${i}`)
            if (el) { el.style.borderColor = '#505870'; el.style.color = '#505870'; el.style.boxShadow = 'none' }
        })
    }
}

// -----------------------------------------------
// ClickZoneFallback — cliquer sur des zones
// Usage : new ClickZoneFallback(3)
// -----------------------------------------------
class ClickZoneFallback extends Fallback {
    constructor(nbZones, timeoutMs = 3000) {
        super('click')
        this.nbZones = nbZones
        this.timeout = timeoutMs
        this._current = 0
        this._timer = null
    }

    _attach() {
        this._current = 0
        this._showUI()
        this._spawnZone()
    }

    _detach() {
        clearTimeout(this._timer)
        const c = document.getElementById('fallback-container')
        if (c) c.innerHTML = ''
    }

    _spawnZone() {
        const c = document.getElementById('fallback-container')
        if (!c) return
        c.classList.remove('hidden')
        c.innerHTML = `
        <p style="color:#d0d8e8;font-family:'Share Tech Mono',monospace;margin-bottom:16px;">
          Clique avant disparition — ${this._current + 1}/${this.nbZones}</p>
        <div id="fb-zone" style="
          width:90px;height:90px;border:2px solid #c0392b;
          display:flex;align-items:center;justify-content:center;
          font-size:36px;cursor:pointer;border-radius:8px;transition:opacity .3s;">👁</div>`

        this._timer = setTimeout(() => { this._current = 0; this._spawnZone() }, this.timeout)

        document.getElementById('fb-zone').addEventListener('click', () => {
            clearTimeout(this._timer)
            this._current++
            if (this._current >= this.nbZones) this._succeed()
            else setTimeout(() => this._spawnZone(), 300)
        })
    }
}
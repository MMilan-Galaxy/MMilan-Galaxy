// interactions/Interaction1.js
class NinjaHandInteraction extends Interaction {
    constructor() {
        // D'abord appeler super() SANS le fallback
        super({
            name:      'Le Seuil des Ninjas',
            input:     'handpose',
            triggerFn: () => this._checkNinja(),
            onSuccess: () => this._onSuccess(),
            fallback:  null 
        })

        // Ensuite initialiser le fallback
        this.fallback = new KeyboardFallback(['z', 'x', 'c'])

        this._timer    = 0
        this._DUREE    = 60

        // Éléments DOM
        this.vElement  = document.getElementById('v_src')
        this.cElement  = document.getElementById('out')
        this.ctx       = this.cElement.getContext('2d')
        this.n         = document.getElementById('n')
        this.s         = document.getElementById('s')

        this.pwr       = [0, 0]
        this.wasOpen   = [false, false]
        this.hands     = []

        this._initCamera()
    }

    _initCamera() {
        const h = new Hands({
            locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
        })

        h.setOptions({
            maxNumHands:            2,
            modelComplexity:        1,
            minDetectionConfidence: 0.65,
            minTrackingConfidence:  0.65
        })

        h.onResults((res) => this._onResults(res))

        const cam = new Camera(this.vElement, {
            onFrame: async () => { await h.send({ image: this.vElement }) },
            width:  window.innerWidth,
            height: window.innerHeight
        })

        cam.start()
    }

    _onResults(res) {
        this.cElement.width  = window.innerWidth
        this.cElement.height = window.innerHeight

        this.ctx.save()
        this.ctx.clearRect(0, 0, this.cElement.width, this.cElement.height)

        let fL = false
        let fR = false

        this.n.style.display = 'none'
        this.s.style.display = 'none'

        this.hands = []

        if (res.multiHandLandmarks && res.multiHandedness) {
            res.multiHandLandmarks.forEach((pts, i) => {
                const label = res.multiHandedness[i].label
                const isR   = label === 'Right'
                const idx   = isR ? 1 : 0

                this.hands.push({ keypoints: pts, handedness: label })

                this.ctx.save()
                this.ctx.shadowBlur  = 10
                this.ctx.shadowColor = '#00fbff'
                drawConnectors(this.ctx, pts, HAND_CONNECTIONS, { color: '#00d4ff', lineWidth: 3 })
                drawLandmarks(this.ctx,  pts, { color: '#ffffff', lineWidth: 1, radius: 2 })
                this.ctx.restore()

                const open = this._isHandOpen(pts)
                this.pwr[idx] += open ? 0.05 : -0.15
                this.pwr[idx]  = Math.max(0, Math.min(1, this.pwr[idx]))

                if (open && !this.wasOpen[idx]) {
                    // GIF joue automatiquement, rien à faire
                }
                this.wasOpen[idx] = open

                const wrist = pts[0]
                const knk   = pts[9]

                if (this.pwr[idx] > 0.01) {
                    if (isR) {
                        fR = true
                        const tx = (wrist.x + knk.x) / 2
                        const ty = (wrist.y + knk.y) / 2
                        this.s.style.left    = `${(1 - tx) * window.innerWidth}px`
                        this.s.style.top     = `${ty * window.innerHeight}px`
                        this.s.style.display = 'block'
                        this.s.style.opacity = this.pwr[idx]
                    } else {
                        fL = true
                        const dx = knk.x - wrist.x
                        const dy = knk.y - wrist.y
                        const tx = knk.x + (dx * 0.8)
                        const ty = knk.y + (dy * 0.8)
                        this.n.style.left    = `${(1 - tx) * window.innerWidth}px`
                        this.n.style.top     = `${ty * window.innerHeight}px`
                        this.n.style.display = 'block'
                        this.n.style.opacity = this.pwr[idx]
                    }
                }
            })
        }

        if (!fL) {
            this.pwr[0] = Math.max(0, this.pwr[0] - 0.15)
            if (this.pwr[0] > 0.01) { this.n.style.display = 'block'; this.n.style.opacity = this.pwr[0] }
            this.wasOpen[0] = false
        }
        if (!fR) {
            this.pwr[1] = Math.max(0, this.pwr[1] - 0.15)
            if (this.pwr[1] > 0.01) { this.s.style.display = 'block'; this.s.style.opacity = this.pwr[1] }
            this.wasOpen[1] = false
        }

        this.ctx.restore()

        // Check le trigger à chaque frame
        this.check()
    }

    _checkNinja() {
        if (this.hands.length < 2) return false
        let ouvertes = 0
        this.hands.forEach(h => {
            if (this._isHandOpen(h.keypoints)) ouvertes++
        })
        if (ouvertes >= 2) {
            this._timer++
        } else {
            this._timer = 0
        }
        return this._timer >= this._DUREE
    }

    _isHandOpen(pts) {
        let count = 0
        const wrist = pts[0]
        const tips  = [8, 12, 16, 20]
        const pips  = [6, 10, 14, 18]
        for (let i = 0; i < tips.length; i++) {
            const tip = pts[tips[i]]
            const pip = pts[pips[i]]
            if (Math.hypot(tip.x - wrist.x, tip.y - wrist.y) >
                Math.hypot(pip.x - wrist.x, pip.y - wrist.y)) count++
        }
        return count >= 3
    }

    _onSuccess() {
        console.log('Interaction 1 réussie !')
        window.questSystem.completeQuest('ninja')
        window.crystalSystem.addCrystal()
    }
}
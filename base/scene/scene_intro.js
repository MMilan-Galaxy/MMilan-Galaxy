// =============================================
// scene_intro.js
// Scène d'introduction : dialogue avec le patron
// Dépend de : constants.js, config.js, dialogues.js, utils.js, ui.js, screen.js
// Toutes les coordonnées sont en espace LOCAL zone centrale (0 → 1920)
// =============================================

class Intro {

    constructor() {
        this.transitionLancee = false;
    }

    draw() {
        this._dessinePlanete();

        // Dialogue (uniquement si encore en mode dialogue)
        if (Config.mode.game == MODE.DIALOGUE && Config.currentStep.Dialogue < Dialogue.intro.length) {
            Config.selected.dialogueLine = Dialogue.intro[Config.currentStep.Dialogue];
            AfficherPatron();
            Bulle(
                Config.selected.dialogueLine,
                Config.setting.bullPosition,
                SCREEN.CENTER.w - Config.setting.bullMargin * 2
            );
        }

        // Retour vers le hub isométrique après l'intro
        if (Config.mode.game == MODE.JEU && !this.transitionLancee) {
            this.transitionLancee = true;
            lancerTransition(() => {
                Config.setting.listeScene.infoUtilisationJeu.setup();
            });
        }
    }

    // ---- Planète décorative — coordonnées locales 0→1920 ----
    _dessinePlanete() {
        push();
        noStroke();
        let cx = SCREEN.CENTER.w * 0.72;  // local : ~1382px
        let cy = SCREEN.H        * 0.38;

        // Halo atmosphérique
        for (let r = 320; r > 0; r -= 10) {
            fill(0, 60, 120, map(r, 0, 320, 120, 0));
            ellipse(cx, cy, r * 2);
        }

        // Corps de la planète
        fill(20, 60, 130);
        ellipse(cx, cy, 280);

        // Stries de surface
        stroke(30, 80, 160);
        strokeWeight(3);
        noFill();
        for (let i = -3; i <= 3; i++) {
            arc(cx, cy + i * 20, 280, 100, 0, PI);
        }
        pop();
    }
}

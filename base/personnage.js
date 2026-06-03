// =============================================
// personnage.js
// Visuel et animations réutilisables du personnage joueur.
// À utiliser dans toutes les scènes qui doivent afficher le joueur.
// Dépend de : constants.js, config.js
// =============================================

const PersonnageVisuel = {

    // Dessine le personnage joueur à une position locale de l'écran central.
    // options.animation : "idle", "marche", "entreeVaisseau"
    dessiner(x, y, options = {}) {
        const scalePerso = options.scale ?? 1;
        const animation  = options.animation || "idle";
        const direction  = options.direction ?? 1;
        const alpha      = options.alpha ?? 255;
        const t          = options.t ?? frameCount * 0.08;
        const phase      = animation === "marche" || animation === "entreeVaisseau" ? sin(t * 4) : sin(t) * 0.25;
        const bob        = animation === "idle" ? sin(t * 1.6) * 2 : abs(sin(t * 4)) * 5;
        const lean       = animation === "entreeVaisseau" ? -0.10 : 0;

        push();
        translate(x, y - bob);
        scale(direction * scalePerso, scalePerso);
        rotate(lean);

        drawingContext.globalAlpha = alpha / 255;

        // Ombre au sol
        noStroke();
        fill(0, 0, 0, 85);
        ellipse(0, 74 + bob, 72, 18);

        // Halo cyberpunk
        for (let r = 70; r > 0; r -= 12) {
            fill(0, 255, 165, map(r, 0, 70, 28, 0));
            ellipse(0, 16, r * 1.35, r * 1.6);
        }

        // Jambes animées
        strokeWeight(8);
        strokeCap(ROUND);
        stroke(COULEURS.accent);
        line(-13, 36, -22 - phase * 8, 68);
        line(13, 36, 22 + phase * 8, 68);
        stroke(COULEURS.violet || "#4B2C82");
        strokeWeight(5);
        line(-22 - phase * 8, 68, -32 - phase * 12, 78);
        line(22 + phase * 8, 68, 32 + phase * 12, 78);

        // Corps / veste
        noStroke();
        fill(10, 24, 38, alpha);
        rect(-24, -12, 48, 56, 12);
        fill("#4B2C82");
        rect(-20, -8, 40, 50, 10);
        fill(0, 255, 165, 80);
        rect(-4, -7, 8, 48, 4);

        // Bras animés
        strokeWeight(7);
        strokeCap(ROUND);
        stroke("#00CFFF");
        line(-24, 0, -40 + phase * 10, 28);
        line(24, 0, 40 - phase * 10, 28);
        stroke("#00FFA5");
        strokeWeight(5);
        line(-40 + phase * 10, 28, -44 + phase * 7, 45);
        line(40 - phase * 10, 28, 44 - phase * 7, 45);

        // Cou
        noStroke();
        fill(224, 174, 142, alpha);
        rect(-8, -26, 16, 18, 5);

        // Tête / casque léger
        fill(229, 184, 151, alpha);
        ellipse(0, -47, 42, 48);
        fill(6, 14, 26, 230);
        arc(0, -52, 48, 44, PI, TWO_PI);
        stroke("#00FFA5");
        strokeWeight(2.5);
        noFill();
        arc(0, -51, 54, 52, PI + 0.15, TWO_PI - 0.15);

        // Visière / yeux
        noStroke();
        fill(0, 207, 255, 220);
        rect(-18, -49, 36, 8, 5);
        fill(255, 255, 255, 110);
        rect(-14, -48, 11, 2, 2);

        // Petites particules énergétiques
        if (animation === "entreeVaisseau") {
            noStroke();
            fill(0, 255, 165, 180);
            ellipse(-34 + sin(t * 5) * 6, -14 + cos(t * 4) * 10, 5, 5);
            ellipse(36 + cos(t * 4) * 8, 20 + sin(t * 5) * 8, 4, 4);
        }

        drawingContext.globalAlpha = 1;
        pop();
    },

    // Animation complète d'entrée vers un point cible.
    dessinerEntreeVaisseau(start, end, progression, options = {}) {
        const t = constrain(progression, 0, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2;
        const arc = sin(ease * PI) * (options.hauteurArc ?? 55);
        const x = lerp(start.x, end.x, ease);
        const y = lerp(start.y, end.y, ease) - arc;
        const scalePerso = lerp(options.scaleStart ?? 1.05, options.scaleEnd ?? 0.48, ease);
        const alpha = lerp(255, 75, max(0, (ease - 0.78) / 0.22));

        push();

        // Traînée lumineuse du déplacement
        noFill();
        strokeWeight(3);
        for (let i = 0; i < 5; i++) {
            const p = max(0, ease - i * 0.055);
            const tx = lerp(start.x, end.x, p);
            const ty = lerp(start.y, end.y, p) - sin(p * PI) * (options.hauteurArc ?? 55);
            stroke(0, 255, 165, map(i, 0, 4, 95, 12));
            ellipse(tx, ty + 40, 60 - i * 8, 18 - i * 2);
        }

        // Câble/ligne de parcours
        stroke(COULEURS.accent + "66");
        strokeWeight(2);
        line(start.x, start.y + 46, x, y + 46);

        this.dessiner(x, y, {
            scale: scalePerso,
            animation: "entreeVaisseau",
            direction: 1,
            alpha,
            t: frameCount * 0.08,
        });

        pop();

        return { x, y, ease };
    }
};

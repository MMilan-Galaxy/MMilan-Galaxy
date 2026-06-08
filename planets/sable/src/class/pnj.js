// ========================================== CLASSE PNJ GLOBAL ==========================================
class PNJ {
    constructor(x, y, col, message = null) {
        this.x = x;
        this.y = y;
        this.col = col;
        this.message = message;
        this._voixJouee = false; // Empêche le rejeu à chaque frame tant que E est enfoncé
    }

    display() {
        push();
        rectMode(CENTER); ellipseMode(CENTER); noStroke();

        // Corps / Épaules
        fill(this.col);
        rect(this.x, this.y, 95, 70, 10);

        // Tête et cheveux
        fill('#8d5524'); ellipse(this.x, this.y, 40, 40);
        fill(60, 40, 20); ellipse(this.x, this.y - 3, 44, 44);

        // Interaction Proximité
        let d = dist(user.x, user.y, this.x, this.y);
        if (this.message && d < 160) {
            if (keyIsPressed && (key === 'e' || key === 'E')) {
                drawBulle(this.x + 35, this.y - 65, this.message, 360);

                // Déclencher la voix une seule fois à l'appui de E
                if (!this._voixJouee && voixAutorisee) {
                    this._voixJouee = true;
                    parlerVoix(this.message, { pitch: 1.0, rate: 0.9 });
                }
            } else {
                // E relâché → on remet le flag à false pour permettre un prochain déclenchement
                this._voixJouee = false;

                fill(255); rect(this.x, this.y - 60, 64, 52, 8);
                fill(0); textSize(35); textStyle(BOLD); textAlign(CENTER, CENTER);
                text("E", this.x, this.y - 60);
            }
        } else {
            // Joueur s'éloigne → reset aussi
            this._voixJouee = false;
        }

        pop();
    }
}

class FacePNJ {
    constructor(x, y, colorUniform, message = null) {
        this.x = x;
        this.y = y;
        this.w = 90;
        this.h = 90;
        this.message = message;
        this.colorUniform = colorUniform;
        this.colorSkin = color(240, 200, 180);
        this.colorHair = color(60, 40, 20);
        this.colorPants = color(30);
        this._voixJouee = false; // Même flag anti-spam
    }

    display() {
        push();
        translate(this.x, this.y - this.h / 3);
        rectMode(CENTER); ellipseMode(CENTER); noStroke();

        // JAMBES
        fill(this.colorPants);
        rect(-25, 75, 30, 40, 2);
        rect(25, 75, 30, 40, 2);

        // CORPS
        fill(this.colorUniform);
        rect(0, 0, 83, 117, 5);
        rect(-47, -7, 23, 67, 2);
        rect(47, -7, 23, 67, 2);

        fill(this.colorSkin);
        ellipse(-47, 27, 27, 27);
        ellipse(47, 27, 27, 27);

        // TÊTE
        push();
        translate(0, -80);
        fill(this.colorHair);
        ellipse(0, -12, 75, 67);
        fill(this.colorSkin);
        ellipse(0, 0, 70, 75);
        fill(this.colorHair);
        arc(0, -20, 75, 58, PI, TWO_PI);
        fill(50);
        ellipse(-15, 0, 12, 12);
        ellipse(15, 0, 12, 12);
        pop();

        pop();

        // INTERACTION PROXIMITÉ
        let d = dist(user.x, user.y, this.x, this.y);

        if (this.message && d < 160) {
            push();
            if (keyIsPressed && (key === 'e' || key === 'E')) {
                drawBulle(this.x + 35, this.y - 140, this.message, 360);

                // Déclencher la voix une seule fois à l'appui de E
                if (!this._voixJouee && voixAutorisee) {
                    this._voixJouee = true;
                    parlerVoix(this.message, { pitch: 1.0, rate: 0.9 });
                }
            } else {
                // E relâché → reset flag
                this._voixJouee = false;

                rectMode(CENTER);
                fill(255);
                rect(this.x, this.y - 140, 64, 52, 8);
                fill(0);
                textSize(35);
                textStyle(BOLD);
                textAlign(CENTER, CENTER);
                text("E", this.x, this.y - 140);
            }
            pop();
        } else {
            this._voixJouee = false;
        }
    }
}
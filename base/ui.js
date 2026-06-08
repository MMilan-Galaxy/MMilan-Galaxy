// =============================================
// ui.js
// Composants UI réutilisables (bulle de dialogue, ...)
// Dépend de : constants.js, config.js
// =============================================


// Dessine une bulle de dialogue avec le texte et les réponses éventuelles
function Bulle(dialogue, position, taille) {
    if (!dialogue) return;

    let bullH = tailleElement("bulle", "hauteur", Config.setting.bullSize);

    push();

    // ---- Ombre portée ----
    noStroke();
    fill(0, 0, 0, 80);
    rect(position.x + 6, position.y + 6, taille, bullH, 20);

    // ---- Corps de la bulle ----
    fill(COULEURS.bulle);
    stroke(COULEURS.bulleBord);
    strokeWeight(1.5);
    rect(position.x, position.y, taille, bullH, 16);

    // ---- Queue de bulle ----
    noStroke();
    fill(COULEURS.bulle);
    triangle(
        position.x + 30,  position.y + bullH,
        position.x + 100, position.y + bullH,
        position.x + 30,  position.y + bullH + 50
    );
    stroke(COULEURS.bulleBord);
    strokeWeight(1.5);
    line(position.x + 30,  position.y + bullH,
         position.x + 30,  position.y + bullH + 50);
    line(position.x + 30,  position.y + bullH + 50,
         position.x + 100, position.y + bullH);

    // ---- Nom du personnage ----
    noStroke();
    fill(COULEURS.accent);
    textSize(tailleElement("bulle", "nom", 14));
    textAlign(LEFT, TOP);
    text(dialogue.personne.toUpperCase(),
         position.x + Config.setting.bullPadding,
         position.y + Config.setting.bullPadding);

    // ---- Ligne décorative ----
    stroke(COULEURS.accent + "55");
    strokeWeight(1);
    line(
        position.x + Config.setting.bullPadding,
        position.y + Config.setting.bullPadding + 22,
        position.x + taille - Config.setting.bullPadding,
        position.y + Config.setting.bullPadding + 22
    );

    // ---- Texte principal ----
    noStroke();
    fill(COULEURS.texte);
    textSize(tailleElement("bulle", "texte", 18));
    textAlign(LEFT, TOP);
    text(dialogue.phrase,
         position.x + Config.setting.bullPadding,
         position.y + Config.setting.bullPadding + 35,
         taille - Config.setting.bullPadding * 2);

    // ---- Réponses (si question) ----
    if (dialogue.reponse != null) {
        let space = 100;
        dialogue.reponse.forEach((reponse, index) => {
            Config.selected.question = dialogue.reponse;
            let actif = index == Config.selected.reponse;
            textSize(tailleElement("bulle", "reponse", 15));

            if (actif) {
                noStroke();
                fill(COULEURS.accent + "22");
                rect(
                    position.x + Config.setting.bullPadding - 6,
                    position.y + Config.setting.bullPadding + space - 4,
                    taille - Config.setting.bullPadding * 2,
                    24, 6
                );
            }

            fill(actif ? COULEURS.accent : COULEURS.texteSombre);
            text((index + 1) + ".  " + reponse.phrase,
                 position.x + Config.setting.bullPadding + 10,
                 position.y + Config.setting.bullPadding + space);
            space += 30;
        });
    }

    // ---- Indicateur [E] pour continuer ----
    let indicW = 180;
    let indicX = position.x + taille - indicW - 10;
    let indicY = position.y + bullH - 36;
    fill(COULEURS.accent + "22");
    noStroke();
    rect(indicX, indicY, indicW, 26, 6);
    fill(COULEURS.accent);
    textSize(tailleElement("bulle", "continuer", 13));
    textAlign(CENTER, CENTER);
    text("[E]  Continuer", indicX + indicW / 2, indicY + 13);

    pop();
}


// ---- Portrait du patron pendant les dialogues ----
function AfficherPatron() {
    push();

    // Toutes les scènes appellent cette fonction depuis dessineEcranCentre(),
    // donc les coordonnées sont locales à l'écran central.
    const x = 80;
    const y = SCREEN.H - 420;

    noStroke();

    // Halo
    fill(0, 255, 200, 40);
    ellipse(x + 90, y + 120, 240, 240);

    // Corps
    fill(35, 45, 70);
    rect(x + 40, y + 180, 100, 120, 18);

    // Tête
    fill(230);
    ellipse(x + 90, y + 110, 95, 95);

    // Yeux cyber
    fill(0, 255, 200);
    ellipse(x + 72, y + 105, 10, 10);
    ellipse(x + 108, y + 105, 10, 10);

    // Casque
    noFill();
    stroke(0, 255, 200);
    strokeWeight(3);
    arc(x + 90, y + 100, 120, 120, PI, TWO_PI);

    pop();
}

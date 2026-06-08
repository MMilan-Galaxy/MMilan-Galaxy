// ========================================== VARIABLES GLOBALES - VUE VILLE ==========================================
let pnj = [];
let pnjBiblio = [];
let monFeu;
let sonFeu;
let applaudis;
let sonApplaudis;
let sonBiblio;          //  Son de réponse du Maître des lieux
let voix;               // Instance de reconnaissance vocale
let maitreParle = false;        //  true pendant que le son joue
let afficherBulleMaitre = false; // true pour afficher la bulle de réponse
let tempsBulleMaitre = 0;        // timestamp du déclenchement

const VILLE_WIDTH = 5760;
const VILLE_HEIGHT = 1200;

const desertColor = '#edc9af';
const desertRouteColor = '#e2bc8a';

// Variables pour le système d'interrupteur (Touche L)
let courantRétabli = false;
const INTERRUPTEUR_X = 400;
const INTERRUPTEUR_Y = 200;

let affichageBulleLevier = false;
let tpsBulleLevier = 0;
let toucheLongeeEnfoncee = false;
let voixAutorisee = false;

// ==========================================
// LAMPE ET BIBLIOTHÈQUE DANS LE NOIR
// ==========================================
let joueurPossedeLampe = false;   // true après achat au désert
let aVisiteBibliotheque = false;  // true dès la 1ère entrée en bibliothèque
let voixIndicateurJouee = false;  // true après que le PNJ indicateur a parlé

// ==========================================
// VARIABLES VOIX SYNTHÉTIQUES (Web Speech API)
// ==========================================
let voixVilleJouee = false;
let voixBiblioJouee = false;

const VOIX_ACCUEIL_VILLE =
    "Bienvenue dans notre village du désert ! " +
    "Utilisez les flèches directionnelles ou Z Q S D pour vous déplacer. " +
    "Approchez-vous des habitants et appuyez sur E pour leur parler. " +
    "Votre but est de trouver la Grande Bibliothèque à l'est du village, " +
    "suivez le panneau indicateur. Bonne exploration !";

const VOIX_ACCUEIL_BIBLIO =
    "Vous entrez dans la Grande Bibliothèque. " +
    "Il fait nuit noire ici ! " +
    "Sans lumière, vous ne pouvez rien voir. " +
    "Peut-être qu'un habitant du village sait comment éclairer cet endroit...";

// ==========================================
// FONCTION UTILITAIRE : PARLER AVEC LA VOIX DE SYNTHÈSE
// ==========================================
function parlerVoix(texte, options = {}) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = options.lang || 'fr-FR';
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    const voixDispo = window.speechSynthesis.getVoices();
    const voixFR = voixDispo.find(v => v.lang.startsWith('fr'));
    if (voixFR) utterance.voice = voixFR;

    if (options.onEnd) utterance.onend = options.onEnd;
    window.speechSynthesis.speak(utterance);
}

voix = new Voix();
voix.ajouterMotCle(["bonjour", "salam"], () => { /* jouer le son */ });

window.addEventListener('pointerdown', () => { voixAutorisee = true; }, { once: true, capture: true });
window.addEventListener('keydown', () => { voixAutorisee = true; }, { once: true, capture: true });

// ========================================== CHARGEMENT DES RESSOURCES ==========================================
function preload() {
    sonFeu = loadSound('assets/sounds/sonFeu.mp3');
    sonApplaudis = loadSound('assets/sounds/sonApplaudis.wav');
    sonBiblio = loadSound('assets/sounds/sonBiblio.mp3');
}

// ========================================== INITIALISATION DE LA VILLE & SES SALLES ==========================================
function setupVilleViews(views) {

    // -------------------------------------------------------------------------
    // SALLE 1 : LA VILLE GLOBALE
    // -------------------------------------------------------------------------
    views["entree_ville"] = new View("La Ville", '#ffedbc', "TOP");
    pnj = [];

    monFeu = new Feu(2880, 620);
    if (sonFeu) {
        sonFeu.loop();
        sonFeu.setVolume(0);
    }

    let dataPNJ = [
        { x: 1000, y: 620, color: color(180, 2, 60), message: "Bienvenue dans le village !" },
        { x: 1420, y: 950, color: color(20, 90, 20), message: "Salutations, voyageur !" },
        { x: 3400, y: 620, color: color(170, 100, 150), message: "A la bibliothèque la réponse tu auras" },
        { x: 5300, y: 1000, color: color(0, 120, 120), message: "La bibliothèque est plongée dans le noir...aide-moi !" },
    ];

    let dataPNJ2 = [
        { x: 1420, y: 350, color: color(150, 20, 100) },
        { x: 2600, y: 650, color: color(100, 150, 200) },
        { x: 3720, y: 350, color: color(150, 20, 100) },
        // PNJ muet — révèle le marchand de lampe SEULEMENT après 1ère visite biblio
        { x: 4700, y: 700, color: color(90, 70, 40), _indicateur: true },
    ];

    for (let d of dataPNJ) pnj.push(new PNJ(d.x, d.y, d.color, d.message));
    for (let d of dataPNJ2) {
        let p = new PNJ(d.x, d.y, d.color);
        if (d._indicateur) p._indicateur = true;
        pnj.push(p);
    }

    // -------------------------------------------------------------------------
    // INITIALISATION DES PNJ DE LA BIBLIOTHÈQUE GÉANTE
    // -------------------------------------------------------------------------
    pnjBiblio = [];
    pnjBiblio.push(new PNJ(2880, 380, color(0, 80, 150)));
    pnjBiblio.push(new PNJ(800, 700, color(80, 80, 80), "Tu cherches des réponses ? Peut-être que les vieux grimoires en ont..."));
    pnjBiblio.push(new PNJ(1400, 350, color(100, 100, 50), "Le maitre connaît le chemin demande lui !"));
    pnjBiblio.push(new PNJ(4200, 400, color(10, 200, 110), "On m'a dit que le désert avait des secrets sur le temple..."));

    voix = new Voix();

    voix.ajouterMotCle(["bonjour", "salam"], () => {
        if (currentView !== "bibliotheque") return;
        if (maitreParle) return;

        let maitre = pnjBiblio[0];
        let d = dist(user.x, user.y, maitre.x, maitre.y);
        if (d > 600) return;

        if (sonBiblio && !sonBiblio.isPlaying()) {
            sonBiblio.play();
            maitreParle = true;
            afficherBulleMaitre = true;
            tempsBulleMaitre = millis();
            sonBiblio.onended(() => { maitreParle = false; });
        }
    });

    // =========================================================
    // RENDU DE LA VILLE
    // =========================================================
    views["entree_ville"].displayContent = function () {
        push();
        rectMode(CORNER); ellipseMode(CENTER);

        // ---- VOIX D'ACCUEIL VILLE (une seule fois à l'entrée) ----
        if (!voixVilleJouee && voixAutorisee) {
            voixVilleJouee = true;
            parlerVoix(VOIX_ACCUEIL_VILLE, { rate: 0.85, pitch: 1.05 });
        }

        background(desertColor);

        // Chemins
        noStroke(); fill(desertRouteColor);
        rect(0, 500, VILLE_WIDTH, 250);
        rect(1300, 0, 250, VILLE_HEIGHT);
        rect(3600, 0, 250, VILLE_HEIGHT);

        // Barrières de rochers
        drawRocherTop(1350, 60, 1.6); drawRocherTop(1425, 60, 1.5); drawRocherTop(1500, 60, 1.7);
        drawRocherTop(1350, 1140, 1.6); drawRocherTop(1425, 1140, 1.5); drawRocherTop(1500, 1140, 1.7);
        drawRocherTop(3650, 60, 1.6); drawRocherTop(3725, 60, 1.5); drawRocherTop(3800, 60, 1.7);
        drawRocherTop(3650, 1140, 1.6); drawRocherTop(3725, 1140, 1.5); drawRocherTop(3800, 1140, 1.7);

        // Maisons
        drawDesertMaisonTop(300, 40, 600, 450);
        drawDesertMaisonTop(1600, 40, 500, 450);
        drawDesertMaisonTop(2100, 760, 600, 430);
        drawDesertMaisonTop(4200, 40, 600, 450);
        drawDesertMaisonTop(4600, 760, 550, 430);

        for (let p of pnj) p.display();

        // PNJ indicateur : affiche son dialogue seulement si le joueur a déjà visité la bibliothèque
        for (let p of pnj) {
            if (!p._indicateur) continue;
            if (!aVisiteBibliotheque) continue;
            if (typeof user === 'undefined') continue;
            let d = dist(user.x, user.y, p.x, p.y);
            if (d < 200) {
                // Déclencher la voix une seule fois à l'approche
                if (!voixIndicateurJouee && voixAutorisee) {
                    voixIndicateurJouee = true;
                    parlerVoix(
                        "Psst ! Le marchand Hassan dans le désert vend une lampe à huile. Elle coûte vingt-cinq pièces d'or. Elle t'aidera à voir dans la bibliothèque.",
                        { rate: 0.82, pitch: 0.75 }
                    );
                }
                push();
                let msg = "Psst... Le marchand Hassan dans le désert vend une lampe à huile. Elle coûte 25 pièces d'or.";
                rectMode(CORNER); textAlign(LEFT, TOP); textSize(20); textStyle(BOLD);
                let mots = msg.split(' ');
                let lignes = [], ligne = '', maxLarg = 420;
                for (let mot of mots) {
                    let cand = ligne ? ligne + ' ' + mot : mot;
                    if (textWidth(cand) <= maxLarg) { ligne = cand; }
                    else { if (ligne) lignes.push(ligne); ligne = mot; }
                }
                if (ligne) lignes.push(ligne);
                let lh = 26, pad = 14;
                let bw = maxLarg + pad * 2;
                let bh = lignes.length * lh + pad * 2;
                let bx = p.x - bw / 2, by = p.y - bh - 60;
                noStroke(); fill(0, 170); rect(bx, by, bw, bh, 10);
                fill(255, 230, 120);
                for (let i = 0; i < lignes.length; i++) {
                    text(lignes[i], bx + pad, by + pad + i * lh);
                }
                // Petite flèche vers le PNJ
                fill(0, 170);
                triangle(p.x - 14, by + bh, p.x + 14, by + bh, p.x, p.y - 50);
                pop();
            }
        }

        monFeu.display();

        drawCactusTop(1100, 200, 1.5);
        drawCactusTop(2800, 1000, 1);
        drawCactusTop(3900, 350, 1.2);
        drawCactusTop(5100, 300, 1.3);
        drawRocherTop(950, 850, 1.4);
        drawRocherTop(3400, 300, 1.1);

        porte(40, 625, 150, 230, "entree", 900, 740, { color: color(218, 165, 32), alpha: 220 });

        drawGrandPanneau(VILLE_WIDTH - 320, 450, "BIBLIOTHEQUE ->");

        porte(VILLE_WIDTH - 40, 625, 100, 250, "bibliotheque", 150, 625, { color: color(226, 188, 138), alpha: 0 });

        let desertPNJ = pnj.find(pp => pp.alwaysShowMessage);
        if (desertPNJ) {
            push();
            rectMode(CENTER); textAlign(CENTER, CENTER); textSize(24);
            let bx = desertPNJ.x;
            let by = desertPNJ.y - 100;
            let paddingX = 20; let paddingY = 12;
            let tw = textWidth(desertPNJ.message) + paddingX * 2;
            let th = 24 + paddingY * 2;
            fill(255, 250); stroke(0, 120); strokeWeight(2);
            rect(bx, by, tw, th, 8);
            noStroke(); fill(255, 250);
            triangle(bx - 12, by + th / 2, bx + 12, by + th / 2, bx, desertPNJ.y - 20);
            fill(0); noStroke();
            text(desertPNJ.message, bx, by);
            pop();
        }

        // Message d'aide fixe en bas à gauche de l'écran
        push();
        resetMatrix();
        rectMode(CORNER); textAlign(LEFT, TOP); textSize(30); textStyle(BOLD);
        const ligne1 = "Bienvenue dans notre village, bon voyage à toi !";
        const ligne2 = "Discute avec les habitants et explore pour trouver des indices !";
        const padding = 14; const interligne = 8;
        const boxWidth = max(textWidth(ligne1), textWidth(ligne2)) + padding * 2;
        const boxHeight = 30 * 2 + interligne + padding * 2;
        const boxX = 16; const boxY = height - boxHeight - 16;
        noStroke(); fill(0, 140); rect(boxX, boxY, boxWidth, boxHeight, 8);
        fill(255);
        text(ligne1, boxX + padding, boxY + padding);
        text(ligne2, boxX + padding, boxY + padding + 30 + interligne);
        pop();

        pop();
    };

    // =========================================================
    // SALLE 2 : LA GRANDE BIBLIOTHÈQUE
    // =========================================================
    views["bibliotheque"] = new View("La Grande Bibliothèque", '#3e2723', "TOP");

    views["bibliotheque"].displayContent = function () {
        push();
        rectMode(CORNER); ellipseMode(CENTER);

        // ---- Marquer la première visite en bibliothèque ----
        aVisiteBibliotheque = true;

        // ---- VOIX D'ACCUEIL BIBLIOTHÈQUE (une seule fois à l'entrée) ----
        if (!voixBiblioJouee && voixAutorisee) {
            voixBiblioJouee = true;
            parlerVoix(VOIX_ACCUEIL_BIBLIO, { rate: 0.83, pitch: 0.93 });
        }

        background('#dfc09f');

        // Murs physiques invisibles
        mur(0, 0, VILLE_WIDTH, 80);
        mur(0, 0, 80, VILLE_HEIGHT);
        mur(VILLE_WIDTH - 80, 0, 80, VILLE_HEIGHT);
        mur(0, VILLE_HEIGHT - 80, VILLE_WIDTH, 80);

        // ================= AGENCEMENT DES ÉTAGÈRES =================
        let couleursLivres = ['#cd3939', '#4682b4', '#8a4606', '#163fb2', '#9f04a7'];

        // --- ZONE OUEST ---
        drawEtagereFixe(200, 750, 400, 60, couleursLivres);
        drawEtagereFixe(800, 200, 400, 60, couleursLivres);
        drawEtagereFixe(800, 380, 400, 60, couleursLivres);
        drawEtagereFixe(300, 300, 60, 300, couleursLivres);
        drawEtagereFixe(600, 450, 60, 450, couleursLivres);

        // --- ZONE CENTRALE ---
        fill('#ea2525'); noStroke();
        rect(2000, 550, 1760, 140);
        fill('#ffb300'); rect(2000, 550, 1760, 10); rect(2000, 680, 1760, 10);

        drawEtagereFixe(4000, 200, 60, 800, couleursLivres);

        // Bureau Royal
        mur(2730, 460, 300, 80);
        fill(62, 39, 35); rect(2730, 460, 300, 80, 6);
        fill(250); rect(2800, 480, 50, 40);

        drawLampeTorche(2700, 430, courantRétabli);
        drawLampeTorche(3060, 430, courantRétabli);

        // Tables d'étude
        fill(109, 76, 65);
        rect(2300, 300, 200, 90, 4); mur(2300, 300, 200, 90);
        rect(3260, 300, 200, 90, 4); mur(3260, 300, 200, 90);
        rect(2300, 850, 200, 90, 4); mur(2300, 850, 200, 90);
        rect(3260, 850, 200, 90, 4); mur(3260, 850, 200, 90);

        // --- ZONE EST ---
        drawEtagereFixe(4800, 200, 300, 60, couleursLivres);
        drawEtagereFixe(4300, 900, 800, 60, couleursLivres);
        drawEtagereFixe(4500, 400, 60, 350, couleursLivres);
        drawEtagereFixe(5100, 400, 60, 350, couleursLivres);

        fill(88); rect(1500, 850, 80, 80, 2); mur(1500, 850, 80, 80);

        // ================= TORCHES ALIGNÉES =================
        for (let xTorche = 300; xTorche < VILLE_WIDTH; xTorche += 600) {
            drawLampeTorche(xTorche, 110, courantRétabli);
            drawLampeTorche(xTorche, VILLE_HEIGHT - 110, courantRétabli);
        }

        drawGrosInterrupteur(INTERRUPTEUR_X, INTERRUPTEUR_Y);
        drawLampeTorche(INTERRUPTEUR_X + 120, INTERRUPTEUR_Y, true);

        for (let p of pnjBiblio) p.display();

        // Bulle permanente au-dessus du Maître
        push();
        let maitreAff = pnjBiblio[0];
        let bulleTexte = "Dire 'Salam' pour lui parler";
        let bx = maitreAff.x; let by = maitreAff.y - 80;
        textSize(25); textStyle(BOLD);
        let tw = textWidth(bulleTexte) + 28; let th = 44;
        rectMode(CENTER); textAlign(CENTER, CENTER);
        fill(255, 245); stroke(0, 100); strokeWeight(1.5);
        rect(bx, by, tw, th, 10);
        noStroke(); fill(0, 180);
        triangle(bx - 10, by + th / 2, bx + 10, by + th / 2, bx, maitreAff.y - 20);
        fill(50); noStroke();
        text(bulleTexte, bx, by);
        pop();

        // Démarrer / arrêter la détection vocale
        let maitre = pnjBiblio[0];
        let distanceMaitre = dist(user.x, user.y, maitre.x, maitre.y);
        let joueurProcheMAitre = voixAutorisee && distanceMaitre <= 600;
        if (joueurProcheMAitre && !voix.active) {
            voix.demarrer();
        } else if (!joueurProcheMAitre && voix.active) {
            voix.arreter();
        }

        // ================= EFFET SOMBRE =================
        // Sans courant : nuit totale. La lampe à huile crée un halo autour du joueur.
        // Avec courant (interrupteur ON) : bibliothèque complètement éclairée.
        if (!courantRétabli) {
            if (joueurPossedeLampe && typeof user !== 'undefined') {
                // Halo de lumière de la lampe autour du joueur
                // On dessine le noir en laissant un cercle lumineux
                let ux = user.x, uy = user.y;
                let rayonHalo = 220;
                let rayonVif  = 90;

                // Couverture noire totale via masque radial dessiné en drawingContext
                drawingContext.save();
                let grd = drawingContext.createRadialGradient(ux, uy, rayonVif, ux, uy, rayonHalo);
                grd.addColorStop(0,   'rgba(0,0,0,0)');
                grd.addColorStop(0.6, 'rgba(0,0,0,0.82)');
                grd.addColorStop(1,   'rgba(0,0,0,0.97)');

                // Rectangle plein noir d'abord
                drawingContext.fillStyle = 'rgba(0,0,0,0.97)';
                drawingContext.fillRect(0, 0, VILLE_WIDTH, VILLE_HEIGHT);

                // Perce le halo en mode destination-out
                drawingContext.globalCompositeOperation = 'destination-out';
                drawingContext.fillStyle = grd;
                drawingContext.beginPath();
                drawingContext.arc(ux, uy, rayonHalo, 0, Math.PI * 2);
                drawingContext.fill();
                drawingContext.restore();

                // Teinte chaude de la flamme
                noStroke();
                fill(255, 180, 60, 30);
                ellipse(ux, uy, rayonVif * 2.5, rayonVif * 2.5);

                // Icône lampe au-dessus du joueur
                push();
                textSize(22); textAlign(CENTER, CENTER); noStroke();
                text("🪔", ux, uy - 55);
                // Indication interrupteur si proche
                let dI = dist(ux, uy, INTERRUPTEUR_X, INTERRUPTEUR_Y);
                if (dI < 250) {
                    fill(255, 240, 150); textSize(18);
                    text("L - ENCLENCHER LE LEVIER", INTERRUPTEUR_X, INTERRUPTEUR_Y + 70);
                }
                pop();

            } else {
                // Nuit totale — on ne voit absolument rien, pas même le joueur
                noStroke();
                fill(0, 0, 0, 252);
                rect(0, 0, VILLE_WIDTH, VILLE_HEIGHT);

                // Message discret au joueur (reset matrix pour l'afficher à l'écran)
                push();
                resetMatrix();
                textAlign(CENTER, CENTER); textSize(22); textStyle(BOLD);
                fill(180, 140, 60, 200);
                text("Il fait nuit noire... vous avez besoin d'une lampe.", width / 2, height * 0.88);
                pop();
            }
        }

        // ================= CLAVIER ANTI-BUG =================
        if (keyIsPressed && (key === 'l' || key === 'L')) {
            if (!toucheLongeeEnfoncee) {
                let dInterrupteur = dist(user.x, user.y, INTERRUPTEUR_X, INTERRUPTEUR_Y);
                if (dInterrupteur < 160) {
                    courantRétabli = !courantRétabli;
                    if (courantRétabli) {
                        affichageBulleLevier = true;
                        tpsBulleLevier = millis();
                        if (typeof sonApplaudis !== 'undefined' && sonApplaudis) {
                            try { sonApplaudis.setVolume(0.9); sonApplaudis.play(); } catch (e) { }
                        }
                    }
                }
                toucheLongeeEnfoncee = true;
            }
        } else {
            toucheLongeeEnfoncee = false;
        }

        drawGrosInterrupteur(INTERRUPTEUR_X, INTERRUPTEUR_Y);

        // Porte de retour
        porte(90, 625, 40, 200, "entree_ville", 5500, 625, {
            color: color(93, 64, 55),
            alpha: 255
        });

        let DUREE_BULLE_MAITRE = 6000;
        if (afficherBulleMaitre) {
            if (millis() - tempsBulleMaitre < DUREE_BULLE_MAITRE) {
                let maitre = pnjBiblio[0];
            } else {
                afficherBulleMaitre = false;
            }
        }

        pop();
    };
}

// ==========================================
// REMISE À ZÉRO DES VOIX AU CHANGEMENT DE VUE
// Appelle cette fonction là où tu changes currentView
// ==========================================
function resetVoixPourVue(nouvelleVue) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Les voix d'accueil ne se rejouent plus au retour dans une vue déjà visitée
}

// ========================================== FONCTIONS DE RENDU GRAPHIQUE ==========================================

function drawGrosInterrupteur(x, y) {
    push();
    rectMode(CENTER); textAlign(CENTER, CENTER);
    fill(90); stroke(50); strokeWeight(3);
    rect(x, y, 90, 90, 6);
    noStroke();
    if (!courantRétabli) {
        fill(235, 40, 40); rect(x, y + 15, 45, 35, 4);
        fill(255); textSize(18); textStyle(BOLD); text("OFF", x, y + 15);
    } else {
        fill(40, 210, 40); rect(x, y - 15, 45, 35, 4);
        fill(255); textSize(18); textStyle(BOLD); text("ON", x, y - 15);
    }
    // N'afficher l'indication de levier que si le joueur a la lampe (et peut donc voir)
    let d = dist(user.x, user.y, x, y);
    if (d < 160 && !courantRétabli && joueurPossedeLampe) {
        fill(255); textStyle(BOLD); textSize(25);
        text("L - ENCLENCHER LE LEVIER", x, y + 70);
    }
    pop();
}

function drawEtagereFixe(x, y, w, h, listeCouleurs) {
    mur(x, y, w, h);
    push(); rectMode(CORNER); noStroke();
    fill(62, 39, 35); rect(x, y, w, h, 4);
    if (w > h) {
        let indexCouleur = 0;
        for (let i = 8; i < w - 16; i += 16) {
            fill(listeCouleurs[indexCouleur % listeCouleurs.length]);
            rect(x + i, y + 5, 12, h - 10);
            indexCouleur++;
        }
    } else {
        let indexCouleur = 0;
        for (let j = 8; j < h - 16; j += 14) {
            fill(listeCouleurs[indexCouleur % listeCouleurs.length]);
            rect(x + 5, y + j, w - 10, 12);
            indexCouleur++;
        }
    }
    pop();
}

function drawLampeTorche(x, y, allumée) {
    push(); ellipseMode(CENTER); noStroke();
    if (allumée) {
        fill(255, 213, 79, 45); ellipse(x, y, 180, 180);
        fill(255, 236, 179, 90); ellipse(x, y, 70, 70);
    }
    fill(55, 71, 79); ellipse(x, y, 20, 20);
    if (allumée) { fill(255, 143, 0); ellipse(x, y, 10, 10); }
    pop();
}

function drawGrandPanneau(x, y, texte) {
    push(); rectMode(CENTER); textAlign(CENTER, CENTER);
    fill(93, 64, 55); rect(x, y + 40, 24, 80);
    fill(141, 110, 99); stroke(62, 39, 35); strokeWeight(4); rect(x, y, 240, 60, 5);
    noStroke(); fill(255); textSize(26); textStyle(BOLD); text(texte, x, y);
    pop();
}

function drawDesertMaisonTop(x, y, w, h) {
    mur(x, y, w, h);
    push(); rectMode(CORNER); noStroke();
    fill(180, 140, 100); rect(x, y, w, h, 8);
    fill(210, 180, 140); rect(x + 20, y + 20, w - 40, h - 40, 6);
    fill(160, 82, 45); rect(x + w - 80, y + 40, 50, 50);
    fill(139, 90, 43); rect(x + w / 2 - 50, y + h - 6, 100, 12, 4);
    pop();
}

function drawCactusTop(x, y, scale = 1) {
    push(); ellipseMode(CENTER); rectMode(CENTER); noStroke();
    fill(50, 80, 45); ellipse(x, y, 50 * scale, 50 * scale);
    fill(76, 120, 68); ellipse(x, y, 40 * scale, 40 * scale);
    rect(x - 30 * scale, y, 25 * scale, 12 * scale, 2); ellipse(x - 40 * scale, y, 16 * scale, 16 * scale);
    rect(x + 30 * scale, y + 3 * scale, 25 * scale, 12 * scale, 2); ellipse(x + 40 * scale, y + 3 * scale, 16 * scale, 16 * scale);
    pop();
}

function drawRocherTop(x, y, scale = 1) {
    mur(x - (35 * scale), y - (30 * scale), 70 * scale, 60 * scale);
    push(); ellipseMode(CENTER); noStroke();
    fill(120, 95, 75); ellipse(x + 3, y + 4, 75 * scale, 60 * scale);
    fill(155, 120, 95); ellipse(x, y, 70 * scale, 55 * scale);
    fill(175, 140, 115); ellipse(x - 6 * scale, y - 5 * scale, 45 * scale, 32 * scale);
    pop();
}

function drawBulle(x, y, texte, largeur = 460) {
    push();
    textSize(36); textStyle(BOLD); textAlign(LEFT, TOP);
    let paddingX = 32; let paddingY = 28; let txtWidth = largeur - (paddingX * 2);
    let mots = texte.split(' ');
    let lignes = [];
    let ligneCourante = '';
    for (let mot of mots) {
        let candidate = ligneCourante ? `${ligneCourante} ${mot}` : mot;
        if (textWidth(candidate) <= txtWidth) {
            ligneCourante = candidate;
        } else {
            if (ligneCourante) lignes.push(ligneCourante);
            ligneCourante = mot;
        }
    }
    if (ligneCourante) lignes.push(ligneCourante);
    let lineHeight = 44;
    let txtHeight = (lignes.length * lineHeight) + (paddingY * 2);
    if (txtHeight < 100) txtHeight = 100;
    let bulleTop = y - txtHeight - 18;
    fill(255); stroke(0); strokeWeight(3);
    triangle(x, y, x + 18, y - 20, x + 36, y - 20);
    rectMode(CORNER); rect(x - 24, bulleTop, largeur, txtHeight, 16);
    noStroke(); fill(0);
    for (let i = 0; i < lignes.length; i++) {
        text(lignes[i], x - 24 + paddingX, bulleTop + paddingY + (i * lineHeight));
    }
    pop();
}
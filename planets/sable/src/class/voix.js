// ========================================== CLASSE VOIX ==========================================
// Utilise l'API Web Speech (intégrée dans Chrome/Edge, gratuite, zéro lib)
// Écoute en continu ce que dit l'utilisateur et déclenche
// selon les mots-clés détectés.
//

class Voix {

    constructor() {
        // Vérifie que le navigateur supporte l'API (Chrome / Edge OK, Firefox non)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("VoixReconnaissance : ton navigateur ne supporte pas Web Speech API. Utilise Chrome ou Edge.");
            this.supportee = false;
            return;
        }

        this.supportee = true;
        this.actif = false;
        this.active = false; // Alias utilisé dans ville.js pour le contrôle d'état
        this.motsCles = []; // [{ mots: ["bonjour", "salam"] }]

        // Créer l'objet reconnaissance
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'fr-FR';       // Langue française
        this.recognition.continuous = true;    // Écoute en continu (pas juste une phrase)
        this.recognition.interimResults = false; // On veut les résultats finaux uniquement

        // Quand un mot est reconnu
        this.recognition.onresult = (event) => {
            // Récupère le dernier résultat transcrit, en minuscules
            let transcript = event.results[event.results.length - 1][0].transcript
                .trim()
                .toLowerCase()
                .normalize("NFD")                    // Décompose les accents
                .replace(/[\u0300-\u036f]/g, "");    // Supprime les accents

            console.log("Voix détectée :", transcript);

            // Comparer avec chaque groupe de mots-clés enregistrés
            for (let groupe of this.motsCles) {
                for (let mot of groupe.mots) {
                    // Normaliser aussi le mot-clé
                    let motNormalise = mot
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");

                    // Si le transcript contient ce mot → déclencher le callback
                    if (transcript.includes(motNormalise)) {
                        console.log(`Mot-clé trouvé : "${mot}" → callback déclenché`);
                        groupe.callback(transcript);
                        break; // Un seul callback par reconnaissance
                    }
                }
            }
        };

        // Redémarrage automatique si la reconnaissance s'arrête toute seule
        // (le navigateur coupe parfois après quelques secondes de silence)
        this.recognition.onend = () => {
            if (this.actif) {
                this.recognition.start(); // Redémarrage silencieux
            }
        };

        this.recognition.onerror = (event) => {
            // "no-speech" est normal (silence prolongé), on l'ignore
            if (event.error !== 'no-speech') {
                console.warn("Erreur reconnaissance vocale :", event.error);
            }
        };
    }

    // ========== AJOUTER UN GROUPE DE MOTS-CLÉS ==========
    // mots     : tableau de strings, ex: ["bonjour", "salam", "salut"]
    // callback : fonction appelée quand un mot est reconnu, reçoit le transcript complet
    ajouterMotCle(mots, callback) {
        if (!this.supportee) return;
        this.motsCles.push({ mots, callback });
    }

    // ========== DÉMARRER L'ÉCOUTE ==========
    demarrer() {
        if (!this.supportee || this.actif) return;
        try {
            this.actif = true;
            this.active = true; // sync
            this.recognition.start();
            console.log("VoixReconnaissance : écoute démarrée");
        } catch (erreur) {
            this.actif = false;
            this.active = false;
            console.warn("VoixReconnaissance : impossible de démarrer l'écoute", erreur);
        }
    }

    // ========== ARRÊTER L'ÉCOUTE ==========
    arreter() {
        if (!this.supportee) return;
        if (!this.actif) return;
        this.actif = false;
        this.active = false; // sync
        try {
            this.recognition.stop();
            console.log("VoixReconnaissance : écoute arrêtée");
        } catch (erreur) {
            console.warn("VoixReconnaissance : impossible d'arrêter l'écoute", erreur);
        }
    }
}
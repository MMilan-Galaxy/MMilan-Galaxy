class Feu {
    constructor(x, y) { 
        this.x = x; 
        this.y = y; 
    }
    
    display() {
        push();
        translate(this.x, this.y);  
        fill(101, 67, 33); rectMode(CENTER);
        for (let i = 0; i < 4; i++) {
            push(); rotate(QUARTER_PI * i); rect(0, 0, 18, 90, 4); pop();
        }
        
        // GESTION DU SON MP3 GLOBALE
        let d = dist(user.x, user.y, this.x, this.y);
        
        // On vérifie si la variable globale sonFeu existe et est chargée
        if (typeof sonFeu !== 'undefined' && sonFeu) {
            if (d < 600) { 
                let volume = map(d, 0, 600, 1, 0);
                sonFeu.setVolume(volume, 0.08); 
            } else { 
                sonFeu.setVolume(0, 0.08); 
            }
        }
        
        noStroke(); 
        fill(255, 50, 0, 160); ellipse(0, 0, 75, 75);
        fill(255, 150, 0, 190); ellipse(0, 0, 48, 48);
        fill(255, 255, 100); ellipse(0, 0, 25, 25);
        pop();
    }
}
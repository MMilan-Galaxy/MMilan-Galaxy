// ==========================================
// CLASSE JOUEUR
// ==========================================

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 90;
    this.h = 90;
    this.speed = 12;
    this.sprintMultiplier = 2;
    this.isMoving = false;
    this.walkingFrame = 0;
    this.colorSkin = color(240, 200, 180);
    this.colorHair = color(60, 40, 20);
    this.colorUniform = color(40, 60, 120);
    this.colorPants = color(30);
    this.colorPackage = color(210, 150, 80);
    
    // Propriétés pour le saut (vue de face)
    this.vy = 0; // Vitesse verticale
    this.gravity = 0.8;
    this.jumpPower = -20;
    this.isGrounded = false;
  }

  update() {
    this.isMoving = false;
    
    // Vérifier si une popup de puzzle est active
    let popupActive = window.puzzlePopupActive || false;
    
    // Bloquer le mouvement si une popup est active
    if (!popupActive) {
      // Calculer la vitesse actuelle (sprint ou normal)
      let currentSpeed = keyIsDown(SHIFT) ? this.speed * this.sprintMultiplier : this.speed;
      
      // Mouvement horizontal (toujours actif)
      if (keyIsDown(LEFT_ARROW))  { this.x -= currentSpeed; this.isMoving = true; }
      if (keyIsDown(RIGHT_ARROW)) { this.x += currentSpeed; this.isMoving = true; }
      
      // Vérifier le type de vue actuelle
      let currentViewObj = views[currentView];
      
      if (currentViewObj && currentViewObj.type === "SIDE") {
        // Vue de face : physique de plateforme avec saut
        if (keyIsDown(UP_ARROW) && this.isGrounded) {
          // Augmenter la puissance de saut si Shift est pressé
          let jumpPower = keyIsDown(SHIFT) ? this.jumpPower * this.sprintMultiplier : this.jumpPower;
          this.vy = jumpPower;
          this.isGrounded = false;
        }
        
        // Appliquer la gravité
        this.vy += this.gravity;
        this.y += this.vy;
        
        // Limiter la vitesse de chute
        this.vy = constrain(this.vy, -20, 20);
        
        // Contraintes pour la vue de face
        this.x = constrain(this.x, this.w/2, width - this.w/2);
        this.y = constrain(this.y, this.h/2, height - this.h/2);
        
        // Reset si on tombe vraiment trop bas (sous le canvas)
        if (this.y >= height - this.h/2) {
          this.y = this.h/2 + 50;
          this.vy = 0;
        }
      } else {
        // Vue de dessus : mouvement normal
        if (keyIsDown(UP_ARROW))    { this.y -= currentSpeed; this.isMoving = true; }
        if (keyIsDown(DOWN_ARROW))  { this.y += currentSpeed; this.isMoving = true; }
        
        this.x = constrain(this.x, this.w/2, width - this.w/2);
        this.y = constrain(this.y, this.h/2, height - this.h/2);
      }
    }

    if (this.isMoving) this.walkingFrame += 0.2;
    else this.walkingFrame = 0;
  }

  display() {
    push();
    translate(this.x, this.y - this.h/3);
    rectMode(CENTER);
    noStroke();
    let walkShake = sin(this.walkingFrame) * 6;
    let legStep = sin(this.walkingFrame) * 26;
    let packageBounce = abs(cos(this.walkingFrame)) * 8;

    fill(this.colorPants);
    rect(-25, 75 + legStep/2, 30, 40, 2);
    rect(25, 75 - legStep/2, 30, 40, 2);

    push();
    translate(walkShake, 0);
    fill(this.colorUniform);
    rect(0, 0, 83, 117, 5);
    rect(-47, -7, 23, 67, 2);
    rect(47, -7, 23, 67, 2);
    fill(this.colorSkin);
    ellipse(-47, 27, 27, 27);
    ellipse(47, 27, 27, 27);
    pop();

    push();
    translate(walkShake * 0.5, -80);
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

    push();
    translate(walkShake * 1.5, 20 - packageBounce);
    fill(this.colorPackage);
    rect(0, 0, 92, 67, 2);
    fill(255, 50, 50);
    rect(0, 0, 20, 67);
    pop();
    pop();
  }
}

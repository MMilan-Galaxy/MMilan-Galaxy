// ==========================================
// CLASSE SALLE (View)
// ==========================================

class View {
  constructor(name, backgroundConfig, type = "TOP") {
    this.name = name;
    this.type = type;
    this.displayContent = function() {};
    
    // Configuration du background
    this.setBackground(backgroundConfig);
  }
  
  setBackground(config) {
    if (typeof config === 'string' && config.startsWith('#')) {
      this.bgType = 'hex';
      this.bgColor = config;
    } else if (typeof config === 'function') {
      this.bgType = 'custom';
      this.bgFunction = config;
    } else if (typeof config === 'object') {
      this.bgType = config.type || 'solid';
      this.bgConfig = config;
    } else {
      this.bgType = 'solid';
      this.bgColor = config;
    }
  }
  
  render() {
    // Dessiner le background selon le type
    switch(this.bgType) {
      case 'hex':
        backgroundHex(this.bgColor);
        break;
      case 'gradient':
        backgroundGradient(
          this.bgConfig.color1, 
          this.bgConfig.color2, 
          this.bgConfig.direction
        );
        break;
      case 'image':
        backgroundImage(
          this.bgConfig.name,
          this.bgConfig.mode || 'cover',
          this.bgConfig.opacity || 255
        );
        break;
      case 'layers':
        backgroundLayers(this.bgConfig.layers);
        break;
      case 'custom':
        backgroundCustom(this.bgFunction, this.bgConfig);
        break;
      case 'animated':
        backgroundAnimated(
          this.bgConfig.function,
          this.bgConfig.speed || 1
        );
        break;
      case 'pattern_circles':
        backgroundPatternCircles(
          this.bgConfig.baseColor,
          this.bgConfig.circleColor,
          this.bgConfig.spacing
        );
        break;
      case 'pattern_lines':
        backgroundPatternLines(
          this.bgConfig.baseColor,
          this.bgConfig.lineColor,
          this.bgConfig.spacing,
          this.bgConfig.angle
        );
        break;
      case 'pattern_grid':
        backgroundPatternGrid(
          this.bgConfig.baseColor,
          this.bgConfig.lineColor,
          this.bgConfig.spacing
        );
        break;
      case 'pattern_stars':
        backgroundPatternStars(
          this.bgConfig.baseColor,
          this.bgConfig.starColor,
          this.bgConfig.density
        );
        break;
      case 'pattern_waves':
        backgroundPatternWaves(
          this.bgConfig.baseColor,
          this.bgConfig.waveColor,
          this.bgConfig.amplitude,
          this.bgConfig.frequency
        );
        break;
      default:
        background(this.bgColor || color(100));
    }
    
    // Interface utilisateur (Bandeau titre)
    fill(0, 80);
    noStroke();
    rect(0, 0, width, 40);
    
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(`${this.name} (${this.type === "TOP" ? "View de dessus" : "View de face"})`, width / 2, 20);
  }
}

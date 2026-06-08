// ═══════════════════════════════════════
//  STATE — global constants & variables
// ═══════════════════════════════════════

// Canvas & world dimensions
const W=5760, H=1200;
const WORLD_W=11520, WORLD_H=2800;
const PCX=5760, PCY=1400, PR=1280;
const INT_W=10080, INT_H=2000;
const SX=7.2, SY=2.0;  // scale factors vs original 800×600
const GAME_SCALE=1.1;   // minigame zoom factor

// Game state
let gstate='EXPLORE'; // EXPLORE | CASINO_INTERIOR | BLACKJACK | ROULETTE | SLOTS | WIN
let prevState='EXPLORE';
let hasCostume=false, ingots=0;
let done={blackjack:false,roulette:false,slots:false};

// Camera
let cam={x:2880,y:1200};

// Entities
let player, casino, guard;
let bushes=[];
let trees=[], lavaPools=[], rocks=[], pillars=[], dice=[];
let allSolids=[];

// World
let stars=[], terrainBuf;
let fadeA=255;
let outX=5760, outY=1760;
let currentGame=null;
let tutorialSeen={blackjack:false,roulette:false,slots:false};

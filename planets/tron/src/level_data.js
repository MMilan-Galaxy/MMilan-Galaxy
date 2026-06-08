// ═══════════════════════════════════════════════════════════════════
//  LEVEL DATA — Time Jump  (format multi-niveaux)
//  Généré par LevelEditor le 31/05/2026 11:46:47
//
//  Note : GROUND_Y = 1065  (H - 135,  H = 1200)
// ═══════════════════════════════════════════════════════════════════

const LEVELS_DATA = [

  // ── NIVEAU 1 : PARADOXE TEMPOREL ─────────────────────────────────
  {
    id: 1,
    name: "PARADOXE TEMPOREL",

    obstacles: [
      { x:   -3, y: 1122, w: 5760, h:  96, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'' },
      { x:  871, y:  914, w:  150, h: 204, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_1' },
      { x: 1321, y:  -43, w:  353, h:1034, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_2' },
      { x: 3048, y:  928, w:  150, h: 187, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_3' },
      { x: 3197, y:  928, w:  436, h:  30, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_4' },
      { x: 3945, y:  -19, w:  524, h:1068, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_5' },
    ],

    pushBoxes: [
      { x: 1457, y:1029, w:93, h:90, col: [150, 100, 50] },
    ],

    enemies: [
      // (vide)
    ],

    terminals: [
      { x: 2838, y: 1018, w: 60, h: 90, unlockLabel: 'Mur Bêta', keys: 5, timeSec: 20 },
    ],

    dataBricks: {
      boxes: [
        { x: 4879, y: 1045, size: 60, id: "data-1" },
      ],
      zones: [
        { x: 5113, y:  785, w: 110, h: 110, id: "data-1" },
      ],
    },

    exitDoor:       { x:  5560, y:   927, w:  78, h: 150 },
  },

  // ── NIVEAU 2 : BOUCLE INFINIE ─────────────────────────────────
  {
    id: 2,
    name: "BOUCLE INFINIE",

    obstacles: [
      { x:    0, y: 1119, w: 5760, h:  96, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'' },
      { x: 1387, y:  650, w:  827, h: 474, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_1' },
      { x: 2984, y:  732, w:  330, h: 402, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_2' },
      { x: 4183, y:  569, w:  946, h:  36, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_4' },
      { x: 2623, y:  982, w:  173, h: 139, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_4' },
      { x: 2794, y:  874, w:  193, h: 253, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_5' },
      { x: 5127, y:  568, w:  150, h: 564, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_6' },
      { x: 3313, y:  851, w:  190, h: 273, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_7' },
      { x: 3501, y: 1003, w:  150, h: 110, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_8' },
    ],

    pushBoxes: [
      { x:  611, y: 972, w:164, h:147, col: [150, 100, 50] },
    ],

    enemies: [
      // (vide)
    ],

    terminals: [
      // (vide)
    ],

    dataBricks: {
      boxes: [
        { x: 3049, y:  294, size:195, id: "data-1" },
      ],
      zones: [
        { x: 4734, y:  726, w: 396, h: 405, id: "data-1" },
      ],
    },

    exitDoor:       { x:  5642, y:   918, w:  78, h: 150 },
  },

  // ── NIVEAU 3 : FRAGMENT PERDU ─────────────────────────────────
  {
    id: 3,
    name: "FRAGMENT PERDU",

    obstacles: [
      { x:    0, y: 1119, w: 5760, h:  96, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'' },
      { x:  887, y:  898, w:  160, h: 225, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_1' },
      { x: 1957, y:  546, w:  335, h: 578, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_2' },
      { x: 1217, y:  468, w:  249, h: 655, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_3' },
      { x: 1458, y:  -24, w:  841, h: 315, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_4' },
      { x: 1049, y:  691, w:  171, h: 433, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_5' },
      { x: 2292, y:  548, w:  844, h: 165, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_6' },
      { x: 4030, y:  595, w:  228, h: 522, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_8' },
      { x: 2296, y:   -9, w: 3506, h: 379, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_9' },
      { x: 2292, y:  713, w: 1131, h: 413, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_10' },
      { x: 4256, y:  742, w:  322, h: 376, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_10' },
      { x: 4576, y:  862, w:  208, h: 259, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_11' },
      { x: 1464, y:  468, w:   32, h:  30, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_12' },
    ],

    pushBoxes: [
      { x: 3280, y: 373, w:601, h:340, col: [150, 100, 50] },
    ],

    enemies: [
      { x: 1689, patrolLeft: 1478, patrolRight: 1874, speed: 2.5 },
      { x: 3769, patrolLeft: 3434, patrolRight: 3950, speed: 2.5 },
    ],

    terminals: [
      { x: 5160, y:  863, w:145, h:249, unlockLabel: '', keys: 5, timeSec: 20 },
    ],

    dataBricks: {
      boxes: [],
      zones: [],
    },

    exitDoor:       { x:  5648, y:   915, w:  78, h: 150 },
  },

  // ── NIVEAU 4 : ÉCHO QUANTIQUE ─────────────────────────────────
  {
    id: 4,
    name: "ÉCHO QUANTIQUE",

    obstacles: [
      { x:    0, y: 1119, w: 5760, h:  96, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'' },
      { x: 3280, y:  426, w:  150, h: 702, pOnly:true , paOnly:false, low:false, destroyable:false, lbl:'obs_1' },
      { x: 2658, y:  319, w:  150, h: 800, pOnly:false, paOnly:true , low:false, destroyable:false, lbl:'obs_2' },
      { x: 2139, y:  502, w:  150, h: 618, pOnly:true , paOnly:false, low:false, destroyable:false, lbl:'obs_3' },
      { x: 4105, y:  948, w:  297, h: 162, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_4' },
      { x: 4256, y:  701, w:  150, h: 245, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_5' },
      { x: 4406, y:  785, w:  148, h:  36, pOnly:true , paOnly:false, low:false, destroyable:false, lbl:'obs_6' },
      { x: 4550, y:  558, w:  150, h: 561, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_7' },
      { x: 4277, y:   11, w:  569, h: 318, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_8' },
    ],

    pushBoxes: [
      { x: 2174, y: 338, w:137, h:164, col: [150, 100, 50] },
      { x: 3134, y: 253, w:394, h:173, col: [150, 100, 50] },
      { x: 4406, y: 350, w:142, h:435, col: [150, 100, 50] },
    ],

    enemies: [
      // (vide)
    ],

    terminals: [
      { x: 6047, y:  975, w: 60, h: 90, unlockLabel: '', keys: 6, timeSec: 20 },
    ],

    dataBricks: {
      boxes: [],
      zones: [],
    },

    exitDoor:       { x:  5648, y:   915, w:  78, h: 150 },
  },

  // ── NIVEAU 5 : NEXUS FINAL ─────────────────────────────────
  {
    id: 5,
    name: "NEXUS FINAL",

    obstacles: [
      { x:  -69, y: 1122, w: 5865, h:  96, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'' },
      { x:   -2, y:  -10, w: 5770, h: 115, pOnly:true , paOnly:false, low:false, destroyable:false, lbl:'obs_1' },
      { x: 1652, y:  901, w:  337, h:  30, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_2' },
      { x:   -4, y:  783, w:  363, h:  81, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_3' },
      { x:  604, y:  865, w:  221, h:  59, pOnly:false, paOnly:false, low:false, destroyable:true , lbl:'obs_4' },
      { x: 2912, y:  374, w:  423, h: 379, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_6' },
      { x: 1350, y:   95, w:  273, h: 226, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_7' },
      { x:  -11, y:  195, w:  288, h: 497, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_8' },
      { x: 1326, y:  551, w:  150, h: 520, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_9' },
      { x: 2919, y: 1000, w:  211, h:  16, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_10' },
      { x: 3131, y: 1001, w:  211, h: 125, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_11' },
      { x: 3501, y:  491, w:  150, h: 582, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_12' },
      { x: 3334, y:  605, w:  173, h:  30, pOnly:true , paOnly:false, low:false, destroyable:false, lbl:'obs_13' },
      { x: 3333, y:  824, w:  173, h:  30, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_14' },
      { x: 2908, y:  756, w:  432, h: 178, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_15' },
      { x: 1893, y:  102, w:  150, h: 519, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_17' },
      { x: 3653, y:  881, w:  150, h:  96, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_18' },
      { x: 3960, y:  886, w:  257, h:  50, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_20' },
      { x: 5120, y:  185, w:  150, h: 804, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_21' },
      { x: 4875, y:  228, w:  241, h: 325, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_22' },
      { x: 5272, y:  908, w:  338, h:  79, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_23' },
      { x: 4385, y:  911, w:  189, h: 210, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_24' },
      { x: 1327, y: 1071, w:  150, h:  48, pOnly:true , paOnly:false, low:false, destroyable:false, lbl:'obs_22' },
      { x: 2864, y:  104, w:  150, h: 227, pOnly:false, paOnly:false, low:false, destroyable:false, lbl:'obs_23' },
    ],

    pushBoxes: [
      { x: 2791, y: 940, w:90, h:90, col: [150, 100, 50] },
      { x:  840, y: 692, w:115, h:427, col: [150, 100, 50] },
      { x:  684, y: 692, w:111, h:173, col: [150, 100, 50] },
      { x: 2807, y: 851, w:90, h:90, col: [150, 100, 50] },
      { x: 3351, y: 122, w:142, h:483, col: [150, 100, 50] },
      { x: 2812, y:1030, w:90, h:90, col: [150, 100, 50] },
    ],

    enemies: [
      { x: 1534, patrolLeft: 1502, patrolRight: 2299, speed: 2.5 },
      { x: 2956, patrolLeft: 2936, patrolRight: 3579, speed: 2.5 },
      { x: 4434, patrolLeft: 4418, patrolRight: 5608, speed: 1 },
    ],

    terminals: [
      { x: 5658, y: 1027, w: 60, h: 90, unlockLabel: '', keys: 3, timeSec: 10 },
      { x: 3116, y:  269, w: 60, h: 90, unlockLabel: '', keys: 5, timeSec: 20 },
      { x: 4143, y:  205, w: 60, h: 90, unlockLabel: '', keys: 5, timeSec: 20 },
    ],

    dataBricks: {
      boxes: [
        { x: 3513, y:  343, size:130, id: "data-2" },
        { x: 4480, y:  767, size:133, id: "data-2" },
      ],
      zones: [
        { x: 4868, y:  566, w: 238, h: 289, id: "data-1" },
        { x: 3341, y:  641, w: 154, h: 174, id: "data-2" },
      ],
    },

    exitDoor:       { x:  5445, y:   269, w:  78, h: 150 },
  },

];

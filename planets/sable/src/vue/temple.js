
  
// Configuration des vues de face pour le temple
function setupTempleViews(views) {
  // Couleur : Beige/Sable ('#dfc193')
let chercheurMecanisme = new FacePNJ(
    width/2 - 50, // Position X (à ajuster selon ta carte)
    850, // Position Y (à ajuster selon ta carte)
    '#b94040', 
    "Répare la poulie cassée avec le colis pour ouvrir la grande porte du temple."
);

// Instance 2 : Le chercheur qui donne le cristal
// Couleur : Vert Kaki/Aventurier ('#4a5d4e')
let chercheurCristal = new FacePNJ(
    width/2 + 50, // Position X (à ajuster pour ne pas qu'ils soient l'un sur l'autre)
    850, // Position Y (à ajuster selon ta carte)
    '#4a5d4e', 
    "Prends ce cristal, il est bien mérité"
);
  
  // Entrée temple
  views["entree_temple"] = new View("Couloir secret", backgroundDesertTemple, "SIDE");
  views["entree_temple"].displayContent = function() {
    
    

    // Torches décoratives sur les murs
    torcheMurale(3226, 584, { scale: 3 });
    torcheMurale(2628, 584, { scale: 3 });
    torcheMurale(2026, 584, { scale: 3 });
    torcheMurale(1436, 584, { scale: 3 });
    torcheMurale(842, 584, { scale: 3 });
    torcheMurale(5053, 584, { scale: 3 });
    torcheMurale(4438, 584, { scale: 3 });
    torcheMurale(3853, 584, { scale: 3 });
    
    // Mur puzzle avec stèle et porte
    // Stèle à gauche, porte/pierre à droite
    murPuzzle(2030, 800, 2600, 300, 100, 600, "temple_puzzle_1");

    
    // Porte échelle en corde vers l'entrée
    porte(158, 448, 250, 900, "entree", 5200, 736, porteEchelleCorde, {});
    // Porte vers temple_2
    porte(5615, 602, 350, 600, "temple_2", 400, height - 300, porteTemple, {});
    
    // Lumière forte venant de l'extérieur
    lumiereExterieur(0, 0, 300, 300);

    // Sol
    plateforme(0, height - 300, width, 300);
    // plafond
    plateforme(300, 0, width - 300, 300);
    texte("Appuie sur MAJ pour avancer plus vite", 834, 147, 50, 0, [0, 0, 0]);  
  };


  // Salle 2 du temple
  views["temple_2"] = new View("Sous sol du temple Salle 2", backgroundDesertTemple, "SIDE");
  views["temple_2"].displayContent = function() {
    // Sol
    plateforme(0, height - 300, 2000, 300);
    plateforme(width - 2000, height - 300, 2000, 300);
    // Etage -2
    porte(2880, height - 100, 1760, 200, "temple_3", 2600, 0, {
      color: color(10, 10, 10),
      alpha: 10,
      onEnter: function(dest, x, y) {
        console.log("");
      }
    });    
    // plafond
    plateforme(0, 0, 2000, 300);
    plateforme(width - 2000, 0, 2000, 300);

    // Torches décoratives sur les murs
    torcheMurale(3226, 584, { scale: 3 });
    torcheMurale(2628, 584, { scale: 3 });
    torcheMurale(2026, 584, { scale: 3 });
    torcheMurale(1436, 584, { scale: 3 });
    torcheMurale(842, 584, { scale: 3 });
    torcheMurale(5053, 584, { scale: 3 });
    torcheMurale(4438, 584, { scale: 3 });
    torcheMurale(3853, 584, { scale: 3 });
    torcheMurale(5677, 584, { scale: 3 });
    
    // Porte de retour vers entree_temple
    porte(180, 600, 350, 600, "entree_temple", width - 400, height - 300, porteTemple, {});
  };


  // Salle 3 du temple
  views["temple_3"] = new View("Prison", backgroundSandstoneWall, "SIDE");
  views["temple_3"].displayContent = function() {
    // Plafond
    mur(0, 0, 1950, 1200);
    mur(width - 2000, 0, 2000, 300);   
    // sol
    plateforme(0, 900, 5000, 300);
    mur(0, 900, 5000, 300);
    lave(5000, height - 200, 500, 200, 2728, 5);

    plateforme(width - 300, 900, 300, 300);
    mur(width - 300, 900, 300, 300);
    // Mur
    mur(1920, 0, 80, 900);
    

    // Torches décoratives sur les murs
    // torcheMurale(2628, 584, { scale: 3 });
    torcheMurale(3226, 584, { scale: 3 });
    // torcheMurale(3853, 584, { scale: 3 });
    torcheMurale(4438, 584, { scale: 3 });
    // torcheMurale(5053, 584, { scale: 3 });
    torcheMurale(5677, 584, { scale: 3 });
    
    // Portes
    porte(5772, 599, 100, 600, "temple_4", 400, 900, {
      color: color(10, 10, 10),
      alpha: 0,
      onEnter: function(dest, x, y) {
        console.log("");
      }
    });

    grilleChat(
      3759, 298, 60, 603,
      { x: 3820, y: 651, w: 1156, h: 250 },
      300,
      2750, 700,
      1,
      'default'
    );
  };

  // Salle 4 du temple
  views["temple_4"] = new View("Lave", backgroundSandstoneWall, "SIDE");
  views["temple_4"].displayContent = function() {
    // Plafond
    mur(0, 0, width - 250, 300);
  
    // sol
    lave(0, height - 200, width, 200);
    plateforme(0, 900, 1000, 300);
    mur(0, 900, 1000, 300);
    
    plateforme(2100, 930, 300, 100);
    mur(2100, 930, 300, 100);

    plateforme(3180, 802, 300, 100);
    mur(3180, 802, 300, 100);
    
    plateforme(4800, 906, width - 4800, 300);
    mur(4800, 906, width - 4800, 300);

    

    // Torches décoratives sur les murs
    torcheMurale(507, 695, { scale: 3 });
    torcheMurale(2235, 740, { scale: 3 });
    torcheMurale(3339, 629, { scale: 3 });
    torcheMurale(5214, 680, { scale: 3 });
    
     
    // Retours
    porte(-120, 596, 350, 600, "temple_3", 5501, 800, {
      color: color(10, 10, 10),
      alpha: 0,
      onEnter: function(dest, x, y) {
        console.log("");
      }
    });

    // Echelle pour monter
    porte(5642, 448, 250, 900, "temple_5", width - 400, height - 350, porteEchelleCorde, {});


  };

  // Salle 5 du temple
  views["temple_5"] = new View("Sous sol du temple Salle 5", backgroundDesertTemple, "SIDE");
  views["temple_5"].displayContent = function() {
    // Plafond
    plateforme(987, 0, 5760, 300);
    plateforme(-5049, 0, 5760, 300);
  
    // sol
    plateforme(0, height - 300, width - 250, 300);
    

    // Torches décoratives sur les murs
    torcheMurale(3226, 584, { scale: 3 });
    torcheMurale(4438, 584, { scale: 3 });
    torcheMurale(1438, 590, { scale: 3 });

    // Statue simple avec pose par défaut
    // statuePosture(154, 700, 80, 200, 'position_T', 'statue1');
    statuePosture(2032, 300, 300, 600, 'position_T', 'statue1');

   // Echelle de retours
   porte(5639, 1351, 250, 900, "temple_4", width - 300, height - 350, porteEchelleCorde, {});
  //  Echelle pour monter
  porte(848, 451, 250, 900, "temple_6", 1126, 758, porteEchelleCorde, {});

  };
  // Salle 6 du temple
  views["temple_6"] = new View("Sous sol du temple Salle 6", backgroundDesertTemple, "SIDE");
  views["temple_6"].displayContent = function() {
    // Plafond
    plateforme(-3598, 0, 5510, 300);
    plateforme(2222, 0, 5510, 300);
  
    // sol
    plateforme(987, height - 300, 5760, 300);
    plateforme(-5049, height - 300, 5760, 300);
    

    // Torches décoratives sur les murs
    torcheMurale(3226, 584, { scale: 3 });
    torcheMurale(4438, 584, { scale: 3 });
    torcheMurale(1438, 590, { scale: 3 });

    // Echelle pour monter
    porte(2072, 450, 250, 900, "temple_7", 1750, 737, porteEchelleCorde, {});
    //  Echelle pour descendre
    porte(848, 1350, 250, 900, "temple_5", 1126, 758, porteEchelleCorde, {});
    // Porte vers salle bonus
    porte(125, 602, 350, 600, "temple_bonus", 5350, 713, porteTemple, {});

  };

  // Salle bonus
  views["temple_bonus"] = new View("Salle vide", backgroundDesertTemple, "SIDE");
  views["temple_bonus"].displayContent = function() {
    // Plafond
    plateforme(0, 0, width, 300);
  
    // sol
    plateforme(0, height - 300, 1950, 1200);
    plateforme(width - 2000, height - 300, 2000, 300);  
    

    // Torches décoratives sur les murs
    torcheMurale(3226, 584, { scale: 3 });
    torcheMurale(4438, 584, { scale: 3 });
    torcheMurale(1438, 590, { scale: 3 });

    // trou dans le sol
    porte(2880, height - 100, 1760, 200, "temple_2", 2600, 0, {
      color: color(10, 10, 10),
      alpha: 10,
      onEnter: function(dest, x, y) {
        console.log("");
      }
    });  
    // Porte retours
    porte(5600, 602, 350, 600, "temple_6", 505, 776, porteTemple, {});

  };

  // Salle 7 du temple
  views["temple_7"] = new View("Sous sol du temple Salle 5", backgroundDesertTemple, "SIDE");
  views["temple_7"].displayContent = function() {
    
  chercheurCristal.display();
  chercheurMecanisme.display();
    

    // Torches décoratives sur les murs
    torcheMurale(3226, 584, { scale: 3 });
    torcheMurale(4438, 584, { scale: 3 });
    torcheMurale(1438, 590, { scale: 3 });

    

    // Porte pour dessendre
    porte(2063, 1347, 250, 900, "temple_6", 1735, 710, porteEchelleCorde, {});
    // Sortie
    porte(5772, 599, 100, 600, "entree", 5299, 488, {
      color: color(10, 10, 10),
      alpha: 0,
      onEnter: function(dest, x, y) {
        console.log("");
      }
    });
    porteOr(width - 120, 0, 120, 900, 'salle1');  // grande porte
    poulieCassee(width - 1000, 800, 80, 'salle1', 120);


    // Sol
    plateforme(-3598, height - 300, 5510, 300);
    plateforme(2222, height - 300, 5510, 300);
  };
}
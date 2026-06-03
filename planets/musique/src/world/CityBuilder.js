class CityBuilder {
  static build({ mapWidth, mapDepth, streetWidth, scale }) {
    const features = [];
    const W = mapWidth / scale;
    const D = mapDepth / scale;
    const SW = streetWidth / scale;
    const quadW = W / 2;
    const quadD = D / 2;

    const ROAD_OK = new Set([
      "pathmark",
      "lamp",
      "note",
      "mountain",
      "soundwave",
      "ufo",
    ]);

    const add = (type, x, z, w, d) => {
      if (!ROAD_OK.has(type)) {
        const onV = x + w > W / 2 - SW / 2 && x < W / 2 + SW / 2;
        const onH = z + d > D / 2 - SW / 2 && z < D / 2 + SW / 2;
        if (onV || onH) return;
      }
      features.push({
        type,
        x: x * scale,
        z: z * scale,
        w: w * scale,
        d: d * scale,
      });
    };

    add("house", 70, 80, 180, 120);
    add("house", 400, 140, 180, 120);
    add("house", 800, 60, 160, 110);
    add("house", 700, 550, 160, 110);
    add("pond", 260, 300, 260, 140);
    add("tree", 800, 300, 100, 150);
    add("tree", 620, 90, 50, 100);
    add("tree", 90, 560, 100, 150);
    add("tree", 400, 620, 100, 150);

    add("house", 80, quadD + 80, 180, 120);
    add("house", 500, quadD + 140, 160, 110);
    add("house", 880, quadD + 400, 160, 110);
    add("building", 800, quadD + 600, 210, 220);
    add("building", 120, quadD + 360, 230, 180);
    add("building", 520, quadD + 400, 200, 210);
    add("tree", 350, quadD + 120, 50, 100);
    add("tree", 400, quadD + 700, 50, 100);
    add("tree", 500, quadD + 700, 50, 100);
    add("tree", 140, quadD + 620, 100, 150);
    add("tree", 800, quadD + 140, 100, 150);

    add("house", quadW + 250, 90, 180, 120);
    add("house", quadW + 800, 600, 180, 120);
    add("building", quadW + 130, 360, 220, 220);
    add("building", quadW + 500, 400, 200, 210);
    add("tree", quadW + 500, 700, 50, 100);
    add("tree", quadW + 180, 620, 100, 150);
    add("tree", quadW + 800, 230, 100, 150);

    add("postoffice", W / 2 + 90, 60, 360, 260);

    add("house", quadW + 100, quadD + 90, 180, 120);
    add("house", quadW + 620, quadD + 720, 180, 120);
    add("house", quadW + 700, quadD + 260, 160, 110);
    add("house", quadW + 900, quadD + 260, 160, 110);
    add("house", quadW + 150, quadD + 700, 160, 110);
    add("building", quadW + 120, quadD + 360, 210, 220);
    add("building", quadW + 650, quadD + 450, 230, 180);
    add("tree", quadW + 500, quadD + 700, 50, 100);
    add("tree", quadW + 350, quadD + 100, 50, 100);
    add("tree", quadW + 160, quadD + 470, 100, 150);
    add("tree", quadW + 900, quadD + 700, 100, 150);
    add("tree", quadW + 420, quadD + 360, 100, 150);

    add("fountain", W / 2 - 230, D / 2 - 230, 100, 100);
    add("fountain", W / 2 + 130, D / 2 + 130, 100, 100);

    add("house", quadW + 700, 280, 160, 110);
    add("house", quadW + 900, 80, 180, 120);
    add("building", quadW + 850, 480, 200, 180);
    add("tree", quadW + 400, 280, 70, 120);
    add("tree", quadW + 700, 80, 60, 110);
    add("tree", quadW + 1000, 500, 80, 130);
    add("pond", quadW + 280, 100, 180, 90);

    add("tree", 300, 460, 70, 120);
    add("tree", 950, 700, 70, 120);
    add("tree", 300, quadD + 100, 70, 120);
    add("tree", 700, quadD + 270, 70, 120);
    add("pond", 350, quadD + 500, 180, 100);
    add("tree", quadW + 280, quadD + 240, 70, 120);
    add("tree", quadW + 750, quadD + 100, 70, 120);
    add("pond", quadW + 880, quadD + 500, 160, 100);

    const lampOffset = SW / 2 + 30;
    for (let i = 200; i < W; i += 350) {
      if (Math.abs(i - W / 2) < SW) continue;
      add("lamp", i, D / 2 - lampOffset - 10, 20, 20);
      add("lamp", i, D / 2 + lampOffset - 10, 20, 20);
    }
    for (let j = 200; j < D; j += 350) {
      if (Math.abs(j - D / 2) < SW) continue;
      add("lamp", W / 2 - lampOffset - 10, j, 20, 20);
      add("lamp", W / 2 + lampOffset - 10, j, 20, 20);
    }

    add("bench", W / 2 - lampOffset - 70, D / 2 - 400, 60, 24);
    add("bench", W / 2 + lampOffset + 10, D / 2 + 400, 60, 24);
    add("bench", 400, D / 2 + lampOffset + 10, 60, 24);
    add("bench", W - 460, D / 2 - lampOffset - 70, 60, 24);

    add("tree", 200, 200, 80, 130);
    add("tree", W - 250, 200, 80, 130);
    add("tree", 200, D - 250, 80, 130);
    add("tree", W - 250, D - 250, 80, 130);

    add("speaker", 60, 1100, 130, 130);
    add("speaker", W - 200, 1450, 130, 130);
    add("stage", 920, 410, 180, 180);
    add("vinyl", 1280, 600, 200, 200);
    add("antenna", 10, 10, 50, 50);
    add("antenna", W - 60, D - 60, 50, 50);
    add("note", 350, 350, 40, 40);
    add("note", 1800, 1450, 40, 40);
    add("note", 2100, 200, 40, 40);
    add("note", 500, 1700, 40, 40);
    add("note", 1400, 1200, 40, 40);

    add("mountain", 10, 600, 70, 200);
    add("mountain", 10, 1450, 80, 200);
    add("mountain", W - 90, 600, 70, 200);
    add("mountain", W - 100, 1100, 80, 200);
    add("mountain", 700, 10, 70, 80);
    add("mountain", 1900, 10, 70, 80);
    add("mountain", 600, D - 90, 90, 90);
    add("mountain", 1500, D - 90, 90, 90);

    add("tree", 1100, 200, 70, 110);
    add("tree", 2050, 850, 80, 130);
    add("tree", 50, 1000, 70, 110);
    add("tree", 2300, 1700, 70, 110);
    add("tree", 1100, 1700, 70, 110);

    add("studio", 1900, 1300, 180, 160);
    add("antenna", 1400, 1450, 50, 50);

    add("pond", 1700, 240, 160, 100);
    add("pond", 60, 1700, 150, 90);

    return features;
  }
}

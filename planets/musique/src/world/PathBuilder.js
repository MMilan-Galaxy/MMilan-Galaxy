class PathBuilder {
  static build(from, to, { spacing = 120, size = 40 } = {}) {
    if (!from || !to) return [];

    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dz);
    if (dist < spacing * 1.5) return [];

    const steps = Math.floor(dist / spacing);
    const path = [];
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = from.x + dx * t;
      const pz = from.z + dz * t;
      path.push({
        type: 'pathmark',
        x: px - size / 2,
        z: pz - size / 2,
        w: size,
        d: size
      });
    }
    return path;
  }
}

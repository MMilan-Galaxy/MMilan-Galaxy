const IsoUtils = Object.freeze({
  circleRectCollision(cx, cz, r, rx, rz, rw, rd) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestZ = Math.max(rz, Math.min(cz, rz + rd));
    const dx = cx - closestX;
    const dz = cz - closestZ;
    return dx * dx + dz * dz < r * r;
  },

  distance(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }
});

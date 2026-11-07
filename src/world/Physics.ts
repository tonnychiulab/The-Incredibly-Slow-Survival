import type { AABB, PlatformDef } from '../types';

export class Physics {
  public static intersects(a: AABB, b: AABB): boolean {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  public static isSolidTile(platforms: PlatformDef[], x: number): boolean {
    const tileX = Math.round(x);
    return platforms.some((p) => tileX >= p.startX && tileX <= p.endX);
  }
}

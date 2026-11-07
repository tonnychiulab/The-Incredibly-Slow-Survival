import type { AABB, DeathCause, Vec2 } from '../../types';
import { Physics } from '../Physics';

export interface Hazard {
  id: string;
  type: 'rock' | 'saw';
  cause: DeathCause;
  getAABB(worldTick: number): AABB;
  predictPath(fromWorldTick: number, toWorldTick: number, stepTicks?: number): Vec2[];
  hits(box: AABB, worldTick: number): boolean;
}

export abstract class BasePeriodicHazard implements Hazard {
  public abstract readonly id: string;
  public abstract readonly type: 'rock' | 'saw';
  public abstract readonly cause: DeathCause;

  protected constructor(
    protected readonly width: number,
    protected readonly height: number,
    protected readonly periodTicks: number,
    protected readonly phaseTicks: number
  ) {}

  protected getLocalTick(worldTick: number): number {
    return (((worldTick + this.phaseTicks) % this.periodTicks) + this.periodTicks) % this.periodTicks;
  }

  public abstract getCenterAt(worldTick: number): Vec2;

  public getAABB(worldTick: number): AABB {
    const center = this.getCenterAt(worldTick);
    return {
      x: center.x - this.width / 2,
      y: center.y,
      w: this.width,
      h: this.height,
    };
  }

  public predictPath(fromWorldTick: number, toWorldTick: number, stepTicks = 6): Vec2[] {
    const pts: Vec2[] = [];
    for (let t = fromWorldTick; t <= toWorldTick; t += stepTicks) {
      pts.push(this.getCenterAt(t));
    }
    return pts;
  }

  public hits(box: AABB, worldTick: number): boolean {
    return Physics.intersects(box, this.getAABB(worldTick));
  }
}

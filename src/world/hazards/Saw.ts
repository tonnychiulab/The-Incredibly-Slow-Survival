import type { SawDef, Vec2 } from '../../types';
import { BasePeriodicHazard } from './Hazard';

export class Saw extends BasePeriodicHazard {
  public readonly id: string;
  public readonly type = 'saw' as const;
  public readonly cause = '電鋸' as const;

  constructor(private readonly def: SawDef) {
    super(def.width, def.height, def.periodTicks, def.phaseTicks);
    this.id = def.id;
  }

  public getCenterAt(worldTick: number): Vec2 {
    const localTick = this.getLocalTick(worldTick);
    const half = this.def.periodTicks / 2;
    const u = localTick <= half ? localTick / half : (this.def.periodTicks - localTick) / half;
    return {
      x: this.def.startX + (this.def.endX - this.def.startX) * u,
      y: this.def.startY + (this.def.endY - this.def.startY) * u,
    };
  }
}

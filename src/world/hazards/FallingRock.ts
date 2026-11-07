import type { FallingRockDef, Vec2 } from '../../types';
import { BasePeriodicHazard } from './Hazard';

export class FallingRock extends BasePeriodicHazard {
  public readonly id: string;
  public readonly type = 'rock' as const;
  public readonly cause = '落石' as const;

  constructor(private readonly def: FallingRockDef) {
    super(def.width, def.height, def.periodTicks, def.phaseTicks);
    this.id = def.id;
  }

  public getCenterAt(worldTick: number): Vec2 {
    const localTick = this.getLocalTick(worldTick);
    if (localTick < this.def.fallTicks) {
      const progress = localTick / this.def.fallTicks;
      const y = this.def.topY + (this.def.bottomY - this.def.topY) * progress;
      return { x: this.def.x, y };
    }
    return { x: this.def.x, y: this.def.topY };
  }
}

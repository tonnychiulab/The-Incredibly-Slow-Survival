import { CONFIG } from '../config';
import type { SlothPhase, Vec2 } from '../types';
import type { Hazard } from '../world/hazards/Hazard';

export class SonarSystem {
  public freezeRemainingTicks = 0;
  public cooldownRemainingTicks = 0;

  public isFrozen(): boolean {
    return this.freezeRemainingTicks > 0;
  }

  public tryActivate(slothPhase: SlothPhase): boolean {
    if (slothPhase === 'dead' || this.cooldownRemainingTicks > 0) {
      return false;
    }
    this.freezeRemainingTicks = CONFIG.sonarFreezeTicks;
    this.cooldownRemainingTicks = CONFIG.sonarCooldownTicks;
    return true;
  }

  public advanceTick(): void {
    if (this.freezeRemainingTicks > 0) {
      this.freezeRemainingTicks -= 1;
    }
    if (this.cooldownRemainingTicks > 0) {
      this.cooldownRemainingTicks -= 1;
    }
  }

  public computePredictedPaths(hazards: Hazard[], worldTick: number): Record<string, Vec2[]> {
    if (!this.isFrozen()) {
      return {};
    }
    const result: Record<string, Vec2[]> = {};
    const toTick = worldTick + CONFIG.sonarPreviewTicks;
    for (const h of hazards) {
      result[h.id] = h.predictPath(worldTick, toTick, 6);
    }
    return result;
  }
}

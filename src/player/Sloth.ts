import { CONFIG } from '../config';
import type { AABB, CheckpointSnapshot, Direction, SlothPhase, SlothState } from '../types';

export interface StepUpdateResult {
  stepStarted: boolean;
  stepLanded: boolean;
}

export type ChargeTier = 'cancel' | 'small' | 'medium' | 'large';

export class Sloth {
  public x: number;
  public y: number;
  public facing: Direction = 'right';
  public phase: SlothPhase = 'idle';
  public holdTicks = 0;
  public turnTicks = 0;
  public stepTicks = 0;
  public stepStartX = 0;
  public stepTargetX = 0;
  public hitboxMultiplier: number = CONFIG.hitboxMultipliers.idle;

  private heldDirs: Direction[] = [];
  private pendingStepStarted = false;
  private targetFacing: Direction = 'right';

  constructor(startX = 0, startY = 0) {
    this.x = startX;
    this.y = startY;
  }

  public static evaluateHoldTier(holdTicks: number): ChargeTier {
    if (holdTicks < CONFIG.windupTicks) return 'cancel';
    if (holdTicks < CONFIG.charge1Ticks) return 'small';
    if (holdTicks < CONFIG.charge2Ticks) return 'medium';
    return 'large';
  }

  public onKeyDown(dir: Direction): void {
    if (this.phase === 'dead') {
      return;
    }
    if (!this.heldDirs.includes(dir)) {
      this.heldDirs.push(dir);
    }
  }

  public onKeyUp(dir: Direction): void {
    this.heldDirs = this.heldDirs.filter((d) => d !== dir);
    if (this.phase === 'windup' && this.activeDir() !== this.facing) {
      this.resolveWindupRelease();
    }
  }

  public onBlur(): void {
    const wasWindup = this.phase === 'windup';
    this.heldDirs = [];
    if (wasWindup) {
      this.resolveWindupRelease();
    }
  }

  public activeDir(): Direction | null {
    return this.heldDirs.length > 0 ? this.heldDirs[this.heldDirs.length - 1] : null;
  }

  private resolveWindupRelease(): void {
    const tier = Sloth.evaluateHoldTier(this.holdTicks);
    if (tier === 'cancel') {
      this.phase = 'idle';
      this.holdTicks = 0;
      this.hitboxMultiplier = CONFIG.hitboxMultipliers.idle;
      return;
    }

    const dist = CONFIG.stepDistances[tier];
    const mult = CONFIG.hitboxMultipliers[tier];

    this.phase = 'stepping';
    this.holdTicks = 0;
    this.stepTicks = 0;
    this.stepStartX = this.x;
    this.stepTargetX = this.x + (this.facing === 'right' ? dist : -dist);
    this.hitboxMultiplier = mult;
    this.pendingStepStarted = true;
  }

  public consumeStepStartedFlag(): boolean {
    const started = this.pendingStepStarted;
    this.pendingStepStarted = false;
    return started;
  }

  public die(): void {
    this.phase = 'dead';
    this.heldDirs = [];
    this.holdTicks = 0;
    this.turnTicks = 0;
    this.stepTicks = 0;
    this.hitboxMultiplier = CONFIG.hitboxMultipliers.idle;
    this.pendingStepStarted = false;
  }

  public restoreSnapshot(snap: CheckpointSnapshot): void {
    this.x = snap.x;
    this.y = snap.y;
    this.facing = snap.facing;
    this.targetFacing = snap.facing;
    this.phase = 'idle';
    this.heldDirs = [];
    this.holdTicks = 0;
    this.turnTicks = 0;
    this.stepTicks = 0;
    this.hitboxMultiplier = CONFIG.hitboxMultipliers.idle;
    this.pendingStepStarted = false;
  }

  public updateWorldTick(): StepUpdateResult {
    let stepStarted = this.consumeStepStartedFlag();
    let stepLanded = false;

    if (this.phase === 'idle') {
      const dir = this.activeDir();
      if (dir === this.facing) {
        this.phase = 'windup';
        this.holdTicks = 1;
      } else if (dir !== null) {
        this.phase = 'turning';
        this.targetFacing = dir;
        this.turnTicks = 1;
      }
      return { stepStarted, stepLanded };
    }

    if (this.phase === 'turning') {
      this.turnTicks += 1;
      if (this.turnTicks >= CONFIG.turnTicks) {
        this.facing = this.targetFacing;
        this.turnTicks = 0;
        if (this.activeDir() === this.facing) {
          this.phase = 'windup';
          this.holdTicks = 0;
        } else {
          this.phase = 'idle';
        }
      }
      return { stepStarted, stepLanded };
    }

    if (this.phase === 'windup') {
      if (this.activeDir() === this.facing) {
        this.holdTicks += 1;
      } else {
        this.resolveWindupRelease();
        stepStarted = stepStarted || this.consumeStepStartedFlag();
      }
      return { stepStarted, stepLanded };
    }

    if (this.phase === 'stepping') {
      this.stepTicks += 1;
      const progress = Math.min(1, this.stepTicks / CONFIG.stepDurationTicks);
      this.x = this.stepStartX + (this.stepTargetX - this.stepStartX) * progress;

      if (this.stepTicks >= CONFIG.stepDurationTicks) {
        this.x = this.stepTargetX;
        this.phase = 'idle';
        this.stepTicks = 0;
        this.hitboxMultiplier = CONFIG.hitboxMultipliers.idle;
        stepLanded = true;
      }
      return { stepStarted, stepLanded };
    }

    return { stepStarted, stepLanded };
  }

  public getHitbox(): AABB {
    const w = CONFIG.slothBaseWidth * this.hitboxMultiplier;
    const h = CONFIG.slothHeight;
    return {
      x: this.x - w / 2,
      y: this.y,
      w,
      h,
    };
  }

  public getState(): SlothState {
    return {
      x: this.x,
      y: this.y,
      facing: this.facing,
      phase: this.phase,
      holdTicks: this.holdTicks,
      turnTicks: this.turnTicks,
      stepTicks: this.stepTicks,
      stepStartX: this.stepStartX,
      stepTargetX: this.stepTargetX,
      hitboxMultiplier: this.hitboxMultiplier,
      hitbox: this.getHitbox(),
    };
  }
}

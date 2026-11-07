import { CONFIG } from '../config';
import type { CheckpointDef, CheckpointSnapshot, Direction, SlothState, Vec2 } from '../types';

export class Scoring {
  public steps = 0;
  public deaths = 0;
  public isVictory = false;
  private snapshot: CheckpointSnapshot;

  constructor(start: Vec2, initialFacing: Direction = 'right') {
    this.snapshot = {
      x: start.x,
      y: start.y,
      facing: initialFacing,
      worldTick: 0,
      steps: 0,
      checkpointIndex: -1,
    };
  }

  public get activeCheckpointIndex(): number {
    return this.snapshot.checkpointIndex;
  }

  public get currentSnapshot(): CheckpointSnapshot {
    return { ...this.snapshot };
  }

  public checkAndActivateCheckpoint(
    checkpoints: CheckpointDef[],
    sloth: SlothState,
    worldTick: number
  ): void {
    const tileX = Math.round(sloth.x);
    for (let i = 0; i < checkpoints.length; i++) {
      if (i > this.snapshot.checkpointIndex && tileX >= checkpoints[i].x) {
        this.snapshot = {
          x: sloth.x,
          y: sloth.y,
          facing: sloth.facing,
          worldTick,
          steps: this.steps,
          checkpointIndex: i,
        };
      }
    }
  }

  public isTimedOut(worldTick: number): boolean {
    return worldTick >= CONFIG.levelTimeoutTicks;
  }
}

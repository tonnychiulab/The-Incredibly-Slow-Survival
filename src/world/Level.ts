import type {
  CanopyBranchDef,
  CheckpointDef,
  LevelData,
  PlatformDef,
  Vec2,
  VineSwitchDef,
} from '../types';
import type { Hazard } from './hazards/Hazard';
import { Physics } from './Physics';

export class Level {
  public readonly id: string;
  public readonly start: Vec2;
  public readonly goalX: number;
  public readonly platforms: PlatformDef[];
  public readonly checkpoints: CheckpointDef[];
  public readonly vineSwitches: VineSwitchDef[];
  public readonly canopyBranches: CanopyBranchDef[];
  public readonly hazards: Hazard[];

  constructor(data: LevelData, hazards: Hazard[]) {
    this.id = data.id;
    this.start = { ...data.start };
    this.goalX = data.goalX;
    this.platforms = data.platforms.map((p) => ({ ...p }));
    this.checkpoints = data.checkpoints.map((c) => ({ ...c }));
    this.vineSwitches = (data.vineSwitches ?? []).map((s) => ({ ...s }));
    this.canopyBranches = (data.canopyBranches ?? []).map((b) => ({ ...b }));
    this.hazards = hazards;
  }

  public getInitialUnlockedCanopyIds(): string[] {
    const lockedTargets = new Set(this.vineSwitches.map((s) => s.targetCanopyId));
    return this.canopyBranches.filter((b) => !lockedTargets.has(b.id)).map((b) => b.id);
  }

  public spanCrossesGap(startX: number, targetX: number): boolean {
    const minX = Math.round(Math.min(startX, targetX));
    const maxX = Math.round(Math.max(startX, targetX));
    for (let tx = minX + 1; tx < maxX; tx++) {
      if (!Physics.isSolidTile(this.platforms, tx)) {
        return true;
      }
    }
    return false;
  }

  public hasUnlockedCanopyForSpan(
    startX: number,
    targetX: number,
    unlockedIds: ReadonlySet<string>
  ): boolean {
    const minX = Math.round(Math.min(startX, targetX));
    const maxX = Math.round(Math.max(startX, targetX));
    return this.canopyBranches.some(
      (b) => unlockedIds.has(b.id) && b.startX <= minX && b.endX >= maxX
    );
  }
}

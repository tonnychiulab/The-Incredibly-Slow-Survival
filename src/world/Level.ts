import type { CheckpointDef, LevelData, PlatformDef, Vec2 } from '../types';
import type { Hazard } from './hazards/Hazard';

export class Level {
  public readonly id: string;
  public readonly start: Vec2;
  public readonly goalX: number;
  public readonly platforms: PlatformDef[];
  public readonly checkpoints: CheckpointDef[];
  public readonly hazards: Hazard[];

  constructor(data: LevelData, hazards: Hazard[]) {
    this.id = data.id;
    this.start = { ...data.start };
    this.goalX = data.goalX;
    this.platforms = data.platforms.map((p) => ({ ...p }));
    this.checkpoints = data.checkpoints.map((c) => ({ ...c }));
    this.hazards = hazards;
  }
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Direction = 'left' | 'right';

export type Action = 'left' | 'right' | 'grab' | 'sonar' | 'item1' | 'item2' | 'item3';

export type InputEvent =
  | { type: 'keyDown'; dir: Direction }
  | { type: 'keyUp'; dir: Direction }
  | { type: 'sonar' }
  | { type: 'blur' };

export interface ReplayFrame {
  tick: number;
  events: InputEvent[];
}

export type DeathCause = '落石' | '電鋸' | '墜落' | '逾時';

export type SlothPhase = 'idle' | 'turning' | 'windup' | 'stepping' | 'dead';

export interface SlothState {
  x: number;
  y: number;
  facing: Direction;
  phase: SlothPhase;
  holdTicks: number;
  turnTicks: number;
  stepTicks: number;
  stepStartX: number;
  stepTargetX: number;
  hitboxMultiplier: number;
  hitbox: AABB;
  isClimbingCanopy: boolean;
}

export interface CheckpointSnapshot {
  x: number;
  y: number;
  facing: Direction;
  worldTick: number;
  steps: number;
  checkpointIndex: number;
  unlockedCanopyIds: string[];
}

export interface PlatformDef {
  startX: number;
  endX: number;
  y: number;
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number;
}

export interface VineSwitchDef {
  id: string;
  x: number;
  y: number;
  targetCanopyId: string;
}

export interface CanopyBranchDef {
  id: string;
  startX: number;
  endX: number;
  y: number;
}

export interface FallingRockDef {
  id: string;
  type: 'rock';
  x: number;
  topY: number;
  bottomY: number;
  width: number;
  height: number;
  periodTicks: number;
  phaseTicks: number;
  fallTicks: number;
}

export interface SawDef {
  id: string;
  type: 'saw';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
  periodTicks: number;
  phaseTicks: number;
}

export type HazardDef = FallingRockDef | SawDef;

export interface LevelData {
  id: string;
  start: Vec2;
  goalX: number;
  platforms: PlatformDef[];
  checkpoints: CheckpointDef[];
  hazards: HazardDef[];
  vineSwitches?: VineSwitchDef[];
  canopyBranches?: CanopyBranchDef[];
}

export interface HazardSnapshot {
  id: string;
  type: 'rock' | 'saw';
  aabb: AABB;
}

export interface SimulationState {
  tick: number;
  worldTick: number;
  isFrozen: boolean;
  sonarFreezeRemaining: number;
  sonarCooldownRemaining: number;
  sloth: SlothState;
  steps: number;
  deaths: number;
  lastDeathCause: DeathCause | null;
  respawnRemainingTicks: number;
  activeCheckpointIndex: number;
  unlockedCanopyIds: string[];
  isVictory: boolean;
  hazards: HazardSnapshot[];
  predictedPaths: Record<string, Vec2[]>;
}

export interface RunResult {
  playerId: string;
  levelId: string;
  steps: number;
  timeMs: number;
}

export interface GhostFrame {
  playerId: string;
  pos: Vec2;
  t: number;
}

import { CONFIG } from '../config';
import { Sloth } from '../player/Sloth';
import { Scoring } from '../systems/Scoring';
import { SonarSystem } from '../systems/SonarSystem';
import type { DeathCause, InputEvent, LevelData, ReplayFrame, SimulationState } from '../types';
import { Level } from '../world/Level';
import { LevelLoader } from '../world/LevelLoader';
import { Physics } from '../world/Physics';
import { Clock } from './Clock';

export class Simulation {
  private clock = new Clock();
  private level: Level;
  private sloth: Sloth;
  private sonar = new SonarSystem();
  private scoring: Scoring;
  private unlockedCanopyIds: Set<string>;
  private lastDeathCause: DeathCause | null = null;
  private respawnRemainingTicks = 0;

  constructor(levelData: LevelData) {
    this.level = LevelLoader.load(levelData);
    this.sloth = new Sloth(this.level.start.x, this.level.start.y);
    const initialUnlocked = this.level.getInitialUnlockedCanopyIds();
    this.unlockedCanopyIds = new Set(initialUnlocked);
    this.scoring = new Scoring(this.level.start, this.sloth.facing, initialUnlocked);
    this.checkVineSwitches();
  }

  public static runReplay(
    levelData: LevelData,
    frames: ReplayFrame[],
    totalTicks?: number
  ): SimulationState {
    const sim = new Simulation(levelData);
    const frameMap = new Map<number, InputEvent[]>();
    let maxFrameTick = 0;
    for (const f of frames) {
      frameMap.set(f.tick, f.events);
      if (f.tick > maxFrameTick) {
        maxFrameTick = f.tick;
      }
    }
    const endTick = totalTicks ?? maxFrameTick;
    for (let t = 1; t <= endTick; t++) {
      sim.stepTick(frameMap.get(t) ?? []);
    }
    return sim.getState();
  }

  private triggerDeath(cause: DeathCause): void {
    this.sloth.die();
    this.scoring.deaths += 1;
    this.lastDeathCause = cause;
    this.respawnRemainingTicks = CONFIG.respawnDelayTicks;
  }

  private evaluateCanopyClimbForCurrentStep(): void {
    const dist = Math.round(Math.abs(this.sloth.stepTargetX - this.sloth.stepStartX));
    const hasCanopy = this.level.hasUnlockedCanopyForSpan(
      this.sloth.stepStartX,
      this.sloth.stepTargetX,
      this.unlockedCanopyIds
    );
    const targetSolid = Physics.isSolidTile(this.level.platforms, this.sloth.stepTargetX);
    // 當頭頂有已解鎖的樹藤橫枝且玩家使出 3 格大步伸展時，樹懶會勾住頭頂橫枝進行倒掛攀爬（可越過深坑或地面圓鋸）
    this.sloth.isClimbingCanopy = dist >= 3 && hasCanopy && targetSolid;
  }

  private checkVineSwitches(): void {
    const tileX = Math.round(this.sloth.x);
    for (const sw of this.level.vineSwitches) {
      if (tileX === sw.x) {
        this.unlockedCanopyIds.add(sw.targetCanopyId);
      }
    }
  }

  public stepTick(events: InputEvent[]): void {
    if (this.scoring.isVictory) {
      return;
    }

    for (const ev of events) {
      if (ev.type === 'keyDown') {
        this.sloth.onKeyDown(ev.dir);
      } else if (ev.type === 'keyUp') {
        this.sloth.onKeyUp(ev.dir);
      } else if (ev.type === 'blur') {
        this.sloth.onBlur();
      } else if (ev.type === 'sonar') {
        this.sonar.tryActivate(this.sloth.phase);
      }
    }

    if (this.sloth.consumeStepStartedFlag()) {
      this.scoring.steps += 1;
      this.evaluateCanopyClimbForCurrentStep();
    }

    const frozenThisTick = this.sonar.isFrozen();
    this.clock.advance(frozenThisTick);
    this.sonar.advanceTick();

    if (this.sloth.phase === 'dead') {
      if (this.respawnRemainingTicks > 0) {
        this.respawnRemainingTicks -= 1;
      }
      if (this.respawnRemainingTicks === 0) {
        const snap = this.scoring.currentSnapshot;
        this.sloth.restoreSnapshot(snap);
        this.clock.resetWorldTick(snap.worldTick);
        this.scoring.steps = snap.steps;
        this.unlockedCanopyIds = new Set(snap.unlockedCanopyIds);
      }
      return;
    }

    if (!frozenThisTick) {
      const { stepStarted, stepLanded } = this.sloth.updateWorldTick();
      if (stepStarted) {
        this.scoring.steps += 1;
        this.evaluateCanopyClimbForCurrentStep();
      }

      if (stepLanded) {
        const landedOnSolid = Physics.isSolidTile(this.level.platforms, this.sloth.x);
        const crossedGapWithoutCanopy =
          this.level.spanCrossesGap(this.sloth.stepStartX, this.sloth.stepTargetX) &&
          !this.level.hasUnlockedCanopyForSpan(
            this.sloth.stepStartX,
            this.sloth.stepTargetX,
            this.unlockedCanopyIds
          );

        if (!landedOnSolid || crossedGapWithoutCanopy) {
          this.triggerDeath('墜落');
          return;
        }

        this.checkVineSwitches();
      }

      const slothBox = this.sloth.getHitbox();
      for (const hazard of this.level.hazards) {
        if (hazard.hits(slothBox, this.clock.worldTick)) {
          this.triggerDeath(hazard.cause);
          return;
        }
      }

      if (this.scoring.isTimedOut(this.clock.worldTick)) {
        this.triggerDeath('逾時');
        return;
      }

      if (stepLanded) {
        this.scoring.checkAndActivateCheckpoint(
          this.level.checkpoints,
          this.sloth.getState(),
          this.clock.worldTick,
          this.unlockedCanopyIds
        );

        if (this.sloth.x >= this.level.goalX) {
          this.scoring.isVictory = true;
        }
      }
    }
  }

  public getState(): SimulationState {
    const isFrozen = this.sonar.isFrozen();
    return {
      tick: this.clock.tick,
      worldTick: this.clock.worldTick,
      isFrozen,
      sonarFreezeRemaining: this.sonar.freezeRemainingTicks,
      sonarCooldownRemaining: this.sonar.cooldownRemainingTicks,
      sloth: this.sloth.getState(),
      steps: this.scoring.steps,
      deaths: this.scoring.deaths,
      lastDeathCause: this.lastDeathCause,
      respawnRemainingTicks: this.respawnRemainingTicks,
      activeCheckpointIndex: this.scoring.activeCheckpointIndex,
      unlockedCanopyIds: [...this.unlockedCanopyIds],
      isVictory: this.scoring.isVictory,
      hazards: this.level.hazards.map((h) => ({
        id: h.id,
        type: h.type,
        aabb: h.getAABB(this.clock.worldTick),
      })),
      predictedPaths: this.sonar.computePredictedPaths(this.level.hazards, this.clock.worldTick),
    };
  }
}

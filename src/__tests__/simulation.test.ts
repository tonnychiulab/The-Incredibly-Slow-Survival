import { describe, expect, it } from 'vitest';
import { Simulation } from '../core/StateMachine';
import level01Data from '../levels/level01.json';
import type { LevelData, ReplayFrame } from '../types';

describe('SLO-MO Deterministic Simulation', () => {
  it('1. cancels action without counting a step when released before 48 worldTicks (0.8s windup)', () => {
    const sim = new Simulation(level01Data as unknown as LevelData);

    // Press right and hold for 47 worldTicks (< 48 windup threshold)
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 46; i++) {
      sim.stepTick([]);
    }
    expect(sim.getState().sloth.phase).toBe('windup');
    expect(sim.getState().sloth.holdTicks).toBe(47);

    // Release on the next tick -> should cancel and return to idle with 0 steps
    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    const state = sim.getState();
    expect(state.sloth.phase).toBe('idle');
    expect(state.sloth.x).toBe(0);
    expect(state.steps).toBe(0);
  });

  it('2. executes small (1 tile, x1.0), medium (2 tiles, x1.2), and large (3 tiles, x1.4) steps at 48, 90, and 132 holdTicks', () => {
    const cleanLevel: LevelData = {
      ...(level01Data as unknown as LevelData),
      hazards: [],
    };
    const sim = new Simulation(cleanLevel);

    // Small step: hold for 48 ticks, release on next tick
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 47; i++) sim.stepTick([]);
    expect(sim.getState().sloth.holdTicks).toBe(48);

    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(sim.getState().sloth.phase).toBe('stepping');
    expect(sim.getState().steps).toBe(1);
    expect(sim.getState().sloth.hitbox.w).toBeCloseTo(1.0);

    // Complete remaining 59 ticks of the 60-tick step
    for (let i = 0; i < 59; i++) sim.stepTick([]);
    expect(sim.getState().sloth.phase).toBe('idle');
    expect(sim.getState().sloth.x).toBeCloseTo(1);

    // Medium step: hold for 90 ticks, release on next tick
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 89; i++) sim.stepTick([]);
    expect(sim.getState().sloth.holdTicks).toBe(90);

    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(sim.getState().sloth.phase).toBe('stepping');
    expect(sim.getState().steps).toBe(2);
    expect(sim.getState().sloth.hitbox.w).toBeCloseTo(1.2);

    for (let i = 0; i < 59; i++) sim.stepTick([]);
    expect(sim.getState().sloth.phase).toBe('idle');
    expect(sim.getState().sloth.x).toBeCloseTo(3);
    expect(sim.getState().sloth.hitbox.w).toBeCloseTo(1.0);

    // Large step: hold for 132 ticks, release on next tick
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 131; i++) sim.stepTick([]);
    expect(sim.getState().sloth.holdTicks).toBe(132);

    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(sim.getState().sloth.phase).toBe('stepping');
    expect(sim.getState().steps).toBe(3);
    expect(sim.getState().sloth.hitbox.w).toBeCloseTo(1.4);

    for (let i = 0; i < 59; i++) sim.stepTick([]);
    expect(sim.getState().sloth.phase).toBe('idle');
    expect(sim.getState().sloth.x).toBeCloseTo(6);
    expect(sim.getState().sloth.hitbox.w).toBeCloseTo(1.0);
  });

  it('3. performs a 24-tick (0.4s) turn without counting a step, and chains into windup if still held', () => {
    const cleanLevel: LevelData = {
      ...(level01Data as unknown as LevelData),
      start: { x: 5, y: 0 },
      hazards: [],
    };
    const sim = new Simulation(cleanLevel);

    // Facing right initially; press left and release mid-turn -> completes turn at tick 24, returns to idle
    sim.stepTick([{ type: 'keyDown', dir: 'left' }]);
    expect(sim.getState().sloth.phase).toBe('turning');

    sim.stepTick([{ type: 'keyUp', dir: 'left' }]);
    for (let i = 0; i < 22; i++) sim.stepTick([]);
    expect(sim.getState().sloth.phase).toBe('idle');
    expect(sim.getState().sloth.facing).toBe('left');
    expect(sim.getState().steps).toBe(0);

    // Now facing left; press right and keep holding through 24 turn ticks + 48 windup ticks = 72 ticks
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 23; i++) sim.stepTick([]);
    expect(sim.getState().sloth.facing).toBe('right');

    for (let i = 0; i < 48; i++) sim.stepTick([]);
    expect(sim.getState().sloth.phase).toBe('windup');
    expect(sim.getState().sloth.holdTicks).toBe(48);

    // Release -> steps 1 tile right (from 5 to 6)
    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(sim.getState().sloth.phase).toBe('stepping');
    expect(sim.getState().steps).toBe(1);
    for (let i = 0; i < 59; i++) sim.stepTick([]);
    expect(sim.getState().sloth.x).toBeCloseTo(6);
  });

  it('4. checks gap terrain only on landing tick: 2-tile gap at x=19..20 kills small/medium steps on landing, allows 3-tile large step to x=21', () => {
    const gapLevel: LevelData = {
      ...(level01Data as unknown as LevelData),
      start: { x: 18, y: 0 },
      hazards: [],
    };

    // Medium step (2 tiles -> lands on x=20, which is in the gap 19..20)
    const simFail = new Simulation(gapLevel);
    simFail.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 89; i++) simFail.stepTick([]); // 90 holdTicks -> medium step
    simFail.stepTick([{ type: 'keyUp', dir: 'right' }]);

    // During mid-step (ticks 1..59), sloth flies over x=19 without dying
    for (let i = 0; i < 58; i++) {
      simFail.stepTick([]);
      expect(simFail.getState().sloth.phase).toBe('stepping');
      expect(simFail.getState().deaths).toBe(0);
    }

    // On landing tick (tick 60 of step), lands at x=20 -> falls and dies
    simFail.stepTick([]);
    expect(simFail.getState().sloth.phase).toBe('dead');
    expect(simFail.getState().lastDeathCause).toBe('墜落');
    expect(simFail.getState().deaths).toBe(1);

    // Large step (3 tiles -> lands on x=21, which is solid platform [21, 25])
    const simPass = new Simulation(gapLevel);
    simPass.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 131; i++) simPass.stepTick([]); // 132 holdTicks -> large step
    simPass.stepTick([{ type: 'keyUp', dir: 'right' }]);

    for (let i = 0; i < 59; i++) {
      simPass.stepTick([]);
    }
    expect(simPass.getState().sloth.phase).toBe('idle');
    expect(simPass.getState().sloth.x).toBeCloseTo(21);
    expect(simPass.getState().deaths).toBe(0);
  });

  it('5. freezes worldTick for 180 ticks and sets 480-tick cooldown on sonar activation; releasing while frozen settles current holdTicks', () => {
    const sim = new Simulation(level01Data as unknown as LevelData);

    // Hold right for 30 worldTicks
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 29; i++) sim.stepTick([]);
    expect(sim.getState().worldTick).toBe(30);
    expect(sim.getState().sloth.holdTicks).toBe(30);

    // Activate sonar on tick 31 -> freezes for 180 ticks (ticks 31..210)
    sim.stepTick([{ type: 'sonar' }]);
    expect(sim.getState().isFrozen).toBe(true);
    expect(sim.getState().worldTick).toBe(30);
    expect(sim.getState().sloth.holdTicks).toBe(30);
    expect(Object.keys(sim.getState().predictedPaths).length).toBeGreaterThan(0);

    // Advance remaining 179 frozen ticks -> still at worldTick 30
    for (let i = 0; i < 179; i++) {
      sim.stepTick([]);
      expect(sim.getState().worldTick).toBe(30);
      expect(sim.getState().sloth.holdTicks).toBe(30);
    }
    expect(sim.getState().isFrozen).toBe(false);
    expect(sim.getState().sonarCooldownRemaining).toBe(300); // 480 - 180 = 300 ticks left

    // Cannot re-activate sonar while on cooldown
    sim.stepTick([{ type: 'sonar' }]);
    expect(sim.getState().isFrozen).toBe(false);
    expect(sim.getState().worldTick).toBe(31);
    expect(sim.getState().sloth.holdTicks).toBe(31);

    // Hold 17 more ticks to reach 48 holdTicks, then release to step
    for (let i = 0; i < 17; i++) sim.stepTick([]);
    expect(sim.getState().sloth.holdTicks).toBe(48);
    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(sim.getState().sloth.phase).toBe('stepping');
    expect(sim.getState().steps).toBe(1);

    // Case B: Releasing while frozen at 30 holdTicks cancels immediately
    const simCancel = new Simulation(level01Data as unknown as LevelData);
    simCancel.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 29; i++) simCancel.stepTick([]);
    simCancel.stepTick([{ type: 'sonar' }]);
    simCancel.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(simCancel.getState().sloth.phase).toBe('idle');
    expect(simCancel.getState().steps).toBe(0);
  });

  it('6. saves checkpoint snapshot on landing, rolls back position/worldTick/steps on hazard death, and triggers timeout death at 36000 worldTicks', () => {
    const testLevel: LevelData = {
      ...(level01Data as unknown as LevelData),
      start: { x: 6, y: 0 },
      hazards: (level01Data as unknown as LevelData).hazards.filter((h) => h.id === 'saw-1'),
    };
    const sim = new Simulation(testLevel);

    // Step 2 tiles from x=6 to x=8 (Checkpoint 1 is at x=8)
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 89; i++) sim.stepTick([]); // 90 holdTicks -> medium step (2 tiles)
    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    for (let i = 0; i < 59; i++) sim.stepTick([]);

    const cpState = sim.getState();
    expect(cpState.sloth.x).toBeCloseTo(8);
    expect(cpState.activeCheckpointIndex).toBe(0);
    expect(cpState.steps).toBe(1);
    const cpWorldTick = cpState.worldTick;

    // Now step 2 more tiles from x=8 to x=10 where saw-1 patrols -> should hit saw-1 and die
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 89; i++) sim.stepTick([]);
    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);

    let diedToSaw = false;
    for (let i = 0; i < 120; i++) {
      sim.stepTick([]);
      if (sim.getState().sloth.phase === 'dead') {
        diedToSaw = true;
        break;
      }
    }
    expect(diedToSaw).toBe(true);
    expect(sim.getState().lastDeathCause).toBe('電鋸');
    expect(sim.getState().deaths).toBe(1);

    // Advance 60 respawn ticks -> restores to Checkpoint 1 snapshot (x=8, steps=1, worldTick=cpWorldTick)
    for (let i = 0; i < 60; i++) {
      sim.stepTick([]);
    }
    const restored = sim.getState();
    expect(restored.sloth.phase).toBe('idle');
    expect(restored.sloth.x).toBeCloseTo(8);
    expect(restored.steps).toBe(1);
    expect(restored.worldTick).toBe(cpWorldTick);

    // Timeout test: advance until worldTick reaches 36000 -> triggers '逾時' death
    const remainingToTimeout = 36000 - restored.worldTick;
    for (let i = 0; i < remainingToTimeout; i++) {
      sim.stepTick([]);
    }
    expect(sim.getState().sloth.phase).toBe('dead');
    expect(sim.getState().lastDeathCause).toBe('逾時');
    expect(sim.getState().deaths).toBe(2);
  });

  it('7. produces identical final state when replaying the same (tick, InputEvent[]) sequence twice', () => {
    const frames: ReplayFrame[] = [
      { tick: 1, events: [{ type: 'keyDown', dir: 'right' }] },
      { tick: 30, events: [{ type: 'sonar' }] },
      { tick: 230, events: [{ type: 'keyUp', dir: 'right' }] }, // 29 + (230-210) = 49 holdTicks -> small step
      { tick: 310, events: [{ type: 'keyDown', dir: 'right' }] },
      { tick: 450, events: [{ type: 'keyUp', dir: 'right' }] }, // 140 holdTicks -> large step
      { tick: 520, events: [{ type: 'blur' }] },
    ];

    const runA = Simulation.runReplay(level01Data as unknown as LevelData, frames, 600);
    const runB = Simulation.runReplay(level01Data as unknown as LevelData, frames, 600);

    expect(runA).toEqual(runB);
    expect(runA.steps).toBe(2);
    expect(runA.sloth.x).toBeGreaterThan(0);
  });

  it('8. completes level01 from start (x=0) through 2 checkpoints (x=8, x=16) and the 2-tile gap (x=19..20) to goal (x=25)', () => {
    const sim = new Simulation(level01Data as unknown as LevelData);

    const stepRight = (holdTicks: number) => {
      sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
      for (let i = 0; i < holdTicks - 1; i++) sim.stepTick([]);
      sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
      for (let i = 0; i < 59; i++) sim.stepTick([]);
    };

    // Step 0 -> 3 (large: 132 hold + 60 step = 192 ticks)
    stepRight(132);
    expect(sim.getState().sloth.x).toBeCloseTo(3);

    // Wait until rock-1 (period 180, fallTicks 60) will be high in the air when we cross x=4
    // Charging 132 ticks + stepping takes 192 ticks; if we start charging when worldTick % 180 === 120,
    // we release at (120 + 132) % 180 = 72, and step 3 -> 6 during localTick 72..132 (all >= 60, rock is at topY=6!)
    while (sim.getState().worldTick % 180 !== 120) {
      sim.stepTick([]);
    }
    stepRight(132); // 3 -> 6
    stepRight(90); // 6 -> 8 (activates cp1)
    expect(sim.getState().sloth.x).toBeCloseTo(8);
    expect(sim.getState().activeCheckpointIndex).toBe(0);

    // Cross saw-1 at x=10..13 (period 120, at y=0 near localTick 0, high at y=3.2 near localTick 60)
    // Start charging 132 ticks when worldTick % 120 === 60 -> release at (60 + 132) % 120 = 72?
    // Even better: start charging 132 ticks when worldTick % 120 === 20 -> release at (20 + 132) % 120 = 32,
    // so step 8 -> 11 runs during localTick 32..92 when saw-1 is high (y > 1.6)!
    while (sim.getState().worldTick % 120 !== 20) {
      sim.stepTick([]);
    }
    stepRight(132); // 8 -> 11 (safe! at x=11, saw only dips below y=1.0 when x < 10.9)
    stepRight(132); // 11 -> 14
    stepRight(90); // 14 -> 16 (activates cp2)
    expect(sim.getState().sloth.x).toBeCloseTo(16);
    expect(sim.getState().activeCheckpointIndex).toBe(1);

    // Step 16 -> 18 (medium), then 18 -> 21 (large step across 2-tile gap 19..20)
    stepRight(90);
    expect(sim.getState().sloth.x).toBeCloseTo(18);
    stepRight(132);
    expect(sim.getState().sloth.x).toBeCloseTo(21);

    // Time rock-2 at x=23 (period 90, phase 30, fall 45 -> safe when localTick = (worldTick + 30) % 90 is in 45..89)
    // Start charging 132 ticks when (worldTick + 30) % 90 === 3 -> release at (3 + 132) % 90 = 45,
    // so step 21 -> 24 passes x=23 during localTick 65..85 when rock-2 is at topY=5!
    while ((sim.getState().worldTick + 30) % 90 !== 3) {
      sim.stepTick([]);
    }
    stepRight(132); // 21 -> 24
    stepRight(48); // 24 -> 25 (goalX = 25)

    const finalState = sim.getState();
    expect(finalState.isVictory).toBe(true);
    expect(finalState.deaths).toBe(0);
    expect(finalState.sloth.x).toBeCloseTo(25);
    expect(finalState.steps).toBe(10);
  });
});

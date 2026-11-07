import { describe, expect, it } from 'vitest';
import { Input } from '../core/Input';
import { Simulation } from '../core/StateMachine';
import level01Data from '../levels/level01.json';
import { VoxelFactory } from '../render/VoxelFactory';
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

  it('4. checks gap terrain only on landing tick: 2-tile gap at x=19..20 kills small/medium steps on landing, allows 3-tile large step to x=21 via overhead canopy branch', () => {
    const gapLevel: LevelData = {
      ...(level01Data as unknown as LevelData),
      start: { x: 18, y: 0 },
      hazards: [],
      vineSwitches: [],
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

  it('8. completes level01 from start (x=0) by backtracking left (x=-3) to unlock the canopy vine, then crossing 2 checkpoints (x=8, x=16) and climbing across the gap (x=19..20) to goal (x=25)', () => {
    const sim = new Simulation(level01Data as unknown as LevelData);

    const stepDir = (dir: 'left' | 'right', holdTicks: number) => {
      sim.stepTick([{ type: 'keyDown', dir }]);
      for (let i = 0; i < holdTicks - 1; i++) sim.stepTick([]);
      sim.stepTick([{ type: 'keyUp', dir }]);
      for (let i = 0; i < 59; i++) sim.stepTick([]);
    };

    // 1. Backtrack left onto the Left Walkway (x = -4..0): turn left (24 ticks) + large step (132 ticks) to x = -3
    sim.stepTick([{ type: 'keyDown', dir: 'left' }]);
    for (let i = 0; i < 23; i++) sim.stepTick([]);
    expect(sim.getState().sloth.facing).toBe('left');
    // Continue holding left for 132 windup ticks to step 0 -> -3
    for (let i = 0; i < 132; i++) sim.stepTick([]);
    sim.stepTick([{ type: 'keyUp', dir: 'left' }]);
    for (let i = 0; i < 59; i++) sim.stepTick([]);

    expect(sim.getState().sloth.x).toBeCloseTo(-3);
    expect(sim.getState().unlockedCanopyIds).toContain('canopy-1');

    // Turn right (24 ticks) + large step (-3 -> 0)
    sim.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 23; i++) sim.stepTick([]);
    expect(sim.getState().sloth.facing).toBe('right');
    for (let i = 0; i < 132; i++) sim.stepTick([]);
    sim.stepTick([{ type: 'keyUp', dir: 'right' }]);
    for (let i = 0; i < 59; i++) sim.stepTick([]);
    expect(sim.getState().sloth.x).toBeCloseTo(0);

    // Step 0 -> 3 (large: 132 hold + 60 step = 192 ticks)
    stepDir('right', 132);
    expect(sim.getState().sloth.x).toBeCloseTo(3);

    // Wait until rock-1 (period 180, fallTicks 60) will be high in the air when we cross x=4
    while (sim.getState().worldTick % 180 !== 120) {
      sim.stepTick([]);
    }
    stepDir('right', 132); // 3 -> 6
    stepDir('right', 90); // 6 -> 8 (activates cp1)
    expect(sim.getState().sloth.x).toBeCloseTo(8);
    expect(sim.getState().activeCheckpointIndex).toBe(0);

    // Cross saw-1 at x=10..13
    while (sim.getState().worldTick % 120 !== 20) {
      sim.stepTick([]);
    }
    stepDir('right', 132); // 8 -> 11
    stepDir('right', 132); // 11 -> 14
    stepDir('right', 90); // 14 -> 16 (activates cp2)
    expect(sim.getState().sloth.x).toBeCloseTo(16);
    expect(sim.getState().activeCheckpointIndex).toBe(1);

    // Step 16 -> 18 (medium), then 18 -> 21 (large step climbing overhead canopy-1 across gap 19..20)
    stepDir('right', 90);
    expect(sim.getState().sloth.x).toBeCloseTo(18);
    stepDir('right', 132);
    expect(sim.getState().sloth.x).toBeCloseTo(21);

    // Time rock-2 at x=23
    while ((sim.getState().worldTick + 30) % 90 !== 3) {
      sim.stepTick([]);
    }
    stepDir('right', 132); // 21 -> 24
    stepDir('right', 48); // 24 -> 25 (goalX = 25)

    const finalState = sim.getState();
    expect(finalState.isVictory).toBe(true);
    expect(finalState.deaths).toBe(0);
    expect(finalState.sloth.x).toBeCloseTo(25);
    expect(finalState.steps).toBe(12);
  });

  it('9. builds concrete 3D voxel anatomy for Sloth (eye patches, moss, 4 limbs, 12 three-toed claws, charge spread), Saw (12 radial teeth + hub + track), and FallingRock (jagged crags + veins + drop shadow)', () => {
    const sloth = VoxelFactory.createSlothGroup();
    expect(sloth.getObjectByName('eyePatchL')).toBeDefined();
    expect(sloth.getObjectByName('eyePatchR')).toBeDefined();
    expect(sloth.getObjectByName('mossPatch0')).toBeDefined();
    expect(sloth.getObjectByName('frontArmL')).toBeDefined();
    expect(sloth.getObjectByName('frontArmR')).toBeDefined();
    expect(sloth.getObjectByName('backLegL')).toBeDefined();
    expect(sloth.getObjectByName('backLegR')).toBeDefined();

    // 4 limbs * 3 toes = 12 curved claws
    for (const limb of ['frontArmL', 'frontArmR', 'backLegL', 'backLegR']) {
      for (let toe = 0; toe < 3; toe++) {
        expect(sloth.getObjectByName(`claw_${limb}_${toe}`)).toBeDefined();
      }
    }

    // Pose update spreads front arms and back legs wider when charging large step (holdTicks=132) than idle
    const frontArmL = sloth.getObjectByName('frontArmL')!;
    const backLegL = sloth.getObjectByName('backLegL')!;
    VoxelFactory.updateSlothPose(sloth, { phase: 'idle', holdTicks: 0 }, 0);
    const idleArmRotZ = frontArmL.rotation.z;
    const idleLegRotZ = backLegL.rotation.z;

    VoxelFactory.updateSlothPose(sloth, { phase: 'windup', holdTicks: 132 }, 132);
    expect(Math.abs(frontArmL.rotation.z - idleArmRotZ)).toBeGreaterThan(0.4);
    expect(Math.abs(backLegL.rotation.z - idleLegRotZ)).toBeGreaterThan(0.4);

    // Saw anatomy: rotating sawBlade with 12 radial teeth + hubRing + hubAxle + sawMount + track
    const saw = VoxelFactory.createSawMesh(1.0, 1.0);
    const sawBlade = saw.getObjectByName('sawBlade');
    expect(sawBlade).toBeDefined();
    for (let i = 0; i < 12; i++) {
      expect(saw.getObjectByName(`tooth_${i}`)).toBeDefined();
    }
    expect(saw.getObjectByName('hubRing')).toBeDefined();
    expect(saw.getObjectByName('hubAxle')).toBeDefined();
    expect(saw.getObjectByName('sawMount')).toBeDefined();

    const track = VoxelFactory.createSawTrack(9.8, 0, 10.2, 4.0);
    expect(track.getObjectByName('railGroove')).toBeDefined();

    // Rock anatomy: jagged boulder cluster + 3 sharp bottom crags + amber fissure veins + drop shadow
    const rock = VoxelFactory.createRockMesh(1.0, 1.0);
    expect(rock.getObjectByName('rockBody')).toBeDefined();
    for (let i = 0; i < 3; i++) {
      expect(rock.getObjectByName(`crag_${i}`)).toBeDefined();
    }
    expect(rock.getObjectByName('vein_0')).toBeDefined();
    expect(rock.getObjectByName('vein_1')).toBeDefined();

    const { ceilingMount, dropShadow } = VoxelFactory.createRockFixture(4, 6, 1.0);
    expect(ceilingMount).toBeDefined();
    expect(dropShadow).toBeDefined();

    // Canopy branch and vine switch 3D models
    const canopy = VoxelFactory.createCanopyBranch(18, 21, 2.1, false);
    expect(canopy.getObjectByName('vineBridge')).toBeDefined();
    const vineSwitch = VoxelFactory.createVineSwitch(-3, 0);
    expect(vineSwitch.getObjectByName('switchCrystal')).toBeDefined();
  });

  it('10. requires unlocking the left-walkway vine switch (x=-3) before climbing the canopy branch over x=19..20, and animates upside-down sloth hanging pose', () => {
    // 1. Without activating switch-left, stepping 18 -> 21 falls into the chasm because canopy-1 is locked
    const lockedGapLevel: LevelData = {
      ...(level01Data as unknown as LevelData),
      start: { x: 18, y: 0 },
      hazards: [],
    };
    const simLocked = new Simulation(lockedGapLevel);
    simLocked.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 131; i++) simLocked.stepTick([]);
    simLocked.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(simLocked.getState().sloth.isClimbingCanopy).toBe(false);
    for (let i = 0; i < 59; i++) simLocked.stepTick([]);
    expect(simLocked.getState().sloth.phase).toBe('dead');
    expect(simLocked.getState().lastDeathCause).toBe('墜落');

    // 2. When canopy-1 is unlocked, stepping 18 -> 21 engages isClimbingCanopy and raises sloth y > 0.5 mid-climb
    const unlockedGapLevel: LevelData = {
      ...(level01Data as unknown as LevelData),
      start: { x: 18, y: 0 },
      hazards: [],
      vineSwitches: [],
    };
    const simClimb = new Simulation(unlockedGapLevel);
    simClimb.stepTick([{ type: 'keyDown', dir: 'right' }]);
    for (let i = 0; i < 131; i++) simClimb.stepTick([]);
    simClimb.stepTick([{ type: 'keyUp', dir: 'right' }]);
    expect(simClimb.getState().sloth.isClimbingCanopy).toBe(true);

    for (let i = 0; i < 29; i++) simClimb.stepTick([]);
    const midState = simClimb.getState();
    expect(midState.sloth.isClimbingCanopy).toBe(true);
    expect(midState.sloth.y).toBeGreaterThan(0.5);

    // Verify 3D pose flips limbs upward when isClimbingCanopy is true
    const slothGroup = VoxelFactory.createSlothGroup();
    VoxelFactory.updateSlothPose(slothGroup, midState.sloth, midState.worldTick);
    const frontArmL = slothGroup.getObjectByName('frontArmL')!;
    expect(frontArmL.rotation.z).toBeGreaterThan(1.5);
  });

  it('11. maps keyboard bindings in Input (A/D/ArrowLeft/ArrowRight for movement, E/Space/S/ArrowDown for Sonar, R for Restart)', () => {
    const listeners = new Map<string, (e: unknown) => void>();
    const fakeWindow = {
      addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
      removeEventListener: (type: string) => listeners.delete(type),
    } as unknown as Window;

    let firstGestureCount = 0;
    let restartCount = 0;
    const input = new Input();
    input.attach(
      fakeWindow,
      () => {
        firstGestureCount += 1;
      },
      () => {
        restartCount += 1;
      }
    );

    const keyDown = listeners.get('keydown')!;
    const keyUp = listeners.get('keyup')!;
    const blur = listeners.get('blur')!;

    keyDown({ code: 'KeyA', repeat: false, preventDefault: () => {} });
    keyUp({ code: 'KeyA', preventDefault: () => {} });
    keyDown({ code: 'KeyD', repeat: false, preventDefault: () => {} });
    keyDown({ code: 'KeyE', repeat: false, preventDefault: () => {} });
    keyDown({ code: 'Space', repeat: false, preventDefault: () => {} });

    expect(firstGestureCount).toBe(1);
    expect(input.flushEvents()).toEqual([
      { type: 'keyDown', dir: 'left' },
      { type: 'keyUp', dir: 'left' },
      { type: 'keyDown', dir: 'right' },
      { type: 'sonar' },
      { type: 'sonar' },
    ]);

    blur({});
    expect(input.flushEvents()).toEqual([{ type: 'blur' }]);

    keyDown({ code: 'KeyR', repeat: false, preventDefault: () => {} });
    expect(restartCount).toBe(1);
    input.detach(fakeWindow);
  });

  it('12. enforces level01 structural integrity: left walkway (x=-4..0), backtrack vine switch (x=-3), horizontal ground saw with overhead branch, and chasm canopy bridge', () => {
    const lvl = level01Data as unknown as LevelData;
    expect(lvl.start.x).toBe(0);
    expect(lvl.platforms[0].startX).toBeLessThanOrEqual(-4);
    expect(lvl.platforms[0].endX).toBe(18);

    // Backtrack vine switch on the left walkway
    expect(lvl.vineSwitches).toEqual([
      { id: 'switch-left', x: -3, y: 0, targetCanopyId: 'canopy-1' },
    ]);

    // Climbable overhead canopy branches over both the ground saw (8..11) and the chasm (18..21)
    expect(lvl.canopyBranches).toEqual([
      { id: 'canopy-saw', startX: 8, endX: 11, y: 2.1 },
      { id: 'canopy-1', startX: 18, endX: 21, y: 2.1 },
    ]);

    // Ground reciprocating saw moves horizontally along y=0 (never flying vertically into the air)
    const saw = lvl.hazards.find((h) => h.id === 'saw-1');
    expect(saw).toBeDefined();
    if (saw && saw.type === 'saw') {
      expect(saw.startY).toBe(0);
      expect(saw.endY).toBe(0);
      expect(saw.endX).toBeGreaterThan(saw.startX);
    }
  });
});

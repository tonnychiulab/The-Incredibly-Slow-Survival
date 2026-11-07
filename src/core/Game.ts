import { AudioManager } from '../audio/AudioManager';
import { CONFIG } from '../config';
import level01Data from '../levels/level01.json';
import { Renderer } from '../render/Renderer';
import type { LevelData } from '../types';
import { HUD } from '../ui/HUD';
import { Loading } from '../ui/Loading';
import { Clock } from './Clock';
import { Input } from './Input';
import { Simulation } from './StateMachine';

export class Game {
  private readonly levelData = level01Data as unknown as LevelData;
  private sim: Simulation;
  private frameClock = new Clock();
  private input = new Input();
  private audio = new AudioManager();
  private loading = new Loading();
  private renderer: Renderer;
  private hud: HUD;
  private lastFrameTimeMs: number | null = null;
  private prevSteps = 0;

  constructor(container: HTMLElement) {
    this.loading.begin(container);

    this.sim = new Simulation(this.levelData);
    this.renderer = new Renderer(container, this.levelData);
    this.hud = new HUD(container, () => this.restart());

    this.input.attach(window, () => {
      this.audio.unlockAndStart();
    });

    this.loading.finish();
  }

  public start(): void {
    requestAnimationFrame(this.loop);
  }

  public restart(): void {
    this.sim = new Simulation(this.levelData);
    this.prevSteps = 0;
  }

  private readonly loop = (nowMs: number): void => {
    if (this.lastFrameTimeMs === null) {
      this.lastFrameTimeMs = nowMs;
    }
    const deltaMs = nowMs - this.lastFrameTimeMs;
    this.lastFrameTimeMs = nowMs;

    const ticksToStep = this.frameClock.consumeFrameDelta(
      deltaMs,
      CONFIG.tickRate,
      CONFIG.maxTicksPerFrame
    );

    for (let i = 0; i < ticksToStep; i++) {
      const events = i === 0 ? this.input.flushEvents() : [];
      this.sim.stepTick(events);
      const state = this.sim.getState();
      if (state.steps < this.prevSteps) {
        this.prevSteps = state.steps;
      } else if (state.steps > this.prevSteps) {
        this.prevSteps = state.steps;
        this.audio.playStepVocal();
      }
      this.audio.setMovingState(state.sloth.phase === 'stepping' && !state.isFrozen);
    }

    const currentState = this.sim.getState();
    this.renderer.render(currentState);
    this.hud.update(currentState);

    requestAnimationFrame(this.loop);
  };
}

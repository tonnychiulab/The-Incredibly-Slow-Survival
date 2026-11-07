export class Clock {
  public tick = 0;
  public worldTick = 0;
  private accumulatorMs = 0;

  public advance(isFrozen: boolean): void {
    this.tick += 1;
    if (!isFrozen) {
      this.worldTick += 1;
    }
  }

  public resetWorldTick(targetWorldTick: number): void {
    this.worldTick = targetWorldTick;
  }

  public consumeFrameDelta(deltaMs: number, tickRate: number, maxTicksPerFrame: number): number {
    const stepMs = 1000 / tickRate;
    this.accumulatorMs += Math.max(0, deltaMs);
    let ticks = Math.floor(this.accumulatorMs / stepMs);
    if (ticks > maxTicksPerFrame) {
      ticks = maxTicksPerFrame;
      this.accumulatorMs = 0;
    } else {
      this.accumulatorMs -= ticks * stepMs;
    }
    return ticks;
  }
}

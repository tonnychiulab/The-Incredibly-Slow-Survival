export class AudioManager {
  private ctx: AudioContext | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private isMoving = false;

  public unlockAndStart(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    this.ctx = new AudioCtx();
    this.setupWindLoop(this.ctx);
  }

  private setupWindLoop(ctx: AudioContext): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.35;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 260;
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.value = 0.06;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    this.windFilter = filter;
    this.windGain = gain;
  }

  public setMovingState(moving: boolean): void {
    if (!this.ctx || !this.windGain || !this.windFilter || this.isMoving === moving) {
      return;
    }
    this.isMoving = moving;
    const now = this.ctx.currentTime;
    const targetGain = moving ? 0.22 : 0.06;
    const targetFreq = moving ? 520 : 260;
    this.windGain.gain.setTargetAtTime(targetGain, now, 0.12);
    this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.12);
  }

  public playStepVocal(): void {
    if (!this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // 合成「呃……啊……」兩段慢速低沉滑音佔位音效
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.linearRampToValueAtTime(135, now + 0.35);
    osc.frequency.setValueAtTime(185, now + 0.42);
    osc.frequency.linearRampToValueAtTime(125, now + 0.85);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.36);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.48);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.92);
  }
}

export const TICK_RATE = 60;

export function toTicks(seconds: number): number {
  return Math.round(seconds * TICK_RATE);
}

export const CONFIG = {
  tickRate: TICK_RATE,
  windupSec: 0.8,
  charge1Sec: 1.5,
  charge2Sec: 2.2,
  turnSec: 0.4,
  stepDurationSec: 1.0,
  sonarFreezeSec: 3.0,
  sonarCooldownSec: 8.0,
  sonarPreviewSec: 2.0,
  respawnDelaySec: 1.0,
  levelTimeoutSec: 600,

  windupTicks: toTicks(0.8), // 48
  charge1Ticks: toTicks(1.5), // 90
  charge2Ticks: toTicks(2.2), // 132
  turnTicks: toTicks(0.4), // 24
  stepDurationTicks: toTicks(1.0), // 60
  sonarFreezeTicks: toTicks(3.0), // 180
  sonarCooldownTicks: toTicks(8.0), // 480
  sonarPreviewTicks: toTicks(2.0), // 120
  respawnDelayTicks: toTicks(1.0), // 60
  levelTimeoutTicks: toTicks(600), // 36000

  stepDistances: {
    small: 1,
    medium: 2,
    large: 3,
  },
  hitboxMultipliers: {
    idle: 1.0,
    small: 1.0,
    medium: 1.2,
    large: 1.4,
  },
  slothBaseWidth: 1.0,
  slothHeight: 1.0,
  maxTicksPerFrame: 10,
} as const;

import type { GhostFrame } from '../types';

export interface GhostService {
  publish(frame: GhostFrame): void;
  subscribe(cb: (ghosts: GhostFrame[]) => void): void;
}

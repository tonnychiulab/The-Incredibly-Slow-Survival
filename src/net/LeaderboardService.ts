import type { RunResult } from '../types';

export interface LeaderboardService {
  submit(r: RunResult): Promise<void>;
  top(n: number): Promise<RunResult[]>;
}

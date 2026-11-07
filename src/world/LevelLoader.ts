import type { LevelData } from '../types';
import { FallingRock } from './hazards/FallingRock';
import type { Hazard } from './hazards/Hazard';
import { Saw } from './hazards/Saw';
import { Level } from './Level';

export class LevelLoader {
  public static load(data: LevelData): Level {
    const hazards: Hazard[] = data.hazards.map((h) => {
      if (h.type === 'rock') {
        return new FallingRock(h);
      }
      return new Saw(h);
    });
    return new Level(data, hazards);
  }
}

import type { Direction, InputEvent } from '../types';

export class Input {
  private pendingEvents: InputEvent[] = [];
  private keyDownState: Record<Direction, boolean> = { left: false, right: false };
  private firstGestureFired = false;
  private onFirstGestureCb?: () => void;

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    this.notifyFirstGesture();
    const dir = this.mapDirection(e.code);
    if (dir) {
      e.preventDefault();
      if (!this.keyDownState[dir]) {
        this.keyDownState[dir] = true;
        this.pendingEvents.push({ type: 'keyDown', dir });
      }
      return;
    }

    if (e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown') {
      e.preventDefault();
      if (!e.repeat) {
        this.pendingEvents.push({ type: 'sonar' });
      }
    }
  };

  private readonly handleKeyUp = (e: KeyboardEvent): void => {
    const dir = this.mapDirection(e.code);
    if (dir) {
      e.preventDefault();
      if (this.keyDownState[dir]) {
        this.keyDownState[dir] = false;
        this.pendingEvents.push({ type: 'keyUp', dir });
      }
    }
  };

  private readonly handleBlur = (): void => {
    this.keyDownState.left = false;
    this.keyDownState.right = false;
    this.pendingEvents.push({ type: 'blur' });
  };

  public attach(target: Window = window, onFirstGesture?: () => void): void {
    this.onFirstGestureCb = onFirstGesture;
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('blur', this.handleBlur);
  }

  public detach(target: Window = window): void {
    target.removeEventListener('keydown', this.handleKeyDown);
    target.removeEventListener('keyup', this.handleKeyUp);
    target.removeEventListener('blur', this.handleBlur);
  }

  public flushEvents(): InputEvent[] {
    if (this.pendingEvents.length === 0) {
      return [];
    }
    const out = this.pendingEvents;
    this.pendingEvents = [];
    return out;
  }

  private notifyFirstGesture(): void {
    if (!this.firstGestureFired) {
      this.firstGestureFired = true;
      this.onFirstGestureCb?.();
    }
  }

  private mapDirection(code: string): Direction | null {
    if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
    if (code === 'ArrowRight' || code === 'KeyD') return 'right';
    return null;
  }
}

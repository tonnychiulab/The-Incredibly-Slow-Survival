import * as THREE from 'three';
import type { Vec2 } from '../types';

export class SonarPostFX {
  private trajectoryGroup = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.trajectoryGroup);
  }

  public update(
    canvasEl: HTMLCanvasElement,
    isFrozen: boolean,
    predictedPaths: Record<string, Vec2[]>
  ): void {
    canvasEl.style.filter = isFrozen ? 'grayscale(100%) contrast(120%)' : 'none';

    while (this.trajectoryGroup.children.length > 0) {
      const child = this.trajectoryGroup.children[0];
      this.trajectoryGroup.remove(child);
    }

    if (!isFrozen) {
      return;
    }

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const dotGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (const pts of Object.values(predictedPaths)) {
      if (pts.length < 2) continue;
      const vecs = pts.map((p) => new THREE.Vector3(p.x, p.y + 0.4, 0.45));
      const geo = new THREE.BufferGeometry().setFromPoints(vecs);
      const line = new THREE.Line(geo, lineMat);
      this.trajectoryGroup.add(line);

      for (const v of vecs) {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(v);
        this.trajectoryGroup.add(dot);
      }
    }
  }
}

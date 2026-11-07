import * as THREE from 'three';

export class VoxelFactory {
  public static createSlothGroup(): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8b6b4e });
    const faceMat = new THREE.MeshLambertMaterial({ color: 0xe6ccb2 });
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x261c15 });

    // 樹懶軀幹
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.55), bodyMat);
    torso.position.set(0, 0.35, 0);
    group.add(torso);

    // 頭部與臉盤
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), bodyMat);
    head.position.set(0.1, 0.78, 0);
    group.add(head);

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.38), faceMat);
    face.position.set(0.32, 0.78, 0);
    group.add(face);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.1), eyeMat);
    eyeL.position.set(0.37, 0.8, 0.11);
    const eyeR = eyeL.clone();
    eyeR.position.z = -0.11;
    group.add(eyeL, eyeR);

    return group;
  }

  public static createTileBlock(x: number, y: number, isEven: boolean): THREE.Mesh {
    const color = isEven ? 0x4b5563 : 0x374151;
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.6, 1.2), mat);
    mesh.position.set(x, y - 0.3, 0);
    return mesh;
  }

  public static createCheckpointFlag(x: number, y: number): THREE.Group {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.5, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xd1d5db })
    );
    pole.position.set(0, 0.75, -0.35);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.3, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x3b82f6 })
    );
    flag.position.set(0.22, 1.3, -0.35);
    flag.name = 'flagMesh';

    group.add(pole, flag);
    group.position.set(x, y, 0);
    return group;
  }

  public static createGoalArch(x: number, y: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x10b981 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), mat);
    left.position.set(-0.35, 1.1, -0.3);
    const right = left.clone();
    right.position.x = 0.35;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.25, 0.25), mat);
    top.position.set(0, 2.2, -0.3);
    group.add(left, right, top);
    group.position.set(x, y, 0);
    return group;
  }

  public static createRockMesh(w: number, h: number): THREE.Mesh {
    const mat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.7), mat);
  }

  public static createSawMesh(w: number, h: number): THREE.Mesh {
    const mat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.35), mat);
  }
}

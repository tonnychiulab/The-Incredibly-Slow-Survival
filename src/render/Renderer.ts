import * as THREE from 'three';
import type { LevelData, SimulationState } from '../types';
import { SonarPostFX } from './SonarPostFX';
import { VoxelFactory } from './VoxelFactory';

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private webgl: THREE.WebGLRenderer;
  private slothGroup: THREE.Group;
  private hitboxWire: THREE.LineSegments;
  private hazardMeshes = new Map<string, THREE.Mesh>();
  private checkpointFlags: THREE.Group[] = [];
  private sonarFX: SonarPostFX;
  private viewHeight = 10;

  constructor(container: HTMLElement, levelData: LevelData) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);

    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const halfH = this.viewHeight / 2;
    const halfW = halfH * aspect;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
    this.camera.position.set(4, 3.2, 14);
    this.camera.lookAt(4, 2.0, 0);

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.webgl.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.9);
    dirLight.position.set(8, 16, 10);
    this.scene.add(ambient, dirLight);

    // 建立平台體素
    for (const p of levelData.platforms) {
      for (let x = p.startX; x <= p.endX; x++) {
        this.scene.add(VoxelFactory.createTileBlock(x, p.y, x % 2 === 0));
      }
    }

    // 建立檢查點與終點
    for (const cp of levelData.checkpoints) {
      const flag = VoxelFactory.createCheckpointFlag(cp.x, cp.y);
      this.checkpointFlags.push(flag);
      this.scene.add(flag);
    }
    this.scene.add(VoxelFactory.createGoalArch(levelData.goalX, 0));

    // 建立陷阱網格
    for (const h of levelData.hazards) {
      const mesh =
        h.type === 'rock'
          ? VoxelFactory.createRockMesh(h.width, h.height)
          : VoxelFactory.createSawMesh(h.width, h.height);
      this.hazardMeshes.set(h.id, mesh);
      this.scene.add(mesh);
    }

    // 建立樹懶與水平碰撞盒外框
    this.slothGroup = VoxelFactory.createSlothGroup();
    this.scene.add(this.slothGroup);

    const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.65));
    const wireMat = new THREE.LineBasicMaterial({ color: 0x34d399 });
    this.hitboxWire = new THREE.LineSegments(wireGeo, wireMat);
    this.scene.add(this.hitboxWire);

    this.sonarFX = new SonarPostFX(this.scene);

    window.addEventListener('resize', this.handleResize);
  }

  private readonly handleResize = (): void => {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const halfH = this.viewHeight / 2;
    const halfW = halfH * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    this.webgl.setSize(window.innerWidth, window.innerHeight);
  };

  public render(state: SimulationState): void {
    const { sloth } = state;
    this.slothGroup.position.set(sloth.x, sloth.y, 0);
    this.slothGroup.scale.x = sloth.facing === 'right' ? 1 : -1;

    // 碰撞盒視覺外框（隨蓄力步幅倍率放大）
    this.hitboxWire.position.set(sloth.x, sloth.y + sloth.hitbox.h / 2, 0);
    this.hitboxWire.scale.set(sloth.hitbox.w, sloth.hitbox.h, 1);

    // 更新檢查點旗幟顏色
    for (let i = 0; i < this.checkpointFlags.length; i++) {
      const flag = this.checkpointFlags[i].getObjectByName('flagMesh') as THREE.Mesh | undefined;
      if (flag) {
        const mat = flag.material as THREE.MeshLambertMaterial;
        mat.color.setHex(i <= state.activeCheckpointIndex ? 0x10b981 : 0x3b82f6);
      }
    }

    // 更新陷阱位置
    for (const h of state.hazards) {
      const mesh = this.hazardMeshes.get(h.id);
      if (mesh) {
        mesh.position.set(h.aabb.x + h.aabb.w / 2, h.aabb.y + h.aabb.h / 2, 0);
        if (h.type === 'saw' && !state.isFrozen) {
          mesh.rotation.z -= 0.15;
        }
      }
    }

    // 相機平滑跟隨樹懶 X
    const targetCamX = Math.max(4, Math.min(22, sloth.x + 2));
    this.camera.position.x += (targetCamX - this.camera.position.x) * 0.12;
    this.camera.lookAt(this.camera.position.x, 2.0, 0);

    this.sonarFX.update(this.webgl.domElement, state.isFrozen, state.predictedPaths);
    this.webgl.render(this.scene, this.camera);
  }
}

import * as THREE from 'three';
import type { LevelData, SimulationState, VineSwitchDef } from '../types';
import { SonarPostFX } from './SonarPostFX';
import { VoxelFactory } from './VoxelFactory';

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private webgl: THREE.WebGLRenderer;
  private slothGroup: THREE.Group;
  private hitboxWire: THREE.LineSegments;
  private hazardMeshes = new Map<string, THREE.Group>();
  private rockDropShadows = new Map<string, THREE.Group>();
  private canopyGroups = new Map<string, THREE.Group>();
  private vineSwitchGroups: Array<{ def: VineSwitchDef; group: THREE.Group }> = [];
  private checkpointFlags: THREE.Group[] = [];
  private sonarFX: SonarPostFX;
  private viewHeight = 9.5;
  private camFocusX = 2;

  constructor(container: HTMLElement, levelData: LevelData) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);

    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const halfH = this.viewHeight / 2;
    const halfW = halfH * aspect;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
    // 採用 2.5D 斜向俯視角 (Oblique 2.5D Angle)，確保每個體素方塊同時展現頂面、正面與側面立體光影
    this.camera.position.set(this.camFocusX - 2.6, 4.3, 14);
    this.camera.lookAt(this.camFocusX, 1.8, 0);

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.webgl.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.92);
    dirLight.position.set(8, 16, 10);
    this.scene.add(ambient, dirLight);

    // 建立平台體素（包含左側 x = -4..0 回走走道）
    for (const p of levelData.platforms) {
      for (let x = p.startX; x <= p.endX; x++) {
        this.scene.add(VoxelFactory.createTileBlock(x, p.y, Math.abs(x) % 2 === 0));
      }
    }

    // 建立古樹藤蔓開關石碑與高空攀爬樹藤橫枝
    for (const sw of levelData.vineSwitches ?? []) {
      const swGroup = VoxelFactory.createVineSwitch(sw.x, sw.y);
      this.vineSwitchGroups.push({ def: sw, group: swGroup });
      this.scene.add(swGroup);
    }

    for (const branch of levelData.canopyBranches ?? []) {
      const branchGroup = VoxelFactory.createCanopyBranch(
        branch.startX,
        branch.endX,
        branch.y,
        false
      );
      this.canopyGroups.set(branch.id, branchGroup);
      this.scene.add(branchGroup);
    }

    // 建立檢查點與終點
    for (const cp of levelData.checkpoints) {
      const flag = VoxelFactory.createCheckpointFlag(cp.x, cp.y);
      this.checkpointFlags.push(flag);
      this.scene.add(flag);
    }
    this.scene.add(VoxelFactory.createGoalArch(levelData.goalX, 0));

    // 建立陷阱複合模型、圓鋸滑軌與落石地面警戒投影
    for (const h of levelData.hazards) {
      if (h.type === 'rock') {
        const rockGroup = VoxelFactory.createRockMesh(h.width, h.height);
        this.hazardMeshes.set(h.id, rockGroup);
        this.scene.add(rockGroup);

        const { ceilingMount, dropShadow } = VoxelFactory.createRockFixture(
          h.x,
          h.topY,
          h.width
        );
        this.rockDropShadows.set(h.id, dropShadow);
        this.scene.add(ceilingMount, dropShadow);
      } else {
        const sawTrack = VoxelFactory.createSawTrack(
          h.startX,
          h.startY,
          h.endX,
          h.endY,
          h.width,
          h.height
        );
        this.scene.add(sawTrack);

        const sawGroup = VoxelFactory.createSawMesh(h.width, h.height);
        this.hazardMeshes.set(h.id, sawGroup);
        this.scene.add(sawGroup);
      }
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
    VoxelFactory.updateSlothPose(this.slothGroup, sloth, state.worldTick);

    // 碰撞盒視覺外框（隨蓄力步幅倍率放大）
    this.hitboxWire.position.set(sloth.x, sloth.y + sloth.hitbox.h / 2, 0);
    this.hitboxWire.scale.set(sloth.hitbox.w, sloth.hitbox.h, 1);

    // 更新古樹藤蔓開關與高空樹藤橫枝狀態
    const unlockedSet = new Set(state.unlockedCanopyIds);
    for (const [id, group] of this.canopyGroups.entries()) {
      VoxelFactory.updateCanopyBranch(group, unlockedSet.has(id));
    }
    for (const { def, group } of this.vineSwitchGroups) {
      const crystal = group.getObjectByName('switchCrystal') as THREE.Mesh | undefined;
      if (crystal) {
        const mat = crystal.material as THREE.MeshLambertMaterial;
        const active = unlockedSet.has(def.targetCanopyId);
        mat.color.setHex(active ? 0x10b981 : 0xf59e0b);
        crystal.rotation.y += state.isFrozen ? 0 : 0.04;
      }
    }

    // 更新檢查點旗幟顏色
    for (let i = 0; i < this.checkpointFlags.length; i++) {
      const flag = this.checkpointFlags[i].getObjectByName('flagMesh') as THREE.Mesh | undefined;
      if (flag) {
        const mat = flag.material as THREE.MeshLambertMaterial;
        mat.color.setHex(i <= state.activeCheckpointIndex ? 0x10b981 : 0x3b82f6);
      }
    }

    // 更新陷阱位置、圓鋸高速旋轉與落石地面投影縮放
    for (const h of state.hazards) {
      const mesh = this.hazardMeshes.get(h.id);
      if (mesh) {
        mesh.position.set(h.aabb.x + h.aabb.w / 2, h.aabb.y + h.aabb.h / 2, 0);
        if (h.type === 'saw') {
          const blade = mesh.getObjectByName('sawBlade');
          if (blade && !state.isFrozen) {
            blade.rotation.z -= 0.24;
          }
        } else if (h.type === 'rock') {
          const rockBody = mesh.getObjectByName('rockBody');
          if (rockBody && !state.isFrozen) {
            rockBody.rotation.z = Math.sin(state.worldTick * 0.35) * 0.06;
          }
          const shadow = this.rockDropShadows.get(h.id);
          if (shadow) {
            const proximity = Math.max(0.35, 1.15 - (h.aabb.y / 6.5) * 0.65);
            shadow.scale.set(proximity, 1, proximity);
          }
        }
      }
    }

    // 相機平滑跟隨樹懶 X（支援往左走道 x = -4..0 與往右終點 x = 25）
    const lookAhead = sloth.facing === 'right' ? 1.5 : -1.5;
    const targetCamX = Math.max(-1.5, Math.min(22, sloth.x + lookAhead));
    this.camFocusX += (targetCamX - this.camFocusX) * 0.12;
    this.camera.position.set(this.camFocusX - 2.6, 4.3, 14);
    this.camera.lookAt(this.camFocusX, 1.8, 0);

    this.sonarFX.update(this.webgl.domElement, state.isFrozen, state.predictedPaths);
    this.webgl.render(this.scene, this.camera);
  }
}

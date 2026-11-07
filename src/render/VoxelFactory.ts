import * as THREE from 'three';
import type { SlothState } from '../types';

export class VoxelFactory {
  public static createSlothGroup(): THREE.Group {
    const group = new THREE.Group();

    const furMat = new THREE.MeshLambertMaterial({ color: 0x7c5a3f });
    const darkFurMat = new THREE.MeshLambertMaterial({ color: 0x5c4028 });
    const bellyMat = new THREE.MeshLambertMaterial({ color: 0xd6bfa3 });
    const faceMat = new THREE.MeshLambertMaterial({ color: 0xf3e5ab });
    const eyePatchMat = new THREE.MeshLambertMaterial({ color: 0x3b2314 });
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const clawMat = new THREE.MeshLambertMaterial({ color: 0xfef3c7 });
    const mossMat = new THREE.MeshLambertMaterial({ color: 0x65a30d });
    const darkMossMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f });

    // 1. 樹懶微駝軀幹與淺色肚皮
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torso';
    torsoGroup.position.set(-0.04, 0.42, 0);

    const mainTorso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.52), furMat);
    mainTorso.rotation.z = -0.18;
    torsoGroup.add(mainTorso);

    const backHump = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.46), darkFurMat);
    backHump.position.set(-0.08, 0.22, 0);
    torsoGroup.add(backHump);

    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.54), bellyMat);
    belly.position.set(0.06, -0.04, 0);
    torsoGroup.add(belly);

    // 野生樹懶背部共生綠藻/苔蘚斑塊
    const mossPatch0 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.36), mossMat);
    mossPatch0.name = 'mossPatch0';
    mossPatch0.position.set(-0.12, 0.31, 0.05);
    const mossPatch1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.28), darkMossMat);
    mossPatch1.name = 'mossPatch1';
    mossPatch1.position.set(-0.24, 0.16, -0.08);
    torsoGroup.add(mossPatch0, mossPatch1);

    group.add(torsoGroup);

    // 2. 頭部、奶油色臉盤與標誌性「八字下垂黑眼圈」
    const headGroup = new THREE.Group();
    headGroup.name = 'head';
    headGroup.position.set(0.22, 0.78, 0);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.48), furMat);
    headGroup.add(skull);

    const faceDisc = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.31, 0.42), faceMat);
    faceDisc.position.set(0.18, -0.01, 0);
    headGroup.add(faceDisc);

    // 八字下垂深褐眼斑 (Tear-streak eye patches)
    const eyePatchL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.14), eyePatchMat);
    eyePatchL.name = 'eyePatchL';
    eyePatchL.position.set(0.24, 0.01, 0.12);
    eyePatchL.rotation.x = 0.35;

    const eyePatchR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.14), eyePatchMat);
    eyePatchR.name = 'eyePatchR';
    eyePatchR.position.set(0.24, 0.01, -0.12);
    eyePatchR.rotation.x = -0.35;
    headGroup.add(eyePatchL, eyePatchR);

    // 半瞇睡眼與眼皮
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), eyeMat);
    eyeL.position.set(0.26, 0.03, 0.11);
    const eyeR = eyeL.clone();
    eyeR.position.z = -0.11;

    const eyelidL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), darkFurMat);
    eyelidL.position.set(0.265, 0.06, 0.11);
    const eyelidR = eyelidL.clone();
    eyelidR.position.z = -0.11;
    headGroup.add(eyeL, eyeR, eyelidL, eyelidR);

    // 鼻頭與慢活微笑嘴角
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.1), eyeMat);
    snout.name = 'snout';
    snout.position.set(0.28, -0.02, 0);
    const smile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.18), eyePatchMat);
    smile.name = 'smile';
    smile.position.set(0.26, -0.09, 0);
    headGroup.add(snout, smile);

    group.add(headGroup);

    // 3. 修長四肢與三趾彎曲鐮刀長爪 (Three-toed curved claws)
    const createLimbWithClaws = (
      name: string,
      shoulderPos: [number, number, number],
      upperLen: number,
      foreLen: number,
      isFront: boolean
    ): THREE.Group => {
      const limbPivot = new THREE.Group();
      limbPivot.name = name;
      limbPivot.position.set(shoulderPos[0], shoulderPos[1], shoulderPos[2]);

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, upperLen, 0.13),
        isFront ? furMat : darkFurMat
      );
      upper.position.set(0, -upperLen / 2, 0);
      limbPivot.add(upper);

      const foreGroup = new THREE.Group();
      foreGroup.position.set(0.03, -upperLen, 0);
      foreGroup.rotation.z = isFront ? 0.28 : -0.18;

      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.13, foreLen, 0.12), furMat);
      fore.position.set(0, -foreLen / 2, 0);
      foreGroup.add(fore);

      // 三趾鐮刀長爪 (3 curved ivory claws per limb)
      const zOffsets = [-0.045, 0, 0.045];
      for (let toe = 0; toe < 3; toe++) {
        const claw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.03), clawMat);
        claw.name = `claw_${name}_${toe}`;
        claw.position.set(0.09, -foreLen + 0.02, zOffsets[toe]);
        claw.rotation.z = -0.32;
        foreGroup.add(claw);
      }

      limbPivot.add(foreGroup);
      return limbPivot;
    };

    const frontArmL = createLimbWithClaws('frontArmL', [0.14, 0.56, 0.28], 0.34, 0.26, true);
    const frontArmR = createLimbWithClaws('frontArmR', [0.14, 0.56, -0.28], 0.34, 0.26, true);
    const backLegL = createLimbWithClaws('backLegL', [-0.22, 0.38, 0.24], 0.24, 0.2, false);
    const backLegR = createLimbWithClaws('backLegR', [-0.22, 0.38, -0.24], 0.24, 0.2, false);

    group.add(frontArmL, frontArmR, backLegL, backLegR);

    return group;
  }

  public static updateSlothPose(
    group: THREE.Group,
    sloth: Pick<SlothState, 'phase' | 'holdTicks'> & { isClimbingCanopy?: boolean },
    worldTick: number
  ): void {
    const torso = group.getObjectByName('torso');
    const head = group.getObjectByName('head');
    const frontArmL = group.getObjectByName('frontArmL');
    const frontArmR = group.getObjectByName('frontArmR');
    const backLegL = group.getObjectByName('backLegL');
    const backLegR = group.getObjectByName('backLegR');

    if (!torso || !head || !frontArmL || !frontArmR || !backLegL || !backLegR) {
      return;
    }

    if (sloth.isClimbingCanopy) {
      // 樹懶招牌「三趾爪倒掛攀爬橫枝」姿態：四肢全數向上伸展勾住頭頂樹藤，背部朝下擺盪前進
      const climbSwing = Math.sin(worldTick * 0.25) * 0.32;
      torso.position.y = 0.48;
      torso.position.x = 0;
      torso.rotation.z = 0.22;
      head.position.y = 0.68;
      head.position.x = 0.28;

      frontArmL.rotation.z = 2.35 + climbSwing;
      frontArmR.rotation.z = 2.35 - climbSwing;
      backLegL.rotation.z = 2.15 - climbSwing;
      backLegR.rotation.z = 2.15 + climbSwing;
      return;
    }

    torso.rotation.z = 0;

    if (sloth.phase === 'windup') {
      // 蓄力時前爪向前伸展、後爪向後張開，直觀呈現碰撞箱隨蓄力擴大至 x1.4
      const ratio = Math.min(1, sloth.holdTicks / 132);
      const tremor = sloth.holdTicks >= 48 ? Math.sin(worldTick * 1.5) * 0.02 * ratio : 0;

      torso.position.y = 0.42 - ratio * 0.08;
      torso.position.x = -0.04 + tremor;
      head.position.y = 0.78 - ratio * 0.06;
      head.position.x = 0.22 + ratio * 0.08 + tremor;

      frontArmL.rotation.z = 0.15 + ratio * 0.95;
      frontArmR.rotation.z = 0.05 + ratio * 0.85;
      backLegL.rotation.z = -0.12 - ratio * 0.85;
      backLegR.rotation.z = -0.05 - ratio * 0.75;
    } else if (sloth.phase === 'stepping') {
      // 慢動作跨步擺臂與三趾長爪划動
      const stride = Math.sin(worldTick * 0.22);
      torso.position.y = 0.44 + Math.abs(stride) * 0.05;
      torso.position.x = -0.04;
      head.position.y = 0.8 + Math.abs(stride) * 0.04;
      head.position.x = 0.24;

      frontArmL.rotation.z = 0.45 + stride * 0.55;
      frontArmR.rotation.z = 0.45 - stride * 0.55;
      backLegL.rotation.z = -0.35 - stride * 0.45;
      backLegR.rotation.z = -0.35 + stride * 0.45;
    } else {
      // 待機或轉身：慵懶慢速呼吸起伏
      const breath = Math.sin(worldTick * 0.06) * 0.02;
      torso.position.y = 0.42 + breath;
      torso.position.x = -0.04;
      head.position.y = 0.78 + breath * 1.2;
      head.position.x = 0.22;

      frontArmL.rotation.z = 0.12 + breath;
      frontArmR.rotation.z = 0.04 - breath;
      backLegL.rotation.z = -0.08;
      backLegR.rotation.z = -0.02;
    }
  }

  public static createTileBlock(x: number, y: number, isEven: boolean): THREE.Mesh {
    const color = isEven ? 0x4b5563 : 0x374151;
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.6, 1.2), mat);
    mesh.position.set(x, y - 0.3, 0);
    return mesh;
  }

  public static createCanopyBranch(
    startX: number,
    endX: number,
    y: number,
    isUnlocked: boolean
  ): THREE.Group {
    const group = new THREE.Group();
    const span = endX - startX;
    const midX = (startX + endX) / 2;

    const barkMat = new THREE.MeshLambertMaterial({ color: 0x4a3525 });
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const vineMat = new THREE.MeshLambertMaterial({
      color: isUnlocked ? 0x22c55e : 0x92400e,
    });

    // 左右兩側支撐老樹幹與樹冠
    const leftTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.26, y + 0.4, 0.26), barkMat);
    leftTrunk.position.set(startX, y / 2, -0.32);
    const rightTrunk = leftTrunk.clone();
    rightTrunk.position.set(endX, y / 2, -0.32);

    const leftCrown = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.65), foliageMat);
    leftCrown.position.set(startX, y + 0.3, -0.2);
    const rightCrown = leftCrown.clone();
    rightCrown.position.set(endX, y + 0.3, -0.2);

    // 橫跨上方的木質主枝與可伸縮攀爬藤蔓橋 (vineBridge)
    const mainBough = new THREE.Mesh(new THREE.BoxGeometry(span + 0.4, 0.16, 0.24), barkMat);
    mainBough.position.set(midX, y + 0.1, -0.15);

    const vineBridge = new THREE.Group();
    vineBridge.name = 'vineBridge';
    vineBridge.position.set(midX, y - 0.04, 0);

    const mainVine = new THREE.Mesh(new THREE.BoxGeometry(span, 0.14, 0.34), vineMat);
    mainVine.name = 'mainVineMesh';
    vineBridge.add(mainVine);

    // 垂掛藤蔓節點，供樹懶三趾爪抓握
    const numTendrils = Math.max(3, Math.round(span * 2));
    for (let i = 0; i < numTendrils; i++) {
      const tx = -span / 2 + ((i + 0.5) / numTendrils) * span;
      const tendril = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.28 + (i % 2) * 0.12, 0.14),
        vineMat
      );
      tendril.position.set(tx, -0.18, 0);
      vineBridge.add(tendril);
    }

    group.add(leftTrunk, rightTrunk, leftCrown, rightCrown, mainBough, vineBridge);
    VoxelFactory.updateCanopyBranch(group, isUnlocked);
    return group;
  }

  public static updateCanopyBranch(group: THREE.Group, isUnlocked: boolean): void {
    const vineBridge = group.getObjectByName('vineBridge') as THREE.Group | undefined;
    if (!vineBridge) return;
    vineBridge.scale.x = isUnlocked ? 1.0 : 0.18;
    vineBridge.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshLambertMaterial;
        mat.color.setHex(isUnlocked ? 0x22c55e : 0x92400e);
      }
    });
  }

  public static createVineSwitch(x: number, y: number): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6b7280 });
    const mossMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f });
    const crystalMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.58), stoneMat);
    base.position.set(0, 0.12, -0.2);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.38), stoneMat);
    pillar.position.set(0, 0.45, -0.22);

    const mossTrim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.42), mossMat);
    mossTrim.position.set(0, 0.28, -0.22);

    const crystal = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), crystalMat);
    crystal.name = 'switchCrystal';
    crystal.position.set(0, 0.95, -0.22);
    crystal.rotation.z = Math.PI / 4;

    group.add(base, pillar, mossTrim, crystal);
    group.position.set(x, y, 0);
    return group;
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

  public static createRockMesh(w: number, h: number): THREE.Group {
    const group = new THREE.Group();
    const rockBody = new THREE.Group();
    rockBody.name = 'rockBody';

    const basaltMat = new THREE.MeshLambertMaterial({ color: 0x57534e });
    const slateMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
    const darkCragMat = new THREE.MeshLambertMaterial({ color: 0x292524 });
    const veinMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const mossMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f });

    // 多塊不規則交錯玄武岩主體
    const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h * 0.68, 0.62), basaltMat);
    core.position.set(0, h * 0.06, 0);
    rockBody.add(core);

    const upperLobe = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.45, 0.54), slateMat);
    upperLobe.position.set(-w * 0.1, h * 0.22, 0.04);
    upperLobe.rotation.z = 0.18;
    rockBody.add(upperLobe);

    const sideChunk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h * 0.52, 0.56), darkCragMat);
    sideChunk.position.set(w * 0.14, h * 0.02, -0.03);
    sideChunk.rotation.z = -0.22;
    rockBody.add(sideChunk);

    // 底部 3 根尖銳鐘乳石碎岩尖刺 (Crags)
    const cragOffsets = [-w * 0.24, 0, w * 0.24];
    const cragHeights = [h * 0.34, h * 0.44, h * 0.32];
    for (let i = 0; i < 3; i++) {
      const crag = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.2, cragHeights[i], 0.36),
        darkCragMat
      );
      crag.name = `crag_${i}`;
      crag.position.set(cragOffsets[i], -h * 0.32 - cragHeights[i] * 0.2, 0);
      crag.rotation.z = (i - 1) * 0.14;
      rockBody.add(crag);
    }

    // 琥珀橘礦脈裂紋與頂部青苔
    const vein0 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 0.48, 0.65), veinMat);
    vein0.name = 'vein_0';
    vein0.position.set(-w * 0.08, h * 0.05, 0);
    vein0.rotation.z = 0.32;

    const vein1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.36, h * 0.1, 0.64), veinMat);
    vein1.name = 'vein_1';
    vein1.position.set(w * 0.1, -h * 0.08, 0);
    vein1.rotation.z = -0.25;

    const mossCap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.12, 0.58), mossMat);
    mossCap.position.set(0, h * 0.42, 0);

    rockBody.add(vein0, vein1, mossCap);
    group.add(rockBody);
    return group;
  }

  public static createRockFixture(
    x: number,
    startY: number,
    width: number
  ): { ceilingMount: THREE.Group; dropShadow: THREE.Group } {
    // 頂部鐘乳石洞窟發射口
    const ceilingMount = new THREE.Group();
    ceilingMount.name = 'ceilingMount';
    const caveMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x44403c });

    const topArch = new THREE.Mesh(new THREE.BoxGeometry(width * 1.3, 0.35, 0.8), caveMat);
    const innerChute = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.28, 0.72), rimMat);
    innerChute.position.set(0, -0.2, 0);
    ceilingMount.add(topArch, innerChute);
    ceilingMount.position.set(x + width / 2, startY + 0.65, 0);

    // 地面落點警戒陰影
    const dropShadow = new THREE.Group();
    dropShadow.name = 'dropShadow';
    const outerWarn = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.95, 0.04, 0.75),
      new THREE.MeshLambertMaterial({ color: 0xef4444 })
    );
    const innerDark = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.65, 0.05, 0.52),
      new THREE.MeshLambertMaterial({ color: 0x111827 })
    );
    dropShadow.add(outerWarn, innerDark);
    dropShadow.position.set(x + width / 2, 0.02, 0);

    return { ceilingMount, dropShadow };
  }

  public static createSawMesh(w: number, h: number): THREE.Group {
    const group = new THREE.Group();
    const radius = Math.min(w, h) * 0.44;

    // 1. 高速旋轉金屬圓鋸片 (sawBlade)
    const sawBlade = new THREE.Group();
    sawBlade.name = 'sawBlade';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db });
    const toothMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const hubRingMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const axleMat = new THREE.MeshLambertMaterial({ color: 0x111827 });

    // 雙層八角金屬圓盤主體
    const discA = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.45, radius * 1.45, 0.12),
      steelMat
    );
    const discB = discA.clone();
    discB.rotation.z = Math.PI / 4;
    const innerPlate = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.95, radius * 0.95, 0.16),
      rimMat
    );
    sawBlade.add(discA, discB, innerPlate);

    // 外圍 12 枚放射狀鮮紅警戒鋸齒
    const numTeeth = 12;
    for (let i = 0; i < numTeeth; i++) {
      const angle = (i / numTeeth) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.34, radius * 0.24, 0.15),
        toothMat
      );
      tooth.name = `tooth_${i}`;
      tooth.position.set(Math.cos(angle) * radius * 0.96, Math.sin(angle) * radius * 0.96, 0);
      tooth.rotation.z = angle + Math.PI / 3;
      sawBlade.add(tooth);
    }

    // 中央黃黑警戒轉軸與鉚釘
    const hubRing = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.48, radius * 0.48, 0.2),
      hubRingMat
    );
    hubRing.name = 'hubRing';
    const hubAxle = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.22, radius * 0.22, 0.26),
      axleMat
    );
    hubAxle.name = 'hubAxle';
    sawBlade.add(hubRing, hubAxle);

    // 2. 不隨鋸片旋轉的工業護罩滑塊底座 (sawMount)
    const sawMount = new THREE.Group();
    sawMount.name = 'sawMount';
    const mountMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, h * 0.24, 0.28), mountMat);
    carriage.position.set(0, -radius * 0.55, -0.08);
    sawMount.add(carriage);

    group.add(sawBlade, sawMount);
    return group;
  }

  public static createSawTrack(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    w = 1.0,
    h = 1.0
  ): THREE.Group {
    const group = new THREE.Group();
    const cx1 = startX + w / 2;
    const cy1 = startY + h / 2;
    const cx2 = endX + w / 2;
    const cy2 = endY + h / 2;

    const dx = cx2 - cx1;
    const dy = cy2 - cy1;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const railMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const slotMat = new THREE.MeshLambertMaterial({ color: 0x7f1d1d });
    const stopperMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

    const railGroove = new THREE.Mesh(new THREE.BoxGeometry(len + 0.4, 0.18, 0.12), railMat);
    railGroove.name = 'railGroove';
    railGroove.position.set((cx1 + cx2) / 2, (cy1 + cy2) / 2, -0.2);
    railGroove.rotation.z = angle;

    const innerSlot = new THREE.Mesh(new THREE.BoxGeometry(len + 0.2, 0.06, 0.14), slotMat);
    innerSlot.position.copy(railGroove.position);
    innerSlot.rotation.z = angle;

    const stopperStart = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.18), stopperMat);
    stopperStart.position.set(cx1, cy1, -0.2);
    const stopperEnd = stopperStart.clone();
    stopperEnd.position.set(cx2, cy2, -0.2);

    group.add(railGroove, innerSlot, stopperStart, stopperEnd);
    return group;
  }
}

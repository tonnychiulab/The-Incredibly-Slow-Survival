# SLO-MO 設計規格（MVP）

來源企劃書為 [SLO-MO.txt](../SLO-MO.txt)；跨功能的全專案規則見 [contract.md](contract.md)。

## 1. 產品概述
瀏覽器 HTML5 / WebGL 動作解謎遊戲。玩家控制動作極慢的三趾樹懶，關卡陷阱卻以正常速度運行。關卡設計使反應時間不足以通關，只能靠預判與時間管理。長期方向是天梯比「步數最少」，不是誰最快（排序規則見[第 11 節](#11-後續mvp-外)）。

MVP 範圍：單機、1 個關卡（`level01`）。排行榜、幽靈、合成 Buff、抓取（`W`）不在 MVP。

- **要驗證的假設**：「靠預判通關」的玩法是否成立。
- **非目標**：存檔、反作弊、行動裝置。

## 2. 名詞
- **模擬時鐘（`tick`）**：遊戲唯一的根時鐘，固定步長，頻率 60 tick/秒，永遠單調遞增。所有設定檔秒數於載入時一次四捨五入轉換為整數 `tick`。重播時間戳與聲納凍結／冷卻倒數皆以 `tick` 計。
- **世界時間（`worldTick`）**：非聲納凍結期間累積的 `tick` 數（未凍結時每推進 1 `tick` 則 `worldTick += 1`；聲納凍結時停止累加）。驅動陷阱週期相位、玩家動作／蓄力計時與單關時間上限。
- **前搖**：按下同向方向鍵後、動作真正開始前的等待階段。
- **蓄力**：前搖結束後繼續按住方向鍵，累積步幅等級。
- **步**：放開方向鍵、出步動作開始的那一刻算 1 步，三種步幅都算 1 步。
- **檢查點**：死亡後的狀態回溯與復活位置。
- **聲納**：凍結世界時間並顯示陷阱未來軌跡的能力。

## 3. 玩家動作
- **視角**：2D 橫向捲軸（體素 2.5D，正交相機）。
- **轉身**：按下與目前面向相反的方向鍵時，先自動執行 `轉身時間` 的轉身動作（不算步數）。轉身期間放開按鍵僅完成轉身；轉身完成後若仍按住該方向鍵，立刻開始計算前搖與蓄力。
- **按住時間**：面向與方向鍵一致且角色處於閒置（非轉身、非出步中）時，從開始前搖起算，僅在 `worldTick` 前進時累積。放開按鍵時依累積的按住時間決定結果：

  | 按住時間 | 結果 | 步幅距離 | 出步期間水平碰撞盒 |
  |---|---|---|---|
  | `[0, 前搖)` | 取消，不算步 | 0 格 | ×1.0 |
  | `[前搖, 蓄力1)` | 小步 | 1 格 | ×1.0 |
  | `[蓄力1, 蓄力2)` | 中步 | 2 格 | ×1.2 |
  | `≥ 蓄力2` | 大步 | 3 格 | ×1.4 |

- **碰撞盒**：`×1.0`（1 格寬，以角色座標為中心）是樹懶站立時的水平受擊判定寬度。倍率只在出步動作進行中生效，動作結束回到 `×1.0`。
- **出步與缺口跨越**：三種步幅的出步動作耗時皆為固定的 `出步耗時`，期間水平座標隨 `worldTick` 線性插值移動，每 `worldTick` 進行陷阱受擊判定，並僅在出步結束落腳的那一 `worldTick` 檢查腳下地形。步幅 $N$ 格可跨過 $N-1$ 格寬的缺口（小步 1 格移至相鄰實地、中步 2 格跨過 1 格缺口、大步 3 格跨過 2 格缺口）；落腳點若為缺口則判定為「墜落」死亡。
- **單一按鍵追蹤（無預判佇列）**：輸入系統僅追蹤當前按住的方向鍵狀態，不設多步輸入佇列。出步動作結束或解凍回到閒置時，若方向鍵仍處於按住狀態，才從該刻起開始新一步的轉身或前搖計時。
- **失焦**：視窗失去焦點（`blur`）時，視為放開所有按鍵。
- **音訊啟動**：首次收到使用者輸入後才初始化並啟動音訊。

## 4. 聲納
- 玩家於存活狀態下的任何時刻（含閒置、轉身、前搖蓄力或出步進行中），只要聲納冷卻為 0 即可啟動聲納。
- 啟動後凍結 `worldTick` 共 `聲納凍結` 時長，冷卻從啟動那一刻起算共 `聲納冷卻` 時長（含凍結時間）。凍結與冷卻倒數皆以根時鐘 `tick` 計算。
- 凍結期間所有依賴 `worldTick` 的狀態（陷阱相位、轉身、前搖蓄力累積、出步位移）全部暫停；解凍後依原進度繼續推進。若玩家在凍結期間放開正在前搖蓄力中的方向鍵，於放開當下依已累積的 `worldTick` 結算（若屬 `[0, 前搖)` 則取消）。
- 凍結期間畫面轉為黑白並顯示陷阱未來 `軌跡長度`（依 `worldTick` 往後推算）的移動軌跡。

## 5. 陷阱與關卡
- 陷阱固定週期、完全確定性，無內部可變狀態；任意時刻的陷阱位置純為 `worldTick` 與關卡 JSON 初始相位的確定性函數 `f(worldTick)`。
- MVP 陷阱：落石（垂直週期往復／掉落）、電鋸（水平／固定軌道週期巡邏）；地形：實地平台與缺口。
- **level01 三段教學**：
  1. 只有移動 + 慢速落石。
  2. 加入聲納 + 電鋸。
  3. 加入蓄力 + 缺口與短週期陷阱。第三段至少有一處寬度 2 格、只能用大步（3 格）通過的缺口。
- 前兩段結尾各一個檢查點，角色落腳經過時自動啟用。第三段結尾是終點，不算檢查點。

## 6. 死亡與計分
- 觸發死亡後經過 `重生延遲`（以 `tick` 計，期間忽略移動輸入）回到最近已啟用的檢查點（若尚未啟用任何檢查點則回到起點），恢復後可立刻操作。
- 重生時，玩家位置、朝向、`worldTick` 與已計步數皆回溯至該檢查點啟用時的快照（陷阱位置隨 `worldTick` 回溯自動還原）；死亡當次自檢查點以來的步數與 `worldTick` 作廢。
- 死亡畫面 MVP 顯示死因：`落石`、`電鋸`、`墜落` 或 `逾時`。
- MVP 記錄並於通關結果畫面顯示三項數據：步數、通關世界時間（`worldTick` 換算秒數）、死亡次數。
- 單關時間上限為 `單關時間上限`（以當次嘗試的 `worldTick` 計），超過即觸發 `逾時` 死亡並回溯至最近檢查點。
- 出步中途死亡者，該步雖已於出步開始時計入，但重生時隨檢查點快照一併回溯。

## 7. 音效（MVP）
- MVP 使用 WebAudio 程式合成之佔位音效，外部錄音素材替換不列入 MVP 完成標準。
- 風聲環境音：靜止（閒置、前搖蓄力、轉身、凍結）時音量低；移動（出步動作進行中）時音量提高。
- 出步開始時播放短促動作佔位音效（「呃……啊……」合成音）。

## 8. MVP 完成標準
1. 瀏覽器可從頭通關 `level01`（三段、兩個檢查點、一個終點）。
2. 本機記錄步數、世界時間、死亡次數，並於抵達終點時顯示結果畫面。
3. 前搖、取消、蓄力（含轉身與缺口判定）、聲納、計分（含檢查點回溯與逾時）各至少有一個單元測試，且 `npm test` 退出碼為 0。
4. 相同的 `(tick, 輸入事件)` 序列輸入模擬核心重播，得到完全相同的最終狀態（位置、步數、`worldTick`、死亡次數）。

## 9. 暫定數值（待原型驗證）
所有時間參數集中於設定檔（以秒定義，載入時以 `60 tick/秒` 四捨五入轉為整數 `tick`）：

| 參數名稱 | 暫定值 | 對應 tick 數（60Hz） |
|---|---|---|
| 前搖 | 0.8s | 48 ticks |
| 蓄力1 / 蓄力2 | 1.5s / 2.2s | 90 / 132 ticks |
| 轉身時間 | 0.4s | 24 ticks |
| 出步耗時 | 1.0s | 60 ticks |
| 聲納凍結 / 聲納冷卻 | 3.0s / 8.0s | 180 / 480 ticks |
| 軌跡長度 | 2.0s | 120 ticks |
| 重生延遲 | 1.0s | 60 ticks |
| 單關時間上限 | 600s（10 分鐘） | 36000 ticks |

### 原型待驗證項目
- 移除預判佇列、改為單一按鍵追蹤與凍結期間放開即依當前累積 `worldTick` 結算的操作體感。
- 步幅距離（1 / 2 / 3 格）、出步耗時（1.0s）與 `level01` 第三段 2 格寬大步缺口的難度配置。
- `level01` 預估通關時間約 3–4 分鐘（關卡設計參考值，不進設定檔）。

## 10. 架構約束
- 模擬核心為純邏輯、固定步長（60 tick/秒）、無 DOM / WebGL / WebAudio 相依，可獨立執行單元測試與重播測試。
- 渲染與音效層僅單向讀取模擬狀態，不回寫模擬狀態。
- 所有時間與幾何常數集中於單一設定模組（`src/config.ts`），品牌文字集中於 `src/brand.ts`（依 [contract.md](contract.md)）。
- 重播僅記錄 `(tick, 輸入事件)` 序列；其中 `輸入事件` 為底層離散事件（左／右方向鍵按下與放開、啟動聲納、視窗失焦）。

## 11. 後續（MVP 外）
- 天梯排序：只認無死亡通關；步數少者優先；同步數時的次要排序規則待設計。
- CC0 真實場景錄音素材替換與動態混音。

---

## Detailed Implementation Plan

### 1. 目標範圍與檔案邊界（Target Scope & File Boundary）

本實作計畫嚴格限制於下列新增、修改與刪除之檔案清單：

| 動作 | 檔案路徑 | 用途與變更理由 |
|---|---|---|
| 新增 | `src/brand.ts` | 依 [contract.md](contract.md) §2 集中定義遊戲標題、分頁標題、副標與【老馬麵攤製作】品牌字串。 |
| 新增 | `src/config.ts` | 集中定義 §3 與 §9 所有時間參數（秒與換算後整數 `tick`）、步幅格數、碰撞盒倍率與單幀最大追趕 `MAX_TICKS_PER_FRAME`。 |
| 修改 | `src/types.ts` | 定義確定性模擬所需之所有資料型別（`Direction`、`InputEvent`、`SlothPhase`、`SlothState`、`CheckpointSnapshot`、`DeathCause`、`LevelData`、`HazardDef`、`SimulationState`、`ReplayFrame`）。 |
| 修改 | `src/core/Clock.ts` | 實作根時鐘 `tick`、世界時間 `worldTick` 與固定步長累加器（含單幀最大追趕上限 `MAX_TICKS_PER_FRAME = 10`）。 |
| 修改 | `src/core/Input.ts` | 將瀏覽器鍵盤與 `blur` 事件轉為帶 `tick` 標記的 `InputEvent` 佇列供當下 tick 消費，並提供首次輸入音訊解鎖回呼。 |
| 修改 | `src/core/StateMachine.ts` | 實作純函式／確定性模擬核心 `Simulation`（整合 `Clock`、`Sloth`、`SonarSystem`、`Level`、`Scoring`），支援單步 `stepTick(events)` 與重播 `runReplay(level, frames)`。 |
| 修改 | `src/player/Sloth.ts` | 實作樹懶狀態機（`idle`、`turning`、`windup`、`stepping`、`dead`）、按住時間累積、步幅與碰撞盒計算、線性插值座標更新。 |
| 刪除 | `src/player/ActionQueue.ts` | 已依 Stage 8 決策移除上限 2 的預判輸入佇列，由 `Sloth.ts` 直接追蹤當前按住的方向鍵狀態。 |
| 修改 | `src/systems/SonarSystem.ts` | 實作聲納凍結（180 ticks）與冷卻（480 ticks）倒數，以及呼叫各陷阱 `predictPath(worldTick, worldTick + 120)` 產生軌跡點。 |
| 修改 | `src/systems/Scoring.ts` | 實作步數、`worldTick`、死亡次數統計、檢查點快照保存／回溯，以及 36000 `worldTick` 逾時判定。 |
| 修改 | `src/world/Physics.ts` | 實作 2D AABB 碰撞檢測 `intersects(a, b)` 與落腳格地形判定 `isSolidTile(platforms, tileX)`。 |
| 修改 | `src/world/hazards/Hazard.ts` | 定義無狀態確定性陷阱介面：`getAABB(worldTick): AABB` 與 `predictPath(fromWorldTick, toWorldTick, stepTicks): Vec2[]`。 |
| 修改 | `src/world/hazards/FallingRock.ts` | 實作落石無狀態週期公式（依 `periodTicks`、`phaseTicks`、`fallTicks`、`topY`、`bottomY` 計算當下 AABB）。 |
| 修改 | `src/world/hazards/Saw.ts` | 實作電鋸無狀態來回巡邏公式（依 `periodTicks`、`phaseTicks`、`startPos`、`endPos` 三角波插值計算當下 AABB）。 |
| 修改 | `src/world/Level.ts` | 封裝關卡平台區段、檢查點、起點、終點與陷阱實例陣列。 |
| 修改 | `src/world/LevelLoader.ts` | 解析並驗證 `LevelData` JSON，實例化 `FallingRock` 與 `Saw` 並回傳 `Level`。 |
| 修改 | `src/levels/level01.json` | 定義 `level01` 三段教學（第 1 段移動＋慢速落石、第 2 段聲納＋電鋸、第 3 段蓄力＋2 格寬缺口與短週期陷阱，含 2 個檢查點與終點）。 |
| 修改 | `docs/level-format.md` | 更新關卡 JSON 格式說明以對齊 `LevelData` schema。 |
| 新增 | `src/ui/Loading.ts` | 依 [contract.md](contract.md) §3 實作單一載入畫面元件（含【老馬麵攤製作】與平面可愛風老馬內嵌 SVG，載入超過 300ms 才顯示）。 |
| 新增 | `src/ui/HUD.ts` | 實作等寬字型 HUD（步數、世界時間、死亡次數、蓄力條、聲納冷卻）、死亡原因覆蓋層與通關結果畫面（含重玩按鈕）。 |
| 修改 | `src/render/VoxelFactory.ts` | 以 Three.js `BoxGeometry` 組合產生樹懶、平台方塊、檢查點旗幟、終點拱門、落石與電鋸之體素網格。 |
| 修改 | `src/render/SonarPostFX.ts` | 控制聲納凍結時的黑白場景材質／濾鏡切換，並以Three.js `Line` / 殘影點繪製未來 120 ticks 的陷阱軌跡。 |
| 修改 | `src/render/Renderer.ts` | 初始化 Three.js `WebGLRenderer` 與正交相機（跟隨樹懶 X 座標），每幀讀取 `SimulationState` 更新網格位置與碰撞盒視覺提示。 |
| 修改 | `src/audio/AudioManager.ts` | 使用 WebAudio API 合成背景低頻風聲（隨 `stepping` 狀態切換增益）與出步「呃……啊……」滑音佔位音效。 |
| 修改 | `src/core/Game.ts` | 串接 `Loading`、`Simulation`、`Input`、`Renderer`、`HUD` 與 `AudioManager`，驅動 `requestAnimationFrame` 主迴圈。 |
| 修改 | `src/main.ts` | 設定 `document.title`（取自 `src/brand.ts`）並啟動 `Game`。 |
| 修改 | `index.html` | 引入自託管等寬字型樣式與基礎滿版畫布容器。 |
| 新增 | `docs/assets.md` | 依 [contract.md](contract.md) §5–§6 建立外部素材與字型授權登記表。 |
| 新增 | `src/__tests__/simulation.test.ts` | 單元與確定性重播測試套件（涵蓋前搖、取消、三段蓄力、轉身、缺口跨越、聲納凍結與冷卻、檢查點回溯、逾時與重播一致性）。 |

（註：`src/player/Inventory.ts`、`src/systems/BuffSystem.ts`、`src/net/GhostService.ts`、`src/net/LeaderboardService.ts`、`src/net/mock/MockServices.ts` 為 MVP 外之預留空殼，保持不變且不納入模擬核心相依。）

---

### 2. 分階段實作步驟與規格細節（Phased Actionable Steps）

#### Phase 1：基礎常數、型別與無狀態關卡／陷阱模型
1. **`src/brand.ts`**：匯出常數 `BRAND = { GAME_TITLE: 'SLO-MO: 慢速極限', PAGE_TITLE: 'SLO-MO 慢速極限 | 老馬麵攤', SUBTITLE: 'The Incredibly Slow Survival', STUDIO: '【老馬麵攤製作】' } as const`。
2. **`src/config.ts`**：
   - 定義 `TICK_RATE = 60` 與 `toTicks(sec: number): number => Math.round(sec * TICK_RATE)`。
   - 匯出 `CONFIG`：
     - `windupTicks: 48`（0.8s）、`charge1Ticks: 90`（1.5s）、`charge2Ticks: 132`（2.2s）
     - `turnTicks: 24`（0.4s）、`stepDurationTicks: 60`（1.0s）
     - `sonarFreezeTicks: 180`（3.0s）、`sonarCooldownTicks: 480`（8.0s）、`sonarPreviewTicks: 120`（2.0s）
     - `respawnDelayTicks: 60`（1.0s）、`levelTimeoutTicks: 36000`（600s）
     - `stepDistances: { small: 1, medium: 2, large: 3 }`
     - `hitboxMultipliers: { idle: 1.0, small: 1.0, medium: 1.2, large: 1.4 }`
     - `slothBaseWidth: 1.0`（格）、`slothHeight: 1.0`（格）
     - `maxTicksPerFrame: 10`
3. **`src/types.ts`**：
   - `Direction = 'left' | 'right'`
   - `InputEvent = { type: 'keyDown' | 'keyUp'; dir: Direction } | { type: 'sonar' } | { type: 'blur' }`
   - `ReplayFrame = { tick: number; events: InputEvent[] }`
   - `DeathCause = '落石' | '電鋸' | '墜落' | '逾時'`
   - `SlothPhase = 'idle' | 'turning' | 'windup' | 'stepping' | 'dead'`
   - `CheckpointSnapshot = { x: number; y: number; facing: Direction; worldTick: number; steps: number; checkpointIndex: number }`
   - `LevelData`：
     - `id: string`
     - `start: { x: number; y: number }`
     - `goalX: number`
     - `platforms: Array<{ startX: number; endX: number; y: number }>`（闭區間整數格 `[startX, endX]` 為實地，區間外為缺口）
     - `checkpoints: Array<{ id: string; x: number; y: number }>`（共 2 個）
     - `hazards: Array<FallingRockDef | SawDef>`
4. **`src/world/Physics.ts`**：
   - `intersects(a: AABB, b: AABB): boolean`：採開區間重疊判定 `a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y`。
   - `isSolidTile(platforms: PlatformDef[], tileX: number): boolean`：檢查 `Math.round(tileX)` 是否落在任一 `platform` 的 `[startX, endX]` 內。
5. **`src/world/hazards/FallingRock.ts` 與 `Saw.ts`**：
   - `FallingRock`：以 `localTick = (worldTick + phaseTicks) % periodTicks` 計算高度；當 `localTick < fallTicks` 時由 `topY` 線性降至 `bottomY`，其餘時間位於待機高度（不碰撞地面角色）。
   - `Saw`：以 `localTick = (worldTick + phaseTicks) % periodTicks` 計算正規化進度 `u = localTick / periodTicks`，前 50% 由 `startPos` 線性移至 `endPos`，後 50% 由 `endPos` 移回 `startPos`。
   - 兩者皆實作 `predictPath(fromWorldTick, toWorldTick, stepTicks = 6)`，回傳未來 120 `worldTick` 每 6 ticks 取樣的中心點座標陣列。

#### Phase 2：確定性模擬核心（Clock、Sloth、Sonar、Scoring、Simulation）
1. **`src/core/Clock.ts`**：
   - 維護 `tick = 0`、`worldTick = 0`。
   - `advance(isFrozen: boolean)`：`tick += 1`；若 `!isFrozen` 則 `worldTick += 1`。
   - `resetWorldTick(targetWorldTick: number)`：重生回溯時將 `worldTick` 設為快照值（`tick` 不回溯）。
2. **`src/player/Sloth.ts`**：
   - 維護按鍵狀態 `heldKeys: { left: boolean; right: boolean }` 與最後按下的有效方向 `activeDir(): Direction | null`。
   - **狀態轉換規則（僅在 `worldTick` 前進時推進動作計時）**：
     - `idle`：若 `activeDir()` 存在：
       - 若 `activeDir() !== facing`：進入 `turning`，設定 `timer = 0`、`targetFacing = activeDir()`。
       - 若 `activeDir() === facing`：進入 `windup`，設定 `holdTicks = 0`。
     - `turning`：每 `worldTick` 遞增 `timer += 1`。若途中玩家放開該方向鍵，轉身仍繼續至 `turnTicks`（24 ticks）完成並更新 `facing = targetFacing` 後回到 `idle`；若完成時該方向鍵仍按住，更新 `facing` 並立刻轉入 `windup`（`holdTicks = 0`）。
     - `windup`：
       - 若當前該方向鍵仍按住：每 `worldTick` 遞增 `holdTicks += 1`。
       - 若該方向鍵已放開（含在聲納凍結期間放開）：立刻依當下 `holdTicks` 結算：
         - `holdTicks < 48`：取消，回到 `idle`，步數不變。
         - `48 <= holdTicks < 90`：踏出小步（`dist = 1`，`hitboxMult = 1.0`）。
         - `90 <= holdTicks < 132`：踏出中步（`dist = 2`，`hitboxMult = 1.2`）。
         - `holdTicks >= 132`：踏出大步（`dist = 3`，`hitboxMult = 1.4`）。
       - 踏出時：`steps += 1`，記錄 `stepStartX = x`、`stepTargetX = x + (facing === 'right' ? dist : -dist)`、`stepTimer = 0`，狀態轉為 `stepping`。
     - `stepping`：每 `worldTick` 遞增 `stepTimer += 1`，位置線性插值 `x = stepStartX + (stepTargetX - stepStartX) * (stepTimer / 60)`。當前受擊 AABB 寬度為 `slothBaseWidth * hitboxMult`（以 `x` 為中心）。當 `stepTimer === 60` 時：`x = stepTargetX`、`hitboxMult = 1.0`，回到 `idle`（並由 `Simulation` 觸發落腳地形檢查、檢查點啟用與終點判定）。
3. **`src/systems/SonarSystem.ts`**：
   - 維護 `freezeRemainingTicks = 0`、`cooldownRemainingTicks = 0`。
   - `tryActivate(slothPhase: SlothPhase)`：若 `slothPhase !== 'dead'` 且 `cooldownRemainingTicks === 0`，設 `freezeRemainingTicks = 180`、`cooldownRemainingTicks = 480`。
   - 每根時鐘 `tick`：`if (freezeRemainingTicks > 0) freezeRemainingTicks -= 1`；`if (cooldownRemainingTicks > 0) cooldownRemainingTicks -= 1`。
4. **`src/systems/Scoring.ts` 與 `src/core/StateMachine.ts`（`Simulation`）**：
   - 每個根時鐘 `tick` 的確定性執行順序：
     1. 消費該 `tick` 的所有 `InputEvent`（更新方向鍵按住狀態、處理 `blur` 放開全部按鍵、處理 `sonar` 啟動請求；若在凍結中放開方向鍵且處於 `windup`，立即結算取消或出步）。
     2. 推進 `Clock` 與 `SonarSystem`（決定本 `tick` 是否為凍結狀態）。
     3. 若處於 `dead` 狀態：遞減 `respawnRemainingTicks`（以 `tick` 計）；歸零時載入最近 `CheckpointSnapshot`（還原 `x, y, facing, worldTick, steps`），狀態回到 `idle`。
     4. 若非凍結且非 `dead`：
        - 推進 `Sloth` 1 個 `worldTick`。
        - 若剛完成落腳（`stepTimer` 到達 60）：
          - 檢查 `Physics.isSolidTile(level.platforms, sloth.x)`，若為 `false` 則觸發死亡（`cause = '墜落'`）。
          - 若未死亡且經過新檢查點，更新 `CheckpointSnapshot`。
          - 若 `sloth.x >= level.goalX`，標記 `isVictory = true`。
        - 檢查所有 `level.hazards` 在當下 `worldTick` 的 AABB 是否與樹懶當前 AABB 相交，若相交則觸發死亡（`cause = '落石'` 或 `'電鋸'`）。
        - 檢查 `worldTick >= CONFIG.levelTimeoutTicks`（36000），若超過則觸發死亡（`cause = '逾時'`）。
5. **關卡資料 `src/levels/level01.json`**：
   - 第 1 段（`x: 0..8`）：連續實地平台 `[0, 8]`，於 `x = 4` 配置慢速落石（週期 180 ticks），`x = 8` 設檢查點 1。
   - 第 2 段（`x: 8..16`）：連續實地平台 `[8, 16]`，於 `x = 10..14` 配置水平巡邏電鋸（週期 120 ticks），`x = 16` 設檢查點 2。
   - 第 3 段（`x: 16..25`）：平台 `[16, 18]`、**2 格寬缺口（`x = 19, 20` 無平台，必須在 `x = 18` 蓄力至 `≥ 132 ticks` 踏出 3 格大步跳至 `x = 21`）**、平台 `[21, 25]`，於 `x = 23` 配置短週期落石（週期 90 ticks），`goalX = 25`。

#### Phase 3：單元測試與重播驗證（TDD 先行驗證模擬核心）
1. 建立 `src/__tests__/simulation.test.ts`，在純 Node/Vitest 環境直接測試 `Simulation`，驗證 §8 第 3、4 項完成標準。

#### Phase 4：Three.js 2.5D 體素渲染、WebAudio 音效與品牌 UI 整合
1. **`src/ui/Loading.ts`**、**`src/ui/HUD.ts`**：實作契約規定之載入畫面、HUD、死因提示與通關畫面。
2. **`src/render/VoxelFactory.ts`**、**`src/render/SonarPostFX.ts`**、**`src/render/Renderer.ts`**：實作正交相機體素渲染與聲納黑白軌跡預覽。
3. **`src/audio/AudioManager.ts`**：實作首次輸入啟動之 WebAudio 風聲與出步音效。
4. **`src/core/Game.ts`**、**`src/main.ts`**、**`docs/assets.md`**：完成瀏覽器端組裝與素材授權登記。

---

### 3. 測試計畫（Test Plan）

`src/__tests__/simulation.test.ts` 必須實作並通過以下具體測試案例：

1. **前搖取消測試（Windup Cancel）**：按住右鍵推進 47 `worldTick` 後放開，驗證狀態回到 `idle`、`x === 0`、`steps === 0`。
2. **三段蓄力步幅與碰撞盒倍率測試（Charge Tiers & Hitbox）**：
   - 按住 48 ticks 放開：進入 `stepping`，期間碰撞盒寬度為 `1.0`，60 ticks 後 `x === 1`、`steps === 1`。
   - 按住 90 ticks 放開：期間碰撞盒寬度為 `1.2`，60 ticks 後 `x === 2`、`steps === 1`。
   - 按住 132 ticks 放開：期間碰撞盒寬度為 `1.4`，60 ticks 後 `x === 3`、`steps === 1`。
3. **反方向轉身測試（Opposite-Direction Turn）**：初始面向右，按住左鍵：前 24 `worldTick` 處於 `turning` 且 `steps === 0`；若於第 24 tick 仍按住則自動轉入 `windup`，再按住 48 ticks（總計 72 ticks）放開後向左踏出 1 格（60 ticks 後 `x === -1`、`steps === 1`）。
4. **缺口跨越與墜落判定測試（Gap Crossing & Fall Death）**：在 `x = 18` 面對 `x = 19, 20` 的 2 格寬缺口：
   - 用小步（1 格，落於 `19`）或中步（2 格，落於 `20`）：出步途中（1..59 ticks）不死亡，第 60 tick 落腳時觸發 `墜落` 死亡。
   - 用大步（3 格，落於 `21`）：途中飛越 `19, 20` 不死亡，第 60 tick 安全落腳於 `21`。
5. **聲納凍結、冷卻與凍結中放開測試（Sonar Freeze & Cooldown）**：
   - 前搖至 30 `worldTick` 時啟動聲納：驗證接下來的 180 `tick` 內 `worldTick` 保持不變、陷阱位置不變；解凍後再按住 18 `tick` 即可達 48 `worldTick` 出步，且聲納在啟動後 480 `tick` 內無法再次啟動。
   - 前搖至 30 `worldTick` 時啟動聲納，並於凍結期間放開方向鍵：驗證因 `holdTicks === 30 < 48` 立即取消動作。
6. **檢查點快照回溯與逾時測試（Checkpoint Rollback & Timeout）**：
   - 走過檢查點 1（快照記錄當下 `worldTick` 與 `steps`），之後多走 2 步並撞上電鋸死亡：等待 60 `tick` 重生後，驗證 `x`、`worldTick` 與 `steps` 完全退回檢查點 1 快照值，且 `deaths === 1`。
   - 推進 `worldTick` 至 36000：驗證觸發 `逾時` 死亡並回溯至最近檢查點。
7. **確定性重播一致性測試（Deterministic Replay）**：以同一組 `ReplayFrame[]` 序列對 `Simulation.runReplay(level01, frames)` 執行兩次，驗證兩次輸出的最終 `(x, y, facing, worldTick, steps, deaths, isVictory)` 深度相等。

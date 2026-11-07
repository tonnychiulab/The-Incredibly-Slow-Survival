# 關卡 JSON 格式（`LevelData` Schema）

定義於 [`src/types.ts`](../src/types.ts)，由 [`src/world/LevelLoader.ts`](../src/world/LevelLoader.ts) 載入並實例化。

## 頂層欄位

- `id`: `string` — 關卡識別碼（例如 `"level01"`）。
- `start`: `{ x: number; y: number }` — 玩家起始格座標。
- `goalX`: `number` — 終點 X 座標（玩家落腳時 `x >= goalX` 即判定通關）。
- `platforms`: `Array<{ startX: number; endX: number; y: number }>` — 實地平台閉區間 `[startX, endX]`（整數格），區間外視為缺口。
- `checkpoints`: `Array<{ id: string; x: number; y: number }>` — 檢查點清單（`level01` 共 2 個，落腳通過時自動啟用並記錄快照）。
- `hazards`: `Array<FallingRockDef | SawDef>` — 無狀態確定性週期陷阱定義：
  - `type: "rock"`：`{ id, type, x, topY, bottomY, width, height, periodTicks, phaseTicks, fallTicks }`
  - `type: "saw"`：`{ id, type, startX, startY, endX, endY, width, height, periodTicks, phaseTicks }`

# 關卡資料格式規範 (`docs/level-format.md`)

關卡以靜態 JSON 定義（見 `src/levels/level01.json`），所有長度單位為「格（tile）」，時間單位為 **`worldTick`**（60Hz，即 `1 秒 = 60 worldTicks`）。

## 結構欄位

- `id`: `string` — 關卡識別碼（例如 `"level01"`）。
- `start`: `{ x: number, y: number }` — 樹懶初始格子座標（`level01` 為 `{ x: 0, y: 0 }`，左側 `x = -4..0` 為回走走道）。
- `goalX`: `number` — 終點 X 座標（抵達或超越即判定過關）。
- `platforms`: `Array<{ startX: number, endX: number, y: number }>` — 實心平台區間（含端點）；相鄰平台之間的整數格空隙即為斷崖深坑（例如 `x = 19..20`）。
- `vineSwitches`: `Array<{ id: string, x: number, y: number, targetCanopyId: string }>` — 古樹藤蔓共鳴石碑，當樹懶踏上 `x` 時即解鎖對應 `targetCanopyId` 的高空攀爬樹藤。
- `canopyBranches`: `Array<{ id: string, startX: number, endX: number, y: number }>` — 高空橫枝／樹藤攀爬架；當處於已解鎖狀態且樹懶以 3 格大步跨越 `[startX, endX]` 時，樹懶會伸出三趾長爪勾住橫枝倒掛攀爬通過（可越過地面圓鋸或斷崖深坑）。
- `checkpoints`: `Array<{ id: string, x: number, y: number }>` — 檢查點清單。當樹懶落腳 `x >= checkpoint.x` 時啟用並記錄 `(位置, 朝向, worldTick, 步數, 已解鎖樹藤清單)` 快照。
- `hazards`: 確定性週期陷阱陣列，所有位置皆為 `worldTick` 的無狀態純函數：
  - **落石 (`type: "rock"`)**：
    - `x`, `topY`, `bottomY`, `width`, `height`, `periodTicks`, `phaseTicks`, `fallTicks`
    - `localTick = (worldTick + phaseTicks) % periodTicks`
    - 當 `localTick < fallTicks` 時，由 `topY` 線性墜落至 `bottomY`；其餘時間復位停留在 `topY`。
  - **地面往復圓鋸 (`type: "saw"`)**：
    - `startX`, `startY`, `endX`, `endY`, `width`, `height`, `periodTicks`, `phaseTicks`
    - 以三角波在 `(startX, startY)` 與 `(endX, endY)` 之間等速水平往復巡邏。

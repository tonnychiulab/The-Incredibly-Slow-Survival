# 🦥 SLO-MO: 慢速極限 (The Incredibly Slow Survival)

> **「當全世界都比你快十倍，唯一的生存之道就是預判未來。」**  
> **【老馬麵攤製作】** — HTML5 / WebGL (Three.js) 2.5D 體素慢動作預判解謎遊戲

[![🎮 馬上玩 Play Now](https://img.shields.io/badge/%F0%9F%8E%AE_%E9%A6%AC%E4%B8%8A%E7%8E%A9_Play_Now-SLO--MO_%E6%85%A2%E9%80%9F%E6%A5%B5%E9%99%90-10B981?style=for-the-badge)](https://tonnychiulab.github.io/The-Incredibly-Slow-Survival/)
[![Tests](https://img.shields.io/badge/Vitest-8%2F8_Passed-34D399?style=for-the-badge)](#%E6%9C%AC%E6%A9%9F%E9%96%8B%E7%99%BC%E8%88%87%E6%B8%AC%E8%A9%A6)
[![License: MIT](https://img.shields.io/badge/License-MIT-FBBF24?style=for-the-badge)](#%E6%8E%88%E6%AC%8A%E8%88%87%E7%B4%A0%E6%9D%90)

👉 **[點此立即在瀏覽器遊玩 (https://tonnychiulab.github.io/The-Incredibly-Slow-Survival/)](https://tonnychiulab.github.io/The-Incredibly-Slow-Survival/)**

---

## 📸 遊戲關卡截圖 (Level 01 Screenshots)

### 1. 蓄力大步與動態碰撞盒（三段教學關卡 `level01`）
![SLO-MO Level 01 Gameplay](docs/screenshots/level01-gameplay.svg)

### 2. 聲納凍結模式（世界時間暫停 ＋ 陷阱未來 2.0 秒軌跡預覽）
![SLO-MO Sonar Freeze Mode](docs/screenshots/level01-sonar.svg)

---

## 🎯 遊戲特色與核心機制

在 **《SLO-MO: 慢速極限》** 中，你操控一隻動作極度緩慢的三趾樹懶，面對正常速度、固定週期且完全確定性的致命陷阱（落石、巡邏電鋸、斷崖缺口）。你無法靠即時反應閃避，只能透過**聲納預覽**與**精準的蓄力時間管理**，以最少步數通關。

### 🕹️ 操作說明

| 按鍵 | 動作 | 規則說明 |
|---|---|---|
| **`→` / `D`** 或 **`←` / `A`** | **轉身 / 前搖蓄力出步** | • 若按反方向鍵：先執行 **0.4s 轉身**（不算步數），完成後繼續按住自動進入前搖。<br>• **`[0, 0.8s)` 放開**：取消動作，不算步數。<br>• **`[0.8s, 1.5s)` 放開**：**小步（移動 1 格）**，出步期間水平碰撞盒 `×1.0`。<br>• **`[1.5s, 2.2s)` 放開**：**中步（移動 2 格，可跨 1 格缺口）**，碰撞盒放大為 `×1.2`。<br>• **`≥ 2.2s` 放開**：**大步（移動 3 格，可跨 2 格缺口）**，碰撞盒放大為 `×1.4`（步幅越大越容易被擊中）。 |
| **`Space` / `S` / `↓`** | **啟動聲納 (Sonar)** | 凍結世界時間 `worldTick` **3.0 秒**（冷卻 **8.0 秒**，自啟動起算），畫面轉為黑白並顯示所有陷阱未來 **2.0 秒** 的移動軌跡。 |

---

## 🗺️ Level 01 三段教學關卡設計

1. **第一段（`x = 0..8`）**：基礎前搖移動 ＋ 慢速週期落石（`x = 4`）→ **檢查點 1（`x = 8`）**。
2. **第二段（`x = 8..16`）**：聲納軌跡預覽 ＋ 軌道巡邏電鋸（`x = 10`）→ **檢查點 2（`x = 16`）**。
3. **第三段（`x = 16..25`）**：三段蓄力 ＋ **2 格寬斷崖缺口（`x = 19..20`，必須於 `x = 18` 蓄力滿 2.2 秒踏出 3 格大步跨越）** ＋ 短週期落石（`x = 23`）→ **終點拱門（`x = 25`）**。

---

## 🏗️ 確定性模擬架構 (Deterministic Architecture)

本專案採用純邏輯模擬核心與渲染／音效單向分離架構（詳見 [`docs/design.md`](docs/design.md) 與 [`docs/contract.md`](docs/contract.md)）：

- **單一根時鐘 `tick`（60Hz）與衍生世界時間 `worldTick`**：
  - `tick` 永遠以 60 tick/秒單調遞增，驅動重播時間戳 `(tick, InputEvent[])` 與聲納凍結／冷卻倒數。
  - `worldTick` 僅在非聲納凍結時累加，驅動無狀態確定性陷阱公式 `f(worldTick)`、樹懶動作計時與單關 10 分鐘上限。
- **檢查點快照回溯**：死亡重生時將 `(玩家位置, 朝向, worldTick, 步數)` 回溯至最近檢查點啟用時的快照，陷阱相位隨 `worldTick` 自動精確還原。
- **確定性重播**：相同的 `(tick, InputEvent[])` 輸入序列保證在任何環境下產出完全一致的最終狀態。

---

## 💻 本機開發與測試

```bash
# 安裝依賴
npm install

# 啟動開發伺服器 (http://localhost:5173)
npm run dev

# 執行單元測試與確定性重播測試 (Vitest)
npm test

# 建置生產環境靜態檔案 (dist/)
npm run build
```

---

## 📄 授權與素材

- 原始碼與程式生成體素／WebAudio 合成音效：**MIT License**（【老馬麵攤製作】）
- 外部素材與字型登記清單：見 [`docs/assets.md`](docs/assets.md)

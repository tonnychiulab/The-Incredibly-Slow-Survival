# 外部素材與授權登記表（Assets Registry）

依 [contract.md](contract.md) §5–§6 規範，所有字型、圖示、音效與場景素材登記如下：

| 名稱 | 類型 | 來源網址 / 產生方式 | 授權 | 作者 | 使用位置 |
|---|---|---|---|---|---|
| 平面可愛風老馬圖示（SVG） | 向量圖示 | 專案內原創內嵌 SVG | CC0 1.0 / MIT（原創） | 老馬麵攤 | `src/ui/Loading.ts` 載入畫面 |
| 體素角色、地形與陷阱模型 | 3D 網格 | Three.js `BoxGeometry` 程式生成 | MIT（原創程式碼） | 老馬麵攤 | `src/render/VoxelFactory.ts` |
| MVP 環境風聲與出步音效 | 音效 | WebAudio API 即時合成（白噪音濾波＋三角波滑音） | CC0 / MIT（原創程式碼合成） | 老馬麵攤 | `src/audio/AudioManager.ts` |
| 等寬字型（UI / HUD） | 字型 | Sarasa Mono TC（更紗黑體等寬，本地自託管回退系統等寬字型） | SIL Open Font License 1.1 | Belleve Invis | `index.html`、`src/ui/HUD.ts`、`src/ui/Loading.ts` |

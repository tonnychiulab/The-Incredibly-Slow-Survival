# 專案契約（Project Contract）

跨功能、全專案一致遵守的規則。規格與票都以此為準；變更需先改本文件。

## 1. 發佈與部署
- 原始碼託管於 GitHub。
- 部署目標為 Cloudflare **Workers + Static Assets**（Cloudflare 對新專案的建議；Pages 屬維護模式）。以 `wrangler.jsonc` 指向 `dist/`，可用 Workers Builds 或 GitHub Actions 部署。
- 建置產物為純靜態檔案；之後的排行榜／幽靈後端沿用同一個 Workers 專案（Workers / D1 / Durable Objects）。

## 2. 品牌文字
- 瀏覽器分頁標題、favicon、遊戲內所有文字與圖示，使用一致的品牌文字。
- 品牌字串集中定義於單一檔案（`src/brand.ts`），不得在各處硬編碼。
- 遊戲標題：「SLO-MO: 慢速極限」；分頁標題：「SLO-MO 慢速極限 | 老馬麵攤」；副標：「The Incredibly Slow Survival」。

## 3. 載入畫面
- 所有載入情境（首次載入、關卡切換）使用同一個載入視覺。
- 固定標示「【老馬麵攤製作】」，並搭配一隻可愛的老馬圖示（平面可愛風 SVG，先產生候選圖供挑選）。
- 載入元件單一實作（`src/ui/Loading`），不得各自重做。
- 資源就緒即進遊戲，不強制停留；載入超過 300ms 才顯示載入畫面。

## 4. 字型
- 全站使用等寬字型，含 UI、HUD、結果畫面。
- 採用 Sarasa Mono TC（更紗等寬，OFL），建置時子集化為只含遊戲用字的 woff2。
- 字型檔隨專案自行託管（self-host），不依賴外部 CDN。

## 5. 音效
- 音效風格一致，以真實場景的聲音搭配（風聲、樹林、環境音等）。
- 音效集中管理（`AudioManager`），來源與授權記錄於 `docs/assets.md`。
- 來源優先使用 CC0；不得已才用 CC-BY 並登記署名。

## 6. 素材
- 場景等素材可使用優秀的開源遊戲素材。
- 每一項外部素材必須在 `docs/assets.md` 登記：名稱、來源網址、授權、作者、使用位置。
- 授權須允許商用與再散布；風格須與整體一致。

## 待定事項
- 無（Q14–Q19 已定案）。


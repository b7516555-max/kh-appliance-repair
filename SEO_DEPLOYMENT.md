# SEO 部署紀錄文件 (SEO_DEPLOYMENT.md)

## 網站基本資訊
- **SEO 網站名稱**：高雄市小家電檢修服務（線上預約、進度查詢與維修據點）
- **SEO 網站 URL（預設 GitHub Pages）**：`https://b7516555.github.io/kh-appliance-repair/`
- **GAS Web App 正式端點**：`https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec`
- **GAS Project 編輯器 URL**：`https://script.google.com/u/0/home/projects/1a1cx4--n5CxkdOYTuYlNdiYJl2VVAQuix0HrXuqMOEswunza5M7zNu6I/edit`
- **主辦單位**：高雄市政府環境保護局 環境管理處
- **服務諮詢專線**：(07) 735-1684（黃先生／洪小姐／刁先生）

---

## 部署與架構規範
- **原始碼目錄**：`public/`（獨立靜態檔案目錄，不影響現有 GAS 核心運作）
- **託管方案 (Hosting)**：GitHub Pages / Netlify / Cloudflare Pages（支援純靜態站點）
- **CI/CD 工作流程**：`.github/workflows/deploy-pages.yml`（推送至 main / master 分支自動觸發構建與發布）
- **公開資源檔案**：
  - Robots 網址：`https://b7516555.github.io/kh-appliance-repair/robots.txt`
  - Sitemap 網址：`https://b7516555.github.io/kh-appliance-repair/sitemap.xml`
  - Canonical 網址：`https://b7516555.github.io/kh-appliance-repair/`
  - Web Manifest：`https://b7516555.github.io/kh-appliance-repair/manifest.webmanifest`
  - Open Graph 預覽圖：`https://b7516555.github.io/kh-appliance-repair/og-image.svg`

---

## SEO 與結構化資料配置
- **標題 (Title)**：高雄市小家電檢修服務｜線上預約、進度查詢與維修據點
- **網頁描述 (Description)**：高雄市小家電檢修服務由高雄市政府環境保護局主辦，提供市民小家電與玩具免費線上預約檢修、維修進度即時查詢、定點與巡迴據點資訊，推動以修代買、資源循環與廢棄物減量。
- **目標搜尋關鍵字**：高雄小家電維修, 高雄小家電檢修, 高雄市小家電維修, 小家電維修 高雄, 小家電檢修 高雄, 高雄 小家電 以修代買, 樂活綠高雄 小家電, 玩具維修
- **Schema.org JSON-LD 類型**：
  1. `GovernmentOrganization`（高雄市政府環境保護局環境管理處）
  2. `WebSite`
  3. `Service`（小家電與玩具免費檢測維修）
  4. `FAQPage`（涵蓋送修資格、免工資說明、材料費原則、預約流程、進度查詢、維修據點等 6 大核心問題）

---

## 狀態紀錄 (Status)
- **Google Search Console 狀態**：前置檔案 (`robots.txt`, `sitemap.xml`, `JSON-LD`) 已就緒，等待所有權驗證與提交 Sitemap。
- **Google 索引狀態**：尚未提交（待遠端 Repo 建立與 Search Console 驗證）。
- **Google Analytics 狀態**：已在 HTML 中預留 GA4 載入腳本設定區塊。
- **自訂網域 (Custom Domain)**：尚未設定（目前預設使用 GitHub Pages 路徑，可隨時綁定自訂網域）。
- **安全掃描**：全專案無任何 Google API Secret、LINE Token 或機密私鑰洩漏。
- **最後驗證日期**：2026-08-28

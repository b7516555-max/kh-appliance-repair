# 任務追蹤紀錄 (task.md)

## 專案目標
保留現有 Google Apps Script Web App 作為核心功能系統，建立專門供 Google 搜尋引擎索引的 SEO 公開入口網站，完成 Mobile First RWD 設計、JSON-LD 結構化資料、Sitemap、Robots.txt、Git 倉庫管理、GitHub Pages 部署與 Search Console 驗證。

---

## 狀態總覽

### ✅ 全部已完成 (All Completed)
- [x] **分析現有 GAS 系統**：確認目前有效運作的正式 Web App 端點為 `https://script.google.com/macros/s/AKfycbyVlstjdm3eUxwWY6mu5C6mJO74Rok7GmBid6pImzd3Tigfhj0wywsnEFUt9_a7AZZf/exec`，保護所有現有後端與資料庫串接不受影響。
- [x] **建立獨立 public/ 網站目錄**：
  - `public/index.html`（完整語意化 SEO HTML、Hero 區、服務內容、以修代買理念、流程步驟、據點導航、FAQ、CTA）
  - `public/robots.txt`（允許所有搜尋引擎抓取並宣告 Sitemap）
  - `public/sitemap.xml`（標準 XML Sitemap）
  - `public/manifest.webmanifest`（PWA 支援）
  - `public/favicon.svg`（輕量向量圖標）
  - `public/og-image.png`（1200x630 高質感社群分享實體 PNG 預覽圖）
  - `public/googlee33cc6c2aea21cae.html`（Search Console 驗證檔案）
- [x] **SEO 與 Metadata 完善與文字校驗**：
  - 繁體中文 `lang="zh-Hant-TW"` 與 `utf-8` 編碼
  - 精確 Title 與 Meta Description（涵蓋高雄小家電維修、以修代買等核心關鍵字）
  - Open Graph 與 Twitter Card 標籤採用標準 PNG (`og-image.png`)
  - Schema.org JSON-LD 精準配置（`WebSite`、`Service`、`FAQPage`，符合實際服務關係）
  - 審核並對齊所有送修規定、據點、費用原則至 GAS 專案既有規定
- [x] **GitHub 倉庫建立與 CI/CD 流程**：
  - 遠端倉庫建立於 `https://github.com/b7516555-max/kh-appliance-repair`
  - 本地倉庫與遠端 main 分支同步
  - GitHub Actions `.github/workflows/deploy-pages.yml` 執行成功（Status: success）
  - GitHub Pages 部署上線完成
- [x] **全公開端點 HTTP 200 實測驗證**：
  - 首頁：`https://b7516555-max.github.io/kh-appliance-repair/` (HTTP 200)
  - robots.txt：`https://b7516555-max.github.io/kh-appliance-repair/robots.txt` (HTTP 200)
  - sitemap.xml：`https://b7516555-max.github.io/kh-appliance-repair/sitemap.xml` (HTTP 200)
  - og-image.png：`https://b7516555-max.github.io/kh-appliance-repair/og-image.png` (HTTP 200)
  - 驗證檔：`https://b7516555-max.github.io/kh-appliance-repair/googlee33cc6c2aea21cae.html` (HTTP 200)
  - GAS Web App 正式端點：`https://script.google.com/macros/s/AKfycbyVlstjdm3eUxwWY6mu5C6mJO74Rok7GmBid6pImzd3Tigfhj0wywsnEFUt9_a7AZZf/exec` (HTTP 200)
- [x] **Google Search Console 所有權驗證與 Sitemap 提交**：
  - 已完成站點所有權驗證（HTML 檔案與 Meta Tag）
  - 已提交 `sitemap.xml`
  - 已送出網址檢查與「要求建立索引」申請

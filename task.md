# 任務追蹤紀錄 (task.md)

## 專案目標
保留現有 Google Apps Script Web App 作為核心功能系統，建立專門供 Google 搜尋引擎索引的 SEO 公開入口網站，完成 Mobile First RWD 設計、JSON-LD 結構化資料、Sitemap、Robots.txt、Git 倉庫管理與部署配置。

---

## 狀態總覽

### ✅ 已完成 (Completed)
- [x] **分析現有 GAS 系統**：確認正式 Web App 端點為 `https://script.google.com/macros/s/AKfycbyVlstjdm3eUxwWY6mu5C6mJO74Rok7GmBid6pImzd3Tigfhj0wywsnEFUt9_a7AZZf/exec`，保護所有現有後端與資料庫串接不受影響。
- [x] **建立獨立 public/ 網站目錄**：
  - `public/index.html`（完整語意化 SEO HTML、Hero 區、服務內容、以修代買理念、流程步驟、據點導航、FAQ、CTA）
  - `public/robots.txt`（允許所有搜尋引擎抓取並宣告 Sitemap）
  - `public/sitemap.xml`（標準 XML Sitemap）
  - `public/manifest.webmanifest`（PWA 支援）
  - `public/favicon.svg`（輕量向量圖標）
  - `public/og-image.png`（1200x630 高質感社群分享實體 PNG 預覽圖）
- [x] **SEO 與 Metadata 完善與文字校驗**：
  - 繁體中文 `lang="zh-Hant-TW"` 與 `utf-8` 編碼
  - 精確 Title 與 Meta Description（涵蓋高雄小家電維修、以修代買等核心關鍵字）
  - Open Graph 與 Twitter Card 標籤採用標準 PNG (`og-image.png`)
  - Schema.org JSON-LD 精準配置（`WebSite`、`Service`、`FAQPage`，不冒充政府官方主站）
  - 審核並對齊所有送修規定、據點、費用原則至 GAS 專案既有規定
- [x] **本地 Git 倉庫管理與 CI/CD 流程**：
  - 本地倉庫分支命名為 `main`
  - 配置完善 `.gitignore`，隔離暫存檔、敏感設定與巨大二進位檔
  - 建立 `.github/workflows/deploy-pages.yml`，支援 main 自動觸發 GitHub Pages 部署
  - 本地 commit 完成 (`fix: finalize SEO deployment and social metadata`)

---

### ⏳ 執行中 (In Progress)
- [x] 等待遠端 GitHub Repository 建立與推送

---

### 📌 尚未完成 (Pending)
- [ ] 遠端 GitHub Repository (`b7516555/kh-appliance-repair`) 尚未在 GitHub 伺服器建立（回傳 404）。
- [ ] GitHub Actions `deploy-pages.yml` 尚未於遠端執行。
- [ ] GitHub Pages 公開網址目前仍為 404，尚未正式上線。
- [ ] Google Search Console 提交與驗證（待網站正式上線後執行）。

---

### 🛡️ 外部權限阻擋紀錄 (External Permission Blockers)
- **GitHub 遠端倉庫建立**：本地無 `gh` CLI，且遠端伺服器尚無 `b7516555/kh-appliance-repair` 倉庫。需由使用者於 GitHub 網頁端建立 public repo。

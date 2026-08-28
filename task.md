# 任務追蹤紀錄 (task.md)

## 專案目標
保留現有 Google Apps Script Web App 作為核心功能系統，建立專門供 Google 搜尋引擎索引的 SEO 公開入口網站，完成 Mobile First RWD 設計、JSON-LD 結構化資料、Sitemap、Robots.txt、Git 倉庫管理與部署配置。

---

## 狀態總覽

### ✅ 已完成 (Completed)
- [x] **分析現有 GAS 系統**：確認正式 Web App 端點為 `https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec`，保護所有現有後端與資料庫串接不受影響。
- [x] **建立獨立 public/ 網站目錄**：
  - `public/index.html`（完整語意化 SEO HTML、Hero 區、服務內容、以修代買理念、流程步驟、據點導航、FAQ、CTA）
  - `public/robots.txt`（允許所有搜尋引擎抓取並宣告 Sitemap）
  - `public/sitemap.xml`（標準 XML Sitemap）
  - `public/manifest.webmanifest`（PWA 支援）
  - `public/favicon.svg`（輕量向量圖標）
  - `public/og-image.svg`（高質感社群分享預覽圖）
- [x] **SEO 與 Metadata 完善**：
  - 繁體中文 `lang="zh-Hant-TW"` 與 `utf-8` 編碼
  - 精確 Title 與 Meta Description（涵蓋高雄小家電維修、以修代買等核心關鍵字）
  - Open Graph 與 Twitter Card 標籤完整配置
  - Schema.org JSON-LD（含 `GovernmentOrganization`、`WebSite`、`Service`、`FAQPage`）
  - 核心 SEO 內容純 HTML 直接渲染（不依賴客戶端 JS）
- [x] **Git 倉庫管理與 CI/CD 流程**：
  - 配置完善 `.gitignore`，隔離暫存檔、敏感設定與巨大二進位檔
  - 建立 `.github/workflows/deploy-pages.yml`，支援 main / master 自動觸發 GitHub Pages 部署
- [x] **自動化結構與安全性驗證**：通過 18 項 SEO 與內容結構測試，確認無任何 API Key 或 Secret 洩漏。

---

### ⏳ 執行中 (In Progress)
- [x] 建立完整 `SEO_DEPLOYMENT.md` 部署文件與執行回報。

---

### 📌 尚未完成 / 等待後續串接 (Pending)
- [ ] 若需推送至遠端 GitHub，由使用者建立 GitHub 遠端倉庫並執行 `git remote add origin` 與 `git push`（受限於本地環境尚未登入 GitHub 帳號）。
- [ ] Google Search Console 站點所有權驗證與 Sitemap 提交（已預留驗證標記位置與標準 sitemap.xml 檔案）。

---

### 🛡️ 外部權限阻擋紀錄 (External Permission Blockers)
- **GitHub 帳號授權**：本機未安裝登入之 GitHub CLI (`gh`)，需使用者手動連結遠端 GitHub Repo。
- **Search Console 驗證**：需由具備 Google 帳號權限之擁有者登入 Search Console 進行網站驗證。

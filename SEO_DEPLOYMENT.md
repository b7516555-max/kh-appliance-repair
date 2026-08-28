# SEO 部署紀錄文件 (SEO_DEPLOYMENT.md)

## 網站基本資訊
- **SEO 網站名稱**：高雄市小家電檢修服務（線上預約、進度查詢與維修據點）
- **SEO 網站 URL（預設目標）**：`https://b7516555-max.github.io/kh-appliance-repair/`
- **GAS Web App 正式端點**：`https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec`
- **GAS Project 編輯器 URL**：`https://script.google.com/u/0/home/projects/1a1cx4--n5CxkdOYTuYlNdiYJl2VVAQuix0HrXuqMOEswunza5M7zNu6I/edit`
- **主辦/服務諮詢專線**：(07) 735-1684（黃先生／洪小姐／刁先生）

---

## 部署與架構規範
- **原始碼目錄**：`public/`（獨立靜態檔案目錄）
- **託管方案 (Hosting)**：GitHub Pages（待遠端倉庫建立並啟用）
- **CI/CD 工作流程**：`.github/workflows/deploy-pages.yml`
- **公開資源檔案**：
  - Robots 網址：`https://b7516555-max.github.io/kh-appliance-repair/robots.txt`
  - Sitemap 網址：`https://b7516555-max.github.io/kh-appliance-repair/sitemap.xml`
  - Open Graph 預覽圖：`https://b7516555-max.github.io/kh-appliance-repair/og-image.png`

---

## 當前真實狀態紀錄 (Real Status)
- **GitHub Repository 狀態**：尚未在遠端 GitHub 建立（遠端回傳 `repository not found`）
- **GitHub Pages 狀態**：尚未上線（目前 HTTP 404）
- **Lighthouse 實測**：未實測（因線上站點尚未可連線，依規定不填寫虛構數據）
- **Google Search Console 狀態**：前置檔案已配置，等待線上站點生效後進行所有權驗證
- **Google 索引狀態**：尚未提交
- **安全掃描**：全專案無任何 Google API Secret、LINE Token 或機密私鑰洩漏。
- **最後更新日期**：2026-08-28

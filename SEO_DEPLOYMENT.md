# SEO 部署紀錄文件 (SEO_DEPLOYMENT.md)

## 網站基本資訊
- **SEO 網站名稱**：高雄市小家電檢修服務（線上預約、進度查詢與維修據點）
- **SEO 網站 URL**：`https://b7516555-max.github.io/kh-appliance-repair/`
- **GAS Web App 正式端點**：`https://script.google.com/macros/s/AKfycbyVlstjdm3eUxwWY6mu5C6mJO74Rok7GmBid6pImzd3Tigfhj0wywsnEFUt9_a7AZZf/exec`
- **GAS Project 編輯器 URL**：`https://script.google.com/u/0/home/projects/1a1cx4--n5CxkdOYTuYlNdiYJl2VVAQuix0HrXuqMOEswunza5M7zNu6I/edit`
- **GitHub Repository**：`https://github.com/b7516555-max/kh-appliance-repair`
- **服務諮詢專線**：(07) 735-1684（黃先生／洪小姐／刁先生）

---

## 部署與架構規範
- **原始碼目錄**：`public/`（獨立靜態檔案目錄）
- **託管方案 (Hosting)**：GitHub Pages
- **分支 (Branch)**：`main`
- **CI/CD 工作流程**：`.github/workflows/deploy-pages.yml`（已部署成功）
- **公開資源檔案**：
  - 首頁網址：`https://b7516555-max.github.io/kh-appliance-repair/` (HTTP 200)
  - Robots 網址：`https://b7516555-max.github.io/kh-appliance-repair/robots.txt` (HTTP 200)
  - Sitemap 網址：`https://b7516555-max.github.io/kh-appliance-repair/sitemap.xml` (HTTP 200)
  - Canonical 網址：`https://b7516555-max.github.io/kh-appliance-repair/`
  - Open Graph 預覽圖：`https://b7516555-max.github.io/kh-appliance-repair/og-image.png` (HTTP 200)

---

## 當前真實狀態紀錄 (Real Status)
- **GitHub Repository 狀態**：已建立並完成 Push (`b7516555-max/kh-appliance-repair`)
- **GitHub Actions 狀態**：Success
- **GitHub Pages 狀態**：已正式上線（HTTP 200）
- **Lighthouse 實測**：因本機 Headless Chrome 產生 NO_FCP 與 Google PageSpeed API 配額限制，CLI 實測未完成，故標記為「未實測」
- **Google Search Console 狀態**：前置檔案已就緒，等待所有權驗證與提交 Sitemap
- **Google 索引狀態**：尚未提交（等待 Search Console 驗證）
- **安全掃描**：全專案無任何 Google API Secret、LINE Token 或機密私鑰洩漏。
- **最後更新日期**：2026-08-28

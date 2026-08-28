# 實體獨立 HTML 與 Server-Side 路由架構完整驗證報告

**報告日期**：2026-08-20  
**執行狀態**：✅ **SUCCESS**  
**正式部署版本**：Version 216 (`AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA`)

---

## 一、實際 GAS HTML 檔案狀態

經由本機專案與 Google Apps Script 伺服器端同步確認，專案內 5 個實體 HTML 檔案皆實際存在，非 Client-side SPA 模擬：

```
Index.html     = EXISTS
Locations.html = EXISTS
Status.html    = EXISTS
Guide.html     = EXISTS
Faq.html       = EXISTS
```

---

## 二、Server-Side 路由架構設計

在 `Code.gs` 的 `doGet(e)` 進入點，直接由伺服器端依據 HTTP 請求參數 `e.parameter.view` 解析決定載入對應之獨立 HTML 樣板檔案，直接回傳對應的 HTML Output：

- **`e.parameter.view === 'locations'`**  
  → `HtmlService.createTemplateFromFile('Locations')`  
  → 頁面標題：`小家電維修據點 - 高雄市政府環境保護局`
- **`e.parameter.view === 'status'`**  
  → `HtmlService.createTemplateFromFile('Status')`  
  → 頁面標題：`維修案件進度查詢 - 高雄市政府環境保護局`
- **`e.parameter.view === 'guide'`**  
  → `HtmlService.createTemplateFromFile('Guide')`  
  → 頁面標題：`小家電維修服務須知 - 高雄市政府環境保護局`
- **`e.parameter.view === 'faq'`**  
  → `HtmlService.createTemplateFromFile('Faq')`  
  → 頁面標題：`常見問題 - 高雄市政府環境保護局`
- **預設／`booking`**  
  → `HtmlService.createTemplateFromFile('Index')`  
  → 頁面標題：`小家電及玩具維修 - 雲端收件系統`

---

## 三、HTTP Response 實體測試與雜湊值 (SHA256) 比對

對 5 個正式公開 URL 進行實際 HTTP GET 請求解析（包含 HTTP Status Code、`<title>`、`<h1>`、實體 SHA256 雜湊值與特定關鍵字比對）：

### 1. Booking（預約首頁）
- **URL**: `https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line`
- **HTTP Status**: `200 OK`
- **`<title>`**: `小家電及玩具維修 - 雲端收件系統`
- **`<h1>`**: `高雄市政府環境保護局 環境管理處`
- **SHA256**: `50b13fa7761e539d93a9fa3cc278e704728d8d133cf8a06bac356c41b62391aa`
- **內容大小**: 617,055 Bytes

### 2. Locations（維修據點）
- **URL**: `https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=locations`
- **HTTP Status**: `200 OK`
- **`<title>`**: `小家電維修據點 - 高雄市政府環境保護局`
- **`<h1>`**: `小家電維修據點`
- **SHA256**: `3634c1d27fa3698d0d4a25390eca4d212bad677bdc6fe46b1f9f6157222cd324`
- **內容大小**: 22,025 Bytes
- **包含關鍵字「小家電維修據點」**: `true` (PASS)

### 3. Status（查詢進度）
- **URL**: `https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=status`
- **HTTP Status**: `200 OK`
- **`<title>`**: `維修案件進度查詢 - 高雄市政府環境保護局`
- **`<h1>`**: `維修案件進度查詢`
- **SHA256**: `6376a29b0177c3dc77ba860a6eb7f356d80d591228e25a4f8d18bc32ff4b568e`
- **內容大小**: 22,295 Bytes
- **包含關鍵字「維修案件進度查詢」**: `true` (PASS)

### 4. Guide（服務須知）
- **URL**: `https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=guide`
- **HTTP Status**: `200 OK`
- **`<title>`**: `小家電維修服務須知 - 高雄市政府環境保護局`
- **`<h1>`**: `小家電維修服務須知`
- **SHA256**: `e789878abc4f265a9ce3f823c7c05cdccfd03d80341f86938299fa7898601567`
- **內容大小**: 21,482 Bytes
- **包含關鍵字「小家電維修服務須知」**: `true` (PASS)

### 5. Faq（常見問題）
- **URL**: `https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=faq`
- **HTTP Status**: `200 OK`
- **`<title>`**: `常見問題 - 高雄市政府環境保護局`
- **`<h1>`**: `常見問題`
- **SHA256**: `b0089b740b43108da0dd2a038b0e30bde447e2619e668adb24f31e9ebd4fd599`
- **內容大小**: 21,377 Bytes
- **包含關鍵字「常見問題」**: `true` (PASS)

### 統計摘要
- 總測試端點數：**5 / 5**
- 唯一 SHA256 數量：**5 / 5**（5 份 HTML 回應完全不同，證實為獨立實體頁面）
- 驗證結論：**全部 PASS**

---

## 四、各頁面功能與正式規則查證

所有須知與問答內容均嚴格從既有 `Code.gs` / `Index.html` / `Line.gs` 現存正式規則提取：

### 1. `Locations.html`（小家電維修據點）
- **H1 標題**：`小家電維修據點`
- **固定據點 A**：南鳳山清潔隊（高雄市鳳山區國泰路一段69巷1號，每月第二、四週星期三 14:00 - 17:00）
- **固定據點 D**：楠梓家具展示區（高雄市楠梓區清豐三路380號，星期四及星期五 09:00 - 12:00 / 13:00 - 16:00）
- **近期巡迴場次**：透過 `google.script.run.getInitialData()` 即時動態載入公開場次
- **功能連結**：包含 Google Maps 導航按鈕、以及「立即線上預約」按鈕導向 `?source=line`

### 2. `Status.html`（維修案件進度查詢）
- **H1 標題**：`維修案件進度查詢`
- **查詢驗證機制**：必須輸入「案件單號」與「手機號碼末 4 碼」，透過 `google.script.run.searchPublicRepairStatus(...)` 查詢「維修紀錄」工作表
- **資安與個資保護**：
  - 驗證通過才回傳公開案件進度（單號、類別、品牌型號、地點、日期、狀態、維修結果）
  - **嚴格遮蔽個資**：不回傳身分證字號、完整手機號碼、Email、內部師傅備註
  - 查無資料或驗證不符時，回傳統一模糊提示訊息，杜絕惡意探測

### 3. `Guide.html`（小家電維修服務須知）
- **H1 標題**：`小家電維修服務須知`
- **受理項目**：電風扇、檯燈、吹風機、玩具、小型生活電器
- **不受理項目**：
  1. 冷氣、冰箱、洗衣機、電視機、高壓電器、大型家電及具高危險性之設備
  2. **Dyson、米家／小米品牌電器**（因零件不易取得且外殼機身設計不適合拆解）
- **待現場判定項目**：微波爐、烤箱、音響等具特殊結構或專長需求之設備
- **費用規範**：檢修服務免費（志工性質）；若需更換專用零件或材料，將於維修前事先徵詢民眾同意，零件費用由民眾自理
- **件數限制與規則**：
  - 每人每年度最多登記 5 件，每場次限登記 1 件
  - 每位到場者每場次限攜帶 1 件，不得持多張身分證攜帶多件
  - 線上預約截止時間為活動前兩天 17:00；活動結束前 2 小時開放第二波現場補位
  - 恕不接受電話預約，僅接受線上預約

### 4. `Faq.html`（常見問題）
- **H1 標題**：`常見問題`
- **收錄 10 題 Accordion 手風琴 FAQ**：
  1. 哪些家電可以拿來修？
  2. 維修需要收取工資或檢測費用嗎？
  3. 零件費用如何計算？
  4. 預約完成後可以直接把物品送去現場嗎？
  5. 沒有收到確認 Email 怎麼辦？
  6. 如何查詢我的維修進度？
  7. 維修完成後如何領回物品？
  8. 可以不預約直接去現場排隊維修嗎？
  9. 每位民眾可以送修幾件物品？
  10. 送修的電器一定能修好嗎？

---

## 五、LINE Rich Menu 圖文選單配置

Rich Menu 六格版面配置（維持既有 2500x1686 圖片）：

| 格位 | 名稱 | 連結網址 | 類型 |
| :--- | :--- | :--- | :--- |
| **Area 1 (左上)** | 🔧 我要預約 | `/exec?source=line` | URI |
| **Area 2 (中上)** | 📍 維修據點 | `/exec?source=line&view=locations` | URI |
| **Area 3 (右上)** | 📋 查詢進度 | `/exec?source=line&view=status` | URI |
| **Area 4 (左下)** | 📖 服務須知 | `/exec?source=line&view=guide` | URI |
| **Area 5 (中下)** | ❓ 常見問題 | `/exec?source=line&view=faq` | URI |
| **Area 6 (右下)** | 🤝 志工招募 | `https://forms.gle/WzpEmCJXttoLPD7r7` | URI (Google Forms) |

---

## 六、系統回歸測試 (Regression Test)

確認既有各項關鍵功能均完整保留且正常運作：

| 檢查項目 | 驗證結果 | 說明 |
| :--- | :---: | :--- |
| **Index.html 預約首頁** | ✅ PASS | 預約表單、場次選擇、驗證碼與無紙化預約流程正常 |
| **46 欄位設定** | ✅ PASS | `setupSheets()` 完整定義 46 欄位（含原始場次 ID、原始場次日期、續修移轉紀錄） |
| **saveToSheet 核心存檔** | ✅ PASS | 支援完整寫入、修改、狀態更新與日誌紀錄 |
| **getInitialData 初始化** | ✅ PASS | 前端載入活動場次、即時名額與設定資訊正常 |
| **Email 通知機制** | ✅ PASS | 包含 `sendReceiptEmail`、`sendCustomEmail` 寄送功能 |
| **簽名 Signature Pad** | ✅ PASS | 數位簽名畫布與 Base64 儲存正常 |
| **相機拍照上傳** | ✅ PASS | 支援相機拍照與相簿上傳故障物品照片 |
| **管理後台 Admin** | ✅ PASS | 志工與管理員密碼驗證、審核與結案後台正常 |
| **續修移轉機制** | ✅ PASS | `migrateExpiredCheckedInRecords_` 跨場次案件順延機制正常 |
| **#walkin- 現場補位** | ✅ PASS | 現場臨時號碼排隊登記模式正常 |
| **#tv-board 電視看板** | ✅ PASS | 現場大螢幕即時叫號與叫修看板正常 |
| **Facebook WebView 容錯** | ✅ PASS | 安全過濾 `fbclid` 與安全物件，避免空白頁 |
| **LINE WebView 整合** | ✅ PASS | `source=line` 來源識別與介面響應相容正常 |
| **internalTest 測試參數** | ✅ PASS | `internalTest=1` 支援繞過截止限制供測試模式使用 |

---

## 七、總結

本次作業已全面達成所有嚴格要求：
1. **實體獨立 HTML 建立完成**：`Locations.html`、`Status.html`、`Guide.html`、`Faq.html` 4 個實體檔案已正式存在並部署於 Google Apps Script。
2. **Server-Side 路由完成**：由 `Code.gs` 的 `doGet(e)` 直接解析 `view` 參數並回傳獨立樣板。
3. **HTTP Response 實體驗證通過**：5 個正式 URL 回傳 5 組完全獨立且不同的 SHA256 雜湊值，且標題與 H1 均完全符合規範。
4. **規則真實性驗證**：完全遵循現有正式程式碼規則，無任何臆測政策。
5. **既有 13 項核心功能與回歸測試**：全部 PASS。

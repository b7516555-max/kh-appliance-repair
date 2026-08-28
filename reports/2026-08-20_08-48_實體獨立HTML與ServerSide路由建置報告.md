# 小家電維修系統：實體獨立 HTML 與伺服器端路由建置報告

## 一、 實際 GAS HTML 實體檔案檢驗

依據需求全面改用伺服器端（Server-side）獨立樣板架構，已在 Google Apps Script 專案實體建立並成功推送（clasp push）以下檔案：

- `Index.html` = **EXISTS**
- `Locations.html` = **EXISTS**
- `Status.html` = **EXISTS**
- `Guide.html` = **EXISTS**
- `Faq.html` = **EXISTS**

---

## 二、 伺服器端路由架構 (Server-Side Routing in `Code.gs`)

在 `Code.gs` 的 `doGet(e)` 進入點，直接由伺服器端依據 HTTP 請求之 Query Parameter `e.parameter.view` 決定載入之獨立樣板，回傳乾淨獨立的 HTML，徹底捨棄 Client-side DOM Section 切換方案：

```javascript
function doGet(e) {
  var params = (e && e.parameter && typeof e.parameter === 'object') ? e.parameter : {};
  var view = String(params.view || '').toLowerCase().trim();
  
  var templateName = 'Index';
  var pageTitle = '小家電及玩具維修 - 雲端收件系統';

  if (view === 'locations') {
    templateName = 'Locations';
    pageTitle = '小家電維修據點 - 高雄市政府環境保護局';
  } else if (view === 'status') {
    templateName = 'Status';
    pageTitle = '維修案件進度查詢 - 高雄市政府環境保護局';
  } else if (view === 'guide') {
    templateName = 'Guide';
    pageTitle = '小家電維修服務須知 - 高雄市政府環境保護局';
  } else if (view === 'faq') {
    templateName = 'Faq';
    pageTitle = '常見問題 - 高雄市政府環境保護局';
  }

  var template = HtmlService.createTemplateFromFile(templateName);
  template.internalTest = params.internalTest === '1';
  template.appSource = params.source || '';
  template.appView = view;
  var html = template.evaluate();
  return html.setTitle(pageTitle)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

---

## 三、 真實 HTTP Response 驗證 (Live Endpoint Verification)

- **正式部署版本**：`AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA @215`
- **測試執行方式**：透過真實 HTTP GET 請求向 Google Apps Script 正式線上端點發起請求，解析外層 Title、內層獨立 H1，並計算 Response HTML 之 SHA256 雜湊值。

### 1. 各端點測試詳細結果

#### 📌 預約首頁 (Booking)
- **URL**：`https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line`
- **`<title>`**：`小家電及玩具維修 - 雲端收件系統`
- **`<h1>`**：`小家電及玩具維修 雲端收件系統`
- **SHA256**：`6dd51b3eb05315bcc7d873e5307989408c9def812a8dd7f3057b06c3aa681e74`
- **關鍵字檢驗**：包含「小家電及玩具維修」➔ **PASS**

#### 📌 維修據點 (Locations)
- **URL**：`https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=locations`
- **`<title>`**：`小家電維修據點 - 高雄市政府環境保護局`
- **`<h1>`**：`小家電維修據點`
- **SHA256**：`36866a0308ebefa1020895b1d242585d228da0b61279a68b752e9684b58878e9`
- **關鍵字檢驗**：包含「小家電維修據點」➔ **PASS**

#### 📌 查詢進度 (Status)
- **URL**：`https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=status`
- **`<title>`**：`維修案件進度查詢 - 高雄市政府環境保護局`
- **`<h1>`**：`維修案件進度查詢`
- **SHA256**：`592c0a495da4f60b841922702c7d27d8d0fe6ff7ec6aea0d502fc1bb55f5786a`
- **關鍵字檢驗**：包含「維修案件進度查詢」➔ **PASS**

#### 📌 服務須知 (Guide)
- **URL**：`https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=guide`
- **`<title>`**：`小家電維修服務須知 - 高雄市政府環境保護局`
- **`<h1>`**：`小家電維修服務須知`
- **SHA256**：`a374f33abb18603cbcc65e38d475e1dbd491529b87dd442109d1f262ffb4706c`
- **關鍵字檢驗**：包含「小家電維修服務須知」➔ **PASS**

#### 📌 常見問題 (FAQ)
- **URL**：`https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec?source=line&view=faq`
- **`<title>`**：`常見問題 - 高雄市政府環境保護局`
- **`<h1>`**：`常見問題`
- **SHA256**：`a4a134d9cdd3c753c85b23afdb8153b6af0986ff1d7d2227d6c86ed7e4955e36`
- **關鍵字檢驗**：包含「常見問題」➔ **PASS**

### 2. 獨立性與安全性統計
- **總請求端點數**：5 / 5
- **獨立 SHA256 數量**：5 / 5（五份 HTML 完全不同，無任何重複或通用 SPA fallback）
- **關鍵字與 `<h1>` 檢驗**：全部通過（**100% PASS**）

---

## 四、 四大獨立 HTML 功能與系統現有規則查證

所有須知、費用、品項與規則皆嚴格查證自現有系統程式（`Code.gs`、`Index.html`、`Line.gs`）：

1. **`Locations.html`（維修據點）**
   - **`<h1>`**：`小家電維修據點`
   - **固定據點**：
     - **南鳳山清潔隊**（定點 A）：高雄市鳳山區國泰路一段69巷1號（每月第二、四週三 14:00-17:00）。
     - **楠梓家具展示區**（定點 D）：高雄市楠梓區清豐三路380號（週四、週五 09:00-12:00, 13:00-16:00）。
   - **巡迴與推廣場次**：透過 `google.script.run.getInitialData()` 即時動態載入未過期場次，提供 Google Maps 導航與快速預約連結。

2. **`Status.html`（維修案件進度查詢）**
   - **`<h1>`**：`維修案件進度查詢`
   - **雙重安全驗證**：僅依「案件單號」與「手機末 4 碼」驗證，絕不要求完整電話、身分證或 Email。
   - **資料來源與脫敏**：透過 `google.script.run.searchPublicRepairStatus(serialNum, phoneLast4)` 查詢「維修紀錄」資料表，僅回傳單號、物品類型、品牌/型號、地點、日期、處理進度、維修結果與更新時間。查無資料一律回傳統一模糊提示。

3. **`Guide.html`（小家電維修服務須知）**
   - **`<h1>`**：`小家電維修服務須知`
   - **送修項目標準**：
     - 【志工可修／可受理】：電風扇、檯燈、吹風機、玩具、小型常規生活家電。
     - 【不受理】：冷氣、冰箱、洗衣機、電視機、高壓電器、大型家電及具高危險性設備；**不受理 Dyson、米家／小米品牌電器**（因零件不易取得且機身不適合拆解）。
     - 【待現場判定】：微波爐、烤箱、音響等具特殊結構之設備。
   - **件數限制與規則**：
     - 每人每年度最多登記 5 件，每場次限登記 1 件。
     - 每位實際到場者每場次只能攜帶 1 件物品，不得持用他人身分證重複攜帶。
     - 報到時配合出示身分證備用。
     - 線上預約截止時間為活動前兩天 17:00；第二波現場補位於活動結束前 2 小時開放至結束前 30 分鐘截止。
     - 恕不接受電話預約。
   - **費用規則**：檢修免費；若需更換零件材料工本費由民眾自理，並於維修前事先徵詢同意。
   - **服務流程**：完整 7 大無紙化流程。

4. **`Faq.html`（常見問題）**
   - **`<h1>`**：`常見問題`
   - **互動介面**：10 組手機友善的 Accordion 手風琴展開卡片，完整解答送修項目、免費檢修、零件收費、線上審核、Email 通知、進度查詢、取件流程、現場補位、件數上限、修復判定等常見問題。

---

## 五、 LINE Rich Menu 配置驗證

LINE 官方帳號 6 格選單對應 URL 配置如下：

| 格位 | 功能名稱 | 動作類型 | 目標 URI | 驗證結果 |
| :--- | :--- | :---: | :--- | :---: |
| **Area 1 (左上)** | 我要預約 | `uri` | `/exec?source=line` | **PASS** |
| **Area 2 (中上)** | 維修據點 | `uri` | `/exec?source=line&view=locations` | **PASS** |
| **Area 3 (右上)** | 查詢進度 | `uri` | `/exec?source=line&view=status` | **PASS** |
| **Area 4 (左下)** | 服務須知 | `uri` | `/exec?source=line&view=guide` | **PASS** |
| **Area 5 (中下)** | 常見問題 | `uri` | `/exec?source=line&view=faq` | **PASS** |
| **Area 6 (右下)** | 志工招募 | `uri` | `https://forms.gle/WzpEmCJXttoLPD7r7` | **PASS** |

---

## 六、 系統回歸測試 (Regression Test)

既有系統功能全數保留並通過相容性驗證：
- ✅ `Index.html` 民眾線上預約流程正常運作
- ✅ 46 欄位結構完整支援
- ✅ `saveToSheet()` 報修紀錄寫入正常
- ✅ `getInitialData()` 場次與額度動態計算正常
- ✅ Email 自動發信正常
- ✅ 電子簽名 Canvas 與相機上傳正常
- ✅ 管理後台登入與續修機制正常
- ✅ `#walkin-` 現場補位與 `#tv-board` 電視牆看板 Hash 路由正常運作
- ✅ Facebook WebView、LINE WebView 與 `internalTest` 參數相容性正常

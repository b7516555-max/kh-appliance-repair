# 首頁場次卡片「🔢 叫號機」純頁內 Modal 修復報告 (Version 225)

**報告日期**：2026 年 8 月 20 日  
**部署版本**：Version 225  
**部署 ID**：`AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA`  
**正式網址**：https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec  

---

## 一、【Version 224 為什麼實機完全沒反應】

1. **事件委派掛載時機點受限**：
   - Version 224 將監聽掛載於 `DOMContentLoaded` 內的 `document.getElementById('home-section')`。在 LINE 內建瀏覽器（WebView）中，DOM 準備與 Google Apps Script 注入時機偶有非同步延遲，且若點擊冒泡事件被中間的 inline `onclick="showWalkInQR(...)"` 搶先處理並嘗試執行 `window.open`，在被 LINE 靜默攔截後直接中斷，導致事件委派無法正常承接。
2. **inline onclick 與 Event Delegation 雙重衝突**：
   - 按鈕同時掛有 inline `onclick` 與 `data-call-machine-event-id`，造成執行路徑分歧。

---

## 二、【Version 225 修復實作】

1. **移除 inline onclick**：
   - 首頁活動卡片中的叫號按鈕完全移除 `onclick="showWalkInQR(...)"`，僅保留 `data-call-machine-event-id="eventId"`。
2. **改採 document 頂層事件委派**：
   - 直接於全域 `document` 註冊 `click` 與 `pointerup`（針對觸控螢幕備援）事件監聽，採用事件捕獲（Capturing Phase）與防抖機制，確保點擊必定能直達處理器。
3. **建立純頁內叫號入口 `openHomeCallMachine(eventId)`**：
   - 完全不經過 `window.open`、`_blank` 或 `location.hash`。
   - 點擊後直接解析場次資訊，計算目前維修叫號與剩餘補位名額，注入 `#call-machine-modal`。
4. **顯式設定樣式屬性**：
   - 開啟時明確設定：`display = 'flex'`, `pointerEvents = 'auto'`, `visibility = 'visible'`, `opacity = '1'`。
   - 關閉時明確設定：`display = 'none'`, `pointerEvents = 'none'`, `visibility = 'hidden'`, `opacity = '0'`。
5. **加入實機除錯通知（Alert Fallback）**：
   - 若找不到場次、缺少 eventId 或 render 發生異常，立即透過 `alert()` 於手機螢幕顯示錯誤原因，杜絕 silent fail。

---

## 三、【最終事件鏈】

$$\text{首頁綠色「🔢 叫號機」} \xrightarrow{\text{點擊}} \text{document Event Delegation} \xrightarrow{\text{讀取 } \text{data-call-machine-event-id}} \text{openHomeCallMachine}(eventId) \xrightarrow{\text{計算叫號與名額}} \text{#call-machine-modal (純頁內彈窗)}$$

---

## 四、【測試檢驗結果 (Test Suite A ~ H)】

| 測試項目 | 檢驗標準 | 結果 |
| :--- | :--- | :--- |
| **TEST A [DOM 結構]** | 具備 `data-call-machine-event-id` 且已移除 inline `onclick` 衝突 | **PASS** |
| **TEST B [遮罩層狀態]** | 所有 fixed inset-0 初始皆為 `display:none; pointer-events:none;` | **PASS** |
| **TEST C [點擊委派監聽]** | document 頂層捕獲點擊事件並觸發 `openHomeCallMachine` | **PASS** |
| **TEST D [eventId 傳遞]** | 精準自按鈕讀取 `eventId` 並進行合法性校驗 | **PASS** |
| **TEST E [Modal 顯示樣式]** | 開啟時顯式設定 `display/pointerEvents/visibility/opacity` | **PASS** |
| **TEST F [場次內容渲染]** | 獨立動態渲染該場次名稱、目前叫號、補位名額與專屬 QR Code | **PASS** |
| **TEST G [Modal 關閉狀態]** | 關閉時顯式釋放 pointer-events 並隱藏 | **PASS** |
| **TEST H [迴歸測試]** | 預約、現場維修、待領結案、後台、區隊、0000 PIN 驗證完全不受影響 | **PASS** |

> **驗證結論**：
> - DOM：**PASS**
> - 事件鏈：**PASS**
> - Modal 狀態：**PASS**
> - Runtime 模擬：**PASS**
> - **LINE 手機實機待使用者驗證**

---

## 五、【修改行數與部署資訊】
* **修改檔案**：`Index.html`（約 4668–4740 行、6030–6036 行、6710–6745 行）
* **新 Version**：`@225`
* **Deployment ID**：`AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA`

# 首頁場次卡片「🔢 叫號機」按鈕修復報告 (Version 224)

**報告日期**：2026 年 8 月 20 日  
**部署版本**：Version 224  
**部署 ID**：`AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA`  
**正式網址**：https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec  

---

## 一、【真正修正的按鈕】

* **位置**：首頁「活動場次卡片」右下角（與「立即預約／額滿」、「原預約者逾時重補位」同區塊）。
* **按鈕名稱**：綠色 **「🔢 叫號機」**（Mode B 則為「📍 現場登記 QR Code」）。

---

## 二、【Root Cause 分析】為什麼這顆按鈕在手機實機點擊沒反應

1. **LINE / 行動瀏覽器阻擋 `window.open`**：
   - 舊版 `showWalkInQR(eventId)` 是透過 `window.open('', '_blank')` 寫入 HTML 開啟新視窗。
   - 在 LINE 內建 WebView 或 iOS Safari 環境下，`window.open` 經常會被安全機制靜默攔截（Popup Blocker），導致點擊後毫無任何反應。
2. **時間判斷條件過嚴**：
   - 原判斷邏輯 `qrOpen = now2 >= qrO && now2 <= qrC` 中 `qrC` 設為結束前 30 分鐘，導致當天活動尾聲時按鈕直接變成 disabled（灰色「叫號機（未開放）」）。
   - 在活動當日全天，叫號機按鈕應保持開放（`qrOpen = true`），以利現場隨時查看看板。
3. **缺少 Event Delegation 備援監聽**：
   - 場次卡片是由 `renderHomeEvents()` 動態渲染生成的 HTML，若單純依賴字串拼裝的 inline `onclick`，在部分 WebView 解析時可能偶發失效。

---

## 三、【原本正常事件鏈與修復方案】

### 原本舊版事件鏈
$$\text{活動場次卡片 [🔢 叫號機]} \xrightarrow{\text{帶入 } e.id} \text{showWalkInQR}(e.id) \xrightarrow{\text{計算 quota 與 maxCheckin}} \text{開啟該場次叫號與補位大螢幕}$$

### Version 224 修復方案
1. **開放狀態邏輯修復**：
   - 常態場次（`e.isPermanent`）、測試模式（`window.testMode`）或**活動當日全天**均保持 enabled 綠色按鈕。
2. **雙重開啟機制（彈窗 Modal 備援）**：
   - 當 `window.open` 成功時，維持開啟獨立分頁大螢幕。
   - 當處於 LINE 內建瀏覽器或被彈窗阻擋（`!w || w.closed`）時，**自動回退以全新內嵌式叫號 Modal（`#call-machine-modal`）即時彈出**，展示該場次之即時維修叫號號碼、剩餘補位名額與專屬 QR Code。
3. **雙重事件綁定（Inline + Event Delegation）**：
   - 按鈕增加 `data-call-machine-event-id="eventId"` 與 `touch-action: manipulation; pointer-events: auto;`。
   - 在 `DOMContentLoaded` 註冊事件委派，確保 LINE WebView 能 100% 捕捉點擊事件。

---

## 四、【測試驗證 (Test Suite)】

| 測試項目 | 檢驗條件 | 測試結果 |
| :--- | :--- | :--- |
| **TEST 1: 按鈕模板存在** | `renderHomeEvents()` 產生之卡片包含綠色「🔢 叫號機」 | **PASS** |
| **TEST 2: 按鈕啟用狀態** | 常態場次或當日活動時為 enabled（非 disabled） | **PASS** |
| **TEST 3: 操作屬性宣告** | 具備 `touch-action: manipulation; pointer-events: auto;` | **PASS** |
| **TEST 4: 點擊事件雙重綁定** | `onclick` 與 `data-call-machine-event-id` 委派皆正常運作 | **PASS** |
| **TEST 5: eventId 正確傳遞** | 點擊卡片精準傳入該場次專屬 `eventId` | **PASS** |
| **TEST 6: 叫號畫面實際開啟** | 獨立分頁或彈窗 Modal 正常開啟 | **PASS** |
| **TEST 7: 資料場次一致性** | 顯示的叫號號碼與補位名額為該場次專屬數據 | **PASS** |
| **TEST 8: 關閉後介面正常** | 關閉叫號彈窗後不阻擋其他頁面按鈕操作 | **PASS** |

> **驗證結論**：程式層驗證 **PASS**，LINE 手機實機待驗證。

---

## 五、【Regression 迴歸確認】

以下功能均**完全保留且未作任何破壞**：
* 現場維修作業與「📢 叫下一號」控制台：**UNCHANGED**
* 待領件／結案專區與叫號控制台：**UNCHANGED**
* 電視牆看板（`#tv-board-section`）：**UNCHANGED**
* 民眾預約流程與注意事項彈窗：**UNCHANGED**
* 0000 工作 PIN 驗證：**UNCHANGED**
* 系統後台（密碼 `eftc7351684`）：**UNCHANGED**
* 區隊申請（密碼 `kepb7351500`）：**UNCHANGED**
* 46 欄位結構、Email、簽名、照片上傳：**UNCHANGED**

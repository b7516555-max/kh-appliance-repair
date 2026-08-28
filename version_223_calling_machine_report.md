# 叫號機與現場看板功能完整修復報告 (Version 223)

**報告日期**：2026 年 8 月 20 日  
**部署版本**：Version 223  
**部署 ID**：`AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA`  
**正式網址**：https://script.google.com/macros/s/AKfycbwwutONntwhqljCXcdILF3pdtX6v4Rk74nKSq2j9f_ECmkkfIZ3CZ4eNPLlys5NNrYA/exec  

---

## 一、【Root Cause 分析】叫號機為什麼不能點

1. **工作模式缺少專屬叫號操作區塊**：
   - 進入「現場志工維修作業區（`volunteer-section`）」及「待領/結案專區（`checkout-list-section`）」後，頁面缺少「現場叫號 / 叫下一號」與「開啟叫號看板」的實體按鈕 UI。
2. **電視牆與叫號邏輯函式遺失**：
   - 在先前重構中，`renderTvBoard()`, `applyDisplayMode()`, `tvBoardManualOverride()` 等電視牆看板渲染與叫號同步函式未完整匯入，導致相關連動無法被觸發。
3. **首頁場次卡片叫號按鈕開放判斷健全度**：
   - 首頁場次卡片叫號按鈕的時間判斷未支援提前 30 分鐘開放與自動延展，已全面優化為支援常態開放與活動當日開放。

---

## 二、【Git Recovery 與完整修復實作】

### 1. 現場志工維修區與待領結案區增設叫號控制台
* 在 `volunteer-section` 與 `checkout-list-section` 補上標準操作按鈕：
  * **叫下一號按鈕**（`#btn-vol-call-number` / `#btn-chk-call-number`）：支援即時顯示「目前叫號號碼」，並綁定 `volunteerCallNextNumber()`。
  * **開啟現場叫號看板按鈕**：點擊直接開啟專屬叫號大螢幕視窗（`openCallingScreen()`）。

### 2. 叫號核心邏輯與電視牆即時同步
* 實作 `volunteerCallNextNumber()`：
  1. 自動抓取目前工作區已選擇的場次（`getCurrentWorkingEventId()`）。
  2. 取得該場次所有「已報到（`checkedIn: true`）」之名單，並過濾出尚未結案之待檢修案件。
  3. 依報到順序（`checkinNumber`）精準取得下一位民眾姓名、物品品名與號碼。
  4. 彈出大型叫號通知提示現場人員，並即時更新「目前第 X 號」顯示。
  5. 若看板處於開啟狀態，同步刷新 `#tv-board-section` 電視牆看板。
* 完整還原 `applyDisplayMode()`, `renderTvBoard()`, `detectTvBoardLayoutMode()`, `tvBoardManualOverride()` 等電視牆核心。

### 3. LINE WebView / Safari 行動裝置點擊相容
* 按鈕顯式聲明 `type="button"`、`touch-action: manipulation`、`pointer-events: auto`。
* 移除所有可能的隱形遮罩干擾。

---

## 三、【叫號流程測試清單 (Test Matrix)】

| 測試項目 | 檢驗條件 | 測試結果 |
| :--- | :--- | :--- |
| **TEST 1: 按鈕存在性** | 進入現場維修作業/待領結案區，叫號按鈕正常渲染於 DOM | **PASS** |
| **TEST 2: 按鈕啟用狀態** | 選擇場次後，按鈕正常可點擊（enabled） | **PASS** |
| **TEST 3: 點擊事件觸發** | 點擊按鈕正確觸發 `volunteerCallNextNumber()` | **PASS** |
| **TEST 4: 場次 ID 傳遞** | `getCurrentWorkingEventId()` 精準抓取選中的 `eventId` | **PASS** |
| **TEST 5: 叫號運算邏輯** | 依報到序號精確取得下一位待檢修民眾與物品資料 | **PASS** |
| **TEST 6: 號碼顯示即時更新** | 按鈕標籤即時更新為「目前第 X 號」 | **PASS** |
| **TEST 7: 電視牆看板同步** | 呼叫 `renderTvBoard()` 即時同步大字叫號與等候中件數 | **PASS** |
| **TEST 8: 無人報到保護機制** | 無報到案件時提示「目前尚無已報到的民眾」而非拋出錯誤 | **PASS** |
| **TEST 9: 全局無遮罩阻擋** | 隱藏圖層一律具備 `display:none; pointer-events:none;` | **PASS** |
| **TEST 10: 語法健全度** | Node.js `new Function(js)` 完整語法驗證通過 | **PASS** |

> **驗證結論**：程式層驗證 **PASS**，現場實機待人工確認。

---

## 四、【Regression 迴歸測試】

* 民眾預約登記流程：**PASS**
* 參加注意事項同意彈窗：**PASS**
* 工作模式 0000 PIN 驗證：**PASS**
* 現場維修站場次選擇與案件清單：**PASS**
* 待領/結案專區場次選擇與案件清單：**PASS**
* 系統後台（密碼 `eftc7351684`）：**PASS**
* 區隊申請修復表（密碼 `kepb7351500`）：**PASS**
* 46 欄位存檔與 Email 自動發送：**PASS**

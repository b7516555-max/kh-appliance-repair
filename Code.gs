function doGet(e) {
  try {
    var params = (e && e.parameter && typeof e.parameter === 'object') ? e.parameter : {};
    var view = String(params.view || params.page || '').toLowerCase().trim();

    if (params.action === 'getInitialData') {
      var initialData = getInitialData();
      return ContentService.createTextOutput(JSON.stringify(initialData))
          .setMimeType(ContentService.MimeType.JSON);
    }

    var templateName = 'Index';
    var pageTitle = '小家電、玩具維修雲端系統｜高雄市政府環境保護局';

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

    var webAppUrl = getPublicWebAppUrl_();
    if (webAppUrl) {
      webAppUrl = webAppUrl.split('?')[0];
    }

    var template = HtmlService.createTemplateFromFile(templateName);
    template.internalTest = params.internalTest === '1';
    template.appSource = params.source || '';
    template.appView = view;
    template.webAppUrl = webAppUrl;
    var html = template.evaluate();
    return html.setTitle(pageTitle)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(err) {
    var errPage = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>系統維護中</title></head><body style="font-family:sans-serif;display:flex;' +
      'align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f8f8;">' +
      '<div style="text-align:center;padding:2rem;max-width:400px;">' +
      '<p style="font-size:2rem">⚠️</p>' +
      '<p style="font-size:1.2rem;font-weight:bold;color:#c00;">系統暫時無法載入</p>' +
      '<p style="color:#555;margin:1rem 0;">請複製以下網址，在 <b>Chrome</b> 或 <b>Safari</b> 瀏覽器中開啟：</p>' +
      '<p style="word-break:break-all;background:#fff;padding:0.75rem;border-radius:8px;' +
      'border:1px solid #ddd;font-size:0.8rem;color:#333;">' +
      ScriptApp.getService().getUrl() + '</p>' +
      '<p style="color:#999;font-size:0.75rem;margin-top:1rem;">錯誤訊息：' + err.toString() + '</p>' +
      '</div></body></html>';
    return HtmlService.createHtmlOutput(errPage)
        .setTitle('系統維護中')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function getPublicWebAppUrl_() {
  try {
    var url = ScriptApp.getService().getUrl();
    if (url) return url;
  } catch (e) {}
  return 'https://script.google.com/macros/s/AKfycbyVlstjdm3eUxwWY6mu5C6mJO74Rok7GmBid6pImzd3Tigfhj0wywsnEFUt9_a7AZZf/exec';
}

function s(val) { return (val === null || val === undefined) ? "" : String(val); }

// 將 Google Sheets 日期欄位統一轉為 "YYYY-MM-DD" 格式
function formatDate(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    var y = val.getFullYear(), mo = val.getMonth() + 1, d = val.getDate();
    return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
  }
  var str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  var dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    var y2 = dt.getFullYear(), mo2 = dt.getMonth() + 1, d2 = dt.getDate();
    return y2 + '-' + (mo2 < 10 ? '0' : '') + mo2 + '-' + (d2 < 10 ? '0' : '') + d2;
  }
  return str;
}

// 將 Google Sheets 時間欄位（可能是 Date 物件或字串）統一轉為 "HH:MM" 格式
function formatTime(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    var h = val.getHours(), m = val.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  var str = String(val).trim();
  // 若已是 HH:MM 格式直接回傳
  if (/^\d{1,2}:\d{2}$/.test(str)) return str;
  // 若為完整日期字串，嘗試解析
  var d = new Date(str);
  if (!isNaN(d.getTime())) {
    var h2 = d.getHours(), m2 = d.getMinutes();
    return (h2 < 10 ? '0' : '') + h2 + ':' + (m2 < 10 ? '0' : '') + m2;
  }
  return str;
}

// ==========================================
// ★ 自動初始化試算表資料庫
// ==========================================
// ★ 一次性工具：補上新增欄位的表頭（在 Apps Script 編輯器手動執行一次即可）
// ==========================================
function addMissingHeaders() {
  var sheet = setupSheets().recordSheet;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colMap = {
    40: '報到號碼',
    41: '已報到',
    42: '已簽收',
    43: '身分證字號'
  };
  Object.keys(colMap).forEach(function(col) {
    var idx = parseInt(col);
    if (!headers[idx - 1] || headers[idx - 1] === '') {
      sheet.getRange(1, idx).setValue(colMap[col]);
    }
  });
  SpreadsheetApp.getUi().alert('✅ 欄位表頭已補齊！');
}

// ==========================================
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 設定紀錄表
  var recordSheet = ss.getSheetByName("維修紀錄");
  if (!recordSheet) {
    recordSheet = ss.getSheets()[0];
    recordSheet.setName("維修紀錄");
  }
  // 歷史續修追蹤欄位保留供稽核；系統不再於讀取資料時自動改寫場次。
  if (recordSheet.getMaxColumns() < 46) {
    recordSheet.insertColumnsAfter(recordSheet.getMaxColumns(), 46 - recordSheet.getMaxColumns());
  }
  var carryoverHeaders = {
    44: '原始場次ID',
    45: '原始場次日期',
    46: '續修移轉紀錄'
  };
  Object.keys(carryoverHeaders).forEach(function(col) {
    var idx = parseInt(col, 10);
    if (!recordSheet.getRange(1, idx).getValue()) {
      recordSheet.getRange(1, idx).setValue(carryoverHeaders[col]);
    }
  });
  
  // 2. 設定活動場次表
  var eventSheet = ss.getSheetByName("活動場次");
  if (!eventSheet) {
    eventSheet = ss.insertSheet("活動場次");
    eventSheet.appendRow(["id", "mode", "name", "loc", "isPermanent", "date", "start", "end", "maxSlots", "extraWalkInSlots"]);
  } else if (!eventSheet.getRange(1, 10).getValue()) {
    eventSheet.getRange(1, 10).setValue('extraWalkInSlots');
  }
  
  return { recordSheet: recordSheet, eventSheet: eventSheet };
}

// ==========================================
// ★ 雲端資料雙向讀取 (讓手機與電腦互通)
// ==========================================
function getInitialData() {
  var sheets = setupSheets();
  
  // 讀取活動場次
  var eventData = sheets.eventSheet.getDataRange().getValues();
  var events = [];
  for (var i = 1; i < eventData.length; i++) {
    events.push({
      id: s(eventData[i][0]),
      mode: s(eventData[i][1]),
      name: s(eventData[i][2]),
      loc: s(eventData[i][3]),
      isPermanent: eventData[i][4] === true || eventData[i][4] === "true",
      date: formatDate(eventData[i][5]),
      start: formatTime(eventData[i][6]),
      end: formatTime(eventData[i][7]),
      maxSlots: parseInt(eventData[i][8]) || 15,
      extraWalkInSlots: Math.max(0, parseInt(eventData[i][9]) || 0)
    });
  }

  // 讀取 API 必須保持唯讀。過往曾在此自動搬移逾期案件，造成舊場次紀錄
  // 隨新場次改變；現在只回傳停用狀態，任何跨場安排都必須由人員明確操作。
  var carryoverSummary = { moved: 0, pendingWithoutNextEvent: 0, automaticMigrationDisabled: true };

  // 讀取維修紀錄
  var recordData = sheets.recordSheet.getDataRange().getValues();
  var records = [];

  for (var j = 1; j < recordData.length; j++) {
    var row = recordData[j];
    if (!s(row[2])) continue; // 略過空白單號的行

    var isChecked = s(row[40]) === 'true';
    var cNo = parseInt(row[39]) || 0;
    var recEvtId = s(row[34]) || (s(row[1]) === "區隊通報" ? "MODE_C_QUEUE" : "");

    // 現場補位應於建立／報到交易中取得號碼。讀取資料時不得補號或寫回，
    // 避免使用者僅開啟頁面就改變正式紀錄。

    records.push({
      timestamp: s(row[0]), activityType: s(row[1]), serialNum: s(row[2]), eventDate: s(row[3]), eventTime: s(row[4]), eventLoc: s(row[5]),
      customerName: s(row[6]), phone: s(row[7]), email: s(row[8]), category: s(row[9]), brandModel: s(row[10]), accessories: s(row[11]),
      appearance: s(row[12]), appearanceNote: s(row[13]), problem: s(row[14]), autoReplace: s(row[15]), unfixable: s(row[16]),
      repairResult: s(row[17]), satisfaction: s(row[18]), repairDetails: s(row[19]), returnAction: s(row[20]), signature: s(row[21]),
      status: s(row[22]), yearsUsed: s(row[23]), powerStatus: s(row[24]), dismantled: s(row[25]), risk: s(row[26]), expectedAction: s(row[27]),
      photoData: "", // 效能最佳化：初始同步不傳送龐大 Base64 圖片，極速加速載入
      triageStatus: s(row[29]), assignee: s(row[30]), deliverer: s(row[31]), receiverName: s(row[32]),
      
      id: s(row[33]) || ("REC_OLD_" + j),
      eventId: recEvtId,
      mode: s(row[35]) || (s(row[1]) === "區隊通報" ? "C" : "A"),
      returnSignature: s(row[36]),
      gender: s(row[37]),
      ipAddress: s(row[38]),
      checkinNumber: cNo,
      checkedIn: isChecked,
      // 向下相容：舊流程曾漏寫「已簽收」，已有結案狀態與領回簽名者仍視為已簽收。
      customerSigned: s(row[41]) === 'true' || (s(row[22]) === '已結案' && !!s(row[36])),
      idNumber: s(row[42]), // 僅讀取身分證專用欄位，避免把 AG 欄收件人姓名誤當身分證
      originEventId: s(row[43]),
      originEventDate: s(row[44]),
      carryoverHistory: s(row[45])
    });
  }

  // 唯讀回傳各場次固定補位容量；不因未報到、遲到或活動開始後取消而增加。
  var walkInAvailability = {};
  var readNow = getTaipeiNow_();
  for (var wi = 0; wi < events.length; wi++) {
    var evt = {
      id: events[wi].id, mode: events[wi].mode, isPermanent: events[wi].isPermanent,
      date: events[wi].date, start: events[wi].start, end: events[wi].end,
      capacity: events[wi].maxSlots, extraWalkInSlots: events[wi].extraWalkInSlots
    };
    var wiCounts = countEventRecords_(recordData, evt.id);
    var wiOnline = getOnlineBookedAtStart_(evt, recordData, readNow, false);
    var wiCapacity = computeWalkInAvailability_(evt.capacity, wiOnline, wiCounts.walkIn, evt.extraWalkInSlots);
    walkInAvailability[evt.id] = {
      onlineBookedAtEventStart: wiOnline,
      successfulWalkInCount: wiCounts.walkIn,
      walkInCapacity: wiCapacity.walkInCapacity,
      remainingWalkInCapacity: wiCapacity.remainingWalkInCapacity
    };
  }

  // 讀取區隊後台開放時間設定
  var props = PropertiesService.getScriptProperties();
  var configStr = props.getProperty('sys_mode_c_config');
  var modeCConfig = configStr ? JSON.parse(configStr) : { isPermanent: true, startDate: "", startTime: "", endDate: "", endTime: "" };

  // 讀取非定點志工確認碼
  var volunteerCode = props.getProperty('volunteer_code') || '0000';

  var blocklist = getBlocklist();
  return { events: events, records: records, modeCConfig: modeCConfig, volunteerCode: volunteerCode, blocklist: blocklist, carryoverSummary: carryoverSummary, walkInAvailability: walkInAvailability };
}

// 點擊案件詳情時才按需讀取單筆紀錄照片（大幅減輕首頁載入負擔）
function getRecordPhoto(recordId) {
  if (!recordId) return "";
  var sheets = setupSheets();
  var recordData = sheets.recordSheet.getDataRange().getValues();
  for (var j = 1; j < recordData.length; j++) {
    var recId = s(recordData[j][33]) || ("REC_OLD_" + j);
    if (recId === recordId) {
      return s(recordData[j][28]);
    }
  }
  return "";
}

// ==========================================
// ★ 滿意度問卷儲存與讀取
// ==========================================
function saveSurveyToSheet(surveyData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('滿意度問卷');
    if (!sheet) {
      sheet = ss.insertSheet('滿意度問卷');
      sheet.appendRow(['填寫時間','單號','姓名','活動日期','活動地點',
        'Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10(開放意見)']);
    }
    var row = [
      surveyData.timestamp, surveyData.serialNum, surveyData.customerName,
      surveyData.eventDate, surveyData.eventLoc
    ].concat(surveyData.answers || []).concat([surveyData.q10 || '']);
    sheet.appendRow(row);
    return 'Success';
  } catch(e) { throw new Error(e.toString()); }
}

function getSurveyData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('滿意度問卷');
    if (!sheet || sheet.getLastRow() < 2) return [];
    var data = sheet.getDataRange().getValues();
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      rows.push({
        timestamp: s(data[i][0]), serialNum: s(data[i][1]),
        customerName: s(data[i][2]), eventDate: s(data[i][3]), eventLoc: s(data[i][4]),
        q1:s(data[i][5]),q2:s(data[i][6]),q3:s(data[i][7]),q4:s(data[i][8]),
        q5:s(data[i][9]),q6:s(data[i][10]),q7:s(data[i][11]),q8:s(data[i][12]),
        q9:s(data[i][13]),q10:s(data[i][14])
      });
    }
    return rows;
  } catch(e) { return []; }
}

function saveVolunteerCode(code) {
  PropertiesService.getScriptProperties().setProperty('volunteer_code', code || '0000');
  return "Success";
}

// ==========================================
// 寫入與更新功能
// ==========================================
function saveEvent(eventObj) {
  setupSheets().eventSheet.appendRow([ eventObj.id, eventObj.mode, eventObj.name, eventObj.loc, eventObj.isPermanent, eventObj.date, eventObj.start, eventObj.end, eventObj.maxSlots || 15, Math.max(0, parseInt(eventObj.extraWalkInSlots) || 0) ]);
  refreshOnlineSnapshotBeforeStart_(eventObj.id);
  return "Success";
}

function updateEventInSheet(eventObj) {
  try {
    var sheet = setupSheets().eventSheet;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (s(data[i][0]) === eventObj.id) {
        var row = i + 1;
        sheet.getRange(row, 2).setValue(s(eventObj.mode));
        sheet.getRange(row, 3).setValue(s(eventObj.name));
        sheet.getRange(row, 4).setValue(s(eventObj.loc));
        sheet.getRange(row, 5).setValue(eventObj.isPermanent ? true : false);
        sheet.getRange(row, 6).setValue(s(eventObj.date));
        sheet.getRange(row, 7).setValue(s(eventObj.start));
        sheet.getRange(row, 8).setValue(s(eventObj.end));
        sheet.getRange(row, 9).setValue(eventObj.maxSlots || 15);
        sheet.getRange(row, 10).setValue(Math.max(0, parseInt(eventObj.extraWalkInSlots) || 0));
        refreshOnlineSnapshotBeforeStart_(eventObj.id);
        return "Updated";
      }
    }
    return "Not found";
  } catch(e) { throw new Error(e.toString()); }
}

function updateEventExtraWalkInSlots(eventId, value) {
  var sheet = setupSheets().eventSheet;
  var data = sheet.getDataRange().getValues();
  var amount = Math.max(0, parseInt(value) || 0);
  for (var i = 1; i < data.length; i++) {
    if (s(data[i][0]) === eventId) {
      sheet.getRange(i + 1, 10).setValue(amount);
      return amount;
    }
  }
  throw new Error('找不到指定場次');
}

function deleteEvent(eventId) {
  var sheet = setupSheets().eventSheet;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (s(data[i][0]) === eventId) {
      sheet.deleteRow(i + 1);
      PropertiesService.getScriptProperties().deleteProperty(snapshotKey_(eventId));
      return "Success";
    }
  }
}

function saveModeCConfig(configObj) {
  PropertiesService.getScriptProperties().setProperty('sys_mode_c_config', JSON.stringify(configObj));
  return "Success";
}

function isUnsupportedBrand_() {
  for (var i = 0; i < arguments.length; i++) {
    var text = arguments[i];
    if (!text || typeof text !== 'string') continue;
    var s = text.trim().toLowerCase();
    if (!s) continue;
    if (s.indexOf('小米') !== -1 || s.indexOf('米家') !== -1) return true;
    if (s.indexOf('dyson') !== -1 || s.indexOf('xiaomi') !== -1) return true;
    if (/(?:^|[^a-z0-9])mi(?:[^a-z0-9]|$)/i.test(s)) return true;
  }
  return false;
}

// ==========================================
// 報到／現場補位規則（Asia/Taipei）
// ==========================================
var WALKIN_TOKEN_TTL_SECONDS_ = 600;
var WALKIN_SNAPSHOT_PREFIX_ = 'ONLINE_BOOKED_AT_START_';

function getTaipeiNow_() { return new Date(); }

function getEventById_(eventId, sheets) {
  var rows = (sheets || setupSheets()).eventSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (s(rows[i][0]) === s(eventId)) {
      return {
        id: s(rows[i][0]), mode: s(rows[i][1]), name: s(rows[i][2]), loc: s(rows[i][3]),
        isPermanent: rows[i][4] === true || s(rows[i][4]) === 'true',
        date: formatDate(rows[i][5]), start: formatTime(rows[i][6]), end: formatTime(rows[i][7]),
        capacity: parseInt(rows[i][8], 10) || 15,
        extraWalkInSlots: Math.max(0, parseInt(rows[i][9], 10) || 0)
      };
    }
  }
  throw new Error('INVALID_EVENT:找不到指定場次，請重新整理後再試。');
}

function getEventWindow_(event) {
  if (!event || event.isPermanent || !event.date || !event.start || !event.end) return null;
  var startAt = new Date(event.date + 'T' + event.start + ':00+08:00');
  var endAt = new Date(event.date + 'T' + event.end + ':00+08:00');
  var deadlineAt = new Date(endAt.getTime() - 90 * 60 * 1000);
  return { startAt: startAt, endAt: endAt, deadlineAt: deadlineAt };
}

function isActiveRecordRow_(row, eventId) {
  var status = s(row[22]);
  return s(row[34]) === s(eventId) &&
    (s(row[35]) === 'A' || s(row[35]) === 'B' || s(row[35]) === 'D') &&
    status !== '已退回' && status !== '已退件';
}

function countEventRecords_(rows, eventId) {
  var online = 0, walkIn = 0;
  for (var i = 1; i < rows.length; i++) {
    if (!isActiveRecordRow_(rows[i], eventId)) continue;
    if (s(rows[i][29]) === '現場補位') walkIn++;
    else online++;
  }
  return { online: online, walkIn: walkIn };
}

function snapshotKey_(eventId) { return WALKIN_SNAPSHOT_PREFIX_ + s(eventId); }

function getOnlineBookedAtStart_(event, rows, now, allowCreate) {
  var counts = countEventRecords_(rows, event.id);
  var windowInfo = getEventWindow_(event);
  if (!windowInfo || now < windowInfo.startAt) return counts.online;
  var props = PropertiesService.getScriptProperties();
  var stored = props.getProperty(snapshotKey_(event.id));
  if (stored !== null && stored !== '') return Math.max(0, parseInt(stored, 10) || 0);
  if (allowCreate) props.setProperty(snapshotKey_(event.id), String(counts.online));
  return counts.online;
}

function refreshOnlineSnapshotBeforeStart_(eventId, sheets) {
  if (!eventId) return;
  var localSheets = sheets || setupSheets();
  var event = getEventById_(eventId, localSheets);
  var windowInfo = getEventWindow_(event);
  if (!windowInfo || getTaipeiNow_() >= windowInfo.startAt) return;
  var rows = localSheets.recordSheet.getDataRange().getValues();
  var counts = countEventRecords_(rows, eventId);
  PropertiesService.getScriptProperties().setProperty(snapshotKey_(eventId), String(counts.online));
}

function computeWalkInAvailability_(capacity, onlineBookedAtStart, successfulWalkInCount, extraWalkInSlots) {
  var walkInCapacity = Math.max(0, Number(capacity || 0) + Number(extraWalkInSlots || 0) - Number(onlineBookedAtStart || 0));
  return {
    walkInCapacity: walkInCapacity,
    remainingWalkInCapacity: Math.max(0, walkInCapacity - Number(successfulWalkInCount || 0))
  };
}

function getWalkInAvailabilityServer(eventId) {
  var sheets = setupSheets();
  var event = getEventById_(eventId, sheets);
  var rows = sheets.recordSheet.getDataRange().getValues();
  var now = getTaipeiNow_();
  var counts = countEventRecords_(rows, eventId);
  var onlineAtStart = getOnlineBookedAtStart_(event, rows, now, true);
  var capacity = computeWalkInAvailability_(event.capacity, onlineAtStart, counts.walkIn, event.extraWalkInSlots);
  var windowInfo = getEventWindow_(event);
  var state = 'OPEN';
  if (windowInfo && now < windowInfo.startAt) state = 'NOT_STARTED';
  else if (windowInfo && now >= windowInfo.deadlineAt) state = 'CLOSED';
  else if (capacity.walkInCapacity <= 0 && onlineAtStart >= event.capacity + event.extraWalkInSlots) state = 'ONLINE_FULL';
  else if (capacity.remainingWalkInCapacity <= 0) state = 'FULL';
  return {
    eventId: event.id, state: state, now: now.toISOString(),
    startAt: windowInfo ? windowInfo.startAt.toISOString() : '',
    deadlineAt: windowInfo ? windowInfo.deadlineAt.toISOString() : '',
    totalCapacity: event.capacity + event.extraWalkInSlots,
    onlineBookedAtEventStart: onlineAtStart,
    successfulWalkInCount: counts.walkIn,
    walkInCapacity: capacity.walkInCapacity,
    remainingWalkInCapacity: capacity.remainingWalkInCapacity,
    message: state === 'NOT_STARTED' ? '現場補位尚未開放，請於活動開始時間後再辦理。' :
      state === 'CLOSED' ? '本場次已停止現場補位及收件。' :
      state === 'ONLINE_FULL' ? '本場次預約已滿，恕不接受現場補位或過號補位，未到場名額亦不再釋出。' :
      state === 'FULL' ? '本場次目前無現場補位名額。' : '現場補位可辦理。'
  };
}

function walkInTokenKey_(token) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s(token), Utilities.Charset.UTF_8);
  return 'WALKIN_TOKEN_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '');
}

function verifyWalkInStaffCode(eventId, code, sessionId) {
  var availability = getWalkInAvailabilityServer(eventId);
  if (availability.state !== 'OPEN') throw new Error('WALKIN_UNAVAILABLE:' + availability.message);
  var sid = s(sessionId).slice(0, 80) || 'anonymous';
  var cache = CacheService.getScriptCache();
  var rateKey = 'WALKIN_RATE_' + sid;
  var rate = JSON.parse(cache.get(rateKey) || '{"failures":0,"blockedUntil":0}');
  var nowMs = getTaipeiNow_().getTime();
  if (Number(rate.blockedUntil || 0) > nowMs) throw new Error('WALKIN_RATE_LIMIT:確認碼錯誤次數過多，請約 30 秒後再試。');
  var correct = PropertiesService.getScriptProperties().getProperty('WALKIN_STAFF_CODE') || '0000';
  if (s(code) !== correct) {
    rate.failures = Number(rate.failures || 0) + 1;
    if (rate.failures >= 5) { rate.failures = 0; rate.blockedUntil = nowMs + 30000; }
    cache.put(rateKey, JSON.stringify(rate), 60);
    throw new Error('WALKIN_STAFF_CODE_INVALID:工作人員確認碼錯誤，請重新輸入。');
  }
  cache.remove(rateKey);
  var token = Utilities.getUuid() + Utilities.getUuid();
  var payload = { token: token, eventId: s(eventId), sessionId: sid, authorizedAt: nowMs, expiresAt: nowMs + 600000, used: false };
  cache.put(walkInTokenKey_(token), JSON.stringify(payload), WALKIN_TOKEN_TTL_SECONDS_);
  return { success: true, token: token, eventId: s(eventId), expiresAt: new Date(payload.expiresAt).toISOString(), message: '現場確認完成，請於 10 分鐘內完成收件資料填寫。' };
}

function validateWalkInToken_(token, eventId, sessionId) {
  if (!token) throw new Error('WALKIN_TOKEN_REQUIRED:現場補位須先由工作人員完成確認。');
  var cache = CacheService.getScriptCache();
  var key = walkInTokenKey_(token);
  var raw = cache.get(key);
  if (!raw) throw new Error('WALKIN_TOKEN_EXPIRED:補位確認已逾時，請洽現場工作人員重新驗證。');
  var payload = JSON.parse(raw);
  if (payload.used) throw new Error('WALKIN_TOKEN_USED:此補位確認已使用，請重新驗證。');
  if (s(payload.eventId) !== s(eventId) || s(payload.sessionId) !== s(sessionId)) throw new Error('WALKIN_TOKEN_EVENT_MISMATCH:補位確認與本場次不符，請重新驗證。');
  if (Number(payload.expiresAt || 0) <= getTaipeiNow_().getTime()) throw new Error('WALKIN_TOKEN_EXPIRED:補位確認已逾時，請洽現場工作人員重新驗證。');
  return { key: key, payload: payload };
}

function validateEventOperationTime_(event, operation) {
  var windowInfo = getEventWindow_(event);
  if (!windowInfo) return;
  var now = getTaipeiNow_();
  if (now < windowInfo.startAt) throw new Error((operation === 'CHECKIN' ? 'CHECKIN_NOT_STARTED:' : 'WALKIN_NOT_OPEN:') + '本場次尚未開始，請於活動開始時間後再辦理報到。');
  if (now >= windowInfo.deadlineAt) throw new Error((operation === 'CHECKIN' ? 'CHECKIN_CLOSED:' : 'WALKIN_CLOSED:') + '已超過本場次報到／收件截止時間，無法完成' + (operation === 'CHECKIN' ? '報到。' : '補位登記。'));
}

function seedOnlineBookedAtEventStartSnapshots() {
  var sheets = setupSheets();
  var eventRows = sheets.eventSheet.getDataRange().getValues();
  var recordRows = sheets.recordSheet.getDataRange().getValues();
  var props = PropertiesService.getScriptProperties();
  var seeded = [];
  for (var i = 1; i < eventRows.length; i++) {
    var eventId = s(eventRows[i][0]);
    if (!eventId) continue;
    var counts = countEventRecords_(recordRows, eventId);
    props.setProperty(snapshotKey_(eventId), String(counts.online));
    seeded.push({ eventId: eventId, onlineBookedAtEventStart: counts.online });
  }
  return seeded;
}

function saveToSheet(formData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch(e) {
    throw new Error('系統忙碌中，請稍後再試。');
  }
  try {
    var sheets = setupSheets();
    var sheet = sheets.recordSheet;

    // 全面禁止品牌防護（小米／米家／Xiaomi／Dyson）
    if (isUnsupportedBrand_(formData.brandModel, formData.category, formData.problem, formData.accessories)) {
      throw new Error('UNSUPPORTED_BRAND:此品牌目前無法提供維修服務（小米／米家／Dyson）');
    }

    var isWalkInSubmission = s(formData.triageStatus) === '現場補位';
    var validatedWalkInToken = null;
    if (isWalkInSubmission) {
      validatedWalkInToken = validateWalkInToken_(formData.walkInAuthorizationToken, formData.eventId, formData.walkInSessionId);
      formData.status = '待檢修';
    }

    if (s(formData.photoData).length > 45000) throw new Error('PHOTO_TOO_LARGE:照片壓縮後仍過大，請重新選擇照片。');
    if (s(formData.signature).length > 45000 || s(formData.returnSignature).length > 45000) {
      throw new Error('SIGNATURE_TOO_LARGE:簽名資料過大，請清除後重新簽名。');
    }

    // 名額競爭防護：A/B/D 模式有場次限額，在寫入前於伺服器端再次確認
    if (formData.eventId && (formData.mode === 'A' || formData.mode === 'B' || formData.mode === 'D')) {
      // 取得該場次名額上限
      var eventRows = sheets.eventSheet.getDataRange().getValues();
      var event = getEventById_(formData.eventId, sheets);
      var quota = event.capacity;
      if (event.mode !== formData.mode) throw new Error('EVENT_MODE_MISMATCH:場次類型不一致，請重新整理後再試。');

      // 場次 ID 是唯一資料來源；日期、時間與地點不得採信瀏覽器傳入值。
      formData.eventDate = event.isPermanent ? '常態' : event.date;
      formData.eventTime = event.isPermanent ? '常態' : (event.start + (event.end ? '~' + event.end : ''));
      formData.eventLoc = event.loc;
      var allRows = sheet.getDataRange().getValues();
      var counts = countEventRecords_(allRows, formData.eventId);
      if (isWalkInSubmission) {
        validateEventOperationTime_(event, 'WALKIN');
        var onlineAtStart = getOnlineBookedAtStart_(event, allRows, getTaipeiNow_(), true);
        var capacityInfo = computeWalkInAvailability_(quota, onlineAtStart, counts.walkIn, event.extraWalkInSlots);
        if (capacityInfo.walkInCapacity <= 0 && onlineAtStart >= quota + event.extraWalkInSlots) {
          throw new Error('WALKIN_ONLINE_FULL:本場次預約已滿，恕不接受現場補位或過號補位，未到場名額亦不再釋出。');
        }
        if (capacityInfo.remainingWalkInCapacity <= 0) throw new Error('WALKIN_FULL:本場次現場名額已額滿，無法完成補位登記。');
      } else if (counts.online + counts.walkIn >= quota) {
        throw new Error('QUOTA_EXCEEDED:' + quota);
      }
    }

    // 封鎖名單防護
    var blockCheck = checkBlocklist(formData.phone, formData.idNumber);
    if (blockCheck.blocked) throw new Error('BLOCKED:' + blockCheck.reason);

    var serverCheckinNumber = '';
    var serverCheckedIn = '';
    if (s(formData.triageStatus) === '現場補位') {
      var checkinRows = sheet.getDataRange().getValues();
      var maxCheckinNumber = 0;
      for (var ci = 1; ci < checkinRows.length; ci++) {
        if (s(checkinRows[ci][34]) === s(formData.eventId) && s(checkinRows[ci][40]) === 'true') {
          maxCheckinNumber = Math.max(maxCheckinNumber, parseInt(checkinRows[ci][39], 10) || 0);
        }
      }
      serverCheckinNumber = maxCheckinNumber + 1;
      serverCheckedIn = 'true';
    }

    var rowData = [
      new Date(), s(formData.activityType), s(formData.serialNum), s(formData.eventDate), s(formData.eventTime), s(formData.eventLoc),
      s(formData.customerName), s(formData.phone), s(formData.email), s(formData.category), s(formData.brandModel), s(formData.accessories),
      s(formData.appearance), s(formData.appearanceNote), s(formData.problem), s(formData.autoReplace), s(formData.unfixable),
      s(formData.repairResult), s(formData.satisfaction), s(formData.repairDetails), s(formData.returnAction), s(formData.signature),
      s(formData.status) || "待審核", s(formData.yearsUsed), s(formData.powerStatus), s(formData.dismantled), s(formData.risk), s(formData.expectedAction),
      s(formData.photoData), s(formData.triageStatus) || "待判定", s(formData.assignee), s(formData.deliverer), s(formData.receiverName),
      s(formData.id), s(formData.eventId), s(formData.mode), s(formData.returnSignature),
      s(formData.gender),
      s(formData.ipAddress),
      serverCheckinNumber, // col 40: 現場補位由伺服器鎖定配置；預約者於報到時寫入
      serverCheckedIn,     // col 41: 現場補位建立時即視為已報到
      '',  // col 42: 已簽收
      s(formData.idNumber) // col 43: 身分證字號
    ];
    sheet.appendRow(rowData);
    if (isWalkInSubmission && validatedWalkInToken) {
      validatedWalkInToken.payload.used = true;
      CacheService.getScriptCache().put(validatedWalkInToken.key, JSON.stringify(validatedWalkInToken.payload), WALKIN_TOKEN_TTL_SECONDS_);
    }
    if (!isWalkInSubmission) refreshOnlineSnapshotBeforeStart_(formData.eventId, sheets);

    return { success: true, checkinNumber: serverCheckinNumber || 0 };
  } catch(error) {
    throw new Error(error.toString());
  } finally {
    lock.releaseLock();
  }
}

function updateRecordInSheet(updateData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = setupSheets().recordSheet;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var idMatches = updateData.id && s(data[i][33]) === s(updateData.id);
      var legacySerialMatches = !updateData.id && updateData.serialNum && s(data[i][2]) === s(updateData.serialNum);
      if (idMatches || legacySerialMatches) {
        var row = i + 1;
        if (updateData.eventDate    !== undefined) sheet.getRange(row, 4).setValue(s(updateData.eventDate));
        if (updateData.eventTime    !== undefined) sheet.getRange(row, 5).setValue(s(updateData.eventTime));
        if (updateData.brandModel   !== undefined) {
          if (isUnsupportedBrand_(updateData.brandModel)) throw new Error('UNSUPPORTED_BRAND:此品牌目前無法提供維修服務（小米／米家／Dyson）');
          sheet.getRange(row, 11).setValue(s(updateData.brandModel));
        }
        if (updateData.repairResult !== undefined) sheet.getRange(row, 18).setValue(s(updateData.repairResult));
        if (updateData.satisfaction !== undefined) sheet.getRange(row, 19).setValue(s(updateData.satisfaction));
        if (updateData.repairDetails!== undefined) sheet.getRange(row, 20).setValue(s(updateData.repairDetails));
        if (updateData.returnAction !== undefined) sheet.getRange(row, 21).setValue(s(updateData.returnAction));
        if (updateData.status       !== undefined) sheet.getRange(row, 23).setValue(s(updateData.status));
        if (updateData.triageStatus !== undefined) sheet.getRange(row, 30).setValue(s(updateData.triageStatus));
        if (updateData.assignee     !== undefined) sheet.getRange(row, 31).setValue(s(updateData.assignee));
        if (updateData.deliverer    !== undefined) sheet.getRange(row, 32).setValue(s(updateData.deliverer));
        if (updateData.receiverName !== undefined) sheet.getRange(row, 33).setValue(s(updateData.receiverName));
        if (updateData.returnSignature !== undefined) sheet.getRange(row, 37).setValue(s(updateData.returnSignature));
        if (updateData.checkinNumber   !== undefined) sheet.getRange(row, 40).setValue(updateData.checkinNumber || 0);
        if (updateData.checkedIn       !== undefined) {
          // ★ 漏洞 B 防線：透過 updateRecordInSheet 設定報到也必須驗證日期
          if (updateData.checkedIn) {
            var recEventDate = formatDate(data[i][3]);
            var tzU = Session.getScriptTimeZone();
            var todayU = Utilities.formatDate(new Date(), tzU, 'yyyy-MM-dd');
            if (recEventDate && recEventDate !== todayU) {
              throw new Error('CHECKIN_DATE_MISMATCH:活動日期（' + recEventDate + '）與今日（' + todayU + '）不符，無法報到。');
            }
            var updateEventId = s(data[i][34]);
            if (updateEventId) validateEventOperationTime_(getEventById_(updateEventId), 'CHECKIN');
          }
          sheet.getRange(row, 41).setValue(updateData.checkedIn ? 'true' : 'false');
        }
        if (updateData.customerSigned  !== undefined) sheet.getRange(row, 42).setValue(updateData.customerSigned ? 'true' : 'false');
        // 已結案時自動寫入填報頂表
        if (updateData.status === '已結案') {
          var exportResult = appendSingleClosedCaseToResultSheet(updateData, data[i]);
          if (!exportResult.success) throw new Error('RESULT_EXPORT_FAILED:' + exportResult.message);
        }
        if (s(data[i][34])) refreshOnlineSnapshotBeforeStart_(s(data[i][34]));
        return "Updated";
      }
    }
    throw new Error('找不到指定維修紀錄');
  } catch(error) { throw new Error(error.toString()); }
  finally { lock.releaseLock(); }
}

function checkInRecord(recordId, serialNum) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = setupSheets().recordSheet;
    var data = sheet.getDataRange().getValues();
    var targetIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if ((recordId && s(data[i][33]) === s(recordId)) || (!recordId && serialNum && s(data[i][2]) === s(serialNum))) {
        targetIndex = i; break;
      }
    }
    if (targetIndex < 0) throw new Error('找不到指定維修紀錄');

    // ★ 漏洞 B 後端防線：活動日期必須 === 台灣今日，否則禁止報到
    var rawEventDate = data[targetIndex][3];
    var eventDateStr = formatDate(rawEventDate); // 統一轉為 YYYY-MM-DD
    var tz = Session.getScriptTimeZone(); // Apps Script 專案時區（應為 Asia/Taipei）
    var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    if (eventDateStr && eventDateStr !== todayStr) {
      throw new Error('CHECKIN_DATE_MISMATCH:活動日期（' + eventDateStr + '）與今日（' + todayStr + '）不符，無法報到。');
    }

    if (s(data[targetIndex][40]) === 'true') return { success: true, checkinNumber: parseInt(data[targetIndex][39]) || 0, alreadyCheckedIn: true };
    var eventId = s(data[targetIndex][34]);
    if (eventId) validateEventOperationTime_(getEventById_(eventId), 'CHECKIN');
    var maxNum = 0;
    for (var j = 1; j < data.length; j++) {
      if (s(data[j][34]) === eventId && s(data[j][40]) === 'true') maxNum = Math.max(maxNum, parseInt(data[j][39]) || 0);
    }
    var nextNum = maxNum + 1;
    sheet.getRange(targetIndex + 1, 40).setValue(nextNum);
    sheet.getRange(targetIndex + 1, 41).setValue('true');
    return { success: true, checkinNumber: nextNum, alreadyCheckedIn: false };
  } finally { lock.releaseLock(); }
}

// ==========================================
// ★ 填報頂表：外部試算表設定
// ==========================================
var RESULT_SS_ID = '1GtYnJhCLOf9swXYynDx6YsXszk5POM6u94KL41UMEMg';
var RESULT_ENV_SHEET_GID = 55733583;
var RESULT_REDUCTION_SHEET_GID = 100000001;

// 統一填報頂表日期格式，並相容舊資料可能使用的「.」分隔符號。
function normalizeResultDate_(value) {
  var formatted = formatResultDate_(value);
  return formatted || String(value || '').trim().replace(/\./g, '/');
}

// 維修紀錄中的活動日期可能是 Date 物件或字串，不可一律再串接 T00:00:00。
function parseResultDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  var text = String(value || '').trim().replace(/\./g, '/');
  if (!text) return null;
  var match = text.match(/^(\d{3,4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (match) {
    var year = Number(match[1]);
    if (year < 1911) year += 1911;
    var parsed = new Date(year, Number(match[2]) - 1, Number(match[3]));
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  var fallback = new Date(text);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatResultDate_(value) {
  var dateObj = parseResultDate_(value);
  if (!dateObj) return '';
  var weekdays = ['日','一','二','三','四','五','六'];
  var mm = dateObj.getMonth() + 1;
  var dd = dateObj.getDate();
  return (dateObj.getFullYear() - 1911) + '/' + (mm < 10 ? '0' : '') + mm + '/' +
    (dd < 10 ? '0' : '') + dd + '(' + weekdays[dateObj.getDay()] + ')';
}

function normalizeResultRepair_(value) {
  var text = s(value);
  return text === '無法維修' ? '無法修復' : text;
}

function normalizeResultReturn_(value) {
  var text = s(value);
  if (text === '領回') return '民眾領回';
  if (text === '交由清潔隊回收') return '清潔隊回收';
  return text;
}

// 依前方既有資料列延續 K、R 欄的原生下拉式選單。
function applyResultDropdowns_(sheet, startRow, rowCount) {
  if (rowCount < 1) return;
  var repairSource = null;
  var returnSource = null;
  for (var row = startRow - 1; row >= 2 && (!repairSource || !returnSource); row--) {
    if (!repairSource && sheet.getRange(row, 11).getDataValidation()) repairSource = sheet.getRange(row, 11);
    if (!returnSource && sheet.getRange(row, 18).getDataValidation()) returnSource = sheet.getRange(row, 18);
  }
  // 使用 PASTE_DATA_VALIDATION 才能連同膠囊樣式與選項顏色完整延續。
  if (repairSource) repairSource.copyTo(sheet.getRange(startRow, 11, rowCount, 1), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  if (returnSource) returnSource.copyTo(sheet.getRange(startRow, 18, rowCount, 1), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
}

function getResultSheet_(mode) {
  try {
    var ss = SpreadsheetApp.openById(RESULT_SS_ID);
    var targetGid = mode === 'D' ? RESULT_REDUCTION_SHEET_GID : RESULT_ENV_SHEET_GID;
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === targetGid) return sheets[i];
    }
    return null;
  } catch(e) {
    Logger.log("getResultSheet_ error: " + e.toString());
    return null;
  }
}

// ==========================================
// ★ 已結案時自動 append 至填報頂表（單筆即時）
// ==========================================
function appendSingleClosedCaseToResultSheet(updateData, recordRow) {
  try {
    var mode = s(recordRow[35]);
    if (mode !== 'A' && mode !== 'B' && mode !== 'D') return { success: true, skipped: true };

    // A/B 匯入環教分頁；D（減量）匯入減量分頁。
    var resultSheet = getResultSheet_(mode);
    if (!resultSheet) return { success: false, message: '找不到指定的填報頂表分頁' };

    var serialNum = s(recordRow[2]);
    var custName  = s(recordRow[6]);
    var custPhone = s(recordRow[7]);
    var lastRow = resultSheet.getLastRow();

    var evtDate = updateData.eventDate !== undefined ? updateData.eventDate : recordRow[3];
    var dateFormatted = formatResultDate_(evtDate);
    if (!dateFormatted) return { success: false, message: '活動日期格式無法辨識' };

    // 新資料以來源單號防重複；舊資料則用日期、姓名、電話與物品名稱比對。
    if (lastRow >= 1) {
      var existing = resultSheet.getRange(1, 1, lastRow, 17).getValues();
      for (var r = 0; r < existing.length; r++) {
        if (String(existing[r][16] || '').indexOf('來源單號：' + serialNum) !== -1) return { success: true, skipped: true };
        if (!existing[r][16] && normalizeResultDate_(existing[r][1]) === dateFormatted &&
            String(existing[r][7]||'').trim() === custName &&
            String(existing[r][9]||'').trim() === custPhone &&
            String(existing[r][3]||'').trim() === s(recordRow[10])) return { success: true, skipped: true };
      }
    }

    var brandModel   = s(updateData.brandModel   !== undefined ? updateData.brandModel   : recordRow[10]);
    var repairResult = normalizeResultRepair_(updateData.repairResult !== undefined ? updateData.repairResult : recordRow[17]);
    var repairDetails= s(updateData.repairDetails!== undefined ? updateData.repairDetails: recordRow[19]);
    var returnAction = normalizeResultReturn_(updateData.returnAction !== undefined ? updateData.returnAction : recordRow[20]);
    var assignee     = s(updateData.assignee     !== undefined ? updateData.assignee     : recordRow[30]);

    // 只寫入 B ~ R 欄（共 17 欄）：不寫入 A 欄（數量/序號）
    var newRowBR = [
      dateFormatted,    // B: 日期（民國）
      s(recordRow[9]), // C: 物品大類
      brandModel,       // D: 物品名稱
      "",               // E: 品牌型號
      "",               // F: 重量(KG)
      s(recordRow[14]),// G: 故障情形
      custName,         // H: 送修人
      s(recordRow[37]),// I: 性別
      custPhone,        // J: 電話
      repairResult,     // K: 檢修結果
      "",               // L: 收費(元)
      assignee,         // M: 維修志工
      "",               // N: 帶回修（由外部填寫）
      repairDetails,    // O: 維修說明
      "",               // P: 通知
      "來源單號：" + serialNum, // Q: 備註（同步唯一鍵）
      returnAction      // R: 結案狀況（民眾領回／清潔隊回收）
    ];

    // 計算實際有資料的最後一列（檢查 B 欄），避免因試算表空白列導致跳列
    var targetRow = 1;
    if (lastRow > 0) {
      var colBValues = resultSheet.getRange(1, 2, lastRow, 1).getValues();
      for (var rowIdx = lastRow - 1; rowIdx >= 0; rowIdx--) {
        if (colBValues[rowIdx][0] !== "" && colBValues[rowIdx][0] !== null && colBValues[rowIdx][0] !== undefined) {
          targetRow = rowIdx + 2; // 接在最後一筆非空資料的下一列
          break;
        }
      }
    }
    if (targetRow === 1 && lastRow > 0) {
      targetRow = lastRow + 1;
    }

    // 寫入 B 欄 ~ R 欄 (第 2 欄至第 18 欄，共 17 欄)
    resultSheet.getRange(targetRow, 2, 1, 17).setValues([newRowBR]);
    applyResultDropdowns_(resultSheet, targetRow, 1);
    return { success: true, appended: true };
  } catch(e) {
    Logger.log("appendSingleClosedCaseToResultSheet error: " + e.toString());
    return { success: false, message: e.toString() };
  }
}

// ==========================================
function getBlocklist() {
  var raw = PropertiesService.getScriptProperties().getProperty('blocklist');
  return raw ? JSON.parse(raw) : [];
}

function saveBlocklist(list) {
  PropertiesService.getScriptProperties().setProperty('blocklist', JSON.stringify(list));
  return "Success";
}

function addToBlocklist(entry) {
  // entry = { type:'phone'|'idnum', value:'...', reason:'...', name:'...' }
  var list = getBlocklist();
  var val = String(entry.value || '').trim().replace(/[-\s]/g,'');
  if (!val) return { success: false, message: '請輸入電話或身分證號碼' };
  for (var i = 0; i < list.length; i++) {
    if (list[i].value === val) return { success: false, message: '此號碼已在封鎖名單中' };
  }
  list.push({ type: entry.type || 'phone', value: val, reason: entry.reason || '', name: entry.name || '', addedAt: new Date().toLocaleString('zh-TW') });
  PropertiesService.getScriptProperties().setProperty('blocklist', JSON.stringify(list));
  return { success: true, message: '已加入封鎖名單' };
}

function removeFromBlocklist(value) {
  var val = String(value || '').trim().replace(/[-\s]/g,'');
  var list = getBlocklist().filter(function(e) { return e.value !== val; });
  PropertiesService.getScriptProperties().setProperty('blocklist', JSON.stringify(list));
  return { success: true, message: '已移除' };
}

function checkBlocklist(phone, idnum) {
  var list = getBlocklist();
  var p = String(phone || '').trim().replace(/[-\s]/g,'');
  var id = String(idnum || '').trim().toUpperCase();
  for (var i = 0; i < list.length; i++) {
    var v = list[i].value;
    if ((p && v === p) || (id && v === id)) return { blocked: true, reason: list[i].reason || '已被系統封鎖' };
  }
  return { blocked: false };
}

// ==========================================
// 寄送包含單據的信件
function sendReceiptEmail(email, serialNum, base64Image) {
  if (!email || email.trim() === "") return "No email provided";
  try {
    var base64Data = base64Image.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', 'Receipt_' + serialNum + '.jpg');
    var subject = "【高雄市政府環境保護局 環境管理處】維修電子收件單 (單號：" + serialNum + ")";
    var body = "親愛的送修人/單位您好：\n\n感謝您參與小家電及玩具維修活動。\n您的申請已審核通過！附檔為您的電子收件單，請妥善保存。\n請憑此單號或電子圖檔，於活動/開放時間將您的物品送至現場。\n\n高雄市政府環境保護局 環境管理處 敬上\n==========================\n※ 此信件為系統自動發送，請勿直接回覆 ※";
    MailApp.sendEmail({ to: email, subject: subject, body: body, attachments: [blob] });
    return "Success";
  } catch(e) { throw new Error(e.toString()); }
}

function sendCustomEmail(email, subject, body) {
  if (!email || email.trim() === "") return "No email provided";
  try { MailApp.sendEmail({ to: email, subject: subject, body: body }); return "Success"; }
  catch(e) { throw new Error(e.toString()); }
}

// ==========================================
// ★ 批次同步已結案資料至外部填報頂表
// ==========================================
function syncClosedCasesToResultSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var recordSheet = ss.getSheetByName("維修紀錄");
    var cutoffDate = new Date("2026-07-01T00:00:00");
    var recordData = recordSheet.getDataRange().getValues();
    var envSheet = getResultSheet_('A');
    var reductionSheet = getResultSheet_('D');
    if (!envSheet || !reductionSheet) {
      return { success: false, message: "無法開啟環教或減量填報分頁，請確認試算表 ID、gid 與權限設定！" };
    }

    var envCount = syncClosedCasesToSheet_(recordData, ['A', 'B'], envSheet, cutoffDate);
    var reductionCount = syncClosedCasesToSheet_(recordData, ['D'], reductionSheet, cutoffDate);
    var total = envCount + reductionCount;
    if (total === 0) return { success: true, message: "目前無新的已結案資料需要同步（7月1日後）。" };
    return {
      success: true,
      message: "✅ 同步完成：環教 " + envCount + " 筆、減量 " + reductionCount + " 筆，共 " + total + " 筆！"
    };
  } catch(e) {
    return { success: false, message: "❌ 同步失敗：" + e.toString() };
  }
}

function syncClosedCasesToSheet_(recordData, allowedModes, resultSheet, cutoffDate) {
  var resultLastRow = resultSheet.getLastRow();
  var existingKeys = {};

  if (resultLastRow >= 1) {
    var resultData = resultSheet.getRange(1, 1, resultLastRow, 17).getValues();
    for (var r = 0; r < resultData.length; r++) {
      var rowDate = normalizeResultDate_(resultData[r][1]);
      var rowName = String(resultData[r][7] || "").trim();
      var rowPhone = String(resultData[r][9] || "").trim();
      var sourceMatch = String(resultData[r][16] || '').match(/來源單號：([^\s]+)/);
      if (sourceMatch) existingKeys['SERIAL|' + sourceMatch[1]] = true;
      if (rowDate && rowName && rowPhone) existingKeys[rowDate + '|' + rowName + '|' + rowPhone + '|' + String(resultData[r][3] || '').trim()] = true;
    }
  }

  var closedCases = [];
  for (var i = 1; i < recordData.length; i++) {
    var row = recordData[i];
    if (s(row[22]) !== "已結案") continue;
    if (allowedModes.indexOf(s(row[35])) === -1) continue;
    var dateObj = parseResultDate_(row[3]);
    if (!dateObj) continue;
    if (dateObj < cutoffDate) continue;
    var dateFormatted = formatResultDate_(dateObj);
    var serialKey = 'SERIAL|' + s(row[2]);
    var legacyKey = dateFormatted + '|' + s(row[6]) + '|' + s(row[7]) + '|' + s(row[10]);
    if (existingKeys[serialKey] || existingKeys[legacyKey]) continue;
    existingKeys[serialKey] = true;
    closedCases.push(row);
  }

  closedCases.sort(function(a, b) {
    var da = s(a[3]), db = s(b[3]);
    return da < db ? -1 : da > db ? 1 : 0;
  });

  var newRows = [];
  for (var k = 0; k < closedCases.length; k++) {
    var rec = closedCases[k];
    var formattedDate = formatResultDate_(rec[3]);

    newRows.push([
      formattedDate, s(rec[9]), s(rec[10]), "", "", s(rec[14]), s(rec[6]),
      s(rec[37]), s(rec[7]), normalizeResultRepair_(rec[17]), "", s(rec[30]), "", s(rec[19]), "", "來源單號：" + s(rec[2]), normalizeResultReturn_(rec[20])
    ]);
  }

  if (newRows.length > 0) {
    // 依據 B 欄找到真正的資料最後一列，避免留空白列
    var targetRow = 1;
    if (resultLastRow > 0) {
      var colBValues = resultSheet.getRange(1, 2, resultLastRow, 1).getValues();
      for (var rowIdx = resultLastRow - 1; rowIdx >= 0; rowIdx--) {
        if (colBValues[rowIdx][0] !== "" && colBValues[rowIdx][0] !== null && colBValues[rowIdx][0] !== undefined) {
          targetRow = rowIdx + 2;
          break;
        }
      }
    }
    if (targetRow === 1 && resultLastRow > 0) {
      targetRow = resultLastRow + 1;
    }

    // 只填寫第 2 欄至第 18 欄 (B ~ R 欄，共 17 欄)
    resultSheet.getRange(targetRow, 2, newRows.length, 17).setValues(newRows);
    applyResultDropdowns_(resultSheet, targetRow, newRows.length);
  }
  return newRows.length;
}


// ==========================================
// 公開案件進度查詢 (身分證字號 / 手機號碼 二擇一，安全 DTO 僅回傳公開欄位)
// ==========================================
function searchPublicRepairStatus(queryType, queryValue) {
  var type = String(queryType || '').trim();
  var val = String(queryValue || '').trim();

  if (type !== 'idNumber' && type !== 'phone') {
    return { success: false, message: '查詢類型不正確，請選擇身分證字號或手機號碼。' };
  }

  if (!val) {
    return { success: false, message: '請輸入要查詢的內容。' };
  }

  var normalizedTarget = '';
  if (type === 'idNumber') {
    normalizedTarget = val.toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z][0-9]{9}$/.test(normalizedTarget)) {
      return { success: false, message: '身分證字號格式不正確（需為 1 碼英文字母 + 9 碼數字）。' };
    }
  } else if (type === 'phone') {
    normalizedTarget = val.replace(/\D/g, '');
    if (normalizedTarget.length < 8 || !/^09\d{8}$/.test(normalizedTarget)) {
      return { success: false, message: '手機號碼格式不正確（請輸入 10 碼 09 開頭手機號碼）。' };
    }
  }

  var sheets = setupSheets();
  var recordData = sheets.recordSheet.getDataRange().getValues();
  var matchedCases = [];

  for (var i = 1; i < recordData.length; i++) {
    var row = recordData[i];
    var rowSerial = String(row[2] || '').trim();
    if (!rowSerial) continue;

    var isMatch = false;
    if (type === 'idNumber') {
      var rowId = String(row[42] || '').trim().toUpperCase().replace(/\s+/g, '');
      if (rowId && rowId === normalizedTarget) {
        isMatch = true;
      }
    } else if (type === 'phone') {
      var rowPhone = String(row[7] || '').replace(/\D/g, '');
      if (rowPhone && rowPhone === normalizedTarget) {
        isMatch = true;
      }
    }

    if (isMatch) {
      var status = String(row[22] || '').trim();
      var triageStatus = String(row[29] || '').trim();
      var repairResult = String(row[17] || '').trim();

      // 轉換公開顯示友善文字與狀態徽章
      var displayStatus = '處理中';
      var tag = '處理中';
      var tagColor = '#64748B';

      if (status === '已結案') {
        displayStatus = '已結案 (已取件)';
        tag = '已結案';
        tagColor = '#16A34A';
      } else if (status === '待取件' || repairResult === '已修復' || repairResult === '無法修復') {
        displayStatus = '檢修完成，請依通知領取';
        tag = '待取件';
        tagColor = '#2563EB';
      } else if (status === '待檢修' || status === '檢修中') {
        displayStatus = '志工檢修中';
        tag = '檢修中';
        tagColor = '#D97706';
      } else if (triageStatus === '志工可修' || status === '已審核') {
        displayStatus = '審核通過，可依通知送件';
        tag = '審核通過';
        tagColor = '#0284C7';
      } else if (triageStatus === '無法維修' || status === '已退回') {
        displayStatus = '初步評估無法受理維修';
        tag = '不受理';
        tagColor = '#64748B';
      } else if (status === '待審核' || triageStatus === '待判定' || triageStatus === '待現場判定') {
        displayStatus = '申請已收到，等待志工審核';
        tag = '待審核';
        tagColor = '#CA8A04';
      }

      matchedCases.push({
        serialNum: rowSerial,
        category: String(row[9] || '').trim(),
        brandModel: String(row[10] || '').trim(),
        eventLoc: String(row[5] || '').trim(),
        eventDate: formatDate(row[3]),
        displayStatus: displayStatus,
        repairResult: repairResult || '尚未登錄',
        statusTag: tag,
        statusColor: tagColor,
        lastUpdated: String(row[0] || '').trim(),
        rowIndex: i
      });
    }
  }

  if (matchedCases.length === 0) {
    // 安全原則：查無資料時統一回傳相同模糊錯誤，避免探測
    return { success: false, message: '查無符合資料，請確認輸入內容是否與預約時填寫的資料一致。' };
  }

  // 最新案件優先排序 (最新建立之資料優先)
  matchedCases.sort(function(a, b) {
    if (b.eventDate && a.eventDate && b.eventDate !== a.eventDate) {
      return b.eventDate.localeCompare(a.eventDate);
    }
    return b.rowIndex - a.rowIndex;
  });

  // 移除內部輔助屬性 rowIndex
  for (var m = 0; m < matchedCases.length; m++) {
    delete matchedCases[m].rowIndex;
  }

  return {
    success: true,
    count: matchedCases.length,
    cases: matchedCases
  };
}

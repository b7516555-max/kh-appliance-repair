/**
 * ============================================================================
 * 高雄市政府環境保護局 環境管理處｜小家電維修系統
 * LINE Messaging API 獨立整合模組 (Line.gs)
 * ============================================================================
 * 
 * 【安全性與架構限制聲明】
 * 標記: GAS_DIRECT_WEBHOOK_SIGNATURE_NOT_VERIFIED
 * 說明: Google Apps Script (GAS) Web App 的 doPost(e) 可直接取得 request body，
 *       但 Apps Script 原生執行環境限制，無法直接讀取 HTTP Request Header 中的
 *       「x-line-signature」。因此目前直接以 GAS 做 Webhook 時無法在伺服器端
 *       完成原生 HMAC-SHA256 簽名比對。
 * 定位: 本架構為「功能驗證／低風險導流測試架構」，非完整 Production Security 架構。
 * 防護策略:
 *   1. 僅提供公開引導、FAQ、據點、須知、Rich Menu 導航，嚴禁直接回傳敏感個資。
 *   2. 具備 LINE_FEATURE_ENABLED 總開關 (Kill Switch)，預設 false。
 *   3. 嚴禁任何透過 LINE 修改維修紀錄、個資綁定、報價操作之行為。
 *   4. 後續正式開放個資操作前，需重新評估簽名驗證架構 (例如極小型代理 Proxy)。
 */

// ==========================================
// 0. LINE Action 常數定義
// ==========================================
var LINE_ACTIONS = {
  CASE_QUERY_GUIDE: 'case_query_guide',
  REPAIR_INFO: 'repair_info',
  LOCATIONS: 'locations',
  CUSTOMER_SERVICE: 'customer_service',
  MENU_WELCOME: 'menu_welcome'
};

var LINE_PRODUCTION_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyVlstjdm3eUxwWY6mu5C6mJO74Rok7GmBid6pImzd3Tigfhj0wywsnEFUt9_a7AZZf/exec';

// ==========================================
// 1. LINE 設定與環境變數管理
// ==========================================
function getLineConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    channelAccessToken: props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '',
    channelSecret: props.getProperty('LINE_CHANNEL_SECRET') || '',
    oaBasicId: props.getProperty('LINE_OA_BASIC_ID') || '',
    webAppUrl: props.getProperty('LINE_WEBAPP_URL') || getPublicWebAppUrl_(),
    featureEnabled: props.getProperty('LINE_FEATURE_ENABLED') === 'true',
    mainRichMenuId: props.getProperty('LINE_MAIN_RICH_MENU_ID') || '',
    previousRichMenuId: props.getProperty('LINE_PREVIOUS_RICH_MENU_ID') || '',
    richMenuImageFileId: props.getProperty('LINE_RICH_MENU_IMAGE_FILE_ID') || ''
  };
}

/**
 * Re-enable the LINE webhook only when both required credentials exist.
 * This is intentionally an editor/API-only maintenance function.
 */
function enableLineFeatureAfterCredentialCheck() {
  var props = PropertiesService.getScriptProperties();
  var missing = [];
  if (!props.getProperty('LINE_CHANNEL_ACCESS_TOKEN')) missing.push('LINE_CHANNEL_ACCESS_TOKEN');
  if (!props.getProperty('LINE_CHANNEL_SECRET')) missing.push('LINE_CHANNEL_SECRET');

  if (missing.length > 0) {
    throw new Error('Cannot enable LINE feature. Missing: ' + missing.join(', '));
  }

  props.setProperty('LINE_WEBAPP_URL', LINE_PRODUCTION_WEB_APP_URL);
  props.setProperty('LINE_FEATURE_ENABLED', 'true');
  return {
    enabled: true,
    credentialsPresent: true,
    webAppUrl: LINE_PRODUCTION_WEB_APP_URL,
    updatedAt: new Date().toISOString()
  };
}

/**
 * 取得對外正式 Web App URL
 * 優先讀取 Script Properties 設定的 LINE_WEBAPP_URL，
 * 次之使用 ScriptApp.getService().getUrl()，並提供備用預設值。
 */
function getPublicWebAppUrl_() {
  var props = PropertiesService.getScriptProperties();
  var customUrl = props.getProperty('LINE_WEBAPP_URL');
  if (customUrl && customUrl.trim() !== '') {
    return customUrl.trim();
  }
  try {
    var serviceUrl = ScriptApp.getService().getUrl();
    if (serviceUrl && serviceUrl.indexOf('script.google.com') !== -1) {
      return serviceUrl;
    }
  } catch (e) {
    Logger.log('getPublicWebAppUrl_ ScriptApp error: ' + e.toString());
  }
  // 專案 fallback URL (若 ScriptApp 在特定 trigger 環境無法取得時使用)
  return LINE_PRODUCTION_WEB_APP_URL;
}

// ==========================================
// 2. LINE Webhook 進入點 (doPost)
// ==========================================
/**
 * LINE Messaging API Webhook 核心進入點
 * Apps Script 將所有 POST 請求導流至此函式處理
 */
function doPost(e) {
  // 安全防呆：若無 postData 或 contents，仍回傳 200 OK (避免拋錯)
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored', message: 'No payload received' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var payload = JSON.parse(e.postData.contents);

    // ── 內部自動化通道：直接由程式執行 Rich Menu 部署與狀態檢查 ──
    // Removed insecure adminAction handling from public doPost.
    // Administrative actions must be invoked via clasp run or internal triggers only.

    var config = getLineConfig_();
    
    // Kill Switch: 若功能未開啟，回傳 200 OK 避免 LINE 伺服器重複重試
    if (!config.featureEnabled) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'disabled', message: 'LINE feature is currently disabled.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var events = payload && payload.events && Array.isArray(payload.events) ? payload.events : [];
    
    // LINE Developers Webhook Verify 測試：events 可能為空陣列 []
    if (events.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Webhook verified' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    for (var i = 0; i < events.length; i++) {
      if (events[i]) {
        handleLineWebhookEvent_(events[i], config);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost Error: ' + err.toString());
    logLineAction_('ERROR', '', 'doPost', 'Exception: ' + err.toString());
    // 即使發生未預期例外，仍回傳 200 OK 防止 LINE 伺服器連續重試風暴
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 分流處理單一 LINE Webhook Event
 */
function handleLineWebhookEvent_(event, config) {
  var eventType = event.type;
  var userId = (event.source && event.source.userId) ? event.source.userId : '';

  switch (eventType) {
    case 'follow':
      handleLineFollow_(event, config);
      break;
    case 'message':
      if (event.message && event.message.type === 'text') {
        handleLineTextMessage_(event, config);
      }
      break;
    case 'postback':
      handleLinePostback_(event, config);
      break;
    default:
      logLineAction_(eventType, userId, 'unhandled_event', 'type: ' + eventType);
      break;
  }
}

// ==========================================
// 3. 事件處理常式 (Handlers)
// ==========================================

/**
 * 處理新好友加入 / 解除封鎖 (follow)
 */
function handleLineFollow_(event, config) {
  var replyToken = event.replyToken;
  var userId = (event.source && event.source.userId) ? event.source.userId : '';
  
  logLineAction_('follow', userId, 'user_follow', 'New follower');
  
  var welcomeFlex = createWelcomeFlex_(config.webAppUrl);
  replyLineMessage_(replyToken, [welcomeFlex], config.channelAccessToken);
}

/**
 * 處理文字訊息 (message.text)
 * 第一階段：僅處理關鍵字選單導航與案件查詢引導，其他文字不自動回答，保留人工客服模式
 */
function handleLineTextMessage_(event, config) {
  var replyToken = event.replyToken;
  var userText = (event.message && event.message.text) ? event.message.text.trim() : '';
  var userId = (event.source && event.source.userId) ? event.source.userId : '';
  
  var normalizedText = userText.toLowerCase();

  // 1. 我要預約 / 預約
  if (normalizedText.indexOf('預約') !== -1) {
    logLineAction_('message', userId, 'keyword_booking', userText);
    var repairFlex = createRepairMainFlex_(config.webAppUrl);
    replyLineMessage_(replyToken, [repairFlex], config.channelAccessToken);
    return;
  }

  // 2. 場次 / 活動場次
  if (normalizedText.indexOf('場次') !== -1 || normalizedText.indexOf('活動') !== -1) {
    logLineAction_('message', userId, 'keyword_events', userText);
    var eventsFlex = createRepairMainFlex_(config.webAppUrl, true);
    replyLineMessage_(replyToken, [eventsFlex], config.channelAccessToken);
    return;
  }

  // 3. 查詢 / 我的案件 / 單號
  if (normalizedText.indexOf('查詢') !== -1 || normalizedText.indexOf('案件') !== -1 || normalizedText.indexOf('進度') !== -1) {
    logLineAction_('message', userId, 'keyword_query', userText);
    var queryGuideFlex = createCaseQueryGuideFlex_();
    replyLineMessage_(replyToken, [queryGuideFlex], config.channelAccessToken);
    return;
  }

  // 4. 維修須知 / 須知 / 規定 / 規則
  if (normalizedText.indexOf('須知') !== -1 || normalizedText.indexOf('規則') !== -1 || normalizedText.indexOf('規定') !== -1) {
    logLineAction_('message', userId, 'keyword_notice', userText);
    var infoFlex = createRepairInfoFlex_();
    replyLineMessage_(replyToken, [infoFlex], config.channelAccessToken);
    return;
  }

  // 5. 據點 / 地點 / 站點 / 在哪裡
  if (normalizedText.indexOf('據點') !== -1 || normalizedText.indexOf('地點') !== -1 || normalizedText.indexOf('位置') !== -1) {
    logLineAction_('message', userId, 'keyword_location', userText);
    var locFlex = createLocationFlex_();
    replyLineMessage_(replyToken, [locFlex], config.channelAccessToken);
    return;
  }

  // 6. 客服 / 人工客服 / 聯絡 / 電話
  if (normalizedText.indexOf('客服') !== -1 || normalizedText.indexOf('電話') !== -1 || normalizedText.indexOf('聯絡') !== -1) {
    logLineAction_('message', userId, 'keyword_service', userText);
    var csFlex = createCustomerServiceFlex_();
    replyLineMessage_(replyToken, [csFlex], config.channelAccessToken);
    return;
  }

  // 非關鍵字訊息：保持安靜，保留 LINE 官方帳號後台人工客服回覆
  logLineAction_('message', userId, 'manual_forward', userText);
}

/**
 * 處理 Postback 事件 (Rich Menu 或 Flex 按鈕點擊)
 */
function handleLinePostback_(event, config) {
  var replyToken = event.replyToken;
  var postbackData = (event.postback && event.postback.data) ? event.postback.data : '';
  var userId = (event.source && event.source.userId) ? event.source.userId : '';

  logLineAction_('postback', userId, 'postback_action', postbackData);

  // 支援 action=xxx 與純 action 名稱格式
  var actionKey = postbackData.replace(/^action=/, '');

  if (actionKey === LINE_ACTIONS.MENU_WELCOME) {
    replyLineMessage_(replyToken, [createWelcomeFlex_(config.webAppUrl)], config.channelAccessToken);
  } else if (actionKey === LINE_ACTIONS.REPAIR_INFO || actionKey === 'menu_info') {
    replyLineMessage_(replyToken, [createRepairInfoFlex_()], config.channelAccessToken);
  } else if (actionKey === LINE_ACTIONS.LOCATIONS || actionKey === 'menu_location') {
    replyLineMessage_(replyToken, [createLocationFlex_()], config.channelAccessToken);
  } else if (actionKey === LINE_ACTIONS.CASE_QUERY_GUIDE || actionKey === 'menu_query_guide') {
    replyLineMessage_(replyToken, [createCaseQueryGuideFlex_()], config.channelAccessToken);
  } else if (actionKey === LINE_ACTIONS.CUSTOMER_SERVICE || actionKey === 'menu_service') {
    replyLineMessage_(replyToken, [createCustomerServiceFlex_()], config.channelAccessToken);
  }
}

// ==========================================
// 4. Flex Message 產生器 (符合政府機關視覺風格)
// ==========================================

/**
 * 產生歡迎訊息 Flex Message
 */
function createWelcomeFlex_(webAppUrl) {
  var bookingUrl = webAppUrl + (webAppUrl.indexOf('?') !== -1 ? '&' : '?') + 'source=line';
  
  return {
    type: 'flex',
    altText: '🔧 歡迎使用高雄市政府環境保護局 小家電檢修服務',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F4C81',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '高雄市政府環境保護局',
            color: '#E0F2FE',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: '小家電檢修服務中心',
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            margin: 'xs'
          },
          {
            type: 'text',
            text: '以修代買 ‧ 資源循環 ‧ 惜物愛物',
            color: '#93C5FD',
            size: 'xxs',
            margin: 'sm'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '家電壞了先別急著丟！',
            weight: 'bold',
            size: 'md',
            color: '#1E293B'
          },
          {
            type: 'text',
            text: '環保局推動小家電及玩具維修服務，透過專業志工用心檢修，延長物品壽命，共同實踐綠色永續生活。',
            wrap: true,
            size: 'sm',
            color: '#475569',
            lineSpacing: '4px'
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#E2E8F0'
          },
          {
            type: 'text',
            text: '📌 常用服務功能：',
            weight: 'bold',
            size: 'xs',
            color: '#0F6E5C',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '🔧 線上預約檢修',
                  uri: bookingUrl
                },
                style: 'primary',
                color: '#0F4C81',
                height: 'sm'
              },
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '📅 查看維修場次',
                  uri: bookingUrl
                },
                style: 'secondary',
                height: 'sm'
              },
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '📋 查詢案件進度',
                  data: 'action=menu_query_guide'
                },
                style: 'secondary',
                height: 'sm'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '🔌 維修須知',
              data: 'action=menu_info'
            },
            height: 'sm'
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '📍 維修據點',
              data: 'action=menu_location'
            },
            height: 'sm'
          }
        ]
      }
    }
  };
}

/**
 * 產生維修服務主卡 Flex Message
 */
function createRepairMainFlex_(webAppUrl, isEventFocus) {
  var targetUrl = webAppUrl + (webAppUrl.indexOf('?') !== -1 ? '&' : '?') + 'source=line';
  var title = isEventFocus ? '📅 維修場次與線上預約' : '🔧 小家電檢修線上預約';

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F6E5C',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: title,
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '請點擊下方按鈕前往高雄市環保局小家電維修系統，瀏覽近期維修站點、剩餘名額並填寫線上預約申請。',
            wrap: true,
            size: 'sm',
            color: '#334155'
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '前往維修預約系統 ➔',
              uri: targetUrl
            },
            style: 'primary',
            color: '#0F6E5C',
            margin: 'md'
          }
        ]
      }
    }
  };
}

/**
 * 產生案件查詢引導 Flex Message (第一階段安全版)
 */
function createCaseQueryGuideFlex_() {
  return {
    type: 'flex',
    altText: '📋 案件進度查詢說明',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F4C81',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '📋 案件進度查詢',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '【查詢方式說明】',
            weight: 'bold',
            size: 'sm',
            color: '#1E293B'
          },
          {
            type: 'text',
            text: '若您已完成預約或已送件，系統會在以下階段主動發送 Email 通知：\n\n1. 預約收到待審核\n2. 志工審核通過 (附電子收件單)\n3. 檢修完成通知領件\n4. 取件結案',
            wrap: true,
            size: 'xs',
            color: '#475569',
            lineSpacing: '3px'
          },
          {
            type: 'separator',
            color: '#E2E8F0'
          },
          {
            type: 'text',
            text: '如需查詢特定案件進度，可直接於聊天室輸入案件單號，或由專人為您查詢。',
            wrap: true,
            size: 'xs',
            color: '#64748B'
          }
        ]
      }
    }
  };
}

/**
 * 產生維修須知 Flex Message
 */
function createRepairInfoFlex_() {
  return {
    type: 'flex',
    altText: '🔌 檢修服務參加須知',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#334155',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '🔌 檢修服務參加須知',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '• 每人每年最多登記 5 件，每場限登記 1 件。',
            wrap: true,
            size: 'xs',
            color: '#1E293B'
          },
          {
            type: 'text',
            text: '• 檢修服務免費；若需更換零件，依實際零件材料費實報實銷。',
            wrap: true,
            size: 'xs',
            color: '#1E293B'
          },
          {
            type: 'text',
            text: '• 水貨 Dyson、水貨日本水波爐等特殊規格因零件取得不易，恕無法受理。',
            wrap: true,
            size: 'xs',
            color: '#DC2626'
          },
          {
            type: 'text',
            text: '• 線上預約於活動日前 2 天截止；預約者最晚須於活動結束前 2 小時完成報到。',
            wrap: true,
            size: 'xs',
            color: '#1E293B'
          }
        ]
      }
    }
  };
}

/**
 * 產生維修據點 Flex Message
 */
function createLocationFlex_() {
  return {
    type: 'flex',
    altText: '📍 維修據點資訊',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F6E5C',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '📍 維修服務據點',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: '🏢 南鳳山維修站 (定點)',
                weight: 'bold',
                size: 'sm',
                color: '#0F4C81'
              },
              {
                type: 'text',
                text: '高雄市鳳山區經武路 34 巷 1 號',
                size: 'xs',
                color: '#475569'
              }
            ]
          },
          {
            type: 'separator',
            color: '#E2E8F0'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: '🏢 楠梓家具展示區 (定點/木工)',
                weight: 'bold',
                size: 'sm',
                color: '#0F4C81'
              },
              {
                type: 'text',
                text: '高雄市楠梓區德民路 170 號',
                size: 'xs',
                color: '#475569'
              }
            ]
          },
          {
            type: 'separator',
            color: '#E2E8F0'
          },
          {
            type: 'text',
            text: '🎪 非定點宣導巡迴活動請參考「活動場次」公告。',
            size: 'xs',
            color: '#64748B'
          }
        ]
      }
    }
  };
}

/**
 * 產生人工客服說明 Flex Message
 */
function createCustomerServiceFlex_() {
  return {
    type: 'flex',
    altText: '💬 人工客服與聯絡資訊',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F4C81',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '💬 人工客服服務',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '您好！如有維修相關疑問，請直接在聊天室留言說明，工作人員將於服務時間盡速協助回覆。',
            wrap: true,
            size: 'sm',
            color: '#334155'
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#E2E8F0'
          },
          {
            type: 'text',
            text: '📞 環保局環境管理處電話：07-7351684',
            size: 'xs',
            weight: 'bold',
            color: '#0F4C81'
          },
          {
            type: 'text',
            text: '服務時間：週一至週五 08:30~17:30 (國定假日除外)',
            size: 'xxs',
            color: '#64748B'
          }
        ]
      }
    }
  };
}

// ==========================================
// 5. 狀態轉換與共用工具 (狀態對應器)
// ==========================================

/**
 * 將內部維修狀態轉換為民眾易懂的友善公開狀態
 * 不改變原始內部狀態字串
 */
function mapRepairStatusForPublic_(status, triageStatus, repairResult) {
  var stat = String(status || '').trim();
  var triage = String(triageStatus || '').trim();
  var result = String(repairResult || '').trim();

  if (stat === '已結案') return { text: '已結案 (已取件)', tag: '🟢 完成', color: '#16A34A' };
  if (stat === '待取件' || result === '已修復' || result === '無法修復') return { text: '檢修完成，請依通知領取', tag: '🔵 待取件', color: '#2563EB' };
  if (stat === '待檢修' || stat === '檢修中') return { text: '志工檢修中', tag: '🟠 檢修中', color: '#D97706' };
  if (triage === '志工可修' || stat === '已審核') return { text: '審核通過，可依通知送件', tag: '🔵 已審核', color: '#0284C7' };
  if (triage === '無法維修' || stat === '已退回') return { text: '初步評估無法受理維修', tag: '⚪ 不受理', color: '#64748B' };
  if (stat === '待審核' || triage === '待判定' || triage === '待現場判定') return { text: '申請已收到，等待志工審核', tag: '🟡 待審核', color: '#CA8A04' };

  return { text: stat || '處理中', tag: '⚪ 處理中', color: '#64748B' };
}

// ==========================================
// 6. LINE API 通訊函式 (Reply / Push / Log)
// ==========================================

/**
 * 發送 LINE 回覆訊息 (Reply API)
 */
function replyLineMessage_(replyToken, messages, token) {
  if (!replyToken || !messages || messages.length === 0) return;
  var accessToken = token || getLineConfig_().channelAccessToken;
  if (!accessToken) {
    Logger.log('replyLineMessage_ Error: Channel Access Token is missing');
    return;
  }

  var url = 'https://api.line.me/v2/bot/message/reply';
  var options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: messages
    }),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log('LINE Reply API Failed (' + code + '): ' + response.getContentText());
      logLineAction_('ERROR', '', 'replyLineMessage_', 'HTTP ' + code + ': ' + response.getContentText());
    }
  } catch (err) {
    Logger.log('LINE Reply Exception: ' + err.toString());
    logLineAction_('ERROR', '', 'replyLineMessage_', 'Exception: ' + err.toString());
  }
}

/**
 * 發送 LINE 推播訊息 (Push API)
 * （預留給後續通知階段使用）
 */
function pushLineMessage_(userId, messages, token) {
  if (!userId || !messages || messages.length === 0) return;
  var accessToken = token || getLineConfig_().channelAccessToken;
  if (!accessToken) {
    Logger.log('pushLineMessage_ Error: Channel Access Token is missing');
    return;
  }

  var url = 'https://api.line.me/v2/bot/message/push';
  var options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify({
      to: userId,
      messages: messages
    }),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log('LINE Push API Failed (' + code + '): ' + response.getContentText());
      logLineAction_('ERROR', userId, 'pushLineMessage_', 'HTTP ' + code + ': ' + response.getContentText());
    }
  } catch (err) {
    Logger.log('LINE Push Exception: ' + err.toString());
    logLineAction_('ERROR', userId, 'pushLineMessage_', 'Exception: ' + err.toString());
  }
}

/**
 * 記錄 LINE 操作日誌至「LINE_Log」工作表
 * 遵守資安與隱私最小化原則，遮罩 UserId，不記錄機敏個資
 */
function logLineAction_(eventType, userId, action, resultOrError) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName('LINE_Log');
    if (!logSheet) {
      logSheet = ss.insertSheet('LINE_Log');
      logSheet.appendRow(['記錄時間', '事件類別', 'LINE_UserId(遮罩)', '操作動作', '執行結果/備註']);
    }
    
    // 遮罩 UserId (僅保留前 4 碼與後 4 碼)
    var maskedUid = '';
    if (userId && userId.length > 8) {
      maskedUid = userId.substring(0, 4) + '****' + userId.substring(userId.length - 4);
    } else if (userId) {
      maskedUid = '****';
    }

    logSheet.appendRow([
      new Date(),
      String(eventType || ''),
      maskedUid,
      String(action || ''),
      String(resultOrError || '').substring(0, 500)
    ]);
  } catch (e) {
    Logger.log('logLineAction_ error: ' + e.toString());
  }
}

// ==========================================
// 7. LINE API 統一通訊封裝 (callLineApi_)
// ==========================================

/**
 * 統一封裝 LINE Messaging API 請求
 * 處理 HTTP 狀態碼與錯誤日誌，避免洩漏機敏 Token
 */
function callLineApi_(endpoint, method, payload, blobData, contentType) {
  var config = getLineConfig_();
  if (!config.channelAccessToken) {
    throw new Error('MISSING_TOKEN: 請先設定 LINE_CHANNEL_ACCESS_TOKEN');
  }

  var headers = {
    'Authorization': 'Bearer ' + config.channelAccessToken
  };

  var options = {
    method: method || 'get',
    headers: headers,
    muteHttpExceptions: true
  };

  if (blobData) {
    options.contentType = contentType || 'image/png';
    options.payload = blobData.getBytes ? blobData.getBytes() : blobData;
  } else if (payload) {
    options.contentType = 'application/json; charset=UTF-8';
    options.payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();

    if (statusCode >= 200 && statusCode < 300) {
      return {
        success: true,
        statusCode: statusCode,
        data: responseText ? JSON.parse(responseText) : {}
      };
    }

    var errMsg = 'LINE API Error (HTTP ' + statusCode + '): ' + responseText;
    Logger.log(errMsg);
    logLineAction_('API_ERROR', '', endpoint, 'HTTP ' + statusCode + ': ' + responseText);

    return {
      success: false,
      statusCode: statusCode,
      message: errMsg,
      raw: responseText
    };
  } catch (err) {
    Logger.log('callLineApi_ Exception: ' + err.toString());
    logLineAction_('API_EXCEPTION', '', endpoint, 'Exception: ' + err.toString());
    return {
      success: false,
      statusCode: 0,
      message: err.toString()
    };
  }
}

// ==========================================
// 8. LINE Rich Menu 6 格定義與建置 (Phase 2)
// ==========================================

/**
 * 產生 6 格小家電檢修 Rich Menu JSON 定義
 * 尺寸規格：2500 x 1686 px (LINE 官方標準大尺寸)
 * 網格配置：2 列 x 3 欄
 *   單格寬度: 833 px (最後一欄 834 px)
 *   單格高度: 843 px
 */
function getMainRichMenuObject_() {
  var config = getLineConfig_();
  var rawBaseUrl = config.webAppUrl || getPublicWebAppUrl_();
  var delim = rawBaseUrl.indexOf('?') !== -1 ? '&' : '?';

  var uriBooking = rawBaseUrl + delim + 'source=line';
  var uriLocations = rawBaseUrl + delim + 'source=line&view=locations';
  var uriStatus = rawBaseUrl + delim + 'source=line&view=status';
  var uriGuide = rawBaseUrl + delim + 'source=line&view=guide';
  var uriFaq = rawBaseUrl + delim + 'source=line&view=faq';
  var uriVolunteer = 'https://forms.gle/WzpEmCJXttoLPD7r7';

  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: true,
    name: '小家電檢修服務選單',
    chatBarText: '小家電檢修服務',
    areas: [
      // Area 1: 左上 - 🔧 我要預約 (URI)
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: {
          type: 'uri',
          label: '我要預約',
          uri: uriBooking
        }
      },
      // Area 2: 中上 - 📍 維修據點 (URI)
      {
        bounds: { x: 833, y: 0, width: 833, height: 843 },
        action: {
          type: 'uri',
          label: '維修據點',
          uri: uriLocations
        }
      },
      // Area 3: 右上 - 📋 查詢進度 (URI)
      {
        bounds: { x: 1666, y: 0, width: 834, height: 843 },
        action: {
          type: 'uri',
          label: '查詢進度',
          uri: uriStatus
        }
      },
      // Area 4: 左下 - 📖 服務須知 (URI)
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: {
          type: 'uri',
          label: '服務須知',
          uri: uriGuide
        }
      },
      // Area 5: 中下 - ❓ 常見問題 (URI)
      {
        bounds: { x: 833, y: 843, width: 833, height: 843 },
        action: {
          type: 'uri',
          label: '常見問題',
          uri: uriFaq
        }
      },
      // Area 6: 右下 - 🤝 志工招募 (URI - Google Forms)
      {
        bounds: { x: 1666, y: 843, width: 834, height: 843 },
        action: {
          type: 'uri',
          label: '志工招募',
          uri: uriVolunteer
        }
      }
    ]
  };
}

/**
 * 建立主圖文選單 (Create Rich Menu)
 */
function createMainRichMenu_() {
  var config = getLineConfig_();
  var menuObj = getMainRichMenuObject_();
  var url = 'https://api.line.me/v2/bot/richmenu';

  var res = callLineApi_(url, 'post', menuObj);
  if (res.success && res.data.richMenuId) {
    return res.data.richMenuId;
  }
  throw new Error('建立 Rich Menu 失敗: ' + (res.message || res.raw));
}

/**
 * 取得目前所有使用者的預設 Rich Menu ID
 */
function getDefaultRichMenuId_() {
  var url = 'https://api.line.me/v2/bot/user/all/richmenu';
  var res = callLineApi_(url, 'get');
  if (res.success && res.data && res.data.richMenuId) {
    return res.data.richMenuId;
  }
  return '';
}

/**
 * 取得指定 Rich Menu 之詳細資料
 */
function getRichMenuById_(richMenuId) {
  if (!richMenuId) return null;
  var url = 'https://api.line.me/v2/bot/richmenu/' + richMenuId;
  var res = callLineApi_(url, 'get');
  if (res.success && res.data) {
    return res.data;
  }
  return null;
}

/**
 * 取得並驗證 Google Drive 圖片檔案與 Blob
 * 嚴格檢查 MIME Type (PNG/JPEG) 與檔案大小 (<= 1MB)
 */
function getValidatedImageBlob_(imageFileId) {
  if (!imageFileId) {
    throw new Error('缺少 imageFileId (Google Drive 檔案 ID)');
  }

  // 智慧防呆：若輸入包含完整 Google Drive 網址，自動擷取純 ID
  var cleanId = String(imageFileId).trim();
  var driveMatch = cleanId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    cleanId = driveMatch[1];
  } else {
    var idMatch = cleanId.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      cleanId = idMatch[1];
    }
  }

  var file;
  try {
    file = DriveApp.getFileById(cleanId);
  } catch (e) {
    throw new Error('無法從 Google Drive 讀取圖片，請確認 File ID 是否正確且具備存取權限: ' + e.toString());
  }

  var blob = file.getBlob();
  var contentType = (blob.getContentType() || '').toLowerCase();
  var sizeInBytes = blob.getBytes().length;
  var sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

  // 1. 檢查 MIME Type
  if (contentType !== 'image/png' && contentType !== 'image/jpeg') {
    throw new Error('❌ 圖片格式不符: 目前為 ' + contentType + '，LINE Rich Menu 僅支援 image/png 或 image/jpeg。');
  }

  // 2. 檢查檔案大小 (LINE 上限 1 MB = 1048576 bytes)
  if (sizeInBytes > 1048576) {
    // 智慧降轉處理：若原圖超過 1MB，嘗試由 Google Drive API 獲取 2500px 最佳化 JPEG 影像串流
    try {
      var thumbUrl = 'https://drive.google.com/thumbnail?id=' + cleanId + '&sz=w2500';
      var thumbRes = UrlFetchApp.fetch(thumbUrl, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (thumbRes.getResponseCode() === 200) {
        var optBlob = thumbRes.getBlob().getAs('image/jpeg');
        var optSize = optBlob.getBytes().length;
        if (optSize > 0 && optSize <= 1048576) {
          Logger.log('✅ 已成功將圖檔自動最佳化至符合 LINE 規範之大小: ' + (optSize / 1024).toFixed(1) + ' KB');
          return { blob: optBlob, contentType: 'image/jpeg', sizeInMB: (optSize / (1024 * 1024)).toFixed(2) };
        }
      }
    } catch(optErr) {
      Logger.log('Auto-optimize image failed: ' + optErr.toString());
    }

    throw new Error('❌ 圖片檔案過大: 目前為 ' + sizeInMB + ' MB，LINE 規定圖檔大小上限為 1 MB (1,048,576 Bytes)。');
  }

  return { blob: blob, contentType: contentType, sizeInMB: sizeInMB };
}

/**
 * 上傳 Rich Menu 圖片 (Upload Image)
 * 使用專屬的 https://api-data.line.me 端點
 */
function uploadRichMenuImage_(richMenuId, imageFileId) {
  if (!richMenuId) throw new Error('缺少 richMenuId');
  var validated = getValidatedImageBlob_(imageFileId);
  var url = 'https://api-data.line.me/v2/bot/richmenu/' + richMenuId + '/content';

  var res = callLineApi_(url, 'post', null, validated.blob, validated.contentType);
  if (res.success) {
    return true;
  }
  throw new Error('上傳 Rich Menu 圖片失敗: ' + (res.message || res.raw));
}

/**
 * 設定預設 Rich Menu (Set Default Rich Menu)
 */
function setDefaultRichMenu_(richMenuId) {
  if (!richMenuId) throw new Error('缺少 richMenuId');
  var url = 'https://api.line.me/v2/bot/user/all/richmenu/' + richMenuId;
  var res = callLineApi_(url, 'post');
  if (res.success) {
    return true;
  }
  throw new Error('設定預設 Rich Menu 失敗: ' + (res.message || res.raw));
}

/**
 * 取消預設 Rich Menu (Unlink Default Rich Menu)
 */
function unlinkDefaultRichMenu_() {
  var url = 'https://api.line.me/v2/bot/user/all/richmenu';
  var res = callLineApi_(url, 'delete');
  if (res.success) {
    return true;
  }
  throw new Error('取消預設 Rich Menu 失敗: ' + (res.message || res.raw));
}

/**
 * 取得目前帳號的所有 Rich Menu 清單
 */
function getRichMenuList_() {
  var url = 'https://api.line.me/v2/bot/richmenu/list';
  var res = callLineApi_(url, 'get');
  if (res.success && res.data.richmenus) {
    return res.data.richmenus;
  }
  throw new Error('取得 Rich Menu 列表失敗: ' + (res.message || res.raw));
}

/**
 * 刪除指定 ID 之 Rich Menu
 */
function deleteRichMenuById_(richMenuId) {
  if (!richMenuId) throw new Error('缺少 richMenuId');
  var url = 'https://api.line.me/v2/bot/richmenu/' + richMenuId;
  var res = callLineApi_(url, 'delete');
  if (res.success) {
    return true;
  }
  throw new Error('刪除 Rich Menu 失敗: ' + (res.message || res.raw));
}

// ==========================================
// 9. 一鍵建置、安全 Rollback 與管理維護入口 (手動執行用)
// ==========================================

/**
 * 執行前檢查 (Preflight Check)
 * 包含 Script Properties 齊全度與 Drive 圖片合法性檢驗
 */
function checkLineRichMenuSetup_() {
  var config = getLineConfig_();
  var missing = [];

  if (!config.channelAccessToken) missing.push('LINE_CHANNEL_ACCESS_TOKEN');
  if (!config.richMenuImageFileId) missing.push('LINE_RICH_MENU_IMAGE_FILE_ID');
  if (!config.webAppUrl) missing.push('LINE_WEBAPP_URL');

  if (missing.length > 0) {
    return {
      ready: false,
      message: '❌ 設定尚未齊全，缺少以下 Script Properties: ' + missing.join(', ')
    };
  }

  // 驗證圖片格式與大小
  try {
    var imgCheck = getValidatedImageBlob_(config.richMenuImageFileId);
    Logger.log('📷 圖片檢查通過: ' + imgCheck.contentType + ' (' + imgCheck.sizeInMB + ' MB)');
  } catch (err) {
    return {
      ready: false,
      message: err.message
    };
  }

  return { ready: true, config: config };
}

/**
 * 手動備份目前使用中的 Default Rich Menu ID
 * 供管理者在需要變更 Rollback 基準時人工呼叫
 */
function backupCurrentDefaultRichMenu() {
  try {
    var defaultId = getDefaultRichMenuId_();
    if (!defaultId) {
      var msg1 = 'ℹ️ 目前官方帳號沒有任何生效中的 Default Rich Menu，無法進行備份。';
      Logger.log(msg1);
      return msg1;
    }
    PropertiesService.getScriptProperties().setProperty('LINE_PREVIOUS_RICH_MENU_ID', defaultId);
    var okMsg = '✅ 成功將目前生效中的選單 (' + defaultId + ') 備份至 LINE_PREVIOUS_RICH_MENU_ID！';
    Logger.log(okMsg);
    logLineAction_('RICH_MENU_BACKUP', '', 'backupCurrentDefaultRichMenu', 'Backup ID: ' + defaultId);
    return okMsg;
  } catch (e) {
    var errMsg = '❌ 手動備份失敗: ' + e.message;
    Logger.log(errMsg);
    return errMsg;
  }
}

/**
 * 【主要建置工具】一鍵建立、上傳並啟用 6 格主圖文選單
 * 具備保護舊選單不被覆蓋、分階段防護與失敗安全 Cleanup 機制
 */
function setupMainRichMenu() {
  var check = checkLineRichMenuSetup_();
  if (!check.ready) {
    Logger.log(check.message);
    return check.message;
  }

  var config = check.config;
  Logger.log('🚀 開始建置小家電檢修 Rich Menu (含安全防護與舊選單保護)...');

  var createdRichMenuId = '';
  var defaultActivated = false;

  try {
    // 0. 安全備份舊 Default 選單（僅在尚未備份且與新選單不同時記錄一次，不重複覆蓋）
    var currentDefaultId = getDefaultRichMenuId_();
    var existingPrevId = PropertiesService.getScriptProperties().getProperty('LINE_PREVIOUS_RICH_MENU_ID');

    if (currentDefaultId && !existingPrevId) {
      PropertiesService.getScriptProperties().setProperty('LINE_PREVIOUS_RICH_MENU_ID', currentDefaultId);
      Logger.log('📦 首次自動備份目前使用中的舊選單 ID: ' + currentDefaultId);
    } else if (existingPrevId) {
      Logger.log('📦 已保留既有備份選單 ID (不覆蓋): ' + existingPrevId);
    }

    // Stage 1: 建立 Rich Menu 架構
    createdRichMenuId = createMainRichMenu_();
    Logger.log('✅ 1/3 Rich Menu 架構建立成功，ID: ' + createdRichMenuId);

    // Stage 2: 上傳 Google Drive 圖片至 https://api-data.line.me
    uploadRichMenuImage_(createdRichMenuId, config.richMenuImageFileId);
    Logger.log('✅ 2/3 Rich Menu 圖片上傳成功！');

    // Stage 3: 設定為全體好友預設選單
    setDefaultRichMenu_(createdRichMenuId);
    defaultActivated = true; // 標記已成功上線，後續發生非核心例外絕不刪除此選單
    Logger.log('✅ 3/3 成功啟用為預設選單！');

    // Stage 4: 記錄新 ID 至 Script Properties 與日誌
    PropertiesService.getScriptProperties().setProperty('LINE_MAIN_RICH_MENU_ID', createdRichMenuId);

    var successMsg = '🎉 小家電檢修 Rich Menu 設定完成！\n新選單 ID: ' + createdRichMenuId +
      (existingPrevId || currentDefaultId ? '\n(舊選單 ID 已安全保護為: ' + (existingPrevId || currentDefaultId) + ')' : '') +
      '\n已自動套用為全體預設選單。';
    Logger.log(successMsg);
    logLineAction_('RICH_MENU_SETUP', '', 'setupMainRichMenu', 'Success ID: ' + createdRichMenuId);
    return successMsg;
  } catch (err) {
    var failMsg = '❌ 建置過程失敗: ' + err.message;
    Logger.log(failMsg);

    // 安全 Cleanup 規則：只有在「尚未設定為 Default 之前 (Stage 1~2)」發生錯誤才清理半成品
    // 若 setDefaultRichMenu_ 已經成功 (defaultActivated = true)，嚴禁刪除正在線上的選單
    if (createdRichMenuId && !defaultActivated) {
      try {
        Logger.log('🧹 啟動安全 Cleanup：正在清理本次未完成的 Rich Menu (' + createdRichMenuId + ')...');
        deleteRichMenuById_(createdRichMenuId);
        Logger.log('✅ 已成功清理半成品 Rich Menu。');
      } catch (cleanErr) {
        Logger.log('⚠️ Cleanup 失敗 (可手動清理): ' + cleanErr.message);
      }
    } else if (defaultActivated) {
      Logger.log('⚠️ Rich Menu 已成功上線為 Default，但後續紀錄作業發生異常，已保留該選單不執行刪除。');
    }

    logLineAction_('ERROR', '', 'setupMainRichMenu', err.message);
    return failMsg;
  }
}

/**
 * 【分段測試工具 1】僅建立結構與上傳圖片，暫不切換預設選單
 * 讓管理者可先確認圖片與 API 上傳是否完全成功
 */
function setupMainRichMenuWithoutSwitch() {
  var check = checkLineRichMenuSetup_();
  if (!check.ready) {
    Logger.log(check.message);
    return check.message;
  }

  var config = check.config;
  Logger.log('🧪 開始建立 Rich Menu (僅建置與上傳圖檔，暫不切換預設選單)...');

  var createdRichMenuId = '';
  try {
    createdRichMenuId = createMainRichMenu_();
    Logger.log('✅ 1/2 Rich Menu 架構建立成功，ID: ' + createdRichMenuId);

    uploadRichMenuImage_(createdRichMenuId, config.richMenuImageFileId);
    Logger.log('✅ 2/2 Rich Menu 圖片上傳成功！');

    PropertiesService.getScriptProperties().setProperty('LINE_MAIN_RICH_MENU_ID', createdRichMenuId);

    var msg = '✅ Rich Menu 建立與圖檔上傳皆已成功！\n待啟用 ID: ' + createdRichMenuId +
      '\n目前尚未套用為 Default。確認無誤後，請執行 activateMainRichMenu 正式啟用。';
    Logger.log(msg);
    return msg;
  } catch (err) {
    if (createdRichMenuId) {
      try { deleteRichMenuById_(createdRichMenuId); } catch(e){}
    }
    var failMsg = '❌ 分段建置失敗: ' + err.message;
    Logger.log(failMsg);
    return failMsg;
  }
}

/**
 * 【分段測試工具 2】將已建置完成的 LINE_MAIN_RICH_MENU_ID 正式設為 Default 選單
 */
function activateMainRichMenu() {
  var config = getLineConfig_();
  if (!config.mainRichMenuId) {
    var noIdMsg = '❌ 找不到 LINE_MAIN_RICH_MENU_ID，請先執行 setupMainRichMenuWithoutSwitch。';
    Logger.log(noIdMsg);
    return noIdMsg;
  }

  try {
    var currentDefaultId = getDefaultRichMenuId_();
    var existingPrevId = PropertiesService.getScriptProperties().getProperty('LINE_PREVIOUS_RICH_MENU_ID');

    // 僅在尚未有備份且當前 Default 不等於新主選單時記錄一次
    if (currentDefaultId && currentDefaultId !== config.mainRichMenuId && !existingPrevId) {
      PropertiesService.getScriptProperties().setProperty('LINE_PREVIOUS_RICH_MENU_ID', currentDefaultId);
      Logger.log('📦 首次自動備份目前使用中的舊選單 ID: ' + currentDefaultId);
    }

    setDefaultRichMenu_(config.mainRichMenuId);
    var okMsg = '🎉 成功啟用小家電檢修 Rich Menu 為全體預設選單！\n目前選單 ID: ' + config.mainRichMenuId;
    Logger.log(okMsg);
    logLineAction_('RICH_MENU_ACTIVATE', '', 'activateMainRichMenu', 'Active ID: ' + config.mainRichMenuId);
    return okMsg;
  } catch (e) {
    var errMsg = '❌ 啟用失敗: ' + e.message;
    Logger.log(errMsg);
    return errMsg;
  }
}

/**
 * 【一鍵復原工具】無參數直接手動 Rollback 切回原本備份的舊選單
 * 具備選單存在性驗證與不重複切換防呆
 */
function rollbackToPreviousRichMenu() {
  var prevId = PropertiesService.getScriptProperties().getProperty('LINE_PREVIOUS_RICH_MENU_ID');
  if (!prevId) {
    var noPrevMsg = '❌ 找不到先前備份的選單 ID (LINE_PREVIOUS_RICH_MENU_ID)。';
    Logger.log(noPrevMsg);
    return noPrevMsg;
  }

  try {
    // 1. 防呆檢查：若目前 Default 已經是備份選單，不重複切換
    var currentDefaultId = getDefaultRichMenuId_();
    if (currentDefaultId === prevId) {
      var alreadyMsg = 'ℹ️ 目前生效中的選單已經是備份選單 (' + prevId + ')，不需要重複切換。';
      Logger.log(alreadyMsg);
      return alreadyMsg;
    }

    // 2. 存在性驗證：呼叫 LINE API 確認該舊 Rich Menu 仍然存在於帳號中
    var prevMenuDetail = getRichMenuById_(prevId);
    if (!prevMenuDetail) {
      var notExistMsg = '❌ 原備份之 Rich Menu (' + prevId + ') 已在 LINE 帳號中不存在，無法自動 Rollback。\n請先執行 listAllRichMenus() 檢查帳號目前的選單。';
      Logger.log(notExistMsg);
      return notExistMsg;
    }

    Logger.log('🔄 正在切換回先前備份的選單: ' + prevId + ' (' + (prevMenuDetail.name || '無名稱') + ')...');
    setDefaultRichMenu_(prevId);
    PropertiesService.getScriptProperties().setProperty('LINE_MAIN_RICH_MENU_ID', prevId);
    
    var successMsg = '✅ 已成功安全 Rollback 切換回原選單: ' + prevId + ' (' + (prevMenuDetail.name || '') + ')';
    Logger.log(successMsg);
    logLineAction_('RICH_MENU_ROLLBACK', '', 'rollbackToPreviousRichMenu', 'Rollback to ID: ' + prevId);
    return successMsg;
  } catch (err) {
    var failMsg = '❌ Rollback 失敗: ' + err.message;
    Logger.log(failMsg);
    return failMsg;
  }
}

/**
 * 【狀態檢測工具】全面檢查 Rich Menu 建置與部署狀態
 * 於正式切換前執行，確保各項指標皆安全
 */
function checkRichMenuDeploymentStatus() {
  try {
    var config = getLineConfig_();
    var defaultId = getDefaultRichMenuId_();
    var defaultMenu = defaultId ? getRichMenuById_(defaultId) : null;

    var mainId = config.mainRichMenuId;
    var mainMenu = mainId ? getRichMenuById_(mainId) : null;

    var prevId = config.previousRichMenuId;
    var prevMenu = prevId ? getRichMenuById_(prevId) : null;

    Logger.log('====================================================');
    Logger.log('📊 LINE Rich Menu 部署狀態全面檢測報告');
    Logger.log('====================================================');

    // 1. 目前 Default 狀態
    Logger.log('【目前 Default 生效選單】:');
    if (defaultId) {
      Logger.log('   ID: ' + defaultId);
      Logger.log('   名稱: ' + (defaultMenu ? defaultMenu.name : '無法取得詳細資訊'));
      Logger.log('   聊天列文字: ' + (defaultMenu ? defaultMenu.chatBarText : ''));
    } else {
      Logger.log('   目前無生效之 Default 選單 (無選單狀態)');
    }

    // 2. 小家電 Main 選單狀態
    Logger.log('\n【小家電 Main 選單 (LINE_MAIN_RICH_MENU_ID)】:');
    if (mainId) {
      Logger.log('   ID: ' + mainId);
      Logger.log('   名稱: ' + (mainMenu ? mainMenu.name : '⚠️ ID 存在但 LINE API 查無此選單'));
      Logger.log('   狀態: ' + (mainId === defaultId ? '🟢 目前正作為 Default 生效中' : '⚪ 尚未啟用為 Default'));
    } else {
      Logger.log('   尚未建立小家電 Main 選單');
    }

    // 3. Rollback 備份選單狀態
    Logger.log('\n【Rollback 備份選單 (LINE_PREVIOUS_RICH_MENU_ID)】:');
    if (prevId) {
      Logger.log('   ID: ' + prevId);
      Logger.log('   名稱: ' + (prevMenu ? prevMenu.name : '⚠️ 備份 ID 存在但在 LINE 中已被刪除'));
      Logger.log('   可用性: ' + (prevMenu ? '✅ 可安全 Rollback' : '❌ 無法 Rollback (選單已不存在)'));
    } else {
      Logger.log('   目前尚未記錄備份選單 ID (首次切換時將自動記錄)');
    }

    // 4. 圖檔設定
    Logger.log('\n【Rich Menu 圖檔設定】:');
    if (config.richMenuImageFileId) {
      try {
        var imgCheck = getValidatedImageBlob_(config.richMenuImageFileId);
        Logger.log('   ✅ 圖片合法: ' + imgCheck.contentType + ' (' + imgCheck.sizeInMB + ' MB)');
      } catch (imgErr) {
        Logger.log('   ❌ 圖檔檢查未通過: ' + imgErr.message);
      }
    } else {
      Logger.log('   ❌ 尚未設定 LINE_RICH_MENU_IMAGE_FILE_ID');
    }

    // 5. 總結評估
    Logger.log('\n【切換安全評估結論】:');
    var isReadyToDeploy = config.channelAccessToken && config.webAppUrl && config.richMenuImageFileId;
    if (isReadyToDeploy) {
      Logger.log('   🟢 系統環境良好，可以安全執行 setupMainRichMenu 或 activateMainRichMenu');
    } else {
      Logger.log('   🔴 尚有必要設定未齊全，請檢查上述項目');
    }
    Logger.log('====================================================');

    return {
      defaultId: defaultId,
      mainId: mainId,
      prevId: prevId,
      isReady: !!isReadyToDeploy
    };
  } catch (e) {
    Logger.log('❌ 檢測失敗: ' + e.message);
    return null;
  }
}

/**
 * 【查詢工具】查看目前正在生效的 Default Rich Menu 詳細資訊
 */
function getCurrentDefaultRichMenu() {
  try {
    var defaultId = getDefaultRichMenuId_();
    if (!defaultId) {
      var noneMsg = 'ℹ️ 目前 LINE 官方帳號尚未設定任何預設 Rich Menu (Default Rich Menu)。';
      Logger.log(noneMsg);
      return noneMsg;
    }

    var menuDetail = getRichMenuById_(defaultId);
    Logger.log('🌟 目前正在生效的預設 Rich Menu:');
    Logger.log('----------------------------------------------------');
    Logger.log('   ID: ' + defaultId);
    if (menuDetail) {
      Logger.log('   名稱: ' + menuDetail.name);
      Logger.log('   聊天列文字: ' + menuDetail.chatBarText);
      Logger.log('   尺寸: ' + menuDetail.size.width + 'x' + menuDetail.size.height + ' | 預設展開: ' + menuDetail.selected);
      Logger.log('   區塊格數: ' + (menuDetail.areas ? menuDetail.areas.length : 0) + ' 格');
    }
    Logger.log('----------------------------------------------------');
    return menuDetail || { richMenuId: defaultId };
  } catch (e) {
    var err = '❌ 查詢預設選單失敗: ' + e.message;
    Logger.log(err);
    return err;
  }
}

/**
 * 【查詢工具】列出目前官方帳號內所有 Rich Menu（供人工檢查所有歷史選單）
 */
function listAllRichMenus() {
  try {
    var list = getRichMenuList_();
    var currentMainId = PropertiesService.getScriptProperties().getProperty('LINE_MAIN_RICH_MENU_ID') || '';
    var defaultId = getDefaultRichMenuId_();

    Logger.log('📋 目前 LINE 帳號共有 ' + list.length + ' 個 Rich Menu:');
    Logger.log('----------------------------------------------------');
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var isDefault = (item.richMenuId === defaultId) ? ' 🌟 [目前生效的 Default 選單]' : '';
      var isSavedMain = (item.richMenuId === currentMainId && item.richMenuId !== defaultId) ? ' 📌 [系統記錄之新主選單]' : '';
      Logger.log((i + 1) + '. 名稱: ' + item.name + isDefault + isSavedMain);
      Logger.log('   ID: ' + item.richMenuId);
      Logger.log('   聊天列文字: ' + item.chatBarText);
      Logger.log('   尺寸: ' + item.size.width + 'x' + item.size.height + ' | 預設展開: ' + item.selected);
      Logger.log('----------------------------------------------------');
    }
    return list;
  } catch (e) {
    Logger.log('❌ 查詢失敗: ' + e.message);
    return [];
  }
}

/**
 * 【切換工具】手動將指定 Rich Menu ID 設為預設選單
 */
function switchDefaultRichMenu(richMenuId) {
  if (!richMenuId) {
    Logger.log('請傳入欲設定的 richMenuId');
    return;
  }
  try {
    setDefaultRichMenu_(richMenuId);
    PropertiesService.getScriptProperties().setProperty('LINE_MAIN_RICH_MENU_ID', richMenuId);
    var msg = '✅ 已成功切換預設選單為: ' + richMenuId;
    Logger.log(msg);
    return msg;
  } catch (e) {
    var errMsg = '❌ 切換失敗: ' + e.message;
    Logger.log(errMsg);
    return errMsg;
  }
}

/**
 * 【一次性權限授權工具】觸發 Google Drive 與外部網路請求之授權對話框
 * 不使用 try-catch，讓 Apps Script 直接彈出完整授權視窗
 */
function authorizeScopes() {
  Logger.log('🚀 開始觸發 Google 授權審查流程...');
  
  // 1. 強制觸發 Drive 讀取權限
  var root = DriveApp.getRootFolder();
  Logger.log('✅ Google Drive 權限已獲取: ' + root.getName());

  // 2. 強制觸發 外部網路連線權限
  var res = UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
  Logger.log('✅ 外部網路請求權限已獲取 (狀態碼: ' + res.getResponseCode() + ')');

  var successMsg = '🎉 所有必要權限 (Google Drive + UrlFetchApp) 皆已成功授權！';
  Logger.log(successMsg);
  return successMsg;
}


/**
 * 直接回傳診斷結果 JSON 字串，供 clasp run 取得
 */
function getDiagnosticResult() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('LINE_DIAGNOSTIC_RESULT') || '';
}

/**
 * 診斷 LINE Rich Menu 狀態，將結果寫入 Script Property LINE_DIAGNOSTIC_RESULT
 */
function diagnoseLineRichMenuState() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) {
    Logger.log('缺少 LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  var result = {};

  // 1. 取得所有 Rich Menu 列表
  try {
    var listRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu/list', {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token }
    });
    result.richMenuList = JSON.parse(listRes.getContentText());
  } catch (e) {
    result.richMenuListError = e.toString();
  }

  // 2. 取得目前 Default Rich Menu ID
  try {
    var defaultRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/user/all/richmenu', {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token }
    });
    var defaultObj = JSON.parse(defaultRes.getContentText());
    result.currentDefault = { richMenuId: defaultObj.richMenuId || null };
  } catch (e) {
    result.currentDefaultError = e.toString();
  }

  // 3. 若有 Default ID，取得其詳細資訊
  if (result.currentDefault && result.currentDefault.richMenuId) {
    try {
      var menuRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu/' + result.currentDefault.richMenuId, {
        method: 'get',
        headers: { Authorization: 'Bearer ' + token }
      });
      result.currentDefault.menu = JSON.parse(menuRes.getContentText());
    } catch (e) {
      result.currentDefaultMenuError = e.toString();
    }
  }

  // 4. 讀取 Script Properties 中的 Main / Previous ID
  result.mainId = props.getProperty('LINE_MAIN_RICH_MENU_ID') || null;
  result.previousId = props.getProperty('LINE_PREVIOUS_RICH_MENU_ID') || null;

  // 5. 檢查 Main / Previous Rich Menu 是否真的存在
  function verifyId(id) {
    if (!id) return { exists: false, status: 'MISSING' };
    try {
      var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu/' + id, {
        method: 'get',
        muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + token }
      });
      return { exists: res.getResponseCode() === 200, status: res.getResponseCode() };
    } catch (e) {
      return { exists: false, error: e.toString() };
    }
  }
  result.mainCheck = verifyId(result.mainId);
  result.previousCheck = verifyId(result.previousId);

  // 6. 圖片上傳檢查（針對 Main Rich Menu）
  if (result.mainId) {
    try {
      var imgRes = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + result.mainId + '/content', {
        method: 'get',
        muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + token }
      });
      result.image = {
        status: imgRes.getResponseCode(),
        mime: imgRes.getHeaders()['Content-Type'] || null
      };
    } catch (e) {
      result.image = { error: e.toString() };
    }
  }

  // 7. 寫入結果至 Script Property
  props.setProperty('LINE_DIAGNOSTIC_RESULT', JSON.stringify(result));
  Logger.log('diagnoseLineRichMenuState completed');
}

/**
 * 讀取先前寫入的診斷結果，回傳 JSON 字串（會寫入 Logger）
 */
function readDiagnosticResult() {
  var props = PropertiesService.getScriptProperties();
  var val = props.getProperty('LINE_DIAGNOSTIC_RESULT') || '';
  Logger.log('DiagnosticResult:' + val);
  return val;
}

// ==========================================
// 10. 安全一次性 Time Trigger 自動化部署模組 (Phase 3)
// ==========================================

/**
 * 建立一次性 Time Trigger，排定於 5 秒後由 GAS Runtime 自主執行 Rich Menu 部署流程
 * 具備鎖定防護、防重複排程與狀態追蹤
 */
function scheduleOneTimeRichMenuDeployment() {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return '❌ 系統正忙碌中（其他程序正在執行），請稍候再試。';
  }

  var props = PropertiesService.getScriptProperties();
  try {
    // 1. 檢查是否已有 RUNNING 或 PENDING 任務
    var currentStatusStr = props.getProperty('LINE_DEPLOYMENT_STATUS');
    if (currentStatusStr) {
      try {
        var currentStatus = JSON.parse(currentStatusStr);
        if (currentStatus.status === 'RUNNING' || currentStatus.status === 'PENDING') {
          var now = new Date().getTime();
          // 若超過 5 分鐘仍未完成視為超時可重置，否則不重複排程
          if (now - (currentStatus.timestamp || 0) < 300000) {
            return 'ℹ️ 已有部署任務正在執行或排隊中 (' + currentStatus.status + ')，不重複排程。';
          }
        }
      } catch (parseErr) {}
    }

    // 2. 清理先前任何殘留的 executeScheduledRichMenuDeployment_ Triggers
    cleanupScheduledTriggers_();

    // 3. 設定狀態為 PENDING
    var statusData = {
      status: 'PENDING',
      timestamp: new Date().getTime(),
      timeStr: new Date().toISOString(),
      step: 'TRIGGER_CREATED',
      details: '一次性 Time Trigger 已建立，等待 GAS Runtime 觸發'
    };
    props.setProperty('LINE_DEPLOYMENT_STATUS', JSON.stringify(statusData));

    // 4. 建立 10 秒後執行之 Time-driven Trigger
    ScriptApp.newTrigger('executeScheduledRichMenuDeployment_')
      .timeBased()
      .after(5000)
      .create();

    Logger.log('✅ 已成功建立一次性 Time Trigger (5 秒後由 GAS 伺服器自主執行)');
    return '✅ 已成功建立一次性排程 Trigger，GAS Runtime 即將於背景執行 Rich Menu 部署。';
  } catch (err) {
    Logger.log('❌ 建立 Trigger 失敗: ' + err.toString());
    var failData = {
      status: 'FAILED',
      timestamp: new Date().getTime(),
      timeStr: new Date().toISOString(),
      step: 'SCHEDULE_FAILED',
      error: err.toString()
    };
    props.setProperty('LINE_DEPLOYMENT_STATUS', JSON.stringify(failData));
    return '❌ 建立 Trigger 失敗: ' + err.toString();
  } finally {
    lock.releaseLock();
  }
}

/**
 * 由 GAS Runtime 背景觸發的核心自動化部署函式
 * 完整執行：Preflight → 建立 Rich Menu → 上傳圖檔 → 驗證 6 Areas/URI → 切換 Default → 驗證 Default → 安全清理 → 自動刪除 Trigger
 */
function executeScheduledRichMenuDeployment_() {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(30000);
  var props = PropertiesService.getScriptProperties();

  if (!hasLock) {
    Logger.log('⚠️ 未能取得 ScriptLock，可能有其他部署作業進行中。');
    return;
  }

  var createdMenuId = '';
  var defaultSwitched = false;
  var statusRecord = {
    status: 'RUNNING',
    timestamp: new Date().getTime(),
    timeStr: new Date().toISOString(),
    step: 'START',
    logs: []
  };

  function updateStatus(step, desc, extra) {
    statusRecord.step = step;
    statusRecord.details = desc;
    statusRecord.timestamp = new Date().getTime();
    statusRecord.timeStr = new Date().toISOString();
    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) statusRecord[k] = extra[k];
      }
    }
    statusRecord.logs.push('[' + new Date().toISOString() + '] ' + step + ': ' + desc);
    props.setProperty('LINE_DEPLOYMENT_STATUS', JSON.stringify(statusRecord));
  }

  try {
    updateStatus('INIT', '部署程序開始，執行 Preflight 檢查');

    // ── 1. Preflight 檢查 ──
    var config = getLineConfig_();
    if (!config.channelAccessToken) {
      throw new Error('缺少必要設定: LINE_CHANNEL_ACCESS_TOKEN');
    }
    if (!config.richMenuImageFileId) {
      throw new Error('缺少必要設定: LINE_RICH_MENU_IMAGE_FILE_ID');
    }

    var targetWebAppUrl = config.webAppUrl || getPublicWebAppUrl_();
    if (!targetWebAppUrl || targetWebAppUrl.indexOf('/exec') === -1) {
      throw new Error('Web App URL 不合法或非正式 /exec 連結: ' + targetWebAppUrl);
    }
    if (targetWebAppUrl.indexOf('/dev') !== -1) {
      throw new Error('Web App URL 包含測試用 /dev 連結，違反上線安全性規範');
    }

    // 驗證 Google Drive 圖檔規格
    var imgCheck = getValidatedImageBlob_(config.richMenuImageFileId);
    updateStatus('PREFLIGHT_OK', 'Preflight 檢查通過 (圖檔大小: ' + imgCheck.sizeInMB + ' MB, URL: ' + targetWebAppUrl + ')');

    // ── 2. 備份當前 Default 選單 (安全防護) ──
    var currentDefaultId = getDefaultRichMenuId_();
    var existingPrevId = props.getProperty('LINE_PREVIOUS_RICH_MENU_ID');
    if (currentDefaultId && !existingPrevId) {
      props.setProperty('LINE_PREVIOUS_RICH_MENU_ID', currentDefaultId);
      updateStatus('BACKUP_OLD_DEFAULT', '已安全備份原上線選單 ID: ' + currentDefaultId);
    }

    // ── 3. 建立 Rich Menu 結構 ──
    updateStatus('CREATE_STRUCTURE', '向 LINE API 建立 6 格 Rich Menu JSON 架構');
    createdMenuId = createMainRichMenu_();
    if (!createdMenuId) {
      throw new Error('createMainRichMenu_ 未能回傳有效 richMenuId');
    }
    updateStatus('STRUCTURE_CREATED', 'Rich Menu 架構已建立', { createdRichMenuId: createdMenuId });

    // ── 4. 上傳圖檔至 LINE API Data 端點 ──
    updateStatus('UPLOAD_IMAGE', '正在由 Google Drive 上傳圖檔至 https://api-data.line.me');
    uploadRichMenuImage_(createdMenuId, config.richMenuImageFileId);
    updateStatus('IMAGE_UPLOADED', '圖檔上傳完成');

    // ── 5. 驗證新 Rich Menu 的 6 個 Areas 與 URI 安全性 ──
    updateStatus('VERIFY_STRUCTURE', '驗證 LINE 伺服器端 Rich Menu 設定結構');
    var menuDetail = getRichMenuById_(createdMenuId);
    if (!menuDetail) {
      throw new Error('無法從 LINE API 查詢剛剛建立的 Rich Menu: ' + createdMenuId);
    }
    if (!menuDetail.areas || menuDetail.areas.length !== 6) {
      throw new Error('Rich Menu Areas 數量不正確，預期 6 格，實際取得 ' + (menuDetail.areas ? menuDetail.areas.length : 0));
    }

    // 檢查所有 URI Actions 不包含 /dev 且包含 /exec
    for (var a = 0; a < menuDetail.areas.length; a++) {
      var act = menuDetail.areas[a].action;
      if (act && act.type === 'uri') {
        if (!act.uri || (act.uri.indexOf('forms.gle') === -1 && act.uri.indexOf('/exec') === -1) || act.uri.indexOf('/dev') !== -1) {
          throw new Error('Area ' + (a + 1) + ' URI 格式不合法或包含 /dev 測試連結: ' + act.uri);
        }
      }
    }
    updateStatus('STRUCTURE_VERIFIED', '6 格 Areas 及正式 /exec URI 驗證全部通過');

    // ── 6. 正式啟用為 Default Rich Menu ──
    updateStatus('SWITCH_DEFAULT', '將新 Rich Menu (' + createdMenuId + ') 設為全體好友預設選單');
    setDefaultRichMenu_(createdMenuId);
    defaultSwitched = true;

    // ── 7. 再次驗證 Current Default 選單 ──
    Utilities.sleep(1000);
    var verifiedDefaultId = getDefaultRichMenuId_();
    if (verifiedDefaultId !== createdMenuId) {
      throw new Error('切換後驗證失敗：目前 Default ID (' + verifiedDefaultId + ') 與新建立 ID (' + createdMenuId + ') 不一致');
    }
    props.setProperty('LINE_MAIN_RICH_MENU_ID', createdMenuId);
    updateStatus('DEFAULT_VERIFIED', '確認新選單已在線上生效作為 Default Rich Menu');

    // ── 8. 安全清理舊的未綁定/半成品 Rich Menu (非必要，遇錯不阻斷) ──
    try {
      var allMenus = getRichMenuList_();
      var cleanCount = 0;
      for (var m = 0; m < allMenus.length; m++) {
        var itm = allMenus[m];
        // 僅刪除名稱為小家電服務選單、非當前 default 且非原備份的過期選單
        if (itm.richMenuId !== createdMenuId && itm.richMenuId !== existingPrevId && itm.richMenuId !== currentDefaultId) {
          if (itm.name && itm.name.indexOf('小家電') !== -1) {
            deleteRichMenuById_(itm.richMenuId);
            cleanCount++;
          }
        }
      }
      if (cleanCount > 0) {
        updateStatus('CLEANUP_OLD', '已清理 ' + cleanCount + ' 個歷史過期選單');
      }
    } catch (cleanErr) {
      Logger.log('Cleanup non-fatal error: ' + cleanErr.toString());
    }

    // ── 9. 部署成功總結 ──
    statusRecord.status = 'SUCCESS';
    statusRecord.step = 'COMPLETED';
    statusRecord.details = '🎉 小家電檢修 Rich Menu 完整部署與驗證全部成功！';
    statusRecord.activeRichMenuId = createdMenuId;
    statusRecord.timestamp = new Date().getTime();
    statusRecord.timeStr = new Date().toISOString();
    props.setProperty('LINE_DEPLOYMENT_STATUS', JSON.stringify(statusRecord));
    logLineAction_('RICH_MENU_DEPLOY_AUTO', '', 'executeScheduledRichMenuDeployment_', 'SUCCESS: ' + createdMenuId);

  } catch (err) {
    Logger.log('❌ 部署程序失敗: ' + err.toString());
    statusRecord.status = 'FAILED';
    statusRecord.step = 'ERROR';
    statusRecord.error = err.toString();
    statusRecord.timestamp = new Date().getTime();
    statusRecord.timeStr = new Date().toISOString();
    props.setProperty('LINE_DEPLOYMENT_STATUS', JSON.stringify(statusRecord));
    logLineAction_('ERROR', '', 'executeScheduledRichMenuDeployment_', err.toString());

    // 安全 Cleanup：若尚未切換為 Default，清理本次未完成的 Rich Menu
    if (createdMenuId && !defaultSwitched) {
      try {
        deleteRichMenuById_(createdMenuId);
        Logger.log('🧹 已清理本次失敗的半成品 Rich Menu: ' + createdMenuId);
      } catch (e) {}
    }
  } finally {
    // ── 10. 無論成功或失敗，必定刪除自身 Trigger，不留任何永久排程 ──
    try {
      cleanupScheduledTriggers_();
      Logger.log('🧹 一次性 Time Trigger 已安全刪除，無殘留排程。');
    } catch (trigErr) {
      Logger.log('⚠️ 刪除 Trigger 異常: ' + trigErr.toString());
    }
    lock.releaseLock();
  }
}

/**
 * 安全刪除所有執行 executeScheduledRichMenuDeployment_ 的 Triggers
 */
function cleanupScheduledTriggers_() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'executeScheduledRichMenuDeployment_') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  } catch (e) {
    Logger.log('cleanupScheduledTriggers_ warning: ' + e.toString());
  }
}

/**
 * 取得當前部署狀態記錄（供外部安全輪詢，無機密資訊）
 */
function getRichMenuDeploymentStatus() {
  var props = PropertiesService.getScriptProperties();
  var statusStr = props.getProperty('LINE_DEPLOYMENT_STATUS') || '';
  Logger.log('DeploymentStatus: ' + statusStr);
  return statusStr;
}

/**
 * 取得專案中目前所有 Triggers 數量與清單（供驗證無殘留）
 */
function getProjectTriggersCount() {
  var triggers = ScriptApp.getProjectTriggers();
  var list = [];
  for (var i = 0; i < triggers.length; i++) {
    list.push({
      handler: triggers[i].getHandlerFunction(),
      source: triggers[i].getEventType().toString()
    });
  }
  return JSON.stringify({ count: triggers.length, triggers: list });
}



// ==========================================


// ==========================================
// 11. 自主部署支援函式 (由本地 clasp/GAS 直接呼叫或一次性觸發)
// ==========================================
function runRichMenuDeploymentNow() {
  executeScheduledRichMenuDeployment_();
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('LINE_DEPLOYMENT_STATUS') || '{}';
}

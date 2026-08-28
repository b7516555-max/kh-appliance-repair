const fs = require('fs');
let html = fs.readFileSync('Index.html', 'utf8');

const tvScript = `

// ==========================================
// ★ 叫號電視牆看板 (TV Board) 核心函式
// ==========================================
function tvBoardManualOverride() {
    var h = (window.location.hash || '').toLowerCase();
    if (h.indexOf('tv-portrait') !== -1) return 'portrait';
    if (h.indexOf('tv-landscape') !== -1) return 'landscape';
    if (h.indexOf('tv') !== -1) return 'auto';
    return null;
}

function detectTvBoardLayoutMode() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w && h && (w / h) > 1.1) return 'landscape';
    return 'portrait';
}

function applyDisplayMode() {
    var tvSection = document.getElementById('tv-board-section');
    var homeSection = document.getElementById('home-section');
    if (!tvSection || !homeSection) return;

    var override = tvBoardManualOverride();

    if (override) {
        var layoutMode = (override === 'auto') ? detectTvBoardLayoutMode() : override;
        homeSection.classList.add('hidden');
        tvSection.classList.remove('hidden');
        tvSection.classList.toggle('tv-board-landscape', layoutMode === 'landscape');
        renderTvBoard();
    } else {
        tvSection.classList.add('hidden');
        if (homeSection.classList.contains('hidden')) {
            var sections = ['admin-section', 'admin-c-section', 'queue-section', 'step1-section', 'repair-result-section', 'pickup-sign-section', 'receipt-section', 'success-section', 'checkout-list-section', 'volunteer-section', 'already-registered-section', 'walkin-section', 'walkin-success-section', 'walkin-full-section', 'survey-section', 'blocked-section'];
            var hasOtherActive = sections.some(function(id) {
                var el = document.getElementById(id);
                return el && !el.classList.contains('hidden');
            });
            if (!hasOtherActive) homeSection.classList.remove('hidden');
        }
    }
}

var _tvBoardRefreshTimer = null;
function renderTvBoard() {
    var queueBox = document.getElementById('tv-board-queue');
    var infoBox = document.getElementById('tv-board-info');
    if (!queueBox || !infoBox) return;

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var now = new Date();
    var evts = (sys.getEvents() || []).filter(function(e) {
        if (e.mode === 'C') return false;
        if (e.isPermanent) return true;
        return new Date(e.date + 'T00:00:00') >= today;
    }).sort(function(a, b) {
        if (a.isPermanent && b.isPermanent) return 0;
        if (a.isPermanent) return 1;
        if (b.isPermanent) return -1;
        return (a.date || '').localeCompare(b.date || '');
    });

    var pad = function(v) { return v < 10 ? '0' + v : '' + v; };
    var todayStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var todayEvts = evts.filter(function(e) { return e.isPermanent || e.date === todayStr; });
    var rawActiveEvts = todayEvts.length ? todayEvts : evts.slice(0, 1);
    
    var activeEvts = [];
    var seenIds = {};
    rawActiveEvts.forEach(function(item) {
        var key = item.id + '_' + item.name;
        if (!seenIds[key]) {
            seenIds[key] = true;
            activeEvts.push(item);
        }
    });

    activeEvts = activeEvts.slice(0, 1);

    if (!activeEvts.length) {
        queueBox.innerHTML = '<div class="text-center py-6"><div class="text-2xl font-black opacity-70">目前尚無排定場次</div></div>';
        infoBox.innerHTML = '<div class="text-center opacity-70 py-6">請洽現場工作人員 或 稍後再查看看板</div>';
        return;
    }

    queueBox.innerHTML = activeEvts.map(function(e) {
        var qi = getEventQueueInfo(e.id);
        var recs = qi.recs.filter(function(r) { return r.checkedIn; });
        var waitingCount = recs.filter(function(r) { return r.status !== '已結案'; }).length;
        var lastClosed = 0;
        recs.forEach(function(r) {
            if (r.status === '已結案' && Number(r.checkinNumber) > lastClosed) lastClosed = Number(r.checkinNumber);
        });
        var nextNum = lastClosed + 1;
        return '<div class="mb-2 last:mb-0">' +
            '<div class="text-lg md:text-xl font-black opacity-90 mb-3">' + (e.name || '維修場次') + '</div>' +
            '<div class="flex items-end justify-between gap-4 flex-wrap">' +
                '<div>' +
                    '<div class="text-sm opacity-70 mb-1">目前叫號</div>' +
                    '<div class="font-black" style="font-size:clamp(64px,14vw,120px);line-height:1;">' + nextNum + '</div>' +
                '</div>' +
                '<div class="text-right">' +
                    '<div class="text-sm opacity-70 mb-1">等候中</div>' +
                    '<div class="font-black text-amber-300" style="font-size:clamp(36px,7vw,64px);line-height:1;">' + waitingCount + '<span class="text-lg font-bold opacity-80 text-white"> 件</span></div>' +
                '</div>' +
            '</div>' +
            '</div>';
    }).join('');

    var systemUrl = window.location.href.split('#')[0];
    var qrImgApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(systemUrl);

    infoBox.innerHTML = '<div class="flex flex-col items-center justify-center text-center h-full p-2">' +
        '<div class="text-xl md:text-2xl font-black mb-2 tracking-wide text-yellow-300">📱 掃描 QR Code 立即線上預約</div>' +
        '<p class="text-sm opacity-80 mb-4">歡迎民眾使用手機掃描下方二維碼，進入雲端系統預約登記維修案件</p>' +
        '<div class="bg-white p-4 rounded-2xl shadow-2xl inline-block border-4 border-yellow-400 mb-4 transform hover:scale-105 transition">' +
        '<img src="' + qrImgApiUrl + '" alt="線上預約系統 QR Code" class="w-48 h-48 md:w-56 md:h-56 object-contain rounded-lg mx-auto">' +
        '</div>' +
        '<a href="' + systemUrl + '" target="_blank" class="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black px-6 py-2.5 rounded-xl shadow-lg transition text-base">' +
        '🔗 點擊開啟預約系統網址' +
        '</a>' +
        '</div>';

    clearTimeout(_tvBoardRefreshTimer);
    _tvBoardRefreshTimer = setTimeout(function() {
        if (typeof syncData === 'function') {
            syncData(function() {
                var tvSec = document.getElementById('tv-board-section');
                if (tvSec && !tvSec.classList.contains('hidden')) renderTvBoard();
            });
        }
    }, 30000);
}

window.addEventListener('hashchange', applyDisplayMode);
var _tvBoardResizeTimer = null;
window.addEventListener('resize', function() {
    clearTimeout(_tvBoardResizeTimer);
    _tvBoardResizeTimer = setTimeout(function() {
        applyDisplayMode();
    }, 200);
});
`;

const scriptEnd = html.lastIndexOf('</script>');
html = html.substring(0, scriptEnd) + tvScript + '\n' + html.substring(scriptEnd);
fs.writeFileSync('Index.html', html, 'utf8');
console.log('✅ Added tv-board functions to Index.html');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTick(freq = 440) {
    if (audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = freq; 
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.stop(audioCtx.currentTime + 0.1);
}

const sessions = [
    { name: "СИДНЕЙ", open: 21, close: 6, class: "sydney", row: "row-1" },
    { name: "ЛОНДОН", open: 7, close: 16, class: "london", row: "row-1" },
    { name: "ТОКИО", open: 0, close: 9, class: "tokyo", row: "row-2" },
    { name: "НЬЮ-ЙОРК", open: 13, close: 22, class: "newyork", row: "row-2" }
];

function initTradingView() {
    new TradingView.widget({
        "autosize": true, // Это критически важно для мобилок
        "symbol": "BINANCE:BTCUSDT",
        "interval": "15",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "ru",
        "container_id": "tradingview_chart",
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "details": true,
        "hotlist": true,
        "calendar": true,
    });
}

function renderSessions() {
    const currentH = new Date().getUTCHours();
    document.getElementById('row-1').innerHTML = ''; 
    document.getElementById('row-2').innerHTML = '';
    const hourPct = 100 / 24;

    sessions.forEach(s => {
        const isActive = (s.open < s.close) ? (currentH >= s.open && currentH < s.close) : (currentH >= s.open || currentH < s.close);
        const createBar = (left, width) => {
            const bar = document.createElement('div');
            bar.className = `bar ${s.class} ${isActive ? 'active' : ''}`;
            bar.style.left = left + "%"; bar.style.width = width + "%";
            bar.innerText = s.name; return bar;
        };
        if (s.open < s.close) {
            document.getElementById(s.row).appendChild(createBar(s.open * hourPct, (s.close - s.open) * hourPct));
        } else {
            document.getElementById(s.row).appendChild(createBar(s.open * hourPct, (24 - s.open) * hourPct));
            document.getElementById(s.row).appendChild(createBar(0, s.close * hourPct));
        }
    });
}

function updateClockAndCursor() {
    const now = new Date();
    const h = now.getUTCHours(), m = now.getUTCMinutes(), s = now.getUTCSeconds();
    document.getElementById('utc-time').innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    document.getElementById('local-time').innerText = now.toLocaleTimeString();
    document.getElementById('cursor').style.left = (((h * 3600) + (m * 60) + s) / 86400) * 100 + "%";
}

async function fetchNews() {
    const newsEl = document.getElementById('rss-news');
    try {
        const rssUrl = encodeURIComponent('https://forklog.com/feed');
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
        const data = await response.json();
        if (data.status === 'ok') {
            newsEl.innerHTML = data.items.slice(0, 8).map(item => {
                const timeStr = new Date(item.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return `<div class="news-item" onclick="window.open('${item.link}')"><span class="news-date">${timeStr}</span>${item.title}</div>`;
            }).join('');
        }
    } catch (e) { newsEl.innerText = "Ошибка загрузки новостей"; }
}

let lastPrice = 0;
const btcSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
btcSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const price = parseFloat(data.c).toFixed(1);
    const el = document.getElementById('btc-price'), box = document.getElementById('btc-box');
    if (lastPrice > 0) {
        if (Math.abs(price - lastPrice) > (lastPrice * 0.001)) {
            playTick(price > lastPrice ? 880 : 440);
            box.classList.add('alert-active');
            setTimeout(() => box.classList.remove('alert-active'), 1000);
        }
        el.style.color = price > lastPrice ? '#00ff88' : '#f23645';
    }
    el.innerText = '$' + price;
    document.getElementById('vol-stat').innerText = `24h VOL: ${(parseFloat(data.q) / 1000000).toFixed(2)}M USDT`;
    lastPrice = price;
};

async function fetchStats() {
    try {
        const fg = await (await fetch('https://api.alternative.me/fng/')).json();
        if(fg.data && fg.data[0]) {
            const val = fg.data[0].value;
            const fgEl = document.getElementById('fg-value');
            fgEl.innerText = val;
            document.getElementById('fg-text').innerText = fg.data[0].value_classification;
            fgEl.style.color = val >= 75 ? 'var(--accent)' : (val <= 25 ? 'var(--danger)' : 'var(--text)');
        }
        document.getElementById('gas-value').innerText = Math.floor(Math.random() * (20 - 10) + 10) + " Gwei";
    } catch(e) { console.error(e); }
}

window.addEventListener('DOMContentLoaded', () => {
    const scale = document.getElementById('scale');
    for (let i = 0; i < 24; i++) {
        const mark = document.createElement('div');
        mark.className = 'hour-mark'; mark.innerText = String(i).padStart(2, '0');
        scale.appendChild(mark);
    }
    initTradingView(); updateClockAndCursor(); renderSessions(); fetchStats(); fetchNews();
    setInterval(updateClockAndCursor, 1000);
    setInterval(renderSessions, 60000);
    setInterval(fetchStats, 300000);
    setInterval(fetchNews, 900000);
});

document.body.onclick = () => { if(audioCtx.state === 'suspended') audioCtx.resume(); };

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log("SW Registered"));
}

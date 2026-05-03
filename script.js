let mobileChart, candleSeries, lastPrice = 0;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const sessions = [
    { name: "СИДНЕЙ", open: 21, close: 6, class: "sydney", row: "row-1" },
    { name: "ЛОНДОН", open: 7, close: 16, class: "london", row: "row-1" },
    { name: "ТОКИО", open: 0, close: 9, class: "tokyo", row: "row-2" },
    { name: "НЬЮ-ЙОРК", open: 13, close: 22, class: "newyork", row: "row-2" }
];

function toggleView() {
    const isMobile = document.body.classList.toggle('mobile-mode');
    localStorage.setItem('viewMode', isMobile ? 'mobile' : 'desktop');
    updateUI(isMobile);
}

function updateUI(isMobile) {
    document.getElementById('view-toggle').innerText = isMobile ? '💻 Режим ПК' : '📱 Режим Мобайл';
    if (isMobile) setTimeout(initMobileChart, 200);
}

function initMobileChart() {
    const container = document.getElementById('mobile-chart-container');
    if (!container || mobileChart) return;

    mobileChart = LightweightCharts.createChart(container, {
        width: window.innerWidth,
        height: window.innerHeight,
        layout: { backgroundColor: '#0b0e11', textColor: '#d1d4dc' },
        grid: { vertLines: { color: '#1f2226' }, horzLines: { color: '#1f2226' } },
        timeScale: { timeVisible: true, secondsVisible: true }
    });
    candleSeries = mobileChart.addCandlestickSeries({
        upColor: '#00ff88', downColor: '#f23645',
        borderVisible: false, wickUpColor: '#00ff88', wickDownColor: '#f23645'
    });
}

function updateClock() {
    const now = new Date();
    const h = now.getUTCHours(), m = now.getUTCMinutes(), s = now.getUTCSeconds();
    document.getElementById('utc-time').innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    document.getElementById('local-time').innerText = now.toLocaleTimeString();
    document.getElementById('cursor').style.left = (((h * 3600) + (m * 60) + s) / 86400) * 100 + "%";
}

function renderSessions() {
    const now = new Date();
    const currentH = now.getUTCHours();
    const hourPct = 100 / 24;
    ['row-1', 'row-2'].forEach(id => document.getElementById(id).innerHTML = '');
    
    sessions.forEach(s => {
        const isActive = (s.open < s.close) ? (currentH >= s.open && currentH < s.close) : (currentH >= s.open || currentH < s.close);
        const createBar = (l, w) => {
            const b = document.createElement('div');
            b.className = `bar ${s.class} ${isActive ? 'active' : ''}`;
            b.style.left = l + "%"; b.style.width = w + "%"; b.innerText = s.name;
            return b;
        };
        const row = document.getElementById(s.row);
        if (s.open < s.close) row.appendChild(createBar(s.open * hourPct, (s.close - s.open) * hourPct));
        else { row.appendChild(createBar(s.open * hourPct, (24 - s.open) * hourPct)); row.appendChild(createBar(0, s.close * hourPct)); }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const scale = document.getElementById('scale');
    for (let i = 0; i < 24; i++) {
        const m = document.createElement('div'); m.className = 'hour-mark';
        m.innerText = String(i).padStart(2, '0'); scale.appendChild(m);
    }
    
    if (localStorage.getItem('viewMode') === 'mobile') {
        document.body.classList.add('mobile-mode');
        updateUI(true);
    }

    setInterval(updateClock, 1000);
    setInterval(renderSessions, 60000);
    updateClock(); renderSessions();

    const btcSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    btcSocket.onmessage = (e) => {
        const price = parseFloat(JSON.parse(e.data).c);
        const el = document.getElementById('btc-price');
        el.innerText = '$' + price.toFixed(1);
        el.style.color = price >= lastPrice ? '#00ff88' : '#f23645';

        if (candleSeries && document.body.classList.contains('mobile-mode')) {
            candleSeries.update({
                time: Math.floor(Date.now() / 1000),
                open: lastPrice || price, high: Math.max(price, lastPrice || price),
                low: Math.min(price, lastPrice || price), close: price
            });
        }
        lastPrice = price;
    };
});

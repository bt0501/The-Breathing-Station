const LOCAL_IP = "http://192.168.1.118:8080";
const socket = io(LOCAL_IP);
let tradesHistory = [];

// Цены
const btcWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
btcWs.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const el = document.getElementById('btc-price');
    el.innerText = `$${parseFloat(data.c).toFixed(2)}`;
    el.style.color = parseFloat(data.p) >= 0 ? 'var(--accent)' : 'var(--danger)';
};

// Сессии
function renderSessions() {
    const sessions = [
        { id: 'row-1', label: 'SYDNEY', start: 22, end: 7, cls: 'sydney' },
        { id: 'row-1', label: 'TOKYO', start: 0, end: 9, cls: 'tokyo' },
        { id: 'row-2', label: 'LONDON', start: 8, end: 17, cls: 'london' },
        { id: 'row-2', label: 'NEW YORK', start: 13, end: 22, cls: 'newyork' }
    ];
    const currentH = new Date().getUTCHours();
    sessions.forEach(s => {
        const bar = document.createElement('div');
        bar.className = `bar ${s.cls} ${(currentH >= s.start || currentH < s.end) ? 'active' : ''}`;
        bar.innerText = s.label;
        bar.style.left = (s.start / 24) * 100 + "%";
        bar.style.width = ((s.end - s.start + 24) % 24 / 24) * 100 + "%";
        document.getElementById(s.id).appendChild(bar);
    });
}

// Новости
async function fetchNews() {
    const parser = new RSSParser();
    try {
        const feed = await parser.parseURL("https://api.allorigins.win/raw?url=https://www.coindesk.com/arc/outboundfeeds/rss/");
        document.getElementById('rss-news').innerHTML = feed.items.slice(0, 8).map(i => `
            <div style="margin-bottom:8px; border-bottom:1px solid #2b2f36; padding-bottom:4px">
                <a href="${i.link}" target="_blank" style="color:var(--text); text-decoration:none; font-size:0.75rem">${i.title}</a>
            </div>
        `).join('');
    } catch(e) { console.log("News error"); }
}

// Лента
socket.on('market_data', (data) => {
    const color = data.side === '+' ? 'var(--accent)' : 'var(--danger)';
    const rowHTML = `
        <span style="color:#848e9c">[${data.time}]</span>
        <span style="color:${color}; font-weight:bold">${data.side} ${data.price}</span>
        <span style="color:var(--text); text-align:right">${data.vol}</span>
        <span style="color:var(--local); text-align:right">${data.hold || 0}s</span>
    `;
    const row = document.createElement('div');
    row.className = "pulse-item";
    row.innerHTML = rowHTML;
    const tape = document.getElementById('tape');
    tape.prepend(row);
    if (tape.children.length > 30) tape.lastChild.remove();
    tradesHistory.unshift(rowHTML);
    if (tradesHistory.length > 200) tradesHistory.pop();
    document.getElementById('web-hold').innerText = data.hold || 0;
});

// Модалка
document.getElementById('tape').onclick = () => {
    document.getElementById('full-tape').innerHTML = tradesHistory.map(h => `<div class="pulse-item">${h}</div>`).join('');
    document.getElementById('analitics-modal').style.display = "block";
};
function closeAnalitics() { document.getElementById('analitics-modal').style.display = "none"; }

window.addEventListener('DOMContentLoaded', () => {
    const scale = document.getElementById('scale');
    for (let i = 0; i < 24; i++) {
        const mark = document.createElement('div');
        mark.className = 'hour-mark'; mark.innerText = String(i).padStart(2, '0');
        scale.appendChild(mark);
    }
    new TradingView.widget({ "autosize": true, "symbol": "BINANCE:BTCUSDT", "interval": "15", "theme": "dark", "container_id": "tradingview_chart", "locale": "ru" });
    renderSessions();
    fetchNews();
    setInterval(() => {
        const now = new Date();
        document.getElementById('utc-time').innerText = now.toISOString().substr(11, 8);
        document.getElementById('local-time').innerText = now.toLocaleTimeString();
        document.getElementById('cursor').style.left = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) / 86400 * 100 + "%";
    }, 1000);
});

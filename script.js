const LOCAL_IP = "http://192.168.1.118:8080";
const socket = io(LOCAL_IP);
let tradesHistory = [];

// Цена BTC
const btcWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
btcWs.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const el = document.getElementById('btc-price');
    el.innerText = `$${parseFloat(data.c).toFixed(2)}`;
    el.style.color = parseFloat(data.p) >= 0 ? 'var(--accent)' : 'var(--danger)';
};

// Сессии с привязкой к рядам и подсветкой
function renderSessions() {
    const sessions = [
        { row: 'row-sydney', label: 'SYDNEY', start: 22, end: 7, cls: 'sydney' },
        { row: 'row-tokyo', label: 'TOKYO', start: 0, end: 9, cls: 'tokyo' },
        { row: 'row-london', label: 'LONDON', start: 8, end: 17, cls: 'london' },
        { row: 'row-newyork', label: 'NEW YORK', start: 13, end: 22, cls: 'newyork' }
    ];
    
    const currentH = new Date().getUTCHours();
    
    sessions.forEach(s => {
        const container = document.getElementById(s.row);
        container.innerHTML = '';
        const bar = document.createElement('div');
        
        // Логика активности (учитываем переход через полночь)
        const isActive = s.start < s.end 
            ? (currentH >= s.start && currentH < s.end)
            : (currentH >= s.start || currentH < s.end);

        bar.className = `bar ${s.cls} ${isActive ? 'active' : ''}`;
        bar.innerText = s.label;
        bar.style.left = (s.start / 24) * 100 + "%";
        bar.style.width = ((s.end - s.start + 24) % 24 / 24) * 100 + "%";
        container.appendChild(bar);
    });
}

// РУССКИЕ НОВОСТИ (РБК Крипто)
async function fetchNews() {
    const parser = new RSSParser();
    try {
        // Используем RSS РБК Крипто для русского языка
        const feed = await parser.parseURL("https://api.allorigins.win/raw?url=https://rssexport.rbc.ru/rbcnews/crypto/index.rss");
        document.getElementById('rss-news').innerHTML = feed.items.slice(0, 10).map(i => `
            <div style="margin-bottom:10px; border-bottom:1px solid #2b2f36; padding-bottom:6px">
                <a href="${i.link}" target="_blank" style="color:var(--text); text-decoration:none; font-size:0.8rem; line-height:1.4">${i.title}</a>
                <div style="color:#848e9c; font-size:0.6rem; margin-top:3px">${new Date(i.pubDate).toLocaleTimeString()}</div>
            </div>
        `).join('');
    } catch(e) { 
        document.getElementById('rss-news').innerText = "Ошибка загрузки новостей"; 
    }
}

// Лента: Лимит 1000 для аналитики
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
    if (tape.children.length > 40) tape.lastChild.remove();

    tradesHistory.unshift(rowHTML);
    if (tradesHistory.length > 1000) tradesHistory.pop(); // Теперь храним 1000
    
    document.getElementById('web-hold').innerText = data.hold || 0;
});

// Открытие аналитики
document.getElementById('tape').onclick = () => {
    const fullTape = document.getElementById('full-tape');
    fullTape.innerHTML = tradesHistory.map(h => `<div class="pulse-item">${h}</div>`).join('');
    document.getElementById('analitics-modal').style.display = "block";
};

function closeAnalitics() { document.getElementById('analitics-modal').style.display = "none"; }

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    // Временная шкала
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
        
        // Движение курсора
        const seconds = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
        document.getElementById('cursor').style.left = (seconds / 86400 * 100) + "%";
        
        // Обновляем подсветку сессий каждую минуту
        if(now.getUTCSeconds() === 0) renderSessions();
    }, 1000);

    setInterval(fetchNews, 600000); // Новости раз в 10 мин
});

const socket = io("http://192.168.1.118:8080");
let tradesHistory = [];

// Сессии: Исправленный Сидней и Токио
function renderSessions() {
    const sessions = [
        { row: 'row-1', label: 'СИДНЕЙ', start: 22, end: 7, cls: 'sydney' },
        { row: 'row-2', label: 'ТОКИО', start: 0, end: 9, cls: 'tokyo' },
        { row: 'row-1', label: 'ЛОНДОН', start: 8, end: 17, cls: 'london' },
        { row: 'row-2', label: 'НЬЮ-ЙОРК', start: 13, end: 22, cls: 'newyork' }
    ];
    
    const utc = new Date();
    const currentH = utc.getUTCHours();
    
    sessions.forEach(s => {
        const bar = document.createElement('div');
        const isActive = s.start < s.end 
            ? (currentH >= s.start && currentH < s.end)
            : (currentH >= s.start || currentH < s.end);

        bar.className = `bar ${s.cls} ${isActive ? 'active' : ''}`;
        bar.innerText = s.label;
        
        // Расчет позиции
        bar.style.left = (s.start / 24 * 100) + "%";
        let duration = (s.end - s.start + 24) % 24;
        bar.style.width = (duration / 24 * 100) + "%";
        
        document.getElementById(s.row).appendChild(bar);
    });
}

// Новости (Русские)
async function fetchNews() {
    const parser = new RSSParser();
    try {
        const feed = await parser.parseURL("https://api.allorigins.win/raw?url=https://rssexport.rbc.ru/rbcnews/crypto/index.rss");
        document.getElementById('rss-news').innerHTML = feed.items.slice(0, 10).map(i => `
            <div style="padding:10px; border-bottom:1px solid #2b2f36;">
                <div style="font-size:0.6rem; color:#848e9c; margin-bottom:4px">${new Date(i.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <a href="${i.link}" target="_blank" style="color:var(--text); text-decoration:none; font-size:0.8rem; font-weight:500; line-height:1.4">${i.title}</a>
            </div>
        `).join('');
    } catch(e) { document.getElementById('rss-news').innerText = "Ошибка загрузки новостей"; }
}

// Рыночные данные
socket.on('market_data', (data) => {
    const color = data.side === '+' ? 'var(--accent)' : 'var(--danger)';
    
    // ПОРЯДОК: [Время] | Цена | Объем | Удержание
    const rowHTML = `
        <span style="color:#848e9c">[${data.time}]</span>
        <span style="color:${color}; font-weight:bold">${data.side} ${data.price}</span>
        <span style="color:var(--text); text-align:right">V: ${data.vol}</span>
        <span style="color:var(--accent); text-align:right">${data.hold || 0}s</span>
    `;

    const row = document.createElement('div');
    row.className = "pulse-item";
    row.innerHTML = rowHTML;
    
    const tape = document.getElementById('tape');
    tape.prepend(row);
    if (tape.children.length > 50) tape.lastChild.remove();

    tradesHistory.unshift(rowHTML);
    if (tradesHistory.length > 1000) tradesHistory.pop();
    document.getElementById('web-hold').innerText = data.hold || 0;
});

// Управление модалкой
document.getElementById('tape').onclick = () => {
    document.getElementById('full-tape').innerHTML = tradesHistory.map(h => `<div class="pulse-item">${h}</div>`).join('');
    document.getElementById('analitics-modal').style.display = "block";
};
function closeAnalitics() { document.getElementById('analitics-modal').style.display = "none"; }

// Запуск
window.addEventListener('DOMContentLoaded', () => {
    // Шкала
    const scale = document.getElementById('scale');
    for (let i = 0; i < 24; i++) {
        const m = document.createElement('div'); m.className='hour-mark'; m.innerText=String(i).padStart(2,'0');
        scale.appendChild(m);
    }

    new TradingView.widget({ "autosize": true, "symbol": "BINANCE:BTCUSDT", "interval": "15", "theme": "dark", "container_id": "tradingview_chart", "locale": "ru" });
    
    renderSessions();
    fetchNews();

    setInterval(() => {
        const now = new Date();
        document.getElementById('utc-time').innerText = now.toISOString().substr(11, 8);
        document.getElementById('local-time').innerText = now.toLocaleTimeString();
        const sec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
        document.getElementById('cursor').style.left = (sec / 86400 * 100) + "%";
    }, 1000);
});

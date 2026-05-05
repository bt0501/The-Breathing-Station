// Сессии с учетом перехода через полночь (Сидней)
function renderSessions() {
    const sessions = [
        { row: 'row-1', label: 'СИДНЕЙ', start: 22, end: 24, cls: 'sydney' }, // Часть 1
        { row: 'row-1', label: 'СИДНЕЙ', start: 0, end: 7, cls: 'sydney' },  // Часть 2
        { row: 'row-2', label: 'ТОКИО', start: 0, end: 9, cls: 'tokyo' },
        { row: 'row-1', label: 'ЛОНДОН', start: 8, end: 17, cls: 'london' },
        { row: 'row-2', label: 'НЬЮ-ЙОРК', start: 13, end: 22, cls: 'newyork' }
    ];
    
    const currentH = new Date().getUTCHours();
    document.getElementById('row-1').innerHTML = '';
    document.getElementById('row-2').innerHTML = '';

    sessions.forEach(s => {
        const bar = document.createElement('div');
        const isActive = (currentH >= s.start && currentH < s.end);
        bar.className = `bar ${s.cls} ${isActive ? 'active' : ''}`;
        bar.innerText = s.label;
        bar.style.left = (s.start / 24 * 100) + "%";
        bar.style.width = ((s.end - s.start) / 24 * 100) + "%";
        document.getElementById(s.row).appendChild(bar);
    });
}

// Новости (Улучшенный фикс)
async function fetchNews() {
    try {
        const res = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent("https://rssexport.rbc.ru/rbcnews/crypto/index.rss"));
        const json = await res.json();
        const parser = new RSSParser();
        const feed = await parser.parseString(json.contents);
        
        document.getElementById('rss-news').innerHTML = feed.items.slice(0, 10).map(i => `
            <div style="padding:8px; border-bottom:1px solid #2b2f36;">
                <span style="font-size:0.6rem; color:#848e9c">${new Date(i.pubDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><br>
                <a href="${i.link}" target="_blank" style="color:var(--text); text-decoration:none; font-size:0.8rem">${i.title}</a>
            </div>
        `).join('');
    } catch(e) { document.getElementById('rss-news').innerText = "Ошибка загрузки"; }
}

// Лента
socket.on('market_data', (data) => {
    const color = data.side === '+' ? '#00ff88' : '#f23645';
    const rowHTML = `
        <span style="color:#848e9c">[${data.time}]</span>
        <span style="color:${color}; font-weight:bold">${data.side} ${data.price}</span>
        <span style="color:var(--text); text-align:right">V:${data.vol}</span>
        <span style="color:#FFD700; text-align:right">${data.hold || 0}s</span>
    `;
    const row = document.createElement('div');
    row.className = "pulse-item";
    row.innerHTML = rowHTML;
    const t = document.getElementById('tape');
    t.prepend(row);
    if (t.children.length > 40) t.lastChild.remove();
    tradesHistory.unshift(rowHTML);
    if (tradesHistory.length > 1000) tradesHistory.pop();
});

// Инициализация Drag & Drop
$(function() {
    $("#analitics-modal").draggable({ handle: ".modal-header" });
});

function closeAnalitics() { document.getElementById('analitics-modal').style.display = "none"; }
document.getElementById('tape').onclick = () => {
    document.getElementById('full-tape').innerHTML = tradesHistory.map(h => `<div class="pulse-item">${h}</div>`).join('');
    document.getElementById('analitics-modal').style.display = "block";
};

window.addEventListener('DOMContentLoaded', () => {
    renderSessions();
    fetchNews();
    setInterval(() => {
        const now = new Date();
        document.getElementById('utc-time').innerText = now.toISOString().substr(11, 8);
        document.getElementById('local-time').innerText = now.toLocaleTimeString();
        document.getElementById('cursor').style.left = ((now.getUTCHours() * 3600 + now.getUTCMinutes() * 60) / 86400 * 100) + "%";
    }, 1000);
});

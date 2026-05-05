// --- КОНФИГ И СОКЕТЫ ---
const LOCAL_IP = "http://192.168.1.118:8080";
const socket = io(LOCAL_IP);
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- BTC LIVE PRICE (BINANCE WEBSOCKET) ---
const btcWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
btcWs.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const price = parseFloat(data.c).toFixed(2);
    const el = document.getElementById('btc-price');
    el.innerText = `$${price}`;
    el.style.color = parseFloat(data.p) >= 0 ? 'var(--accent)' : 'var(--danger)';
};

// --- ФУНКЦИИ ВРЕМЕНИ И СЕССИЙ ---
const sessions = [
    { name: "СИДНЕЙ", open: 21, close: 6, class: "sydney", row: "row-1" },
    { name: "ЛОНДОН", open: 7, close: 16, class: "london", row: "row-1" },
    { name: "ТОКИО", open: 0, close: 9, class: "tokyo", row: "row-2" },
    { name: "НЬЮ-ЙОРК", open: 13, close: 22, class: "newyork", row: "row-2" }
];

function updateClockAndCursor() {
    const now = new Date();
    const h = now.getUTCHours(), m = now.getUTCMinutes(), s = now.getUTCSeconds();
    document.getElementById('utc-time').innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    document.getElementById('local-time').innerText = now.toLocaleTimeString();
    document.getElementById('cursor').style.left = (((h * 3600) + (m * 60) + s) / 86400) * 100 + "%";
}

function renderSessions() {
    const currentH = new Date().getUTCHours();
    const hourPct = 100 / 24;
    ['row-1', 'row-2'].forEach(id => document.getElementById(id).innerHTML = '');
    
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

// --- ТЕРМИНАЛ ---
socket.on('connect', () => {
    document.getElementById('status').innerText = "ONLINE";
    document.getElementById('status').style.color = "var(--accent)";
});

socket.on('market_data', (data) => {
    const tape = document.getElementById('tape');
    const color = data.side === '+' ? 'var(--accent)' : 'var(--danger)';
    
    // Формируем контент так, чтобы он попадал в grid-columns из CSS
    const rowHTML = `
        <span style="color:#848e9c">[${data.time}]</span>
        <span style="color:${color}; font-weight:bold">${data.side} ${data.price}</span>
        <span style="color:var(--text); text-align:right">${data.vol}</span>
        <span style="color:#848e9c; text-align:center">(${data.count || 1})</span>
        <span style="color:var(--local); text-align:right">${data.hold || 0}s</span>
    `;

    const row = document.createElement('div');
    row.className = "pulse-item";
    row.innerHTML = rowHTML;

    tape.prepend(row);
    if (tape.children.length > 20) tape.removeChild(tape.lastChild);

    // Сохраняем для аналитики (в массив)
    tradesHistory.unshift(rowHTML);
    if (tradesHistory.length > 200) tradesHistory.pop();
});

// --- ЗАПУСК ---
window.addEventListener('DOMContentLoaded', () => {
    const scale = document.getElementById('scale');
    for (let i = 0; i < 24; i++) {
        const mark = document.createElement('div');
        mark.className = 'hour-mark'; mark.innerText = String(i).padStart(2, '0');
        scale.appendChild(mark);
    }
    new TradingView.widget({
        "autosize": true, "symbol": "BINANCE:BTCUSDT", "interval": "15",
        "theme": "dark", "container_id": "tradingview_chart", "locale": "ru"
    });
    setInterval(updateClockAndCursor, 1000);
    updateClockAndCursor();
    renderSessions();
});

// Клик для активации звука
document.body.onclick = () => { if(audioCtx.state === 'suspended') audioCtx.resume(); };
// Открытие аналитики
document.getElementById('tape').onclick = () => {
    document.getElementById('analitics-modal').style.display = "block";
};

function closeAnalitics() {
    document.getElementById('analitics-modal').style.display = "none";
}

// Модифицируем получение данных, чтобы они дублировались в большое окно
socket.on('market_data', (data) => {
    const tape = document.getElementById('tape');
    const fullTape = document.getElementById('full-tape'); // Окно аналитики
    
    const row = document.createElement('div');
    row.className = "pulse-item";
    const color = data.side === '+' ? 'var(--accent)' : 'var(--danger)';
    const content = `
        <span style="color:#848e9c">[${data.time}]</span> 
        <span style="color:${color}; font-weight:bold">${data.side} $${data.price}</span>
        <span style="font-size:0.7rem"> V:${data.vol}</span>
    `;
    row.innerHTML = content;
    
    // В маленькое окно
    tape.prepend(row.cloneNode(true));
    if (tape.children.length > 20) tape.removeChild(tape.lastChild);
    
    // В окно аналитики (храним больше данных, например 200 строк)
    fullTape.prepend(row);
    if (fullTape.children.length > 200) fullTape.removeChild(fullTape.lastChild);
    
    document.getElementById('web-hold').innerText = data.hold || 0;
});

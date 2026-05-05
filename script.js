const LOCAL_IP = "http://192.168.1.118:8080";
const socket = io(LOCAL_IP);
let tradesHistory = []; // Массив для хранения 200 сделок

// --- BTC LIVE PRICE ---
const btcWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
btcWs.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const price = parseFloat(data.c).toFixed(2);
    const el = document.getElementById('btc-price');
    if(el) {
        el.innerText = `$${price}`;
        el.style.color = parseFloat(data.p) >= 0 ? 'var(--accent)' : 'var(--danger)';
    }
};

// --- ТЕРМИНАЛ И СОКЕТЫ ---
socket.on('connect', () => {
    const status = document.getElementById('status');
    status.innerText = "ONLINE"; status.style.color = "var(--accent)";
});

socket.on('market_data', (data) => {
    const tape = document.getElementById('tape');
    const color = data.side === '+' ? 'var(--accent)' : 'var(--danger)';
    
    // Формируем HTML строки (совпадает с сеткой в CSS)
    const rowHTML = `
        <span style="color:#848e9c">[${data.time}]</span>
        <span style="color:${color}; font-weight:bold">${data.side} ${data.price}</span>
        <span style="color:var(--text); text-align:right">${data.vol}</span>
        <span style="color:#848e9c; text-align:center">(${data.count || 1})</span>
        <span style="color:var(--local); text-align:right">${data.hold || 0}s</span>
    `;

    // Создаем элемент для маленькой ленты
    const row = document.createElement('div');
    row.className = "pulse-item";
    row.innerHTML = rowHTML;

    // Добавляем в основную ленту (макс 20 строк)
    tape.prepend(row);
    if (tape.children.length > 20) tape.removeChild(tape.lastChild);

    // Сохраняем в массив для аналитики (макс 200 строк)
    tradesHistory.unshift(rowHTML);
    if (tradesHistory.length > 200) tradesHistory.pop();
    
    // Обновляем HOLD в футере
    const holdDisplay = document.getElementById('web-hold');
    if(holdDisplay) holdDisplay.innerText = data.hold || 0;
});

// --- УПРАВЛЕНИЕ ОКНОМ АНАЛИТИКИ ---
document.getElementById('tape').onclick = () => {
    const fullTape = document.getElementById('full-tape');
    // Отрисовываем всё накопленное из массива
    fullTape.innerHTML = tradesHistory
        .map(item => `<div class="pulse-item">${item}</div>`)
        .join('');
    document.getElementById('analitics-modal').style.display = "block";
};

function closeAnalitics() {
    document.getElementById('analitics-modal').style.display = "none";
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function updateClockAndCursor() {
    const now = new Date();
    const h = now.getUTCHours(), m = now.getUTCMinutes(), s = now.getUTCSeconds();
    document.getElementById('utc-time').innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    document.getElementById('cursor').style.left = (((h * 3600) + (m * 60) + s) / 86400) * 100 + "%";
}

// Запуск при загрузке
window.addEventListener('DOMContentLoaded', () => {
    // Рендер шкалы времени
    const scale = document.getElementById('scale');
    for (let i = 0; i < 24; i++) {
        const mark = document.createElement('div');
        mark.className = 'hour-mark'; mark.innerText = String(i).padStart(2, '0');
        scale.appendChild(mark);
    }
    
    // Инициализация TradingView
    new TradingView.widget({
        "autosize": true, "symbol": "BINANCE:BTCUSDT", "interval": "15",
        "theme": "dark", "container_id": "tradingview_chart", "locale": "ru"
    });

    setInterval(updateClockAndCursor, 1000);
    updateClockAndCursor();
});

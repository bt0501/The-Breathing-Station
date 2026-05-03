// --- ОСНОВНЫЕ ПЕРЕМЕННЫЕ ---
let mobileChart, candleSeries;
let lastPrice = 0;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Конфигурация торговых сессий
const sessions = [
    { name: "СИДНЕЙ", open: 21, close: 6, class: "sydney", row: "row-1" },
    { name: "ЛОНДОН", open: 7, close: 16, class: "london", row: "row-1" },
    { name: "ТОКИО", open: 0, close: 9, class: "tokyo", row: "row-2" },
    { name: "НЬЮ-ЙОРК", open: 13, close: 22, class: "newyork", row: "row-2" }
];

// --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ РЕЖИМОВ ---

function toggleView() {
    const isMobile = document.body.classList.toggle('mobile-mode');
    localStorage.setItem('viewMode', isMobile ? 'mobile' : 'desktop');
    updateUI(isMobile);
}

function updateUI(isMobile) {
    const btn = document.getElementById('view-toggle');
    if (btn) {
        btn.innerText = isMobile ? '💻 Режим ПК' : '📱 Режим Мобайл';
    }
    if (isMobile) {
        // Небольшая задержка, чтобы DOM успел перестроиться под 100vh
        setTimeout(initMobileChart, 100);
    }
}

function initMobileChart() {
    const container = document.getElementById('mobile-chart-container');
    if (!container) return;

    if (mobileChart) {
        mobileChart.applyOptions({ width: window.innerWidth, height: window.innerHeight });
        return;
    }

    mobileChart = LightweightCharts.createChart(container, {
        width: window.innerWidth,
        height: window.innerHeight,
        layout: { 
            backgroundColor: '#0b0e11', 
            textColor: '#d1d4dc',
            fontSize: 12
        },
        grid: { 
            vertLines: { color: '#1f2226' }, 
            horzLines: { color: '#1f2226' } 
        },
        timeScale: { 
            timeVisible: true, 
            secondsVisible: true,
            borderColor: '#2b2f36'
        },
        rightPriceScale: {
            borderColor: '#2b2f36'
        }
    });

    candleSeries = mobileChart.addCandlestickSeries({
        upColor: '#00ff88', 
        downColor: '#f23645',
        borderVisible: false, 
        wickUpColor: '#00ff88', 
        wickDownColor: '#f23645'
    });
}

// --- ЛОГИКА ВРЕМЕНИ И СЕССИЙ ---

function updateClock() {
    const now = new Date();
    
    // UTC Время
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const s = now.getUTCSeconds();
    
    const utcStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const utcEl = document.getElementById('utc-time');
    if (utcEl) utcEl.innerText = utcStr;

    // Локальное время
    const localEl = document.getElementById('local-time');
    if (localEl) localEl.innerText = now.toLocaleTimeString();

    // Движение курсора на временной шкале (в секундах дня)
    const totalSeconds = (h * 3600) + (m * 60) + s;
    const cursor = document.getElementById('cursor');
    if (cursor) {
        cursor.style.left = (totalSeconds / 86400) * 100 + "%";
    }
}

function renderSessions() {
    const now = new Date();
    const currentH = now.getUTCHours();
    const hourPct = 100 / 24;

    const rows = ['row-1', 'row-2'];
    rows.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    sessions.forEach(s => {
        const rowEl = document.getElementById(s.row);
        if (!rowEl) return;

        const isActive = (s.open < s.close) 
            ? (currentH >= s.open && currentH < s.close) 
            : (currentH >= s.open || currentH < s.close);

        const createBar = (left, width) => {
            const bar = document.createElement('div');
            bar.className = `bar ${s.class} ${isActive ? 'active' : ''}`;
            bar.style.left = left + "%"; 
            bar.style.width = width + "%";
            bar.innerText = s.name; 
            return bar;
        };

        if (s.open < s.close) {
            rowEl.appendChild(createBar(s.open * hourPct, (s.close - s.open) * hourPct));
        } else {
            // Если сессия переходит через полночь (например, Сидней)
            rowEl.appendChild(createBar(s.open * hourPct, (24 - s.open) * hourPct));
            rowEl.appendChild(createBar(0, s.close * hourPct));
        }
    });
}

function playTick(freq = 440) {
    if (audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ---

window.addEventListener('DOMContentLoaded', () => {
    // 1. Проверка сохраненного режима
    const savedMode = localStorage.getItem('viewMode');
    if (savedMode === 'mobile') {
        document.body.classList.add('mobile-mode');
        updateUI(true);
    }

    // 2. Отрисовка временной шкалы (цифры 00-23)
    const scale = document.getElementById('scale');
    if (scale) {
        for (let i = 0; i < 24; i++) {
            const mark = document.createElement('div');
            mark.className = 'hour-mark';
            mark.innerText = String(i).padStart(2, '0');
            scale.appendChild(mark);
        }
    }

    // 3. Запуск циклов обновления
    renderSessions();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(renderSessions, 60000); // Обновлять сессии раз в минуту

    // 4. WebSocket Binance
    const btcSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    btcSocket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const price = parseFloat(data.c);
        
        // Звуковой сигнал при сильном движении (если цена изменилась более чем на 0.05%)
        if (lastPrice > 0) {
            const diff = Math.abs(price - lastPrice);
            if (diff > (lastPrice * 0.0005)) {
                playTick(price > lastPrice ? 880 : 440);
            }
        }

        // Обновляем цену в интерфейсе ПК
        const btcEl = document.getElementById('btc-price');
        if (btcEl) {
            btcEl.innerText = '$' + price.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1});
            btcEl.style.color = price >= lastPrice ? '#00ff88' : '#f23645';
        }

        // Обновляем мобильный график
        if (candleSeries && document.body.classList.contains('mobile-mode')) {
            candleSeries.update({
                time: Math.floor(Date.now() / 1000),
                open: lastPrice || price,
                high: price > lastPrice ? price : (lastPrice || price),
                low: price < lastPrice ? price : (lastPrice || price),
                close: price
            });
        }
        lastPrice = price;
    };

    // Разблокировка аудио (нужно нажать в любом месте страницы)
    document.body.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }, { once: true });
});

// Адаптация графика при повороте экрана
window.addEventListener('resize', () => {
    if (mobileChart && document.body.classList.contains('mobile-mode')) {
        mobileChart.applyOptions({ width: window.innerWidth, height: window.innerHeight });
    }
});

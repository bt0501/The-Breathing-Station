let mobileChart, candleSeries;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function toggleView() {
    const isMobile = document.body.classList.toggle('mobile-mode');
    localStorage.setItem('viewMode', isMobile ? 'mobile' : 'desktop');
    updateUI(isMobile);
}

function updateUI(isMobile) {
    document.getElementById('view-toggle').innerText = isMobile ? '💻 Режим ПК' : '📱 Режим Мобайл';
    if (isMobile) initMobileChart();
}

function initMobileChart() {
    const container = document.getElementById('mobile-chart-container');
    if (mobileChart) return;

    mobileChart = LightweightCharts.createChart(container, {
        width: window.innerWidth,
        height: window.innerHeight,
        layout: { backgroundColor: '#0b0e11', textColor: '#d1d4dc' },
        grid: { vertLines: { color: '#1f2226' }, horzLines: { color: '#1f2226' } },
    });
    candleSeries = mobileChart.addCandlestickSeries();
}

// Загрузка сохраненного режима
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('viewMode') === 'mobile') {
        document.body.classList.add('mobile-mode');
        updateUI(true);
    }
    renderSessions();
    updateClock();
});

// WebSocket и остальная логика... (вставь сюда функции из старого файла)
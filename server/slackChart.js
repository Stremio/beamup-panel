const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const WIDTH = 900;
const HEIGHT = 320;
const FONT_FAMILY = 'Roboto';
const FONT_PATH = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const canvas = new ChartJSNodeCanvas({
    width: WIDTH,
    height: HEIGHT,
    backgroundColour: 'white',
    chartCallback: (ChartJS) => {
        ChartJS.defaults.font.family = FONT_FAMILY;
    },
});

canvas.registerFont(FONT_PATH, { family: FONT_FAMILY });

function formatTickLabel(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function renderMetricChart(metric, serverStats, range) {
    const datasets = serverStats.map((s, i) => ({
        label: s.host,
        data: s.samples.map(p => ({ x: p.timestamp, y: Number(p[metric] || 0) * 100 })),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.2,
    }));

    const config = {
        type: 'line',
        data: { datasets },
        options: {
            responsive: false,
            animation: false,
            plugins: {
                title: { display: true, text: `${metric.toUpperCase()} usage — ${range.label}`, font: { size: 16 } },
                legend: { position: 'top' },
            },
            scales: {
                x: {
                    type: 'linear',
                    min: range.start,
                    max: range.end,
                    ticks: {
                        callback: (v) => formatTickLabel(v),
                        maxTicksLimit: 8,
                    },
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 100,
                    ticks: {
                        callback: (v) => `${v}%`,
                    },
                },
            },
        },
    };

    return canvas.renderToBuffer(config);
}

module.exports = { renderMetricChart };

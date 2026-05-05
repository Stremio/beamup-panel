const fs = require('fs');
const path = require('path');
const config = require('./config');
const alertState = require('./alertState');

const sessionsFolder = config.sessions_folder || '../';
const SPARKLINE_BUCKETS = 40;

function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatPercent(value) {
    return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function avg(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function max(values) {
    if (!values.length) return 0;
    return Math.max.apply(null, values.map(value => Number(value || 0)));
}

function sparkline(values) {
    const bars = '▁▂▃▄▅▆▇█';
    if (!values.length) return '';
    const nums = values.map(value => Number(value || 0));
    const lo = Math.min.apply(null, nums);
    const range = Math.max.apply(null, nums) - lo || 1;
    return nums.map(value => {
        const idx = Math.round(((value - lo) / range) * (bars.length - 1));
        return bars[idx];
    }).join('');
}

function bucketize(values, bucketCount) {
    if (values.length <= bucketCount) return values.slice();
    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
        const start = Math.floor((i * values.length) / bucketCount);
        const end = Math.floor(((i + 1) * values.length) / bucketCount);
        const slice = values.slice(start, end);
        if (slice.length) {
            buckets.push(slice.reduce((sum, v) => sum + Number(v || 0), 0) / slice.length);
        }
    }
    return buckets;
}

function rangeForPreset(preset) {
    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const cleanPreset = (preset || 'today').trim().toLowerCase();

    if (cleanPreset === 'today') {
        return { start: todayStart, end: Date.now(), label: 'today' };
    }

    if (cleanPreset === 'yesterday') {
        const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
        return { start: yesterdayStart, end: todayStart, label: 'yesterday' };
    }

    const lastMatch = cleanPreset.match(/^last\s+(\d+)\s*([mh])$/);
    if (lastMatch) {
        const amount = parseInt(lastMatch[1], 10);
        const unitMs = lastMatch[2] === 'h' ? 60 * 60 * 1000 : 60 * 1000;
        return { start: Date.now() - (amount * unitMs), end: Date.now(), label: `last ${amount}${lastMatch[2]}` };
    }

    const dateMatch = cleanPreset.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
        const start = new Date(`${cleanPreset}T00:00:00`).getTime();
        return { start, end: start + 24 * 60 * 60 * 1000, label: cleanPreset };
    }

    return false;
}

function readServerStats(start, end) {
    let history;
    try {
        history = JSON.parse(fs.readFileSync(path.join(sessionsFolder, 'servers_usage_history.json')));
    } catch (e) {
        return [];
    }
    if (!Array.isArray(history)) return [];

    return history.map((entries, idx) => {
        if (!Array.isArray(entries) || !entries.length) return null;
        const filtered = entries
            .filter(e => e && e.timestamp >= start && e.timestamp < end)
            .sort((a, b) => a.timestamp - b.timestamp);
        if (!filtered.length) return null;
        const cpuValues = filtered.map(e => e.cpu);
        const memValues = filtered.map(e => e.mem);
        const hddValues = filtered.map(e => e.hdd);
        return {
            host: config.node_prefix + idx,
            count: filtered.length,
            cpu: { avg: avg(cpuValues), max: max(cpuValues), spark: sparkline(bucketize(cpuValues, SPARKLINE_BUCKETS)) },
            mem: { avg: avg(memValues), max: max(memValues), spark: sparkline(bucketize(memValues, SPARKLINE_BUCKETS)) },
            hdd: { avg: avg(hddValues), max: max(hddValues), spark: sparkline(bucketize(hddValues, SPARKLINE_BUCKETS)) },
        };
    }).filter(Boolean);
}

function buildReport(range) {
    const issues = alertState.getIssues(range.start, range.end);
    const serverStats = readServerStats(range.start, range.end);
    const dangerCount = issues.filter(i => i.issueType === 'Danger').length;
    const warningCount = issues.length - dangerCount;

    let text = `*BeamUp report for ${range.label}*\n`;

    if (serverStats.length) {
        text += '\n*System usage*';
        serverStats.forEach(s => {
            text += `\n${s.host} (${s.count} samples)`;
            text += '\n```\n';
            text += `CPU avg ${formatPercent(s.cpu.avg)} / max ${formatPercent(s.cpu.max)}  ${s.cpu.spark}\n`;
            text += `MEM avg ${formatPercent(s.mem.avg)} / max ${formatPercent(s.mem.max)}  ${s.mem.spark}\n`;
            text += `HDD avg ${formatPercent(s.hdd.avg)} / max ${formatPercent(s.hdd.max)}  ${s.hdd.spark}`;
            text += '\n```';
        });
    } else {
        text += '\nNo server samples recorded for this range.';
    }

    if (issues.length) {
        text += `\n\n*Issues*: ${issues.length} (${dangerCount} danger, ${warningCount} warning)`;
        const byServer = issues.reduce((acc, issue) => {
            acc[issue.nodeHost] = acc[issue.nodeHost] || [];
            acc[issue.nodeHost].push(issue);
            return acc;
        }, {});
        Object.keys(byServer).forEach(server => {
            const list = byServer[server];
            const d = list.filter(i => i.issueType === 'Danger').length;
            const w = list.length - d;
            const latest = list[list.length - 1];
            text += `\n${server}: ${list.length} (${d}d/${w}w), latest ${latest.issueType} CPU ${formatPercent(latest.cpu)} MEM ${formatPercent(latest.mem)} HDD ${formatPercent(latest.hdd)}`;
        });
    } else {
        text += '\n\nNo issues recorded for this range.';
    }

    return {
        hasIssues: issues.length > 0,
        text,
    };
}

module.exports = {
    buildReport,
    rangeForPreset,
    startOfLocalDay,
};

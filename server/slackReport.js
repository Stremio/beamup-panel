const alertState = require('./alertState');

function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString();
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
    const min = Math.min.apply(null, nums);
    const range = Math.max.apply(null, nums) - min || 1;
    return nums.map(value => {
        const idx = Math.round(((value - min) / range) * (bars.length - 1));
        return bars[idx];
    }).join('');
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
        const amount = parseInt(lastMatch[1]);
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

function buildReport(range) {
    const issues = alertState.getIssues(range.start, range.end);
    if (!issues.length) {
        return {
            hasIssues: false,
            text: `No issues found for ${range.label}.`,
        };
    }

    const byServer = issues.reduce((acc, issue) => {
        acc[issue.nodeHost] = acc[issue.nodeHost] || [];
        acc[issue.nodeHost].push(issue);
        return acc;
    }, {});

    const cpuValues = issues.map(issue => issue.cpu);
    const memValues = issues.map(issue => issue.mem);
    const hddValues = issues.map(issue => issue.hdd);
    const affectedServers = Object.keys(byServer);
    const dangerCount = issues.filter(issue => issue.issueType === 'Danger').length;
    const warningCount = issues.length - dangerCount;

    let text = `*BeamUp issue report for ${range.label}*\n`;
    text += `Issues: ${issues.length} (${dangerCount} danger, ${warningCount} warning)\n`;
    text += `Servers: ${affectedServers.join(', ')}\n`;
    text += `Window: ${formatDateTime(issues[0].timestamp)} - ${formatDateTime(issues[issues.length - 1].timestamp)}\n`;
    text += `Max CPU/MEM/HDD: ${formatPercent(max(cpuValues))} / ${formatPercent(max(memValues))} / ${formatPercent(max(hddValues))}\n`;
    text += `Avg CPU/MEM/HDD: ${formatPercent(avg(cpuValues))} / ${formatPercent(avg(memValues))} / ${formatPercent(avg(hddValues))}\n`;
    text += '```\n';
    text += `CPU ${sparkline(cpuValues)}\n`;
    text += `MEM ${sparkline(memValues)}\n`;
    text += `HDD ${sparkline(hddValues)}`;
    text += '\n```\n';

    affectedServers.forEach(server => {
        const serverIssues = byServer[server];
        const latest = serverIssues[serverIssues.length - 1];
        text += `\n${server}: ${serverIssues.length} issues, latest ${latest.issueType} CPU ${formatPercent(latest.cpu)}, MEM ${formatPercent(latest.mem)}, HDD ${formatPercent(latest.hdd)}`;
    });

    return {
        hasIssues: true,
        text,
    };
}

module.exports = {
    buildReport,
    rangeForPreset,
    startOfLocalDay,
};

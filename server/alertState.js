const fs = require('fs');
const path = require('path');
const config = require('./config');

const sessionsFolder = config.sessions_folder || '../';
const statePath = path.join(sessionsFolder, 'slack_alert_state.json');

function defaultState() {
    return {
        mutedUntil: 0,
        mutedBy: '',
        mutedReason: '',
        issues: [],
        lastDailyReportKey: '',
    };
}

function ensureFolder() {
    fs.mkdirSync(sessionsFolder, { recursive: true });
}

function readState() {
    try {
        return { ...defaultState(), ...JSON.parse(fs.readFileSync(statePath)) };
    } catch (e) {
        return defaultState();
    }
}

function writeState(state) {
    ensureFolder();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function pruneIssues(issues) {
    const oldest = Date.now() - (config.slack_issues_history_days * 24 * 60 * 60 * 1000);
    return issues.filter(issue => issue.timestamp >= oldest);
}

function getMute() {
    const state = readState();
    if (state.mutedUntil && state.mutedUntil <= Date.now()) {
        state.mutedUntil = 0;
        state.mutedBy = '';
        state.mutedReason = '';
        writeState(state);
    }
    return {
        mutedUntil: state.mutedUntil || 0,
        mutedBy: state.mutedBy || '',
        mutedReason: state.mutedReason || '',
        muted: !!state.mutedUntil && state.mutedUntil > Date.now(),
    };
}

function setMute(mutedUntil, mutedBy, mutedReason) {
    const state = readState();
    state.mutedUntil = mutedUntil;
    state.mutedBy = mutedBy || '';
    state.mutedReason = mutedReason || '';
    writeState(state);
    return getMute();
}

function clearMute() {
    return setMute(0, '', '');
}

function isMuted() {
    return getMute().muted;
}

function recordIssue(issue) {
    const state = readState();
    state.issues.unshift({
        timestamp: Date.now(),
        ...issue,
    });
    state.issues = pruneIssues(state.issues);
    writeState(state);
}

function getIssues(start, end) {
    const state = readState();
    return state.issues
        .filter(issue => issue.timestamp >= start && issue.timestamp < end)
        .sort((a, b) => a.timestamp - b.timestamp);
}

function getLastDailyReportKey() {
    return readState().lastDailyReportKey || '';
}

function setLastDailyReportKey(key) {
    const state = readState();
    state.lastDailyReportKey = key;
    writeState(state);
}

module.exports = {
    clearMute,
    getIssues,
    getLastDailyReportKey,
    getMute,
    isMuted,
    recordIssue,
    setLastDailyReportKey,
    setMute,
};

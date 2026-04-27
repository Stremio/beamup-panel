const crypto = require('crypto');
const config = require('./config');
const alertState = require('./alertState');
const slack = require('./slack');
const { buildReport, rangeForPreset } = require('./slackReport');

function parseDuration(text) {
    const match = text.match(/^(\d+)\s*([mhd])$/i);
    if (!match) return false;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const unitMs = unit === 'd' ? 24 * 60 * 60 * 1000 : unit === 'h' ? 60 * 60 * 1000 : 60 * 1000;
    return amount * unitMs;
}

function parseMuteUntil(text) {
    const cleanText = text.trim().toLowerCase();
    const duration = parseDuration(cleanText);
    if (duration) return Date.now() + duration;

    const untilMatch = cleanText.match(/^until\s+(\d{1,2}):(\d{2})$/);
    if (!untilMatch) return false;

    const now = new Date();
    const until = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(untilMatch[1]), parseInt(untilMatch[2]), 0, 0);
    if (until.getTime() <= Date.now()) {
        until.setDate(until.getDate() + 1);
    }
    return until.getTime();
}

function formatMute(mute) {
    if (!mute.muted) return 'Alerts are not muted.';
    const mins = Math.ceil((mute.mutedUntil - Date.now()) / (60 * 1000));
    return `Alerts are muted until ${new Date(mute.mutedUntil).toLocaleString()} (${mins}m remaining). Daily and on-demand reports still send.`;
}

function cleanCommandText(text) {
    return (text || '')
        .replace(/^<@[A-Z0-9]+>\s*/i, '')
        .replace(/^(stremur|beamup|bot)[:,]?\s+/i, '')
        .trim();
}

function isCommandMessage(text) {
    const cleaned = cleanCommandText(text).toLowerCase();
    return /^(mute|unmute|status|report|help)(\s|$)/.test(cleaned);
}

function helpText() {
    return [
        'Commands:',
        '`mute 30m`, `mute 2h`, `mute 1d`, `mute until 18:00`',
        '`unmute`',
        '`status`',
        '`report`, `report today`, `report yesterday`, `report 2026-04-26`, `report last 6h`',
    ].join('\n');
}

async function handleCommand(text, userName) {
    const commandText = cleanCommandText(text);
    const [command, ...restParts] = commandText.split(/\s+/);
    const rest = restParts.join(' ').trim();

    switch ((command || '').toLowerCase()) {
        case 'mute': {
            const mutedUntil = parseMuteUntil(rest);
            if (!mutedUntil) {
                return `Could not parse mute duration.\n${helpText()}`;
            }
            const mute = alertState.setMute(mutedUntil, userName || '', '');
            return `Muted alerts until ${new Date(mute.mutedUntil).toLocaleString()}. Daily and on-demand reports will still send.`;
        }
        case 'unmute':
            alertState.clearMute();
            return 'Alerts are unmuted.';
        case 'status':
            return formatMute(alertState.getMute());
        case 'report': {
            const range = rangeForPreset(rest || 'today');
            if (!range) {
                return `Could not parse report range.\n${helpText()}`;
            }
            return buildReport(range).text;
        }
        case 'help':
            return helpText();
        default:
            return helpText();
    }
}

function timingSafeEqual(a, b) {
    const aBuffer = Buffer.from(a || '');
    const bBuffer = Buffer.from(b || '');
    return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifySlackRequest(req) {
    if (config.slack_signing_secret) {
        const timestamp = req.get('x-slack-request-timestamp');
        const signature = req.get('x-slack-signature');
        if (!timestamp || !signature) return false;
        if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp)) > 60 * 5) return false;

        const sigBase = `v0:${timestamp}:${req.rawBody ? req.rawBody.toString() : ''}`;
        const digest = `v0=${crypto.createHmac('sha256', config.slack_signing_secret).update(sigBase).digest('hex')}`;
        return timingSafeEqual(digest, signature);
    }

    if (config.slack_command_token) {
        return req.body && req.body.token === config.slack_command_token;
    }

    return true;
}

function isAllowedChannel(channel) {
    return !config.slack_channel || config.slack_channel === '1' || channel === config.slack_channel;
}

async function commandEndpoint(req, res) {
    if (!verifySlackRequest(req)) {
        return res.status(401).json({ error: 'Invalid Slack signature' });
    }

    if (!isAllowedChannel(req.body.channel_id)) {
        return res.status(200).json({
            response_type: 'ephemeral',
            text: 'BeamUp alert commands are not enabled in this channel.',
        });
    }

    const text = req.body.text || '';
    const response = await handleCommand(text, req.body.user_name || req.body.user_id);
    return res.status(200).json({
        response_type: 'in_channel',
        text: response,
    });
}

async function eventsEndpoint(req, res) {
    if (!verifySlackRequest(req)) {
        return res.status(401).json({ error: 'Invalid Slack signature' });
    }

    if (req.body.type === 'url_verification') {
        return res.status(200).json({ challenge: req.body.challenge });
    }

    const event = req.body.event || {};
    if (event.bot_id || !event.text) {
        return res.status(200).json({ ok: true });
    }

    if (!isAllowedChannel(event.channel)) {
        return res.status(200).json({ ok: true });
    }

    if (!['app_mention', 'message'].includes(event.type) || !isCommandMessage(event.text)) {
        return res.status(200).json({ ok: true });
    }

    const response = await handleCommand(event.text, event.user);
    slack.say(response);
    return res.status(200).json({ ok: true });
}

module.exports = {
    commandEndpoint,
    eventsEndpoint,
    handleCommand,
};

const crypto = require('crypto');
const config = require('./config');
const alertState = require('./alertState');
const slack = require('./slack');
const { buildReport, rangeForPreset } = require('./slackReport');

const MAX_MUTE_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_EVENT_LIMIT = 1000;
const recentEventIds = new Map();

function parseDuration(text) {
    const match = text.match(/^(\d+)\s*([mhd])$/i);
    if (!match) return false;

    const amount = parseInt(match[1], 10);
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
    const until = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(untilMatch[1], 10), parseInt(untilMatch[2], 10), 0, 0);
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
    return (text || '').replace(/^<@[A-Z0-9]+>\s*/i, '').trim();
}

function helpText() {
    return [
        'Commands:',
        '`mute 30m`, `mute 2h`, `mute 1d`, `mute until 18:00` (max 7d)',
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
                return { text: `Could not parse mute duration.\n${helpText()}`, public: false };
            }
            if (mutedUntil - Date.now() > MAX_MUTE_MS) {
                return { text: 'Maximum mute duration is 7 days.', public: false };
            }
            const mute = alertState.setMute(mutedUntil, userName || '', '');
            return {
                text: `Muted alerts until ${new Date(mute.mutedUntil).toLocaleString()}. Daily and on-demand reports will still send.`,
                public: true,
            };
        }
        case 'unmute':
            alertState.clearMute();
            return { text: 'Alerts are unmuted.', public: true };
        case 'status':
            return { text: formatMute(alertState.getMute()), public: false };
        case 'report': {
            const range = rangeForPreset(rest || 'today');
            if (!range) {
                return { text: `Could not parse report range.\n${helpText()}`, public: false };
            }
            return { text: buildReport(range).text, public: true };
        }
        case 'help':
        default:
            return { text: helpText(), public: false };
    }
}

function timingSafeEqual(a, b) {
    const aBuffer = Buffer.from(a || '');
    const bBuffer = Buffer.from(b || '');
    return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifySlackRequest(req) {
    if (!config.slack_signing_secret) return false;

    const timestamp = req.get('x-slack-request-timestamp');
    const signature = req.get('x-slack-signature');
    if (!timestamp || !signature) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)) > 60 * 5) return false;

    const sigBase = `v0:${timestamp}:${req.rawBody ? req.rawBody.toString() : ''}`;
    const digest = `v0=${crypto.createHmac('sha256', config.slack_signing_secret).update(sigBase).digest('hex')}`;
    return timingSafeEqual(digest, signature);
}

function isAllowedChannel(channel) {
    return !!config.slack_channel && channel === config.slack_channel;
}

function isDuplicateEvent(eventId) {
    if (!eventId) return false;
    if (recentEventIds.has(eventId)) return true;
    recentEventIds.set(eventId, Date.now());
    while (recentEventIds.size > RECENT_EVENT_LIMIT) {
        const oldest = recentEventIds.keys().next().value;
        recentEventIds.delete(oldest);
    }
    return false;
}

async function eventsEndpoint(req, res) {
    if (!verifySlackRequest(req)) {
        return res.status(401).json({ error: 'Invalid Slack signature' });
    }

    if (req.body.type === 'url_verification') {
        return res.status(200).json({ challenge: req.body.challenge });
    }

    if (isDuplicateEvent(req.body.event_id)) {
        return res.status(200).json({ ok: true });
    }

    res.status(200).json({ ok: true });

    const event = req.body.event || {};
    if (event.type !== 'app_mention') return;
    if (event.bot_id || event.subtype === 'bot_message' || !event.text) return;
    if (!isAllowedChannel(event.channel)) return;

    try {
        const { text } = await handleCommand(event.text, event.user);
        slack.say(text);
    } catch (e) {
        console.error('Slack event handling error:', e);
    }
}

module.exports = {
    eventsEndpoint,
    handleCommand,
};

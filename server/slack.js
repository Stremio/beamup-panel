const { WebClient } = require('@slack/web-api');
const config = require('./config');

const client = config.slack_bot_token ? new WebClient(config.slack_bot_token) : null;

function fixResponse(text) {
	text = text.replace(/```[^]*?\n/g, '```\n')
	if (text.startsWith('"') && text.endsWith('"'))
		text = text.substr(1, text.length - 2)
	return text
}

function say(text, files) {
	if (!client) {
		console.error('slack.say: SLACK_BOT_TOKEN not configured');
		return;
	}
	const cleanText = fixResponse(text);
	if (Array.isArray(files) && files.length) {
		client.files.uploadV2({
			channel_id: config.slack_channel,
			initial_comment: cleanText,
			file_uploads: files.map(f => ({
				file: f.buffer,
				filename: f.filename,
				title: f.title || f.filename,
			})),
		}).catch(e => {
			console.error('slack.say (uploadV2) failed:', e.data || e.message || e);
		});
		return;
	}
	client.chat.postMessage({
		channel: config.slack_channel,
		text: cleanText,
	}).catch(e => {
		console.error('slack.say (postMessage) failed:', e.data || e.message || e);
	});
}

module.exports = {
	say,
}

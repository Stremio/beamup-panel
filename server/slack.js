const fetch = require("node-fetch");
const config = require('./config');

// we use the legacy slack webhooks to send messages to slack channels
// because the new app webhooks seem to always send to #general and
// do not support changing avatar image and bot name per each req

function fixResponse(text) {
	// remove programming language title after ```, slack does not support it
	text = text.replace(/```[^]*?\n/g, '```\n')
	// gpt-4 adds quotes around responses when responding with alternative mindset
	if (text.startsWith('"') && text.endsWith('"'))
		text = text.substr(1, text.length -2)
	return text
}

function say(text) {
	fetch(config.slack_webhook, {
		method: 'POST',
		headers: { 'Content-type': 'application/json' },
		body: JSON.stringify({
			channel: config.slack_channel,
			text: fixResponse(text),
		}),
	})
	.then(d => {})
	.catch(e => { console.error(e) })
}

module.exports = {
	say,
}

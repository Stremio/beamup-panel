const JSONStore = require('atomic-json-store')
const crypto = require('crypto')

const config = require('./config')

const sessionsFolder = config.sessions_folder || '../'

// This may throw if default options are provided
const sessions = JSONStore(sessionsFolder + 'sessions.json')

const sessionExpire = parseInt(config.session_expire || 30 * 24 * 60 * 60 * 1000)

// clean up
sessions.keys().forEach(token => {
	const data = sessions.get(token)
	if (data && data?.expire < Date.now())
		sessions.delete(token)
})

module.exports = {
	create: data => {
		let token
		do { token = crypto.randomUUID() } while (sessions.get(token))
		data.expire = Date.now() + sessionExpire
		data.refresh = Date.now() + config.session_refresh_interval
		try {
			sessions.set(token, data)
		} catch(e) {
			console.error('Could not create session', e)
			return false
		}
		return token
	},
	get: token => {
		try {
			const data = sessions.get(token)
			if (data) {
				if(data.expire < Date.now()) {
					sessions.delete(token)
					return false
				}
				if (data.refresh < Date.now()) {
					data.expire = Date.now() + sessionExpire
					data.refresh = Date.now() + config.session_refresh_interval
					sessions.set(token, data)
				}
			}
			return data
		} catch(e) {
			console.error('Could not get session', e)
			return false
		}
	},
	delete: token => {
		try {
			sessions.delete(token)
		} catch(e) {
			console.error('Could not remove session', e)
			return false
		}
		return true
	}
}

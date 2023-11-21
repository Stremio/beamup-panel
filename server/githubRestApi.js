const fetch = require("node-fetch");

const getUserData = (access_token) => {
	return fetch(`https://api.github.com/user`, {
		headers: {
			Authorization: `token ${access_token}`,
		},
	}).then((response) => response.json())
}

module.exports = {
	getUserData,
}

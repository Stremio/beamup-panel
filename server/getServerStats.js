const {exec} = require('child_process');
const getSSHCommand = require('./getSSHCommand');

function getServerStats(swarmNode) {
	return new Promise((resolve, reject) => {
		exec(getSSHCommand(swarmNode, 'server-stats'), (err, stdout, stderr) => {
			if (err) {
				return reject(err);
			}
			let stats = {};
			try{
				stats = JSON.parse(stdout);
			}catch(err){
				return reject(err);
			}
			resolve(stats);
		});
	});
}

module.exports = getServerStats
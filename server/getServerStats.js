const {exec} = require('child_process');
const getSSHCommand = require('./getSSHCommand');

function getServerStats(swarmNode) {
	return new Promise((resolve, reject) => {
		exec(getSSHCommand(swarmNode, 'server-stats'), (err, stdout, stderr) => {
			if (err) {
				console.error(`Err: error getting server stats from ${swarmNode}`);
			}
			let stats = {};
			try{
				stats = JSON.parse(stdout);
			}catch(err){
				console.error(`Err: error parsing server stats from ${swarmNode}`);
			}
			resolve(stats);
		});
	});
}

module.exports = getServerStats
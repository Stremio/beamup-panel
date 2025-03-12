const {exec} = require('child_process');

function getServerStats(swarmNode) {
	return new Promise((resolve, reject) => {
		exec(`ssh ${swarmNode} server-stats`, (err, stdout, stderr) => {
			if (err) {
				reject(err);
			}
			let stats = {};
			try{
				stats = JSON.parse(stdout);
			}catch(err){
				reject(err);
			}
			resolve(stats);
		});
	});
}

module.exports = getServerStats
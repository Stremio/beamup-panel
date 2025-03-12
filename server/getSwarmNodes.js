const {exec} = require('child_process');
const {manager_node} = require('./config');

function getSwarmNodes() {
    return new Promise((resolve, reject) => {
        exec(`ssh ${manager_node} swarm-nodes`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            const nodes = stdout.split('\n').slice(1).filter(line => line.trim() !== '').map(line => {
                const [id, hostname, status, availability, managerStatus, engineVersion] = line.split(/\s{2,}/);
                return { id, hostname, status, availability, managerStatus, engineVersion };
            });
            resolve(nodes);
        });
    });
}

module.exports = getSwarmNodes;
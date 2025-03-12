const {exec} = require('child_process');
const config = require('./config');
const getSSHCommand = require('./getSSHCommand');

function getSwarmNodes() {
    return new Promise((resolve, reject) => {
        exec(getSSHCommand(config.node_manager, 'swarm-nodes'), (err, stdout, stderr) => {
            if (err) {
                reject(err);
                return;
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

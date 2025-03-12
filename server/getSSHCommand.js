const config = require('./config');

function getSSHCommand(nodeHost, command) {
    let SSH_command = 'ssh -T';
    if (config.node_ssh_key) {
        SSH_command += ` -i ${config.node_ssh_key}`;
    }
    if (config.node_ssh_port) {
        SSH_command += ` -p ${config.node_ssh_port}`;
    }
    SSH_command += ` ${config.node_ssh_user}@${nodeHost} ${command}`;
    return SSH_command
}

module.exports = getSSHCommand;
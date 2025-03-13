const config = require('./config');

function getSSHCommand(nodeHost, command, string=true) {
    let SSH_command = ['ssh', '-T'] 
    if (config.node_ssh_key) {
        SSH_command.push('-i');
        SSH_command.push(config.node_ssh_key);
    }
    if (config.node_ssh_port) {
        SSH_command.push(`-p ${config.node_ssh_port}`);
    }
    SSH_command.push(`${config.node_ssh_user}@${nodeHost}`);
    SSH_command.push(command);
    if (string) {
        return SSH_command.join(' ')
    }else {
        return {command:SSH_command[0],args:SSH_command.slice(1)}
    }
    
}


module.exports = getSSHCommand;
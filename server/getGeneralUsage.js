const { exec } = require('child_process');
const slack = require('./slack')
const getSwarmNodes = require('./getSwarmNodes');
const config = require('./config');
const getSSHCommand = require('./getSSHCommand');
const deletingState = require('./deletingState');

function get3largestIdx(arr) {
    let fst = -Infinity, sec = -Infinity, thd = -Infinity
    let fstIdx = -1, secIdx = -1, thdIdx = -1

    arr.forEach((x, idx) => {
        if (x > fst) {
            thd = sec
            thdIdx = secIdx
            sec = fst
            secIdx = fstIdx
            fst = x
            fstIdx = idx
        }
        else if (x > sec && x !== fst) {
            thd = sec
            thdIdx = secIdx
            sec = x
            secIdx = idx
        }
        else if (x > thd && x !== sec && x !== fst) {
            thd = x
            thdIdx = idx
        }
    });

    let res = []
    if (fstIdx > -1) res.push(fstIdx)
    if (secIdx > -1) res.push(secIdx)
    if (thdIdx > -1) res.push(thdIdx)

    return res
}

let warningsHistory = {};
let lastMsgTime = null;

const checkWarnings = (nodeHost, serverUsage) => {
    if(!serverUsage) return;
    if (!warningsHistory[nodeHost])
        warningsHistory[nodeHost] = [];

    const isDanger = serverUsage?.cpu > 0.93 || serverUsage?.mem > 0.9 || serverUsage?.hdd > 0.93;
    const isWarning = serverUsage?.cpu > 0.84 || serverUsage?.mem > 0.8 || serverUsage?.hdd > 0.84;
    const issueType = isDanger ? 'Danger' : isWarning ? 'Warning' : false;
    if(!issueType){
        warningsHistory[nodeHost].pop();
    } else {
        const types = ['cpu', 'mem', 'hdd'];
        const vals = [serverUsage?.cpu, serverUsage?.mem, serverUsage?.hdd];
        const maxNum = Math.max.apply(null, vals);
        const idx = vals.indexOf(maxNum);
        const issueWith = types[idx];
        let msg = `${issueType} on server ${nodeHost}, CPU: ${serverUsage?.cpu}, MEM: ${serverUsage?.mem}, HDD: ${serverUsage?.hdd}\n`;
        if (['cpu', 'mem'].includes(issueWith) && Array.isArray(serverUsage.containers) && serverUsage.containers.length) {
            const containersUsage = serverUsage.containers.map(el => {
                const val = el[issueWith === 'cpu' ? 'CPUPerc' : 'MemPerc'];
                return val ? parseFloat(val) / 100 : 0;
            });
            const largest3idx = get3largestIdx(containersUsage);
            largest3idx.forEach(containerIdx => {
                msg += `${serverUsage.containers[containerIdx].Name} project using CPU: ${serverUsage.containers[containerIdx]['CPUPerc']}, MEM: ${serverUsage.containers[containerIdx]['MemPerc']}\n`;
            });
        }
        warningsHistory[nodeHost].unshift(serverUsage);
        if (warningsHistory[nodeHost].length >= config.slack_warnings_minimum) {
            if (Date.now() - lastMsgTime > config.slack_warnings_cooldown) {
                lastMsgTime = Date.now();
                slack.say(msg);
            } 
            warningsHistory[nodeHost].length = 0;
        }
    }
}

const getServerUsage = (nodeHost) => {
	return new Promise(async (resolve) => {
		exec(getSSHCommand(nodeHost, 'server-stats'), (error, stdout, stderr) => {
            if (error || !stdout) {
                console.error(`Error executing command to get swarm resource usage: ${error}`);
                resolve(false)
                return
            }
            let serverUsage = false
            try {
            	serverUsage = JSON.parse(stdout.trim())
            } catch(e) {
                console.error(`Error executing command to get swarm resource usage: ${e?.message}`);
                resolve(false)
                return
            }
            // check server usage and projects usage
            checkWarnings(nodeHost, serverUsage);
            resolve(serverUsage)
		})
	})	
}

const getGeneralUsage = () => {
	return new Promise(async (resolve) => {

		const nodes = await getSwarmNodes()

        const servers = []
        let projects = []
        for (let i = 0; i < nodes.length; i++) {
        	const serverData = await getServerUsage(config.node_prefix + i)
        	if (serverData) {
                serverData.serverIndex = i;
            	if (Array.isArray(serverData.containers) && serverData.containers.length) {
            		const containers = serverData.containers.filter(el => !!el['MemPerc'])
            		projects = projects.concat(containers)
            	}
            	delete serverData.containers
            	servers.push(serverData)
            }
        }
        if (!projects.length) {
            resolve({ servers, projects })
        } else {
            exec(getSSHCommand(config.node_manager, 'projects'),
                (err, stdout, stderr) => {

                    if (err) {
                        console.log(`err: ${err} ${err.message} ${err.toString()}`)
                        return resolve()
                    }

                    if (stderr) {
                        console.log('stderr')
                        console.log(stderr)
                        return resolve()
                    }

                    const tempProjects = []
                    if (stdout) {
                        stdout.split(String.fromCharCode(10)).forEach((line, count) => {
                            if(!(count && line)) return; // ignore first line
                            const parts = line.replace(/[ \t]{2,}/g, '||').split('||')
                            const name = parts[1].split('.')[0].replace('beamup_', '')
                            const replicas = parts[3] || ''
                            const running = parseInt(parts[3].split('/')[0])
                            const total = parseInt(parts[3].split('/')[1])
                            const status = deletingState.has(name) ? 'deleting' : replicas.startsWith('0/') || running < total ? 'failing' :  'running'
                            const project = projects.find(el => {
                                return el.Name === name
                            })
                            if(!project){
                                return tempProjects.push({ id: parts[0], replicas, name, status });
                            }
                            // {"BlockIO":"6.73GB / 33.6GB","CPUPerc":"0.27%","Container":"97db8f91703a","ID":"97db8f91703a","MemPerc":"0.29%","MemUsage":"46.05MiB / 15.63GiB","Name":"nginx","NetIO":"8.25GB / 12.4GB","PIDs":"8"}
                            tempProjects.push({
                                id: parts[0],
                                replicas,
                                name,
                                status,
                                node: project.node,
                                serviceId: project.Container,
                                cpu: project.CPUPerc,
                                memUsage: project.MemUsage,
                                memPerc: project.MemPerc,
                                netIO: project.NetIO,
                                blockIO: project.BlockIO,
                                Size: project.Size,
                            })
                        
                        
                        })
                    }
                    // check if any project was deleted
                    const deleting = deletingState.getAll()
                    for (let i = 0; i < deleting.length; i++) {
                        const foundProj = tempProjects.find(el => {
                            return el.name === deleting[i]
                        })
                        if (!foundProj)
                            deletingState.remove(deleting[i])
                    }
                    resolve({ servers, projects: tempProjects })
                })
        }
	})
}

module.exports = getGeneralUsage

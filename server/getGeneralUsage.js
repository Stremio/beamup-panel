const { exec } = require('child_process');

const getServerUsage = (serverId) => {
	return new Promise(async (resolve) => {
		exec(`ssh -T -i /home/dokku/.ssh/id_ed25519_sync beamup@stremio-beamup-swarm-${serverId+1} server-stats`, (error, stdout, stderr) => {
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
            resolve(serverUsage)
		})
	})	
}

const getGeneralUsage = (deleting) => {
	return new Promise(async (resolve) => {
		exec('docker node ls | grep -i Reachable | wc -l', async (error, stdout, stderr) => {
            if (error || !stdout) {
                console.error(`Error executing command to get swarm size: ${error}`);
                resolve(false);
                return
            }
            const swarmSize = parseInt(stdout.trim());
            const servers = []
            let projects = []
            for (let i = 0; i++; i < swarmSize) {
            	const serverData = await getServerUsage(i)
            	if (serverData) {
	            	if (Array.isArray(serverData.containers) && serverData.containers.length) {
	            		const containers = serverData.containers.filter(el => !!el.mem)
	            		projects = projects.concat(containers)
	            	}
	            	delete serverData.containers
	            	servers.push(serverData)
	            }
            }
            if (!projects.length) {
	            resolve({ servers, projects })
            } else {
	            cp.exec(
	                `docker service ls`,
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

	                    if (stdout) {

	                        const tempProjects = []

	                        stdout.split(String.fromCharCode(10)).forEach((line, count) => {
	                            if (count && line) { // ignore first line
	                                const parts = line.replace(/[ \t]{2,}/g, '||').split('||')
	                                const name = parts[1].split('.')[0].replace('beamup_', '')
	                                const replicas = parts[3] || ''
	                                const running = parseInt(parts[3].split('/')[0])
	                                const total = parseInt(parts[3].split('/')[1])
	                                const status = deleting.includes(name) ? 'deleting' : replicas.startsWith('0/') || running < total ? 'failing' :  'running'
	                                const project = projects.find(el => {
	                                	return el.name === name
	                                })
	                                if (project) {
	                                	// {"name":"nginx","cpu":0.4,"mem":0.31,"netIO":"7.93GB / 12GB","blockIO":"6.37GB / 32.1GB","pids":8}
		                                tempProjects.push({ id: parts[0], replicas, name, status, cpu: project.cpu, mem: project.mem, netIO: project.netIO, blockIO: project.blockIO, pids: project.pids })
	                                } else {
		                                tempProjects.push({ id: parts[0], replicas, name, status })
		                            }
	                            }
	                        })
	                    }

	                    resolve({ servers, projects: tempProjects })
	                })
	        }
		})
	})
}

module.exports = getGeneralUsage

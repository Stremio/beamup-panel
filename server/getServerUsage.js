const getMemUsage = require('./getMemUsage')
const getCpuUsage = require('./getCpuUsage')
const getHddUsage = require('./getHddUsage')

const getServerUsage = () => {
	return new Promise(async (resolve) => {
		const memUsage = await getMemUsage()
		const cpuUsage = await getCpuUsage()
		const hddUsage = await getHddUsage()

		resolve({
			mem: memUsage?.mem,
			swap: memUsage?.swap,
			cpu: cpuUsage?.cpu,
			hdd: hddUsage?.hdd,
		})
	})
}

module.exports = getServerUsage

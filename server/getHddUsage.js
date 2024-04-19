const { exec } = require('child_process')

function getHddUsage() {
    return new Promise((resolve) => {
        exec(
            `df -k`,
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

                    let hddUsagePerc = 0

                    stdout.split(String.fromCharCode(10)).find((line, count) => {
                        if (count && line) { // ignore first line
                            const parts = line.replace(/[ \t]{2,}/g, '||').replace(/ /g, '||').split('||')
                            if (parts[5] === '/') {
                                hddUsagePerc = parseInt(parts[4]) / 100
                                return true;
                            }
                        }
                    })

                    resolve({ hdd: hddUsagePerc })
                }
            })
        })
}

module.exports = getHddUsage

const { exec } = require('child_process');

function getMemoryUsage() {
    return new Promise((resolve) => {
        exec('free -m', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error}`);
                resolve('unknown');
            }
            const lines = stdout.split('\n');
            const header = lines[0].split(/\s+/);
            const valuesMem = lines[1].split(/\s+/).slice(1);

            if (header.length > valuesMem.length) {
                header.shift();
            }

            const memory = {};

            for (let i = 0; i < header.length; i++) {
                memory[header[i]] = parseInt(valuesMem[i]);
            }

            const valuesSwap = lines[2].split(/\s+/).slice(1);

            const swap = {};
            for (let i = 0; i < header.length; i++) {
                swap[header[i]] = parseInt(valuesSwap[i]);
            }

            // interpret memory usage
            const totalMemory = memory['total'];
            const usedMemory = memory['used'];

            const totalSwapMem = swap['total'];
            const usedSwapMem = swap['used'];

            resolve({
                mem: usedMemory / totalMemory,
                swap: usedSwapMem / totalSwapMem,
            });

        });
    })
}

module.exports = getMemoryUsage;

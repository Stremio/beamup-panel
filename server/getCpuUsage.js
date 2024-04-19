const _os = require('os');

function getCPUInfo(callback){ 
    const cpus = _os.cpus();
    
    let user = 0;
    let nice = 0;
    let sys = 0;
    let idle = 0;
    let irq = 0;
    let total = 0;
    
    for(const cpu in cpus){
        if (!cpus.hasOwnProperty(cpu)) continue;    
        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys += cpus[cpu].times.sys;
        irq += cpus[cpu].times.irq;
        idle += cpus[cpu].times.idle;
    }
    
    const total = user + nice + sys + idle + irq;
    
    return {
        'idle': idle,
        'total': total
    };
}

function getCPUUsage(callback, free){ 
    
    const stats1 = getCPUInfo();
    const startIdle = stats1.idle;
    const startTotal = stats1.total;
    
    setTimeout(function() {
        const stats2 = getCPUInfo();
        const endIdle = stats2.idle;
        const endTotal = stats2.total;
        
        const idle    = endIdle - startIdle;
        const total   = endTotal - startTotal;
        const perc    = idle / total;
        
        if(free === true)
            callback( perc );
        else
            callback( (1 - perc) );
            
    }, 1000 );
}

module.exports = () => {
    return new Promise((resolve) => {
        getCPUUsage((perc) => {
            resolve({ cpu: perc })
        }, false);
    })
}

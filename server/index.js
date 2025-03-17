const express = require("express");
const bodyParser = require("body-parser");
const FormData = require("form-data");
const fetch = require("node-fetch");
const cookieSession = require('cookie-session')
const cp = require('child_process')
const fs = require('fs')
const PATH = require('path')
const { client_id, client_secret } = require("./config");
const githubRestApi = require('./githubRestApi')
const sessions = require('./sessions')

const getSSHCommand = require('./getSSHCommand');
const getGeneralUsage = require('./getGeneralUsage')

const config = require("./config");

const app = express();

app.use(
    bodyParser.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    }),
);
app.use(bodyParser.json({ type: 'text/*' }));
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
    cookieSession({
        name: 'token',
        keys: [''],
        sameSite: 'Lax',
        maxAge: config.session_expire,
        secure: false,
    }),
);

app.post('/logout', (req, res) => {
    if (sessions.delete(req.session.token)) {
        req.session = null;
        res.redirect(303, '/auth');
    } else {
        res.redirect(303, `/auth?errMessage=${encodeURIComponent('Log out failed')}`);
    }
});
app.get('/login', (req, res) => {
    if (req.query.code) {
        auth(req, res);
    } else if (req.query.redirect_uri) {
        res.redirect(`https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${req.query.redirect_uri}`);
    }
});

app.get('/getUserInfo', protectedRoute, async (req, res) => {
    const userData = res.locals.userData;
    return res.status(200).json({
        ...userData,
    });
});

function protectedRoute(req, res, next) {
    // Check for valid session
    res.locals.userData = sessions.get(req.session?.token);
    if (res.locals.userData) {
        req.session.nowInMinutes = Math.floor(Date.now() / config.session_refresh_interval);
        next();
    } else {
        res.status(403).json({ errMessage: 'Invalid credentials' });
    }
}

app.get('/getProjects', protectedRoute, async (req, res) => {
    const login = res.locals.userData.login;

    try {
        return res.status(200).json(projects.filter(proj => userHasProject(login, proj.name)))
    } catch (e) {
        return res.status(500).json({ errMessage: (e || {}).message || 'Unknown Error' });
    }
});

let lastServerUsage = []

app.get('/getLastServerUsage', protectedRoute, async (req, res) => {
    return res.status(200).json(lastServerUsage)
})

app.get('/getServerUsage', async (req, res) => {
    const srv = parseInt(req.query.server);
    let serverUsageHistory = []
    try {
        serverUsageHistory = JSON.parse(fs.readFileSync(PATH.join(sessionsFolder, 'servers_usage_history.json')))
    } catch(e) {}
    if (!serverUsageHistory[srv] || !serverUsageHistory[srv].length) {
        const dummySrvData = [
            {
                mem: 0,
                swap: 0,
                cpu: 0,
                hdd: 0,
                timestamp: Date.now(),
            }
        ]
        return res.status(200).json(dummySrvData)
    }
    return res.status(200).json(serverUsageHistory[srv])
})

app.get('/getProjectUsage', protectedRoute, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {
        let projectUsageHistory = []
        try {
            projectUsageHistory = JSON.parse(fs.readFileSync(PATH.join(sessionsFolder, 'project_usage_history.json')))
        } catch(e) {}
        if (!projectUsageHistory.length) {
            return res.status(500).json({ errMessage: 'No items in history' })
        }
        const projectUsage = []
        projectUsageHistory.forEach(hist => {
            const projs = hist?.snapshot || []
            projs.find(el => {
                if (el.name === proj) {
                    el.timestamp = hist.timestamp
                    projectUsage.push(el)
                    return true
                }
                return false
            })
        })
        return res.status(200).json(projectUsage)
    } else {
        return res.status(500).json({ errMessage: 'You do not have access to this project' });
    }
})

function userHasProject(login, proj) {
    return login && proj && proj.startsWith(getUserHash(login)+'-') && projects.find(el => el.name === proj)
}

app.get('/getLogs', protectedRoute, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {

        const {command, args} = getSSHCommand(config.node_manager, `project-logs ${proj}`, false)
        const spw = cp.spawn(command, args)
        
        const send = (data) => {
          res.write(data.toString() + '\n')
        }

        res.set({
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="logs-${proj}-${Date.now()}.txt"`,
        })

        spw.stdout.on('data', send)
        spw.stderr.on('data', send)

        spw.on('close', function (code) {
            res.end()
        })
    } else {
        return res.status(500).json({ errMessage: 'You do not have access to this project' });
    }
});

const deletingState = require('./deletingState')

app.get('/doDelete', protectedRoute, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {
        deletingState.add(proj);
        let lastKnownStatus = 'running'
        const project = projects.find(el => el.name === proj);
        if(!project){
            return res.end()
        }
        
        lastKnownStatus = project.status
        project.status = 'deleting'

        const spw = cp.spawn("beamup-delete-addon", ["--force", proj])
        let success = false;
        const testString = 'Addon removal process completed successfully';
        const send = (data) => {
            if(data.toString().includes(testString)){
                success = true;
            }
          res.write(data.toString())
        }

        res.set({
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked'
        })
        let err = ''
        spw.stdout.on('data', send)
        spw.stderr.on('data', send)
        spw.stderr.on('data', (data)=>{
            err += data.toString();
        })

        spw.on('close', function (code) {
            if(success){
                projects = projects.filter(el => el.name !== proj)
            }else{
                console.log(`addon remove err: ${err}`);
                project.status = lastKnownStatus

            }
            res.end()
        })
    } else {
        return res.status(500).json({ errMessage: 'You do not have access to this project' });
    }
});

app.get('/doRestart', protectedRoute, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {

        const {command, args} = getSSHCommand(config.node_manager, `project-update ${proj}`, false)
        const spw = cp.spawn(command, args)
        
        const send = (data) => {
          res.write(data.toString() + '\n')
        }

        res.set({
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked'
        })

        spw.stdout.on('data', send)
        spw.stderr.on('data', send)
        spw.on('close', function (code) {
            res.end()
        })
    } else {
        return res.status(500).json({ errMessage: 'You do not have access to this project' });
    }
});

let projects = []

const SHA256 = require('crypto-js/sha256')

function getUserHash(githubLogin) {
    return SHA256(githubLogin.toLowerCase()+'\n').toString().substr(0, 12)
}

function auth(req, res) {
    const code = req.query.code;
    const data = new FormData();
    data.append('client_id', client_id);
    data.append('client_secret', client_secret);
    data.append('code', code);

    // Request to exchange code for an access token
    fetch(`https://github.com/login/oauth/access_token`, {
        method: 'POST',
        body: data,
    })
        .then((response) => response.text())
        .then(async (paramsString) => {

            let params = new URLSearchParams(paramsString);
            const access_token = params.get('access_token');

            // Request to return data of a user that has been authenticated
            const userData = await githubRestApi.getUserData(access_token);

            // const allowed = ['jaruba'];

            if (projects.find(proj => (proj.name || '').startsWith(getUserHash(userData.login)))) {
                // has deployment on beamup

                const userToken = sessions.create({
                    login: userData.login,
                    avatar_url: userData.avatar_url,
                    name: userData.name,
                });
                
                req.session.token = userToken;
                return res.redirect('/');
            } else {
                const errMessage = `You did not deploy any project to BeamUp`;
                return res.redirect(`/auth?errMessage=${encodeURIComponent(errMessage)}`);
            }
        })
        .catch((error) => {
            console.error(error);
            const errMessage = 'Login failed';
            return res.redirect(`/auth?errMessage=${encodeURIComponent(errMessage)}`);
        });
}

if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    const static_path = path.resolve(path.join(__dirname, '..', 'build'));
    app.use(express.static(static_path));
    app.get('*', (req, res) => {
        res.sendFile(path.join(static_path, 'index.html'));
    });
} else {
    const proxy = require('express-http-proxy');
    app.get('*', proxy(`http://localhost:${process.env.REACT_APP_PORT || 3000}`));
}

const PORT = process.env.SERVER_PORT || process.env.REACT_APP_SERVER_PORT || 5000;

app.listen(PORT, () => {
    console.log(`BeamUp Panel running at http://localhost:${PORT}`);
});

const sessionsFolder = config.sessions_folder || '../'

const logUsage = () => {
    async function updateServerUsage() {
        let serverUsageHistory = []
        try {
            serverUsageHistory = JSON.parse(fs.readFileSync(PATH.join(sessionsFolder, 'servers_usage_history.json')))
        } catch(e) {}
        const generalUsage = await getGeneralUsage()
        if(!generalUsage){
            // TODO: handle when the response is undefined or empty 
        }
        projects = generalUsage.projects
        const serversUsage = generalUsage.servers
        for (let i = 0; i < serversUsage.length; i++) {
            serversUsage[i].timestamp = Date.now()
            const serverIndex = serversUsage[i].serverIndex;
            if (!serverUsageHistory[serverIndex]) serverUsageHistory[serverIndex] = []
            serverUsageHistory[serverIndex].unshift(serversUsage[i]);
            const maxEntries = ((1 * 24 * 60 * 60 * 1000) / config.usage_interval) * config.server_usage_history_days
            if (serverUsageHistory[serverIndex].length > maxEntries) {
                serverUsageHistory[serverIndex] = serverUsageHistory[serverIndex].slice(0, maxEntries)
            }
        }
        lastServerUsage = serversUsage
        fs.writeFileSync(PATH.join(sessionsFolder, 'servers_usage_history.json'), JSON.stringify(serverUsageHistory))
        if (Array.isArray(projects) && projects.length) {
            projects = generalUsage.projects
            let projectUsageHistory = []
            try {
                projectUsageHistory = JSON.parse(fs.readFileSync(PATH.join(sessionsFolder, 'project_usage_history.json')))
            } catch(e) {}
            projectUsageHistory.unshift({
                timestamp: Date.now(),
                snapshot: projects,
            })
            const maxEntries = ((1 * 24 * 60 * 60 * 1000) / config.usage_interval) * config.project_usage_history_days
            if (projectUsageHistory.length > maxEntries) {
                projectUsageHistory = projectUsageHistory.slice(0, maxEntries)
            }
            fs.writeFileSync(PATH.join(sessionsFolder, 'project_usage_history.json'), JSON.stringify(projectUsageHistory))
        }
    }
    updateServerUsage()
    setTimeout(() => {
        logUsage()
    }, config.usage_interval)
}

logUsage()

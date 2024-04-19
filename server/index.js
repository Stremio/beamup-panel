const express = require("express");
const bodyParser = require("body-parser");
const FormData = require("form-data");
const fetch = require("node-fetch");
const cookieSession = require('cookie-session')
const cp = require('child_process')
const fs = require('fs')
const { client_id, client_secret } = require("./config");
const githubRestApi = require('./githubRestApi')
const sessions = require('./sessions')
const slack = require('./slack')

const getServerUsage = require('./getServerUsage')

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

app.get('/getUserInfo', protected, async (req, res) => {
    const userData = res.locals.userData;
    return res.status(200).json({
        ...userData,
    });
});

function protected(req, res, next) {
    // Check for valid session
    res.locals.userData = sessions.get(req.session?.token);
    if (res.locals.userData) {
        req.session.nowInMinutes = Math.floor(Date.now() / config.session_refresh_interval);
        next();
    } else {
        res.status(403).json({ errMessage: 'Invalid credentials' });
    }
}

app.get('/getProjects', protected, async (req, res) => {
    const login = res.locals.userData.login;

    try {
        await getProjects()
        return res.status(200).json(projects.filter(proj => userHasProject(login, proj.name)))
    } catch (e) {
        return res.status(500).json({ errMessage: (e || {}).message || 'Unknown Error' });
    }
});

app.get('/getServerUsage', protected, async (req, res) => {
    let serverUsageHistory = []
    try {
        serverUsageHistory = JSON.parse(fs.readFileSync(sessionsFolder + 'server_usage_history.json'))
    } catch(e) {}
    if (!serverUsageHistory.length) {
        serverUsageHistory = [
            {
                mem: 0,
                swap: 0,
                cpu: 0,
                hdd: 0,
                timestamp: Date.now(),
            }
        ]
    }
    return res.status(200).json(serverUsageHistory)
})

function userHasProject(login, proj) {
    return login && proj && proj.startsWith(getUserHash(login)+'-') && projects.find(el => el.name === proj)
}

app.get('/getLogs', protected, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {
        // 'docker service logs --raw -t beamup_1fe84bc728af-rpdb'
        // must prefix proj name with `beamup_`
        const spw = cp.spawn(
            'docker', ['service', 'logs', '--raw', '-t', `beamup_${proj}`]
            )

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

const deleting = [];

app.get('/doDelete', protected, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {
        // send slack message about deletion request
        deleting.push(proj);
        projects.find(el => {
            if (el.name === proj) {
                el.status = 'deleting'
            }
        });
        slack.say(`${req.query.domain}: project ${proj} was requested for deletion`)
        return res.redirect(`/afterDelete?proj=${encodeURIComponent(proj)}`);
    } else {
        return res.status(500).json({ errMessage: 'You do not have access to this project' });
    }
});

app.get('/doRestart', protected, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {
        // this command takes long, we won't wait for it to finish
        function respond(errMessage, redirect) {
            if (redirectTimeout) {
                clearTimeout(redirectTimeout);
                redirectTimeout = false;
            } else return;
            if (redirect) res.redirect(redirect);
            else res.status(500).json({ errMessage });
        }
        let redirectTimeout = setTimeout(() => {
            respond(null, '/')
        }, 5000);
        // 'docker service update --force beamup_1fe84bc728af-rpdb'
        // must prefix proj name with `beamup_`
        cp.exec(
            `docker service update --force beamup_${proj}`,
            (err, stdout, stderr) => {
                if (err) {
                    console.log(`err: ${err} ${err.message} ${err.toString()}`);
                    respond((err || {}).message || 'Unknown error');
                    return;
                }

                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    respond(stderr);
                    return;
                }

                if (stdout) {
                    console.log(`stdout: ${stdout}`);
                }

                respond(null, '/');
            }
        );
    } else {
        return res.status(500).json({ errMessage: 'You do not have access to this project' });
    }
});

let projects = []

let lastTime = 0

function getProjects() {
    if (lastTime < Date.now() - config.projects_cache_time) {
        // 'docker service ls'

        return new Promise((resolve, reject) => {
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
                                tempProjects.push({ id: parts[0], replicas, name, status })
                            }
                        })

                        cp.exec(
                            `docker stats --no-stream`,
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
                                    stdout.split(String.fromCharCode(10)).forEach((line, count) => {
                                        if (count && line) { // ignore first line
                                            const parts = line.replace(/[ \t]{2,}/g, '||').split('||')
                                            const name = parts[1].split('.')[0].replace('beamup_', '')
                                            tempProjects.find((el, ij) => {
                                                if (el.name === name) {
                                                    tempProjects[ij].serviceId = parts[0]
                                                    tempProjects[ij].cpu = parts[2]
                                                    tempProjects[ij].memUsage = parts[3]
                                                    tempProjects[ij].memPerc = parts[4]
                                                    tempProjects[ij].netIO = parts[5]
                                                    tempProjects[ij].blockIO = parts[6]
                                                }
                                            })
                                        }
                                    })

                                    projects = tempProjects

                                    lastTime = Date.now()

                                    return resolve(projects)
                                }

                                return resolve()

                            }
                        )
                    }
                }
            )
        })
    }

    return Promise.resolve(projects)
}

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
            await getProjects()

            let params = new URLSearchParams(paramsString);
            const access_token = params.get('access_token');

            // Request to return data of a user that has been authenticated
            const userData = await githubRestApi.getUserData(access_token);

            const allowed = ['jaruba'];

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

const logServerUsage = async () => {
    let serverUsageHistory = []
    try {
        serverUsageHistory = JSON.parse(fs.readFileSync(sessionsFolder + 'server_usage_history.json'))
    } catch(e) {}
    const serverUsage = await getServerUsage()
    serverUsage.timestamp = Date.now()
    serverUsageHistory.unshift(serverUsage)
    const maxEntries = ((1 * 24 * 60 * 60 * 1000) / config.server_usage_interval) * config.server_usage_history_days
    if (serverUsageHistory.length > maxEntries) {
        serverUsageHistory = serverUsageHistory.slice(0, maxEntries)
    }
    fs.writeFileSync(sessionsFolder + 'server_usage_history.json', JSON.stringify(serverUsageHistory))
    setTimeout(() => {
        logServerUsage()
    }, config.server_usage_interval)
}

logServerUsage()

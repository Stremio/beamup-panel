const express = require("express");
const bodyParser = require("body-parser");
const FormData = require("form-data");
const fetch = require("node-fetch");
const cookieSession = require('cookie-session')
const cp = require('child_process')
const { client_id, client_secret } = require("./config");
const githubRestApi = require('./githubRestApi')
const sessions = require('./sessions')
const slack = require('./slack')

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
        res.redirect(`https://github.com/login/oauth/authorize?scope=user&client_id=${client_id}&redirect_uri=${req.query.redirect_uri}`);
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

function userHasProject(login, proj) {
    return login && proj && proj.startsWith(getUserHash(login)+'-') && projects.find(el => el.name === proj)
}

app.get('/getLogs', protected, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {
        // 'docker service logs beamup_1fe84bc728af-rpdb'
        // must prefix proj name with `beamup_`
        cp.exec(
            `docker service logs beamup_${proj}`,
            (err, stdout, stderr) => {
                if (err) {
                    console.log(`err: ${err} ${err.message} ${err.toString()}`);
                    return res.status(500).json({ errMessage: (err || {}).message || 'Unknown error' });
                }

                if (stderr) {
                    return res.status(500).json({ errMessage: stderr });
                }

                const logs = stdout || 'No logs'

                res.set({
                  'Content-Type': 'text/plain',
                  'Content-Length': logs.length,
                  'Content-Disposition': `attachment; filename="logs-${proj}-${Date.now()}.txt"`,
                })

                res.status(200).send(logs)
            }
        );
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
        slack.say(`project ${proj} was requested for deletion`)
        return res.redirect(`/afterDelete?proj=${encodeURIComponent(proj)}`);
    } else {
        return res.status(500).json({ errMessage: 'You do not have access to this project' });
    }
});

app.get('/doRestart', protected, async (req, res) => {
    const login = res.locals.userData.login;
    const proj = req.query.proj;
    if (userHasProject(login, proj)) {
        // 'docker service update --force beamup_1fe84bc728af-rpdb'
        // must prefix proj name with `beamup_`
        cp.exec(
            `docker service update --force beamup_${proj}`,
            (err, stdout, stderr) => {
                if (err) {
                    console.log(`err: ${err} ${err.message} ${err.toString()}`);
                    return res.status(500).json({ errMessage: (err || {}).message || 'Unknown error' });
                }

                if (stderr) {
                    return res.status(500).json({ errMessage: stderr });
                }

                if (stdout) {
                    console.log(`stdout: ${stdout}`);
                }

                return res.redirect('/');
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
        // 'docker ps'

        return new Promise((resolve, reject) => {
            cp.exec(
                `docker ps`,
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
                                const name = parts[parts.length -1].split('.')[0].replace('beamup_', '')
                                const status = deleting.includes(name) ? 'deleting' : parts[4].toLowerCase().startsWith('up') ? 'running' : 'failing'
                                tempProjects.push({ name, status })
                            }
                        })

                        projects = tempProjects

                        lastTime = Date.now()

                        return resolve(projects)

                    }

                    return resolve()
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

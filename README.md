# BeamUp Panel

The BeamUp Web Panel includes the following features:
- log in with github
- see deployed projects and their status
- download logs for a deployed project
- restart a deployed project
- delete a deployed project


## Building

```sh
npm install
npm run build
```


## Production deployment

For production mode you need the following variables set either in `.env` file or exported to the environment:

```sh
NODE_ENV=production
CLIENT_ID=The GitHub Client ID
CLIENT_SECRET=The GitHub Client secret
SLACK_WEBHOOK=https://hooks.slack.com/services/...
SLACK_CHANNEL=H190TA7TKD2
SERVER_PORT=4000
```


### Service Setup

1. To set up the application as a service, copy the `scripts/beamup-panel.service` file to `/etc/systemd/system/`.
2. Edit the file to update the paths according to your setup.
3. Enable and start the service:
   ```
   sudo systemctl enable beamup-panel.service
   sudo systemctl start beamup-panel.service
   ```

### Updating the Application

Use the `scripts/production-deploy.sh` script to deploy updates to the application:

1. Make the script executable:
   ```
   chmod +x scripts/production-deploy.sh
   ```
2. Run the script to deploy updates:
   ```
   ./scripts/production-deploy.sh
   ```

This script will pull the latest changes from the repository, install dependencies, build the application, and restart the service.
The user must have permissions to restart the service, this can be done by adding a line like this with `visudo`:
`beamup ALL=(ALL) NOPASSWD: /bin/systemctl restart beamup-panel.service`

### Nginx config example to use as a Proxy
```
server {
    listen 80;
    server_name beamup.dev;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```



## Local Testing

The app ports need to be set manually, create a `.env` file in the root folder of the project, and add:
```sh
REACT_APP_SERVER_PORT=5050
REACT_APP_PORT=3999
SERVER_PORT=$REACT_APP_SERVER_PORT
PORT=$REACT_APP_PORT
WDS_SOCKET_PORT=$REACT_APP_PORT
```

In this example's case, the app should be accessed from `http://localhost:5050`.

Three more env vars will need to be added to the `.env` file for the app to work, these are explained below.

Create an OAuth app under your github username (these are required for `CLIENT_ID` and `CLIENT_SECRET` env vars), see this article for details: https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/

(Note: while creating the OAuth app, you can set your Homepage URL to `http://localhost:5050/` and Authorization Callback URL to `http://localhost:5050/login`)

After setting all required ENV vars, start the app with `npm start`


## Optional Env Vars

```sh
SESSIONS_FOLDER=../ # a folder that is persisted for sessions data
SESSIONS_EXPIRE=2592000000 # 30 days
```

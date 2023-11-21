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


## Running

For production mode you need the following variables set either in `.env` file or exported to the environment:

```sh
NODE_ENV=production
CLIENT_ID=The GitHub Client ID
CLIENT_SECRET=The GitHub Client secret
SLACK_WEBHOOK=https://hooks.slack.com/services/...
SLACK_CHANNEL=H190TA7TKD2
SERVER_PORT=5000
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

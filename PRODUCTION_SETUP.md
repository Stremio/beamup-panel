# Production Setup for BeamUp Panel

This guide provides step-by-step instructions for setting up and deploying the BeamUp Panel on a production server.

## Important Notes
- These steps **must be executed on the deployer server**.
- The BeamUp Panel depends on **swarm-0** being active. If `swarm-0` fails, the setup should be updated to use another available manager.

## 1. Server Preparation

### Install Required Packages
```sh
sudo apt update && sudo apt install -y git curl nginx nodejs npm iptables-persistent
```

### Clone the Repository
```sh
cd /opt
sudo git clone https://github.com/Stremio/beamup-panel.git
sudo chown -R dokku:dokku beamup-panel
cd beamup-panel
```

## 2. DNS Configuration
- **Set a DNS record in Cloudflare**: Ensure that the domain you plan to use is configured in Cloudflare with the **correct IP of the deployer server**.
- **Update the domain settings** in the following places to match your intended domain:
  - **Nginx configuration** (`/etc/nginx/sites-available/beamup-panel`)
  - **BeamUp Panel environment variables** (`.env` file inside `/opt/beamup-panel`)
  - **Cloudflare settings** (ensure DNS resolves correctly to this server, and the domain matches the one used in Nginx).

## 3. Nginx Configuration
### Configure Nginx as a Reverse Proxy
1. Create a new Nginx site configuration:
```sh
sudo tee /etc/nginx/sites-available/beamup-panel > /dev/null <<EOL
server {
    listen 80;
    server_name your.domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL
```
2. Enable the site and restart Nginx:
```sh
sudo ln -s /etc/nginx/sites-available/beamup-panel /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## 4. Configure Firewall
```sh
sudo iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
sudo netfilter-persistent save
```

## 5. Set Up Systemd Service for BeamUp Panel
1. Copy the systemd service file:
```sh
sudo cp /opt/beamup-panel/scripts/beamup-panel.service /etc/systemd/system/
```
2. Update the service file paths if necessary:
```sh
sudo nano /etc/systemd/system/beamup-panel.service
```
3. Reload systemd, enable and start the service:
```sh
sudo systemctl daemon-reload
sudo systemctl enable beamup-panel.service
sudo systemctl start beamup-panel.service
```

## 6. Configure Sudo Permissions for `dokku`
Create a file in `/etc/sudoers.d/beamup-panel`:
```sh
sudo tee /etc/sudoers.d/beamup-panel > /dev/null <<EOL
dokku ALL=(ALL) NOPASSWD: /bin/systemctl restart beamup-panel.service
dokku ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx
EOL
```

## 7. Set Up Environment Variables
Create an `.env` file inside `/opt/beamup-panel` and add the following:
```sh
NODE_ENV=production
CLIENT_ID=your_github_client_id
CLIENT_SECRET=your_github_client_secret
SLACK_WEBHOOK=https://hooks.slack.com/services/...
SLACK_CHANNEL=your_slack_channel_id
SERVER_PORT=4000
```
> **Note:** You must create a **GitHub OAuth app** to obtain the `CLIENT_ID` and `CLIENT_SECRET`.
> Refer to the **README** for instructions on setting up the OAuth app and configuring its **Homepage URL** and **Authorization Callback URL**.

## 8. Deploy BeamUp Panel
Switch to the `dokku` user and execute the deployment script:
```sh
sudo -u dokku /opt/beamup-panel/scripts/production-deploy.sh
```

## 9. Retrieving Logs
To check logs for the BeamUp Panel service, use:
```sh
journalctl -u beamup-panel.service --no-pager --lines=100
```
This will show the last 100 lines of logs. Adjust the number as needed.

---
Your BeamUp Panel should now be successfully deployed and accessible at your configured domain!



#!/bin/bash

# The 'set -e' command causes the script to exit immediately if a command exits with a non-zero status.
set -e

# Set the directory where your application is located
APP_DIR="/home/beamup/beamup-panel"

# Navigate to the application directory
cd $APP_DIR

# Pull the latest changes from the repository
git pull

# Install any new dependencies
npm install

# Build the application (if necessary)
npm run build

# Restart the application service
# Replace 'beamup-panel.service' with the name of your systemd service
sudo systemctl restart beamup-panel.service

echo "Deployment complete."

FROM node:16
WORKDIR /var/www/beamup-panel
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5050
CMD ["node", "server/index.js"]

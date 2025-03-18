const Joi = require("joi");
const path = require("path");

require('dotenv-expand').expand(
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
);

const config = {
  client_id: process.env.CLIENT_ID || '1',
  client_secret: process.env.CLIENT_SECRET || '1',
  slack_webhook: process.env.SLACK_WEBHOOK || '1',
  slack_channel: process.env.SLACK_CHANNEL || '1',
  projects_cache_time: 30 * 1000, // 30s
  session_expire: parseInt(process.env.SESSION_EXPIRE || 30 * 24 * 60 * 60 * 1000),
  session_refresh_interval: 60 * 1000,
  sessions_folder: process.env.SESSIONS_FOLDER || '../sessions',
  usage_interval: 5 * 60 * 1000, // 5s
  server_usage_history_days: 7,
  project_usage_history_days: 3,
  node_manager: process.env.NODE_MANAGER || 'stremio-beamup-swarm-0',
  node_prefix: process.env.NODE_PREFIX || 'stremio-beamup-swarm-',
  node_ssh_user: process.env.NODE_USER || 'beamup',
  node_ssh_key: process.env.NODE_SSH_KEY || '/home/dokku/.ssh/id_ed25519_sync',
  node_ssh_port: process.env.NODE_SSH_PORT,
  slack_warnings_cooldown: 15 * 60 * 1000, // 15m
  slack_warnings_minimum: 3 // 3 consicultive warnings to trigger the message
};

const envVarsSchema = Joi.object({
  client_id: Joi.string().required(),
  client_secret: Joi.string().required(),
  slack_webhook: Joi.string().required(),
  slack_channel: Joi.string().required(),
  projects_cache_time: Joi.number().required(),
  session_expire: Joi.number().required(),
  session_refresh_interval: Joi.number().required(),
  sessions_folder: Joi.string().required(),
  usage_interval: Joi.number().required(),
  server_usage_history_days: Joi.number().required(),
  project_usage_history_days: Joi.number().required(),
  node_manager: Joi.string().required(),
  node_prefix: Joi.string().required(),
  node_ssh_user: Joi.string().required(),
  node_ssh_key: Joi.string(),
  node_ssh_port: Joi.string(),
  slack_warnings_cooldown: Joi.number().required(),
  slack_warnings_minimum: Joi.number().required(),
});

const { error } = envVarsSchema.validate(config);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  ...config,
}

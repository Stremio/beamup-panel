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
  sessions_folder: process.env.SESSIONS_FOLDER || '../',
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
});

const { error } = envVarsSchema.validate(config);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  ...config,
}

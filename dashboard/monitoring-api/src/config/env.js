require('dotenv').config();

// Central place to read environment variables with sensible local defaults.
// AWS-related configuration (region, ASG name, etc.) will be added here
// once live monitoring is implemented.
module.exports = {
  port: process.env.PORT || 5001,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  nodeEnv: process.env.NODE_ENV || 'development',
};

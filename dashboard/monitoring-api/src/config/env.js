require('dotenv').config();




module.exports = {
  port: process.env.PORT || 5001,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  nodeEnv: process.env.NODE_ENV || 'development',
};

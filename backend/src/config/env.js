require('dotenv').config();

// Central place to read environment variables with sensible local defaults.
module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || process.env.SUPABASE_URL || null,
  // Load testing / compute demo configuration
  enableDemoCompute: process.env.ENABLE_DEMO_COMPUTE !== 'false',
  loadTestToken: process.env.LOAD_TEST_TOKEN || null,
  maxConcurrentComputeJobs: parseInt(process.env.MAX_CONCURRENT_COMPUTE_JOBS, 10) || 2,
  instanceId: process.env.INSTANCE_ID || null,
};

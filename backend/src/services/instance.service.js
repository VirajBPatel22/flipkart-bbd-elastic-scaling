const os = require('os');
const { instanceId: configuredInstanceId, nodeEnv } = require('../config/env');

let cachedInstanceId = null;














async function resolveInstanceId() {
  if (configuredInstanceId) {
    return configuredInstanceId;
  }

  if (cachedInstanceId) {
    return cachedInstanceId;
  }

  if (process.env.ENVIRONMENT === 'LOCAL_DOCKER') return `local-${os.hostname()}`;


  try {
    const tokenRes = await fetch('http://169.254.169.254/latest/api/token', {
      method: 'PUT',
      headers: {
        'X-aws-ec2-metadata-token-ttl-seconds': '60',
      },
      signal: AbortSignal.timeout(500),
    });

    if (tokenRes.ok) {
      const token = (await tokenRes.text()).trim();
      const idRes = await fetch('http://169.254.169.254/latest/meta-data/instance-id', {
        headers: {
          'X-aws-ec2-metadata-token': token,
        },
        signal: AbortSignal.timeout(500),
      });

      if (idRes.ok) {
        const idText = (await idRes.text()).trim();
        if (idText.startsWith('i-')) {
          cachedInstanceId = idText;
          return cachedInstanceId;
        }
      }
    }
  } catch {

  }

  cachedInstanceId = `local-${os.hostname()}`;
  return cachedInstanceId;
}

async function getInstanceDetails() {
  const instanceId = await resolveInstanceId();

  return {
    status: 'ok',
    instanceId,
    hostname: os.hostname(),
    platform: process.platform,
    nodeVersion: process.version,
    environment: nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  resolveInstanceId,
  getInstanceDetails,
};

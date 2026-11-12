const fs = require('node:fs');
function databaseOptions(connectionString, env = process.env) {
  // pg otherwise lets URI sslmode replace the explicitly verified TLS options.
  const url = new URL(connectionString);
  for (const name of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(name);
  const insecure = env.DB_SSL_REJECT_UNAUTHORIZED === 'false';
  if (insecure && env.ENVIRONMENT === 'AWS') throw new Error('Unverified database TLS is forbidden in AWS mode');
  const ca = env.DATABASE_CA_BASE64 ? Buffer.from(env.DATABASE_CA_BASE64, 'base64').toString('utf8') : env.DB_SSL_CA_FILE ? fs.readFileSync(env.DB_SSL_CA_FILE, 'utf8') : undefined;
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: !insecure, ...(ca ? { ca } : {}) } };
}
module.exports = { databaseOptions };

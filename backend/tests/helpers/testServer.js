// Small helper for starting/stopping an Express app on an ephemeral port
// during tests, using only Node's built-in http server and global fetch
// (no extra HTTP-testing dependency needed).

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

module.exports = { startServer, stopServer };
